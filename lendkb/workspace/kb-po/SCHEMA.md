---
title: Schema — cách bảo trì wiki này
audience: [po, ai]
last_verified: 2026-10-06
owner: dung.pham2
status: reference
standard: "LLM Wiki — https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
---

# Schema — cách bảo trì wiki này

> **Quy chuẩn**: wiki này theo pattern **LLM Wiki** của Andrej Karpathy —
> <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
>
> **Tài liệu này là lớp schema của pattern đó.** Mọi agent làm việc với KB phải
> đọc file này trước khi sửa bất cứ thứ gì. Thêm quy ước mới thì ghi vào đây,
> đừng để nó chỉ tồn tại trong một đoạn hội thoại.

Ý chính của pattern: **wiki là một artefact tích luỹ, không phải kho để RAG lục lại
mỗi lần hỏi.** Mỗi nguồn mới được đọc một lần rồi *hợp nhất* vào wiki — cập nhật các
trang liên quan, đánh dấu chỗ mâu thuẫn, bồi thêm phần tổng hợp. Kiến thức được biên
dịch một lần rồi **giữ cho luôn đúng**, không tái tạo lại ở mỗi câu hỏi.

Người lo nguồn và đặt câu hỏi. **Agent viết toàn bộ wiki** — tóm tắt, liên kết chéo,
sắp xếp, sổ sách.

---

## Ba lớp

| Lớp | Ở đâu | Ai sở hữu |
|---|---|---|
| **Nguồn thô** — bất biến | `raw/` (gitignored, 2.910 tài liệu) | Script `tools/export.mjs` sinh ra. **Không bao giờ sửa tay** |
| **Wiki** — markdown liên kết chéo | `kb/`, `kb-po/` | Agent viết. Người đọc |
| **Schema** — file này | [[kb-po/SCHEMA]] | Người và agent cùng tiến hoá |

Khác pattern gốc một chỗ: nguồn thô của mình **sinh bằng script từ Confluence + Jira**,
không phải người thả file vào. Hệ quả là nguồn **tự mâu thuẫn với chính nó** —
Confluence tụt hậu có hệ thống. Vì vậy có thêm `[[kb-po/ra-soat/can-confirm]]` mà
pattern gốc không cần.

---

## Ba thao tác

### 1. Ingest — nạp nguồn mới

Khi có export mới, hoặc người đưa vào một tài liệu / ticket / câu trả lời:

1. **Đọc nguồn.** Ticket vận hành thì **đọc cả ảnh đính kèm** — Ops gần như luôn
   chụp màn hình thay vì gõ số.
2. **Bàn với người** về điều rút ra trước khi ghi. Đừng ghi thẳng.
3. **Cập nhật mọi trang liên quan**, không chỉ một. Một nguồn thường chạm 3–10 trang:
   trang sản phẩm, trang quy trình, `[[kb/product-matrix]]`, case mẫu, index.
4. **Số liệu đổi** → ghi vào `[[kb-po/bao-tri/lich-su-quyet-dinh]]` **lý do đổi**, không chỉ
   giá trị mới. Giá trị cũ giữ lại để còn đối chiếu.
5. **Hai nguồn chọi nhau** → **không tự chọn**. Ghi cả hai kèm ngày, đưa vào
   `[[kb-po/ra-soat/can-confirm]]`, chờ PO.
6. **Ghi một dòng vào `[[kb-po/bao-tri/log]]`.**
7. Chạy `node tools/kb-index.mjs && node tools/kb-lint.mjs`.

### 1b. Chu trình tháng — script kéo, agent đọc

| Bước | Ai | Việc |
|---|---|---|
| 1 | Script | `./tools/refresh.sh`: kéo Confluence + Jira mới về `raw/`, index lại, in danh sách cần rà |
| 2 | Agent | Với từng sản phẩm "có ticket policy mới hơn số liệu": **đọc ticket** (cả ảnh đính kèm), so với trang `kb/` |
| 3 | Agent | Khác thì làm như Ingest bước 3–6: sửa trang, ghi lý do vào `[[kb-po/bao-tri/lich-su-quyet-dinh]]`, chọi nhau thì đưa vào can-confirm, cập nhật `numbers_asof` / `last_verified` |
| 4 | Agent | Không có thay đổi chính sách → chỉ ghi kết quả vào `[[kb-po/ra-soat/doi-chieu-jira]]`, nâng `last_verified` |
| 5 | Người | PO duyệt diff và các mục can-confirm mới trước khi commit |

Script không bao giờ tự quyết số nào đúng. Nó chỉ thu hẹp chỗ cần đọc.

