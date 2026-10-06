#!/usr/bin/env node
// Kiểm tra sức khoẻ wiki. Chạy định kỳ, hoặc trước khi chốt một đợt ingest.
//
//   node tools/kb-lint.mjs          báo cáo đầy đủ
//   node tools/kb-lint.mjs --quiet  chỉ in mục có vấn đề
//
// Thoát mã 1 nếu có lỗi nhóm "Hỏng" — dùng được trong CI hoặc git hook.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, allPages, daysSince, parse, stripAllCode, stripCode, titleOf, wikilinks,
} from './kb-lib.mjs';

const QUIET = process.argv.includes('--quiet');
const STALE_DAYS = 90;

const pages = allPages().map(parse);
const byPath = new Map(pages.map((p) => [p.path.replace(/\.md$/, ''), p]));
const inbound = new Map(pages.map((p) => [p.path.replace(/\.md$/, ''), 0]));

const broken = [];
const orphans = [];
const noFrontmatter = [];
const noAudience = [];
const stale = [];
const noLastVerified = [];
const deadFileRefs = [];

for (const p of pages) {
  const prose = stripCode(p.body);
  for (const l of wikilinks(stripAllCode(p.body))) {
    const target = l.replace(/\.md$/, '');
    if (byPath.has(target)) inbound.set(target, inbound.get(target) + 1);
    else broken.push(`${p.path} → [[${l}]]`);
  }
  // Còn sót lượt nhắc tên file dạng cũ → chạy lại tools/linkify.mjs
  for (const m of prose.matchAll(/`([A-Za-z0-9][A-Za-z0-9._/-]*\.md)`/g)) {
    if (!/^(tools\/|raw\/|PLAN\.md$)/.test(m[1])) {
      deadFileRefs.push(`${p.path} → \`${m[1]}\``);
    }
  }
  if (!Object.keys(p.fm).length) noFrontmatter.push(p.path);
  if (!p.fm.audience && !p.path.startsWith('kb-po/')) noAudience.push(p.path);
  if (!p.fm.last_verified) noLastVerified.push(p.path);
  else {
    const d = daysSince(p.fm.last_verified);
    if (d !== null && d > STALE_DAYS) stale.push(`${p.path} — ${d} ngày`);
  }
}

// Trang mồ côi: không ai trỏ tới. index và các README là cửa vào, không tính.
const ENTRY = /^(kb\/index|kb-po\/index|kb-po\/SCHEMA|.*\/README)$/;
for (const [path, n] of inbound) {
  if (n === 0 && !ENTRY.test(path)) orphans.push(path);
}

// Ranh giới hai vùng: kb/ là kiến thức chung, kb-po/ chỉ PO.
// Kiểm tra bằng máy, vì ranh giới này rất dễ trôi khi thêm trang mới.
const wrongZone = [];
for (const p of pages) {
  const aud = (p.fm.audience || '').toLowerCase();
  if (!aud) continue;
  const hasOps = aud.includes('ops');
  if (p.path.startsWith('kb-po/') && hasOps) {
    wrongZone.push(`${p.path} — nằm trong kb-po/ nhưng audience có \`ops\``);
  }
  if (p.path.startsWith('kb/') && !hasOps) {
    wrongZone.push(`${p.path} — nằm trong kb/ nhưng audience không có \`ops\``);
  }
}

// kb/ chỉ chứa kiến thức Ops/CSKH. Link sang kb-po/ = Ops bị dẫn tới chỗ họ không dùng;
// mục kiểu PO (ghi chú PO, số kinh doanh, còn thiếu, lịch sử file) = nội dung lọt vùng.
const PO_HEADING = /^##+ .*(Ghi chú sản phẩm — PO|Số liệu kinh doanh|Còn thiếu|Cần viết|Lịch sử thay đổi)/m;
const leakToPo = [];
for (const p of pages) {
  if (!p.path.startsWith('kb/') || p.path === 'kb/index.md') continue;
  for (const l of wikilinks(stripAllCode(p.body))) {
    if (l.startsWith('kb-po/')) leakToPo.push(`${p.path} → [[${l}]]`);
  }
  const h = stripCode(p.body).match(PO_HEADING);
  if (h) leakToPo.push(`${p.path} — mục "${h[0].replace(/^#+ /, '')}"`);
}

