---
title: Câu hỏi thường gặp — Paylater
product: paylater
topic: faq
audience: [ops, po]
sources:
  - confluence:263782609
  - confluence:190611564
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
coverage: partial
---

# Câu hỏi thường gặp — Paylater

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

> **Chưa đối chiếu case CSKH thật.** Suy từ tài liệu sản phẩm.

## 1. Câu hỏi chung

**Q: Tôi được cấp hạn mức 5 triệu nghĩa là đã nhận 5 triệu?**
A: Không. Hạn mức là mức tối đa được chi tiêu. Chỉ phần đã dùng mới thành dư nợ.

**Q: Trả tối thiểu là đã trả xong chưa?**
A: Chưa. Trả tối thiểu giữ cho khoản nợ không bị quá hạn, nhưng phần còn lại
vẫn sinh lãi và phí. Muốn hết nợ phải trả toàn bộ dư nợ sao kê.

**Q: Tôi đã trả hết, sao vẫn bị thu phí?**
A: Một số sản phẩm thu phí quản lý hạn mức theo tháng nếu khách có chi tiêu trong
30 ngày trước ngày sao kê, kể cả khi dư nợ đã về 0.

**Q: Lãi tính từ lúc nào?**
A: Từ ngày ghi nhận giao dịch thành công, không phải từ ngày sao kê.

**Q: Hợp đồng ghi 60 tháng, tôi phải trả nợ trong 60 tháng?**
A: Không. 60 tháng là thời hạn hiệu lực của hạn mức, không phải kỳ hạn khoản nợ.

**Q: Tôi rút tiền mặt được không?**
A: Tuỳ sản phẩm. Nếu được, mỗi lần từ 150.000đ đến 5 triệu, tổng không quá
100 triệu một tháng.

**Q: Trả hết sớm có mất phí không?**
A: `VNP_paylater` không mất phí. Sản phẩm khác chưa xác nhận — **escalate**.

## 2. Còn thiếu

- [ ] Câu hỏi thật từ dữ liệu CSKH
- [ ] FAQ riêng theo từng đối tác

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- Ba hiểu nhầm lặp đi lặp lại: hạn mức ≠ tiền đã nhận · trả tối thiểu ≠ trả hết · 60 tháng ≠ kỳ hạn nợ.
- Giải thích trước ba điều này khi khách mới mở hạn mức sẽ giảm khiếu nại về sau.


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Ba hiểu nhầm trên đều bắt nguồn từ cách hiển thị trên app và hợp đồng. Đáng xem lại wording ở màn ký hợp đồng.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách` — toàn bộ mục 1 nói được với khách.

**Không đọc cho khách:** con số của sản phẩm khác; mã nhóm; lý do từ chối.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
