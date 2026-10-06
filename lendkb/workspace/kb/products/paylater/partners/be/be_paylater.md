---
title: Paylater — BeGroup (BE_paylater)
product: paylater
partner: be
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:190611564
  - confluence:190611564
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-06-25
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# BeGroup — BE_paylater

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | BeGroup |
| Loại sản phẩm | paylater |
| ProductId | `BE_paylater` |
| Onboarding source | `dop_be_paylater` |
| Contract type | `BE_PAYLATER` |
| Kênh | dop |
| NFC khi đăng ký | DOP |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

> ⚠️ **Trang nguồn cập nhật lần cuối 2025-06-25** — đã hơn một năm. Jira không có ticket đổi chính sách, nhưng cũng có thể thay đổi chưa bao giờ được ghi vào Jira. Nên xác nhận lại với PO phụ trách.

| Chỉ tiêu | `PLBE_01` | `PLBE_02` |
|---|---|---|
| Hạn mức | 1 triệu | 1 – 5 triệu |
| Kỳ hạn | 60 tháng | 60 tháng |
| Lãi suất | **0%** | **40%/năm** |
| Phí phạt chậm thanh toán | 50.000đ | 50.000đ |
| Phí quản lý hạn mức hàng tháng | **36.000đ** | **36.000đ** |
| Lãi phạt gốc quá hạn | 100% × lãi suất × dư nợ gốc quá hạn × số ngày | như bên |
| Lãi phạt lãi quá hạn | 100% × lãi suất × dư nợ lãi quá hạn × số ngày (tối đa 10%) | như bên — **chưa áp dụng** |
| Tất toán trước hạn | Được phép | Được phép |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.

**Thanh toán tối thiểu** = 30% dư nợ gốc + lãi phát sinh. **Toàn bộ** = tổng dư nợ gốc + lãi phát sinh.

> **Phí quản lý hạn mức 36.000đ/tháng** thu vào ngày sao kê nếu khách còn dư nợ > 0
> **hoặc** có chi tiêu trong 30 ngày trước đó. Khách đã trả hết nhưng có chi tiêu gần đây
> vẫn bị thu — đây là chỗ hay khiếu nại.
>
> Hai nhóm sản phẩm lãi suất khác nhau hẳn (0% và 40%). **Xác định đúng nhóm trước khi trả lời.**
> **Không nói khách thuộc nhóm nào.**

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/paylater/overview]] và [[kb/channels/dop]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
