---
title: Log — nhật ký wiki
audience: [po, ai]
last_verified: 2026-10-05
owner: dung.pham2
status: generated
---

# Log

Nhật ký chỉ-ghi-thêm của wiki, theo pattern LLM Wiki (xem [[kb-po/SCHEMA]]).
**Mục mới thêm lên đầu.**

Tiền tố cố định `## [YYYY-MM-DD] <loại> | <tiêu đề>` nên grep được:

```bash
grep "^## \[" kb-po/bao-tri/log.md | head -10      # 10 việc gần nhất
grep "^## \[" kb-po/bao-tri/log.md | grep ingest   # chỉ các lượt nạp nguồn
```

Loại: `ingest` (nạp nguồn mới) · `query` (câu trả lời được file lại) ·
`lint` (soát sức khoẻ) · `refactor` (đổi cấu trúc).

> Phần trước 2026-10-05 dựng lại từ lịch sử git đã bị xoá khi gộp repo và từ
> `[[kb-po/bao-tri/lich-su-quyet-dinh]]`, nên thưa và không đủ chi tiết. Từ đây trở đi ghi ngay khi làm.

---

## [2026-10-06] query | Trả nợ trên app đối tác — tuỳ sản phẩm

PO sửa: kênh DOP/Native **không** mặc định chuyển quản lý khoản vay và trả nợ sang app
Cake — nhiều đối tác có API xem khoản vay và trả nợ ngay trên app của họ. [[kb/channels/dop]]
và [[kb/channels/native-api]] trước ghi "trả nợ chuyển sang app Cake", sai.
Thêm mục 4 ở cả hai trang: ba kiểu API (xem khoản vay · VAN · đối tác thu hộ) và bảng
theo sản phẩm, rút từ spec trong `open_api_viewer/specs/` (Be, MWG paylater, PD_Viettel,
ZLP, VDS). Sản phẩm chưa có spec ghi **chưa rõ**, không suy. Spec ≠ đang live — cần PO
xác nhận khi có case thật.

PO bổ sung cùng ngày: **DVS là nhánh riêng, không thuộc KB này** — bỏ dòng spec "DVS -
Repayment APIs" khỏi [[kb/channels/native-api]]. `MWG_paylater` dùng
`generate-webview/loan-detail` mở webview quản lý khoản vay: xem lịch sử giao dịch, số dư,
chuyển đổi trả góp, trả nợ qua VAN — ghi vào [[kb/channels/dop]] và
[[kb/products/paylater/partners/mwg/mwg_paylater]].

## [2026-10-06] refactor | Bỏ marker AUTO — script kéo, agent đọc

Marker `AUTO:start — script sinh lại phần này, đừng sửa tay` trên 50 trang `kb/` là lời
hứa chưa ai thực hiện: `migrate-format.py` chỉ chèn marker một lần,
`gen-kb-skeleton.mjs` bỏ qua file đã có (phần sinh lại còn là TODO),
`refresh.sh` chỉ báo cáo. Script cũng không nên tự viết số — nguồn tự mâu thuẫn,
cần đọc hiểu. Bỏ marker; ghi chu trình tháng vào [[kb-po/SCHEMA]]: `refresh.sh` kéo +
báo trang cần rà → agent đọc ticket, sửa trang, ghi lý do → PO duyệt diff.
Marker trong `kb/index.md`, `kb-po/index.md` giữ — hai file đó sinh trọn bằng script.

## [2026-10-06] refactor | kb/ chỉ còn kiến thức Ops/CSKH

PO chốt: `kb/` chỉ chứa thông tin sản phẩm và vận hành cho Ops/CSKH. Cách lấy dữ
liệu, số kinh doanh, bảo trì wiki đưa hết sang `kb-po/`. `kb/operations/` giữ nguyên
(kể cả [[kb/operations/svk-backlog]]) để Ops tra khi xử lý ticket.

