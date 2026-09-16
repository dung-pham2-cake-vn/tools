#!/usr/bin/env node
// Sinh phần "API Reference" của partner-guide.html từ specs/base2/*.yaml.
// Ghi đè nội dung giữa 2 marker <!-- API-REF:START --> ... <!-- API-REF:END -->.
// Chạy lại sau mỗi lần sửa base2: node open_api_viewer/builder/mk_partner_guide_api.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { FEATURE_PATHS, ERROR_SECTIONS } from './catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDE = join(ROOT, 'partner-guide.html');

const MODELS = [
  { key: 'native', file: 'specs/base2/base_native.yaml', label: 'Native API' },
  { key: 'dop', file: 'specs/base2/base_dop.yaml', label: 'Web / DOP' },
  { key: 'collection', file: 'specs/base2/base_collection.yaml', label: 'Collection Reminder' },
];

const MAX_DEPTH = 6;

// ── helpers ─────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Markdown rất hạn chế: `code`, **bold**, xuống dòng. Đủ cho description trong spec. */
const md = (s) =>
  esc(s).trim()
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, ' ');

function deref(doc, node, seen = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (node.$ref) {
    const path = node.$ref.replace(/^#\//, '').split('/');
    if (seen.has(node.$ref)) return { type: 'object', description: '(đệ quy)' };
    let cur = doc;
    for (const p of path) cur = cur?.[p];
    return deref(doc, cur, new Set([...seen, node.$ref]));
  }
  if (Array.isArray(node.allOf)) {
    const merged = { type: 'object', properties: {}, required: [] };
    for (const part of node.allOf) {
      const r = deref(doc, part, seen);
      Object.assign(merged.properties, r.properties || {});
      if (r.required) merged.required.push(...r.required);
      if (r.description && !merged.description) merged.description = r.description;
    }
    return merged;
  }
  return node;
}

function typeLabel(s) {
  if (!s) return '';
  if (s.type === 'array') {
    const it = s.items || {};
    return `array&lt;${it.type === 'object' ? 'object' : (it.type || 'any')}&gt;`;
  }
  let t = s.type || (s.properties ? 'object' : 'any');
  if (s.format) t += ` (${s.format})`;
  return t;
}

/** Flatten schema thành danh sách dòng {path, type, required, desc, example, product} */
function flatten(doc, schema, prefix = '', depth = 0, requiredSet = new Set(), out = []) {
  const s = deref(doc, schema);
  if (!s || depth > MAX_DEPTH) return out;

  if (s.type === 'array') {
    const items = deref(doc, s.items);
    if (items && (items.properties || items.type === 'object')) {
      return flatten(doc, items, `${prefix}[].`, depth + 1, new Set(items.required || []), out);
    }
    return out;
  }

  const props = s.properties || {};
  const req = new Set(s.required || [...requiredSet]);

  for (const [name, rawChild] of Object.entries(props)) {
    const child = deref(doc, rawChild);
    const path = prefix + name;
    const enumTxt = child.enum ? ` — enum: ${child.enum.join(', ')}` : '';
    out.push({
      path,
      type: typeLabel(child),
      required: req.has(name),
      desc: (child.description || '') + enumTxt,
      example: child.example !== undefined ? JSON.stringify(child.example) : '',
      product: Array.isArray(child['x-product']) ? child['x-product'].join(', ') : '',
      depth,
    });
    if (child.type === 'array') {
      const items = deref(doc, child.items);
      if (items && (items.properties || items.type === 'object')) {
        flatten(doc, items, `${path}[].`, depth + 1, new Set(items.required || []), out);
      }
    } else if (child.properties) {
      flatten(doc, child, `${path}.`, depth + 1, new Set(child.required || []), out);
    }
  }
  return out;
}

/** Bảng error code trong info.description: `### <heading>` -> [[code, message]] */
function parseErrorSections(description = '') {
  const idx = description.indexOf('## Error Codes');
  if (idx < 0) return {};
  const block = description.slice(idx);
  const sections = { General: [] };
  let current = 'General';
  for (const line of block.split('\n')) {
    const h = line.match(/^\s*###\s+(.+?)\s*$/);
    if (h) { current = h[1]; sections[current] = []; continue; }
    // gặp `## <mục khác>` sau khối Error Codes thì dừng
    if (/^\s*##\s/.test(line) && !/^\s*###/.test(line) && !/Error Codes/.test(line)) break;
    const row = line.match(/^\s*\|\s*`?([^`|]+?)`?\s*\|\s*(.+?)\s*\|\s*$/);
    if (row && current) {
      const [, code, msg] = row;
      if (/^-+$/.test(code) || /^Code$/i.test(code)) continue;
      sections[current].push([code.trim(), msg.trim()]);
    }
  }
  return sections;
}

/** path -> feature key */
function pathFeatureMap(modelKey) {
  const table = FEATURE_PATHS[modelKey] || {};
  const map = {};
  for (const [feat, paths] of Object.entries(table)) for (const p of paths) map[p] = feat;
  return map;
}

// ── render ──────────────────────────────────────────────────────────────────
function renderFieldTable(rows, emptyMsg) {
  if (!rows.length) return `<p class="legend">${emptyMsg}</p>`;
  const hasProduct = rows.some((r) => r.product);
  return `<div class="tablewrap"><table class="fields">
<thead><tr><th>Field</th><th>Kiểu</th><th>Bắt buộc</th>${hasProduct ? '<th>Sản phẩm</th>' : ''}<th>Mô tả</th><th>Example</th></tr></thead>
<tbody>
${rows.map((r) => `<tr><td><code class="fp d${Math.min(r.depth, 4)}">${esc(r.path)}</code></td><td>${r.type}</td>`
    + `<td>${r.required ? '<b>Có</b>' : '—'}</td>`
    + (hasProduct ? `<td>${esc(r.product) || '<span class="mut">cả 3</span>'}</td>` : '')
    + `<td>${md(r.desc)}</td><td>${r.example ? `<code>${esc(r.example)}</code>` : ''}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function renderHeaders(doc, params = []) {
  const rows = params.map((p) => deref(doc, p)).filter(Boolean);
  if (!rows.length) return '';
  return `<h5>Header</h5><div class="tablewrap"><table>
<thead><tr><th>Header</th><th>Bắt buộc</th><th>Mô tả</th></tr></thead><tbody>
${rows.map((h) => `<tr><td><code>${esc(h.name)}</code></td><td>${h.required ? '<b>Có</b>' : '—'}</td>`
    + `<td>${md(h.description || (h.schema?.default ? `Mặc định: \`${h.schema.default}\`` : ''))}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function renderErrors(generalRows, sectionRows, sectionName) {
  const all = [
    ...generalRows.map((r) => [...r, 'General']),
    ...sectionRows.map((r) => [...r, sectionName]),
  ];
  if (!all.length) return '';
  return `<h5>Error codes liên quan</h5><div class="tablewrap"><table>
<thead><tr><th>Code</th><th>Message</th><th>Nhóm</th></tr></thead><tbody>
${all.map(([c, m, g]) => `<tr><td><code>${esc(c)}</code></td><td>${md(m)}</td><td class="mut">${esc(g)}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function renderModel(doc, model) {
  const featOf = pathFeatureMap(model.key);
  const errSections = parseErrorSections(doc.info?.description || '');
  const general = errSections['General'] || [];
  const featToSection = {};
  for (const [section, feats] of Object.entries(ERROR_SECTIONS[model.key] || {})) {
    for (const f of feats) (featToSection[f] ||= []).push(section);
  }

  const byTag = new Map();
  for (const [path, item] of Object.entries(doc.paths || {})) {
    const op = item.post || item.get;
    if (!op) continue;
    const tag = (op.tags && op.tags[0]) || 'Khác';
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push([path, op, item]);
  }

  let html = '';
  for (const [tag, list] of byTag) {
    html += `\n<h4 class="apigroup">${esc(tag)} <span class="mut">(${list.length})</span></h4>\n`;
    for (const [path, op] of list) {
      const isCallback = path.startsWith('/partner-');
      const isWebview = path.startsWith('/generate-webview/');
      const cls = isCallback ? 'ep cb' : isWebview ? 'ep wv' : 'ep';

      const reqSchema = op.requestBody?.content?.['application/json']?.schema;
      const resSchema = op.responses?.['200']?.content?.['application/json']?.schema;
      const reqRows = reqSchema ? flatten(doc, reqSchema) : [];
      const resRows = resSchema ? flatten(doc, resSchema) : [];

      const feat = featOf[path];
      const sections = featToSection[feat] || [];
      const sectionRows = sections.flatMap((s) => errSections[s] || []);

      html += `<details class="api" id="api-${model.key}-${path.replace(/[^a-z0-9]+/gi, '-')}">
<summary><span class="${cls}">${esc(path)}</span> <span class="apisum">${esc(op.summary || '')}</span></summary>
<div class="apibody">
${op.description ? `<p class="apidesc">${md(op.description)}</p>` : ''}
<p class="legend"><b>Chiều gọi:</b> ${isCallback ? 'Cake → Partner (partner phải expose)' : 'Partner → Cake'}
&nbsp;·&nbsp; <b>Method:</b> POST &nbsp;·&nbsp; <b>operationId:</b> <code>${esc(op.operationId || '')}</code></p>
${renderHeaders(doc, op.parameters)}
<h5>Request body</h5>
${renderFieldTable(reqRows, 'Không có request body.')}
<h5>Response 200</h5>
${renderFieldTable(resRows, 'Không có response body.')}
${renderErrors(general, sectionRows, sections.join(' / ') || '—')}
</div></details>\n`;
    }
  }
  return html;
}

// ── main ────────────────────────────────────────────────────────────────────
const panels = [];
const buttons = [];
for (const [i, model] of MODELS.entries()) {
  const doc = yaml.load(await readFile(join(ROOT, model.file), 'utf8'));
  const count = Object.keys(doc.paths || {}).length;
  buttons.push(`<button role="tab" aria-selected="${i === 0}" data-tab="apiref-${model.key}">${model.label} (${count})</button>`);
  panels.push(`<div class="tabpanel" id="apiref-${model.key}"${i === 0 ? '' : ' hidden'}>
${renderModel(doc, model)}
</div>`);
}

const block = `
  <p class="lead">Chi tiết header, request, response và error code của từng endpoint.
  Sinh tự động từ base spec — khi base đổi, chạy lại <code>builder/mk_partner_guide_api.mjs</code>.</p>

  <div class="apitools">
    <button class="chip" data-apiall="open">Mở tất cả</button>
    <button class="chip" data-apiall="close">Đóng tất cả</button>
    <input class="apisearch" type="search" placeholder="Lọc theo tên endpoint…" aria-label="Lọc endpoint">
  </div>

  <div class="note">Chỉ những endpoint đang mở mới xuất hiện khi in PDF — mở phần cần in trước khi bấm <b>In / PDF</b>.</div>

  <div class="tabs" data-tabs>
    <div class="tabbtns" role="tablist">
      ${buttons.join('\n      ')}
    </div>
    ${panels.join('\n    ')}
  </div>
`;

const html = await readFile(GUIDE, 'utf8');
const START = '<!-- API-REF:START -->';
const END = '<!-- API-REF:END -->';
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a < 0 || b < 0) {
  console.error(`Không tìm thấy marker ${START} / ${END} trong partner-guide.html`);
  process.exit(1);
}
const out = html.slice(0, a + START.length) + '\n' + block + '\n  ' + html.slice(b);
await writeFile(GUIDE, out);
console.log(`partner-guide.html: API Reference đã cập nhật (${Math.round(out.length / 1024)} KB)`);
