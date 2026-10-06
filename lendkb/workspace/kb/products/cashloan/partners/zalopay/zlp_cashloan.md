---
title: Cashloan — ZaloPay (ZLP_cashloan)
product: cashloan
partner: zalopay
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12533
  - confluence:453182180
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-05-08
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---

# ZaloPay — ZLP_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-05-08.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | ZaloPay |
| Loại sản phẩm | cashloan |
| ProductId | `ZLP_cashloan` |
| Onboarding source | `api_zlp_cashloan` |
| Contract type | `ZLP_CASHLOAN` |
| Kênh | api |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Số tiền vay | **3 – 70 triệu** (bước 1 triệu) |
| Kỳ hạn | **3 – 60 tháng** (bước 1 tháng) |
| Lãi suất có bảo hiểm | 50%/năm |
| Lãi suất không bảo hiểm | 55%/năm |

Tăng từ 2–50 triệu / 3–48 tháng. Nguồn: [PL-12533](https://cakedigitalbank.atlassian.net/browse/PL-12533), live 2026-05-08.

> **Chưa có số** cho phí bảo hiểm, phạt trả chậm, phí tất toán.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/cashloan/overview]] và [[kb/channels/native-api]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
