---
title: Giá trị chính sách trích từ nguồn
audience: [po]
last_verified: 2026-10-02
owner: dung.pham2
status: reference
---

# Giá trị chính sách — trích tự động từ nguồn

Sinh bằng `tools/policy-values.mjs` từ **693 tài liệu có thông số chính sách**.
Gom theo (sản phẩm × chỉ tiêu), kèm số tài liệu nhắc tới và id để truy ngược.

## Dùng để làm gì

**Soi chỗ nguồn chọi nhau.** Một chỉ tiêu có nhiều giá trị khác nhau nghĩa là các tài liệu
không thống nhất — hoặc có giá trị cũ chưa ai xoá.

```bash
node tools/policy-values.mjs            # dựng lại
node tools/value-index.mjs "CAKEKLP01" tháng   # tra một giá trị cụ thể
```

> **Đây là dữ liệu thô, chưa duyệt.** Số đã xác minh nằm ở file sản phẩm trong
> `kb/products/`. Bảng này chỉ để tra và đối chiếu.

> Ticket công cụ cấu hình (`Product config tool`) đã bị loại — chúng khai ràng buộc
> hệ thống (vd `maxPrincipalAmount ≤ 100.000.000`), không phải giá trị sản phẩm.


### `BE_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| kỳ hạn | `30 ngày` · `45 ngày` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `15 phút` · `2 phút` · `5 phút` |

### `BE_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `3 triệu` · `4 triệu` · `200 triệu` · `90 triệu` · `1 triệu` |
| kỳ hạn | `60 tháng` · `36 tháng` · `1 Ngày` |
| tuổi | `50 tuổi` · `20 tuổi` · `18 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` · `3 ngày` |

### `Be_Cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `10 triệu` · `50 triệu` |
| kỳ hạn | `3 tháng` · `24 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` |

### `CAKE_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `100 triệu` · `5 triệu` · `30 triệu` · `10 triệu` · `40 triệu` |
| kỳ hạn | `3 tháng` · `48 tháng` · `36 tháng` · `1 tháng` · `60 tháng` · `24 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `15 phút` · `5 phút` · `30 phút` · `2 phút` · `1 phút` · `1phút` |

### `CAKE_cl_affiliate`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| kỳ hạn | `48 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `15 phút` |

### `CAKE_overdraft`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `100.000 vnd` |
| kỳ hạn | `6 tháng` · `12 tháng` |
| tuổi | `50 tuổi` · `20 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `15.000 vnd` |
| thời gian | `31 ngày` · `7 ngày` |

### `CAKE_overdraft_TD`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `100 triệu` · `10 triệu` · `5 triệu` |
| kỳ hạn | `12 tháng` · `60 tháng` · `6 tháng` · `1 tháng` |
| tuổi | `55 tuổi` · `76 tuổi` · `65 tuổi` · `50 tuổi` · `60 tuổi` · `70 tuổi` |
| thu nhập | `4 triệu` |
| thời gian | `1 phút` · `1phút` · `7 ngày` · `2 phút` · `15 phút` |

### `CAKE_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `3 triệu` · `6 triệu` · `100 triệu` |
| kỳ hạn | `30,45 ngày` · `30 ngày` · `45 ngày` |
| tuổi | `50 tuổi` · `55 tuổi` · `70 tuổi` · `60 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `FIZA_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `20 triệu` |
| kỳ hạn | `12 tháng` · `3 tháng` |

### `FIZA_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `3 triệu` · `1 triệu` |
| kỳ hạn | `15 ngày` |
| tuổi | `50 tuổi` |
| thời gian | `7 ngày` |

### `FPT_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `5.000.000 VND` |
| kỳ hạn | `60 tháng` |
| tuổi | `50 tuổi` · `55 tuổi` · `60 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` · `5,000,000 VND` |
| thời gian | `5 phút` · `3 ngày` · `7 ngày` |

### `GSM_bikeloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| kỳ hạn | `3 tháng` · `6 tháng` · `9 tháng` |

