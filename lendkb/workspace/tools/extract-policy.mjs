#!/usr/bin/env node
// Trích bảng số liệu từ các ticket riêng của từng sản phẩm, xuất digest để người đọc duyệt.
import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync('tools/scan/product-specific.json', 'utf8'));
const TOP = Number(process.argv[3] || 4);
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;

// Dòng bảng có ngưỡng chính sách: %/triệu/tháng/ngày kèm số.
const POLICY_ROW = /(\d+\s*%|\d[\d.,]*\s*(triệu|tr\b|đ\b|VN[ĐD])|\d+\s*[–-]\s*\d+\s*(tháng|ngày)|lãi suất|hạn mức|tenor|phí|penalty|phạt|bảo hiểm|insurance|amount|rate)/i;

let out = [];
for (const [pid, hits] of Object.entries(spec)) {
  if (only && pid !== only) continue;
  if (!hits.length) { out.push(`\n### ${pid}\n(không có ticket riêng)`); continue; }
  out.push(`\n### ${pid}`);
  for (const h of hits.slice(0, TOP)) {
    const f = `raw/jira/PL/${h.key}.md`;
    if (!fs.existsSync(f)) continue;
    const body = fs.readFileSync(f, 'utf8');
    const desc = body.split('## Description')[1]?.split('## Comments')[0] ?? '';
    const rows = desc.split('\n')
      .filter((l) => l.startsWith('|') && POLICY_ROW.test(l) && !/^\|\s*-+/.test(l))
      .slice(0, 9)
      .map((l) => '    ' + l.replace(/\s+/g, ' ').slice(0, 170));
    out.push(`\n  ${h.key} (${h.resolved}, ${h.status}) ${h.title.slice(0, 74)}`);
    out.push(rows.length ? rows.join('\n') : '    (không có bảng số)');
  }
}
const txt = out.join('\n');
fs.writeFileSync('tools/scan/policy-digest.txt', txt);
console.log(txt);
