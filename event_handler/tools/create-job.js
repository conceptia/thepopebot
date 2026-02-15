const { v4: uuidv4 } = require('uuid');
const { githubApi } = require('./github');

const { GH_OWNER, GH_REPO } = process.env;

function resolveJobRuntimeConfig() {
  const chatProvider = String(process.env.CHAT_PROVIDER || 'claude').trim().toLowerCase();

  if (chatProvider === 'chatgpt') {
    return {
      chat_provider: 'chatgpt',
      pi_provider: 'openai',
      model: process.env.CHATGPT_JOB_MODEL || process.env.CHATGPT_MODEL || 'gpt-5-mini',
    };
  }

  return {
    chat_provider: 'claude',
    pi_provider: 'anthropic',
    model:
      process.env.CLAUDE_JOB_MODEL ||
      process.env.EVENT_HANDLER_MODEL ||
      process.env.MODEL ||
      'claude-sonnet-4-20250514',
  };
}

/**
 * Create a new job branch with updated job.md
 * @param {string} jobDescription - The job description to write to job.md
 * @returns {Promise<{job_id: string, branch: string}>} - Job ID and branch name
 */
async function createJob(jobDescription) {
  const jobId = uuidv4();
  const branch = `job/${jobId}`;

  // 1. Get main branch SHA
  const mainRef = await githubApi(`/repos/${GH_OWNER}/${GH_REPO}/git/ref/heads/main`);
  const mainSha = mainRef.object.sha;

  // 2. Create new branch
  await githubApi(`/repos/${GH_OWNER}/${GH_REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: mainSha,
    }),
  });

  // 3. Create logs/${jobId}/job.md with job content
  await githubApi(`/repos/${GH_OWNER}/${GH_REPO}/contents/logs/${jobId}/job.md`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `job: ${jobId}`,
      content: Buffer.from(jobDescription).toString('base64'),
      branch: branch,
    }),
  });

  // 4. Store runtime LLM config for this specific job
  const runtimeConfig = resolveJobRuntimeConfig();
  await githubApi(`/repos/${GH_OWNER}/${GH_REPO}/contents/logs/${jobId}/runtime.json`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `job runtime: ${jobId}`,
      content: Buffer.from(JSON.stringify(runtimeConfig, null, 2)).toString('base64'),
      branch: branch,
    }),
  });

  return { job_id: jobId, branch };
}

module.exports = { createJob, resolveJobRuntimeConfig };
