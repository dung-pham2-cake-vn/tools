---
title: Số liệu kinh doanh
audience: [po]
nhom: 4
last_verified: 2026-10-01
owner: dung.pham2
status: draft
coverage: none
---

# Số liệu kinh doanh

🔴 `hạn chế` — chỉ PO.

Không lấy được từ Confluence/Jira. Số do PO gửi, tôi tổng hợp vào đây.

> Trước đây tách 33 file theo từng sản phẩm — **bỏ cách đó**. Số liệu gửi rải rác
> và không phủ hết sản phẩm, tách sẵn 33 file rỗng chỉ tạo rác.
> Giờ gom một chỗ, đủ nhiều cho một sản phẩm thì mới tách file riêng.

## Bắt buộc khi ghi

Mỗi con số phải có **kỳ số liệu** và **nguồn**. Số kinh doanh cũ nguy hiểm hơn số kỹ thuật cũ —
lãi suất sai thì khách phát hiện ngay, còn số kinh doanh sai thì đi thẳng vào quyết định.

| Ngày ghi | Sản phẩm | Chỉ tiêu | Giá trị | Kỳ | Nguồn |
|---|---|---|---|---|---|
| | | | | | |

## Số đã có sẵn trong KB

Lấy từ bảng Partnership products, tính đến **18/08/2026** — dùng để biết sản phẩm nào còn dư nợ:

| Sản phẩm | Write-off | Giải ngân | Ghi chú |
|---|---|---|---|
| `NGS_cashloan` | **4.569** | 373 | Đã ngưng, dư nợ lớn nhất danh mục |
| `FPT_paylater` | 371 | 470 | Sắp ngưng · temp_lock 32, perm_lock 53 |
| `VDS_cashloan_LP` | 317 | 58 | Đã ngưng |
| `VTPO_cashloan` | 11 | 48 | Sắp ngưng |
| `VNHUB_cashloan` · `VDS_paylater_epass` · `VDS_bikeloan` · `GSM_bikeloan` · `PD_CAKEVNPT_NEW` | 0 | 0 | Dư nợ ~0 |

Nguồn: `confluence:27918827`.
