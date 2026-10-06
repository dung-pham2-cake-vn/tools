import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import PDFDocument from 'pdfkit';
import { TicketBrd, ITicketBrd } from '../models/TicketBrd';
import { jiraService } from './JiraService';
import { getNote } from './TicketNoteService';
import { getConfig, setConfig } from '../models/AppConfig';

const execFileAsync = promisify(execFile);

/** Font có dấu tiếng Việt, dùng khi tự dựng PDF từ text. */
const UNICODE_FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
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

const brdLinksConfigKey = (ideaKey: string) => `brd_links:${ideaKey.toUpperCase()}`;

export interface SavedBrdLinks {
  links: BrdLinkCandidate[];
  scannedAt: string | null;
}

/** Link đã quét lần trước — mở panel là thấy ngay, không phải gọi Jira lại. */
export const getSavedBrdLinks = async (ideaKey: string): Promise<SavedBrdLinks> =>
  (await getConfig(brdLinksConfigKey(ideaKey))) || { links: [], scannedAt: null };

/** Quét lại từ Jira và lưu kết quả theo ticket. */
export const scanBrdLinks = async (ideaKey: string): Promise<SavedBrdLinks> => {
  const saved: SavedBrdLinks = { links: await detectBrdLinks(ideaKey), scannedAt: new Date().toISOString() };
  await setConfig(brdLinksConfigKey(ideaKey), saved);
  return saved;
};

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

/** Word chỉ xử lý được một việc mỗi lúc — xếp hàng mọi lệnh gọi Word. */
let wordQueue: Promise<unknown> = Promise.resolve();
const withWord = <T>(job: () => Promise<T>): Promise<T> => {
  const run = wordQueue.then(job, job);
  wordQueue = run.catch(() => undefined);
  return run;
};

const WORD_OPEN_URL_TIMEOUT_MS = 180000;
const WORD_POLL_MS = 2000;

