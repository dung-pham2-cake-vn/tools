---
title: Cashloan — VDS (Viettel Money) (VTPO_cashloan)
product: cashloan
partner: vds
channel: api
topic: overview
product_status: sắp ngưng
audience: [ops, po]
sources:
  - jira:PL-7711
  - jira:PL-7607
  - confluence:465240455
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---

# VDS (Viettel Money) — VTPO_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2025-03-27.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | cashloan |
| ProductId | `VTPO_cashloan` |
| Onboarding source | `api_vtpo_cashloan` |
| Contract type | `VTPO_CASHLOAN` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | — |
| Trạng thái sản phẩm | **sắp ngưng** |

## 3. Sản phẩm ngừng bán

Khoản vay còn dư nợ **vẫn thanh toán và tất toán được trên app Cake** — xem [[kb/channels/cake-app]].
Luồng kết nối với app đối tác đã đóng; **không hướng khách quay lại app đối tác**.
**Không mở khoản vay mới.**

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `CLVTPP01` |
| Phân khúc | Mass user |
| Hạn mức LOS duyệt | **5 – 30 triệu** |
| Hạn mức giải ngân trên core | **5 – 33 triệu** (gồm phí bảo hiểm) |
| Kỳ hạn | **6 – 24 tháng** |
| Lãi suất | **49%/năm** · theo logic VDS Cashloan, dựa trên mức rủi ro |
| Phí bảo hiểm · phạt · phí tất toán | Theo logic `Viettel_Cashloan` |

> Chênh giữa 30 và 33 triệu là **phí bảo hiểm cộng vào khoản vay**. Khách được duyệt
> 30 triệu nhưng ghi nợ 33 triệu — chỗ khách dễ thắc mắc.

**Sản phẩm sắp ngừng.** Khách cũ vẫn trả nợ / tất toán qua app Cake.

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng toàn bộ sản phẩm lending. Xác nhận bởi PO 2026-10-01.

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
