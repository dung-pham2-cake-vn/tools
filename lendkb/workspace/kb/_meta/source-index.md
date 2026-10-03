---
title: Source index & độ phủ KB
last_verified: 2026-09-30
audience: [ops, po]
owner: dung.pham2
status: draft
---

# Độ phủ

| `draft` | 40 | Có nội dung, chờ duyệt |
| `stub` | 13 | File chủ đề cấp sản phẩm, chưa viết |

(không còn `skeleton` — cả 30 sản phẩm đối tác đã có số liệu)

| Nguồn số | File | Dùng được |
|---|---|---|
| `jira` | 25 | Có |
| `confluence` | 10 | Đã rà ticket Jira mới hơn, **không thấy thay đổi** — xem cảnh báo |
| `n/a` | 18 | File không chứa số |

## Kết quả rà đối chiếu (2026-09-30)

Với 10 file lấy số từ Confluence, đã lọc ticket Jira `Released`/`Done` có bảng thông số
và ngày mới hơn `numbers_asof` của từng file.

**Chỉ tìm được một thay đổi thật**: `VPO_cashloan` thu nhập tối thiểu 4 → 5 triệu
([PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708), hiệu lực 2026-03-16). Đã cập nhật.

Các ticket còn lại là spec API, UI, hoặc schema — không đổi thông số.

> **Cảnh báo**: bộ nhận diện sản phẩm quét cả phần thân tài liệu nên **khớp dư** —
> ví dụ `PL-12920 MWG_paylater` bị gán nhầm cho `ZLP_payday` và `VNP_paylater`,
> do ticket API liệt kê nhiều sản phẩm trong phần mô tả trường. Khớp dư gây nhiễu chứ
> không gây sót, nhưng nghĩa là kết luận "không có ticket mới" chưa chắc chắn tuyệt đối.

## Toàn bộ file

