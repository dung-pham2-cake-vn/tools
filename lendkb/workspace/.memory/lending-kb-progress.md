---
name: lending-kb-progress
description: Tiến độ và phạm vi nguồn của dự án KB Lending cho AI agent CSKH (PLAN.md) — đang ở giai đoạn nào, chờ gì
metadata:
  type: project
---

Dự án xây KB Lending (PLAN.md trong workspace). 2026-09-29: xong bản nháp Giai đoạn 1 — `kb/_meta/product-matrix.md`, `kb/_meta/source-index.md`.

Phạm vi nguồn người dùng chốt ngày 2026-09-29:
- Confluence: chỉ space PL (Tech: Lending). Bỏ BEF.
- Jira: chỉ project PL, issue type Initiative / Epic / Story, created >= 2024-06-01, bỏ status "Will Not Do". Bỏ hẳn SVK (người dùng xác nhận, chấp nhận KB không có known-issues từ case thực tế).
- Script export: `tools/export.mjs` (viết 2026-09-29). Người dùng tự chạy, thử `--limit=5` trước rồi mới chạy full. 2026-09-30: lần chạy thử đầu tiên ổn; đã sửa lỗi lệch cột với ô gộp và bảng đánh số, lọc comment bot. Chờ chạy thử lại trước khi chạy full.
- Cách làm: kéo hết dữ liệu về `raw/` một lần rồi mới phân loại, không kéo lại cho từng sản phẩm.

Tool `confluence_page` của bot cắt bớt nội dung page dài ("…(đã cắt bớt)") và search chỉ trả tối đa 50 kết quả mỗi lần, nên chỉ dùng được để khảo sát, không dùng để kéo hết dữ liệu.

**Vì sao:** Người dùng muốn một lần export đầy đủ để phân loại offline.
**Áp dụng:** Đề xuất script export chạy REST API (người dùng tự chạy, bot không có shell). Trước khi sang Giai đoạn 2, nhắc các quyết định còn chờ: pilot, SME.
