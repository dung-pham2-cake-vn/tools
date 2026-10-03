---
name: confluence-product-page-pattern
description: Mỗi sản phẩm Lending trên Confluence (space PL) có bộ page riêng theo tên "[Partner][X] - Sản phẩm - Disbursement / Product Policy"
metadata:
  type: reference
---

Space Tech: Lending (PL) đặt tên page theo mẫu `[Partner][<Đối tác>] - <Sản phẩm> - <Chủ đề>`, ví dụ:
- `[Partner][VNPAY] - Payday - Disbursement` (id 766574638)
- `[Partner][VNPAY] - Payday - Product Policy` (id 610992373)
- Sản phẩm của Cake: `[CAKE] - Payday - Disbursement` (id 641073471)

Tìm bằng CQL: `title ~ "disbursement" AND title ~ "<đối tác>"`.
Page Disbursement cũ có thể ghi "chuyển sang CORE ICE, xem doc ICE" — nghĩa là spec Mambu trong page có thể đã lỗi thời.

**Áp dụng:** khi KB thiếu luồng giải ngân / policy của một sản phẩm, tra page theo mẫu tên này trước khi kết luận là "không có tài liệu".
