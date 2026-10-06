---
title: Payday — VDS (Viettel Money) (VT_Payday_S)
product: payday
partner: vds
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:986873857
  - confluence:986873857
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-09-17
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# VDS (Viettel Money) — VT_Payday_S

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | payday |
| ProductId | `VT_Payday_S` |
| Onboarding source | `vt_payday_payroll` |
| Contract type | `VIETTEL_PAYDAY_PAYROLL` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

> ⚠️ **Trang nguồn cập nhật lần cuối 2025-09-17** — đã hơn một năm. Jira không có ticket đổi chính sách, nhưng cũng có thể thay đổi chưa bao giờ được ghi vào Jira. Nên xác nhận lại với PO phụ trách.

**Sản phẩm vay trên lương — lãi suất 0%, không phạt trả chậm.**

| Chỉ tiêu | Nhân viên Viettel | Nhân viên đơn vị khác |
|---|---|---|
| Hạn mức | 2 – **30 triệu** (tối đa 50% thu nhập trung bình 3 tháng) | 2 – **10 triệu** (tối đa 50% thu nhập trung bình 6 tháng) |
| Kỳ hạn | 30 ngày | 30 ngày |
| Lãi suất | **0%** | **0%** |
| Phí bảo hiểm | **3%** | **5%** |
| Phạt trả chậm gốc | **0%** | **0%** |
| Điều kiện tất toán sớm | Không yêu cầu | Không yêu cầu |

Giải ngân về tài khoản Cake của khách, rồi nạp vào ví Viettel Money.

> **Lãi 0% và phạt 0%.** Chi phí duy nhất là phí bảo hiểm 3% hoặc 5%.
> Khách hỏi "lãi bao nhiêu" → **0%**, nhưng nêu rõ có phí bảo hiểm cộng vào khoản vay.
>
> Hạn mức phụ thuộc thu nhập trung bình của khách — **tra hệ thống**, không báo mức trần chung.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/payday/overview]] và [[kb/channels/native-api]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
