#!/usr/bin/env node
// Sinh khung file KB cho từng sản phẩm đối tác.
// Chỉ điền phần CẤU TRÚC (nhận diện, kênh, giải ngân) lấy từ bảng Partnership products.
// KHÔNG điền hạn mức / lãi suất / phí — số liệu chờ lượt quét Jira.
import fs from 'node:fs';
import path from 'node:path';

// partner slug, tên hiển thị, loại sp, productId, kênh, NFC onboard, NFC ký,
// giải ngân, ký app Cake, onboarding source, contract type, page policy Confluence, trạng thái
const P = [
 ['vds','VDS (Viettel Money)','cashloan','Viettel_Cashloan','api','Optional','None','partner','No','viettel_cashloan','VIETTEL_CASHLOAN','1121758','active'],
 ['vds','VDS (Viettel Money)','cashloan','VT_Cashloan_S','api','Optional','None','partner','No','vt_cashloan_payroll','VIETTEL_CASHLOAN_PAYROLL','15368221','active'],
 ['vds','VDS (Viettel Money)','payday','PD_Viettel','dop','Optional','None','partner','No','viettel','VIETTEL_PAYDAY','1025583','active'],
 ['vds','VDS (Viettel Money)','payday','VT_Payday_S','api','Optional','None','partner','No','vt_payday_payroll','VIETTEL_PAYDAY_PAYROLL','986873857','active'],
 ['vds','VDS (Viettel Money)','paylater','VDS_paylater','api','Optional','None','partner','No','API_VT_PAYLATER','VIETTEL_PAYLATER','54067746','active'],
 ['cake','Cake','payday','CAKE_payday','cake','Required','Required','cake','Yes','—','CAKE_PAYDAY','637534211','active'],
 ['cake','Cake','od','CAKE_overdraft','cake','Required','Required','cake','Yes','—','OVER_DRAFT','','active'],
 ['cake','Cake','od','CAKE_overdraft_TD','cake','Required','Required','cake','Yes','od_face_match','OVER_DRAFT','','active'],
 ['cake-affiliate','Cake (affiliate)','cashloan','CAKE_cl_affiliate','dop','None','Required','cake','Yes','dop_cake_cl_affiliate','CAKE_CASHLOAN','198148097','active'],
 ['vnpay','VNPAY','cashloan','VNP_cashloan','dop','Required','Required','partner','Yes','dop_vnp_cashloan','VNP_CASHLOAN','310444033','active'],
 ['vnpay','VNPAY','paylater','VNP_paylater','dop','Required','Required','partner','Yes','dop_vnp_paylater','VNP_PAYLATER','263782609','active'],
 ['vnpay','VNPAY','payday','VNP_payday','dop','Required','Required','partner','Yes','dop_vnp_payday','VNP_PAYDAY','610992373','active'],
 ['be','BeGroup','cashloan','Be_Cashloan','dop','DOP','Required','cake','Yes','dop_be_cashloan','BE_CASHLOAN','39453176','active'],
 ['be','BeGroup','payday','BE_payday','dop','DOP','Required','cake','Yes','dop_be_payday','BE_PAYDAY','1878196240','active'],
 ['be','BeGroup','paylater','BE_paylater','dop','DOP','Required','cake','Yes','dop_be_paylater','BE_PAYLATER','190611564','active'],
 ['misa','MISA','cashloan','MISA_cashloan','api','Required','Required','nh-khác','Yes','api_misa_cashloan','MISA_CASHLOAN','1108410369','active'],
 ['mwg','MWG','cashloan','MWG_cashloan','dop','None','Required','cake','Yes','dop_mwg_cashloan','MWG_CASHLOAN','189300737','active'],
 ['mwg','MWG','cashloan','MWG_cl_online','dop','Required','Required','cake / ngoài','Yes','—','MWG_CL_ONLINE','1587740860','active'],
 ['mwg','MWG','paylater','MWG_paylater','dop + cake','Required','Required','cake','Yes','dop_mwg_paylater, cake_app_mwg_paylater','MWG_PAYLATER','399048808','active'],
 ['mwg','MWG','payday','MWG_payday','dop','Required','Required','cake','Yes','dop_mwg_payday','dop_mwg_payday','1774879256','active'],
 ['klp','KLP','cashloan','KLP_cashloan','dop','None','Required','cake','Yes','dop_klp_cashloan','DOP_KLP_CASHLOAN','1823572040','active'],
 ['vnpost','Vnpost','cashloan','VPO_cashloan','dop','Required','Required','partner','No','dop_vpo_cashloan','VNPOST_CASHLOAN','356483512','active'],
 ['vnpost','Vnpost','cashloan','VPO_cl_pension','dop','Required','Required','partner','No','—','VPO_CASHLOAN_PENSION','1348567065','active'],
 ['zalopay','ZaloPay','cashloan','ZLP_cashloan','api','Required','Required','partner','No','api_zlp_cashloan','ZLP_CASHLOAN','453182180','active'],
 ['zalopay','ZaloPay','payday','ZLP_payday','api','Required','Required','partner','No','api_zlp_payday','ZLP_PAYDAY','838533123','active'],
 // Ngừng bán nhưng còn dư nợ — vẫn cần KB cho loan-management
 ['ngs','NGS','cashloan','NGS_cashloan','dop','None','Required','cake','—','—','NGS_CASHLOAN','164397075','đã ngưng'],
 ['fpt','FPT','paylater','FPT_paylater','api','Required','None','partner','—','api_fpt_paylater','FPT_PAYLATER','295436290','sắp ngưng'],
 ['datavn','DataVN','cashloan','VNHUB_cashloan','api','None','None','cake','—','api_vnhub_cashloan','vnhub_cashloan','1148878850','sắp ngưng'],
 ['vds','VDS (Viettel Money)','paylater','VDS_paylater_epass','api','Optional','None','partner','—','vds_paylater_epass','vds_paylater_epass','1077346320','sắp ngưng'],
 ['vds','VDS (Viettel Money)','cashloan','VTPO_cashloan','api','Optional','None','partner','—','api_vtpo_cashloan','VTPO_CASHLOAN','465240455','sắp ngưng'],
];

