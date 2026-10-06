import { AIConversation } from '../models/AIConversation';
import { SvkNote } from '../models/SvkNote';
import { SvkTicket } from '../models/SvkTicket';
import { SvkHistory } from '../models/SvkHistory';
import { sendMessage } from './AIChatService';

const TITLE_MAX = 80;

const FIRST_QUESTION = (key: string) =>
  [
    `Ticket ${key} cần làm gì tiếp?`,
    'Tra KB (quy trình xử lý ticket, luồng nghiệp vụ, mã lỗi) nếu cần để đối chiếu.',
    'Trả lời đúng 1-2 câu: hành động cụ thể tiếp theo và ai làm. Không tóm tắt lại ticket.',
  ].join(' ');

const FOLLOWUP_QUESTION = (key: string) =>
  [
    `Ticket ${key} vừa có cập nhật mới (comment, trạng thái hoặc PL liên quan).`,
    'Dựa trên dữ liệu mới nhất, giờ cần làm gì tiếp?',
    'Trả lời đúng 1-2 câu: hành động cụ thể tiếp theo và ai làm.',
  ].join(' ');

const findSvkDoc = async (key: string) =>
  (await SvkTicket.findOne({ key }).select('key summary aiInputHash').lean()) ||
  (await SvkHistory.findOne({ key }).select('key summary').lean());

/** Ticket chưa có hội thoại, hoặc nội dung đã đổi từ lần hỏi trước. */
export const needsSvkChat = async (key: string, aiInputHash: string): Promise<boolean> => {
  const conversation = await AIConversation.findOne({ svkKey: key }).select('svkInputHash').lean();
  return !conversation || conversation.svkInputHash !== aiInputHash;
};

const findOrCreateConversation = async (key: string) => {
  const existing = await AIConversation.findOne({ svkKey: key });
  if (existing) return existing;

  const doc: any = await findSvkDoc(key);
  if (!doc) throw new Error(`SVK ticket ${key} not found`);
  return AIConversation.create({
    title: `${key} · ${doc.summary || ''}`.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX),
    ticketKeys: [key],
    svkKey: key,
    messages: [],
  });
};

/**
 * Hỏi AI "cần làm gì tiếp" trong hội thoại riêng của ticket SVK: lần đầu thì tạo hội thoại,
 * các lần sau chỉ hỏi thêm khi nội dung ticket đổi. Câu trả lời được ghi vào cột Note.
 */
export const runSvkChat = async (key: string): Promise<string> => {
  const doc: any = await SvkTicket.findOne({ key }).select('aiInputHash').lean();
  const conversation = await findOrCreateConversation(key);
  const hash = doc?.aiInputHash || '';
  if (conversation.messages.length && conversation.svkInputHash === hash) return String(conversation._id);

  const question = conversation.messages.length ? FOLLOWUP_QUESTION(key) : FIRST_QUESTION(key);
  try {
    await sendMessage(String(conversation._id), { message: question });
    await AIConversation.updateOne({ _id: conversation._id }, { $set: { svkInputHash: hash } });
  } catch (error: any) {
    const message = error?.message || String(error);
    await SvkNote.updateOne({ key }, { $set: { aiNoteError: message } }, { upsert: true }).catch(() => {});
    throw error;
  }
  return String(conversation._id);
};

/** Mở hội thoại từ bảng Support: chưa có thì tạo và hỏi lượt đầu ngay. */
export const ensureSvkChat = async (key: string): Promise<string> => {
  const existing = await AIConversation.findOne({ svkKey: key }).select('_id messages').lean();
  if (existing?.messages?.length) return String(existing._id);
  return runSvkChat(key);
};

/** key SVK → hội thoại + dòng AI ở cột Note. */
export const listSvkChats = async () => {
  const [conversations, notes] = await Promise.all([
    AIConversation.find({ svkKey: { $exists: true } }).select('svkKey').lean(),
    SvkNote.find({ $or: [{ aiNote: { $nin: ['', null] } }, { aiNoteError: { $nin: ['', null] } }] })
      .select('key aiNote aiNoteAt aiNoteError')
      .lean(),
  ]);

  const map: Record<string, { conversationId?: string; aiNote?: string; aiNoteAt?: Date; aiNoteError?: string }> = {};
  for (const c of conversations) map[c.svkKey!] = { conversationId: String(c._id) };
  for (const n of notes) {
    map[n.key] = { ...map[n.key], aiNote: n.aiNote || '', aiNoteAt: n.aiNoteAt, aiNoteError: n.aiNoteError || '' };
  }
  return map;
};
