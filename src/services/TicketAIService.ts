import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import PDFDocument from 'pdfkit';
import { TicketBrd, ITicketBrd } from '../models/TicketBrd';
import { TicketChat } from '../models/TicketChat';
import { jiraService } from './JiraService';
import { analyzeWithCustomPrompt } from './AIService';

const execFileAsync = promisify(execFile);

/** Font có dấu tiếng Việt, dùng khi tự dựng PDF từ text. */
const UNICODE_FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
/** Số message gần nhất gửi kèm mỗi lượt chat. */
const CHAT_HISTORY_LIMIT = 20;
/** Cắt bớt BRD quá dài để prompt không vượt context. */
const BRD_CHARS_IN_PROMPT = 40000;

// ── ADF -> text ──────────────────────────────────────────────────────────────

const adfToText = (node: any): string => {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(adfToText).join('');
  if (typeof node !== 'object') return String(node);

  if (node.type === 'text') return String(node.text || '');
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'inlineCard' || node.type === 'blockCard') return String(node.attrs?.url || '');
  if (node.type === 'media') return `[ảnh: ${node.attrs?.alt || node.attrs?.id || ''}]`;

  const inner = adfToText(node.content);
  const blockTypes = ['paragraph', 'heading', 'listItem', 'tableRow', 'rule', 'codeBlock'];
  return blockTypes.includes(node.type) ? `${inner}\n` : inner;
};

/** Mọi url xuất hiện trong một cây ADF, giữ thứ tự. */
const adfUrls = (node: any): string[] => {
  const urls: string[] = [];

  const walk = (current: any) => {
    if (Array.isArray(current)) return current.forEach(walk);
    if (!current || typeof current !== 'object') return;

    if (current.type === 'inlineCard' || current.type === 'blockCard') {
      if (current.attrs?.url) urls.push(String(current.attrs.url));
    }
    for (const mark of current.marks || []) {
      if (mark.type === 'link' && mark.attrs?.href) urls.push(String(mark.attrs.href));
    }
    if (typeof current.text === 'string') {
      urls.push(...(current.text.match(/https?:\/\/[^\s)\]]+/g) || []));
    }
    walk(current.content);
  };

  walk(node);
  return urls;
};

export interface BrdLinkCandidate {
  url: string;
  source: 'description' | 'comment';
  /** Người viết comment chứa link — rỗng nếu link nằm trong description. */
  author: string;
  /** true khi url trỏ tới tài liệu (SharePoint/OneDrive/Google Docs/Confluence/file office). */
  likelyBrd: boolean;
}

const DOC_URL_PATTERN =
  /(sharepoint\.com|onedrive\.live\.com|1drv\.ms|docs\.google\.com|drive\.google\.com|\/wiki\/|confluence|\.docx?($|\?)|\.pdf($|\?))/i;

/** Quét description + comment của idea để tìm link BRD. */
export const detectBrdLinks = async (ideaKey: string): Promise<BrdLinkCandidate[]> => {
  const issue = await jiraService.getIssue(ideaKey);
  const comments = await jiraService.getAllIssueComments(ideaKey);

  const found: BrdLinkCandidate[] = [];
  const seen = new Set<string>();

  const push = (url: string, source: BrdLinkCandidate['source'], author: string) => {
    const cleaned = url.replace(/[.,;)]+$/, '');
    if (seen.has(cleaned)) return;
    seen.add(cleaned);
    found.push({ url: cleaned, source, author, likelyBrd: DOC_URL_PATTERN.test(cleaned) });
  };

  for (const url of adfUrls(issue?.fields?.description)) push(url, 'description', '');
  for (const comment of comments) {
    const author = String(comment?.author?.displayName || '');
    for (const url of adfUrls(comment?.body)) push(url, 'comment', author);
  }

  // Link tài liệu lên trước cho dễ chọn.
  return found.sort((a, b) => Number(b.likelyBrd) - Number(a.likelyBrd));
};

// ── docx / pdf -> text + pdf ─────────────────────────────────────────────────

/** Thư mục trong sandbox của Word — ghi vào đây không bật dialog "Grant File Access". */
const WORD_WORK_DIR = path.join(
  os.homedir(),
  'Library/Containers/com.microsoft.Word/Data/tools-brd'
);
const WORD_TIMEOUT_MS = 120000;

const escapeAppleScript = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Để Word mở .docx rồi xuất PDF thật (giữ layout) và trả về text của chính Word.
 * Chỉ chạy trên macOS có Word; nơi khác ném lỗi để gọi fallback.
 */
