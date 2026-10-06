# Plan xây dựng Knowledge Base các sản phẩm tín dụng

Ngày tạo: 2026-09-29 · Cập nhật: 2026-10-01
Nguồn: Confluence (kiến thức tĩnh) + Jira (thay đổi chính sách)
Đầu ra: file Markdown trong `kb/`

## Đối tượng sử dụng (chốt 2026-10-01)

**Hai nhóm người dùng**: Ops (gồm cả CSKH) và PO. Chia theo **4 nhóm nội dung**,
quyền đọc suy ra từ nhóm nội dung:

| Nhóm nội dung | Ops | PO | Nằm ở |
| --- | --- | --- | --- |
| 1. Thông tin sản phẩm | ✅ | ✅ | `kb/products/`, `kb/channels/` |
| 2. Ticket đã vận hành, hướng xử lý | ✅ | ✅ | `kb/operations/`, mục 4 trong file sản phẩm |
| 3. Core banking, GL, hạch toán | ❌ | ✅ | `kb-po/core/` |
| 4. Kinh doanh, tool dev | ❌ | ✅ | `kb-po/business/` |

Hai tầng thư mục: **`kb/`** dùng chung, **`kb-po/`** chỉ PO.
PO muốn chia sẻ phần nào sang `kb/` thì quyết từng trường hợp.

> **Tách thư mục là ranh giới quy ước, không phải phân quyền kỹ thuật.**
> Cùng một repo thì ai clone cũng đọc được `kb-po/`. Muốn chặn thật phải tách repo
> hoặc đặt quyền ở nơi lưu trữ.

Không script nào viết nội dung trang `kb/`: script kéo nguồn và báo trang cần rà,
agent đọc rồi sửa (chu trình tháng trong `kb-po/SCHEMA.md`). Marker `AUTO:` đã bỏ 2026-10-06.
Quy ước đầy đủ: `kb-po/bao-tri/format.md`. Ai đọc gì: `kb-po/SCHEMA.md` mục *Ranh giới*.

---

## 0. Điều kiện tiên quyết

- [x] Đọc được Confluence/Jira (qua tool atlassian chỉ-đọc).
- [x] Chốt phạm vi nguồn: **Confluence space PL**, **Jira project PL** (Initiative/Epic/Story, created >= 2024-06-01). Space BEF chưa mở rộng — quyết case by case khi gặp page cụ thể cần tới.
- [x] Chốt ma trận đối tác × sản phẩm × kênh — `kb/product-matrix.md`, chốt 2026-09-30.
- [ ] Người duyệt nội dung: hiện **dung.pham2** tự duyệt. Riêng lãi suất, phí, điều kiện tín dụng nên có thêm một người của Product/Risk xác nhận trước khi chuyển `approved` — chưa chỉ định.

### Phạm vi KB (chốt 2026-09-30)

- **Có**: 26 sản phẩm cho vay đang chạy + nhóm ngừng bán còn dư nợ (mục C, D của product-matrix).
- **Không**: 6 sản phẩm thẻ (dòng 27–32). Bổ sung sau khi cần.
- **Chưa viết**: `MBF_cashloan`, `FIZA_payday` — chờ bổ sung vào bảng matrix.
- Sản phẩm ngừng bán: khoản vay còn dư nợ **vẫn trả được qua app Cake**; chỉ luồng API với đối tác bị đóng. Agent hướng khách theo app Cake, không hướng về app đối tác.

---

## 1. Taxonomy (khung phân loại)

Mỗi mẩu kiến thức gắn với 4 chiều:

| Chiều | Giá trị |
| --- | --- |
| Đối tác | `<partner_a>`, `<partner_b>`, … (chốt ở Giai đoạn 1) |
| Loại sản phẩm | `cashloan`, `payday`, `paylater`, `od` |
| Kênh | `dop`, `native-api`, `cake-app` |
| Chủ đề | `onboarding`, `loan-management`, `faq`, `overview` |
| Đối tượng | `cskh`, `ops`, `po` — trường `audience` trong frontmatter |

Chủ đề con:

- **Onboarding**: điều kiện vay, hồ sơ/giấy tờ, eKYC, luồng đăng ký, chấm điểm/duyệt, hạn mức, lãi suất & phí, ký hợp đồng, giải ngân, lý do từ chối thường gặp.
- **Loan management**: lịch trả nợ, kênh thanh toán, trả trước hạn/tất toán, phí phạt trễ hạn, nợ quá hạn & nhắc nợ, gia hạn/cơ cấu (nếu có), đóng khoản vay, tra cứu dư nợ, hủy khoản vay, khiếu nại.

