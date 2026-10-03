import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Telegram rejects messages over 4096 chars; leave headroom for the chunk counter.
const CHUNK_LIMIT = 3800;

export const isTelegramConfigured = (): boolean => Boolean(BOT_TOKEN && CHAT_ID);

/** Chat được phép ra lệnh cho bot — mọi chat khác bị bỏ qua. */
export const getAllowedChatId = (): string => CHAT_ID;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number | string; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
}

/** Thông tin bot — dùng để bỏ phần @username khi bot được mention trong group. */
export const getBotUsername = async (): Promise<string> => {
  if (!BOT_TOKEN) return '';
  const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, { timeout: 15000 });
  return String(res.data?.result?.username || '');
};

/**
 * Đăng ký menu lệnh — Telegram hiện gợi ý khi người dùng gõ "/" trong khung chat.
 * Scope "default" không tự áp cho group trên mọi client, nên đăng ký thêm
 * all_group_chats và đúng group đang dùng.
 */
export const setBotCommands = async (
  commands: Array<{ command: string; description: string }>
): Promise<void> => {
  if (!BOT_TOKEN) return;

  const scopes: Array<Record<string, unknown>> = [
    { type: 'default' },
    { type: 'all_private_chats' },
    { type: 'all_group_chats' },
    { type: 'all_chat_administrators' },
  ];
  if (CHAT_ID) scopes.push({ type: 'chat', chat_id: CHAT_ID });

  for (const scope of scopes) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
        { commands, scope },
        { timeout: 15000 }
      );
    } catch (error: any) {
      const detail = error?.response?.data?.description || error?.message || String(error);
      console.warn(`[Telegram] setMyCommands scope=${scope.type} lỗi: ${detail}`);
    }
  }
};

/**
 * Long polling. `timeoutSec` là thời gian Telegram giữ kết nối khi chưa có tin mới,
 * nên axios timeout phải lớn hơn con số đó.
 */
export const getTelegramUpdates = async (
  offset: number,
  timeoutSec = 30
): Promise<TelegramUpdate[]> => {
  if (!isTelegramConfigured()) return [];
  const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
    params: { offset, timeout: timeoutSec, allowed_updates: JSON.stringify(['message']) },
    timeout: (timeoutSec + 10) * 1000,
  });
  return (res.data?.result || []) as TelegramUpdate[];
};

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
export const sendTelegram = async (text: string, chatId: string = CHAT_ID): Promise<void> => {
  if (!BOT_TOKEN || !chatId) {
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
          chat_id: chatId,
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
