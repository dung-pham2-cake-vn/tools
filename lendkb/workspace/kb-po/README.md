---
title: KB dành riêng PO
audience: [po]
last_verified: 2026-10-06
owner: dung.pham2
status: draft
---

# `kb-po/` — chỉ PO đọc

Ops không dùng phần này. Ranh giới: **`kb/` chỉ chứa kiến thức sản phẩm và
vận hành cho Ops/CSKH** — thứ cần để trả lời khách và xử lý ticket. Cách lấy dữ liệu,
số kinh doanh, bảo trì wiki và mọi việc của PO ở đây. Chi tiết: [[kb-po/SCHEMA]] mục *Ranh giới*.

| Thư mục | Nội dung | Vì sao không để ở `kb/` |
|---|---|---|
| `core/` | Cấu hình core banking (ICE / Mambu), GL, bút toán, hạch toán | Ops không có quyền truy cập, không thao tác được |
| `business/` | Số liệu kinh doanh, hiệu quả sản phẩm, tool nội bộ | Nhạy cảm, và không giúp trả lời khách |
| `workflow/` | Cách PO làm việc: soạn ticket Jira, quy tắc đặt tên sản phẩm để rà tài liệu | Là quy trình của PO, không phải của Ops |
| `ra-soat/` | Việc rà soát nguồn: điểm chờ xác nhận, Confluence cần sửa, soát số tài chính, lịch sử phí | Là công việc bảo trì KB, Ops đọc vào chỉ thêm nhiễu |
| `nguon/` | Bản đồ tài liệu gốc, mục lục 420 trang Confluence | Dùng khi đào sâu nguồn — việc của PO |
| `san-pham/` | Ghi chú PO theo sản phẩm: vì sao chính sách đặt vậy, backlog, ý tưởng cải thiện | Là góc nhìn PO, không giúp xử lý ticket |
| `bao-tri/` | Bảo trì wiki: format, log, lịch sử quyết định, độ phủ | Việc của người sửa KB |
| `SCHEMA` | Quy trình ingest/query/lint, quy ước trang, ranh giới hai vùng | Đọc trước khi sửa KB |

## Mục lục

| Trang | Nội dung |
|---|---|
| [[kb-po/index]] | Catalog tự sinh mọi trang `kb-po/` |
| [[kb-po/SCHEMA]] | Schema — cách bảo trì wiki, **đọc trước khi sửa** |
| [[kb-po/bao-tri/log]] | Nhật ký wiki |
| [[kb-po/bao-tri/lich-su-quyet-dinh]] | Vì sao từng con số đổi |
| [[kb-po/san-pham/ghi-chu-po]] | Ghi chú PO theo sản phẩm (mục 5 cũ) |
| [[kb-po/ra-soat/con-thieu]] | Checklist còn thiếu theo trang |
| [[kb-po/ra-soat/doi-chieu-jira]] | Kết quả đối chiếu Confluence ↔ Jira theo trang |
| [[kb-po/ra-soat/product-matrix-ra-soat]] | Ma trận sản phẩm — nguồn, quyết định, điểm treo |
| [[kb-po/business/du-no-ngung-ban]] | Dư nợ sản phẩm ngừng bán |
| [[kb-po/core/_index]] | Index 766 tài liệu core & GL |
| [[kb-po/core/dashboard-tool]] | Dashboard, query, tool nội bộ |
| [[kb-po/business/README]] | Số liệu kinh doanh |
| [[kb-po/workflow/xu-ly-ticket-svk]] | Quy trình xử lý một ticket SVK — kéo ticket, đọc ảnh, kết luận duyệt, soạn trả lời Ops. Dùng cho mọi agent |
| [[kb-po/workflow/quy-tac-viet-ticket]] | Style viết ticket Jira, rút từ 2.355 ticket PL |
| [[kb-po/workflow/quy-tac-dat-ten]] | Quy tắc đặt tên sản phẩm — dùng để rà ticket không bị sót |
| [[kb-po/ra-soat/can-confirm]] | Điểm chờ PO xác nhận |
| [[kb-po/ra-soat/open-questions]] | Câu hỏi chờ quyết |
| [[kb-po/ra-soat/confluence-can-cap-nhat]] | Trang Confluence đang sai so với Jira |
| [[kb-po/ra-soat/soat-so-tai-chinh]] | Bảng soát số tài chính toàn KB |
| [[kb-po/ra-soat/gia-tri-chinh-sach]] | Giá trị chính sách trích tự động từ nguồn |
| [[kb-po/ra-soat/lich-su-phi-tat-toan]] | Dòng thời gian phí tất toán — giải thích vì sao các trang lệch nhau |
| [[kb-po/nguon/doc-map]] | Tài liệu nào phục vụ sản phẩm nào |
| [[kb-po/nguon/muc-luc-partnership]] | Mục lục nhánh Partnership products |

## Chia sẻ sang `kb/`

PO thấy phần nào Ops cần thì chuyển sang `kb/`, quyết từng trường hợp.
Chuyển bằng `node tools/kb-move.mjs` (sửa link tự động), rồi đổi `audience`
thành `[ops, po]` và ghi một dòng vào [[kb-po/bao-tri/log]].

`node tools/kb-lint.mjs` chặn trang nằm sai vùng: trang trong `kb-po/` mà
`audience` có `ops`, hoặc trang trong `kb/` mà không có `ops`.

## Cảnh báo

Tách thư mục là **ranh giới quy ước**, không phải phân quyền kỹ thuật.
Cùng một repo thì ai clone cũng đọc được. Muốn chặn thật phải tách repo hoặc
đặt quyền ở nơi lưu trữ.
