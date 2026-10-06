---
title: Quy ước format file KB
last_verified: 2026-10-06
audience: [po]
status: reference
---

# Format file sản phẩm

KB phục vụ **2 nhóm người dùng** — Ops (gồm cả CSKH) và PO — chia theo **4 nhóm nội dung**:

| Nhóm nội dung | Ops | PO | Nằm ở |
|---|---|---|---|
| 1. Thông tin sản phẩm | ✅ | ✅ | `kb/products/`, `kb/channels/` |
| 2. Ticket đã vận hành, hướng xử lý | ✅ | ✅ | `kb/operations/`, mục *Ghi chú vận hành — Ops* trong file sản phẩm |
| 3. Core banking, GL, hạch toán | ❌ | ✅ | `kb-po/core/` |
| 4. Kinh doanh, tool dev | ❌ | ✅ | `kb-po/business/` |
| 5. Việc của PO: ghi chú PO, còn thiếu, đối chiếu nguồn, bảo trì wiki | ❌ | ✅ | `kb-po/san-pham/`, `kb-po/ra-soat/`, `kb-po/bao-tri/` |

Ranh giới đầy đủ: [[kb-po/SCHEMA]] mục *Ranh giới*. Mục lục vùng PO: [[kb-po/README]].

**`kb/` chỉ chứa kiến thức sản phẩm và vận hành.** Việc của PO — soạn ticket, rà
soát nguồn, đối chiếu Confluence, số kinh doanh, core/GL — nằm ở `kb-po/`.
`node tools/kb-lint.mjs` kiểm tra ranh giới này bằng máy.

### Một ngoại lệ về GL

[[kb/operations/luong-van]] có mã GL `3592170000` dù GL thuộc nhóm 3 (chỉ PO).
Giữ lại **có chủ đích**: ở đó GL là **mốc định tuyến** — nhìn GL có debit mà không
có credit thì biết chuyển Liab chứ không phải Lending. Đó là kiến thức vận hành,
không phải kiến thức hạch toán. Bỏ đi thì trang mất hết giá trị.

Ngoại lệ chỉ áp dụng khi mã GL dùng để **quyết định chuyển ticket cho ai**.
Bút toán, cấu hình hạch toán, đối ứng tài khoản vẫn thuộc `kb-po/core/`.

**CSKH gộp vào Ops** — mục *Dành cho CSKH* trong file sản phẩm và [[kb/reject-messages]] thuộc phạm vi Ops.

## Nguyên tắc quan trọng nhất: tách vùng tự sinh và vùng người viết

Không còn vùng tự sinh (bỏ marker `AUTO:` ngày 2026-10-06). Thông số lấy từ
Confluence/Jira do **agent đọc nguồn rồi sửa**, theo chu trình tháng ở [[kb-po/SCHEMA]].
Script chỉ kéo nguồn và báo trang cần rà.

## Bố cục chuẩn

```markdown
---
title, product, partner, channel, product_status
audience: [ops, po]
sources, numbers_source, numbers_asof, needs_jira_verify
status: draft / reviewed / approved
owner: dung.pham2
---

# <Tên sản phẩm>

## 1. Nhận diện sản phẩm
## 2. Thông số sản phẩm
## 3. Luồng & cấu hình

## Ghi chú vận hành — Ops
## Dành cho CSKH
```

Từ 2026-10-06, file trong `kb/` **không còn** các mục sau — chúng nằm ở `kb-po/`:

| Mục cũ | Giờ ở đâu |
|---|---|
| 5. Ghi chú sản phẩm — PO / Product | [[kb-po/san-pham/ghi-chu-po]] |
| 6. Số liệu kinh doanh | [[kb-po/business/README]] |
| 8. Lịch sử thay đổi (của file KB) | `git log`, và [[kb-po/bao-tri/log]] |
| "Còn thiếu" / "Cần viết" | [[kb-po/ra-soat/con-thieu]] |
| Dòng "Đối chiếu Jira …" | [[kb-po/ra-soat/doi-chieu-jira]] |

Hai mục Ops/CSKH bỏ số thứ tự để không lệch khi phần thông số thêm/bớt mục.

## Mức chia sẻ thông tin

Bản trước dùng một mục chung "Thông tin KHÔNG được nói với khách". Cách đó sai khi KB
phục vụ cả Ops và PO — với họ đó là thông tin cần dùng, không phải cấm.

Thay bằng nhãn **mức chia sẻ** gắn vào từng mục:

| Nhãn | Nghĩa |
|---|---|
| 🟢 `khách` | Nói trực tiếp với khách được |
| 🟡 `nội bộ` | Dùng để xử lý, **không đọc cho khách** |
| 🔴 `hạn chế` | Chỉ PO/Risk. Ops và CSKH không dùng — **không đặt trong `kb/`** |

Mục *Dành cho CSKH* gom lại những gì 🟢, và liệt kê rõ ranh giới 🟡/🔴.

## Mục Ghi chú vận hành (Ops) · thuộc nhóm 2

Dành cho người viết. Gợi ý nội dung:

- Case hay gặp và cách xử lý
- Lỗi hệ thống đã biết, cách nhận diện
- Tra cứu ở đâu (Portal, màn hình nào)
- Khi nào escalate, escalate cho ai
- Mẹo rút ra từ thực tế

## Quy tắc cho người viết

1. Thấy số sai → đối chiếu Jira trước khi sửa, ghi lý do vào [[kb-po/bao-tri/lich-su-quyet-dinh]]. Nguồn chọi nhau → [[kb-po/ra-soat/can-confirm]], không tự chọn.
2. Gắn nhãn mức chia sẻ cho mục mình thêm.
3. Số liệu kinh doanh không ghi vào `kb/` — để ở `kb-po/business/`, kèm kỳ và nguồn.
4. Ghi một dòng vào [[kb-po/bao-tri/log]] mỗi lần sửa.
