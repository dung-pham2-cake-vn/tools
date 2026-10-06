import fs from 'fs';
import path from 'path';

/**
 * Truy cập knowledge base lending (`lendkb/workspace`) — CHỈ ĐỌC.
 * Không có hàm nào ghi; mọi đường dẫn đều phải nằm trong thư mục gốc KB.
 */

/** Mặc định: repo gốc có `tools/` và `lendkb/` cạnh nhau. */
const KB_ROOT = path.resolve(
  process.env.LENDKB_DIR || path.join(__dirname, '..', '..', '..', 'lendkb', 'workspace')
);
/** Thư mục được phép đọc, tính từ KB_ROOT. */
const KB_DIRS = ['kb', 'kb-po'];
/** Index cache lại, quét lại khi quá hạn. */
const INDEX_TTL_MS = 60000;
const MAX_FILE_CHARS = 20000;
const MAX_READ_FILES = 6;
const SEARCH_MAX_FILES = 12;
const SEARCH_CONTEXT_LINES = 2;

export interface KbEntry {
  /** Đường dẫn tương đối so với KB_ROOT, ví dụ `kb/products/payday/overview.md`. */
  relPath: string;
  title: string;
  size: number;
}

let cache: { at: number; entries: KbEntry[] } | null = null;

const titleOf = (content: string, relPath: string): string => {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  const fromMeta = frontmatter?.[1].match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (fromMeta) return fromMeta.replace(/^["']|["']$/g, '');

  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relPath, '.md');
};

const walk = (dir: string, out: string[]) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.')) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else if (item.isFile() && item.name.endsWith('.md')) out.push(full);
  }
};

export const kbAvailable = (): boolean => fs.existsSync(KB_ROOT);

export const getKbIndex = (): KbEntry[] => {
  if (cache && Date.now() - cache.at < INDEX_TTL_MS) return cache.entries;
  if (!kbAvailable()) {
    cache = { at: Date.now(), entries: [] };
    return [];
  }

  const files: string[] = [];
  for (const dir of KB_DIRS) {
    const full = path.join(KB_ROOT, dir);
    if (fs.existsSync(full)) walk(full, files);
  }

  const entries = files
    .map((full) => {
      const relPath = path.relative(KB_ROOT, full);
      try {
        const content = fs.readFileSync(full, 'utf8');
        return { relPath, title: titleOf(content, relPath), size: content.length };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is KbEntry => entry !== null)
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  cache = { at: Date.now(), entries };
  return entries;
};

/** Chặn `../` và symlink trỏ ra ngoài; trả null nếu đường dẫn không hợp lệ. */
const resolveInsideKb = (relPath: string): string | null => {
  const cleaned = String(relPath || '').trim().replace(/^\.?\//, '');
  if (!cleaned.endsWith('.md')) return null;

  const full = path.resolve(KB_ROOT, cleaned);
  const root = fs.realpathSync.native(KB_ROOT);
  if (!fs.existsSync(full)) return null;

  const real = fs.realpathSync.native(full);
  if (real !== root && !real.startsWith(root + path.sep)) return null;
  if (!KB_DIRS.some((dir) => path.relative(root, real).startsWith(dir + path.sep))) return null;

  return real;
};

export const readKbFile = (relPath: string): { relPath: string; content: string; truncated: boolean } | null => {
  const full = resolveInsideKb(relPath);
  if (!full) return null;

  const raw = fs.readFileSync(full, 'utf8');
  const truncated = raw.length > MAX_FILE_CHARS;
  return {
    relPath: path.relative(fs.realpathSync.native(KB_ROOT), full),
    content: truncated ? `${raw.slice(0, MAX_FILE_CHARS)}\n…(cắt bớt)` : raw,
    truncated,
  };
};

export interface KbSearchHit {
  relPath: string;
  title: string;
  excerpts: string[];
}

/** Tìm không phân biệt hoa thường/dấu câu, trả về vài dòng quanh chỗ khớp. */
export const searchKb = (query: string): KbSearchHit[] => {
  const needle = String(query || '').trim().toLowerCase();
  if (needle.length < 2) return [];

  const hits: KbSearchHit[] = [];
  for (const entry of getKbIndex()) {
    const full = resolveInsideKb(entry.relPath);
    if (!full) continue;

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    const excerpts: string[] = [];
    for (let i = 0; i < lines.length && excerpts.length < 3; i += 1) {
      if (!lines[i].toLowerCase().includes(needle)) continue;
      const from = Math.max(0, i - SEARCH_CONTEXT_LINES);
      const to = Math.min(lines.length, i + SEARCH_CONTEXT_LINES + 1);
      excerpts.push(lines.slice(from, to).join('\n').trim());
    }

    if (excerpts.length) hits.push({ relPath: entry.relPath, title: entry.title, excerpts });
    if (hits.length >= SEARCH_MAX_FILES) break;
  }

  return hits;
};

/** Mục lục rút gọn nhét vào prompt — đủ để model biết có gì mà gọi đọc. */
export const buildKbIndexBlock = (): string => {
  const entries = getKbIndex();
  if (!entries.length) return '';

  return [
    '=== MỤC LỤC KNOWLEDGE BASE LENDING (chỉ đọc) ===',
    ...entries.map((entry) => `${entry.relPath} — ${entry.title}`),
    '=== HẾT MỤC LỤC ===',
    '',
  ].join('\n');
};

/** Gom nội dung các file model yêu cầu, bỏ trùng và chặn quá nhiều file một lượt. */
export const buildKbReadBlock = (relPaths: string[]): string => {
  const unique = Array.from(new Set(relPaths.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_READ_FILES);
  if (!unique.length) return '';

  const parts = unique.map((relPath) => {
    const file = readKbFile(relPath);
    return file
      ? `--- ${file.relPath} ---\n${file.content}`
      : `--- ${relPath} ---\n(không đọc được: đường dẫn không có trong KB)`;
  });

  return ['=== NỘI DUNG KB ===', parts.join('\n\n'), '=== HẾT NỘI DUNG KB ===', ''].join('\n');
};

export const buildKbSearchBlock = (queries: string[]): string => {
  const unique = Array.from(new Set(queries.map((item) => item.trim()).filter(Boolean))).slice(0, 3);
  if (!unique.length) return '';

  const parts = unique.map((query) => {
    const hits = searchKb(query);
    if (!hits.length) return `--- tìm "${query}" ---\n(không có kết quả)`;
    return [
      `--- tìm "${query}" ---`,
      ...hits.map((hit) => `${hit.relPath} — ${hit.title}\n${hit.excerpts.join('\n...\n')}`),
    ].join('\n');
  });

  return ['=== KẾT QUẢ TÌM KB ===', parts.join('\n\n'), '=== HẾT KẾT QUẢ ===', ''].join('\n');
};
