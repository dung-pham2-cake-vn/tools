---
title: Od — Cake (CAKE_overdraft_TD)
product: od
partner: cake
channel: cake
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-13138
  - jira:PL-13257
  - jira:PL-12807
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-08-19
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---

# Cake — CAKE_overdraft_TD

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-08-19.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Cake |
| Loại sản phẩm | od |
| ProductId | `CAKE_overdraft_TD` |
| Onboarding source | `od_face_match` |
| Contract type | `OVER_DRAFT` |
| Kênh | cake |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

Thấu chi có tài sản bảo đảm là sổ tiết kiệm. Cấu hình hạn mức và lãi suất: xem [[kb/products/od/partners/cake/cake_overdraft]].

### Bậc khoá theo số ngày quá hạn

| Số ngày quá hạn | Trạng thái | Khách phải trả |
|---|---|---|
| 1 – 5 ngày | Vẫn hoạt động | Lãi + phạt |
| 6 – 30 ngày | **Khoá tạm thời** | Lãi + phạt |
| Từ 31 ngày | **Khoá vĩnh viễn** | **Toàn bộ dư nợ gốc** + lãi + phạt |

> Mốc 31 ngày là bước ngoặt: khách phải trả **toàn bộ dư nợ gốc**, không chỉ lãi và phạt.
> Cảnh báo khách trước khi tới mốc này.
>
> Khoá cũng có thể do nghi ngờ gian lận, không chỉ do quá hạn.
> **Không giải thích lý do khoá — escalate.**

### Thông báo trên app

- Chưa tới hạn: hiện lãi kỳ hiện tại, kèm dòng "Đang áp dụng lãi suất x,x%/năm. Lãi tính theo ngày".
- Quá hạn: hiện "Đang áp dụng lãi phạt quá hạn. Bạn cần thanh toán ngay...".

Nguồn: [PL-13138](https://cakedigitalbank.atlassian.net/browse/PL-13138),
[PL-13257](https://cakedigitalbank.atlassian.net/browse/PL-13257),
[PL-12807](https://cakedigitalbank.atlassian.net/browse/PL-12807).

> **Chưa có số riêng** cho phí tất toán của sản phẩm này.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/od/overview]] và [[kb/channels/cake-app]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