const runAppleScript = async (script: string, timeout = WORD_TIMEOUT_MS) => {
  const { stdout } = await execFileAsync('osascript', ['-e', script], {
    timeout,
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.trim();
};

/** full name của mọi document đang mở trong Word (url với file SharePoint). */
const wordOpenDocuments = async (): Promise<string[]> => {
  const out = await runAppleScript(`
tell application "Microsoft Word"
	set AppleScript's text item delimiters to linefeed
	set names to full name of every document
	return names as text
end tell`, 30000).catch((error: any) => {
    console.warn('[BRD] Không đọc được danh sách document của Word:', error?.stderr || error?.message || error);
    return '';
  });
  return out.split('\n').map((line) => line.trim()).filter((line) => line && line !== 'missing value');
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mở link SharePoint/OneDrive bằng Word trên máy này (dùng phiên đăng nhập Office sẵn có),
 * xuất PDF đúng layout + lấy text. Đóng document sau khi xong nếu trước đó chưa mở.
 */
const wordConvertFromUrl = async (url: string): Promise<{ pdf: Buffer; text: string; filename: string }> => {
  if (process.platform !== 'darwin') throw new Error('Mở bằng Word chỉ dùng được trên macOS');

  await fs.promises.mkdir(WORD_WORK_DIR, { recursive: true });
  const before = new Set(await wordOpenDocuments());
  // Tên file gợi ý từ link dạng Doc.aspx?file=... để nhận ra doc đã mở sẵn.
  const hintedName = (() => {
    try {
      return new URL(url).searchParams.get('file') || '';
    } catch {
      return '';
    }
  })();

  await execFileAsync('open', ['-a', 'Microsoft Word', url]);

  let target = '';
  const deadline = Date.now() + WORD_OPEN_URL_TIMEOUT_MS;
  while (!target && Date.now() < deadline) {
    await sleep(WORD_POLL_MS);
    const docs = await wordOpenDocuments();
    target =
      docs.find((name) => !before.has(name)) ||
      (hintedName ? docs.find((name) => name.endsWith(`/${hintedName}`)) || '' : '');
  }
  if (!target) {
    throw new Error('Word không mở được link trong 3 phút — kiểm tra đã đăng nhập Office và có quyền xem file');
  }

  const openedByUs = !before.has(target);
  const filename = decodeURIComponent(target.split('/').pop() || 'brd.docx');
  const pdfPath = path.join(WORD_WORK_DIR, `brd-url-${Date.now()}.pdf`);
  const docRef = `(first document whose full name is "${escapeAppleScript(target)}")`;

  try {
    // Doc vừa mở có thể chưa tải xong nội dung — đọc text tới khi ổn định.
    let text = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const current = await runAppleScript(`
tell application "Microsoft Word"
	return content of text object of ${docRef}
end tell`);
      if (current && current === text) break;
      text = current;
      await sleep(WORD_POLL_MS);
    }

    await runAppleScript(`
tell application "Microsoft Word"
	save as ${docRef} file name "${escapeAppleScript(pdfPath)}" file format format PDF
end tell`);
    const pdf = await fs.promises.readFile(pdfPath);
    return { pdf, text, filename };
  } finally {
    await fs.promises.rm(pdfPath, { force: true }).catch(() => undefined);
    if (openedByUs) {
      await runAppleScript(`
tell application "Microsoft Word"
	close ${docRef} saving no
end tell`, 30000).catch(() => undefined);
    }
  }
};

/** Import BRD thẳng từ link: Word mở link, xuất PDF, lưu theo ticket (thay bản cũ cùng link). */
export const importBrdFromUrl = async (ideaKey: string, url: string): Promise<ITicketBrd> => {
  const converted = await withWord(() => wordConvertFromUrl(url));
  if (!converted.text.trim()) throw new Error('Word mở được file nhưng không đọc được chữ nào');

  const key = ideaKey.toUpperCase();
  await TicketBrd.deleteMany({ ideaKey: key, sourceUrl: url });
  return TicketBrd.create({
    ideaKey: key,
    sourceUrl: url,
    filename: converted.filename,
    pdf: converted.pdf,
    pdfSize: converted.pdf.length,
    text: converted.text,
    converter: 'word',
    importedAt: new Date(),
  });
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
      const converted = await withWord(() => wordConvert(input.filename, input.data));
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

// ── Context ticket cho chat AI ───────────────────────────────────────────────

/** Ticket + BRD gói thành một khối context để model đọc. Dùng được cho mọi project (PR, PL, PLO, DOP, PKA...). */
/**
 * Đánh số từng dòng BRD trong prompt để AI trỏ được "chỗ nào trong BRD".
 * Word trả về xuống dòng bằng \r nên phải tách cả ba kiểu.
 */
const numberBrdLines = (text: string): string =>
  text
    .slice(0, BRD_CHARS_IN_PROMPT)
    .split(/\r\n|\r|\n/)
    .map((line, index) => `[L${index + 1}] ${line}`)
    .join('\n');

export const buildTicketContext = async (ticketKey: string): Promise<string> => {
  const key = ticketKey.toUpperCase();
  const issue = await jiraService.getIssue(key);
  const fields = issue?.fields || {};

  const linkedKeys: string[] = (fields.issuelinks || [])
    .flatMap((link: any) => [link.inwardIssue?.key, link.outwardIssue?.key])
    .filter(Boolean);
  const subtaskKeys: string[] = (fields.subtasks || []).map((sub: any) => sub.key).filter(Boolean);
  const fixVersions: string[] = (fields.fixVersions || []).map((v: any) => v.name).filter(Boolean);

  const brds = await TicketBrd.find({ ideaKey: key }).select('filename text').lean();

  const parts = [
    `# Ticket ${issue.key} (${fields.issuetype?.name || ''})`,
    `Summary: ${fields.summary || ''}`,
    `Status: ${fields.status?.name || ''} | Assignee: ${fields.assignee?.displayName || 'Unassigned'}`,
    ...(fields.parent?.key ? [`Parent: ${fields.parent.key} — ${fields.parent.fields?.summary || ''}`] : []),
    ...(fixVersions.length ? [`Fix version: ${fixVersions.join(', ')}`] : []),
    ...(fields.customfield_10222?.value || fields.customfield_10631?.value
      ? [`Roadmap: ${fields.customfield_10222?.value || ''} | Target sprint: ${fields.customfield_10631?.value || ''}`]
      : []),
    ...(subtaskKeys.length ? [`Subtasks: ${subtaskKeys.join(', ')}`] : []),
    `Linked work items: ${linkedKeys.length ? linkedKeys.join(', ') : 'chưa có'}`,
    '',
    '## Mô tả ticket',
    adfToText(fields.description).trim() || '(rỗng)',
  ];

  const note = await getNote(key).catch(() => null);
  if (note?.content.trim()) parts.push('', '## Note của người dùng (lưu trong tool)', note.content.trim());

  for (const brd of brds) {
    parts.push(
      '',
      `## BRD: ${brd.filename}`,
      '(mỗi dòng có đánh số [Lxx] để trích dẫn vị trí; số này do tool thêm, không có trong file gốc)',
      numberBrdLines(String(brd.text || ''))
    );
  }

  return parts.join('\n');
};

/** Yêu cầu chung cho mọi preset: mọi nhận định phải chỉ được chỗ nào trong BRD. */
const CITE_RULE = [
  'Mỗi ý phải ghi rõ vị trí trong tài liệu theo đúng thứ tự: (1) tên file BRD,',
  '(2) tiêu đề mục gần nhất phía trên chỗ đó, (3) số dòng [Lxx], (4) trích nguyên văn tối đa 15 từ để tìm bằng Ctrl+F.',
  'Ví dụ: `BRD_Hau_kiem.docx · mục "3.2 Luồng hậu kiểm" · [L148] · "kết quả hậu kiểm ghi nhận realtime"`.',
  'Điều BRD KHÔNG nói tới thì ghi `KHÔNG CÓ TRONG BRD` kèm mục đáng lẽ phải nằm ở đó, đừng bịa số dòng.',
].join(' ');

export const CHAT_PRESETS: Record<string, string> = {
  analyze: [
    'Phân tích BRD này: mục tiêu, phạm vi, các luồng nghiệp vụ chính, hệ thống liên quan.',
    'Nêu rõ phần nào BRD chưa nói tới.',
    CITE_RULE,
  ].join(' '),
  gaps: [
    'Liệt kê các điểm mơ hồ, thiếu sót, mâu thuẫn trong BRD và mô tả ticket.',
    'Trình bày dạng bảng gồm các cột: Vấn đề | Loại (mơ hồ / thiếu / mâu thuẫn) | Vị trí trong BRD | Câu hỏi cần hỏi lại BA.',
    'Mâu thuẫn thì phải nêu đủ cả hai vị trí chọi nhau. Sắp xếp theo mức độ ảnh hưởng, nặng nhất lên đầu.',
    CITE_RULE,
  ].join(' '),
  acceptance: [
    'Viết acceptance criteria theo định dạng Given/When/Then cho ticket này, bám sát BRD.',
    'Gom nhóm theo luồng nghiệp vụ. Mỗi nhóm ghi vị trí trong BRD mà nó bám vào.',
    CITE_RULE,
  ].join(' '),
  risks: [
    'Nêu rủi ro triển khai, tác động tới hệ thống hiện tại và các case lỗi cần xử lý.',
    CITE_RULE,
  ].join(' '),
};
