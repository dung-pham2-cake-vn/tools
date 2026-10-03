---
title: Bản đồ tài liệu — tài liệu nào phục vụ sản phẩm nào
last_verified: 2026-10-01
audience: [ops, po]
owner: dung.pham2
status: reference
---

# Bản đồ tài liệu

Index toàn bộ **2910 tài liệu** trong `raw/` (1.079 Confluence + 1.831 Jira).
Sinh bằng `tools/build-index.mjs`, dữ liệu đầy đủ ở `tools/scan/doc-index.csv`.

## Phân loại nội dung

| Nhãn | Nghĩa | Số tài liệu |
|---|---|---|
| `ui` | Màn hình / luồng app | 1086 |
| `other` | Khác | 1023 |
| `gl` | Hạch toán / GL | 766 |
| `api` | Spec API | 393 |
| `policy-table-weak` | Có nhắc thông số, rời rạc | 347 |
| `policy-table` | Bảng thông số sản phẩm | 301 |
| `policy-prose` | Thông số dạng văn xuôi | 77 |

**697 tài liệu** chứa thông số chính sách — nhóm đáng đọc kỹ.

## Ba cấp gắn tài liệu

| Cấp | Nghĩa | Phục vụ file nào |
|---|---|---|
| Sản phẩm cụ thể | Nêu `product_id` nguyên văn, hoặc tiêu đề theo quy ước `[Partner][X] - <loại>` | `kb/products/<loại>/partners/<đt>/` |
| Loại sản phẩm | Chỉ nêu loại, không gắn đối tác (vd `[CORE] - Paylater - Repayment`) | `kb/products/<loại>/*.md` |
| Dùng chung | Không gắn gì (GL, Portal, Rule Engine, API chung) | `kb/channels/`, `kb/glossary.md`, `kb/reject-messages.md` |

Tài liệu policy gắn theo **loại**: paylater 36 · cashloan 12 · payday 5 · bikeloan 1
Tài liệu policy **dùng chung**, không gắn được gì: 792

## Theo sản phẩm

