---
title: Quản lý thấu chi — Overdraft
product: od
topic: loan-management
audience: [ops, po]
sources:
  - confluence:1032019
  - jira:PL-13138
  - jira:PL-13257
  - confluence:1833697315
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Quản lý thấu chi — Overdraft

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Cách tính

Thấu chi là **hạn mức quay vòng**, không phải vay từng lần.
Lãi tính **theo ngày trên phần dư nợ thực tế đã dùng**. Không dùng thì không có lãi.

Trên app, khi dư nợ bằng 0 vẫn hiện dòng *"Đang áp dụng lãi suất x,x%/năm.
Lãi được tính theo ngày"* — không có nghĩa là khách đang bị tính lãi.

## 2. Bậc khoá theo số ngày quá hạn

| Số ngày quá hạn | Trạng thái | Khách phải trả |
|---|---|---|
| 1 – 5 ngày | Vẫn hoạt động | Lãi + phạt |
| 6 – 30 ngày | Khoá tạm thời | Lãi + phạt |
| Từ 31 ngày | **Khoá vĩnh viễn** | **Toàn bộ dư nợ gốc** + lãi + phạt |

Bản v2 thêm: **DPD+4 tự động gỡ liên kết sổ tiết kiệm và tất toán sổ** để thu nợ,
thứ tự từ sổ nhỏ đến sổ lớn.

## 3. Trả nợ

Hai đường: từ tài khoản thanh toán, hoặc tất toán sổ tiết kiệm đã liên kết.
Luồng thao tác chung xem `channels/cake-app.md`.

## 4. Còn thiếu

- [ ] Phí tất toán hạn mức trước hạn
- [ ] Cơ chế giải phóng sổ sau khi trả hết

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Mốc 31 ngày** là bước ngoặt: khách chuyển từ trả lãi+phạt sang phải trả **toàn bộ gốc**. Cảnh báo trước khi tới mốc.
- **DPD+4 tự tất toán sổ**: khách sẽ gọi hỏi "sao sổ tiết kiệm của tôi bị tất toán". Đây là cơ chế thu nợ tự động theo hợp đồng.
- Dòng "đang áp dụng lãi suất" hiện cả khi dư nợ 0 — khách tưởng bị tính lãi oan.
- Khoá có thể do nghi ngờ gian lận, không chỉ do quá hạn. **Không suy đoán lý do, escalate.**


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Cơ chế tự tất toán sổ ở DPD+4 rất sớm so với bậc khoá (6 ngày). Cần xem lại trải nghiệm: khách mất sổ tiết kiệm trước cả khi bị khoá hạn mức.
- Wording "đang áp dụng lãi suất" khi dư nợ 0 gây hiểu nhầm, đáng sửa.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được lãi chỉ tính trên phần đã dùng, theo ngày.
- Giải thích được dòng thông báo lãi suất khi dư nợ 0 không có nghĩa đang bị tính lãi.
- Giải thích được hai cách trả nợ.

**Không đọc cho khách:**

- Tên trạng thái hệ thống, ngưỡng DPD cụ thể, cơ chế tự tất toán sổ.
- Lý do khoá hạn mức.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
