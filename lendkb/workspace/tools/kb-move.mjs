#!/usr/bin/env node
// Di chuyển trang wiki và sửa mọi wikilink trỏ tới nó.
//
// Đổi chỗ file bằng tay sẽ làm hỏng hàng loạt [[link]] mà không ai thấy ngay —
// đó là cách 14 liên kết hỏng đã lọt vào KB trước đây.
//
//   node tools/kb-move.mjs --dry   xem trước
//   node tools/kb-move.mjs         làm thật (dùng `git mv`)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, allPages } from './kb-lib.mjs';

// Danh sách di chuyển. Sửa ở đây rồi chạy lại khi cần dọn tiếp.
const MOVES = [
  // Bảo trì wiki: schema, format, log, lịch sử quyết định, độ phủ — việc của PO.
  // kb/ chỉ còn kiến thức sản phẩm và vận hành (2026-10-06).
  ['kb/SCHEMA.md', 'kb-po/SCHEMA.md'],
  ['kb/_meta/format.md', 'kb-po/bao-tri/format.md'],
  ['kb/_meta/log.md', 'kb-po/bao-tri/log.md'],
  ['kb/_meta/lich-su-quyet-dinh.md', 'kb-po/bao-tri/lich-su-quyet-dinh.md'],
  ['kb/_meta/source-index.md', 'kb-po/bao-tri/source-index.md'],
  ['kb/_meta/jira-fill-plan.md', 'kb-po/ra-soat/jira-fill-plan.md'],
  ['kb/_meta/products-without-numbers.md', 'kb-po/ra-soat/products-without-numbers.md'],
];

const DRY = process.argv.includes('--dry');
const map = new Map(
  MOVES.map(([from, to]) => [from.replace(/\.md$/, ''), to.replace(/\.md$/, '')]),
);

for (const [from, to] of MOVES) {
  const src = join(ROOT, from);
  if (!existsSync(src)) {
    console.log(`BỎ QUA (không có): ${from}`);
    continue;
  }
  console.log(`${DRY ? '[dry] ' : ''}${from}  →  ${to}`);
  if (DRY) continue;
  mkdirSync(dirname(join(ROOT, to)), { recursive: true });
  try {
    execFileSync('git', ['mv', from, to], { cwd: ROOT });
  } catch {
    execFileSync('mv', [from, to], { cwd: ROOT });
  }
}

// Sửa link trên toàn wiki — kể cả trong chính các trang vừa chuyển.
let rewritten = 0;
let files = 0;
for (const rel of DRY ? allPages() : allPages()) {
  const file = join(ROOT, rel);
  const before = readFileSync(file, 'utf8');
  const after = before.replace(/\[\[([^\]|#]+)((?:[|#][^\]]*)?)\]\]/g, (whole, target, tail) => {
    const to = map.get(target.trim());
    if (!to) return whole;
    rewritten++;
    return `[[${to}${tail}]]`;
  });
  if (after !== before) {
    files++;
    if (!DRY) writeFileSync(file, after);
  }
}

console.log(
  `\n${DRY ? '[dry] ' : ''}Sửa ${rewritten} wikilink trong ${files} trang.`,
);
console.log('Chạy tiếp: node tools/kb-index.mjs && node tools/kb-lint.mjs');
