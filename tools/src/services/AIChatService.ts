import { AIConversation } from '../models/AIConversation';
import { TicketChat } from '../models/TicketChat';
import { analyzeWithCustomPrompt } from './AIService';
import { buildTicketContext, CHAT_PRESETS } from './TicketAIService';
import { appendNote } from './TicketNoteService';

/** Số message gần nhất gửi kèm mỗi lượt chat. */
const CHAT_HISTORY_LIMIT = 20;
/** Giới hạn ticket đính kèm để prompt không vượt context. */
const MAX_TICKETS = 15;
const TITLE_MAX = 80;

const TICKET_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export const normalizeTicketKeys = (keys: unknown): string[] => {
  const list = Array.isArray(keys) ? keys : [];
  const out = Array.from(
    new Set(list.map((key) => String(key || '').trim().toUpperCase()).filter((key) => TICKET_KEY_RE.test(key)))
  );
  if (out.length > MAX_TICKETS) throw new Error(`Đính kèm tối đa ${MAX_TICKETS} ticket mỗi hội thoại`);
  return out;
};

const SYSTEM_RULES = [
  'Bạn là trợ lý phân tích yêu cầu sản phẩm cho đội Lending của Cake Digital Bank.',
  'Trả lời bằng tiếng Việt có dấu, ngắn gọn, kết luận trước, gạch đầu dòng khi liệt kê.',
  'Khi có ticket đính kèm, chỉ dựa trên dữ liệu ticket và BRD được cung cấp; nhắc tới ticket thì ghi rõ key.',
  'Không chắc thì nói thẳng là không chắc.',
  'Mỗi ticket có phần Note riêng lưu trong tool. CHỈ KHI người dùng yêu cầu ghi/lưu/note lại điều gì,',
  'thêm vào cuối câu trả lời một khối cho mỗi ticket cần ghi, đúng định dạng (mỗi dòng đánh dấu nằm riêng một dòng):',
  '<<<NOTE MÃ-TICKET',
  'nội dung note (markdown, ngắn gọn, đủ ý)',
  '>>>',
  'Nội dung được nối vào cuối note hiện có. Không có ticket rõ ràng thì hỏi lại ticket nào, không tự đoán.',
  'Hệ thống tự hiện xác nhận đã ghi kèm nội dung note, nên ngoài khối NOTE đừng lặp lại nội dung đó; chỉ trả lời phần còn lại (nếu có).',
].join('\n');

const NOTE_BLOCK_RE = /<<<NOTE\s+([A-Za-z][A-Za-z0-9]+-\d+)\s*\n([\s\S]*?)\n?>>>/g;

/** Tách các khối <<<NOTE ...>>> khỏi câu trả lời, ghi vào note ticket, thay bằng dòng xác nhận. */
const applyNoteBlocks = async (answer: string): Promise<string> => {
  const blocks = Array.from(answer.matchAll(NOTE_BLOCK_RE));
  if (!blocks.length) return answer;

  const results: string[] = [];
  for (const [, rawKey, content] of blocks) {
    const key = rawKey.toUpperCase();
    if (!content.trim()) continue;
    try {
      await appendNote(key, content, 'AI');
      results.push(`📝 Đã ghi note vào ${key}:\n${content.trim().split('\n').map((line) => `> ${line}`).join('\n')}`);
    } catch (error: any) {
      results.push(`⚠️ Không ghi được note cho ${key}: ${error?.message || error}`);
    }
  }
  const cleaned = answer.replace(NOTE_BLOCK_RE, '').trim();
  return [cleaned, ...results].filter(Boolean).join('\n\n');
};

/** Chat cũ (1 thread / ticket PR) → chuyển thành hội thoại đính kèm ticket đó, chỉ chạy 1 lần. */
const migrateLegacyChat = async (ticketKey: string) => {
  const legacy = await TicketChat.findOne({ ideaKey: ticketKey });
  if (!legacy) return;
  if (legacy.messages.length) {
    const firstAt = legacy.messages[0]?.createdAt || new Date();
    await AIConversation.create({
      title: `Chat ${ticketKey}`,
      ticketKeys: [ticketKey],
      messages: legacy.messages,
      createdAt: firstAt,
    });
  }
  await TicketChat.deleteOne({ _id: legacy._id });
};

