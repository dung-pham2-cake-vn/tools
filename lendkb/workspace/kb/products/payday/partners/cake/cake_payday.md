---
title: Payday — Cake (CAKE_payday)
product: payday
partner: cake
channel: cake
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12681
  - jira:PL-12521
  - confluence:637534211
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---

# Cake — CAKE_payday

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-05-14.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Cake |
| Loại sản phẩm | payday |
| ProductId | `CAKE_payday` |
| Onboarding source | *(nguồn để trống)* |
| Contract type | `CAKE_PAYDAY` |
| Kênh | cake |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức — lần 1 | 2 – 3 triệu |
| Hạn mức — lần 2 trở đi | 3 – **6 triệu** |
| Kỳ hạn — lần 1 | 30 ngày |
| Kỳ hạn — lần 2 trở đi | 30 hoặc 45 ngày |
| Lãi suất | **59%/năm** |
| Phí bảo hiểm | **8%** trên số tiền giải ngân |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số kỳ chậm |
| Phạt lãi chậm | 10% × lãi quá hạn × số kỳ chậm (tối đa 10%) — **chưa áp dụng** |
| Phí tất toán trước hạn | **0%** |
| Điều kiện tất toán | Không yêu cầu |

> **Tất toán sớm miễn phí.** Cake Payday nằm cùng nhóm `BE_payday` và `FIZA_payday`.

Nguồn: lãi suất [PL-12681](https://cakedigitalbank.atlassian.net/browse/PL-12681) (55% → 59%),
hạn mức [PL-12521](https://cakedigitalbank.atlassian.net/browse/PL-12521).

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng toàn bộ sản phẩm lending. Xác nhận bởi PO 2026-10-01.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/payday/overview]] và [[kb/channels/cake-app]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