- Bảo trì wiki → `kb-po/`: `SCHEMA`, `_meta/format`, `log`, `lich-su-quyet-dinh`,
  `source-index` → `kb-po/bao-tri/` (SCHEMA ở `kb-po/SCHEMA`); `jira-fill-plan`,
  `products-without-numbers` → `kb-po/ra-soat/`. `kb/_meta/` không còn.
- Gộp `kb/README-nhom` vào [[kb/README]] (bảng nhãn mức chia sẻ) và [[kb-po/README]], xoá.
- 50 trang sản phẩm + kênh: bỏ mục 5 (ghi chú PO), 6 (số kinh doanh — chỉ là con trỏ),
  8 (lịch sử file — toàn dòng tự sinh), "Còn thiếu". Nội dung có giá trị chép sang
  [[kb-po/san-pham/ghi-chu-po]] (13 trang có mục 5 thật) và [[kb-po/ra-soat/con-thieu]].
  10 dòng "Đối chiếu Jira …" → [[kb-po/ra-soat/doi-chieu-jira]].
- Mục Ops/CSKH bỏ số thứ tự: *Ghi chú vận hành — Ops*, *Dành cho CSKH*.
- [[kb/product-matrix]]: tách *Nguồn & phạm vi*, mục F, G, *Còn thiếu* →
  [[kb-po/ra-soat/product-matrix-ra-soat]]; cột "Dư nợ còn" mục C, D →
  [[kb-po/business/du-no-ngung-ban]]. Bốn trang sản phẩm ngừng bán thay số đếm bằng mô tả.
- **Giữ có chủ đích** trong `kb/`: frontmatter `numbers_source`, `numbers_asof`,
  `needs_jira_verify` — agent trả lời cần để biết số nào chưa dùng được, và
  `tools/refresh.sh` đọc chúng. Cảnh báo "Confluence ghi 3% đã cũ" cũng giữ.
- Tool: `kb-index` sinh hai index riêng (`kb/index`, [[kb-po/index]]) — agent Ops không
  thấy `kb-po/`. `kb-lint` thêm luật 🟡 chặn `kb/` link sang `kb-po/` hoặc có mục kiểu PO;
  sửa đường dẫn can-confirm (trước trỏ `kb/_meta/`, đếm sai thành 0).
  `migrate-format.py` bỏ mục 5/6/8 khỏi template.

## [2026-10-06] refactor | Bỏ Telegram bridge

PO không dùng bot qua Telegram nữa. Gỡ launchd `com.lendkb.tgbot`, xoá
`lendkb/tgbot/` và `workspace/.memory/`.

Trước khi xoá có cứu lại một thứ từ memory của bot: **mẫu đặt tên page Confluence
space PL** (`[Partner][<Đối tác>] - <Sản phẩm> - <Chủ đề>`) — chép sang
[[kb-po/nguon/doc-map]]. Đây là kiến thức tra cứu thật, không phải trạng thái bot;
để nó chết theo bot thì mất. Memory còn lại chỉ là tiến độ dự án tháng 9, đã lỗi thời.

> Nhắc PO: thu hồi bot token trong BotFather. Token nằm trong `tgbot/.env` đã xoá
> cùng thư mục, nhưng nó vẫn còn hiệu lực phía Telegram cho tới khi thu hồi.

## [2026-10-05] refactor | Dọn vùng kb/ — bỏ kiến thức thuộc về PO

`kb/` phải là kiến thức **sản phẩm và vận hành**. Rà lại thì 10 trang không thuộc
loại đó, phần lớn nằm trong `_meta/`. Chuyển bằng `tools/kb-move.mjs` (mới viết,
tự sửa link): workflow của PO → `kb-po/workflow/`, việc rà soát nguồn →
`kb-po/ra-soat/`, bản đồ tài liệu gốc → `kb-po/nguon/`.

- `product-matrix` đi ngược chiều: từ `_meta/` lên `kb/` — Ops tra hằng ngày để
  nhận diện sản phẩm, không phải meta
- Thêm luật lint chặn trang nằm sai vùng, dựa trên `audience`. Ranh giới kiểu này
  rất dễ trôi khi thêm trang mới nên để máy giữ
