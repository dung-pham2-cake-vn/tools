---
title: Hướng dẫn dùng KB Lending
last_verified: 2026-10-06T00:00:00.000Z
audience:
  - ops
  - po
owner: dung.pham2
status: draft
---
# KB Lending — hướng dẫn cho AI agent CSKH

## Ba file phải biết trước

| File | Khi nào mở |
| --- | --- |
| [[kb/index]] | **Luôn mở đầu tiên** — catalog mọi trang, một dòng mỗi trang. Biết trang nào đáng đọc rồi mới đọc |
| [[kb/product-matrix]] | Xác định khách đang dùng sản phẩm nào |
| [[kb/operations/README]] | Gặp ticket vận hành — quy trình, mã lỗi, case mẫu |

`kb/` chỉ chứa kiến thức **sản phẩm và vận hành** — thứ cần để trả lời khách và xử lý
ticket. Cách lấy dữ liệu, số kinh doanh, core/GL, bảo trì wiki nằm ở `kb-po/`, Ops không dùng.
Người **sửa** KB đọc `kb-po/SCHEMA` trước.

## Thứ tự ưu tiên khi đọc

Khi câu hỏi liên quan tới một khoản vay cụ thể, đọc theo thứ tự này. File sau **ghi đè** file trước:

0. [[kb/reject-messages]] — **nếu khách nhắc lại một thông báo lỗi**, tra đây trước tiên
0b. `products/<product>/faq.md` — **câu hỏi chung, chưa gắn khoản vay cụ thể** (trả khi nào, tất toán thế nào…). FAQ còn `draft`, suy từ tài liệu sản phẩm, chưa đối chiếu case thật — dùng làm khung, số liệu vẫn lấy theo các bước dưới
1. [[kb/glossary]] — hiểu thuật ngữ trong câu hỏi
2. `products/<product>/overview.md` — sản phẩm đó là gì
3. `products/<product>/<topic>.md` — onboarding hoặc loan-management
4. `channels/<channel>.md` — đặc thù kênh khách đang dùng
5. `products/<product>/partners/<partner>/*.md` — **điểm khác biệt của đối tác, ưu tiên cao nhất**

Nếu file đối tác mâu thuẫn file sản phẩm chung → **theo file đối tác**.

## Xác định sản phẩm của khách

Tra [[kb/product-matrix]]. Ba đầu mối thường có sẵn:

- **Onboarding source** (vd `cake_cashloan`, `dop_be_paylater`) → ra đúng một dòng
- **Contract type** (vd `CAKE_CASHLOAN`) → có thể trùng giữa vài sản phẩm, cần thêm đầu mối
- **Tên app khách đang dùng** → suy ra đối tác

Chưa xác định được sản phẩm thì **không trả lời con số nào** (lãi, phí, hạn mức) — hỏi lại khách hoặc chuyển nhân viên.

## Nguyên tắc bắt buộc

1. **Không đoán số.** Lãi suất, phí, hạn mức, kỳ hạn khác nhau theo sản phẩm và theo phân nhóm khách. Không có trong KB → escalate.
2. **Không tự tính tiền cho khách.** Số dư, số tiền tất toán phải lấy từ hệ thống, không tự suy ra từ công thức trong KB. Công thức trong KB là để agent hiểu bản chất, không phải để báo số cho khách.
3. **Tôn trọng nhãn mức chia sẻ** (bảng dưới) và mục *Dành cho CSKH* trong từng file — tuân thủ tuyệt đối.
4. **Trường `last_verified` quá 6 tháng** → coi là có thể đã cũ, cảnh báo khi trả lời về số liệu.
5. File `status: draft` là **chưa được duyệt** — không dùng để trả lời khách về lãi/phí.

## Mức chia sẻ trong từng file

| Nhãn | Nghĩa |
| --- | --- |
| 🟢 `khách` | Nói trực tiếp với khách được |
| 🟡 `nội bộ` | Ops dùng để xử lý, **không đọc cho khách** |
| 🔴 `hạn chế` | Chỉ PO — không có trong `kb/` |

CSKH gộp vào Ops: mục *Dành cho CSKH* trong file sản phẩm và [[kb/reject-messages]] thuộc phạm vi Ops.

## Con số khác nhau theo sản phẩm

Đừng suy con số của sản phẩm này sang sản phẩm khác. Vài ví dụ thật:



| Lãi suất | 0% (`VT_Payday_S`, `FPT_paylater`) → 60% (`BE_payday`, `ZLP_payday`) |
| Hạn mức | 1 triệu (`BE_paylater`) → 300 triệu (`VPO_cl_pension`) |
| Tuổi | 18–50 (`BE_payday`) · 20–50 (đa số) · 20–60 (`MISA_cashloan`) |
| Phí tất toán | 0% (nhóm Payday) · 2%/0% theo kỳ hạn (`VPO_cl_pension`) · 5% (`MISA_cashloan`) · **8%/5% (nhóm Cashloan theo PL-9170)** · Vnpost & NGS ghi 3% nhưng **chưa xác nhận** |
| Bảo hiểm | bắt buộc (`BE_payday`, `ZLP_payday`, `VPO_cl_pension`) · không có (`MISA_cashloan`) · tự chọn (còn lại) |

Luôn xác định đúng `product_id` trước khi trả lời bất kỳ con số nào.

## Sản phẩm ngừng bán

Khách có khoản vay thuộc sản phẩm đã/sắp ngừng (xem [[kb/product-matrix]] mục C, D):

- Vẫn **thanh toán và tất toán được, qua app Cake**.
- Chỉ luồng API với đối tác bị đóng, không phải khả năng trả nợ.
- Hướng khách theo [[kb/channels/cake-app]], **không** hướng quay lại app đối tác.
- Không mở khoản vay mới cho các sản phẩm này.

## Phạm vi

KB này **chỉ phủ sản phẩm cho vay**. Sản phẩm thẻ (Debit Card, CC Be, CC affiliate, CC VDS, CC Zalo) **không** thuộc phạm vi — gặp câu hỏi về thẻ thì chuyển nhân viên.
