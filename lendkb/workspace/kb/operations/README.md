---
title: Vận hành — ticket đã xử lý và hướng xử lý
audience: [ops, po]
last_verified: 2026-10-01
owner: dung.pham2
status: draft
coverage: none
---

# Nhóm 2 — Vận hành

> **Chưa có dữ liệu.** Phạm vi export hiện tại chỉ có Jira project `PL` (sản phẩm),
> không có project ticket vận hành / CSKH.

## Cần gì để lấp

Một Jira project chứa ticket vận hành thật. Cần:

- **Project key** — plan gốc nhắc `SVK` nhưng đã bỏ từ đầu
- **Issuetype** — ticket vận hành thường là `Task` / `Support` / `Bug`, khác `Initiative/Epic/Story` của `PL`

Có hai thứ đó thì sửa `tools/export.mjs` kéo về, rồi gom nhóm theo
(sản phẩm × triệu chứng × nguyên nhân gốc).

## Sẽ chứa gì

| File | Nội dung |
|---|---|
| `<sản phẩm>-<chủ đề>.md` | Triệu chứng khách mô tả → nguyên nhân → cách xử lý → câu trả lời mẫu → khi nào escalate |
| `common-errors.md` | Lỗi hay gặp xuyên sản phẩm |
| `escalation.md` | Đường escalate theo loại vấn đề |

## Trong lúc chờ

Kinh nghiệm vận hành đang nằm ở **mục 4 của từng file sản phẩm**
(`kb/products/.../<product_id>.md`). Ops viết thẳng vào đó.
Khi có dữ liệu ticket thật thì gom lại đây và liên kết hai chiều.
