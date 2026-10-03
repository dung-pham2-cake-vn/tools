#!/usr/bin/env node
// TẦNG 1 — index toàn bộ raw/, không dùng LLM.
// Xuất: metadata + phân loại nội dung + sản phẩm được nhắc + đếm dòng bảng chính sách.
import fs from 'node:fs';
import path from 'node:path';
import { matchProducts, TYPE } from './match-products.mjs';

const ALIASES = JSON.parse(fs.readFileSync('tools/product-aliases.json', 'utf8'));
const ALL_PIDS = JSON.parse(fs.readFileSync('tools/product-ids.json', 'utf8'));
for (const pid of ALL_PIDS) ALIASES[pid] ??= [pid];

const RX = Object.fromEntries(Object.entries(ALIASES).map(([pid, a]) =>
  [pid, new RegExp(a.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')]));

const POLICY = /lãi suất|interest ?rate|hạn mức|loan ?amount|min ?amount|max ?amount|tenor|kỳ hạn|phí bảo hiểm|insurance ?(fee|premium)|penalty|lãi phạt|tất toán|termination ?fee|thu nhập|độ tuổi|bước nhảy/i;
const APISPEC = /API RESPONSE|API REQUEST|└─|\| *(string|int|bool|object|array) *\|/i;
const GL = /\bGL\b|hạch toán|debit|credit|\b\d{10}\b/i;
const UI = /\[image:|\[media\]|Màn hình|screen|figma/i;
const NUMBERY = /\d+\s*(%|triệu|tr\b|tháng|ngày|đ\b|VN[ĐD])/;

const rows = [];
for (const src of ['confluence', 'jira']) {
  const base = path.join('raw', src);
  if (!fs.existsSync(base)) continue;
  for (const space of fs.readdirSync(base)) {
    const dir = path.join(base, space);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const g = (k) => (fm.match(new RegExp(`^${k}: "(.*)"$`, 'm')) || [])[1] || '';
      const body = text.split('\n---\n').slice(1).join('\n---\n');
      const lines = body.split('\n');

      const tableRows = lines.filter((l) => l.startsWith('|') && POLICY.test(l) && /\d/.test(l) && !/^\|\s*-+/.test(l)).length;
      const proseRows = lines.filter((l) => !l.startsWith('|') && POLICY.test(l) && NUMBERY.test(l)).length;

      const tags = [];
      if (tableRows >= 3) tags.push('policy-table');
      else if (tableRows > 0) tags.push('policy-table-weak');
      if (proseRows >= 2) tags.push('policy-prose');
      if (APISPEC.test(body)) tags.push('api');
      if (GL.test(body)) tags.push('gl');
      if (UI.test(body)) tags.push('ui');
      if (!tags.length) tags.push('other');

      // Hai tín hiệu độc lập, hợp lại:
      //  - product_id/mã nội bộ xuất hiện NGUYÊN VĂN ở bất kỳ đâu: tín hiệu mạnh,
      //    quét cả thân (tài liệu liệt kê 10 sản phẩm thì phải nhận đủ 10).
      //  - cặp (đối tác × loại) suy từ tiêu đề: chỉ dùng cho tài liệu đặt tên theo
      //    quy ước "[Partner][Viettel] - Cashloan", và KHÔNG quét thân.
      const byId = Object.entries(RX).filter(([, r]) => r.test(text)).map(([p]) => p);
      const byPair = matchProducts(g('title'), g('breadcrumb') || g('parent_title'), body);
      const products = [...new Set([...byId, ...byPair])];
      // Tài liệu dùng chung cho cả một LOẠI sản phẩm (không gắn đối tác cụ thể):
      // phục vụ file cấp loại trong kb/products/<loại>/, không phải file đối tác.
      const headT = `${g('title')} ${g('breadcrumb') || g('parent_title')}`;
      const productTypes = Object.entries(TYPE).filter(([, r]) => r.test(headT)).map(([t]) => t);

      rows.push({
        src, id: g('id') || g('key'), title: g('title'),
        ctx: g('breadcrumb') || g('parent_title') || g('parent_key'),
        type: g('type'), status: g('status'),
        date: (g('resolved') || g('updated') || g('created')).slice(0, 10),
        labels: (fm.match(/^labels: (\[.*\])$/m) || [])[1] || '[]',
        tags, tableRows, proseRows, products, productTypes,
        bytes: text.length, file: path.join(dir, f),
      });
    }
  }
}

fs.mkdirSync('tools/scan', { recursive: true });
fs.writeFileSync('tools/scan/doc-index.json', JSON.stringify(rows, null, 1));

const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const cols = ['src', 'id', 'title', 'ctx', 'type', 'status', 'date', 'tags', 'tableRows', 'proseRows', 'products', 'productTypes', 'bytes'];
fs.writeFileSync('tools/scan/doc-index.csv',
  [cols.join(','), ...rows.map((r) => cols.map((c) => esc(Array.isArray(r[c]) ? r[c].join(';') : r[c])).join(','))].join('\n') + '\n');

const tally = {};
for (const r of rows) for (const t of r.tags) tally[t] = (tally[t] ?? 0) + 1;
const noProd = rows.filter((r) => !r.products.length).length;
console.log(`${rows.length} tài liệu → tools/scan/doc-index.{json,csv}`);
console.log('nhãn:', Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
const noAny = rows.filter((r) => !r.products.length && !r.productTypes.length).length;
console.log(`không gắn được sản phẩm cụ thể: ${noProd} (trong đó ${noProd - (noProd - rows.filter((r) => !r.products.length && r.productTypes.length).length)} gắn được theo LOẠI sản phẩm)`);
console.log(`không gắn được gì: ${noAny}`);
console.log(`đáng đọc kỹ (policy-table | policy-prose): ${rows.filter((r) => r.tags.some((t) => t.startsWith('policy-'))).length}`);
