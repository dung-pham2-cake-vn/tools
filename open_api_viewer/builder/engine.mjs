// Manifest + base2 superset -> spec YAML cho 1 đối tác.
//
// Cách làm: parse YAML để TÍNH tập cần giữ, rồi xoá/sửa ở mức DÒNG.
// Không dump lại bằng js-yaml, vì dump sẽ mất hết comment banner của base.

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { BASES, ERROR_SECTIONS, FLOWS, featuresOf, pathsOf } from './catalog.mjs';

const require_ = createRequire(import.meta.url);
const yaml = require_('js-yaml');

// ── helpers mức dòng ─────────────────────────────────────────────
const indentOf = (l) => l.length - l.trimStart().length;

/** [start, end) của block bắt đầu ở dòng `key`; gom comment banner ngay trên. */
export function blockRange(lines, key, from = 0) {
  let i = -1;
  for (let n = from; n < lines.length; n++) {
    if (lines[n].trimEnd() === key.trimEnd()) { i = n; break; }
  }
  if (i < 0) return null;
  const ind = indentOf(lines[i]);
  let b = i;
  while (b > 0) {
    const prev = lines[b - 1];
    if (prev.trim().startsWith('#') && indentOf(prev) === ind) b--;
    else break;
  }
  let j = i + 1;
  while (j < lines.length) {
    const l = lines[j];
    if (l.trim() && indentOf(l) <= ind) break;
    j++;
  }
  while (j > i + 1 && !lines[j - 1].trim()) j--;
  return [b, j, i];
}

/**
 * Xoá nhiều block (theo dòng key đầy đủ).
 * Xoá TUẦN TỰ, tính lại range mỗi lần: tính hết range trước rồi splice sẽ lệch
 * index khi 2 block bị xoá nằm kề nhau (block sau biến mất làm dòng trắng của
 * block trước trỏ sang chỗ khác), ăn mất nội dung đang cần giữ.
 */
export function dropBlocks(lines, keys) {
  let out = lines;
  for (const k of keys) {
    const r = blockRange(out, k);
    if (!r) continue;
    const [b, j] = r;
    // gom dòng trắng ngay sau block để không để lại 2 dòng trắng liền
    let end = j;
    while (end < out.length && !out[end].trim()) end++;
    out = out.slice(0, b).concat(out.slice(end));
  }
  return out;
}

/** Cắt block ra (không comment banner) — dùng khi merge fragment. */
function cutBlock(lines, key) {
  const r = blockRange(lines, key);
  if (!r) return null;
  return lines.slice(r[2], r[1]);
}

/** Xoá 1 section markdown `### <heading>` trong info.description. */
function dropMdSection(lines, heading) {
  const key = `    ### ${heading}`;
  let i = lines.findIndex((l) => l.trimEnd() === key);
  if (i < 0) return lines;
  let j = i + 1;
  while (j < lines.length) {
    const l = lines[j];
    const t = l.trim();
    // hết section: gặp heading kế tiếp, HOẶC ra khỏi khối description (indent < 4).
    // Thiếu điều kiện thứ 2 thì section cuối cùng ăn luôn cả `servers:`/`paths:`.
    if (t.startsWith('## ') || t.startsWith('### ')) break;
    if (t && indentOf(l) < 4) break;
    j++;
  }
  while (j > i + 1 && !lines[j - 1].trim()) j--;
  return lines.slice(0, i).concat(lines.slice(j));
}

