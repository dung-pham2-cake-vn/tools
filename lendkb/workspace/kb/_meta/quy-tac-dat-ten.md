---
title: Quy tắc đặt tên sản phẩm — dùng để rà tài liệu
audience: [ops, po]
last_verified: 2026-10-01
owner: dung.pham2
status: reference
---

# Quy tắc đặt tên sản phẩm

Một sản phẩm được gọi bằng **4 kiểu tên khác nhau** trong tài liệu. Bỏ sót kiểu nào
là rà sót tài liệu — đã xảy ra 3 lần, xem mục "Lỗi đã mắc".

| Kiểu tên | Ví dụ | Xuất hiện ở |
|---|---|---|
| **product_id** | `Viettel_Cashloan`, `MBF_cashloan` | Bảng Partnership products, tiêu đề ticket |
| **product_code** | `NS_SLVT_01`, `CLMWGR01`, `PLBE_02` | Trang Product Policy, ticket cấu hình core |
| **Tên theo quy ước tiêu đề** | `[Partner][Viettel] - Cashloan` | Tiêu đề page Confluence |
| **Mã nội bộ / tên dự án** | `VDS-O2O`, `ODTD_v2`, `QTV` | Tiêu đề ticket, tên epic |

## Cách nhận diện đang dùng

Hai tín hiệu độc lập, hợp lại — `tools/match-products.mjs` và `tools/build-index.mjs`:

1. **Khớp nguyên văn** `product_id` / `product_code` / mã nội bộ ở **bất kỳ đâu** trong tài liệu.
   Quét cả phần thân, vì tài liệu liệt kê 10 sản phẩm thì phải nhận đủ 10.
2. **Cặp (đối tác × loại sản phẩm)** suy từ **tiêu đề và breadcrumb**, không quét thân.
   Thân tài liệu hay nhắc sản phẩm khác để tham chiếu.

## Bảng product_code

89 mã của 25 sản phẩm, thu tự động bằng `tools/harvest-codes.mjs`
từ các trang Product Policy. Chỉ lấy từ trang gắn **đúng một** sản phẩm, và kiểm chéo
với trường `partner` trong file KB để loại mã của sản phẩm khác lọt vào.

| ProductId | product_code |
|---|---|
| `BE_paylater` | `PLBE_01` · `PLBE_02` |
| `Be_Cashloan` | `BECL01` · `BECL02` · `BECL03` · `BECL04` |
| `CAKE_cashloan` | `CAKEM01` · `CAKEP01` · `CAKEP02` · `CAKEP03` · `CAKER01` · `CAKEU01` |
| `FIZA_cashloan` | `FIZACL01` |
| `FIZA_payday` | `FIZAPD01` |
| `FPT_paylater` | `PLFPT_01` · `PLFPT_02` |
| `KLP_cashloan` | `CAKEKLP01` |
| `LCP_paylater` | `LCPL_01` |
| `MBF_cashloan` | `MBFCLN01` · `MBFCLR01` · `MBFCLU01` · `MBFCLX01` |
| `MISA_cashloan` | `CLMIS01` |
| `MWG_cashloan` | `CLMWGR01` · `MWGSL01` |
| `MWG_payday` | `QTVPD01` · `QTVPD02` |
| `MWG_paylater` | `PLMWG_01` |
| `NGS_cashloan` | `CLNGSI01` · `CLNGSI02` · `CLNGSI03` |
| `PD_Viettel` | `NONVTPD_01` · `NONVTPD_02` |
| `VDS_bikeloan` | `VFVT_01` · `VFVT_02` · `VFVT_03` |
| `VDS_paylater` | `PLVT_01` · `PLVT_03` |
| `VDS_paylater_epass` | `PLVT_03` |
| `VNHUB_cashloan` | `CLVNEID01` |
| `VNP_cashloan` | `CLVNP01` |
| `VNP_paylater` | `PLVNP_02` |
| `VTPO_cashloan` | `CLVTPP01` |
| `Viettel_Cashloan` | `CAKEM01` · `CAKEP01` · `NS_SLVT_01` · `NS_SLVT_02` · `NS_SLVT_03` · `NS_SLVT_04` · `NS_SLVT_05` · `NS_SLVT_06` · `NS_ULVT_01` · `NS_ULVT_02` · `NS_ULVT_03` · `NS_ULVT_04` … |
| `ZLP_cashloan` | `ZLPCL01` |
| `ZLP_payday` | `ZLPPD01` |

