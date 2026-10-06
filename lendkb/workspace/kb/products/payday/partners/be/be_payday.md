---
title: Payday — BeGroup (BE_payday)
product: payday
partner: be
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12940
  - jira:PL-13050
  - confluence:1878196240
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-07-24
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---

# BeGroup — BE_payday

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-07-24.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | BeGroup |
| Loại sản phẩm | payday |
| ProductId | `BE_payday` |
| Onboarding source | `dop_be_payday` |
| Contract type | `BE_PAYDAY` |
| Kênh | dop |
| NFC khi đăng ký | DOP |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 2 triệu – **4 triệu** (lần 1) · 2 – **6 triệu** (lần 2 trở đi) |
| Kỳ hạn | **30 ngày** (lần 1) · **30–45 ngày** (lần 2 trở đi) |
| Lãi suất | **60%/năm**, cố định — tính trên dư nợ gốc thực tế, cơ sở 365 ngày |
| Phí bảo hiểm | **8%** × số tiền phê duyệt — **bắt buộc** |
| Giảm lãi khi mua bảo hiểm | **Không** — lãi cố định, bảo hiểm là phí riêng |
| Phạt gốc chậm | 150% × 60%/năm × dư nợ gốc quá hạn × số ngày chậm ÷ 365 |
| Phạt lãi chậm | **Không áp dụng** |
| Phí tất toán trước hạn | **0%** — không mất phí, không điều kiện |
| Điều kiện khách | Người dùng app BE · thu nhập ≥ 5 triệu/tháng · **tuổi 18–50** · CCCD 12 số còn hiệu lực |

> Hai điểm khác hẳn các sản phẩm khác: **bảo hiểm bắt buộc** (không được bỏ tick) và
> **tất toán sớm miễn phí**. Tuổi tối thiểu 18, không phải 20.

Nguồn: [PL-12940](https://cakedigitalbank.atlassian.net/browse/PL-12940),
[PL-13050](https://cakedigitalbank.atlassian.net/browse/PL-13050).

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/payday/overview]] và [[kb/channels/dop]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
