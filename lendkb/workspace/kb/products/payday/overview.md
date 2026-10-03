---
title: Tổng quan — Payday
product: payday
topic: overview
sources:
  - confluence:27918827
  - confluence:1042743307
last_verified: 2026-09-30
owner: dung.pham2
audience: [ops, po]
status: draft
coverage: partial
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Payday là khoản vay ngắn ngày, số tiền nhỏ, **trả gốc và lãi một lần vào cuối kỳ**
— khác Cashloan trả góp hàng tháng.

> **File khung.** Mới có phần chung đủ để đỡ các file đối tác. Phần chính sách của
> `CAKE_payday` chưa viết.

## Đặc điểm chung

- Kỳ hạn tính bằng **ngày** (thường 30–45), không phải tháng.
- **Trả một lần vào cuối kỳ**, không có lịch trả góp hàng tháng.
- Lãi tính theo ngày: `lãi suất ÷ 365 × số ngày vay × số tiền giải ngân`.
- Có tuỳ chọn bảo hiểm khoản vay, phí cộng vào số tiền vay.

## Trên app Cake

Thẻ khoản vay hiển thị `Số tiền {số tiền}` (Cashloan hiển thị theo kỳ).
Màn Chi tiết khoản vay hiển thị **Kỳ thanh toán = {số} ngày**.
Luồng thanh toán và tất toán giống mọi sản phẩm khác — xem `channels/cake-app.md`.

## Sản phẩm Payday hiện có

| Đối tác | ProductId | Kênh |
|---|---|---|
| Cake | `CAKE_payday` | app Cake |
| VDS (Viettel) | `PD_Viettel` | dop |
| VDS payroll | `VT_Payday_S` | api |
| VNPAY | `VNP_payday` | dop |
| BeGroup | `BE_payday` | dop |
| MWG | `MWG_payday` | dop |
| ZaloPay | `ZLP_payday` | api |
| FIZA | `FIZA_payday` | *(chưa có trong bảng chuẩn — xem file đối tác)* |

## Chưa viết

- Chính sách `CAKE_payday` (hạn mức, lãi suất, phí).
- `onboarding.md`, `loan-management.md`, `faq.md` cho Payday.
- Các file đối tác ngoài FIZA.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- **Không áp công thức của Cashloan sang Payday.** Payday không có lịch trả góp, cách tính lãi khác.
- Điều kiện và biểu phí khác nhau nhiều giữa các đối tác — xác định đúng sản phẩm trước khi trả lời con số.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ` · *Chưa có nội dung. PO bổ sung.*

Gợi ý: vì sao chính sách đặt như vậy · lịch sử thay đổi và lý do ·
ràng buộc hệ thống · backlog đang làm dở.

## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở mục 1–3.

**Không đọc cho khách:**

- Phân nhóm khách, product code.
- Tiêu chí chấm điểm, lý do từ chối.
- Tên hệ thống nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