/** Danh sách hội thoại (không kèm nội dung), mới nhất trước. Có ticketKey → chỉ hội thoại đính kèm ticket đó. */
export const listConversations = async (ticketKey?: string) => {
  const key = ticketKey?.trim().toUpperCase();
  if (key) await migrateLegacyChat(key);

  const docs = await AIConversation.find(key ? { ticketKeys: key } : {})
    .select('title ticketKeys createdAt updatedAt messages')
    .sort({ updatedAt: -1 })
    .lean();

  return docs.map(({ messages, ...rest }) => ({
    ...rest,
    messageCount: messages.length,
    lastMessage: messages.length ? String(messages[messages.length - 1].content).slice(0, 160) : '',
  }));
};

export const getConversation = async (id: string) => {
  const doc = await AIConversation.findById(id).lean();
  if (!doc) throw new Error('Không tìm thấy hội thoại');
  return doc;
};

export const createConversation = async (input: { title?: string; ticketKeys?: unknown }) =>
  AIConversation.create({
    title: String(input.title || '').trim().slice(0, TITLE_MAX),
    ticketKeys: normalizeTicketKeys(input.ticketKeys),
    messages: [],
  });

export const updateConversation = async (id: string, input: { title?: string; ticketKeys?: unknown }) => {
  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = String(input.title).trim().slice(0, TITLE_MAX);
  if (input.ticketKeys !== undefined) update.ticketKeys = normalizeTicketKeys(input.ticketKeys);
  const doc = await AIConversation.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doc) throw new Error('Không tìm thấy hội thoại');
  return doc;
};

export const deleteConversation = async (id: string) => AIConversation.findByIdAndDelete(id);

const buildContext = async (ticketKeys: string[]) => {
  if (!ticketKeys.length) return '';
  const blocks = await Promise.all(
    ticketKeys.map((key) =>
      buildTicketContext(key).catch((error: any) => `# Ticket ${key}\n(không đọc được từ Jira: ${error?.message || error})`)
    )
  );
  return ['=== DỮ LIỆU TICKET ĐÍNH KÈM ===', blocks.join('\n\n---\n\n'), '=== HẾT DỮ LIỆU ===', ''].join('\n');
};

export const sendMessage = async (id: string, body: { message?: string; preset?: string }) => {
  const message = body.preset ? CHAT_PRESETS[body.preset] : String(body.message || '').trim();
  if (body.preset && !message) throw new Error(`Preset không hợp lệ: ${body.preset}`);
  if (!message) throw new Error('Nội dung chat rỗng');

  const conversation = await AIConversation.findById(id);
  if (!conversation) throw new Error('Không tìm thấy hội thoại');

  const history = conversation.messages.slice(-CHAT_HISTORY_LIMIT);
  const prompt = [
    SYSTEM_RULES,
    '',
    await buildContext(conversation.ticketKeys),
    ...(history.length
      ? ['Lịch sử hội thoại:', ...history.map((item) => `${item.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${item.content}`), '']
      : []),
    `Người dùng: ${message}`,
    'Trợ lý:',
  ].join('\n');

  const answer = await applyNoteBlocks(await analyzeWithCustomPrompt(prompt));

  conversation.messages.push({ role: 'user', content: message, createdAt: new Date() });
  conversation.messages.push({ role: 'assistant', content: answer, createdAt: new Date() });
  if (!conversation.title) conversation.title = message.replace(/\s+/g, ' ').slice(0, TITLE_MAX);
  await conversation.save();

  return conversation.toObject();
};

export const clearMessages = async (id: string) => {
  const doc = await AIConversation.findByIdAndUpdate(id, { messages: [] }, { new: true }).lean();
  if (!doc) throw new Error('Không tìm thấy hội thoại');
  return doc;
};
