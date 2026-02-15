const claude = require('../claude');
const chatgpt = require('../chatgpt');

function getChatProvider() {
  return (process.env.CHAT_PROVIDER || 'claude').trim().toLowerCase();
}

function getProviderClient() {
  const provider = getChatProvider();

  if (provider === 'claude') {
    return claude;
  }

  if (provider === 'chatgpt') {
    return chatgpt;
  }

  throw new Error(`Unsupported CHAT_PROVIDER: ${provider}. Use "claude" or "chatgpt".`);
}

function validateProviderConfig() {
  const provider = getChatProvider();

  if (provider === 'claude') {
    claude.getApiKey();
    return;
  }

  if (provider === 'chatgpt') {
    chatgpt.getApiKey();
    return;
  }

  throw new Error(`Unsupported CHAT_PROVIDER: ${provider}. Use "claude" or "chatgpt".`);
}

async function chat(userMessage, history, toolDefinitions, toolExecutors) {
  return getProviderClient().chat(userMessage, history, toolDefinitions, toolExecutors);
}

async function summarizeJob(results) {
  return getProviderClient().summarizeJob(results);
}

module.exports = {
  chat,
  summarizeJob,
  getChatProvider,
  validateProviderConfig,
};
