---
title: Kênh Native API — đối tác tự làm app
channel: native-api
topic: channel
audience: [ops, po]
sources:
  - confluence:1058504829
  - confluence:1060012033
  - confluence:27918827
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Kênh Native API — đối tác tự làm app

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Bản chất

Đối tác **tự xây toàn bộ giao diện** trên app của họ, gọi API Cake ở phía sau.
Khác DOP: ở DOP giao diện là của Cake, ở đây giao diện là của đối tác.

Khoản vay vẫn là của Cake.

## 2. Sản phẩm chạy kênh này

`Viettel_Cashloan` · `VT_Cashloan_S` · `VT_Payday_S` · `VDS_paylater` ·
`MISA_cashloan` · `ZLP_cashloan` · `ZLP_payday` · `FPT_paylater` ·
`VNHUB_cashloan` · `VDS_paylater_epass` · `VTPO_cashloan`

## 3. Hệ quả cho CSKH

- **Cake không kiểm soát giao diện.** Khách mô tả màn hình, nút bấm, thông báo —
  những thứ đó do đối tác làm, Cake không có tài liệu màn hình.
- Lỗi hiển thị, lỗi thao tác trên app đối tác → **hướng khách liên hệ đối tác**.
- Lỗi về khoản vay, số tiền, dư nợ, trạng thái → Cake xử lý.
- Quản lý khoản vay và trả nợ vẫn chuyển sang **app Cake**.

## 4. Còn thiếu

- [ ] Danh sách mã lỗi API trả về đối tác và ý nghĩa với khách
- [ ] Ranh giới trách nhiệm Cake / đối tác theo từng loại sự cố

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Phân định trách nhiệm là việc khó nhất ở kênh này.** Quy tắc nhanh: vấn đề về *giao diện và thao tác* → đối tác; vấn đề về *tiền, dư nợ, trạng thái khoản vay* → Cake.
- Cake **không có tài liệu màn hình** của app đối tác. Đừng hướng dẫn khách bấm nút cụ thể theo trí nhớ — dễ sai.
- Khách vẫn phải sang app Cake để trả nợ, kể cả khi đăng ký hoàn toàn trên app đối tác.
- Đối tác truyền sai dữ liệu định danh gây lỗi "hồ sơ không trùng khớp".


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Kênh này Cake mất quyền kiểm soát trải nghiệm onboarding. Chất lượng phụ thuộc đối tác.
- Không có tài liệu màn hình từ phía đối tác là khoảng trống có hệ thống, ảnh hưởng cả CSKH lẫn QA.


## 6. Số liệu kinh doanh

🔴 `hạn chế` · *Chưa có nội dung.*

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được khoản vay là của Cake dù đăng ký trên app đối tác.
- Hướng dẫn được việc trả nợ trên app Cake.
- Hướng khách liên hệ đối tác với lỗi giao diện/thao tác trên app của họ.

**Không đọc cho khách:**

- Tên kênh "Native API", tên API, mã lỗi kỹ thuật.
- Dữ liệu đối tác truyền sang.
- Thoả thuận giữa Cake và đối tác.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
