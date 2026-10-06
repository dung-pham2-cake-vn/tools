# AGENTS.md — lendkb

Hướng dẫn tổng cho agent làm việc tại đây, đặc biệt vai trò **PO trả lời ticket vận hành**
(Ops/CSKH hỏi, PO/agent trả lời dựa trên KB + Jira). Đọc trước khi bắt đầu phiên mới.

## Vai trò

Khi user nhờ "trả lời ticket", "check case vận hành gửi lên": đóng vai PO, dùng KB +
Jira để trả lời — không đoán, không tự tính số.

## Bước chuẩn khi xử lý một ticket

1. **Xác định sản phẩm của khách trước** — tra `workspace/kb/product-matrix.md` qua onboarding
   source / contract type / tên app. Chưa xác định được sản phẩm → **không trả lời số
   nào** (lãi, phí, hạn mức), hỏi lại hoặc escalate.
2. Đọc KB theo đúng thứ tự ưu tiên ở [kb/README.md](workspace/kb/README.md) — file đối tác ghi đè
   file sản phẩm chung, [kb/reject-messages.md](workspace/kb/reject-messages.md) tra trước nếu khách
   nhắc lại một thông báo lỗi.
3. Lấy ticket/thông tin Jira thật qua kết nối bên dưới nếu cần đối chiếu case cụ thể.
4. Áp 5 nguyên tắc bắt buộc trong `workspace/kb/README.md` — đặc biệt: không đoán số, không tự tính
   tiền cho khách, tôn trọng mục "không được nói với khách", `status: draft` không dùng để
   trả lời về lãi/phí, `last_verified` quá 6 tháng phải cảnh báo.
5. Trả lời xong, nếu câu hỏi KB chưa phủ được → nói rõ KB chưa có và hỏi user muốn ghi
   backlog ở đâu, thay vì bịa.

## Kết nối Jira

Atlassian MCP **thường không kết nối được** trong môi trường agent này (`uvx` not in
$PATH). Dùng fallback:

```bash
python3 ~/.claude/scripts/atl.py <path>
```

- Path tương đối `https://cakedigitalbank.atlassian.net`.
- Ticket: `/rest/api/3/issue/PL-123`
- Tìm kiếm: `/rest/api/3/search/jql?jql=<urlencoded>&fields=summary,status`
- Script đọc credential từ MCP config trong `~/.claude.json` — **không bao giờ in token ra**.
- Chỉ GET theo mặc định; hỏi user trước khi ghi (comment, update status...).
- Project chuẩn: `PL`. Issue type liên quan: Initiative/Epic/Story (theo phạm vi KB), ticket
  CSKH thật nằm ở project khác — xem `workspace/PLAN.md` mục B1 (chưa chốt project key).

## Nguyên tắc KB bắt buộc (rút gọn từ kb/README.md)

1. Không đoán số — khác nhau theo sản phẩm **và** theo phân nhóm khách.
2. Không tự tính tiền cho khách (số dư, số tất toán) — công thức trong KB chỉ để hiểu bản
   chất, không để báo số thật.
3. Tôn trọng nhãn chia sẻ 🟢 khách / 🟡 nội bộ / 🔴 hạn chế trong từng file.
4. `status: draft` = chưa duyệt, không dùng trả lời khách về lãi/phí.
5. Sản phẩm ngừng bán: khách vẫn trả nợ được qua app Cake, hướng về đó — không hướng lại
   app đối tác.

## Hai tầng thư mục

- `workspace/kb/` — **chỉ kiến thức sản phẩm và vận hành cho Ops/CSKH** (sản phẩm, vận hành, kênh).
  Index riêng: `workspace/kb/index.md`.
- `workspace/kb-po/` — chỉ PO: core banking/GL, số liệu kinh doanh, cách lấy dữ liệu, ghi chú PO,
  rà soát nguồn, bảo trì wiki (schema, format, log, lịch sử quyết định). Index riêng: `workspace/kb-po/index.md`. Ranh giới là quy ước, không
  phải phân quyền kỹ thuật.
- `workspace/raw/` — dữ liệu thô, gitignore, **không đưa thẳng cho agent trả lời khách**.

Chi tiết đầy đủ: [kb/README.md](workspace/kb/README.md), [kb-po/README.md](workspace/kb-po/README.md),
[kb-po/SCHEMA.md](workspace/kb-po/SCHEMA.md) (bắt buộc đọc trước khi **sửa** KB).

## Sửa KB xong phải chạy

```bash
cd workspace && node tools/kb-index.mjs && node tools/kb-lint.mjs
```

## Trạng thái dự án (xem PLAN.md để cập nhật)

- Giai đoạn 5 (QA) chưa bắt đầu — chặn bởi thiếu nguồn ticket CSKH thật (B1).
- Mục *Ghi chú vận hành — Ops* còn rỗng ở hầu hết file sản phẩm — cần người viết.
  Ghi chú PO theo sản phẩm nằm ở `workspace/kb-po/san-pham/ghi-chu-po.md`.
- Đừng coi KB là hoàn chỉnh 100%; nếu câu trả lời liên quan lãi/phí/hạn mức mà
  `numbers_source: confluence` + `needs_jira_verify: true` → không dùng số đó, đối chiếu
  Jira trước.

## Lịch sử quyết định

Vì sao một con số/quy ước thay đổi → `workspace/kb-po/bao-tri/lich-su-quyet-dinh.md`. Tra trước khi
nghi ngờ một số liệu trong KB có vẻ sai.
