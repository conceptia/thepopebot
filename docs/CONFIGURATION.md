# Configuration

## Environment Variables

All environment variables for the Event Handler (set in `event_handler/.env`):

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Authentication key for all endpoints (except `/telegram/webhook` and `/github/webhook` which use their own secrets) | Yes |
| `GH_TOKEN` | GitHub PAT for creating branches/files | Yes |
| `GH_OWNER` | GitHub repository owner | Yes |
| `GH_REPO` | GitHub repository name | Yes |
| `PORT` | Server port (default: 3000) | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather | For Telegram |
| `TELEGRAM_CHAT_ID` | Restricts bot to allowed chat ID(s); supports comma-separated values | For security |
| `TELEGRAM_WEBHOOK_SECRET` | Secret for webhook validation | No |
| `GH_WEBHOOK_SECRET` | Secret for GitHub Actions webhook auth | For notifications |
| `CHAT_PROVIDER` | Global LLM provider for Telegram, job summaries, and newly created autonomous jobs (`claude` or `chatgpt`) | No (default: `claude`) |
| `ANTHROPIC_API_KEY` | Claude API key (required when `CHAT_PROVIDER=claude`) | Conditional |
| `EVENT_HANDLER_MODEL` | Claude model for chat/summaries (default: claude-sonnet-4) | No |
| `CHATGPT_API_KEY` | ChatGPT API key (required when `CHAT_PROVIDER=chatgpt`) | Conditional |
| `CHATGPT_MODEL` | ChatGPT model for event-handler chat/summaries (default: `gpt-5-mini`) | No |
| `CHATGPT_JOB_MODEL` | Optional ChatGPT model override for Docker job runtime | No |
| `CLAUDE_JOB_MODEL` | Optional Claude model override for Docker job runtime | No |
| `CHATGPT_MAX_TOKENS` | Optional max completion token cap for ChatGPT calls | No |
| `CHATGPT_TEMPERATURE` | Optional ChatGPT temperature override | No |
| `CHATGPT_BASE_URL` | Optional ChatGPT API base URL override | No |
| `OPENAI_API_KEY` | OpenAI key for Whisper voice transcription | For voice |

---

> **Provider propagation:** when a job is created, the event handler stores provider runtime metadata under `logs/<JOB_ID>/runtime.json` so GitHub Actions uses the same provider family for that job run.

## GitHub Secrets

Set automatically by the setup wizard:

| Secret | Description | Required |
|--------|-------------|----------|
| `SECRETS` | Base64-encoded JSON with protected credentials | Yes |
| `LLM_SECRETS` | Base64-encoded JSON with LLM-accessible credentials | No |
| `GH_WEBHOOK_SECRET` | Random secret for webhook authentication | Yes |

---

## GitHub Repository Variables

Configure in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GH_WEBHOOK_URL` | Event handler URL (e.g., your ngrok URL) | Yes | — |
| `AUTO_MERGE` | Set to `false` to disable auto-merge of job PRs | No | Enabled |
| `ALLOWED_PATHS` | Comma-separated path prefixes for auto-merge | No | `/logs` |
| `IMAGE_URL` | Docker image path (e.g., `ghcr.io/myorg/mybot`) | No | `stephengpope/thepopebot:latest` |
| `MODEL` | Legacy fallback model variable for Docker agent runtime (provider-specific behavior now driven by `CHAT_PROVIDER`) | No | Pi default |

---

## ngrok URL Changes

ngrok assigns a new URL each time you restart it (unless you have a paid plan with a static domain). When your ngrok URL changes, run:

```bash
npm run setup-telegram
```

This will verify your server is running, update the GitHub webhook URL, re-register the Telegram webhook, and optionally capture your chat ID for security.

---

## Manual Telegram Setup (Production)

If you're deploying to a platform where you can't run the setup script (Vercel, Railway, etc.), configure Telegram manually:

1. **Set environment variables** in your platform's dashboard (see `event_handler/.env.example` for reference):
   - `CHAT_PROVIDER` - `claude` (default) or `chatgpt`
   - `ANTHROPIC_API_KEY` when using Claude, or `CHATGPT_API_KEY` when using ChatGPT
   - `TELEGRAM_BOT_TOKEN` - Your bot token from @BotFather
   - `TELEGRAM_WEBHOOK_SECRET` - Generate with `openssl rand -hex 32`
   - `TELEGRAM_VERIFICATION` - A verification code like `verify-abc12345`

2. **Deploy and register the webhook:**
   ```bash
   curl -X POST https://your-app.vercel.app/telegram/register \
     -H "Content-Type: application/json" \
     -H "x-api-key: YOUR_API_KEY" \
     -d '{"bot_token": "YOUR_BOT_TOKEN", "webhook_url": "https://your-app.vercel.app/telegram/webhook"}'
   ```
   This registers your webhook with the secret from your env.

3. **Get your chat ID:**
   - Message your bot with your `TELEGRAM_VERIFICATION` code (e.g., `verify-abc12345`)
   - The bot will reply with your chat ID

4. **Set `TELEGRAM_CHAT_ID`:**
   - Add the chat ID to your environment variables
   - Redeploy

Now your bot only responds to your authorized chat.
