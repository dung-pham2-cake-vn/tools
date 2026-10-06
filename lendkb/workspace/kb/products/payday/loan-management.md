---
title: Quản lý khoản vay — Payday
product: payday
topic: loan-management
audience: [ops, po]
sources:
  - confluence:1042743307
  - jira:PL-13050
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Quản lý khoản vay — Payday

## 1. Khác Cashloan ở chỗ nào

| | Cashloan | **Payday** |
|---|---|---|
| Lịch trả | Hàng tháng, nhiều kỳ | **Một lần, cuối kỳ** |
| Thẻ trên app | `Kỳ {n}/{tổng}: {tiền}` | **`Số tiền {tiền}`** |
| Màn chi tiết | Kỳ thanh toán dạng `xx/yy` | **Kỳ thanh toán = {số} ngày** |

**Không áp công thức trả góp của Cashloan sang Payday.**

## 2. Cách tính

- Lãi = `lãi suất ÷ 365 × số ngày vay × số tiền giải ngân`
- Số tiền giải ngân = số tiền duyệt + phí bảo hiểm (nếu có)
- Phạt gốc chậm (đa số) = `150% × lãi suất trong hạn × dư nợ gốc quá hạn × số ngày chậm ÷ 365`

Ngoại lệ đáng nhớ: `VT_Payday_S` **phạt 0%**, `BE_payday` và `FIZA_payday` **không có phạt lãi chậm**.

## 3. Tất toán trước hạn

| Sản phẩm | Phí |
|---|---|
| `BE_payday` | **0%** |
| `FIZA_payday` | **Chưa áp dụng** |
| Còn lại | Chưa có số — **escalate** |

## 4. Thanh toán

Luồng thao tác giống mọi sản phẩm khác — xem [[kb/channels/cake-app]].

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Payday kỳ hạn ngắn (30–45 ngày) nên khách quá hạn rất nhanh. Nhắc hạn trả là việc hay gặp nhất.
- `VT_Payday_S` không có phạt trả chậm — đừng báo nhầm số phạt cho khách nhóm này.
- Số tiền khách nhận về **nhỏ hơn** số ghi nợ đúng bằng phí bảo hiểm. Đây là nguồn khiếu nại thường xuyên.

## Dành cho CSKH

🟢 `khách`

- Giải thích được trả một lần cuối kỳ, không trả góp.
- Giải thích được chênh lệch giữa tiền nhận về và tiền ghi nợ là phí bảo hiểm.
- Hướng dẫn thanh toán trên app.

**Không đọc cho khách:**

- Công thức phạt, trạng thái hệ thống, ngưỡng DPD.
- Phí tất toán khi chưa tra được của đúng sản phẩm — **escalate**.