// Trang có số liệu nhưng không khai nguồn → không đối chiếu lại được khi nghi ngờ.
const noSource = [];
for (const p of pages) {
  if (!p.path.includes('/partners/')) continue;
  if (!p.fm.sources && !p.fm.numbers_source) noSource.push(p.path);
}

// can-confirm: đếm mục còn mở. Không đoán mục nào đã có câu trả lời — đoán sai
// thì tệ hơn không đoán. Chỉ nhắc rà khi danh sách phình to.
const confirm = byPath.get('kb-po/ra-soat/can-confirm');
const openItems = confirm
  ? [...new Set([...confirm.body.matchAll(/^\|\s*\*{0,2}([BSACD]\d+)\*{0,2}\s*\|/gm)].map((m) => m[1]))]
  : [];

const sections = [
  ['🔴 Hỏng — liên kết trỏ vào hư không', broken, 'Sửa tay, hoặc đổi tên trang cho khớp.'],
  ['🔴 Hỏng — thiếu frontmatter', noFrontmatter, 'Mọi trang phải có frontmatter; xem [[kb-po/SCHEMA]].'],
  ['🟡 Còn nhắc tên file kiểu cũ', deadFileRefs, 'Chạy `node tools/linkify.mjs`.'],
  ['🟡 Trang mồ côi — không trang nào trỏ tới', orphans, 'Thêm link từ trang liên quan, hoặc gộp/xoá.'],
  ['🟡 Thiếu `audience`', noAudience, 'Agent không biết trang này cho Ops hay PO.'],
  ['🟡 Thiếu `last_verified`', noLastVerified, 'Không biết số liệu cũ tới đâu.'],
  [`🟡 Quá ${STALE_DAYS} ngày chưa rà lại`, stale, 'Rà lại hoặc hạ `status` xuống draft.'],
  ['🔴 Hỏng — sai vùng kb/ ↔ kb-po/', wrongZone,
    'kb/ = kiến thức chung (audience phải có `ops`). kb-po/ = chỉ PO. Chuyển bằng `node tools/kb-move.mjs`.'],
  ['🟡 Nội dung PO lọt vào kb/', leakToPo,
    'Chuyển sang kb-po/ (ra-soat/con-thieu, san-pham/ghi-chu-po, business/). Xem [[kb-po/SCHEMA]] mục ranh giới.'],
  ['🟡 Trang sản phẩm không khai nguồn số liệu', noSource,
    'Thêm `sources:` hoặc `numbers_source:` — không có thì sau không đối chiếu lại được.'],
];

console.log(`kb-lint — ${pages.length} trang, ${[...inbound.values()].reduce((a, b) => a + b, 0)} liên kết\n`);

let fatal = 0;
for (const [name, items, hint] of sections) {
  if (!items.length) {
    if (!QUIET) console.log(`✅ ${name.replace(/^.. /, '')}: không có`);
    continue;
  }
  if (name.startsWith('🔴')) fatal += items.length;
  console.log(`\n${name} (${items.length})`);
  console.log(`   ${hint}`);
  for (const i of items.slice(0, 25)) console.log(`   · ${i}`);
  if (items.length > 25) console.log(`   … và ${items.length - 25} mục nữa`);
}

for (const idx of ['kb/index.md', 'kb-po/index.md']) {
  if (!existsSync(join(ROOT, idx))) {
    console.log(`\n🔴 Thiếu ${idx} — chạy \`node tools/kb-index.mjs\`.`);
    fatal++;
  }
}

if (openItems.length) {
  console.log(
    `\n🔵 can-confirm: ${openItems.length} mục còn mở (${openItems.join(', ')}).`,
  );
  console.log('   Mục nào đã có câu trả lời thì đóng lại, đừng để danh sách phình mãi.');
}

console.log(fatal ? `\n${fatal} lỗi cần sửa.` : '\nWiki sạch.');
process.exit(fatal ? 1 : 0);