Nguyên tắc: kiến thức **chung** của một loại sản phẩm để ở file sản phẩm; chỗ nào **khác biệt theo đối tác/kênh** thì tách thành file riêng và ghi rõ là ghi đè lên file chung.

> **Cập nhật 2026-10-01**: `known-issues` bỏ khỏi danh sách chủ đề — phạm vi export không có
> ticket CSKH nên không dựng được. Thay vào đó `kb/reject-messages.md` tra cứu thông báo
> từ chối, và mục 4 trong mỗi file chứa kinh nghiệm vận hành.
>
> Thêm chiều **đối tượng**: cùng một file phục vụ 4 nhóm qua bố cục 8 mục, không tách file
> theo nhóm. Lý do: tách file thì cùng một sản phẩm bị phân mảnh, người đọc phải mở nhiều chỗ.

---

## 2. Cấu trúc thư mục đầu ra

Thực tế sau khi dựng xong (2026-10-01):

> **Cấu trúc đã đổi 2026-10-05/06** — `kb/_meta/` không còn, `README-nhom.md` đã gộp.
> `kb/` chỉ còn kiến thức Ops/CSKH; bảo trì wiki, rà soát, ghi chú PO ở `kb-po/`.
> Cây hiện hành: `kb/index.md` và `kb-po/index.md`. Cây dưới đây giữ làm lịch sử.

```
kb/                            # Ops + PO (nhóm 1 + 2)
├── README.md                  # thứ tự đọc, cảnh báo chênh lệch giữa sản phẩm
├── README-nhom.md             # ai đọc gì
├── operations/                # nhóm 2 — ticket vận hành (chưa có dữ liệu)
├── glossary.md                # thuật ngữ
├── reject-messages.md         # tra thông báo từ chối -> nói gì với khách
├── products/
│   ├── cashloan|payday|paylater|od/
│   │   ├── overview.md · onboarding.md · loan-management.md · faq.md
│   │   └── partners/<đối tác>/<product_id>.md     # 30 file
├── channels/
│   └── cake-app.md · dop.md · native-api.md
└── _meta/
    ├── format.md                    # quy ước format 8 mục, marker AUTO, nhãn chia sẻ
    ├── product-matrix.md            # ma trận đối tác × sản phẩm × kênh
    ├── doc-map.md                   # tài liệu nào phục vụ sản phẩm nào
    ├── source-index.md              # file KB ↔ nguồn, độ phủ
    ├── jira-fill-plan.md            # cách lấy số từ Jira
    ├── products-without-numbers.md  # còn thiếu gì
    └── open-questions.md            # câu hỏi chờ quyết

kb-po/                         # chỉ PO (nhóm 3 + 4)
├── core/_index.md             # 766 tài liệu core/GL, index trỏ về raw/
└── business/<product_id>.md   # 33 file, số liệu kinh doanh — chờ BI

raw/                           # dữ liệu thô, gitignore, KHÔNG đưa cho agent
├── confluence/PL/   1.079 page
└── jira/PL/         1.831 ticket

tools/                         # script, chạy lại được khi có export mới
├── export.mjs                 # kéo Confluence + Jira về raw/
├── build-index.mjs            # index 2.910 tài liệu: metadata + phân loại + sản phẩm
├── match-products.mjs         # nhận diện sản phẩm theo cặp (đối tác × loại)
├── scan-tree.mjs              # quét ticket theo cây Initiative → Epic → Story
├── extract-tree.mjs           # trích bảng số từ ticket ra digest để duyệt
├── gen-kb-skeleton.mjs        # sinh khung file sản phẩm từ ma trận
├── fill-jira-numbers.py       # điền số đã xác minh
├── migrate-format.py          # chuyển file sang format đa-đối-tượng
└── refresh.sh                 # chu trình cập nhật hàng tháng
```

`known-issues/` trong bản kế hoạch gốc **chưa dựng** — phạm vi export không có project
ticket CSKH nên không có case thực tế để tổng hợp.

## 3. Template file kiến thức

> **Đã thay thế 2026-10-01** bởi `kb/_meta/format.md` (bố cục 8 mục đa-đối-tượng,
> marker AUTO, nhãn mức chia sẻ 🟢🟡🔴). Phần dưới giữ lại để tham khảo lịch sử.