## Quy luật đọc được từ mã

| Tiền tố | Nghĩa |
|---|---|
| `CL…` | Cashloan — `CLMWGR01`, `CLVNP01`, `CLMIS01`, `CLVTPP01`, `CLVNEID01` |
| `PL…` | Paylater — `PLBE_01`, `PLVT_03`, `PLMWG_01`, `PLFPT_02`, `PLVNP_02` |
| `…PD…` | Payday — `QTVPD01`, `ZLPPD01`, `FIZAPD01`, `NONVTPD_01` |
| `NS_` | Viettel, bộ mã mới (new scheme) |
| `NONVT` | Khách SIM ngoại mạng của Viettel |
| `QTV` | MWG, kênh Quản Trị Viên |
| Hậu tố `N/R/U/X` | New · Repeat · Upsell · Xsell — `MBFCLN01`, `MBFCLR01`, `MBFCLU01`, `MBFCLX01` |

## Lỗi đã mắc — đừng lặp

| # | Lỗi | Hậu quả |
|---|---|---|
| 1 | Khớp `product_id` nguyên khối | Trang `[Partner][Viettel] - Cashloan - Product Policy` map ra rỗng |
| 2 | Không biết mã nội bộ | `VDS-O2O`, `ODTD_v2` không khớp được gì |
| 3 | Xếp ticket theo ngày mới nhất | Ticket khai sinh sản phẩm (chứa bảng policy đầy đủ) bị đẩy xuống đáy |
| 4 | Dò policy chỉ theo bảng markdown | Bỏ sót 20 tài liệu viết policy dạng văn xuôi |
| 5 | `\b` không khớp qua dấu `_` | `\bMBF\b` không khớp `MBF_cashloan` |
| 6 | Quét thân để suy cặp đối tác × loại | Ticket MWG bị gán cho cả ZLP và VNP |
| 7 | Suy đối tác từ chuỗi `product_id` | Không suy được `Viettel_Cashloan` → `vds`, nên không loại được mã Cake lọt vào |

**Lỗi 7 sửa bằng cách**: lấy đối tác từ trường `partner` trong frontmatter file KB,
không suy từ chuỗi. Dữ liệu đã có sẵn thì đừng đoán lại.

## Khi thêm sản phẩm mới

1. Thêm vào `_meta/product-matrix.md`
2. `node tools/gen-kb-skeleton.mjs` — sinh file khung
3. `node tools/harvest-codes.mjs` — thu `product_code` từ trang Product Policy
4. `node tools/build-index.mjs` — index lại
5. `./tools/refresh.sh --no-pull` — xem có ticket nào chưa phủ

## Tra theo GIÁ TRỊ, không chỉ theo từ khoá

`tools/value-index.mjs` index **8.890 cặp "con số + đơn vị"** trong `raw/`, kèm ngữ cảnh.

```bash
node tools/value-index.mjs                         # dựng index
node tools/value-index.mjs "payment-request" phút  # tra giá trị
node tools/value-index.mjs "tất toán" %
```

**Vì sao cần**: cả 7 lần quét sót trước đây đều **không phải do chưa đọc tài liệu**,
mà do tìm sai hình thức diễn đạt. Ví dụ tôi tìm `expired_time`, `session`, `timeout`
trong khi ticket viết *"thời gian valid = 5 phút"*. Index theo giá trị không phụ thuộc
cách người viết diễn đạt.

**Kiểm chứng**: chạy thử trên 3 ca từng sót, cả 3 đều ra ngay. Và lộ thêm một khác biệt
chưa ai ghi: OTP của `VDS_paylater_epass` là **1 phút**, `MWG_paylater` là **2 phút**.

## Còn hở

Vẫn là khớp mẫu. Tài liệu đặt tên hoàn toàn ngoài 4 kiểu trên vẫn lọt.
Phát hiện cách gọi mới thì thêm vào `tools/product-aliases.json` rồi index lại.

