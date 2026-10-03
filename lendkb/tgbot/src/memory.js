import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_DIR } from './config.js';

// Lives inside WORKSPACE_DIR so the existing path sandbox already permits
// Claude to read and write here, and nothing else on the machine.
export const MEMORY_DIR = path.join(WORKSPACE_DIR, '.memory');
export const INDEX_FILE = path.join(MEMORY_DIR, 'MEMORY.md');

const INDEX_HEADER = '# Memory index\n\nMột dòng cho mỗi memory. Nội dung đầy đủ nằm trong file riêng.\n';

export function ensureMemory() {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, INDEX_HEADER);
}

export function readIndex() {
  ensureMemory();
  try {
    return fs.readFileSync(INDEX_FILE, 'utf8');
  } catch {
    return INDEX_HEADER;
  }
}

export function listMemories() {
  ensureMemory();
  return fs
    .readdirSync(MEMORY_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'MEMORY.md')
    .sort();
}

/** Delete one memory file and drop its line from the index. */
export function forget(slug) {
  ensureMemory();
  const file = path.join(MEMORY_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  const kept = readIndex()
    .split('\n')
    .filter((line) => !line.includes(`${slug}.md`));
  fs.writeFileSync(INDEX_FILE, kept.join('\n'));
  return true;
}

/**
 * The block appended to the system prompt on every turn.
 *
 * Only the INDEX goes in — one line per memory, not the bodies. Claude opens
 * the individual file with Read when a line looks relevant. This keeps the
 * per-turn token cost flat as the memory count grows.
 */
export function buildMemoryPrompt() {
  const index = readIndex().trim();
  const today = new Date().toISOString().slice(0, 10);

  return [
    '',
    '# Bộ nhớ dài hạn',
    '',
    `Hôm nay: ${today}. Mọi ngày tương đối ("tuần trước", "thứ 3") phải quy về ngày tuyệt đối khi ghi.`,
    '',
    `Memory nằm ở \`${MEMORY_DIR}\`: mỗi fact một file \`<slug>.md\`, cộng một index \`MEMORY.md\`.`,
    'Memory sống xuyên session — người dùng gõ /new vẫn còn.',
    '',
    '## Index hiện tại',
    '',
    index || '(chưa có memory nào)',
    '',
    '## Khi nào GHI memory',
    '',
    'Cuối lượt, nếu trong cuộc trò chuyện xuất hiện thông tin bền vững, tự ghi — không cần hỏi xin phép:',
    '- người dùng là ai, làm gì, thích cách làm việc nào (`type: user`)',
    '- góp ý / sửa lưng về cách bạn nên làm việc, kèm lý do (`type: feedback`)',
    '- việc đang làm, mục tiêu, ràng buộc không suy ra được từ file trong repo (`type: project`)',
    '- link, dashboard, mã ticket hay tài liệu ngoài (`type: reference`)',
    '',
    '## Khi nào KHÔNG ghi',
    '',
    '- thứ chỉ đúng trong lượt này (câu hỏi một lần, nội dung tạm)',
    '- thứ đọc được từ file trong workspace',
    '- đã có memory trùng → sửa file cũ, đừng tạo file mới',
    '',
    '## Cách ghi',
    '',
    `1. Write \`${MEMORY_DIR}/<slug>.md\` với frontmatter:`,
    '```',
    '---',
    'name: <slug-kebab-case>',
    'description: <một dòng tóm tắt, dùng để quyết định có mở file không>',
    'metadata:',
    '  type: user | feedback | project | reference',
    '---',
    '',
    '<nội dung. type feedback/project thì thêm dòng **Vì sao:** và **Áp dụng:**>',
    '```',
    `2. Edit \`${INDEX_FILE}\`, thêm đúng một dòng: \`- [Tiêu đề](<slug>.md) — móc câu ngắn\``,
    '',
    'Ghi xong thì nói một dòng ngắn cho người dùng biết đã nhớ gì. Đừng dán cả file ra chat.',
  ].join('\n');
}
