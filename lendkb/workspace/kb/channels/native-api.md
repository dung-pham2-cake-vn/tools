---
title: Kênh Native API — đối tác tự làm app
channel: native-api
topic: channel
audience: [ops, po]
sources:
  - confluence:1058504829
  - confluence:1060012033
  - confluence:27918827
  - spec:open_api_viewer/specs
last_verified: 2026-10-06
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Kênh Native API — đối tác tự làm app

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
- Xem khoản vay và trả nợ: **tuỳ đối tác** — xem mục 4.

## 4. Xem khoản vay và trả nợ

Đối tác native gọi `get-loan-detail` để hiện khoản vay trên app của họ. Trả nợ thì
tuỳ đối tác: có nơi **thu hộ** (`repayment-request` + `repayment-confirm` — khách trả
bằng tiền trong ví/app đối tác, đối tác báo Cake gạch nợ), có nơi không có. Ba kiểu
API giải thích ở [[kb/channels/dop]] mục 4.

Theo spec API của từng đối tác (`open_api_viewer/specs/`, bản 2026-09):

| Sản phẩm | Xem khoản vay | Trả nợ trên app đối tác | Tất toán trên app đối tác |
|---|---|---|---|
| `ZLP_cashloan` | `get-loan-detail` | Đối tác thu hộ | Có (`terminate-review/request/confirm`) |
| `ZLP_payday` | `get-loan-detail` | Đối tác thu hộ | Chưa thấy API |
| Các sản phẩm còn lại | **chưa có spec riêng** | **Chưa rõ** — tra trang sản phẩm hoặc hỏi PO | |

App Cake vẫn là kênh trả nợ chung — xem [[kb/channels/cake-app]]. Sản phẩm đã ngừng bán
(`FPT_paylater`, `VNHUB_cashloan`, `VDS_paylater_epass`, `VTPO_cashloan`) thì **chỉ**
còn app Cake, vì kết nối với đối tác đã đóng.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Phân định trách nhiệm là việc khó nhất ở kênh này.** Quy tắc nhanh: vấn đề về *giao diện và thao tác* → đối tác; vấn đề về *tiền, dư nợ, trạng thái khoản vay* → Cake.
- Cake **không có tài liệu màn hình** của app đối tác. Đừng hướng dẫn khách bấm nút cụ thể theo trí nhớ — dễ sai.
- Khách hỏi trả nợ ở đâu → **xác định sản phẩm trước** (mục 4). ZaloPay cho trả ngay trên app ZaloPay; sản phẩm đã ngừng bán thì chỉ còn app Cake.
- Khách báo đã trả trên app đối tác nhưng chưa gạch nợ → kiểm tra đối tác đã gọi đủ `repayment-request` + `repayment-confirm` chưa ([[kb/operations/ma-loi-api]]).
- Đối tác truyền sai dữ liệu định danh gây lỗi "hồ sơ không trùng khớp".

## Dành cho CSKH

🟢 `khách`

- Giải thích được khoản vay là của Cake dù đăng ký trên app đối tác.
- Hướng dẫn được việc trả nợ trên app Cake.
- Nói được khách có trả nợ ngay trên app đối tác được không — **chỉ khi mục 4 ghi rõ** cho sản phẩm đó.
- Hướng khách liên hệ đối tác với lỗi giao diện/thao tác trên app của họ.

**Không đọc cho khách:**

- Tên kênh "Native API", tên API, mã lỗi kỹ thuật.
- Dữ liệu đối tác truyền sang.
- Thoả thuận giữa Cake và đối tác.