### `KLP_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `30 triệu` · `5,000,000 VND` · `1 triệu` |
| kỳ hạn | `36 tháng` · `3 tháng` · `6 tháng` |
| thời gian | `30 phút` · `2 phút` · `15 phút` · `7 ngày` |

### `KOV_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `10 triệu` |
| kỳ hạn | `12 tháng` · `3 tháng` · `48 tháng` · `6 tháng` |
| tuổi | `60 tuổi` |
| thời gian | `15 phút` · `60 phút` |

### `LCP_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `40 triệu` |
| kỳ hạn | `12 tháng` · `60 tháng` · `3 tháng` · `6 tháng` |
| thời gian | `30 phút` · `7 ngày` · `2 phút` · `15 phút` |

### `MBF_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5,000,000 VND` · `10,000,000 VND` · `40,000,000 VND` · `50,000,000 VND` |
| kỳ hạn | `3 tháng` · `48 tháng` · `6 tháng` · `1 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `1 phút` · `1phút` · `2 phút` · `15 phút` · `5 phút` |

### `MISA_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| tuổi | `60 tuổi` · `50 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` · `60 phút` |

### `MWG_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `4 triệu` · `2 triệu` · `100 triệu` · `1570 Đ` · `40 triệu` · `1 triệu` · `30 triệu` |
| kỳ hạn | `3 tháng` · `6 tháng` · `48 tháng` · `1 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `70 triệu` · `6 triệu` |
| thời gian | `7 ngày` · `5 phút` · `2 phút` |

### `MWG_cl_online`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` |
| kỳ hạn | `60 tháng` · `1 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` · `1 phút` · `1phút` · `5 phút` · `2 phút` |

### `MWG_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| kỳ hạn | `30 ngày` · `45 ngày` · `1 tháng` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `5 phút` · `2 phút` · `15 phút` |

### `MWG_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `25 triệu` · `40 triệu` |
| kỳ hạn | `60 tháng` · `3 tháng` · `1 Ngày` · `24 tháng` · `1 tháng` · `6 tháng` |
| tuổi | `50 tuổi` · `20 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5,000,000 VND` |
| thời gian | `5 phút` · `7 ngày` · `2 phút` · `1 phút` · `1phút` · `30 phút` |

### `NGS_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `4 triệu` · `2 triệu` · `100 triệu` · `200 triệu` · `12 triệu` · `30 triệu` · `10 triệu` · `70 triệu` |
| kỳ hạn | `36 tháng` · `6 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `20 triệu` · `12 triệu` · `18 triệu` · `6 triệu` · `3 triệu` |
| thời gian | `3 ngày` · `7 ngày` |

### `NGS_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `4 triệu` · `2 triệu` · `30 triệu` · `10 triệu` |
| kỳ hạn | `30 ngày` |

### `PD_CAKEVNPT_NEW`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `2 triệu` · `4 triệu` · `6 triệu` |
| kỳ hạn | `30 ngày` · `45 ngày` |

### `PD_Viettel`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `7 triệu` · `100 triệu` · `03 triệu` · `05 triệu` · `500,000 VND` · `03triệu` · `1570 Đ` · `3 triệu` |
| kỳ hạn | `7 Ngày` · `45 ngày` · `30 ngày` · `30 Ngày` · `7 ngày` · `14 ngày` · `21 ngày` · `14 Ngày` |
| tuổi | `50 tuổi` · `18 tuổi` · `55 tuổi` · `70 tuổi` · `60 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `5 phút` · `30 phút` |

### `VDS_bikeloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `10 triệu` · `70 triệu` |
| kỳ hạn | `12 tháng` · `6 tháng` · `36 tháng` |
| tuổi | `20 tuổi` · `50 tuổi` |

### `VDS_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `5.000.000 VND` · `3 triệu` · `2 triệu` · `1570 Đ` · `1 triệu` |
| kỳ hạn | `60 tháng` · `36 tháng` · `12 tháng` |
| tuổi | `50 tuổi` · `18 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` · `60 phút` |