- Giữ lại **có chủ đích** mã GL `3592170000` trong [[kb/operations/luong-van]]:
  ở đó GL là mốc định tuyến (debit mà không credit → chuyển Liab), là kiến thức
  vận hành chứ không phải hạch toán. Ghi ngoại lệ vào [[kb-po/bao-tri/format]]
- Bắt được bug của chính `linkify`/`lint`: regex chỉ nhận tên file chữ thường nên
  bỏ sót toàn bộ lượt nhắc `README.md`. Sửa xong chuyển thêm **34 wikilink**

## [2026-10-05] refactor | Theo chuẩn LLM Wiki

Đối chiếu wiki với pattern LLM Wiki của Karpathy, bổ sung ba thứ còn thiếu và
liên kết chéo.

- Thêm `[[kb-po/SCHEMA]]` — lớp schema, trước đây không có; mỗi phiên agent phải suy lại cách bảo trì
- Thêm `[[kb/index]]` — catalog 84 trang, sinh bằng `tools/kb-index.mjs`
- Thêm file log này
- Thêm `tools/kb-lint.mjs` — soát liên kết hỏng, trang mồ côi, frontmatter thiếu, trang quá hạn rà
- Thêm `tools/linkify.mjs` — đổi **215 lượt nhắc tên file** thành wikilink `[[...]]`
- Sửa **14 liên kết hỏng** phát hiện khi chuyển: *channels/api.md* và *channels/cake.md* không tồn tại, đúng ra là `[[kb/channels/native-api]]` và `[[kb/channels/cake-app]]`
- Sửa parser frontmatter: trước đó không đọc được danh sách YAML nhiều dòng nên báo nhầm 2 trang thiếu `audience`

## [2026-10-05] ingest | SVK-11763 — kẹt USER_SIGN, ca thứ tư cùng đợt

Ghi vào `[[kb/operations/case-ket-user-sign]]`. Điểm mới: Ops dừng mô tả ở Loan
Drawdown, không xác nhận tiền vào CASA. Balance về ₫0 **không** chứng minh tiền
vào CASA. Giải mã được 14 cột của bản ghi trạng thái từ ảnh.

## [2026-10-04] query | KH đổi số điện thoại khi đang có ví

Câu hỏi của Ops, PO chốt quy trình → file lại thành
`[[kb/operations/case-doi-so-dien-thoai]]`. Viết lại `[[kb/operations/README]]`
thành mục lục (trước đó còn ghi "Chưa có dữ liệu" trong khi đã có 7 file).

## [2026-10-04] ingest | Style viết ticket Jira

Phân tích 2.355 ticket PL của PO → `[[kb-po/workflow/quy-tac-viet-ticket]]`.
Sau đó bổ sung 9 ticket thật làm ví dụ vì bản đầu quá ít thông tin.

## [2026-10-03] lint | Đối chiếu Confluence với bản live

Kéo bản live 12 trang Product Policy, phát hiện lỗi lặp trên cả bộ template:
mỗi trang nhắc phí tất toán ở **ba chỗ ngoài bảng chính**, đợt sửa mới chạm bảng
chính. → `[[kb-po/ra-soat/confluence-can-cap-nhat]]` viết lại.

## [2026-10-03] refactor | Gộp repo, mất lịch sử git của KB

`code/lendkb` gộp vào `lending_manage`, bỏ 17 commit lịch sử.
Phần đáng giữ chép tay sang `[[kb-po/bao-tri/lich-su-quyet-dinh]]`.

> Đây chính là lúc đáng lẽ phải có file log này. Lịch sử trước 2026-10-03 giờ chỉ
> còn những gì đã kịp chép sang `lich-su-quyet-dinh`.

## [2026-09-29 → 2026-10-03] ingest | Dựng wiki

Export 2.910 tài liệu Confluence + Jira, dựng 33 trang sản phẩm, 7 trang vận hành,
bộ `_meta`. Chi tiết số liệu nào đổi và vì sao: `[[kb-po/bao-tri/lich-su-quyet-dinh]]`.
