---
title: KB dành riêng PO
audience: [po]
last_verified: 2026-10-01
owner: dung.pham2
status: draft
---

# `kb-po/` — chỉ PO đọc

Nhóm 3 và 4. Ops không dùng phần này.

| Thư mục | Nội dung |
|---|---|
| `core/` | Cấu hình sản phẩm trên core banking (ICE / Mambu), GL, bút toán, hạch toán |
| `business/` | Số liệu kinh doanh, hiệu quả sản phẩm, tool nội bộ |

## Viết ticket Jira

`../kb/_meta/quy-tac-viet-ticket.md` — style viết ticket PL, rút từ 2.355 ticket
của PO. Dùng khi nhờ AI soạn ticket: công thức title, khung Context/Acceptance
Criteria, quy ước bảng spec API, label/component/fix version.

## Chia sẻ sang `kb/`

PO thấy phần nào Ops cần thì chuyển sang `kb/`, quyết từng trường hợp.
Chuyển thì sửa `audience` thành `[ops, po]` và ghi một dòng vào mục Lịch sử thay đổi.

## Cảnh báo

Tách thư mục là **ranh giới quy ước**, không phải phân quyền kỹ thuật.
Cùng một repo thì ai clone cũng đọc được. Muốn chặn thật phải tách repo hoặc
đặt quyền ở nơi lưu trữ.