| File | Status | Số liệu | Tới ngày | Nguồn |
|---|---|---|---|---|
| `kb/products/cashloan/faq.md` | draft | jira | 2026-08-25 | `confluence:198148097`, `jira:PL-9170`, `jira:PL-14087`, `jira:PL-13667` |
| `kb/products/cashloan/loan-management.md` | draft | jira | 2026-08-25 | `confluence:198148097`, `confluence:1120959`, `confluence:14155933`, `jira:PL-9170`, `jira:PL-5240`, `jira:PL-13667` |
| `kb/products/cashloan/overview.md` | draft | jira | 2026-08-25 | `confluence:198148097`, `confluence:27918827`, `jira:PL-14087`, `jira:PL-13667`, `jira:PL-12970`, `jira:PL-11683`, `jira:PL-9170`, `jira:PL-5240` |
| `kb/products/cashloan/partners/be/be_cashloan.md` | draft | jira | 2026-09-03 | `jira:PL-13946`, `jira:PL-9170`, `confluence:39453176`, `confluence:27918827` |
| `kb/products/cashloan/partners/cake-affiliate/cake_cl_affiliate.md` | draft | jira | 2026-05-08 | `jira:PL-12047`, `jira:PL-12163`, `confluence:198148097`, `confluence:27918827` |
| `kb/products/cashloan/partners/klp/klp_cashloan.md` | draft | jira | 2026-08-22 | `jira:PL-10318`, `confluence:1823572040`, `confluence:27918827` |
| `kb/products/cashloan/partners/mwg/mwg_cashloan.md` | draft | jira | 2026-04-07 | `jira:PL-12086`, `jira:PL-9170`, `confluence:189300737`, `confluence:27918827` |
| `kb/products/cashloan/partners/ngs/ngs_cashloan.md` | draft | jira | 2024-07-31 | `jira:PL-4921`, `jira:PL-5240`, `confluence:164397075`, `confluence:27918827` |
| `kb/products/cashloan/partners/vds/viettel_cashloan.md` | draft | jira | 2026-02-10 | `jira:PL-11720`, `jira:PL-9170`, `confluence:1121758`, `confluence:27918827` |
| `kb/products/cashloan/partners/vds/vt_cashloan_s.md` | draft | jira | 2024-07-31 | `jira:PL-5240`, `confluence:15368221`, `confluence:27918827` |
| `kb/products/cashloan/partners/vds/vtpo_cashloan.md` | draft | jira | 2025-03-27 | `jira:PL-7711`, `jira:PL-7607`, `confluence:465240455`, `confluence:27918827` |
| `kb/products/cashloan/partners/vnpay/vnp_cashloan.md` | draft | jira | 2026-09-15 | `jira:PL-14264`, `jira:PL-9170`, `confluence:310444033`, `confluence:27918827` |
| `kb/products/cashloan/partners/vnpost/vpo_cl_pension.md` | draft | jira | 2026-05-14 | `jira:PL-12435`, `confluence:1348567065`, `confluence:27918827` |
| `kb/products/cashloan/partners/zalopay/zlp_cashloan.md` | draft | jira | 2026-05-08 | `jira:PL-12533`, `confluence:453182180`, `confluence:27918827` |
| `kb/products/od/partners/cake/cake_overdraft.md` | draft | jira | 2026-09-03 | `jira:PL-12807`, `jira:PL-12708`, `confluence:27918827` |
| `kb/products/od/partners/cake/cake_overdraft_td.md` | draft | jira | 2026-08-19 | `jira:PL-13138`, `jira:PL-13257`, `jira:PL-12807`, `confluence:27918827` |
| `kb/products/payday/partners/be/be_payday.md` | draft | jira | 2026-07-24 | `jira:PL-12940`, `jira:PL-13050`, `confluence:1878196240`, `confluence:27918827` |
| `kb/products/payday/partners/cake/cake_payday.md` | draft | jira | 2026-05-14 | `jira:PL-12681`, `jira:PL-12521`, `confluence:637534211`, `confluence:27918827` |
| `kb/products/payday/partners/mwg/mwg_payday.md` | draft | jira | 2026-06-10 | `jira:PL-12919`, `confluence:1774879256`, `confluence:27918827` |
| `kb/products/payday/partners/vds/pd_viettel.md` | draft | jira | 2026-04-22 | `jira:PL-12076`, `jira:PL-12708`, `confluence:1025583`, `confluence:27918827` |
| `kb/products/payday/partners/vnpay/vnp_payday.md` | draft | jira | 2025-12-10 | `jira:PL-11271`, `jira:PL-12708`, `confluence:610992373`, `confluence:27918827` |
| `kb/products/paylater/partners/fpt/fpt_paylater.md` | draft | jira | 2024-10-08 | `jira:PL-5673`, `confluence:295436290`, `confluence:27918827` |
| `kb/products/paylater/partners/mwg/mwg_paylater.md` | draft | jira | 2026-08-25 | `jira:PL-14106`, `confluence:399048808`, `confluence:27918827` |
| `kb/products/paylater/partners/vds/vds_paylater.md` | draft | jira | 2026-05-28 | `jira:PL-12553`, `confluence:54067746`, `confluence:27918827` |
| `kb/products/paylater/partners/vds/vds_paylater_epass.md` | draft | jira | 2025-11-13 | `jira:PL-10519`, `confluence:1077346320`, `confluence:27918827` |
| `kb/channels/cake-app.md` | draft | n/a | — | `confluence:1042743307`, `confluence:1058537573`, `confluence:27918827`, `confluence:198148097` |
| `kb/channels/dop.md` | stub | n/a | — | `confluence:1060929556` |
| `kb/channels/native-api.md` | stub | n/a | — | `confluence:1058504829` |
| `kb/glossary.md` | draft | n/a | — | `confluence:198148097`, `confluence:1084555273`, `confluence:1120959`, `confluence:14155933`, `confluence:27918827`, `confluence:1042743307` |
| `kb/products/cashloan/onboarding.md` | draft | n/a | — | `confluence:198148097`, `confluence:27918827`, `confluence:1042743307`, `confluence:1058537573` |
| `kb/products/cashloan/partners/datavn/vnhub_cashloan.md` | draft | confluence | 2025-11-27 | `confluence:1148878850`, `confluence:1148878850`, `confluence:27918827` |
| `kb/products/cashloan/partners/mbf/overview.md` | draft | confluence | — | `confluence:1861025824`, `confluence:1861025856`, `confluence:1861025881`, `confluence:1861025931`, `jira:PL-12531` |
| `kb/products/cashloan/partners/misa/misa_cashloan.md` | draft | confluence | 2025-10-08 | `confluence:1108410369`, `confluence:1108410369`, `confluence:27918827` |
| `kb/products/cashloan/partners/mwg/mwg_cl_online.md` | draft | confluence | 2026-04-08 | `confluence:1587740860`, `confluence:1587740860`, `confluence:27918827` |
| `kb/products/cashloan/partners/vnpost/vpo_cashloan.md` | draft | confluence | 2025-12-23 | `jira:PL-12708`, `confluence:369688578`, `confluence:356483512`, `confluence:27918827` |
| `kb/products/od/faq.md` | stub | n/a | — | — |
| `kb/products/od/loan-management.md` | stub | n/a | — | — |
| `kb/products/od/onboarding.md` | stub | n/a | — | — |
| `kb/products/od/overview.md` | stub | n/a | — | — |
| `kb/products/payday/faq.md` | stub | n/a | — | — |
| `kb/products/payday/loan-management.md` | stub | n/a | — | — |
| `kb/products/payday/onboarding.md` | stub | n/a | — | — |
| `kb/products/payday/overview.md` | draft | n/a | — | `confluence:27918827`, `confluence:1042743307` |
| `kb/products/payday/partners/fiza/overview.md` | draft | confluence | — | `confluence:1961427498`, `confluence:1961427522`, `confluence:1961427545`, `confluence:1961427594`, `jira:PL-13475` |
| `kb/products/payday/partners/vds/vt_payday_s.md` | draft | confluence | 2025-12-23 | `confluence:986873857`, `confluence:986873857`, `confluence:27918827` |
| `kb/products/payday/partners/zalopay/zlp_payday.md` | draft | confluence | 2026-07-23 | `confluence:838533123`, `confluence:838533123`, `confluence:27918827` |
| `kb/products/paylater/faq.md` | stub | n/a | — | — |
| `kb/products/paylater/loan-management.md` | stub | n/a | — | — |
| `kb/products/paylater/onboarding.md` | stub | n/a | — | — |
| `kb/products/paylater/overview.md` | stub | n/a | — | — |
| `kb/products/paylater/partners/be/be_paylater.md` | draft | confluence | 2024-12-01 | `confluence:190611564`, `confluence:190611564`, `confluence:27918827` |
| `kb/products/paylater/partners/vnpay/vnp_paylater.md` | draft | confluence | 2025-12-24 | `confluence:263782609`, `confluence:263782609`, `confluence:27918827` |
| `kb/reject-messages.md` | draft | n/a | — | `confluence:852792931`, `jira:PL-12708` |

## Công cụ

| Script | Việc |
|---|---|
| `tools/export.mjs` | export Confluence + Jira về `raw/` |
| `tools/build-index.mjs` | index toàn bộ 2.910 tài liệu |
| `tools/match-products.mjs` | nhận diện sản phẩm theo cặp đối tác × loại |
| `tools/scan-tree.mjs` · `tools/extract-tree.mjs` | quét theo cây ticket, trích bảng số |
| `tools/gen-kb-skeleton.mjs` · `tools/fill-jira-numbers.py` | sinh khung, điền số |

