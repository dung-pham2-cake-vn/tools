import { TicketNote } from '../models/TicketNote';

const TICKET_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

const normalizeKey = (ticketKey: string) => {
  const key = String(ticketKey || '').trim().toUpperCase();
  if (!TICKET_KEY_RE.test(key)) throw new Error(`Mã ticket không hợp lệ: ${ticketKey}`);
  return key;
};

export const getNote = async (ticketKey: string) => {
  const key = normalizeKey(ticketKey);
  const doc = await TicketNote.findOne({ ticketKey: key }).lean();
  return { ticketKey: key, content: doc?.content || '', updatedAt: doc?.updatedAt || null };
};

export const saveNote = async (ticketKey: string, content: string) => {
  const key = normalizeKey(ticketKey);
  const doc = await TicketNote.findOneAndUpdate(
    { ticketKey: key },
    { content: String(content ?? '') },
    { upsert: true, new: true }
  ).lean();
  return { ticketKey: key, content: doc.content, updatedAt: doc.updatedAt };
};

const stamp = () =>
  new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

/** Ghi nối vào cuối note, kèm dòng đánh dấu nguồn + thời điểm. */
export const appendNote = async (ticketKey: string, text: string, source = 'AI') => {
  const current = await getNote(ticketKey);
  const entry = `**[${source} · ${stamp()}]**\n${text.trim()}`;
  return saveNote(ticketKey, current.content.trim() ? `${current.content.trimEnd()}\n\n${entry}` : entry);
};
