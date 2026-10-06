#!/usr/bin/env node
import fs from 'node:fs';
const cand = JSON.parse(fs.readFileSync('tools/scan/tree-candidates.json', 'utf8'));
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : null;
const TOP = Number(process.argv[3] || 2);
const POLICY = /(lãi suất|interest ?rate|hạn mức|loan ?amount|min ?amount|max ?amount|tenor|kỳ hạn|phí bảo hiểm|insurance ?(fee|premium)|penalty|lãi phạt|tất toán|termination|thu nhập|tuổi)/i;
let o = [];
for (const [pid, hits] of Object.entries(cand)) {
  if (only && !only.includes(pid)) continue;
  o.push(`\n===== ${pid}`);
  for (const h of hits.slice(0, TOP)) {
    const t = fs.readFileSync(`raw/jira/PL/${h.key}.md`, 'utf8');
    const d = t.split('## Description')[1]?.split('## Comments')[0] ?? '';
    o.push(`\n  ${h.key} [${h.rows} dòng] ${h.type} ${h.resolved} — ${h.title.slice(0, 66)}`);
    o.push(d.split('\n').filter((l) => l.startsWith('|') && POLICY.test(l) && /\d/.test(l) && !/^\|\s*-+/.test(l))
      .slice(0, 12).map((l) => '   ' + l.replace(/\s+/g, ' ').slice(0, 160)).join('\n'));
  }
}
console.log(o.join('\n'));