| ProductId | Tài liệu | Policy | Trang thông số chính |
|---|---|---|---|
| `MWG_paylater` | 221 | 51 | 399048808 — [Partner][MWG] - Paylater - Product Policy |
| `BE_paylater` | 198 | 50 | 190611564 — [BEG][Paylater] - Product Policy |
| `VDS_paylater` | 147 | 45 | 185171988 — [Paylater] - Product Policy Comparison |
| `VNP_paylater` | 147 | 34 | 263782609 — [Partner][VNPAY] - Paylater - Product Policy |
| `VPO_cashloan` | 143 | 36 | 356483512 — [Partner][Vnpost] -  Cashloan - Product Poli |
| `VNP_cashloan` | 136 | 31 | 310444033 — [Partner][VNPAY] - Cashloan - Product Policy |
| `MWG_cashloan` | 133 | 32 | 189300737 — [Partner][MWG] -  Cashloan - Product Policy |
| `Viettel_Cashloan` | 121 | 39 | 1121758 — [Partner][Viettel] -  Cashloan - Product Pol |
| `CAKE_cashloan` | 119 | 39 | 198148097 — [CAKE] -  Cashloan - Product Policy |
| `FPT_paylater` | 117 | 23 | 295436290 — [Partner][FPT] - Paylater - Product Policy |
| `ZLP_cashloan` | 111 | 32 | 453182180 — [Partner][ZaloPay] -  Cashloan - Product Pol |
| `NGS_cashloan` | 108 | 30 | 164397075 — [Partner][NGS] -  Cashloan - Product Policy |
| `VT_Payday_S` | 98 | 23 | 986873857 — VDS Payday Payroll- Product Policy |
| `Be_Cashloan` | 95 | 25 | 39453176 — [Partner][BeG] - Cashloan - Product Policy |
| `PD_Viettel` | 94 | 25 | 1025583 — [Partner][Viettel] - Payday - Product Policy |
| `CAKE_payday` | 92 | 33 | 637534211 — [CAKE] - Payday - Product Policy |
| `VTPO_cashloan` | 91 | 23 | 465240455 — [Partner][Viettel] - CL O2O - Product Policy |
| `CAKE_overdraft` | 90 | 23 | 852792931 — [Rule Engine] - Product onboarding pre-check |
| `VT_Cashloan_S` | 86 | 28 | 15368221 — [Partner][Viettel] - Cashloan 2 - Product Po |
| `MISA_cashloan` | 73 | 17 | 1108410369 — [Partner][MISA_cashloan] - Product Policy |
| `CAKE_overdraft_TD` | 70 | 23 | PL-12803 — ODTD_v2 - [Setup] Thông số sản phẩm & config |
| `VPO_cl_pension` | 67 | 23 | 1348567065 — [Partner][VPO_cl_pension] - Product Policy |
| `ZLP_payday` | 62 | 15 | 838533123 — [Partner][ZaloPay] - Payday - Product Policy |
| `VNP_payday` | 61 | 12 | 610992373 — [Partner][VNPAY] - Payday - Product Policy |
| `MWG_cl_online` | 49 | 14 | 1587740860 — [Partner][MWG_cl_online] - Product Policy |
| `VDS_paylater_epass` | 48 | 11 | 1077346320 — [Partner][Viettel] - Paylater ePass - Produc |
| `VNHUB_cashloan` | 42 | 10 | 1148878850 — [Partner][VNHUB_cashloan] - Product Policy |
| `MWG_payday` | 41 | 11 | 1774879256 — [Partner][MWG_payday] - Product Policy |
| `MBF_cashloan` | 38 | 12 | 1861025856 — [Partner][MBF_cashloan] - Product Policy |
| `KLP_cashloan` | 37 | 12 | PL-12641 — KLP_cashloan - [Setup] Thông số sản phẩm |
| `BE_payday` | 36 | 12 | 1878196240 — [Partner][be_payday] - Product Policy |
| `CAKE_cl_affiliate` | 34 | 10 | 852792931 — [Rule Engine] - Product onboarding pre-check |
| `FIZA_payday` | 32 | 9 | 1961427522 — [Partner][FIZA_payday] - Product Policy |
| `FIZA_cashloan` | 28 | 6 | 1961427358 — [Partner][FIZA_cashloan] - Product Policy |
| `KOV_cashloan` | 20 | 12 | 2074379126 — [Partner][KOV]  - Product Policy |
| `PD_CAKEVNPT_NEW` | 18 | 4 | 850460681 — VNPT Payday - Product Policy |
| `LCP_paylater` | 17 | 12 | 2104099888 — [Partner][LCP]  - Product Policy |
| `VDS_cashloan_LP` | 16 | 1 | 60751873 — [Partner] - [Viettel] Landing page VT Cashlo |
| `VDS_bikeloan` | 11 | 8 | 52593159 — [Partner][Viettel] -  Bikeloan - Product Pol |
| `NGS_payday` | 9 | 5 | 162955573 — [Partner][NGS] - Payday - Product Policy |
| `GSM_bikeloan` | 8 | 4 | 41386015 — VinFast bike loan - Product Policy |

## Cách dùng

1. Cần số liệu sản phẩm X → mở `tools/scan/doc-index.csv`, lọc `products` chứa X và `tags` chứa `policy-`.
2. Ưu tiên `tableRows` cao nhất và tiêu đề chứa "Product Policy".
3. Đối chiếu ticket Jira mới hơn: chạy `./tools/refresh.sh --no-pull`.

## Cách nhận diện sản phẩm

Hai tín hiệu độc lập, hợp lại:

- **`product_id` hoặc mã nội bộ xuất hiện nguyên văn** ở bất kỳ đâu trong tài liệu.
  Quét cả phần thân, vì tài liệu liệt kê 10 sản phẩm thì phải nhận đủ 10.
- **Cặp (đối tác × loại sản phẩm)** suy từ tiêu đề và breadcrumb, **không quét thân** —
  thân tài liệu hay nhắc sản phẩm khác để tham chiếu, gây gán nhầm.

Logic ở `tools/match-products.mjs`. Đã sửa 4 lỗi: khớp `product_id` nguyên khối ·
bỏ sót mã nội bộ (`VDS-O2O`, `ODTD_v2`) · `\b` không khớp qua dấu `_` (`MBF_cashloan`) ·
quét thân gây gán nhầm. Vẫn là khớp mẫu — tài liệu đặt tên ngoài quy ước vẫn có thể lọt.

