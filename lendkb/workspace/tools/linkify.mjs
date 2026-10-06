#!/usr/bin/env node
// Đổi các lượt nhắc tên file dạng `ma-loi-api.md` thành wikilink [[kb/operations/ma-loi-api]].
//
// Vì sao cần: LLM Wiki coi liên kết chéo là một phần của nội dung, không phải trang trí —
// có link thì agent đi theo được, Obsidian vẽ được graph, và kb-lint tìm được trang mồ côi.
//
//   node tools/linkify.mjs --dry    xem sẽ đổi gì
//   node tools/linkify.mjs          ghi thật
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, allPages, stripCode } from './kb-lib.mjs';

const DRY = process.argv.includes('--dry');
const pages = allPages();

// Tra cứu: cho một chuỗi như "ma-loi-api.md" hoặc "products/cashloan/overview.md",
// tìm trang nào kết thúc bằng chuỗi đó. Nhiều hơn một kết quả = nhập nhằng, bỏ qua.
function resolve(mention, fromPage) {
  const want = mention.replace(/\.md$/, '');
  const hits = pages.filter((p) => {
    const noExt = p.replace(/\.md$/, '');
    return noExt === want || noExt.endsWith(`/${want}`);
  });
  if (hits.length === 1) return hits[0].replace(/\.md$/, '');
  if (hits.length === 0) return null;
  // Nhập nhằng (vd `overview.md` có ở 4 sản phẩm): ưu tiên trang cùng thư mục.
  const dir = fromPage.slice(0, fromPage.lastIndexOf('/'));
  const sameDir = hits.find((p) => p.startsWith(`${dir}/`));
  return sameDir ? sameDir.replace(/\.md$/, '') : { ambiguous: hits };
}

let changed = 0;
const unresolved = new Map();
const ambiguous = new Map();

for (const rel of pages) {
  const file = join(ROOT, rel);
  const before = readFileSync(file, 'utf8');
  // Chỉ đụng tới dạng `tên.md` trong backtick. Không đụng link markdown,
  // không đụng khối code, không đụng đường dẫn có tiền tố thư mục ngoài KB.
  // Không đụng vào khối code — ví dụ trong đó phải giữ nguyên.
  const fences = [];
  const masked = before.replace(/^```[\s\S]*?^```/gm, (b) => {
    fences.push(b);
    return `\u0000FENCE${fences.length - 1}\u0000`;
  });
  const after = masked.replace(/`([A-Za-z0-9][A-Za-z0-9._/-]*\.md)`/g, (whole, mention) => {
    if (/^(tools\/|raw\/|PLAN\.md$)/.test(mention)) return whole;
    const r = resolve(mention, rel);
    if (!r) {
      unresolved.set(mention, (unresolved.get(mention) || 0) + 1);
      return whole;
    }
    if (typeof r === 'object') {
      ambiguous.set(mention, r.ambiguous);
      return whole;
    }
    if (r === rel.replace(/\.md$/, '')) return whole; // tự trỏ vào mình
    changed++;
    return `[[${r}]]`;
  });

  const restored = after.replace(/\u0000FENCE(\d+)\u0000/g, (_, i) => fences[Number(i)]);
  if (restored !== before && !DRY) writeFileSync(file, restored);
}

console.log(`${DRY ? '[dry] ' : ''}Đã đổi ${changed} lượt nhắc thành wikilink.`);

if (unresolved.size) {
  console.log('\nKhông tìm thấy trang — link hỏng, cần sửa tay:');
  for (const [m, n] of [...unresolved].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}×  ${m}`);
  }
}
if (ambiguous.size) {
  console.log('\nNhập nhằng — trỏ tới nhiều trang, cần ghi rõ đường dẫn:');
  for (const [m, hits] of ambiguous) console.log(`  ${m} → ${hits.join(' | ')}`);
}