const wordConvert = async (
  filename: string,
  data: Buffer
): Promise<{ pdf: Buffer; text: string }> => {
  if (process.platform !== 'darwin') throw new Error('Word chỉ dùng được trên macOS');

  await fs.promises.mkdir(WORD_WORK_DIR, { recursive: true });
  const stem = `brd-${Date.now()}`;
  const sourcePath = path.join(WORD_WORK_DIR, `${stem}${path.extname(filename) || '.docx'}`);
  const pdfPath = path.join(WORD_WORK_DIR, `${stem}.pdf`);

  const script = `
tell application "Microsoft Word"
	open "${escapeAppleScript(sourcePath)}"
	set theDoc to active document
	set theText to content of text object of theDoc
	save as theDoc file name "${escapeAppleScript(pdfPath)}" file format format PDF
	repeat while (count of documents) > 0
		close document 1 saving no
	end repeat
	return theText
end tell`;

  try {
    await fs.promises.writeFile(sourcePath, data);
    const { stdout } = await execFileAsync('osascript', ['-e', script], {
      timeout: WORD_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    });
    const pdf = await fs.promises.readFile(pdfPath);
    return { pdf, text: stdout.trim() };
  } finally {
    // Word giữ lại file tạm ~$... nếu đóng bất thường -> xoá theo prefix.
    for (const name of await fs.promises.readdir(WORD_WORK_DIR).catch(() => [])) {
      if (name.includes(stem)) {
        await fs.promises.rm(path.join(WORD_WORK_DIR, name), { force: true }).catch(() => undefined);
      }
    }
  }
};

/** Text trong .docx: unzip word/document.xml rồi bỏ tag, không cần thư viện ngoài. */
const docxToText = async (filePath: string): Promise<string> => {
  const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'brd-'));
  try {
    await execFileAsync('unzip', ['-o', '-q', filePath, 'word/document.xml', '-d', workDir]);
    const xml = await fs.promises.readFile(path.join(workDir, 'word', 'document.xml'), 'utf8');

    return xml
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<w:br\s*\/>/g, '\n')
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  }
};

const pdfToText = async (data: Buffer): Promise<string> => {
  // require động: pdf-parse chạy code đọc file mẫu khi import kiểu ESM.
  const pdfParse = require('pdf-parse');
  const parsed = await pdfParse(data);
  return String(parsed?.text || '').trim();
};

/** Dựng PDF text-only từ nội dung đã trích, dùng khi nguồn không phải PDF. */
const textToPdf = async (title: string, text: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (fs.existsSync(UNICODE_FONT)) doc.font(UNICODE_FONT);
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(text || '(không trích được nội dung)', { align: 'left' });
    doc.end();
  });

export interface ImportBrdInput {
  ideaKey: string;
  filename: string;
  data: Buffer;
  sourceUrl?: string;
}

/** Lưu một BRD: giữ PDF để tải lại, giữ text để làm context cho AI. */
export const importBrd = async (input: ImportBrdInput): Promise<ITicketBrd> => {
  const extension = path.extname(input.filename).toLowerCase();
  let text = '';
  let pdf: Buffer;
  let converter = 'fallback';

  if (extension === '.pdf') {
    pdf = input.data;
    text = await pdfToText(input.data);
    converter = 'pdf';
  } else if (extension === '.docx' || extension === '.doc') {
    try {
      // Word cho PDF đúng layout bản gốc; chỉ khi nó hỏng mới dựng PDF text-only.
      const converted = await wordConvert(input.filename, input.data);
      pdf = converted.pdf;
      text = converted.text;
      converter = 'word';
    } catch (wordError: any) {
      console.warn(`[BRD] Word không convert được ${input.filename}:`, wordError?.message || wordError);
      const tempPath = path.join(
        await fs.promises.mkdtemp(path.join(os.tmpdir(), 'brd-src-')),
        input.filename
      );
      try {
        await fs.promises.writeFile(tempPath, input.data);
        text = await docxToText(tempPath);
      } finally {
        await fs.promises.rm(path.dirname(tempPath), { recursive: true, force: true });
      }
      pdf = await textToPdf(input.filename, text);
    }
  } else if (['.txt', '.md'].includes(extension)) {
    text = input.data.toString('utf8');
    pdf = await textToPdf(input.filename, text);
  } else {
    throw new Error(`Chưa hỗ trợ định dạng ${extension || 'này'} — dùng .docx, .pdf, .txt hoặc .md`);
  }

  if (!text.trim()) {
    throw new Error('Không trích được chữ nào từ file — nếu là PDF scan thì cần OCR trước');
  }

  return TicketBrd.create({
    ideaKey: input.ideaKey.toUpperCase(),
    sourceUrl: input.sourceUrl || '',
    filename: input.filename,
    pdf,
    pdfSize: pdf.length,
    text,
    converter,
    importedAt: new Date(),
  });
};

export const getBrdList = async (ideaKey: string) =>
  TicketBrd.find({ ideaKey: ideaKey.toUpperCase() })
    .select('-pdf')
    .sort({ importedAt: -1 })
    .lean();

