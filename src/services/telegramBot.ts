import { SvkTicket } from '../models/SvkTicket';
import { SvkNote } from '../models/SvkNote';
import { scanSvkTickets } from './SvkService';
import { linkIssueKey, reportScan } from './svkAutoScan';
import { analyzeWithCustomPrompt } from './AIService';
import { jiraService } from './JiraService';
import {
  escapeHtml,
  getAllowedChatId,
  getBotUsername,
  getTelegramUpdates,
  isTelegramConfigured,
  sendTelegram,
  setBotCommands,
  TelegramUpdate,
} from './TelegramService';

/**
 * Bot Telegram hai chiều cho SVK.
 *
 * Nhận lệnh bằng long polling (máy chạy local, không có URL public cho webhook).
 * Cú pháp quen thuộc được xử lý thẳng bằng regex; câu nói tự do mới nhờ AI phân loại,
 * và AI chỉ được chọn trong tập hành động an toàn bên dưới — không có xoá ticket.
 */

const ENABLED = process.env.TELEGRAM_BOT_ENABLED !== 'false';
const POLL_TIMEOUT_SEC = 30;

const TICKET_RE = /^([A-Z]{2,5}-\d+)\b/i;
/** Chỉ gõ số cuối của key, vd "11664 đã xử lý xong" -> SVK-11664. */
const SHORT_KEY_RE = /^(\d{3,8})\b/;
const CLEAR_WORDS = /^(-|x|xoá note|xoa note|clear|clear note|bỏ note|bo note)$/i;

let polling = false;
let offset = 0;
let botUsername = '';

/** Trong group, tin nhắn tới bot thường kèm @username — bỏ đi trước khi parse. */
const stripMention = (text: string): string => {
  let out = text.trim();
  if (botUsername) out = out.replace(new RegExp(`@${botUsername}`, 'gi'), ' ');
  // getMe có thể chưa chạy xong -> vẫn bóc được @..._bot đứng đầu tin nhắn
  out = out.replace(/^@\w*bot\b/i, ' ');
  // /scan@bot -> /scan
  return out.replace(/^(\/[a-z_]+)@\S+/i, '$1').replace(/\s+/g, ' ').trim();
};

/** Tìm ticket theo số đuôi; ưu tiên SVK vì đó là thứ hay được nhắc trong report. */
const resolveShortKey = async (digits: string): Promise<{ key?: string; error?: string }> => {
  const docs = await SvkTicket.find({ key: { $regex: `-${digits}$` } }).select('key').lean();
  if (docs.length === 1) return { key: docs[0].key };
  if (docs.length > 1) {
    return { error: `Số ${digits} khớp nhiều ticket: ${docs.map((d) => d.key).join(', ')}. Gõ đủ key giúp mình.` };
  }
  return { error: `Không tìm thấy ticket nào có số ${digits}. Gõ /list để xem ticket đang mở.` };
};

