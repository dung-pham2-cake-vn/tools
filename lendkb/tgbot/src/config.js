import path from 'node:path';

function required(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`[config] Missing required env var: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

export const BOT_TOKEN = required('TELEGRAM_BOT_TOKEN');

// Whitelist: only these Telegram numeric user IDs may talk to the bot.
// Everything else is dropped silently.
export const ALLOWED_USER_IDS = new Set(
  required('TELEGRAM_ALLOWED_USER_IDS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
);

if (ALLOWED_USER_IDS.size === 0 || [...ALLOWED_USER_IDS].some(Number.isNaN)) {
  console.error('[config] TELEGRAM_ALLOWED_USER_IDS must be a comma-separated list of numeric IDs');
  process.exit(1);
}

// Sandbox root. Claude may only read/write inside this directory.
// Deliberately NOT the tgbot/ directory itself, so the agent can never read
// its own .env (which holds the bot token).
export const WORKSPACE_DIR = path.resolve(
  process.env.WORKSPACE_DIR || path.join(process.cwd(), '..', 'workspace'),
);

export const MODEL = process.env.CLAUDE_MODEL || undefined;
export const MAX_TURNS = Number(process.env.MAX_TURNS || 30);

// Read + Edit, no Bash. Keep this list in sync with SAFE_TOOLS in permissions.js.
export const ALLOWED_TOOLS = [
  'Read',
  'Edit',
  'Write',
  'Grep',
  'Glob',
  'TodoWrite',
  'WebSearch',
  'WebFetch',
];

// Custom in-process MCP tools (Jira / Confluence). Registered only when
// ATLASSIAN_HOST / ATLASSIAN_USERNAME / ATLASSIAN_API_TOKEN are all set. These are NOT
// built-in tools, so they belong in the permission allowlist but not in
// `tools`.
export { ATLASSIAN_TOOLS } from './atlassian.js';

// Blocked even if a prompt or a skill asks for them.
export const DENIED_TOOLS = [
  'Bash',
  'BashOutput',
  'KillShell',
  'Task',
  'Agent',
  'NotebookEdit',
];