/** Xoá các property con của 1 schema (dùng cho product prune). */
function dropProps(lines, schemaKey, names) {
  const r = blockRange(lines, schemaKey);
  if (!r) return lines;
  const [, end, start] = r;
  const seg = lines.slice(start, end);
  const drop = new Set(names);
  const out = [];
  for (let k = 0; k < seg.length; ) {
    const m = /^( +)([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(seg[k]);
    if (!m || !drop.has(m[2])) { out.push(seg[k]); k++; continue; }
    const ind = m[1].length;
    k++;
    while (k < seg.length && (!seg[k].trim() || indentOf(seg[k]) > ind)) k++;
  }
  return lines.slice(0, start).concat(out, lines.slice(end));
}

/** Xoá 1 giá trị khỏi block `enum:` của 1 property. */
function dropEnumValues(lines, schemaKey, propName, values) {
  const r = blockRange(lines, schemaKey);
  if (!r) return lines;
  const [, end, start] = r;
  const seg = lines.slice(start, end);
  const pi = seg.findIndex((l) => new RegExp(`^ +${propName}:\\s*$`).test(l));
  if (pi < 0) return lines;
  const pInd = indentOf(seg[pi]);
  const out = seg.slice();
  for (let k = pi + 1; k < out.length && (!out[k].trim() || indentOf(out[k]) > pInd); k++) {
    const m = /^ +- (.+)$/.exec(out[k]);
    if (m && values.includes(m[1].trim())) out[k] = null;
  }
  return lines.slice(0, start).concat(out.filter((l) => l !== null), lines.slice(end));
}

/** Thay giá trị `key: <...>` (1 dòng) ở bất kỳ đâu trong block. */
function setScalar(lines, blockKey, propPath, value) {
  const r = blockRange(lines, blockKey);
  if (!r) return lines;
  const [, end, start] = r;
  const out = lines.slice();
  for (let k = start; k < end; k++) {
    const m = new RegExp(`^( +)${propPath}:\\s`).exec(out[k]);
    if (m) { out[k] = `${m[1]}${propPath}: ${value}`; break; }
  }
  return out;
}

// ── product prune cho get-loan-detail ────────────────────────────
/** Field nào bị loại với `product` này, đọc từ `x-product` trong base. */
function productPrune(doc, product) {
  const s = doc.components?.schemas?.GetLoanDetailResponse;
  const data = (s?.allOf || []).find((x) => x.properties?.data)?.properties?.data;
  const props = data?.properties || {};
  const drop = [];
  for (const [name, def] of Object.entries(props)) {
    const only = def?.['x-product'];
    if (Array.isArray(only) && !only.includes(product)) drop.push(name);
  }
  const enumDrop = [];
  const pe = props.loan_account_status?.['x-product-enum'] || {};
  for (const [val, only] of Object.entries(pe)) {
    if (Array.isArray(only) && !only.includes(product)) enumDrop.push(val);
  }
  return { drop, enumDrop };
}

/** Xoá mọi khoá `x-product*` khỏi output — đối tác không cần thấy. */
function stripProductMarkers(lines) {
  const out = [];
  for (let k = 0; k < lines.length; ) {
    const m = /^( +)x-product(-enum)?:/.exec(lines[k]);
    if (!m) { out.push(lines[k]); k++; continue; }
    const ind = m[1].length;
    k++;
    while (k < lines.length && lines[k].trim() && indentOf(lines[k]) > ind) k++;
  }
  return out;
}

// ── giải ngân bank ngoài: bank-* ─────────────────────────────────
const BANK_METADATA = `            partner_bank_code_disbursement:
              type: string
              description: Bank code ngân hàng nhận giải ngân (lấy từ data-config bank[].code)
              example: "970425"
            partner_bank_short_name_disbursement:
              type: string
              description: Bank short_name ngân hàng nhận giải ngân (lấy từ data-config bank[].short_name)
              example: "ABB"
            partner_bank_account_disbursement:
              type: string
              description: Số tài khoản ngân hàng nhận giải ngân
              example: "0123456789"`;

const BANK_DATA_CONFIG = `                bank:
                  type: array
                  description: Danh sách ngân hàng nhận giải ngân
                  items:
                    type: object
                    properties:
                      code:
                        type: string
                        description: Mã ngân hàng
                        example: "970425"
                      name:
                        type: string
                        description: Tên ngân hàng
                        example: "ABBANK"
                      short_name:
                        type: string
                        description: Tên viết tắt ngân hàng
                        example: "ABB"`;

/** Thêm 3 field bank-* vào ClientCreateRequest.metadata + bank[] vào DataConfigResponse. */
function injectExternalBank(lines) {
  let out = lines;
  const r = blockRange(out, '    ClientCreateRequest:');
  if (r) {
    const [, end, start] = r;
    const seg = out.slice(start, end);
    const mi = seg.findIndex((l) => /^ {8}metadata:\s*$/.test(l));
    if (mi >= 0) {
      // required của metadata
      let ri = -1;
      for (let k = mi + 1; k < seg.length && indentOf(seg[k]) > 8; k++) {
        if (/^ {10}required:\s*$/.test(seg[k])) { ri = k; break; }
      }
      if (ri >= 0) {
        let k = ri + 1;
        while (k < seg.length && /^ {12}- /.test(seg[k])) k++;
        seg.splice(k, 0,
          '            - partner_bank_code_disbursement',
          '            - partner_bank_short_name_disbursement',
          '            - partner_bank_account_disbursement');
      }
      // properties của metadata: chèn cuối
      let pi = -1;
      for (let k = mi + 1; k < seg.length && (!seg[k].trim() || indentOf(seg[k]) > 8); k++) {
        if (/^ {10}properties:\s*$/.test(seg[k])) { pi = k; break; }
      }
      if (pi >= 0) {
        let k = pi + 1;
        while (k < seg.length && (!seg[k].trim() || indentOf(seg[k]) > 10)) k++;
        while (k > pi + 1 && !seg[k - 1].trim()) k--;
        seg.splice(k, 0, ...BANK_METADATA.split('\n'));
      }
      out = out.slice(0, start).concat(seg, out.slice(end));
    }
  }
  const r2 = blockRange(out, '    DataConfigResponse:');
  if (r2 && !out.slice(r2[2], r2[1]).some((l) => /^ {16}bank:\s*$/.test(l))) {
    const [, end, start] = r2;
    const seg = out.slice(start, end);
    let k = seg.length;
    while (k > 0 && !seg[k - 1].trim()) k--;
    seg.splice(k, 0, ...BANK_DATA_CONFIG.split('\n'));
    out = out.slice(0, start).concat(seg, out.slice(end));
  }
  return out;
}

// ── merge fragment custom ────────────────────────────────────────
function mergeFragment(lines, fragText) {
  const fl = fragText.split('\n');
  const frag = yaml.load(fragText) || {};
  let out = lines;

  for (const [name] of Object.entries(frag.components?.parameters || {})) {
    const blk = cutBlock(fl, `    ${name}:`);
    if (!blk) continue;
    out = dropBlocks(out, [`    ${name}:`]);
    const r = blockRange(out, '  parameters:');
    if (r) out = out.slice(0, r[1]).concat([''], blk, out.slice(r[1]));
  }
  for (const [name] of Object.entries(frag.components?.schemas || {})) {
    const blk = cutBlock(fl, `    ${name}:`);
    if (!blk) continue;
    out = dropBlocks(out, [`    ${name}:`]);
    const r = blockRange(out, '  schemas:');
    if (r) out = out.slice(0, r[1]).concat([''], blk, out.slice(r[1]));
  }
  for (const [p] of Object.entries(frag.paths || {})) {
    const blk = cutBlock(fl, `  ${p}:`);
    if (!blk) continue;
    out = dropBlocks(out, [`  ${p}:`]);
    const r = blockRange(out, 'paths:');
    if (r) out = out.slice(0, r[1]).concat([''], blk, out.slice(r[1]));
  }
  for (const [, table] of Object.entries(frag['x-error-tables'] || {})) {
    const i = out.findIndex((l) => l.trimEnd() === '    ## Error Codes');
    if (i < 0) continue;
    let j = i + 1;
    while (j < out.length && !/^  \w|^\w/.test(out[j])) j++;
    while (j > i + 1 && !out[j - 1].trim()) j--;
    const body = String(table).split('\n').map((l) => (l.trim() ? '    ' + l : ''));
    out = out.slice(0, j).concat([''], body, out.slice(j));
  }
  for (const t of frag['x-fragment']?.['adds-tags'] || []) {
    const r = blockRange(out, 'tags:');
    if (!r) continue;
    const blk = [`  - name: ${t.name}`];
    if (t.description) blk.push(`    description: ${t.description}`);
    out = out.slice(0, r[1]).concat(blk, out.slice(r[1]));
  }
  return out;
}

// ── prune schema/parameter không còn ai ref ──────────────────────
function pruneUnreferenced(lines) {
  for (let round = 0; round < 8; round++) {
    const text = lines.join('\n');
    const doc = yaml.load(text);
    const schemas = doc.components?.schemas || {};
    const params = doc.components?.parameters || {};
    // ref đếm ngoài phần định nghĩa của chính schema đó
    const used = { schemas: new Set(), parameters: new Set() };
    const seed = yaml.dump({ paths: doc.paths || {} });
    const collect = (src, into) => {
      for (const m of src.matchAll(/#\/components\/(schemas|parameters)\/([A-Za-z0-9_]+)/g)) {
        into[m[1]].add(m[2]);
      }
    };
    collect(seed, used);
    // schema được schema đang dùng ref tới -> cũng dùng
    let grew = true;
    while (grew) {
      grew = false;
      for (const name of [...used.schemas]) {
        if (!schemas[name]) continue;
        const before = used.schemas.size + used.parameters.size;
        collect(yaml.dump(schemas[name]), used);
        if (used.schemas.size + used.parameters.size !== before) grew = true;
      }
    }
    const deadS = Object.keys(schemas).filter((k) => !used.schemas.has(k));
    const deadP = Object.keys(params).filter((k) => !used.parameters.has(k));
    if (!deadS.length && !deadP.length) return lines;
    lines = dropBlocks(lines, [...deadS.map((k) => `    ${k}:`), ...deadP.map((k) => `    ${k}:`)]);
  }
  return lines;
}

// ── changelog + placeholder ──────────────────────────────────────
function applyChangelog(lines, cl) {
  const rows = (cl?.entries || []).filter((e) => e?.date);
  const i = lines.findIndex((l) => /^    \|-+\|-+\|-+\|/.test(l));
  if (i < 0) return lines;
  let j = i + 1;
  while (j < lines.length && lines[j].trim().startsWith('|')) j++;
  const body = rows.length
    ? rows.map((e) => `    | ${e.date} | ${e.email_title || cl?.email_title || 'email_title'} | ${e.note || ''} |`)
    : lines.slice(i + 1, j);
  return lines.slice(0, i + 1).concat(body, lines.slice(j));
}

// ── main ─────────────────────────────────────────────────────────
/**
 * @param {object} manifest
 * @param {{specsRoot: string}} opts
 * @returns {Promise<{yaml: string, paths: string[], warnings: string[]}>}
 */
export async function buildSpec(manifest, { specsRoot }) {
  const warnings = [];
  const dbg = (tag) => {
    if (!process.env.SPECBUILD_DEBUG) return;
    try {
      const d = yaml.load(lines.join('\n'));
      console.error(`[${tag}] paths=${Object.keys(d.paths || {}).length} schemas=${Object.keys(d.components?.schemas || {}).length}`);
    } catch (e) { console.error(`[${tag}] PARSE FAIL ${e.message.slice(0, 90)}`); }
  };
  const model = manifest.model;
  if (model === 'custom') {
    throw new Error('model "custom" không dựng từ base — spec đó tự maintain tay (xem base2/custom/README.md)');
  }
  const baseRel = BASES[model];
  if (!baseRel) throw new Error(`model không hợp lệ: ${model}`);

  let lines = (await fs.readFile(path.join(specsRoot, baseRel), 'utf8')).split('\n');
  const baseDoc = yaml.load(lines.join('\n'));

  // 1. endpoint
  const keep = pathsOf(manifest);
  const allPaths = Object.keys(baseDoc.paths || {});
  const dropPaths = allPaths.filter((p) => !keep.has(p));
  for (const p of keep) if (!allPaths.includes(p)) warnings.push(`endpoint không có trong base: ${p}`);
  lines = dropBlocks(lines, dropPaths.map((p) => `  ${p}:`));

  dbg('1-paths');

  // 2. product prune get-loan-detail
  if (model !== 'collection' && manifest.product) {
    const { drop, enumDrop } = productPrune(baseDoc, manifest.product);
    if (drop.length) lines = dropProps(lines, '    GetLoanDetailResponse:', drop);
    if (enumDrop.length) {
      lines = dropEnumValues(lines, '    GetLoanDetailResponse:', 'loan_account_status', enumDrop);
    }
  }
  lines = stripProductMarkers(lines);

  dbg('2-product');

  // 3. giải ngân bank ngoài
  if (manifest.disburse?.mode === 'external_bank') lines = injectExternalBank(lines);

  dbg('3-bank');

  // 4. error section + mermaid flow
  const feats = featuresOf(manifest);
  for (const [heading, need] of Object.entries(ERROR_SECTIONS[model] || {})) {
    if (!need.some((f) => feats.has(f))) lines = dropMdSection(lines, heading);
  }
  const deadFlows = Object.entries(FLOWS[model] || {})
    .filter(([, need]) => !need.some((f) => feats.has(f)))
    .map(([k]) => `  ${k}: |`);
  lines = dropBlocks(lines, deadFlows);

  dbg('4-md-flow');

  // 5. fragment custom
  for (const rel of manifest.custom_fragments || []) {
    const text = await fs.readFile(path.join(specsRoot, 'base2', 'custom', rel), 'utf8');
    lines = mergeFragment(lines, text);
  }

  dbg('5-fragment');

  // 6. dọn schema/parameter mồ côi + tag không còn ai dùng
  lines = pruneUnreferenced(lines);
  const doc2 = yaml.load(lines.join('\n'));
  const usedTags = new Set(Object.values(doc2.paths || {}).flatMap((v) => v.post?.tags || []));
  const deadTags = (doc2.tags || []).map((t) => t.name).filter((n) => !usedTags.has(n));
  lines = dropBlocks(lines, deadTags.map((n) => `  - name: ${n}`));

  dbg('6-prune');

  // 7. changelog + placeholder
  lines = applyChangelog(lines, manifest.changelog);
  const p = manifest.partner || {};
  const title = p.title
    || `${p.display || p.product_id || 'product_id'} - ${model === 'dop' ? 'DOP' : 'Native'} Lending APIs`;
  lines = setScalar(lines, 'info:', 'title', title);
  // Chỉ đổi GIÁ TRỊ `default:` của biến server, không đổi TÊN biến.
  // `{product_id}` / `{group}` trong URL và trong bảng Môi trường là tên biến
  // OpenAPI — thay chúng đi thì spec hỏng và bảng Môi trường mất nghĩa.
  if (p.product_id || p.group) {
    let currentVar = null;
    lines = lines.map((l) => {
      const v = /^ {6}([a-z_]+):\s*$/.exec(l);
      if (v) { currentVar = v[1]; return l; }
      const d = /^( {8})default: (.+)$/.exec(l);
      if (!d) return l;
      if (currentVar === 'product_id' && p.product_id) return `${d[1]}default: ${p.product_id}`;
      if (currentVar === 'group' && p.group) return `${d[1]}default: ${p.group}`;
      return l;
    });
  }

  dbg('7-subs');

  // 8. bỏ note "base SUPERSET" — chỉ dành cho người maintain base
  const si = lines.findIndex((l) => l.includes('Đây là base SUPERSET'));
  if (si >= 0) {
    let j = si;
    while (j < lines.length && lines[j].trim().startsWith('>')) j++;
    while (j < lines.length && !lines[j].trim()) j++;
    let b = si;
    while (b > 0 && !lines[b - 1].trim()) b--;
    lines = lines.slice(0, b).concat(lines.slice(j - 1));
  }

  dbg('8-note');

  const out = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  const finalDoc = yaml.load(out); // ném lỗi nếu YAML hỏng
  return {
    yaml: out.endsWith('\n') ? out : out + '\n',
    paths: Object.keys(finalDoc.paths || {}),
    warnings,
  };
}
