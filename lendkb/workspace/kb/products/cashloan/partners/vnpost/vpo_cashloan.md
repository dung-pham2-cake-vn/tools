---
title: Cashloan — Vnpost (VPO_cashloan)
product: cashloan
partner: vnpost
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12708
  - confluence:369688578
  - confluence:356483512
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-11-14
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# Vnpost — VPO_cashloan

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Vnpost |
| Loại sản phẩm | cashloan |
| ProductId | `VPO_cashloan` |
| Onboarding source | `dop_vpo_cashloan` |
| Contract type | `VNPOST_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

| Chỉ tiêu | Giá trị (`VPCL_MASS`) |
|---|---|
| Hạn mức | **10 – 50 triệu** |
| Kỳ hạn | 6 – 36 tháng |
| Lãi suất | **43% – 60%/năm**, tuỳ nhóm rủi ro và có/không bảo hiểm |
| Phí bảo hiểm | **5%** trên số tiền vay, cộng vào khoản vay |
| Phạt gốc chậm | 150% × lãi suất × nợ gốc × số ngày chậm ÷ 365 |
| Phạt lãi chậm | 10% × lãi quá hạn × số kỳ chậm — **chưa áp dụng, xem cảnh báo dưới** |
| Phí tất toán trước hạn | **3%** dư nợ còn lại |
| Điều kiện tất toán | Không yêu cầu |
| Thu nhập tối thiểu | **5 triệu/tháng** (nâng từ 4 triệu, hiệu lực 2026-03-16) |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.

> ⚠️ **Mức 3% này đáng ngờ.** Bốn sản phẩm khác (`MWG_cashloan`, `Be_Cashloan`,
> `VT_Cashloan_S`, `VNP_cashloan`) cũng ghi 3% trên trang nguồn nhưng thực tế đang là
> **8%/5%** — trang chỉ là ảnh chụp cũ.
>
> **Chưa xác nhận sản phẩm này.** Agent không trả lời phí tất toán — escalate. Xem B14.

Sản phẩm hưu trí (`VPCL_ASXH`, hạn mức tới 300 triệu, lãi 13,5%) là **sản phẩm riêng** —
xem [[kb/products/cashloan/partners/vnpost/vpo_cl_pension]], đừng lẫn.

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