### 2. Query — trả lời câu hỏi

1. Đọc `[[kb/index]]` (câu hỏi Ops/CSKH) hoặc `[[kb-po/index]]` (việc PO) trước để biết trang nào đáng mở. Ở quy mô này index thay được
   hạ tầng embedding.
2. Đọc trang, trả lời **kèm dẫn nguồn** tới trang cụ thể.
3. **Câu trả lời tốt thì file ngược vào wiki.** Đây là phần hay bị bỏ qua nhất:
   một phân tích, một case xử lý, một so sánh — nếu nó không suy ra được từ các
   trang sẵn có thì nó là kiến thức mới, **đừng để nó chìm trong lịch sử chat**.
4. Ghi log.

Đáng file lại khi: phải hỏi người mới trả lời được · phải tra nhiều nguồn mới ra ·
phát hiện một cái bẫy mới.

### 3. Lint — soát sức khoẻ

```bash
node tools/kb-lint.mjs
```

Soát: liên kết hỏng · trang mồ côi · thiếu frontmatter · thiếu `audience` ·
thiếu `last_verified` · quá 90 ngày chưa rà · trang sản phẩm không khai nguồn ·
số mục còn mở trong can-confirm.

Thoát mã 1 nếu có lỗi 🔴 — dùng được trong git hook.

Lint **không** đoán mục can-confirm nào đã có câu trả lời. Đoán sai tệ hơn không đoán.

---

## Quy ước trang

### Frontmatter — bắt buộc

```yaml
---
title: <tiêu đề hiển thị>
audience: [ops, po]        # hoặc [po] — agent dùng để biết được phép trả lời ai
last_verified: YYYY-MM-DD  # ngày rà lại gần nhất, không phải ngày sửa file
owner: dung.pham2
status: draft | reviewed | approved | reference | generated
sources:                   # trang sản phẩm bắt buộc có
  - confluence:1060929556
  - jira:PL-9170
---
```

Trang sản phẩm có thêm: `product`, `partner`, `channel`, `product_status`,
`numbers_source`, `numbers_asof`, `needs_jira_verify`. Chi tiết: `[[kb-po/bao-tri/format]]`.

### Liên kết chéo

Dùng `[[đường/dẫn/không/đuôi]]` tính từ `workspace/`:

```markdown
Xem [[kb/operations/ma-loi-api]] và [[kb/products/cashloan/overview]].
```

Đường dẫn đầy đủ vì tên file trùng nhau nhiều (*overview.md* có ở 4 sản phẩm).

**Link nhiều vào.** Liên kết là nội dung, không phải trang trí: nhờ nó agent đi tiếp
được, Obsidian vẽ được graph, và lint tìm được trang mồ côi. Chuyển các lượt nhắc
tên file kiểu cũ: `node tools/linkify.mjs`.

### Không có vùng tự sinh

Script **không viết nội dung** trang `kb/`. Script chỉ kéo nguồn, index, và báo trang
nào cần rà; **agent đọc nguồn rồi sửa trang** theo quy trình Ingest. Lý do: nguồn tự
mâu thuẫn, cần đọc hiểu và phán đoán — thay chuỗi máy móc sẽ ghi đè số đúng bằng số cũ.

Ngoại lệ duy nhất: `kb/index.md` và `kb-po/index.md` do `tools/kb-index.mjs` sinh trọn,
có marker `AUTO:` — đừng sửa tay hai file đó.

### Giọng văn

Tiếng Việt có dấu. Thuật ngữ kỹ thuật giữ nguyên tiếng Anh. Bảng hơn văn xuôi khi
là dữ liệu. Kết luận đặt trước, lý do đặt sau.

**Chỗ chưa chắc thì nói là chưa chắc.** Mỗi case mẫu bắt buộc có mục
*Điểm chưa xác nhận* nếu còn chỗ chưa xác minh — nếu không người đọc sau tưởng cả
trang đều đã được kiểm chứng.

### PII

Ticket thật có tên, sđt, CCCD, STK. **Sang KB thì thay bằng placeholder**;
`loan_code` / `loan_id` chỉ mô tả định dạng. Export đã redact nhưng **không tin
tuyệt đối** — đọc lại trước khi ghi.

---

## Hai file đặc biệt

| File | Kiểu | Ai cập nhật |
|---|---|---|
| `[[kb/index]]` · `[[kb-po/index]]` | Catalog theo nội dung — mỗi vùng một index, một dòng mỗi trang | `node tools/kb-index.mjs` |
| `[[kb-po/bao-tri/log]]` | Nhật ký theo thời gian, chỉ ghi thêm | Agent, mỗi lần ingest/query/lint |

