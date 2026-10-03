---
title: Bảng soát số liệu tài chính toàn KB
audience: [ops, po]
last_verified: 2026-10-01
owner: dung.pham2
status: open
---

# Bảng soát số tài chính

Số tài chính của **33 sản phẩm** trên một trang. Soát trước khi chuyển `approved`.

`theo nhóm ↓` = chia theo nhóm khách, mở file để xem. Ô trống = KB chưa có số.

| Sản phẩm | | Hạn mức | Kỳ hạn | Lãi | Phí BH | Phí tất toán | Nguồn | Số tới |
|---|---|---|---|---|---|---|---|---|
| `BE_payday` | 🟢 | 2 triệu – 4 triệu (lần 1) · 2 – 6 triệu  | 30 ngày (lần 1) · 30–45 ngày (lần 2 trở  | 60%/năm, cố định — tính trên dư nợ gốc t | 8% × số tiền phê duyệt — bắt buộc | 0% — không mất phí, không điều kiện | jira | 2026-07-24 |
| `Be_Cashloan` | 🟢 |  | 3 – 24 tháng |  | 7% trên số tiền vay, cộng vào khoản vay | 3% dư nợ còn lại | jira | 2026-10-01 |
| `CAKE_cashloan` |  | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ |  |  | jira | 2026-08-25 |
| `CAKE_cl_affiliate` | 🟢 | 10 – 50 triệu |  | 59%/năm | 7% |  | jira | 2026-05-08 |
| `CAKE_overdraft` | 🟢 | 90% giá trị sổ (loại TD0002) · 75% (loại | 1 – 12 tháng, mặc định 12 tháng | Động: cao nhất của (lãi suất sổ + 2,5%), |  |  | jira | 2026-09-03 |
| `CAKE_overdraft_TD` | 🟢 |  |  |  |  |  | jira | 2026-08-19 |
| `CAKE_payday` | 🟢 | 2 – 3 triệu | 30 ngày | 59%/năm | 8% trên số tiền giải ngân | 0% | jira | 2026-10-01 |
| `FPT_paylater` |  | 3 – 5 triệu | 60 tháng | 0% |  |  | jira | 2026-10-01 |
| `KLP_cashloan` | 🟢 | 5 – 30 triệu |  | 59%/năm | 7% × số tiền vay | 8% (trước kỳ 3) · 5% (từ kỳ 3 trở đi) | jira | 2026-08-22 |
| `MBF_cashloan` |  | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ |  |  | jira | 2026-07-20 |
| `MWG_cashloan` | 🟢 | 5 – 40 triệu (bước 1 triệu) | 6 – 48 tháng (bước 3 tháng) | 43% – 60%/năm, tuỳ nhóm rủi ro và có/khô | 7% trên số tiền vay, cộng vào khoản vay | 3% dư nợ còn lại | jira | 2026-10-01 |
| `MWG_payday` | 🟢 | 2 – 6 triệu |  | 60%/năm |  | Không có | jira | 2026-10-01 |
| `MWG_paylater` | 🟢 | 1 – 25 triệu → 1 – 40 triệu → mặc định 6 | 60 tháng | 55%/năm |  |  | jira | 2026-10-01 |
| `NGS_cashloan` |  | 5 – 100 triệu, tuỳ nhóm khách (các mức:  | 6 – 36 tháng (bước 3 tháng) |  | 7% trên số tiền giải ngân (không bắt buộ | 3% dư nợ còn lại | jira | 2024-07-31 |
| `PD_Viettel` | 🟢 | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ | jira | 2026-10-01 |
| `VDS_paylater` | 🟢 | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ |  |  | jira | 2026-10-01 |
| `VDS_paylater_epass` |  |  | 60 tháng | 0% |  |  | jira | 2025-11-13 |
| `VNP_cashloan` | 🟢 | 5 – 50 triệu (bước 1 triệu) |  | 55%/năm | 7% trên tổng số tiền vay (không bắt buộc | 3% dư nợ còn lại | jira | 2026-10-01 |
| `VNP_payday` | 🟢 | lần đầu 4 triệu · lần 2 trở đi 4 – 6 tri |  | 60%/năm | 8% trên số tiền giải ngân — bắt buộc | 0% — trả trước một phần hoặc tất toán bấ | jira | 2026-10-01 |
| `VPO_cl_pension` | 🟢 | theo nhóm ↓ |  | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ | jira | 2026-05-14 |
| `VTPO_cashloan` |  | 5 – 30 triệu | 6 – 24 tháng | 49%/năm · theo logic VDS Cashloan, dựa t | Theo logic `Viettel_Cashloan` |  | jira | 2026-10-01 |
| `VT_Cashloan_S` | 🟢 | 10 – 70 triệu | 6 – 36 tháng | 25% – 39%/năm — thấp nhất nhóm cashloan  | 5% (thấp hơn mức 7% thường thấy) | 3% dư nợ còn lại | jira | 2026-10-01 |
| `Viettel_Cashloan` | 🟢 | theo nhóm ↓ | 6 – 48 tháng | theo nhóm ↓ | 7% trên số tiền giải ngân |  | jira | 2026-10-01 |
| `ZLP_cashloan` | 🟢 | 3 – 70 triệu (bước 1 triệu) | 3 – 60 tháng (bước 1 tháng) | 50%/năm |  |  | jira | 2026-05-08 |
| `BE_paylater` | 🟢 | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ |  |  | confluence | 2025-06-25 |
| `FIZA_payday` |  |  | theo nhóm ↓ | 60%/năm, có hay không có bảo hiểm đều nh | 9% trên số tiền vay | Không có phí | confluence | 2026-08-18 |
| `MISA_cashloan` | 🟢 | 10 – 100 triệu | 6 – 36 tháng | 48%/năm | Không có | 5% × số tiền trả nợ trước hạn | confluence | 2025-10-23 |
| `MWG_cl_online` | 🟢 | 5 – 50 triệu | 6 – 48 tháng | 48%/năm | 7% × số tiền vay | 8% (trong 3 kỳ đầu) · 5% (từ kỳ thứ 4) | confluence | 2026-02-09 |
| `VNHUB_cashloan` |  | 5 – 40 triệu (bước 1 triệu) | 6 – 48 tháng (bước 3 tháng) | 27%/năm | 7% × số tiền vay | 8% (trước kỳ 3) · 5% (từ kỳ 3 trở đi) | confluence | 2025-11-05 |
| `VNP_paylater` | 🟢 | 1 – 35 triệu (mặc định hiển thị 35 triệu | 60 tháng | 39%/năm |  |  | confluence | 2026-03-20 |
| `VPO_cashloan` | 🟢 | 10 – 50 triệu | 6 – 36 tháng | 43% – 60%/năm, tuỳ nhóm rủi ro và có/khô | 5% trên số tiền vay, cộng vào khoản vay | 3% dư nợ còn lại | confluence | 2025-11-14 |
| `VT_Payday_S` | 🟢 | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ | theo nhóm ↓ |  | confluence | 2025-09-17 |
| `ZLP_payday` | 🟢 | 2 – 6 triệu (mặc định 4 triệu, bước 1 tr | Khách mới 30 ngày · khách vay lại 30 hoặ | 60%/năm, dư nợ giảm dần — có hay không b | 8% trên gốc — bắt buộc |  | confluence | 2026-09-17 |

## Độ phủ

- Đủ 5 chỉ tiêu: **9/33**
- Thiếu ≥3 chỉ tiêu: **2** — `CAKE_overdraft_TD`, `VDS_paylater_epass`

## Điểm cần soát kỹ

**Phí tất toán — 4/6 mâu thuẫn đang mở đều ở mục này.** Trang Product Policy ghi 3%,
PL-9170 ghi 8%/5%. Xem `can-confirm.md` mục B7, B10, B12.

**Lãi 0%** — `VT_Payday_S`, `FPT_paylater`, `VDS_paylater`, `VDS_paylater_epass`, `BE_paylater` nhóm `PLBE_01`. Đúng, không phải thiếu số.

**Bảo hiểm bắt buộc** — `BE_payday`, `ZLP_payday`, `VPO_cl_pension`, `VNP_payday` (không mua thì khoản vay bị huỷ).

**Phí phạt chậm thu nhiều lần** — `MWG_paylater` thu 50.000đ tại mỗi mốc DPD 1, 5, 10, 15.

**Thanh toán tối thiểu Paylater** — 30% ở hầu hết, riêng `FPT_paylater` **15%**.

