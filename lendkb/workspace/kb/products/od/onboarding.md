---
title: Mở hạn mức thấu chi — Overdraft
product: od
topic: onboarding
audience: [ops, po]
sources:
  - confluence:1833697315
  - jira:PL-12807
  - confluence:1042743307
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Mở hạn mức thấu chi — Overdraft

## 1. Đặc thù

Khác mọi sản phẩm khác: hạn mức dựa trên **sổ tiết kiệm của khách tại Cake**,
không dựa trên chấm điểm thu nhập.

- Khách chọn **tối đa 5 sổ** tiết kiệm để liên kết (bản v1 chỉ 1 sổ).
- Mỗi sổ phải có số dư tối thiểu **10 triệu**.
- Hạn mức = **90%** số dư (sổ loại TD0002) hoặc **75%** (loại TD0003).
- Hạn mức cuối cùng nằm trong khoảng **10 – 100 triệu**.
- Kỳ hạn khách chọn **1 – 12 tháng**, mặc định 12.
- **Phí thiết lập hạn mức 100.000đ.**

Onboarding chạy trên **DOP webview**; quản lý, trả nợ, tất toán chạy trên **app Cake**.

Điểm vào: popup từ màn hình "Rút tiền trước hạn" của sổ tiết kiệm — khách định tất toán
sổ sẽ được gợi ý thấu chi thay thế.

## 2. Điều kiện

- Thu nhập tối thiểu **5 triệu/tháng** (nâng từ 3 triệu).
- Có sổ tiết kiệm tại Cake đạt điều kiện số dư.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Điểm vào là popup khi khách định **rút sổ tiết kiệm trước hạn**. Khách gọi hỏi "tự nhiên hiện cái gì" là từ đây.
- Sổ đã liên kết sẽ bị phong toả phần tương ứng — khách không rút được phần đó. Giải thích trước để tránh khiếu nại.
- Khung giờ 06:30–23:30, ngoài giờ không thao tác được.

## Dành cho CSKH

🟢 `khách`

- Giải thích được hạn mức tính theo số dư sổ tiết kiệm.
- Nói được yêu cầu số dư tối thiểu 10 triệu, tối đa 5 sổ, phí thiết lập 100.000đ.
- Nói được khung giờ hoạt động.

**Không đọc cho khách:** tên loại sổ nội bộ (TD0002/TD0003), tỷ lệ 90%/75%, lãi suất cụ thể (tra hệ thống).