Log có tiền tố cố định nên grep được:

```bash
grep "^## \[" kb-po/bao-tri/log.md | tail -5
```

---

## Công cụ

| Lệnh | Việc |
|---|---|
| `tools/refresh.sh` | Chu trình tháng: export → harvest code → index → value index → báo drift |
| `node tools/kb-index.mjs` | Sinh lại `[[kb/index]]` và `[[kb-po/index]]` |
| `node tools/kb-lint.mjs` | Soát sức khoẻ wiki |
| `node tools/linkify.mjs --dry` | Đổi lượt nhắc tên file thành wikilink |
| `node tools/kb-move.mjs --dry` | Chuyển trang giữa `kb/` và `kb-po/`, **sửa link tự động** |
| `node tools/value-index.mjs` | Index 8.890 cặp số + đơn vị trong nguồn thô |

Tra theo **giá trị** (`value-index`) chứ không chỉ theo từ khoá — bảy lần quét sót
trước đây đều do tìm sai hình thức diễn đạt, không phải do tài liệu thiếu.
Xem `[[kb-po/bao-tri/lich-su-quyet-dinh]]`.

---

## Nguyên tắc không được phá

1. **Jira là nguồn chuẩn, Confluence chỉ dựng khung.** Confluence tụt hậu có hệ thống.
2. **Không tự chọn khi hai nguồn chọi nhau.** Ghi cả hai kèm ngày, đưa vào can-confirm.
3. **Không ghi số mới mà xoá số cũ.** Mất khả năng đối chiếu.
4. **Không sửa tay `kb/index.md`, `kb-po/index.md`** — chạy `tools/kb-index.mjs`.
5. **Không chép PII sang KB.**
6. **Ops không đọc `kb-po/`** — ranh giới quy ước, không phải phân quyền kỹ thuật.

## Ranh giới `kb/` ↔ `kb-po/`

**`kb/` = kiến thức sản phẩm và vận hành, chỉ cho Ops/CSKH** — thứ cần để trả lời khách
và xử lý ticket. Cách lấy dữ liệu, số kinh doanh, bảo trì wiki và mọi việc của PO
thuộc `kb-po/`. Chốt 2026-10-06.

| Thuộc `kb/` | Thuộc `kb-po/` |
|---|---|
| Thông số sản phẩm, chính sách, kênh | Core banking, GL, bút toán, hạch toán |
| Quy trình xử lý ticket, mã lỗi, case mẫu, ticket SVK đang mở | Số liệu kinh doanh: giải ngân, dư nợ, write-off, tỷ lệ — kể cả số đếm khoản vay |
| Nhận diện sản phẩm ([[kb/product-matrix]]) | Dashboard, query, cách lấy dữ liệu, tool nội bộ |
| Thuật ngữ, thông báo từ chối | Cách PO soạn ticket, quy tắc rà tài liệu |
| Ghi chú vận hành (mục *Ghi chú vận hành — Ops*), mục *Dành cho CSKH* | Ghi chú PO theo sản phẩm → [[kb-po/san-pham/ghi-chu-po]] |
| Cảnh báo số liệu cho người trả lời ("Confluence ghi 3% đã cũ, không dùng") | Quá trình đối chiếu nguồn → [[kb-po/ra-soat/doi-chieu-jira]] |
| Frontmatter `numbers_source`, `numbers_asof`, `needs_jira_verify` — agent cần để biết số nào chưa dùng được | Checklist "Còn thiếu" của từng trang → [[kb-po/ra-soat/con-thieu]] |
| | Bảo trì wiki: schema, format, log, lịch sử quyết định, độ phủ → `kb-po/bao-tri/` |

Phép thử: **Ops có dùng được thông tin này để xử lý một ticket không?**
Không thì nó thuộc `kb-po/`.

Trang `kb/` **không link sang `kb-po/`** — Ops không đi theo được. Cần nhắc tới thì
ghi đường dẫn trong backtick, không dùng wikilink.

`kb-lint` giữ ranh giới bằng máy:

- 🔴 trang trong `kb-po/` mà `audience` có `ops`, hoặc trang trong `kb/` mà không có `ops`
- 🟡 trang `kb/` link sang `kb-po/`, hoặc có mục kiểu PO (*Ghi chú sản phẩm — PO*,
  *Số liệu kinh doanh*, *Còn thiếu*, *Cần viết*, *Lịch sử thay đổi*)

Chuyển trang bằng `tools/kb-move.mjs` để link không hỏng; đừng `mv` tay.