```markdown
---
title: Onboarding – Cashloan – <Partner> – Cake App
product: cashloan
partner: <partner>
channel: cake-app
topic: onboarding
sources:
  - confluence:<page-id>
  - jira:<ISSUE-KEY>
last_verified: 2026-10-xx
owner: <SME>
status: draft | reviewed | approved
---

## Tóm tắt
2–3 câu mô tả điều quan trọng nhất.

## Chi tiết
Các bước / điều kiện / con số cụ thể.

## Câu hỏi khách hàng thường gặp
**Q:** …
**A:** …

## Lưu ý cho agent
- Khi nào phải chuyển cho nhân viên (escalate)
- Thông tin KHÔNG được nói với khách
```

---

## 4. Các giai đoạn triển khai

| Giai đoạn | Trạng thái | Kết quả |
| --- | --- | --- |
| 1 — Khảo sát | ✅ 2026-09-30 | `product-matrix.md`, `doc-map.md` |
| 2 — Trích xuất Confluence | ✅ 2026-09-30 | 1.079 page → `raw/` |
| 3 — Trích xuất Jira | ✅ 2026-09-30 | 1.831 ticket → `raw/` |
| 4 — Tổng hợp & viết KB | ✅ phần tự sinh, 2026-10-01 | 61 file `kb/`. Mục Ops/PO/Business chờ người viết |
| 5 — Kiểm định (QA) | ⬜ chưa bắt đầu | Chặn bởi B1 (nguồn câu hỏi CSKH) |
| 6 — Vận hành & cập nhật | ⬜ chưa bắt đầu | Chu trình đã thiết kế, chưa chạy lần nào |


### Giai đoạn 1 — Khảo sát (Discovery) · **ĐÃ XONG 2026-09-30**
1. Liệt kê các Confluence space có liên quan Lending, đếm số page theo từng space.
2. Liệt kê các Jira project/issue type liên quan (CS, Ops, Bug, Product), đếm số ticket đã resolved trong 12 tháng gần nhất.
3. Dựng `product-matrix.md`: đối tác nào có sản phẩm nào, chạy trên kênh nào, trạng thái (đang chạy / đã dừng).
4. Xác định page "chuẩn" (source of truth) cho mỗi sản phẩm; đánh dấu page cũ hoặc trùng.

> **Kết quả**: `_meta/product-matrix.md` — 26 sản phẩm cho vay đang chạy, 6 sản phẩm thẻ
> (ngoài phạm vi), 4 sắp ngưng, 5 đã ngưng, 3 đang phát triển.
> Cộng `_meta/doc-map.md` — index 2.910 tài liệu, 697 trong đó chứa thông số chính sách.

### Giai đoạn 2 — Trích xuất Confluence · **ĐÃ XONG 2026-09-30**
1. Tìm page bằng CQL theo space, label, tiêu đề (ví dụ `space = LEND AND label = "cashloan"`).
2. Lấy nội dung từng page, chuyển sang Markdown, lưu vào `raw/confluence/`, kèm metadata (id, title, space, labels, last updated, author).
3. Bỏ: page archive, meeting notes, retro, tài liệu kỹ thuật thuần nội bộ (schema DB, config), thông tin mật (pricing nội bộ, hợp đồng đối tác).
4. Gắn tag sơ bộ theo taxonomy.

> Cập nhật 2026-09-29: Giai đoạn 2 và 3 gộp thành một lần export bằng `tools/export.mjs`. Phạm vi: Confluence space PL; Jira PL, type Initiative/Epic/Story, created >= 2024-06-01. Bỏ SVK nên không có `known-issues/` lấy từ case thực tế.
>
> **Đã chạy xong 2026-09-30**: 1.079 page + 1.831 issue → `raw/`, 20MB. Ẩn danh hoá bắt được 489 SĐT, 360 email, 137 CCCD. `raw/` đã gitignore, không commit.

### Giai đoạn 3 — Trích xuất Jira · **ĐÃ XONG 2026-09-30**
1. Kéo ticket bằng JQL:
   `project = PL AND issuetype in (Initiative, Epic, Story) AND status != "Will Not Do" AND created >= "2024-06-01"`
2. Lấy summary, description, comments, resolution, labels/components.
3. **Ẩn danh hóa bắt buộc**: xóa tên, SĐT, CCCD, số tài khoản, số hợp đồng, CIF, email.
4. Gom nhóm ticket theo (sản phẩm × chủ đề × nguyên nhân gốc), bỏ ticket test/trùng.
5. Mỗi nhóm → 1 mục trong `known-issues/`: triệu chứng khách mô tả → nguyên nhân → cách xử lý → câu trả lời mẫu → khi nào escalate.