const BASE = 'https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/';
let made = 0, skipped = 0;

for (const [slug, name, prod, pid, ch, nfcOn, nfcSign, disb, signCake, obSrc, ctype, pageId, status] of P) {
  const dir = path.join('kb', 'products', prod, 'partners', slug);
  const file = path.join(dir, `${pid.toLowerCase()}.md`);
  // File đã tồn tại: chỉ thay phần giữa AUTO markers, giữ nguyên ghi chú người viết.
  if (fs.existsSync(file)) { skipped++; continue; }
  // TODO khi cần sinh lại: đọc file cũ, tách theo AUTO:start/AUTO:end, chỉ ghi đè phần giữa.
  fs.mkdirSync(dir, { recursive: true });

  const decom = status !== 'active';
  const src = pageId ? `sources:\n  - confluence:${pageId}\n  - confluence:27918827` : `sources:\n  - confluence:27918827`;

  fs.writeFileSync(file, `---
title: ${prod.charAt(0).toUpperCase() + prod.slice(1)} — ${name} (${pid})
product: ${prod}
partner: ${slug}
channel: ${ch}
topic: overview
product_status: ${status}
${src}
last_verified: 2026-09-30
owner:
status: skeleton
numbers_source: none
needs_jira_verify: true
---

# ${name} — ${pid}

> **File khung.** Phần nhận diện và cấu hình kênh đã đúng (lấy từ bảng Partnership products).
> **Phần số liệu — hạn mức, kỳ hạn, lãi suất, phí — chưa điền**, chờ lượt quét Jira.
>
> Agent **không trả lời khách bất kỳ con số nào** cho sản phẩm này. Câu hỏi về số liệu → escalate.

## Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | ${name} |
| Loại sản phẩm | ${prod} |
| ProductId | \`${pid}\` |
| Onboarding source | ${obSrc === '—' ? '*(nguồn để trống)*' : '`' + obSrc.split(', ').join('`, `') + '`'} |
| Contract type | \`${ctype}\` |
| Kênh | ${ch} |
| NFC khi đăng ký | ${nfcOn} |
| NFC khi ký hợp đồng | ${nfcSign} |
| Giải ngân về | ${disb} |
| Ký hợp đồng trên app Cake | ${signCake} |
| Trạng thái sản phẩm | **${status}** |
${decom ? `
## Sản phẩm ngừng bán

Khoản vay còn dư nợ **vẫn thanh toán và tất toán được trên app Cake** — xem \`channels/cake-app.md\`.
Luồng kết nối với app đối tác đã đóng; **không hướng khách quay lại app đối tác**.
**Không mở khoản vay mới.**
` : ''}
## Hạn mức, kỳ hạn, lãi suất, phí

**Chưa điền.** Số liệu trên Confluence có thể đã cũ; nguồn chuẩn là ticket Jira theo \`${pid}\`.

Sẽ fill ở lượt quét Jira. Tới lúc đó agent tuyệt đối không báo con số cho khách.
${pageId ? `\nTham chiếu Confluence (chưa xác minh): ${BASE}${pageId}\n` : '\n*Chưa xác định được page Product Policy trên Confluence.*\n'}
## Cần viết

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với \`products/${prod}/overview.md\`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

## Lưu ý cho agent

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc \`products/${prod}/overview.md\` và \`channels/${ch.split(' ')[0]}.md\` trước file này.

## Thông tin KHÔNG được nói với khách

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
`);
  made++;
}
console.log(`Đã sinh ${made} file, bỏ qua ${skipped} file đã có.`);
