#!/usr/bin/env node
// Thu product_code từ các trang Product Policy, map về product_id.
// Mã sản phẩm là định danh duy nhất — tín hiệu mạnh hơn hẳn khớp từ khoá tên đối tác.
import fs from 'node:fs';
import path from 'node:path';
import { PARTNER } from './match-products.mjs';

const DIR = 'raw/confluence/PL';
const idx = JSON.parse(fs.readFileSync('tools/scan/doc-index.json', 'utf8'));
const byId = Object.fromEntries(idx.map((r) => [r.id, r]));

// Mã sản phẩm: chữ IN HOA + số, có thể có _ , dài 6-14, phải chứa cả chữ lẫn số.
const CODE = /\b([A-Z][A-Z_]{2,11}\d{1,3}[A-Z0-9_]{0,4})\b/g;
// Loại trừ: mã GL, tên hệ thống, mã lỗi, thuật ngữ
const SKIP = /^(DPD|NTB|ETB|PCB|CIF|CASA|LOS|LMS|ICE|API|VAT|SBV|MPSV|GL\d*|TT\d+|QD\d+|PL\d+|DOP\d*|UAT|SIT|PR\d+|UI|UX|OTP|NFC|KYC|EKYC|CCCD|CMND|SMS|CSV|JSON|XML|HTTP|URL|UUID|ID\d*|TD\d+)$/;

const found = {};   // product_id -> Set(code)
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const id = (t.match(/^id: "(.*)"$/m) || [])[1];
  const title = (t.match(/^title: "(.*)"$/m) || [])[1] || '';
  const r = byId[id];
  // Chỉ lấy mã từ trang gắn ĐÚNG MỘT sản phẩm. Trang so sánh liệt kê nhiều sản phẩm
  // cạnh nhau sẽ gán nhầm mã của sản phẩm này sang sản phẩm kia.
  if (!r || r.products.length !== 1) continue;
  // Chỉ lấy từ trang Product Policy / cấu hình — nơi mã được định nghĩa, không phải nhắc qua
  if (!/Product Policy|Thông số sản phẩm|Product Checklist|Config|Setup/i.test(title)) continue;

  const body = t.split('\n---\n').slice(1).join('\n---\n');
  // Dòng định nghĩa mã: có "Product ID", "Product code", "product_code", "Mã sản phẩm"
  for (const line of body.split('\n')) {
    if (!/product[ _]?(id|code)|mã sản phẩm|mã phân khúc/i.test(line)) continue;
    for (const m of line.matchAll(CODE)) {
      const c = m[1];
      if (SKIP.test(c) || c.length < 5) continue;
      for (const p of r.products) (found[p] ??= new Set()).add(c);
    }
  }
}

// Kiểm chéo: mã sản phẩm viết dính (CLMWGR01) nên không dùng được regex có word-boundary.
// Dùng bảng token riêng, khớp chuỗi con.
const CODE_TOKEN = {
  mwg: ['MWG', 'QTV'], vnpay: ['VNP'], be: ['BE'], vds: ['VDS', 'VT', 'SLVT', 'XLVT', 'ULVT', 'VTPR'],
  cake: ['CAKE'], mbf: ['MBF'], zalopay: ['ZLP'], ngs: ['NGS'], misa: ['MIS'], fiza: ['FIZA'],
  klp: ['KLP'], fpt: ['FPT'], datavn: ['VNEID'], vnpost: ['VPO', 'VPCL'], lcp: ['LCP'],
  gsm: ['VF'], kov: ['KOV'],
};
// Đối tác của product_id, suy từ chính chuỗi product_id
const ownerOf = (pid) => Object.entries(CODE_TOKEN)
  .filter(([, toks]) => toks.some((t) => pid.toUpperCase().includes(t)))
  .map(([k]) => k);

let dropped = 0;
for (const [pid, codes] of Object.entries(found)) {
  const own = new Set(ownerOf(pid));
  if (!own.size) continue;                       // không suy được đối tác -> giữ nguyên
  for (const c of [...codes]) {
    const inCode = Object.entries(CODE_TOKEN)
      .filter(([, toks]) => toks.some((t) => c.toUpperCase().includes(t)))
      .map(([k]) => k);
    // Mã mang dấu hiệu đối tác khác, và KHÔNG mang dấu hiệu đối tác của mình -> loại
    if (inCode.length && !inCode.some((x) => own.has(x))) { codes.delete(c); dropped++; }
  }
}
console.log(`loại ${dropped} mã gán nhầm\n`);

const out = Object.fromEntries(Object.entries(found)
  .map(([k, v]) => [k, [...v].sort()])
  .filter(([, v]) => v.length)
  .sort());
fs.writeFileSync('tools/scan/product-codes.json', JSON.stringify(out, null, 1));
let n = 0;
for (const [p, cs] of Object.entries(out)) { n += cs.length; console.log(`  ${p.padEnd(22)} ${cs.join(' ')}`); }
console.log(`\n${Object.keys(out).length} sản phẩm · ${n} mã → tools/scan/product-codes.json`);
