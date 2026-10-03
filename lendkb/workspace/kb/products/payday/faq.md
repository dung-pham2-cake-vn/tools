---
title: Câu hỏi thường gặp — Payday
product: payday
topic: faq
audience: [ops, po]
sources:
  - confluence:1042743307
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
coverage: partial
---

# Câu hỏi thường gặp — Payday

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

> **Chưa đối chiếu case CSKH thật.** Suy từ tài liệu sản phẩm. Cần ráp dữ liệu CSKH.

## 1. Câu hỏi chung

**Q: Tôi trả khi nào?**
A: Một lần duy nhất vào ngày đến hạn, gồm cả gốc và lãi. Không trả góp hàng tháng.

**Q: Vay bao nhiêu ngày?**
A: Thường 30 ngày với khách vay lần đầu; khách vay lại có thể chọn 30 hoặc 45 ngày.
Tuỳ sản phẩm — tra hệ thống.

**Q: Sao tôi nhận ít hơn số tiền vay?**
A: Phí bảo hiểm khoản vay được cộng vào khoản vay, không thu riêng. Số tiền ghi nợ
bằng số tiền vay cộng phí bảo hiểm.

**Q: Tôi bỏ bảo hiểm được không?**
A: Tuỳ sản phẩm. Với `BE_payday` và `ZLP_payday` là **bắt buộc**, không bỏ được.
Các sản phẩm khác khách tự chọn.

**Q: Trả sớm có mất phí không?**
A: `BE_payday` **không mất phí**. Các sản phẩm khác chưa xác nhận — **escalate**.

**Q: Trả chậm bị gì?**
A: Phát sinh phạt trên phần gốc chậm trả, trừ `VT_Payday_S` không có phạt.
Số tiền cụ thể tra hệ thống.

## 2. Còn thiếu

- [ ] Câu hỏi thật từ dữ liệu CSKH
- [ ] FAQ riêng theo từng đối tác

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- Ba câu hay gặp nhất: hạn trả khi nào · sao nhận ít hơn số vay · bỏ bảo hiểm được không.
- Kỳ hạn ngắn nên khách hay quên hạn. Chủ động nhắc ngày đến hạn khi khách gọi vì việc khác.


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- FAQ này chưa dựa trên dữ liệu thật. Khi có nguồn ticket CSKH, nên đo lại tần suất thực tế thay vì suy đoán.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách` — toàn bộ mục 1 nói được với khách.

**Không đọc cho khách:** con số của sản phẩm khác; lý do từ chối; công thức nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
