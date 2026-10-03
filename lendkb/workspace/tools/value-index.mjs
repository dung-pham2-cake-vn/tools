#!/usr/bin/env node
// Index mọi "con số + đơn vị" trong raw/, kèm ngữ cảnh.
//
// Vì sao cần: 7/7 lần quét sót trước đây đều KHÔNG phải do chưa đọc tài liệu,
// mà do tìm sai hình thức diễn đạt — tìm `expired_time` trong khi ticket viết
// "thời gian valid = 5 phút". Index theo GIÁ TRỊ thì không phụ thuộc cách diễn đạt.
//
//   node tools/value-index.mjs                    # dựng index
//   node tools/value-index.mjs "payment-request" phút
//   node tools/value-index.mjs "tất toán" %
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'tools/scan/values.json';
const UNIT = '(?:%|phút|giây|giờ|ngày|tháng|năm|triệu|tỷ|nghìn|đ|VNĐ|VND|lần|kỳ|sổ)';
const RX = new RegExp(`([0-9][0-9.,]*)\\s*(${UNIT})\\b`, 'gi');

function build() {
  const rows = [];
  for (const dir of ['raw/confluence/PL', 'raw/jira/PL', 'raw/jira/SVK']) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const id = (t.match(/^(?:id|key): "(.*)"$/m) || [, f.replace('.md', '')])[1];
      const title = (t.match(/^title: "(.*)"$/m) || [, ''])[1];
      for (const m of t.matchAll(RX)) {
        rows.push({
          id, title: title.slice(0, 60), v: m[0],
          ctx: t.slice(Math.max(0, m.index - 95), m.index + m[0].length + 65).replace(/\s+/g, ' ').trim(),
        });
      }
    }
  }
  fs.mkdirSync('tools/scan', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(rows));
  console.log(`${rows.length} giá trị → ${OUT}`);
  return rows;
}

const args = process.argv.slice(2);
if (!args.length) { build(); process.exit(0); }
const rows = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : build();
const rx = args.map((a) => new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
const hit = rows.filter((r) => rx.every((x) => x.test(r.ctx)));
// Gộp theo tài liệu để không in trùng
const seen = new Set();
for (const r of hit) {
  const k = r.id + r.v;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`[${r.id}] ${r.v.padEnd(14)} ${r.title}\n    …${r.ctx.slice(0, 150)}`);
}
console.log(`\n${seen.size} kết quả / ${hit.length} lần khớp`);
