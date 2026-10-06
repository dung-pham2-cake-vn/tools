---
title: Câu hỏi thường gặp — Overdraft
product: od
topic: faq
audience: [ops, po]
sources:
  - confluence:1833697315
  - confluence:1032019
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
coverage: partial
---

# Câu hỏi thường gặp — Overdraft

> **Chưa đối chiếu case CSKH thật.**

## 1. Câu hỏi chung

**Q: Thấu chi là gì?**
A: Khách được tiêu vượt số dư trong một hạn mức. Lãi chỉ tính trên phần thực sự đã
dùng, theo ngày. Không dùng thì không mất lãi.

**Q: Hạn mức của tôi bao nhiêu?**
A: Tính theo số dư sổ tiết kiệm đã liên kết, trong khoảng 10 – 100 triệu.
Mức cụ thể tra hệ thống.

**Q: Tôi liên kết được mấy sổ?**
A: Tối đa 5 sổ, mỗi sổ số dư từ 10 triệu.

**Q: Mở hạn mức có mất phí không?**
A: Có, phí thiết lập hạn mức 100.000đ.

**Q: Dư nợ đang 0 mà app vẫn báo "đang áp dụng lãi suất", tôi có bị tính lãi không?**
A: Không. Đó là dòng thông tin về mức lãi sẽ áp dụng khi khách dùng hạn mức.

**Q: Sao sổ tiết kiệm của tôi bị tất toán?**
A: Khi khoản thấu chi quá hạn, hệ thống thu nợ tự động từ sổ đã liên kết theo
hợp đồng đã ký. → *Khách khiếu nại: escalate.*

**Q: Tôi thao tác ban đêm không được?**
A: Sản phẩm hoạt động trong khung 06:30 – 23:30.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Hai câu hay gặp nhất: "dư nợ 0 sao báo lãi suất" và "sao sổ bị tất toán".
- Câu thứ hai luôn kèm bức xúc — chuẩn bị sẵn cách nói và escalate sớm.

## Dành cho CSKH

🟢 `khách` — toàn bộ mục 1 nói được với khách.

**Không đọc cho khách:** ngưỡng DPD, tên loại sổ, lý do khoá.
