#!/usr/bin/env node
// Quét theo CÂY ticket, không khớp chuỗi product_id.
//
// Ba lỗi của bản trước, đã sửa ở đây:
//  1. Ticket dùng mã nội bộ (VDS-O2O, ODTD_v2) thay vì product_id → thêm bảng alias.
//  2. Thiếu từ khoá "triển khai/setup/cấu hình" → ticket khai sinh sản phẩm bị loại.
//  3. Xếp hạng theo ngày mới nhất → đẩy chính ticket khai sinh xuống đáy.
//     Giờ xếp theo ĐỘ GIÀU BẢNG SỐ, và đi xuống toàn bộ ticket con.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'raw/jira/PL';
const ALIASES = JSON.parse(fs.readFileSync('tools/product-aliases.json', 'utf8'));

const meta = (t) => {
  const fm = t.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const g = (k) => (fm.match(new RegExp(`^${k}: "(.*)"$`, 'm')) || [])[1] || '';
  return { key: g('key'), title: g('title'), status: g('status'), type: g('type'),
           parent: g('parent_key'), resolved: g('resolved').slice(0, 10) };
};

const all = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = meta(text);
  const desc = text.split('## Description')[1]?.split('## Comments')[0] ?? '';
  return { ...m, text, desc };
});
const byKey = Object.fromEntries(all.map((t) => [t.key, t]));
const kids = {};
for (const t of all) if (t.parent) (kids[t.parent] ??= []).push(t.key);

// Đếm dòng bảng mang thông số chính sách thật.
const POLICY = /(lãi suất|interest ?rate|hạn mức|loan ?amount|min ?amount|max ?amount|tenor|kỳ hạn|phí bảo hiểm|insurance ?(fee|premium)|penalty|lãi phạt|tất toán|termination|thu nhập|tuổi)/i;
const NUM = /\d/;
const score = (t) => t.desc.split('\n')
  .filter((l) => l.startsWith('|') && POLICY.test(l) && NUM.test(l) && !/^\|\s*-+/.test(l)).length;

function descendants(root, seen = new Set()) {
  if (!root || seen.has(root)) return [];
  seen.add(root);
  return [root, ...(kids[root] ?? []).flatMap((k) => descendants(k, seen))];
}

const out = {};
for (const [pid, alias] of Object.entries(ALIASES)) {
  const rx = new RegExp(alias.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
  // Gốc: mọi ticket nhắc tới sản phẩm (theo product_id HOẶC mã nội bộ).
  const roots = all.filter((t) => rx.test(t.title) || rx.test(t.text));
  // Mở rộng xuống toàn bộ ticket con của các Initiative/Epic tìm được.
  const keys = new Set();
  for (const r of roots) { keys.add(r.key); for (const d of descendants(r.key)) keys.add(d); }
  out[pid] = [...keys].map((k) => byKey[k]).filter(Boolean)
    .filter((t) => /^(Released|Done)$/.test(t.status))
    .map((t) => ({ key: t.key, type: t.type, resolved: t.resolved, rows: score(t), title: t.title }))
    .filter((t) => t.rows > 0)
    .sort((a, b) => b.rows - a.rows || (b.resolved || '').localeCompare(a.resolved || ''));
}
fs.mkdirSync('tools/scan', { recursive: true });
fs.writeFileSync('tools/scan/tree-candidates.json', JSON.stringify(out, null, 1));
for (const [pid, hits] of Object.entries(out)) {
  console.log(`${String(hits.length).padStart(3)} ${pid.padEnd(20)} ${hits.slice(0, 3).map((h) => `${h.key}[${h.rows}]`).join(' ')}`);
}
