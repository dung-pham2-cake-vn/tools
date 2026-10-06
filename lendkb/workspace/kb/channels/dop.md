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
  - spec:open_api_viewer/specs
last_verified: 2026-10-06
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---
# Kênh DOP — webview Cake trong app đối tác

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
- Mỗi sản phẩm có cặp **DOP partner / DOP link** riêng — xem [[kb/product-matrix]].
- Ký hợp đồng: tuỳ sản phẩm, trên app đối tác hoặc app Cake (khi khách đã xác thực NFC).
- **Quản lý khoản vay và trả nợ: tuỳ sản phẩm, tuỳ đối tác** — xem mục 4.

## 4. Xem khoản vay và trả nợ

Không phải mọi sản phẩm DOP đều bắt khách sang app Cake. Nhiều đối tác gọi API Cake để
hiện khoản vay và cho trả nợ **ngay trên app đối tác**. Có ba kiểu:

| Kiểu | API | Khách làm gì |
|---|---|---|
| Xem khoản vay | `get-loan-detail` · `generate-webview/loan-detail` | `get-loan-detail`: đối tác tự hiện dư nợ, kỳ hạn trên app của họ. `generate-webview/loan-detail`: đối tác mở **webview quản lý khoản vay của Cake** ngay trong app đối tác — trong đó có thể có cả trả nợ, chuyển đổi trả góp |
| Trả nợ qua VAN | `repayment-van` | Đối tác hiện mã QR / số tài khoản định danh do Cake sinh. Khách chuyển khoản **thẳng cho Cake**, đối tác không giữ tiền — luồng ở [[kb/operations/luong-van]] |
| Đối tác thu hộ | `repayment-request` + `repayment-confirm` | Khách trả bằng tiền trong ví/app đối tác. Đối tác báo Cake gạch nợ |

Theo spec API của từng đối tác (`open_api_viewer/specs/`, bản 2026-09):

| Sản phẩm DOP | Xem khoản vay | Trả nợ trên app đối tác |
|---|---|---|
| `Be_Cashloan`, `BE_payday` | `get-loan-detail` | VAN |
| `MWG_paylater` | Webview quản lý khoản vay (`generate-webview/loan-detail`) — xem lịch sử giao dịch, số dư | VAN, ngay trong webview. Chuyển đổi trả góp cũng làm trong webview |
| `PD_Viettel` | `get-loan-detail` | Đối tác thu hộ |
| Các sản phẩm DOP còn lại | **chưa có spec riêng** | **Chưa rõ** — tra trang sản phẩm hoặc hỏi PO |

App Cake vẫn là kênh trả nợ chung — xem [[kb/channels/cake-app]]. Sản phẩm đã ngừng bán
thì **chỉ** còn app Cake, vì kết nối với đối tác đã đóng.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Nhầm lẫn phổ biến nhất**: khách tưởng vay của đối tác. Xác nhận rõ khoản vay là của Cake, đối tác chỉ là nơi khách bấm vào.
- Khách hỏi trả nợ ở đâu → **xác định sản phẩm trước** (mục 4). Có đối tác cho trả ngay trên app của họ, có đối tác thì không. Sản phẩm đã ngừng bán thì chỉ còn app Cake — nhiều khách không biết điều này.
- Khách báo đã trả trên app đối tác nhưng chưa gạch nợ: kiểu VAN → [[kb/operations/luong-van]]; kiểu đối tác thu hộ → kiểm tra đối tác đã gọi đủ `repayment-request` + `repayment-confirm` chưa ([[kb/operations/ma-loi-api]]).
- Đối tác truyền sai dữ liệu định danh sẽ gây lỗi "hồ sơ không trùng khớp" — xem [[kb/reject-messages]].
- Khi khách báo lỗi, xác định **đang ở bước nào**: trong app đối tác, trong webview Cake, hay đã sang app Cake. Ba nơi xử lý khác nhau.

## Dành cho CSKH

🟢 `khách`

- Giải thích được khoản vay là của Cake, đối tác là kênh phân phối.
- Hướng dẫn được việc trả nợ trên app Cake.
- Nói được khách có trả nợ ngay trên app đối tác được không — **chỉ khi mục 4 ghi rõ** cho sản phẩm đó.

**Không đọc cho khách:**

- Tên kênh "DOP", mã DOP partner / DOP link.
- Dữ liệu đối tác truyền sang, điểm tín dụng đối tác cung cấp.
- Thoả thuận giữa Cake và đối tác.