Lưu ý: không đưa ticket thô vào KB, chỉ đưa bản đã tổng hợp.

> **Kết quả**: 1.831 ticket → `raw/jira/PL/`. Ẩn danh hoá theo ngữ cảnh (chỉ ẩn khi có từ
> khoá chỉ danh đứng trước) để không phá mã tài khoản GL kế toán — bắt được 489 SĐT,
> 360 email, 137 CCCD, 3 số hợp đồng, 2 STK, 1 CIF.
>
> Bước 4–5 (gom nhóm ticket thành `known-issues/`) **không làm được** — xem ghi chú Giai đoạn 2.

### Giai đoạn 4 — Tổng hợp & viết KB · **ĐÃ XONG phần tự sinh (2026-10-01)**

> **Kết quả**: 61 file trong `kb/`, YAML hợp lệ 61/61, không còn file rỗng.
> 30 sản phẩm đối tác + 4 nhóm sản phẩm + 3 kênh + tra cứu thông báo từ chối.
> Nguồn số liệu: 25 file từ Jira, 12 file từ Confluence (chờ đối chiếu), 11 file không chứa số.
>
> **Còn lại của giai đoạn này**:
> - 12 file `numbers_source: confluence` cần đối chiếu Jira
> - Mục 4 (Ops), 5 (PO), 6 (Business) đang rỗng ở hầu hết file — **cần người viết**
> - FAQ 4 sản phẩm đều `coverage: partial`, chưa đối chiếu case CSKH thật

> **Nguyên tắc nguồn (chốt 2026-09-30): Confluence dựng khung, Jira chốt số.**
>
> Số liệu sản phẩm trên Confluence có thể đã cũ — dữ liệu mới nhất nằm ở ticket Jira.
> Vì vậy tách làm hai lượt:
>
> - **Lượt 1 (đang làm)**: dựng khung toàn bộ sản phẩm từ Confluence — nhận diện, kênh,
>   cấu trúc, luồng, nguồn tham chiếu. **Không điền hạn mức / lãi suất / phí.**
> - **Lượt 2**: quét Jira theo từng `product_id` để lấy số liệu mới nhất, rồi fill vào.
>
> File nào có số liệu lấy từ Confluence phải mang `numbers_source: confluence` và
> `needs_jira_verify: true` trong frontmatter. Agent **không dùng số liệu ở các file đó**
> để trả lời khách cho tới khi đã đối chiếu Jira.
Thứ tự: làm xong 1 sản phẩm × 1 đối tác trọn vẹn (pilot) rồi mới nhân rộng.

> **Pilot chọn 2026-09-30: `CAKE_cashloan` (Cake × cashloan × cake-app).**
> Lý do: độ phủ tài liệu cao nhất (172 page Confluence có "CAKE"/"Cake" trong tiêu đề,
> so với 123 của Viettel); không có lớp đối tác chồng lên nên taxonomy đơn giản nhất;
> và `cake-app` là kênh mà khách của **mọi** sản phẩm ngừng bán phải dùng để trả nợ
> (quyết định F4), nên phần loan-management viết ở đây dùng lại được cho cả nhóm đó.
1. `glossary.md` + `channels/*.md`
2. `products/<product>/overview|onboarding|loan-management.md` (phần chung)
3. `partners/<partner>/*.md` (chỉ ghi điểm khác biệt)
4. `faq.md` = FAQ từ Confluence + câu hỏi hay gặp từ Jira
5. `source-index.md` để truy ngược nguồn
6. Nếu Confluence và Jira mâu thuẫn → ghi vào danh sách chờ SME quyết, không tự chọn.

### Giai đoạn 5 — Kiểm định (QA) · **CHƯA BẮT ĐẦU**

Chặn bởi: chưa có bộ câu hỏi thật của khách.

1. Soạn 50–100 câu hỏi thật, phủ 4 sản phẩm × 3 kênh. **Cần nguồn ticket CSKH** — hiện không có.
2. Cho agent trả lời dựa trên KB → chấm đúng / thiếu / sai / đáng lẽ phải escalate.
3. Người phụ trách review từng file, chuyển `status: draft → reviewed → approved`.
4. Ngưỡng đạt: ≥ 90% đúng, **0 lỗi về lãi/phí**.

Trọng tâm nên kiểm trước, vì đây là chỗ dễ sai nhất:

