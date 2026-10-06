---
title: Payday — ZaloPay (ZLP_payday)
product: payday
partner: zalopay
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:838533123
  - confluence:838533123
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-09-17
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# ZaloPay — ZLP_payday

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | ZaloPay |
| Loại sản phẩm | payday |
| ProductId | `ZLP_payday` |
| Onboarding source | `api_zlp_payday` |
| Contract type | `ZLP_PAYDAY` |
| Kênh | api |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **2 – 6 triệu** (mặc định 4 triệu, bước 1 triệu, làm tròn trăm nghìn) |
| Kỳ hạn | Khách mới **30 ngày** · khách vay lại **30 hoặc 45 ngày** (mặc định 45) |
| Lãi suất | **60%/năm**, dư nợ giảm dần — có hay không bảo hiểm đều như nhau |
| Phí bảo hiểm | **8%** trên gốc — **bắt buộc** |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số ngày chậm |
| Thu nhập tối thiểu | **4 triệu/tháng** |

> **Thu nhập tối thiểu của ZaloPay Payday là 4 triệu, không phải 5 triệu.**
> Ticket nâng lên 5 triệu ([PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708))
> chỉ áp cho 6 sản phẩm khác, **không có ZLP_payday**.

> Bảo hiểm **bắt buộc** và **không giảm lãi** — khách hỏi bỏ bảo hiểm để rẻ hơn thì trả lời là không được.

### Điều kiện loại trừ

Khách bị từ chối nếu CCCD có địa chỉ thường trú thuộc một số tỉnh, hoặc không đạt các
kiểm tra phía ZaloPay (thay đổi thông tin định danh gần đây, thiết bị bị can thiệp,
quá nhiều tài khoản trên một thiết bị).

**Không liệt kê tỉnh nào, không giải thích tiêu chí — escalate.**

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
