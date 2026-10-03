#!/usr/bin/env node
// Index giá trị, giới hạn trong nhóm tài liệu CÓ THÔNG SỐ CHÍNH SÁCH, gom theo
// (sản phẩm × chỉ tiêu). Mục đích: thấy ngay một sản phẩm đang có mấy giá trị
// khác nhau cho cùng một chỉ tiêu — tức nguồn đang chọi nhau.
import fs from 'node:fs';
import path from 'node:path';

const idx = JSON.parse(fs.readFileSync('tools/scan/doc-index.json', 'utf8'));
const byId = Object.fromEntries(idx.map((r) => [r.id, r]));
const POLICY = idx.filter((r) => r.tags.some((t) => t.startsWith('policy-')));

// Chỉ tiêu: nhận qua từ khoá đứng gần giá trị.
// Mỗi chỉ tiêu chỉ nhận ĐÚNG đơn vị của nó. Không ràng buộc đơn vị thì
// "365 ngày" trong công thức lãi bị gán nhầm thành giá trị lãi suất.
const METRIC = {
  'lãi suất':      [/lãi suất|interest ?rate|nominal ?interest|%\s*IR|W\.?O? ?ins/i, /%$/],
  'hạn mức':       [/hạn mức|loan ?amount|principal ?amount|số tiền vay|limit/i, /(triệu|tỷ|đ|VNĐ|VND)$/i],
  'kỳ hạn':        [/kỳ hạn|tenor|thời hạn vay|loan ?term/i, /(tháng|ngày|năm)$/i],
  'phí bảo hiểm':  [/phí bảo hiểm|insurance ?(fee|premium)/i, /%$/],
  'phí tất toán':  [/phí tất toán|termination ?fee|prepayment ?fee|trả nợ trước hạn/i, /%$/],
  'phạt chậm':     [/lãi phạt|phạt (gốc|lãi|chậm)|penalty/i, /%$/],
  'tuổi':          [/độ tuổi|\btuổi\b|\bage\b/i, /^\d{2}$|tuổi$/i],
  'thu nhập':      [/thu nhập|income/i, /(triệu|đ|VNĐ|VND)$/i],
  'thời gian':     [/valid|hết hạn|expire|timeout|block|OTP/i, /(phút|giờ|ngày)$/i],
};
const UNIT = '(?:%|phút|giờ|ngày|tháng|năm|triệu|tỷ|đ|VNĐ|VND|lần|kỳ|tuổi)';
const RX = new RegExp(`([0-9][0-9.,]*)\\s*(${UNIT})\\b`, 'gi');

const bag = {};   // product -> metric -> Map(value -> Set(docId))
let scanned = 0, found = 0;

// Ticket công cụ cấu hình khai RÀNG BUỘC hệ thống (vd maxPrincipalAmount ≤ 100.000.000),
// không phải giá trị của sản phẩm nào. Loại ra để không gán nhầm.
const SCHEMA_ONLY = /config tool|product management tool|validation/i;

for (const r of POLICY) {
  if (SCHEMA_ONLY.test(r.title)) continue;
  const dir = r.src === 'confluence' ? 'raw/confluence/PL' : 'raw/jira/PL';
  const f = path.join(dir, `${r.id}.md`);
  if (!fs.existsSync(f)) continue;
  scanned++;
  const t = fs.readFileSync(f, 'utf8');
  const targets = r.products.length ? r.products : (r.productTypes || []).map((x) => `(loại) ${x}`);
  if (!targets.length) continue;

  for (const m of t.matchAll(RX)) {
    const near = t.slice(Math.max(0, m.index - 110), m.index + 40);
    const val = m[0].replace(/\s+/g, ' ');
    const metric = Object.entries(METRIC)
      .find(([, [ctxRx, unitRx]]) => ctxRx.test(near) && unitRx.test(val))?.[0];
    if (!metric) continue;
    found++;
    for (const p of targets) {
      ((bag[p] ??= {})[metric] ??= new Map());
      if (!bag[p][metric].has(val)) bag[p][metric].set(val, new Set());
      bag[p][metric].get(val).add(r.id);
    }
  }
}

const out = {};
for (const [p, ms] of Object.entries(bag)) {
  out[p] = {};
  for (const [m, vals] of Object.entries(ms)) {
    out[p][m] = [...vals.entries()]
      .map(([v, ids]) => ({ v, n: ids.size, docs: [...ids].slice(0, 6) }))
      .sort((a, b) => b.n - a.n);
  }
}
fs.writeFileSync('tools/scan/policy-values.json', JSON.stringify(out, null, 1));
console.log(`quét ${scanned}/${POLICY.length} tài liệu policy · ${found} giá trị gắn được chỉ tiêu`);
console.log(`${Object.keys(out).length} sản phẩm → tools/scan/policy-values.json`);