export const getBrdPdf = async (brdId: string) => TicketBrd.findById(brdId).select('pdf filename').lean();

export const deleteBrd = async (brdId: string) => TicketBrd.findByIdAndDelete(brdId);

// ── Chat ─────────────────────────────────────────────────────────────────────

/** Ticket + BRD gói thành một khối context để model đọc. */
const buildTicketContext = async (ideaKey: string): Promise<string> => {
  const issue = await jiraService.getIssue(ideaKey);
  const fields = issue?.fields || {};

  const linkedKeys: string[] = (fields.issuelinks || [])
    .flatMap((link: any) => [link.inwardIssue?.key, link.outwardIssue?.key])
    .filter(Boolean);

  const brds = await TicketBrd.find({ ideaKey: ideaKey.toUpperCase() }).select('filename text').lean();

  const parts = [
    `# Ticket ${issue.key}`,
    `Summary: ${fields.summary || ''}`,
    `Status: ${fields.status?.name || ''}`,
    `Roadmap: ${fields.customfield_10222?.value || ''} | Target sprint: ${fields.customfield_10631?.value || ''}`,
    `Linked work items: ${linkedKeys.length ? linkedKeys.join(', ') : 'chưa có'}`,
    '',
    '## Mô tả ticket',
    adfToText(fields.description).trim() || '(rỗng)',
  ];

  for (const brd of brds) {
    parts.push('', `## BRD: ${brd.filename}`, String(brd.text || '').slice(0, BRD_CHARS_IN_PROMPT));
  }
  if (brds.length === 0) parts.push('', '## BRD', '(chưa import BRD nào cho ticket này)');

  return parts.join('\n');
};

const SYSTEM_RULES = [
  'Bạn là trợ lý phân tích yêu cầu sản phẩm cho đội Lending của Cake Digital Bank.',
  'Trả lời bằng tiếng Việt có dấu, ngắn gọn, kết luận trước, gạch đầu dòng khi liệt kê.',
  'Chỉ dựa trên dữ liệu ticket và BRD được cung cấp. Không chắc thì nói thẳng là không chắc.',
].join(' ');

export const getChat = async (ideaKey: string) =>
  TicketChat.findOne({ ideaKey: ideaKey.toUpperCase() }).lean();

export const clearChat = async (ideaKey: string) =>
  TicketChat.findOneAndUpdate(
    { ideaKey: ideaKey.toUpperCase() },
    { messages: [] },
    { upsert: true, new: true }
  );

export const sendChatMessage = async (ideaKey: string, message: string) => {
  const key = ideaKey.toUpperCase();
  if (!message.trim()) throw new Error('Nội dung chat rỗng');

  const thread =
    (await TicketChat.findOne({ ideaKey: key })) || (await TicketChat.create({ ideaKey: key, messages: [] }));

  const context = await buildTicketContext(key);
  const history = thread.messages.slice(-CHAT_HISTORY_LIMIT);

  const prompt = [
    SYSTEM_RULES,
    '',
    '=== DỮ LIỆU TICKET ===',
    context,
    '=== HẾT DỮ LIỆU ===',
    '',
    ...(history.length
      ? ['Lịch sử hội thoại:', ...history.map((item) => `${item.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${item.content}`), '']
      : []),
    `Người dùng: ${message.trim()}`,
    'Trợ lý:',
  ].join('\n');

  const answer = await analyzeWithCustomPrompt(prompt);

  thread.messages.push({ role: 'user', content: message.trim(), createdAt: new Date() });
  thread.messages.push({ role: 'assistant', content: answer, createdAt: new Date() });
  await thread.save();

  return thread.toObject();
};

export const CHAT_PRESETS: Record<string, string> = {
  analyze:
    'Phân tích BRD này: mục tiêu, phạm vi, các luồng nghiệp vụ chính, hệ thống liên quan. Nêu rõ phần nào BRD chưa nói tới.',
  gaps: 'Liệt kê các điểm mơ hồ, thiếu sót, mâu thuẫn trong BRD và mô tả ticket. Mỗi điểm kèm câu hỏi cần hỏi lại BA.',
  acceptance:
    'Viết acceptance criteria theo định dạng Given/When/Then cho ticket này, bám sát BRD. Gom nhóm theo luồng nghiệp vụ.',
  risks: 'Nêu rủi ro triển khai, tác động tới hệ thống hiện tại và các case lỗi cần xử lý.',
};

export const runPreset = async (ideaKey: string, preset: string) => {
  const prompt = CHAT_PRESETS[preset];
  if (!prompt) throw new Error(`Preset không hợp lệ: ${preset}`);
  return sendChatMessage(ideaKey, prompt);
};
