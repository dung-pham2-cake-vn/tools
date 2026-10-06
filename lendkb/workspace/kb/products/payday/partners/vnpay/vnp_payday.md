---
title: Payday — VNPAY (VNP_payday)
product: payday
partner: vnpay
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-11271
  - jira:PL-12708
  - confluence:610992373
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---

# VNPAY — VNP_payday

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2025-12-10.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VNPAY |
| Loại sản phẩm | payday |
| ProductId | `VNP_payday` |
| Onboarding source | `dop_vnp_payday` |
| Contract type | `VNP_PAYDAY` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product ID | `PDVNP` |
| Số tiền vay | lần đầu **4 triệu** · lần 2 trở đi **4 – 6 triệu** |
| Lãi suất trong hạn | **60%/năm** |
| Phí bảo hiểm | **8%** trên số tiền giải ngân — **bắt buộc** |
| Lãi suất quá hạn | 150% × lãi trong hạn × dư nợ quá hạn × số ngày quá hạn |
| Phí thanh toán trước hạn | **0%** — trả trước một phần hoặc tất toán bất kỳ lúc nào |
| Thu nhập tối thiểu | 5 triệu/tháng (tăng từ 4 triệu, hiệu lực 2026-03-16) |

> **Không mua bảo hiểm thì khoản vay bị huỷ.** Trang nguồn ghi rõ: khách không chọn mua
> bảo hiểm → khoản vay `cancel`. Đây không phải tuỳ chọn.

**Số tiền nhận nợ = số tiền phê duyệt + phí bảo hiểm.** Giải ngân vào tài khoản Cake của
khách rồi nạp sang ví VNPAY.

Ngày thanh toán = ngày giải ngân + thời gian vay. Lãi tính trên dư nợ gốc thực tế, cơ sở 365 ngày.

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

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
