---
title: Cashloan — MISA (MISA_cashloan)
product: cashloan
partner: misa
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:1108410369
  - confluence:1108410369
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-10-23
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---

# MISA — MISA_cashloan

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | MISA |
| Loại sản phẩm | cashloan |
| ProductId | `MISA_cashloan` |
| Onboarding source | `api_misa_cashloan` |
| Contract type | `MISA_CASHLOAN` |
| Kênh | api |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | nh-khác |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

**Sản phẩm cho chủ hộ kinh doanh / chủ doanh nghiệp dùng phần mềm MISA** (AMIS kế toán,
meInvoice, CukCuk, eShop). Điều kiện và biểu phí khác hẳn phần còn lại của danh mục.

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **10 – 100 triệu** |
| Kỳ hạn | 6 – 36 tháng |
| Lãi suất | **48%/năm** |
| Phí bảo hiểm | **Không có** |
| Phạt gốc chậm | 150% × lãi suất trong hạn |
| Phí tất toán trước hạn | **5%** × số tiền trả nợ trước hạn |
| Điều kiện tất toán | Không yêu cầu |
| Độ tuổi | **20 – 60** |
| Giải ngân về | Tài khoản khách chỉ định (ngân hàng ngoài Cake) |

### Điều kiện riêng về hoạt động kinh doanh

- Có tài khoản MISA **đang hoạt động**, mở tối thiểu **6 tháng**.
- Doanh thu ghi nhận tại MISA trong **3 tháng gần nhất** đạt tối thiểu **10 triệu/tháng**.
- Giấy tờ: CCCD gắn chip còn hiệu lực, 12 số.

> **Ba điểm khác hẳn các sản phẩm khác:**
> 1. **Không có bảo hiểm khoản vay** — khách hỏi mua bảo hiểm để giảm lãi thì trả lời là sản phẩm này không có.
> 2. **Tuổi tới 60**, không phải 50.
> 3. **Phí tất toán 5%**, không theo scheme 8%/5% — và tính trên *số tiền trả nợ trước hạn*.

Nguồn: [confluence:1108410369](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/1108410369).

> Số lấy từ Confluence, **chưa đối chiếu Jira**. MISA có 17 tài liệu policy — cần rà ticket
> xem thông số đã bị đổi chưa trước khi chuyển `reviewed`.

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
