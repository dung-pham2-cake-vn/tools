#!/usr/bin/env node
// Sinh kb/index.md và kb-po/index.md — catalog từng vùng, mỗi trang một dòng.
// Hai index tách nhau: agent trả lời Ops/CSKH chỉ đọc kb/index, không thấy kb-po/.
//
// LLM Wiki: agent đọc index trước để biết trang nào đáng mở, rồi mới đọc chi tiết.
// Ở quy mô này (hàng trăm trang) index thay được hạ tầng embedding/RAG.
//
//   node tools/kb-index.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, allPages, parse, titleOf, today, wikilinks } from './kb-lib.mjs';

const pages = allPages().map(parse);
const link = (p) => `[[${p.path.replace(/\.md$/, '')}]]`;

// Một dòng tóm tắt: ưu tiên description trong frontmatter, nếu không có thì
// lấy câu đầu tiên của thân bài (bỏ heading, blockquote, bảng, marker).
function summary(p) {
  if (p.fm.description) return p.fm.description;
  for (const raw of p.body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) continue;
    if (line.startsWith('<!--') || line.startsWith('---') || line.startsWith('```')) continue;
    const clean = line
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, t) => t.split('/').pop())
      .replace(/[*`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return clean.length > 150 ? `${clean.slice(0, 147)}…` : clean;
  }
  return '—';
}

const ZONES = [
  {
    dir: 'kb',
    title: 'Index — catalog KB Ops/CSKH',
    audience: '[ops, po]',
    intro: 'Cần tra theo ý định ("muốn biết X thì xem đâu") thì xem [[kb/README]].',
    groups: [
      ['Bắt đầu từ đây', (p) => /^kb\/(README|glossary|reject-messages|product-matrix|index)\.md$/.test(p.path)],
      ['Vận hành', (p) => p.path.startsWith('kb/operations/')],
      ['Sản phẩm — tổng quan theo loại', (p) => /^kb\/products\/[^/]+\/[^/]+\.md$/.test(p.path)],
      ['Sản phẩm — theo đối tác', (p) => p.path.includes('/partners/')],
      ['Kênh', (p) => p.path.startsWith('kb/channels/')],
    ],
  },
  {
    dir: 'kb-po',
    title: 'Index — catalog vùng chỉ PO',
    audience: '[po]',
    intro: 'Quy ước bảo trì wiki: [[kb-po/SCHEMA]]. Ranh giới hai vùng: [[kb-po/README]].',
    groups: [
      ['Bắt đầu từ đây', (p) => /^kb-po\/(README|SCHEMA|index)\.md$/.test(p.path)],
      ['Bảo trì wiki — format, log, lịch sử quyết định', (p) => p.path.startsWith('kb-po/bao-tri/')],
      ['Rà soát nguồn', (p) => p.path.startsWith('kb-po/ra-soat/')],
      ['Ghi chú sản phẩm', (p) => p.path.startsWith('kb-po/san-pham/')],
      ['Core banking & GL', (p) => p.path.startsWith('kb-po/core/')],
      ['Kinh doanh', (p) => p.path.startsWith('kb-po/business/')],
      ['Cách PO làm việc', (p) => p.path.startsWith('kb-po/workflow/')],
      ['Nguồn gốc tài liệu', (p) => p.path.startsWith('kb-po/nguon/')],
    ],
  },
];

for (const zone of ZONES) {
  const zonePages = pages.filter((p) => p.path.startsWith(`${zone.dir}/`));
  const seen = new Set();
  const out = [
    '---',
    `title: ${zone.title}`,
    `audience: ${zone.audience}`,
    `last_verified: ${today()}`,
    'owner: dung.pham2',
    'status: generated',
    '---',
    '',
    '<!-- AUTO:start — sinh bằng `node tools/kb-index.mjs`, đừng sửa tay -->',
    '',
    '# Index',
    '',
    `${zonePages.length} trang. **Đọc index trước, rồi mới mở trang chi tiết.**`,
    zone.intro,
    '',
  ];

  for (const [name, match] of zone.groups) {
    const rows = zonePages.filter((p) => !seen.has(p.path) && match(p));
    if (!rows.length) continue;
    rows.forEach((p) => seen.add(p.path));
    out.push(`## ${name}`, '', '| Trang | Nội dung | Cập nhật |', '|---|---|---|');
    for (const p of rows) {
      out.push(`| ${link(p)} — ${titleOf(p)} | ${summary(p)} | ${p.fm.last_verified || '—'} |`);
    }
    out.push('');
  }

  const rest = zonePages.filter((p) => !seen.has(p.path));
  if (rest.length) {
    out.push('## Khác', '', '| Trang | Nội dung |', '|---|---|');
    for (const p of rest) out.push(`| ${link(p)} — ${titleOf(p)} | ${summary(p)} |`);
    out.push('');
  }

  const linkCount = zonePages.reduce((n, p) => n + wikilinks(p.body).length, 0);
  out.push(
    '---',
    '',
    `Thống kê: **${zonePages.length} trang**, **${linkCount} liên kết chéo**.`,
    'Kiểm tra sức khoẻ wiki: `node tools/kb-lint.mjs`.',
    '',
    '<!-- AUTO:end -->',
  );

  writeFileSync(join(ROOT, zone.dir, 'index.md'), `${out.join('\n')}\n`);
  console.log(`${zone.dir}/index.md: ${zonePages.length} trang, ${linkCount} liên kết chéo`);
}
