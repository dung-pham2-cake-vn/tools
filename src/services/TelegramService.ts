import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Telegram rejects messages over 4096 chars; leave headroom for the chunk counter.
const CHUNK_LIMIT = 3800;

export const isTelegramConfigured = (): boolean => Boolean(BOT_TOKEN && CHAT_ID);

/** Escape the three characters Telegram's HTML parse mode treats as markup. */
export const escapeHtml = (text: string): string =>
  (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Split on blank lines, then single lines, then hard-wrap whatever is still too long. */
function chunk(text: string): string[] {
  const chunks: string[] = [];
  let current = '';

  const push = (piece: string, sep: string) => {
    if (current && current.length + piece.length + sep.length > CHUNK_LIMIT) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}${sep}${piece}` : piece;
    }
  };

  for (const block of text.split('\n\n')) {
    if (block.length <= CHUNK_LIMIT) {
      push(block, '\n\n');
      continue;
    }
    // a long block (e.g. a list of many tickets) breaks apart line by line instead of being cut
    for (const line of block.split('\n')) {
      push(line.length > CHUNK_LIMIT ? line.slice(0, CHUNK_LIMIT - 1) + '…' : line, '\n');
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Send a message (HTML parse mode), split across several if it exceeds Telegram's limit. */
export const sendTelegram = async (text: string): Promise<void> => {
  if (!isTelegramConfigured()) {
    console.warn('[Telegram] skipped — TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
    return;
  }

  const parts = chunk(text);
  for (let i = 0; i < parts.length; i++) {
    const suffix = parts.length > 1 ? `\n\n<i>(${i + 1}/${parts.length})</i>` : '';
    try {
      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: parts[i] + suffix,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        { timeout: 15000 }
      );
    } catch (error: any) {
      // never let a notification failure break the caller
      const detail = error?.response?.data?.description || error?.message || String(error);
      console.error('[Telegram] send failed:', detail);
      return;
    }
  }
};