/** Bỏ cặp nháy bao ngoài nếu người dùng gõ SVK-123 "note gì đó". */
const stripQuotes = (text: string): string => {
  const trimmed = text.trim();
  const quoted = trimmed.match(/^["'“”‘’](.*)["'“”‘’]$/s);
  return (quoted ? quoted[1] : trimmed).trim();
};

const ticketLine = async (key: string): Promise<string> => {
  const doc = await SvkTicket.findOne({ key }).select('key summary status linkedPlKeys created').lean();
  if (!doc) return `Không tìm thấy <b>${escapeHtml(key)}</b> trong dữ liệu đã scan.`;
  const note = await SvkNote.findOne({ key }).select('note').lean();
  const pl = (doc.linkedPlKeys || []).map(linkIssueKey).join(', ') || 'chưa có PL';

  let approvalLine = '';
  try {
    const approvals = await jiraService.getRequestApprovals(key);
    const pending = approvals.find((a) => a.finalDecision === 'pending');
    if (pending) {
      approvalLine = `Approval: ${escapeHtml(pending.name)} — đang chờ${
        pending.canAnswer ? ' (bạn duyệt được: /approve · /reject)' : ''
      }`;
    } else if (approvals.length) {
      approvalLine = `Approval: ${escapeHtml(approvals[0].finalDecision)}`;
    }
  } catch {
    // không đọc được approval thì bỏ qua, phần còn lại vẫn hiển thị
  }

  return [
    `${linkIssueKey(doc.key)} x ${pl}`,
    escapeHtml(doc.summary || ''),
    `Status: ${escapeHtml(doc.status || '—')}`,
    ...(approvalLine ? [approvalLine] : []),
    `Note: ${note?.note ? escapeHtml(note.note) : '(chưa có)'}`,
  ].join('\n');
};

const setNote = async (key: string, note: string): Promise<string> => {
  const exists = await SvkTicket.findOne({ key }).select('key').lean();
  if (!exists) return `Không tìm thấy <b>${escapeHtml(key)}</b>. Gõ /list để xem ticket đang mở.`;
  await SvkNote.findOneAndUpdate({ key }, { note }, { upsert: true });
  return note
    ? `✅ Đã ghi note cho <b>${escapeHtml(key)}</b>:\n${escapeHtml(note)}`
    : `✅ Đã xoá note của <b>${escapeHtml(key)}</b>`;
};

/** Duyệt / từ chối request JSM. Chỉ chạy được nếu tài khoản trong .env là approver. */
const answerApproval = async (rawKey: string, decision: 'approve' | 'decline'): Promise<string> => {
  const key = rawKey.toUpperCase();
  let approvals;
  try {
    approvals = await jiraService.getRequestApprovals(key);
  } catch (error: any) {
    return `❌ Không đọc được approval của ${escapeHtml(key)}: ${escapeHtml(error?.message || String(error))}`;
  }

  const pending = approvals.find((a) => a.finalDecision === 'pending');
  if (!pending) {
    const done = approvals[0];
    return done
      ? `${linkIssueKey(key)} đã chốt approval rồi (${escapeHtml(done.finalDecision)}).`
      : `${linkIssueKey(key)} không có bước approval nào.`;
  }
  if (!pending.canAnswer) {
    const names = pending.approvers.map((a) => a.name).join(', ');
    return `⚠️ Tài khoản của tool không nằm trong danh sách approver của ${escapeHtml(key)}.\nApprover: ${escapeHtml(names)}`;
  }

  try {
    await jiraService.answerApproval(key, pending.id, decision);
  } catch (error: any) {
    return `❌ ${decision === 'approve' ? 'Approve' : 'Reject'} ${escapeHtml(key)} thất bại: ${escapeHtml(
      error?.message || String(error)
    )}`;
  }

  return `${decision === 'approve' ? '✅ Đã approve' : '🚫 Đã reject'} ${linkIssueKey(key)} (bước "${escapeHtml(
    pending.name
  )}")`;
};

/** Dùng chung cho /approve, /reject: chấp nhận cả key đầy đủ lẫn số rút gọn. */
const resolveThen = async (
  rest: string,
  action: (key: string) => Promise<string>,
  usage: string
): Promise<string> => {
  const text = rest.trim();
  if (!text) return usage;
  const full = text.match(TICKET_RE);
  if (full) return action(full[1].toUpperCase());
  const short = text.match(SHORT_KEY_RE);
  if (!short) return usage;
  const resolved = await resolveShortKey(short[1]);
  if (resolved.error) return escapeHtml(resolved.error);
  return action(resolved.key!);
};

const listTickets = async (): Promise<string> => {
  const docs = await SvkTicket.find({}).select('key linkedPlKeys created').sort({ created: 1 }).lean();
  if (!docs.length) return 'Chưa có ticket SVK nào trong dữ liệu. Gõ /scan để quét.';
  const notes = new Map(
    (await SvkNote.find({}).select('key note').lean()).map((n) => [n.key, (n.note || '').trim()])
  );
  const lines = docs.map((d) => {
    const pl = (d.linkedPlKeys || []).map(linkIssueKey).join(', ') || 'chưa có PL';
    const note = notes.get(d.key);
    return `${linkIssueKey(d.key)} x ${pl}${note ? ` · ${escapeHtml(note)}` : ''}`;
  });
  return `<b>${docs.length} ticket SVK đang mở</b>\n\n${lines.join('\n')}`;
};

const runScan = (): string => {
  const startedAt = Date.now();
  void (async () => {
    try {
      const result = await scanSvkTickets();
      await reportScan('telegram', result, startedAt);
    } catch (error: any) {
      await sendTelegram(`❌ Scan lỗi: ${escapeHtml(error?.message || String(error))}`);
    }
  })();
  return '🔄 Đang quét SVK, xong sẽ báo lại...';
};

const HELP = [
  '<b>Lệnh SVK bot</b>',
  '',
  '<code>/note 11664 nội dung</code> — ghi note (dùng được cả khi bot bật privacy)',
  '<code>/note 11664 -</code> — xoá note',
  '<code>/ticket 11664</code> — xem chi tiết ticket (kèm trạng thái approval)',
  '<code>/approve 11658</code> · <code>/reject 11658</code> — duyệt / từ chối request',
  '<code>/list</code> — danh sách ticket đang mở kèm note',
  '<code>/scan</code> — quét lại SVK từ Jira',
  '<code>/help</code> — bảng lệnh này',
  '',
  'Nếu bot được tắt privacy (hoặc làm admin group), nhắn thẳng cũng được:',
  '<code>11664 đã xử lý xong</code> · <code>SVK-11664</code> · “ghi cho 11664 là đợi ops phản hồi”',
].join('\n');

/** Menu hiện khi gõ "/" trong khung chat Telegram. */
const BOT_COMMANDS = [
  { command: 'note', description: 'Ghi note: /note 11664 nội dung (dấu - để xoá)' },
  { command: 'ticket', description: 'Xem chi tiết ticket: /ticket 11664' },
  { command: 'approve', description: 'Duyệt request: /approve 11658' },
  { command: 'reject', description: 'Từ chối request: /reject 11658' },
  { command: 'list', description: 'Danh sách ticket SVK đang mở kèm note' },
  { command: 'scan', description: 'Quét lại SVK từ Jira rồi báo kết quả' },
  { command: 'help', description: 'Hướng dẫn dùng bot' },
];

/** Hành động AI được phép chọn. Mọi thứ ngoài danh sách này bị từ chối. */
interface AiIntent {
  action: 'set_note' | 'clear_note' | 'show' | 'list' | 'scan' | 'reply';
  key?: string;
  note?: string;
  reply?: string;
}

const askAi = async (text: string): Promise<string> => {
  const keys = (await SvkTicket.find({}).select('key summary').lean())
    .map((d) => `${d.key}: ${d.summary || ''}`)
    .join('\n');

  const prompt = [
    'Bạn là bộ phân loại ý định cho bot quản lý ticket SVK. Chỉ trả về JSON, không giải thích.',
    '',
    'Các ticket đang có:',
    keys || '(chưa có ticket nào)',
    '',
    'Tin nhắn người dùng:',
    text,
    '',
    'Trả JSON đúng schema:',
    '{"action":"set_note|clear_note|show|list|scan|reply","key":"SVK-xxxxx","note":"nội dung note","reply":"câu trả lời ngắn nếu action=reply"}',
    '',
    'Quy tắc:',
    '- Người dùng muốn ghi/thêm/cập nhật ghi chú cho một ticket -> set_note, kèm key và note.',
    '- Người dùng chỉ đưa số ngắn (vd 11664) thì khớp với ticket có key kết thúc bằng số đó.',
    '- Muốn xoá note -> clear_note. Hỏi thông tin 1 ticket -> show. Xem danh sách -> list. Quét lại -> scan.',
    '- Không chắc ý định hoặc không liên quan -> reply, với reply là câu hỏi lại ngắn gọn bằng tiếng Việt.',
  ].join('\n');

  let intent: AiIntent;
  try {
    const raw = await analyzeWithCustomPrompt(prompt);
    const json = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    intent = JSON.parse(json.slice(json.indexOf('{'), json.lastIndexOf('}') + 1)) as AiIntent;
  } catch (error: any) {
    return `Chưa hiểu lệnh, mà AI cũng không phân tích được (${escapeHtml(
      error?.message || String(error)
    )}).\n\n${HELP}`;
  }

  switch (intent.action) {
    case 'set_note':
      if (!intent.key || !intent.note) return `AI không xác định được ticket hoặc nội dung note.\n\n${HELP}`;
      return setNote(intent.key.toUpperCase(), intent.note.trim());
    case 'clear_note':
      if (!intent.key) return `AI không xác định được ticket cần xoá note.\n\n${HELP}`;
      return setNote(intent.key.toUpperCase(), '');
    case 'show':
      if (!intent.key) return `AI không xác định được ticket.\n\n${HELP}`;
      return ticketLine(intent.key.toUpperCase());
    case 'list':
      return listTickets();
    case 'scan':
      return runScan();
    default:
      return escapeHtml(intent.reply || 'Chưa rõ ý, bạn nói lại giúp mình nhé.');
  }
};

const applyTicketCommand = async (key: string, remainder: string): Promise<string> => {
  const rest = stripQuotes(remainder);
  if (!rest) return ticketLine(key);
  if (CLEAR_WORDS.test(rest)) return setNote(key, '');
  return setNote(key, rest);
};

/** Cú pháp cố định xử lý trước; không khớp mới đẩy sang AI. */
export const handleCommand = async (rawText: string): Promise<string> => {
  const text = stripMention(rawText);
  if (!text) return HELP;

  const lower = text.toLowerCase();
  if (lower === '/start' || lower === '/help') return HELP;
  if (lower === '/list' || lower === '/svk') return listTickets();
  if (lower === '/scan') return runScan();

  const approveCmd = text.match(/^\/approve\b\s*(.*)$/is);
  if (approveCmd) {
    return resolveThen(approveCmd[1], (key) => answerApproval(key, 'approve'), 'Cú pháp: <code>/approve 11658</code>');
  }

  const rejectCmd = text.match(/^\/(?:reject|decline)\b\s*(.*)$/is);
  if (rejectCmd) {
    return resolveThen(rejectCmd[1], (key) => answerApproval(key, 'decline'), 'Cú pháp: <code>/reject 11658</code>');
  }

  const ticketCmd = text.match(/^\/ticket\b\s*(.*)$/is);
  if (ticketCmd) {
    const rest = ticketCmd[1].trim();
    if (!rest) return 'Cú pháp: <code>/ticket SVK-11664</code> hoặc <code>/ticket 11664</code>';
    return handleCommand(rest);
  }

  // Trong group bật privacy mode, chỉ tin bắt đầu bằng "/" mới tới được bot,
  // nên /note là đường ghi chú không cần tắt privacy.
  const noteCmd = text.match(/^\/(?:note|n)\b\s*(.*)$/is);
  if (noteCmd) {
    const rest = noteCmd[1].trim();
    if (!rest) return `Cú pháp: <code>/note SVK-11664 nội dung</code> hoặc <code>/note 11664 nội dung</code>`;
    return handleCommand(rest);
  }

  const matched = text.match(TICKET_RE);
  if (matched) {
    return applyTicketCommand(matched[1].toUpperCase(), text.slice(matched[1].length));
  }

  const shortMatched = text.match(SHORT_KEY_RE);
  if (shortMatched) {
    const resolved = await resolveShortKey(shortMatched[1]);
    if (resolved.error) return escapeHtml(resolved.error);
    return applyTicketCommand(resolved.key!, text.slice(shortMatched[1].length));
  }

  return askAi(text);
};

const handleUpdate = async (update: TelegramUpdate): Promise<void> => {
  const message = update.message;
  if (!message?.text) return;

  // chỉ nhận lệnh từ đúng chat đã cấu hình
  if (String(message.chat.id) !== getAllowedChatId()) {
    console.warn(`[Telegram bot] bỏ qua tin từ chat ${message.chat.id}`);
    return;
  }

  console.log(`[Telegram bot] nhận: ${JSON.stringify(message.text).slice(0, 120)}`);
  try {
    const reply = await handleCommand(message.text);
    await sendTelegram(reply, String(message.chat.id));
  } catch (error: any) {
    console.error('[Telegram bot] xử lý lỗi:', error?.message || error);
    await sendTelegram(`❌ Lỗi xử lý: ${escapeHtml(error?.message || String(error))}`, String(message.chat.id));
  }
};

const loop = async (): Promise<void> => {
  while (polling) {
    try {
      const updates = await getTelegramUpdates(offset, POLL_TIMEOUT_SEC);
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error: any) {
      const description = error?.response?.data?.description || error?.message || String(error);
      if (error?.response?.status === 409) {
        // hai tiến trình cùng getUpdates -> update bị chia đôi, tin nhắn như rơi vào hư không
        console.error('[Telegram bot] 409 Conflict — có tiến trình khác đang poll cùng bot token. Tắt bớt 1 server.');
      } else {
        console.error('[Telegram bot] poll lỗi:', description);
      }
      // lỗi mạng/Telegram -> nghỉ rồi thử lại, không để vòng lặp quay nóng
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

export const startTelegramBot = (): void => {
  if (!ENABLED) {
    console.log('[Telegram bot] disabled (TELEGRAM_BOT_ENABLED=false)');
    return;
  }
  if (!isTelegramConfigured()) {
    console.log('[Telegram bot] off — chưa set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
    return;
  }
  if (polling) return;

  polling = true;
  void (async () => {
    try {
      botUsername = await getBotUsername();
    } catch {
      // không lấy được username thì vẫn chạy, chỉ là không bóc được @mention
    }
    try {
      await setBotCommands(BOT_COMMANDS);
    } catch (error: any) {
      console.warn('[Telegram bot] không đăng ký được menu lệnh:', error?.message || error);
    }
    try {
      // bỏ qua tin nhắn tồn đọng trước khi server khởi động
      const backlog = await getTelegramUpdates(-1, 0);
      if (backlog.length) offset = backlog[backlog.length - 1].update_id + 1;
    } catch {
      // không lấy được backlog thì cứ bắt đầu từ 0
    }
    console.log(`[Telegram bot] listening (long polling)${botUsername ? ` as @${botUsername}` : ''}`);
    void loop();
  })();
};

export const stopTelegramBot = (): void => {
  polling = false;
};
