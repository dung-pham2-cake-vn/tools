#!/usr/bin/env node
// Trích "page này có gì" cho một nhánh Confluence: heading + nhãn trường trong bảng.
// Không tóm tắt bằng LLM — lấy đúng cấu trúc page, chính xác và chạy lại được.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || '27918827';
const DIR = 'raw/confluence/PL';

const pages = {};
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const g = (k) => (t.match(new RegExp(`^${k}: "(.*)"$`, 'm')) || [])[1] || '';
  pages[g('id')] = {
    id: g('id'), title: g('title'), parent: g('parent_id'), updated: g('updated').slice(0, 10),
    labels: (t.match(/^labels: (\[.*\])$/m) || [])[1] || '[]',
    url: g('url'), body: t.split('\n---\n').slice(1).join('\n---\n'),
  };
}
const kids = {};
for (const p of Object.values(pages)) if (p.parent) (kids[p.parent] ??= []).push(p.id);

const walk = (id, depth = 0, seen = new Set()) => {
  if (seen.has(id)) return [];
  seen.add(id);
  return [[id, depth], ...(kids[id] ?? []).sort((a, b) => (pages[a]?.title ?? '').localeCompare(pages[b]?.title ?? ''))
    .flatMap((k) => walk(k, depth + 1, seen))];
};

// Nhãn trường = cột đầu của dòng bảng. Cho biết page định nghĩa những gì.
const FIELD = /^[A-Za-zÀ-ỹ0-9][^|]{2,46}$/;
const NOISE = /^(---|#|STT|No\.?|STATUS|Field|Description|Note|Ghi chú|UI|Màn hình|\d+|Case \d|Step \d|Screen)$/i;

function outline(body) {
  const heads = [...body.matchAll(/^#{1,3} +(.+)$/gm)].map((m) => m[1].replace(/\*\*/g, '').trim())
    .filter((h) => h.length > 1).slice(0, 14);
  const fields = new Set();
  for (const l of body.split('\n')) {
    if (!l.startsWith('|')) continue;
    const c = l.replace(/^\|/, '').split('|')[0].replace(/\*\*|`/g, '').trim();
    if (FIELD.test(c) && !NOISE.test(c) && !/^\s*$/.test(c)) fields.add(c);
    if (fields.size > 26) break;
  }
  return { heads, fields: [...fields] };
}

const tree = walk(ROOT);
const out = [];
for (const [id, depth] of tree) {
  const p = pages[id];
  if (!p) continue;
  const { heads, fields } = outline(p.body);
  out.push({ id, depth, title: p.title, updated: p.updated, url: p.url,
             bytes: p.body.length, heads, fields });
}
fs.mkdirSync('tools/scan', { recursive: true });
fs.writeFileSync(`tools/scan/outline-${ROOT}.json`, JSON.stringify(out, null, 1));
console.log(`${out.length} page → tools/scan/outline-${ROOT}.json`);
console.log(`có heading: ${out.filter((o) => o.heads.length).length} · có nhãn trường: ${out.filter((o) => o.fields.length).length}`);
