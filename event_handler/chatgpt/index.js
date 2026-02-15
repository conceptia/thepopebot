const path = require('path');
const { render_md } = require('../utils/render-md');

const DEFAULT_MODEL = 'gpt-5-mini';

function getApiKey() {
  if (process.env.CHATGPT_API_KEY) {
    return process.env.CHATGPT_API_KEY;
  }
  throw new Error('CHATGPT_API_KEY environment variable is required when CHAT_PROVIDER=chatgpt');
}

function getBaseUrl() {
  return (process.env.CHATGPT_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function getModel() {
  return process.env.CHATGPT_MODEL || DEFAULT_MODEL;
}

function maybeParseJson(json) {
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch (_err) {
    return undefined;
  }
}

function normalizeContent(content) {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        if (typeof block.text === 'string') return block.text;
        if (typeof block.content === 'string') return block.content;
        if (block.type === 'text' && typeof block.text === 'string') return block.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function normalizeHistoryForChatGpt(history) {
  const normalized = [];

  for (const message of history || []) {
    if (!message || typeof message !== 'object' || !message.role) continue;

    if (message.role === 'user' || message.role === 'assistant' || message.role === 'system') {
      normalized.push({
        role: message.role,
        content: normalizeContent(message.content),
      });
      continue;
    }

    if (message.role === 'tool') {
      normalized.push({
        role: 'tool',
        tool_call_id: message.tool_call_id,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      });
    }
  }

  return normalized;
}

function mapToolsForChatGpt(toolDefinitions) {
  return (toolDefinitions || []).map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema || { type: 'object', properties: {}, required: [] },
    },
  }));
}

async function callChatGpt({ messages, tools }) {
  const apiKey = getApiKey();
  const model = getModel();
  const systemPrompt = render_md(path.join(__dirname, '..', '..', 'operating_system', 'CHATBOT.md'));
  const baseUrl = getBaseUrl();

  const temperature = maybeParseJson(process.env.CHATGPT_TEMPERATURE);
  const maxCompletionTokens = maybeParseJson(process.env.CHATGPT_MAX_TOKENS);

  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    tools,
    tool_choice: 'auto',
  };

  if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }

  if (Number.isInteger(maxCompletionTokens) && maxCompletionTokens > 0) {
    payload.max_completion_tokens = maxCompletionTokens;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ChatGPT API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function chat(userMessage, history, toolDefinitions, toolExecutors) {
  const tools = mapToolsForChatGpt(toolDefinitions);
  const messages = [...normalizeHistoryForChatGpt(history), { role: 'user', content: userMessage }];

  while (true) {
    const completion = await callChatGpt({ messages, tools });
    const assistant = completion.choices?.[0]?.message;

    if (!assistant) {
      throw new Error('ChatGPT API response missing assistant message');
    }

    messages.push({
      role: 'assistant',
      content: assistant.content || '',
      ...(assistant.tool_calls ? { tool_calls: assistant.tool_calls } : {}),
    });

    const toolCalls = assistant.tool_calls || [];

    if (toolCalls.length === 0) {
      return {
        response: assistant.content || '',
        history: messages,
      };
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall?.function?.name;
      const executor = toolExecutors[toolName];
      let result;

      if (executor) {
        try {
          const input = maybeParseJson(toolCall?.function?.arguments) || {};
          result = await executor(input);
        } catch (err) {
          result = { error: err.message };
        }
      } else {
        result = { error: `Unknown tool: ${toolName}` };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
}

function buildSummaryUserMessage(results) {
  return [
    results.job ? `## Task\n${results.job}` : '',
    results.commit_message ? `## Commit Message\n${results.commit_message}` : '',
    results.changed_files?.length ? `## Changed Files\n${results.changed_files.join('\n')}` : '',
    results.pr_status ? `## PR Status\n${results.pr_status}` : '',
    results.merge_result ? `## Merge Result\n${results.merge_result}` : '',
    results.pr_url ? `## PR URL\n${results.pr_url}` : '',
    results.log ? `## Agent Log\n${results.log}` : '',
  ].filter(Boolean).join('\n\n');
}

async function summarizeJob(results) {
  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const model = getModel();
    const systemPrompt = render_md(
      path.join(__dirname, '..', '..', 'operating_system', 'JOB_SUMMARY.md')
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildSummaryUserMessage(results) },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ChatGPT API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return (result.choices?.[0]?.message?.content || '').trim() || 'Job completed.';
  } catch (err) {
    console.error('Failed to summarize job with ChatGPT:', err);
    return 'Job completed.';
  }
}

module.exports = {
  chat,
  summarizeJob,
  getApiKey,
};