- Agent có áp nhầm số của sản phẩm này sang sản phẩm khác không (lãi 0%–60%, hạn mức 1tr–300tr).
- Agent có báo phí tất toán đúng theo từng nhóm không (0% / 3% / 5% / 8%-5%).
- Agent có escalate đúng lúc không, đặc biệt câu "không đủ điều kiện".

### Giai đoạn 6 — Vận hành & cập nhật · **CÔNG CỤ ĐÃ SẴN, CHƯA CHẠY ĐỊNH KỲ**

```bash
./tools/refresh.sh              # kéo dữ liệu mới + index lại + báo cáo cần rà gì
./tools/refresh.sh --no-pull    # chỉ index lại từ raw/ đang có
```

Script tự báo ba thứ: sản phẩm có ticket policy **mới hơn** số liệu trong KB ·
file còn `needs_jira_verify: true` · file quá 180 ngày chưa rà lại.

Chạy thử 2026-10-01: 8 sản phẩm có ticket mới hơn, **kiểm tra thì không có thay đổi
chính sách thật** (toàn lifecycle, core, mã lỗi). 23 file chưa đối chiếu Jira. 0 file quá hạn.

Chu trình:

| Việc | Tần suất | Cách làm |
| --- | --- | --- |
| Kéo + index + soát | hàng tháng | `./tools/refresh.sh` |
| Cập nhật thông số | hàng tháng, sau refresh | agent đọc ticket/page mới rồi sửa trang — chu trình tháng trong `kb-po/SCHEMA.md` |
| Rà `last_verified` quá 6 tháng | hàng quý | file quá hạn coi như có thể sai |

Khi ra sản phẩm mới: thêm vào `kb/product-matrix.md` trước, rồi chạy `gen-kb-skeleton.mjs`.

Theo dõi câu hỏi agent không trả lời được → đưa vào backlog KB.

## 5. Rủi ro & cách kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Lộ PII từ ticket Jira | Ẩn danh hoá ở bước export. Thực tế bắt được 489 SĐT, 360 email, 137 CCCD. `raw/` gitignore |
| **Số liệu Confluence đã cũ** | Jira là nguồn chuẩn. Trường `numbers_source` + `needs_jira_verify` đánh dấu rõ file nào chưa đối chiếu |
| Mâu thuẫn giữa các nguồn | Không tự chọn; ghi cả hai kèm ngày, đưa vào `open-questions.md` |
| Agent áp nhầm số giữa các sản phẩm | Bảng cảnh báo chênh lệch trong `kb/README.md`. Mỗi file ghi rõ ngoại lệ |
| Thông tin nội bộ lọt ra khách | Nhãn mức chia sẻ 🟢🟡🔴 theo từng mục, thay cho một mục cấm chung |
| Người viết bị script ghi đè | Script không viết nội dung trang `kb/` (bỏ marker AUTO 2026-10-06) |
| Số kinh doanh cũ | Mục 6 bắt buộc ghi kỳ số liệu và nguồn |

### Bài học từ quá trình quét — đã sửa, ghi lại để không lặp

Ba lần liên tiếp kết luận "không có dữ liệu" trong khi dữ liệu vẫn nằm trong `raw/`.
Nguyên nhân đều ở công cụ quét, không ở dữ liệu:

| # | Lỗi | Hệ quả | Cách sửa đã áp dụng |
| --- | --- | --- | --- |
| 1 | Khớp chuỗi `product_id` nguyên khối | Trang `[Partner][Viettel] - Cashloan - Product Policy` map ra rỗng | Khớp theo **cặp (đối tác × loại sản phẩm)** — `tools/match-products.mjs` |
| 2 | Không biết mã nội bộ | `VDS-O2O`, `ODTD_v2` không khớp được product_id nào | Bảng alias + bổ ngữ tách biến thể |
| 3 | Xếp hạng ticket theo ngày mới nhất | Ticket khai sinh sản phẩm (chứa bảng policy đầy đủ) bị đẩy xuống đáy | Xếp theo **độ giàu bảng số**, và đi theo cây Initiative → Epic → Story |
| 4 | Dò policy chỉ theo bảng markdown | Bỏ sót 20 tài liệu viết policy dạng văn xuôi | Thêm nhãn `policy-prose` trong `build-index.mjs` |
| 5 | `\b` không khớp qua dấu gạch dưới | `\bMBF\b` không khớp `MBF_cashloan` → rơi xuống quét thân → gán nhầm 4 sản phẩm | Đổi sang lookaround theo chữ cái |
| 6 | Quét thân để suy cặp (đối tác × loại) | Ticket của MWG bị gán cho cả ZLP và VNP vì thân liệt kê nhiều sản phẩm | Cặp chỉ quét tiêu đề; thân để cho khớp `product_id` nguyên văn lo |

