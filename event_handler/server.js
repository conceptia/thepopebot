const express = require('express');
const helmet = require('helmet');
require('dotenv').config();

const { createJob } = require('./tools/create-job');
const { loadCrons } = require('./cron');
const { loadTriggers } = require('./triggers');
const { setWebhook, sendMessage, formatJobNotification, downloadFile, reactToMessage, startTypingIndicator } = require('./tools/telegram');
const { isWhisperEnabled, transcribeAudio } = require('./tools/openai');
const { chat, summarizeJob, getChatProvider, validateProviderConfig } = require('./llm');
const { toolDefinitions, toolExecutors } = require('./llm/tools');
const { getHistory, updateHistory } = require('./claude/conversation');
const { githubApi, getJobStatus } = require('./tools/github');

const app = express();

app.use(helmet());
app.use(express.json());

const { API_KEY, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, GH_WEBHOOK_SECRET, GH_OWNER, GH_REPO, TELEGRAM_CHAT_ID, TELEGRAM_VERIFICATION } = process.env;

function parseTelegramChatIds(rawChatIds) {
  return String(rawChatIds || '')
    .split(',')
    .map((id) => id.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .map((id) => {
      const match = id.match(/^-?\d+/);
      return match ? match[0] : id;
    });
}

const configuredTelegramChatIds = parseTelegramChatIds(TELEGRAM_CHAT_ID);
const allowedTelegramChatIds = new Set(configuredTelegramChatIds);
const configuredTelegramWebhookSecret = (TELEGRAM_WEBHOOK_SECRET || '').trim();

try {
  validateProviderConfig();
  console.log(`[LLM] Using chat provider: ${getChatProvider()}`);
} catch (err) {
  console.error(`[LLM] Provider configuration error: ${err.message}`);
  process.exit(1);
}

// Bot token from env, can be overridden by /telegram/register
let telegramBotToken = TELEGRAM_BOT_TOKEN || null;

// Routes that have their own authentication
const PUBLIC_ROUTES = new Set(['/telegram/webhook', '/github/webhook']);

function normalizePath(pathname) {
  if (!pathname) return pathname;
  return pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
}

// Global x-api-key auth (skip for routes with their own auth)
app.use((req, res, next) => {
  if (PUBLIC_ROUTES.has(normalizePath(req.path))) {
    return next();
  }
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.use(loadTriggers());

// GET /ping - health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'Pong!' });
});

// GET /jobs/status - get running job status
app.get('/jobs/status', async (req, res) => {
  try {
    const result = await getJobStatus(req.query.job_id);
    res.json(result);
  } catch (err) {
    console.error('Failed to get job status:', err);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// POST /webhook - create a new job
app.post('/webhook', async (req, res) => {
  const { job } = req.body;
  if (!job) return res.status(400).json({ error: 'Missing job field' });

  try {
    const result = await createJob(job);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /telegram/register - register a Telegram webhook
app.post('/telegram/register', async (req, res) => {
  const { bot_token, webhook_url } = req.body;
  if (!bot_token || !webhook_url) {
    return res.status(400).json({ error: 'Missing bot_token or webhook_url' });
  }

  try {
    const result = await setWebhook(bot_token, webhook_url, TELEGRAM_WEBHOOK_SECRET);
    telegramBotToken = bot_token;
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

// POST /telegram/webhook - receive Telegram updates
app.post('/telegram/webhook', async (req, res) => {
  const update = req.body || {};
  const message = update.message || update.edited_message;
  const incomingChatId = message?.chat?.id ? String(message.chat.id) : 'unknown';

  console.log(`[TELEGRAM] Webhook received: update_id=${update.update_id ?? 'unknown'} chat_id=${incomingChatId} allowed_chat_ids=${configuredTelegramChatIds.join(',') || 'none'}`);

  // Validate secret token if configured
  // Always return 200 to prevent Telegram retry loops on mismatch
  if (configuredTelegramWebhookSecret) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (headerSecret !== configuredTelegramWebhookSecret) {
      console.log('[TELEGRAM] Ignoring update due to webhook secret mismatch');
      return res.status(200).json({ ok: true });
    }
  }


  if (message && message.chat && telegramBotToken) {
    const chatId = String(message.chat.id);

    let messageText = null;

    if (message.text) {
      messageText = message.text;
    }

    // Check for verification code - this works even before TELEGRAM_CHAT_ID is set
    if (TELEGRAM_VERIFICATION && messageText === TELEGRAM_VERIFICATION) {
      await sendMessage(telegramBotToken, chatId, `Your chat ID:\n<code>${chatId}</code>`);
      return res.status(200).json({ ok: true });
    }

    // Security: if no TELEGRAM_CHAT_ID configured, ignore all messages (except verification above)
    if (allowedTelegramChatIds.size === 0) {
      console.log('[TELEGRAM] Ignoring update because TELEGRAM_CHAT_ID is not configured');
      return res.status(200).json({ ok: true });
    }

    // Security: only accept messages from configured chat
    if (!allowedTelegramChatIds.has(chatId)) {
      console.log(`[TELEGRAM] Ignoring update from unauthorized chat ${chatId}. Allowed: ${configuredTelegramChatIds.join(',') || 'none'}. Configure TELEGRAM_CHAT_ID with this value to allow it.`);
      return res.status(200).json({ ok: true });
    }

    // Acknowledge receipt with a thumbs up (await so it completes before typing indicator starts)
    await reactToMessage(telegramBotToken, chatId, message.message_id).catch(() => {});

    if (message.voice) {
      // Handle voice messages
      if (!isWhisperEnabled()) {
        await sendMessage(telegramBotToken, chatId, 'Voice messages are not supported. Please set OPENAI_API_KEY to enable transcription.');
        return res.status(200).json({ ok: true });
      }

      try {
        const { buffer, filename } = await downloadFile(telegramBotToken, message.voice.file_id);
        messageText = await transcribeAudio(buffer, filename);
      } catch (err) {
        console.error('Failed to transcribe voice:', err);
        await sendMessage(telegramBotToken, chatId, 'Sorry, I could not transcribe your voice message.');
        return res.status(200).json({ ok: true });
      }
    }

    // Acknowledge receipt immediately so Telegram doesn't wait/retry
    res.status(200).json({ ok: true });

    if (messageText) {
      const stopTyping = startTypingIndicator(telegramBotToken, chatId);
      try {
        // Get conversation history and process with configured chat provider
        const history = getHistory(chatId);
        const { response, history: newHistory } = await chat(
          messageText,
          history,
          toolDefinitions,
          toolExecutors
        );
        updateHistory(chatId, newHistory);

        // Send response (auto-splits if needed)
        await sendMessage(telegramBotToken, chatId, response, { escape: true });
      } catch (err) {
        console.error(`Failed to process message with ${getChatProvider()}:`, err);
        await sendMessage(telegramBotToken, chatId, 'Sorry, I encountered an error processing your message.').catch(() => {});
      } finally {
        stopTyping();
      }
    }
  } else {
    // No message or bot token to process — still acknowledge
    if (!telegramBotToken) {
      console.log('[TELEGRAM] Ignoring update because TELEGRAM_BOT_TOKEN is not configured');
    } else {
      console.log('[TELEGRAM] Ignoring update because no message payload was found');
    }
    res.status(200).json({ ok: true });
  }
});

/**
 * Extract job ID from branch name (e.g., "job/abc123" -> "abc123")
 */
function extractJobId(branchName) {
  if (!branchName || !branchName.startsWith('job/')) return null;
  return branchName.slice(4);
}

// POST /github/webhook - receive GitHub PR notifications
app.post('/github/webhook', async (req, res) => {
  // Validate webhook secret
  if (GH_WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-github-webhook-secret-token'];
    if (headerSecret !== GH_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event !== 'pull_request') {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const pr = payload.pull_request;
  if (!pr) return res.status(200).json({ ok: true, skipped: true });

  const branchName = pr.head?.ref;
  const jobId = extractJobId(branchName);
  if (!jobId) return res.status(200).json({ ok: true, skipped: true, reason: 'not a job branch' });

  const notificationChatId = configuredTelegramChatIds[0];

  if (!notificationChatId || !telegramBotToken) {
    console.log(`Job ${jobId} completed but no chat ID to notify`);
    return res.status(200).json({ ok: true, skipped: true, reason: 'no chat to notify' });
  }

  try {
    // All job data comes from the webhook payload — no GitHub API calls needed
    const results = payload.job_results || {};
    results.pr_url = pr.html_url;

    const message = await summarizeJob(results);

    await sendMessage(telegramBotToken, notificationChatId, message, { escape: true });

    // Add the summary to chat memory so chat has context in future conversations
    const history = getHistory(notificationChatId);
    history.push({ role: 'assistant', content: message });
    updateHistory(notificationChatId, history);

    console.log(`Notified chat ${notificationChatId} about job ${jobId.slice(0, 8)}`);

    res.status(200).json({ ok: true, notified: true });
  } catch (err) {
    console.error('Failed to process GitHub webhook:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Error handler - don't leak stack traces
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  loadCrons();
});
