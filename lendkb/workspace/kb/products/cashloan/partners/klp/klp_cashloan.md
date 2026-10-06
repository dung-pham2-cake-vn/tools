---
title: Cashloan — KLP (KLP_cashloan)
product: cashloan
partner: klp
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12641
  - jira:PL-10318
  - confluence:1823572040
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-08-22
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---

# KLP — KLP_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-08-22.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | KLP |
| Loại sản phẩm | cashloan |
| ProductId | `KLP_cashloan` |
| Onboarding source | `dop_klp_cashloan` |
| Contract type | `DOP_KLP_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | None |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `CAKEKLP01` |
| Hạn mức | 5 – 30 triệu (bước nhảy 1 triệu) |
| **Kỳ hạn** | **6 – 36 tháng** (bước nhảy 3 tháng) |
| Lãi suất không bảo hiểm | 59%/năm |
| Lãi suất có bảo hiểm | 48%/năm |
| Phí bảo hiểm | 7% × số tiền vay |
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc × số ngày chậm |
| Phạt lãi chậm | **Không áp dụng** |
| Phí tất toán trước hạn | **8%** (trước kỳ 3) · **5%** (từ kỳ 3 trở đi) |

Nguồn: [PL-10318](https://cakedigitalbank.atlassian.net/browse/PL-10318), live 2026-08-22.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/cashloan/overview]] và [[kb/channels/dop]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