**Nguyên tắc rút ra**: trước khi kết luận "không có dữ liệu", phải kiểm tra lại bộ lọc.
Và mọi kết luận dạng phủ định cần nói rõ **đã quét bằng cách nào**, để người khác soi được.

Bộ nhận diện hiện tại vẫn là khớp mẫu — tài liệu đặt tên ngoài quy ước vẫn có thể lọt.

## 6. Việc còn lại

### Chặn tiến độ

| # | Việc | Ai làm | Vì sao chặn |
| --- | --- | --- | --- |
| B1 | **Nguồn câu hỏi CSKH thật** | dung.pham2 | Chặn toàn bộ Giai đoạn 5. Hướng đã chọn 2026-10-01: **lấy từ một Jira project CSKH khác** — chờ project key và issuetype để sửa `tools/export.mjs` |
| ~~B2~~ | ~~Chỉ định người duyệt~~ | — | **Chốt 2026-10-01: dung.pham2 duyệt toàn bộ.** Đã điền `owner` cho 61/61 file. Đề xuất bước đệm: xuất một bảng tất cả con số tài chính kèm nguồn + ngày để soát một lượt trước khi chuyển `approved` |
| B3 | **Lãi suất Cake OD v2** | PO | Page nguồn ghi "TBD, Business confirm", sản phẩm `[IN PROGRESS]` |

### Cần người viết — không lấy được từ `raw/`

| # | Việc | Ai làm |
| --- | --- | --- |
| N1 | Mục 4 — ghi chú vận hành | Ops |
| N2 | Mục 5 — ghi chú sản phẩm | PO / Product |
| N3 | Mục 6 — số liệu kinh doanh | Business / BI |

Mục 4 và 5 đã có sẵn nội dung gợi ý rút từ dữ liệu, không trống hoàn toàn.
Mục 6 trống hoàn toàn — không có trong Confluence/Jira.

### Rà soát kỹ thuật

| # | Việc | Ghi chú |
| --- | --- | --- |
| ~~R1~~ | ~~12 file nguồn Confluence → đối chiếu Jira~~ | **Đã rà 2026-10-01.** Không sản phẩm nào có ticket đổi chính sách. `MBF_cashloan` được Jira xác nhận → chuyển `numbers_source: jira`. 11 file còn lại giữ nguồn Confluence nhưng đã gắn `jira_checked`. Phát hiện phụ: `numbers_asof` trước đó ghi sai (lấy ngày ticket thay vì ngày trang nguồn) — đã sửa cả 12 |
| ~~R2~~ | ~~Bộ nhận diện khớp dư~~ | **Đã sửa 2026-10-01.** Tách 2 tín hiệu: `product_id` nguyên văn quét toàn văn bản, cặp (đối tác × loại) chỉ quét tiêu đề. Thêm cấp "loại sản phẩm" cho tài liệu dùng chung. Tài liệu policy mồ côi 128 → 75 |
| R3 | 697 tài liệu có bảng chính sách, mới đọc ~45 | Phần còn lại bổ sung chi tiết, không lấp khoảng trống |
| R4 | **3 trang nguồn quá 1 năm chưa cập nhật** | `paylater/overview.md` (2024-04-21), `be_paylater.md` (2025-06-25), `vt_payday_s.md` (2025-09-17). Jira không có ticket đổi, nhưng thay đổi có thể chưa từng ghi vào Jira — cần PO xác nhận |

### Treo — chờ quyết

| # | Việc | Trạng thái |
| --- | --- | --- |
| T1 | Thêm `MBF_cashloan`, `FIZA_payday` vào bảng Partnership products | Nội dung KB đã viết, thiếu trường kênh/NFC/nơi ký |
| T2 | `MWG_payday` contract type ghi `dop_mwg_payday`, lệch quy ước | Nghi lỗi nhập liệu |
| T3 | Mở rộng export sang space BEF | **Đã chốt làm (2026-10-01)** — chờ phạm vi: cả space hay chỉ nhánh lending |
| T4 | Sản phẩm thẻ (6 sản phẩm) | Ngoài phạm vi, bổ sung khi cần |
| T5 | Mở rộng export Jira về trước 2024-06-01 | **Đã chốt làm (2026-10-01)** — chờ mốc thời gian cụ thể |

Chi tiết: `kb-po/ra-soat/open-questions.md`.
