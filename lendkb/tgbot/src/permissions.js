import path from 'node:path';
import { ALLOWED_TOOLS, ATLASSIAN_TOOLS, DENIED_TOOLS, WORKSPACE_DIR } from './config.js';

const SAFE_TOOLS = new Set([...ALLOWED_TOOLS, ...ATLASSIAN_TOOLS]);
const BLOCKED_TOOLS = new Set(DENIED_TOOLS);

// Tool inputs that carry a filesystem path we must confine to WORKSPACE_DIR.
const PATH_KEYS = ['file_path', 'path', 'notebook_path'];

function isInsideWorkspace(p) {
  const abs = path.resolve(WORKSPACE_DIR, p);
  const rel = path.relative(WORKSPACE_DIR, abs);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * canUseTool handler. Default-deny: a tool is allowed only if it is on the
 * explicit allowlist AND every path it touches resolves inside WORKSPACE_DIR.
 * There is no human at the other end to approve a prompt, so anything
 * uncertain is denied rather than escalated.
 */
export function makeCanUseTool(onDecision) {
  return async (toolName, input) => {
    const deny = (message) => {
      onDecision?.({ toolName, allowed: false, reason: message });
      return { behavior: 'deny', message };
    };

    if (BLOCKED_TOOLS.has(toolName)) {
      return deny(`Tool "${toolName}" is disabled for the Telegram bridge.`);
    }
    if (!SAFE_TOOLS.has(toolName)) {
      return deny(`Tool "${toolName}" is not on the allowlist.`);
    }

    for (const key of PATH_KEYS) {
      const value = input?.[key];
      if (typeof value === 'string' && value.length > 0 && !isInsideWorkspace(value)) {
        return deny(`Path "${value}" is outside the sandbox (${WORKSPACE_DIR}).`);
      }
    }

    onDecision?.({ toolName, allowed: true });
    return { behavior: 'allow', updatedInput: input };
  };
}
