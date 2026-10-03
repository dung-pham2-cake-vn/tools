#!/usr/bin/env node
// Lọc ticket Jira có khả năng chứa số liệu chính sách, theo từng product_id.
// Chỉ lọc và xếp hạng — KHÔNG tự kết luận. Người đọc quyết định.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'raw/jira/PL';
const PRODUCTS = process.argv[2]
  ? [process.argv[2]]
  : JSON.parse(fs.readFileSync('tools/product-ids.json', 'utf8'));

// Ticket đổi chính sách hầu như luôn có một trong các từ này ở tiêu đề.
const TITLE_HINTS = /lãi suất|interest|hạn mức|loan amount|tenor|kỳ hạn|phí|fee|product policy|product code|cấu hình|config|điều chỉnh|update|bảo hiểm|insurance|penalty|phạt|tất toán|scheme/i;
// Chỉ tin ticket đã ra production.
const DONE = /^(Released|Done)$/;

function meta(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  const g = (k) => (fm?.[1].match(new RegExp(`^${k}: "(.*)"$`, 'm')) || [])[1] || '';
  return { key: g('key'), title: g('title'), status: g('status'), resolved: g('resolved').slice(0, 10), updated: g('updated').slice(0, 10) };
}

// Bảng markdown có chứa % hoặc số tiền -> nhiều khả năng là bảng thông số.
function numericTables(body) {
  return body.split('\n')
    .filter((l) => l.startsWith('|') && /\d/.test(l))
    .filter((l) => /%|triệu|tr\b|\d{1,3}[.,]\d{3}|\d+\s*-\s*\d+|tháng|ngày/i.test(l)).length;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
const cache = files.map((f) => {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  return { ...meta(text), text, body: text.split('\n---\n').slice(1).join('\n---\n') };
});

const out = {};
for (const pid of PRODUCTS) {
  const rx = new RegExp(pid.replace(/_/g, '[_ ]?'), 'i');
  const hits = cache
    .filter((t) => rx.test(t.text))
    .map((t) => ({ ...t, tables: numericTables(t.body) }))
    .filter((t) => DONE.test(t.status) && (TITLE_HINTS.test(t.title) || t.tables >= 3))
    .sort((a, b) => (b.resolved || b.updated).localeCompare(a.resolved || a.updated));
  out[pid] = hits.map((t) => ({ key: t.key, resolved: t.resolved || t.updated, status: t.status, tables: t.tables, title: t.title }));
}

fs.mkdirSync('tools/scan', { recursive: true });
fs.writeFileSync('tools/scan/policy-candidates.json', JSON.stringify(out, null, 2));

let total = 0;
for (const [pid, hits] of Object.entries(out)) {
  total += hits.length;
  const top = hits.slice(0, 3).map((h) => `${h.key}(${h.resolved})`).join(' ');
  console.log(`${String(hits.length).padStart(3)} ${pid.padEnd(22)} ${top}`);
}
console.log(`\nTổng ${total} ticket ứng viên, ${Object.keys(out).length} sản phẩm → tools/scan/policy-candidates.json`);
