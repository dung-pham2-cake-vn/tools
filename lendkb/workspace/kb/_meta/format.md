---
title: Quy ước format file KB
last_verified: 2026-10-01
status: reference
---

# Format file sản phẩm

KB phục vụ **2 nhóm người dùng** — Ops (gồm cả CSKH) và PO — chia theo **4 nhóm nội dung**:

| Nhóm nội dung | Ops | PO | Nằm ở |
|---|---|---|---|
| 1. Thông tin sản phẩm | ✅ | ✅ | `kb/products/`, `kb/channels/` |
| 2. Ticket đã vận hành, hướng xử lý | ✅ | ✅ | `kb/operations/`, mục 4 trong file sản phẩm |
| 3. Core banking, GL, hạch toán | ❌ | ✅ | `kb-po/core/` |
| 4. Kinh doanh, tool dev | ❌ | ✅ | `kb-po/business/` |

Chi tiết ai đọc gì: `kb/README-nhom.md`.

**CSKH gộp vào Ops** — mục 7 trong file sản phẩm và `reject-messages.md` thuộc phạm vi Ops.

## Nguyên tắc quan trọng nhất: tách vùng tự sinh và vùng người viết

Phần thông số lấy từ Confluence/Jira **được script sinh lại** mỗi khi có export mới.
Phần kinh nghiệm do người viết **không bao giờ bị ghi đè**.

Ranh giới là hai dòng đánh dấu:

```markdown
<!-- AUTO:start --> ... nội dung script sinh ... <!-- AUTO:end -->
```

**Script chỉ được phép thay nội dung giữa hai dòng đó.** Mọi thứ bên dưới `AUTO:end`
là của người viết. Viết thêm vào vùng tự sinh sẽ mất ở lần export sau.

## Bố cục chuẩn

```markdown
---
title, product, partner, channel, product_status
audience: [ops, po]            # hoặc [po]
sources, numbers_source, numbers_asof, needs_jira_verify
status: draft / reviewed / approved
owner: dung.pham2
---

# <Tên sản phẩm>

<!-- AUTO:start -->
## 1. Nhận diện sản phẩm
## 2. Thông số sản phẩm
## 3. Luồng & cấu hình
<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops
## 5. Ghi chú sản phẩm — PO / Product
## 6. Số liệu kinh doanh
## 7. Dành cho CSKH
## 8. Lịch sử thay đổi
```

## Mức chia sẻ thông tin

Bản trước dùng một mục chung "Thông tin KHÔNG được nói với khách". Cách đó sai khi KB
phục vụ cả Ops và PO — với họ đó là thông tin cần dùng, không phải cấm.

Thay bằng nhãn **mức chia sẻ** gắn vào từng mục:

| Nhãn | Nghĩa |
|---|---|
| 🟢 `khách` | Nói trực tiếp với khách được |
| 🟡 `nội bộ` | Dùng để xử lý, **không đọc cho khách** |
| 🔴 `hạn chế` | Chỉ PO/Risk. Ops và CSKH không dùng |

Mục 7 (Dành cho CSKH) gom lại những gì 🟢, và liệt kê rõ ranh giới 🟡/🔴.

## Mục 4 — Ghi chú vận hành (Ops) · thuộc nhóm 2

Dành cho người viết. Gợi ý nội dung:

- Case hay gặp và cách xử lý
- Lỗi hệ thống đã biết, cách nhận diện
- Tra cứu ở đâu (Portal, bảng dữ liệu, dashboard)
- Khi nào escalate, escalate cho ai
- Mẹo rút ra từ thực tế

## Mục 5 — Ghi chú sản phẩm (PO / Product) · thuộc nhóm 1

Vẫn nằm trong `kb/` vì là kiến thức sản phẩm, Ops cũng cần đọc.
Phần nào thuộc core hoặc kinh doanh thì chuyển sang `kb-po/`.

- Vì sao chính sách được đặt như vậy
- Lịch sử thay đổi và lý do
- Ràng buộc hệ thống đang vướng
- Việc đang làm dở, backlog
- Khác biệt so với đối thủ

## Mục 6 — Số liệu kinh doanh

**Đã tách sang `kb-po/business/<product_id>.md`** (nhóm 4, chỉ PO).
Mục 6 trong file sản phẩm chỉ còn con trỏ.

Giải ngân, dư nợ, tỷ lệ duyệt, NPL, hiệu quả theo kênh.
**Ghi rõ kỳ số liệu và nguồn.** Số kinh doanh cũ nguy hiểm hơn số kỹ thuật cũ.

## Mục 8 — Lịch sử thay đổi

Mỗi dòng: ngày · đổi gì · ai · nguồn (ticket/page).
Khác với lịch sử đổi chính sách ở mục 2 — mục này ghi lịch sử của **file KB**.

## Quy tắc cho người viết

1. Không sửa vùng `AUTO`. Thấy số sai → sửa ở nguồn (Jira/Confluence) rồi chạy lại export.
2. Gắn nhãn mức chia sẻ cho mục mình thêm.
3. Số liệu kinh doanh phải có kỳ và nguồn.
4. Ghi một dòng vào mục 8 mỗi lần sửa.
