---
title: Đăng ký vay — Payday
product: payday
topic: onboarding
audience: [ops, po]
sources:
  - confluence:1042743307
  - confluence:637534211
  - jira:PL-12708
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Đăng ký vay — Payday

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Luồng chung

Payday đi theo đúng luồng onboarding chung của nền tảng. Chi tiết từng màn hình:
`channels/cake-app.md` (app Cake) hoặc `channels/dop.md` (webview đối tác).

Điểm riêng của Payday:

- Khách chọn **số tiền** và **số ngày vay** (không phải số tháng).
- App hiển thị **tổng tiền lãi tạm tính** ngay khi khách chọn, công thức
  `lãi suất ÷ 365 × số ngày vay × số tiền giải ngân`.
- Bảng "Xem chi tiết" hiện tổng tiền vay, phí bảo hiểm, tổng thanh toán tạm tính.
- Màn xác nhận ghi rõ **phương thức trả nợ: trả gốc và lãi vào cuối kỳ**.

## 2. Khác biệt theo đối tác

| Đối tác | Số tiền | Kỳ hạn | Bảo hiểm |
|---|---|---|---|
| `CAKE_payday` | lần 1: 2–3tr · lần 2+: 3–6tr | — | tự chọn |
| `BE_payday` | lần 1: 2–4tr · lần 2+: 2–6tr | 30 / 30–45 ngày | **bắt buộc** |
| `ZLP_payday` | 2–6tr | 30 / 30–45 ngày | **bắt buộc** |
| `PD_Viettel` | 3–5tr (SIM Viettel) · 3–7tr (ngoại mạng) | 30 / 30–45 ngày | tự chọn |
| `VNP_payday` | lần 1: 4tr · lần 2+: 4–6tr | — | tự chọn |
| `MWG_payday` | 2–6tr | — | tự chọn |
| `VT_Payday_S` | 2–30tr (NV Viettel) · 2–10tr (khác) | 30 ngày | **lãi 0%** |

**Khách vay lần đầu thường không được chọn** số tiền và kỳ hạn — hệ thống cố định.

## 3. Điều kiện

- Tuổi: 20–50 (riêng `BE_payday` **18–50**).
- Thu nhập: 5 triệu/tháng (riêng `ZLP_payday` **4 triệu**).

## 4. Còn thiếu

- [ ] Thời gian thẩm định, quy tắc đăng ký lại sau từ chối theo từng đối tác
- [ ] Thông số `MWG_payday`, `VNP_payday` đầy đủ

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- Khách vay lần đầu **không chọn được** số tiền/kỳ hạn ở hầu hết sản phẩm. Khách hỏi "sao không kéo được thanh chọn tiền" → đây là lý do, không phải lỗi app.
- `BE_payday` và `ZLP_payday` **bảo hiểm bắt buộc**, không bỏ tick được. Khách báo "không bỏ được bảo hiểm" là đúng thiết kế.
- `VT_Payday_S` lãi 0% nhưng hạn mức phụ thuộc thu nhập trung bình của khách — luôn tra hệ thống.


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Payday là nhóm có nhiều ràng buộc "lần 1 / lần 2+" nhất. Mỗi đối tác một bậc khác nhau, chưa thống nhất.
- Bảo hiểm bắt buộc ở 2/7 sản phẩm — ảnh hưởng trực tiếp tới tỷ lệ bỏ giữa chừng, đáng theo dõi.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được: vay ngắn ngày, **trả gốc và lãi một lần vào cuối kỳ**.
- Nói được điều kiện tuổi và thu nhập của đúng sản phẩm khách đang xem.
- Giải thích được vì sao khách vay lần đầu không chọn được số tiền.

**Không đọc cho khách:**

- Hạn mức của sản phẩm khác, hoặc bậc "lần 2+" khi khách đang ở lần 1.
- Tiêu chí chấm điểm, lý do từ chối.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
