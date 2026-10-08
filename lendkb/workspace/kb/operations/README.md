---
title: Vận hành — quy trình, mã lỗi và case mẫu
audience:
  - ops
  - po
last_verified: 2026-10-04T00:00:00.000Z
owner: dung.pham2
status: draft
---
# Nhóm 2 — Vận hành

> **Trả lời ticket cho Ops:** 1–2 câu — việc cần làm tiếp và ai làm. Không nêu tên file, đường dẫn hay mục của KB, không dẫn nguồn, không giải thích lý do, không ghi mã bước (3B.1…). Mẫu: [[kb/operations/quy-trinh-xu-ly]] mục *Cách phản hồi ticket SVK*.

## Đọc theo thứ tự nào

Gặp một ticket chưa biết xử lý sao:

1. **[[kb/operations/quy-trinh-xu-ly]]** — quy trình chung, bắt đầu từ đây
2. **[[kb/operations/luong-giai-ngan]]** — hiểu trạng thái khoản vay đang ở đâu trong luồng
3. **[[kb/operations/ma-loi-api]]** — khách/đối tác đưa mã lỗi thì tra thẳng ở đây
4. **`case-*.md`** — xem đã có case y hệt chưa, đỡ điều tra lại từ đầu

Tìm ticket cùng đợt lỗi: lọc SVK theo triệu chứng trong 1–2 tuần gần nhất trên Jira —
nhiều ticket cùng triệu chứng thường là một đợt lỗi hệ thống, báo Product thay vì xử lý lẻ.

## Danh mục

| File | Nội dung | Khi nào mở |
| --- | --- | --- |
| [[kb/operations/quy-trinh-xu-ly]] | Quy trình xử lý ticket vận hành · **cách phản hồi ticket SVK** | Mặc định, mọi ticket · trước khi comment cho Ops |
| [[kb/operations/luong-giai-ngan]] | Luồng giải ngân & vòng đời trạng thái khoản vay | Khoản vay kẹt, không rõ đang ở bước nào |
| [[kb/operations/quy-trinh-sau-vay]] | Thanh toán, quét nợ, tất toán | Khách hỏi về trả nợ |
| [[kb/operations/luong-van]] | Thanh toán nợ qua VAN — dùng chung mọi sản phẩm | Khách quét mã VAN, tiền không gạch nợ |
| [[kb/operations/ma-loi-api]] | Mã lỗi API & cách xử lý | Có mã lỗi cụ thể trong tay |
| [[kb/operations/case-ket-user-sign]] | Case mẫu — kẹt `USER_SIGN` sau khi đã giải ngân | Trạng thái LMS `USER_SIGN` mà tiền đã đi |
| [[kb/operations/case-doi-so-dien-thoai]] | Case mẫu — KH đổi sđt khi đang có ví/khoản vay | Khách hỏi đổi số điện thoại |

## Hai chỗ khác cũng chứa kinh nghiệm vận hành

- **Mục *Ghi chú vận hành — Ops* của từng file sản phẩm** (`kb/products/.../<product_id>.md`)
  — đặc thù của riêng sản phẩm đó. Ops viết thẳng vào đó, đừng dồn hết về đây.
- **[[kb/reject-messages]]** — khách đọc lại nguyên văn thông báo lỗi thì tra đây trước.

## Viết case mẫu mới

Một case đáng ghi khi **câu trả lời không suy ra được từ các file quy trình** — tức
là phải hỏi PO hoặc phải tra nhiều nguồn mới ra. Khung đang dùng:

```
Trả lời ngắn (1-2 câu, đặt ngay đầu)
→ Vì sao (cơ chế, có dẫn nguồn)
→ Các bước hướng dẫn KH
→ Hỏi KH mấy câu trước khi tư vấn
→ Trường hợp KH đã lỡ làm sai
→ Điểm chưa xác nhận  ← bắt buộc có nếu còn chỗ chưa chắc
→ Ticket liên quan
```

Mục **Điểm chưa xác nhận** quan trọng nhất: nó ngăn người đọc sau tưởng cả file
đều đã được xác minh. Chỗ nào chỉ là suy luận thì ghi rõ là suy luận.
