---
title: Kênh DOP — webview Cake trong app đối tác
channel: dop
topic: channel
audience:
  - ops
  - po
sources:
  - confluence:1060929556
  - confluence:852792931
  - confluence:27918827
last_verified: 2026-10-01T00:00:00.000Z
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---
# Kênh DOP — webview Cake trong app đối tác

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Bản chất

Cake làm giao diện webview, nhúng vào app của đối tác. Khách **không rời app đối tác**
nhưng thực tế đang thao tác trên hệ thống Cake, và **khoản vay là của Cake**.

Đây là nguồn nhầm lẫn thường xuyên: khách nghĩ mình vay của đối tác.

## 2. Sản phẩm chạy kênh này

`VNP_cashloan` · `VNP_paylater` · `VNP_payday` · `Be_Cashloan` · `BE_payday` ·
`BE_paylater` · `MWG_cashloan` · `MWG_cl_online` · `MWG_paylater` · `MWG_payday` ·
`KLP_cashloan` · `VPO_cashloan` · `VPO_cl_pension` · `PD_Viettel` ·
`CAKE_cl_affiliate` · `MBF_cashloan` · `NGS_cashloan`

## 3. Đặc điểm

- Đối tác gọi API Cake để sinh link webview, sau khi qua bước kiểm tra sơ bộ.
- Đối tác truyền sang: số điện thoại, họ tên, ngày sinh, số giấy tờ, và **dữ liệu NFC** nếu có.
- Một số sản phẩm yêu cầu đối tác truyền **điểm tín dụng của đối tác**.
- Mỗi sản phẩm có cặp **DOP partner / DOP link** riêng — xem `_meta/product-matrix.md`.
- Ký hợp đồng: tuỳ sản phẩm, trên app đối tác hoặc app Cake (khi khách đã xác thực NFC).
- **Quản lý khoản vay và trả nợ chuyển sang app Cake** — xem `channels/cake-app.md`.

## 4. Còn thiếu

- [ ] Luồng màn hình DOP chi tiết theo từng bước
- [ ] Thông báo lỗi riêng của kênh DOP
- [ ] Khác biệt onboarding giữa các đối tác

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Nhầm lẫn phổ biến nhất**: khách tưởng vay của đối tác. Xác nhận rõ khoản vay là của Cake, đối tác chỉ là nơi khách bấm vào.
- Khách đăng ký trên app đối tác nhưng **trả nợ trên app Cake**. Rất nhiều khách không biết điều này — đặc biệt nhóm sản phẩm đã ngừng bán.
- Đối tác truyền sai dữ liệu định danh sẽ gây lỗi "hồ sơ không trùng khớp" — xem `reject-messages.md`.
- Khi khách báo lỗi, xác định **đang ở bước nào**: trong app đối tác, trong webview Cake, hay đã sang app Cake. Ba nơi xử lý khác nhau.


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- DOP là kênh có nhiều sản phẩm nhất (17/30). Thay đổi luồng chung ảnh hưởng diện rộng.
- Việc khách phải chuyển sang app Cake để trả nợ là điểm gãy trải nghiệm đã biết, đáng đo tỷ lệ rơi.


## 6. Số liệu kinh doanh

🔴 `hạn chế` · *Chưa có nội dung.*

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được khoản vay là của Cake, đối tác là kênh phân phối.
- Hướng dẫn được việc trả nợ trên app Cake.

**Không đọc cho khách:**

- Tên kênh "DOP", mã DOP partner / DOP link.
- Dữ liệu đối tác truyền sang, điểm tín dụng đối tác cung cấp.
- Thoả thuận giữa Cake và đối tác.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
| --- | --- | --- | --- |
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
