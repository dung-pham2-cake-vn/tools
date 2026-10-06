import { AIConversation } from '../models/AIConversation';
import { SvkNote } from '../models/SvkNote';
import { buildSvkContext } from './svkContext';
import { TicketChat } from '../models/TicketChat';
import { analyzeWithCustomPrompt } from './AIService';
import { buildTicketContext, CHAT_PRESETS } from './TicketAIService';
import { appendNote } from './TicketNoteService';
import { buildKbIndexBlock, buildKbReadBlock, buildKbSearchBlock, kbAvailable } from './KbService';

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

/** Thêm vào SYSTEM_RULES khi máy chạy backend có knowledge base lending. */
const KB_RULES = [
  'Bạn có mục lục knowledge base lending (KB) đính kèm. KB là CHỈ ĐỌC — bạn không ghi được vào đó.',
  'Cần nội dung một file trong mục lục thì trả lời DUY NHẤT một khối, không kèm chữ nào khác:',
  '<<<KB_READ',
  'kb/duong/dan/file.md',
  'kb-po/file-khac.md',
  '>>>',
  'Không biết file nào chứa thông tin thì tìm trước, cũng trả lời DUY NHẤT một khối:',
  '<<<KB_SEARCH',
  'từ khoá',
  '>>>',
  'Hệ thống sẽ đưa nội dung/kết quả rồi hỏi lại bạn. Tối đa 2 lượt lấy dữ liệu cho mỗi câu hỏi,',
  'sau đó phải trả lời bằng những gì đang có. Khi dùng thông tin từ KB, ghi rõ đường dẫn file làm nguồn.',
  'Chỉ dùng KB khi câu hỏi thực sự cần kiến thức sản phẩm/nghiệp vụ; hỏi về ticket đính kèm thì trả lời thẳng.',
].join('\n');

const KB_READ_RE = /<<<KB_READ\s*\n([\s\S]*?)\n?>>>/;
const KB_SEARCH_RE = /<<<KB_SEARCH\s*\n([\s\S]*?)\n?>>>/;
/** Số lượt model được xin thêm dữ liệu KB trước khi buộc phải trả lời. */
const KB_MAX_ROUNDS = 2;

const splitLines = (block: string) => block.split('\n').map((line) => line.trim()).filter(Boolean);

/**
 * Model xin đọc/tìm KB thì nạp dữ liệu rồi hỏi lại, tối đa KB_MAX_ROUNDS lượt.
 * Chỉ đọc — không có nhánh nào ghi xuống KB.
 */
const answerWithKb = async (basePrompt: string): Promise<string> => {
  let prompt = basePrompt;

  for (let round = 0; round <= KB_MAX_ROUNDS; round += 1) {
    const answer = await analyzeWithCustomPrompt(prompt);
    const readMatch = answer.match(KB_READ_RE);
    const searchMatch = answer.match(KB_SEARCH_RE);
    if (!readMatch && !searchMatch) return answer;

    if (round === KB_MAX_ROUNDS) {
      // hết lượt: ép trả lời bằng dữ liệu đang có, không nạp thêm
      prompt = [prompt, '', 'Hết lượt tra KB. Trả lời ngay bằng dữ liệu đang có, không dùng khối KB_READ/KB_SEARCH nữa.', 'Trợ lý:'].join('\n');
      continue;
    }

    const fetched = [
      readMatch ? buildKbReadBlock(splitLines(readMatch[1])) : '',
      searchMatch ? buildKbSearchBlock(splitLines(searchMatch[1])) : '',
    ]
      .filter(Boolean)
      .join('\n');

    prompt = [prompt, '', fetched, 'Trợ lý:'].join('\n');
  }

  return analyzeWithCustomPrompt(prompt);
};

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

/** SVK đã quét có sẵn comment + PL liên quan trong DB — đầy đủ hơn đọc lại Jira. */
const ticketContext = async (key: string) =>
  (key.startsWith('SVK-') && (await buildSvkContext(key))) || buildTicketContext(key);

const buildContext = async (ticketKeys: string[]) => {
  if (!ticketKeys.length) return '';
  const blocks = await Promise.all(
    ticketKeys.map((key) =>
      ticketContext(key).catch((error: any) => `# Ticket ${key}\n(không đọc được từ Jira: ${error?.message || error})`)
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
  const useKb = kbAvailable();
  const prompt = [
    SYSTEM_RULES,
    ...(useKb ? ['', KB_RULES] : []),
    '',
    useKb ? buildKbIndexBlock() : '',
    await buildContext(conversation.ticketKeys),
    ...(history.length
      ? ['Lịch sử hội thoại:', ...history.map((item) => `${item.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${item.content}`), '']
      : []),
    `Người dùng: ${message}`,
    'Trợ lý:',
  ].join('\n');

  const answer = await applyNoteBlocks(useKb ? await answerWithKb(prompt) : await analyzeWithCustomPrompt(prompt));

  conversation.messages.push({ role: 'user', content: message, createdAt: new Date() });
  conversation.messages.push({ role: 'assistant', content: answer, createdAt: new Date() });
  if (!conversation.title) conversation.title = message.replace(/\s+/g, ' ').slice(0, TITLE_MAX);
  await conversation.save();

  // hội thoại của SVK: câu trả lời cuối luôn là dòng AI ở cột Note bảng Support
  if (conversation.svkKey) {
    await SvkNote.updateOne(
      { key: conversation.svkKey },
      { $set: { aiNote: answer, aiNoteAt: new Date(), aiNoteError: '' } },
      { upsert: true }
    );
  }

  return conversation.toObject();
};

export const clearMessages = async (id: string) => {
  const doc = await AIConversation.findByIdAndUpdate(id, { messages: [] }, { new: true }).lean();
  if (!doc) throw new Error('Không tìm thấy hội thoại');
  return doc;
};
