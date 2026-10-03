---
title: Ai đọc gì
audience: [ops, po]
last_verified: 2026-10-01
owner: dung.pham2
status: draft
---

# Hai tầng KB

| Thư mục | Ai đọc | Nội dung |
|---|---|---|
| **`kb/`** | **Ops + PO** | Nhóm 1 — thông tin sản phẩm · Nhóm 2 — ticket đã vận hành, hướng xử lý |
| **`kb-po/`** | **chỉ PO** | Nhóm 3 — core banking, GL, hạch toán · Nhóm 4 — kinh doanh, tool dev |

CSKH gộp vào Ops: mục 7 trong file sản phẩm và `reject-messages.md` thuộc phạm vi Ops.

## `kb/` — dùng chung

```
products/     thông tin sản phẩm: nhận diện, thông số, luồng, FAQ
operations/   ticket đã vận hành, hướng xử lý, case hay gặp
channels/     đặc thù từng kênh (app Cake, DOP, Native API)
glossary.md · reject-messages.md
_meta/        ma trận sản phẩm, bản đồ tài liệu, format, câu hỏi treo
```

## `kb-po/` — chỉ PO

```
core/         cấu hình sản phẩm trên core banking (ICE/Mambu), GL, bút toán
business/     số liệu kinh doanh, hiệu quả sản phẩm, tool nội bộ
```

PO muốn chia sẻ phần nào sang `kb/` thì chuyển file hoặc trích sang — quyết từng trường hợp.

## Phân quyền

Nhãn trong Markdown **không chặn được ai**. Tách thư mục là bước một; muốn chặn thật phải
tách repo hoặc đặt quyền ở nơi lưu trữ. Hiện `kb-po/` chỉ là ranh giới quy ước.

## Mức chia sẻ trong từng file

| Nhãn | Nghĩa |
|---|---|
| 🟢 `khách` | Nói trực tiếp với khách được |
| 🟡 `nội bộ` | Ops và PO dùng, không đọc cho khách |
| 🔴 `hạn chế` | Chỉ PO |
