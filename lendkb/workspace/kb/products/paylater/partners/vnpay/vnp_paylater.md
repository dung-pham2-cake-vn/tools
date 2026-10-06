---
title: Paylater — VNPAY (VNP_paylater)
product: paylater
partner: vnpay
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:263782609
  - confluence:263782609
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-03-20
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# VNPAY — VNP_paylater

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VNPAY |
| Loại sản phẩm | paylater |
| ProductId | `VNP_paylater` |
| Onboarding source | `dop_vnp_paylater` |
| Contract type | `VNP_PAYLATER` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **1 – 35 triệu** (mặc định hiển thị 35 triệu) |
| Kỳ hạn | 60 tháng |
| Lãi suất | **39%/năm** |
| Phí phạt chậm thanh toán | **50.000đ** (từ ngày quá hạn đầu tiên) |
| Lãi phạt dư nợ chậm | 100% × lãi suất trong hạn |
| Phí sử dụng hạn mức | 30.000đ — **giai đoạn 1 đang miễn phí** |
| Phí quản lý hạn mức hàng tháng | Không áp dụng |
| Tất toán trước hạn | Được phép, **không mất phí** |

### Thanh toán hàng kỳ

- **Tối thiểu** = 30% dư nợ sao kê (gốc + lãi + phí sử dụng hạn mức)
- **Toàn bộ** = tổng dư nợ sao kê

Lãi tính từ **ngày ghi nhận giao dịch thành công**, không phải ngày sao kê.

> Khách trả đúng mức tối thiểu vẫn còn dư nợ và vẫn phát sinh lãi — đây là chỗ khách
> hay hiểu nhầm là "đã trả đủ".

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
