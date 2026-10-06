---
title: Dư nợ sản phẩm ngừng bán
audience: [po]
last_verified: 2026-10-06
owner: dung.pham2
status: draft
---

# Dư nợ sản phẩm ngừng bán

Số liệu tính đến **18/08/2026**. Tách khỏi [[kb/product-matrix]] mục C, D ngày 2026-10-06
— số kinh doanh, Ops không dùng để xử lý ticket.

## C. Sắp ngưng (4) — KH cũ vẫn trả nợ / tất toán được

| Đối tác | Sản phẩm | ProductId | Kênh | Onboarding source | Dư nợ còn |
|---|---|---|---|---|---|
| DataVN | cashloan | `VNHUB_cashloan` | api | `api_vnhub_cashloan` | 0 write-off, 0 disburse |
| FPT | paylater | `FPT_paylater` | api | `api_fpt_paylater` | **371 write-off, 470 disburse, 32 temp_lock, 53 perm_lock** |
| VDS | paylater ePass | `VDS_paylater_epass` | api | `vds_paylater_epass` | 0 write-off, 0 disburse |
| VDS | cashloan O2O | `VTPO_cashloan` | api | `api_vtpo_cashloan` | 11 write-off, 48 disburse |

## D. Đã ngưng (5) — đã xoá code

| Đối tác | Sản phẩm | ProductId | Dư nợ còn |
|---|---|---|---|
| NGS | cashloan | `NGS_cashloan` | **4.569 write-off, 373 disburse** |
| VDS | cashloan landing page | `VDS_cashloan_LP` | 317 write-off, 58 disburse |
| VDS | bikeloan | `VDS_bikeloan` | 0 / 0 |
| GSM (Vinfast) | bikeloan | `GSM_bikeloan` | 0 / 0 |
| VNPT | payday | `PD_CAKEVNPT_NEW` | 0 / 0 |

Bốn trang sản phẩm từng ghi số này trong thân bài (`VTPO_cashloan`, `NGS_cashloan`,
`FPT_paylater`, `VDS_paylater_epass`) — đã thay bằng mô tả định tính.