### `VDS_paylater_epass`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `1 triệu` |
| kỳ hạn | `60 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `VNHUB_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `1 triệu` · `5,000,000 VND` |
| kỳ hạn | `3 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `60 phút` |

### `VNP_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `1 triệu` |
| kỳ hạn | `3 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` · `5 phút` |

### `VNP_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `3 triệu` · `5 triệu` |
| tuổi | `50 tuổi` · `55 tuổi` · `70 tuổi` · `60 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` |

### `VNP_paylater`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5.000.000 VND` · `5 triệu` · `03 đ` |
| kỳ hạn | `60 tháng` · `12 tháng` · `3 tháng` · `1 Ngày` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` · `20 tuổi` · `18 tuổi` |
| thời gian | `5 phút` · `7 ngày` · `60 phút` |

### `VPO_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `1 triệu` · `4 triệu` · `2 triệu` · `100 triệu` · `5 triệu` · `30 triệu` · `10 triệu` · `50 triệu` |
| kỳ hạn | `3 tháng` · `2 tháng` · `24 tháng` · `60 tháng` |
| tuổi | `65 tuổi` · `70 tuổi` · `60 tuổi` · `50 tuổi` · `76 tuổi` · `18 tuổi` · `55 tuổi` · `75 tuổi` |
| thu nhập | `4 triệu` · `5 triệu` |
| thời gian | `7 ngày` · `5 phút` |

### `VPO_cl_pension`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `1 triệu` |
| kỳ hạn | `3 tháng` · `60 tháng` · `2 tháng` · `24 tháng` |
| tuổi | `65 tuổi` · `70 tuổi` · `50 tuổi` · `76 tuổi` · `60 tuổi` · `55 tuổi` · `75 tuổi` · `72 tuổi` |
| thu nhập | `4 triệu` · `5 triệu` |
| thời gian | `1 phút` · `1phút` · `7 ngày` |

### `VTPO_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `30 triệu` · `35 triệu` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `VT_Cashloan_S`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `10 triệu` · `70 triệu` |
| kỳ hạn | `6 tháng` · `36 tháng` |
| tuổi | `50 tuổi` · `55 tuổi` · `60 tuổi` · `22 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `VT_Payday_S`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `2 triệu` · `30 triệu` · `10 triệu` |
| kỳ hạn | `45 ngày` · `36 tháng` · `12 tháng` · `30 ngày` |
| tuổi | `55 tuổi` · `50 tuổi` · `70 tuổi` · `22 tuổi` · `60 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `Viettel_Cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `5 triệu` · `30 triệu` · `09 Đ` |
| kỳ hạn | `3 tháng` · `36 tháng` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` · `18 tuổi` |
| thu nhập | `5 triệu` |
| thời gian | `7 ngày` · `15 phút` · `5 phút` |

### `ZLP_cashloan`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `1 triệu` · `40 triệu` · `15 triệu` · `3 triệu` · `70 triệu` · `30 triệu` · `10,000 VND` · `50 triệu` |
| kỳ hạn | `1 tháng` · `3 tháng` · `36 tháng` · `12 tháng` · `60 tháng` · `2 tháng` · `48 tháng` |
| tuổi | `50 tuổi` · `55 tuổi` · `70 tuổi` · `60 tuổi` · `76 tuổi` · `65 tuổi` |
| thời gian | `7 ngày` |

### `ZLP_payday`

| Chỉ tiêu | Giá trị tìm thấy trong nguồn |
|---|---|
| hạn mức | `10,000 VND` · `4 triệu` · `1 triệu` |
| kỳ hạn | `30 ngày` · `45 ngày` |
| tuổi | `50 tuổi` · `60 tuổi` · `55 tuổi` · `70 tuổi` · `76 tuổi` · `65 tuổi` |
| thu nhập | `5 triệu` · `4 triệu` |
| thời gian | `7 ngày` · `60 phút` |
