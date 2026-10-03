import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'sessions.json');

let store = {};
try {
  store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  store = {};
}

function persist() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[sessions] could not persist:', err.message);
  }
}

export function getSession(chatId) {
  return store[String(chatId)];
}

export function setSession(chatId, sessionId) {
  store[String(chatId)] = { sessionId, updatedAt: new Date().toISOString() };
  persist();
}

export function clearSession(chatId) {
  delete store[String(chatId)];
  persist();
}
