---
title: Kênh app Cake
channel: cake-app
topic: channel
sources:
  - confluence:1042743307
  - confluence:1058537573
  - confluence:27918827
  - confluence:198148097
last_verified: 2026-09-30
audience: [ops, po]
owner: dung.pham2
status: draft
---

## Tóm tắt

Khách thao tác trực tiếp trên app Cake: xem khoản vay, tra dư nợ, thanh toán, tất toán.
Luồng này **dùng chung cho mọi sản phẩm lending trên app Cake** — spec nằm ở ticket mẫu
`[MOBILE] Mobile App & Cake Portal` (`confluence:1042743307`).

Đây cũng là kênh trả nợ của **mọi khách có khoản vay thuộc sản phẩm đã ngừng bán**.

## Sản phẩm dùng kênh này

| Sản phẩm | ProductId |
|---|---|
| Cashloan | `CAKE_cashloan` |
| Payday | `CAKE_payday` |
| Overdraft | `CAKE_overdraft` |
| Overdraft có bảo đảm | `CAKE_overdraft_TD` |
| MWG Paylater (phần chi tiêu) | `MWG_paylater` |

## Tab Khoản vay — danh sách

Mỗi khoản vay là một thẻ. Nhãn trạng thái khách nhìn thấy:

| Nhãn trên app | Màu | Trạng thái hệ thống | Nghĩa |
|---|---|---|---|
| Chờ xác nhận hợp đồng | — | APPROVED | Đã duyệt, chưa ký hợp đồng (hiện trong 7 ngày) |
| Đang hoạt động | Xanh | ACTIVE | Khoản vay bình thường |
| Quá hạn | Cam | IN_ARREARS | Đang trả chậm |
| Thu hồi nợ | Đỏ | WRITE_OFF | Xem mục cảnh báo bên dưới |
| Khoá | — | TEMP_LOCK · **TEMP_LOCK_FRAUD** · PERM_LOCK | Xem mục khoá bên dưới |
| Chưa đăng ký | — | — | Khách đã từ chối ký hợp đồng |

Thẻ Cashloan hiển thị `Kỳ {kỳ hiện tại}/{tổng kỳ}: {số tiền}`.
Payday hiển thị `Số tiền {số tiền}`. OD hiển thị `Dư nợ: {số tiền}`.

> **"Thu hồi nợ" là nhãn khách nhìn thấy khi khoản vay ở trạng thái write-off.**
> Khách hỏi nhãn này nghĩa gì: đây là khoản nợ đang trong quá trình thu hồi,
> **khách vẫn còn nghĩa vụ trả nợ đầy đủ**. Tuyệt đối không nói là đã xoá nợ,
> không giải thích cơ chế kế toán. Khách thắc mắc tiếp → escalate.

## Màn hình Chi tiết khoản vay

Khách bấm vào thẻ để xem. Với Cashloan, màn hình có:

- Số tiền cần thanh toán
- Mã hợp đồng, **Mã thanh toán**
- Ngày đến hạn thanh toán
- Trạng thái khoản vay
- Tổng số tiền giải ngân
- Bảo hiểm khoản vay: Có / Không
- Thời hạn vay phê duyệt
- Lãi suất/năm
- Số tiền thanh toán/tháng
- Kỳ thanh toán (dạng `xx/yy`)
- Dư nợ gốc, Dư nợ lãi phát sinh, Số tiền đã thanh toán
- Nếu quá hạn, có thêm: **Lãi phạt gốc quá hạn** và **Số ngày quá hạn**
- Nút **Thanh toán**
- Icon hợp đồng ở góc trên bên trái → mở màn hình Hợp đồng khoản vay

**Dùng màn hình này để trả lời khách** thay vì tự tính. Khách hỏi dư nợ, tiền phạt,
ngày đến hạn — hướng dẫn khách tự xem tại đây.

## Thanh toán khoản vay

1. Bấm **Thanh toán** ở màn Chi tiết khoản vay.
2. Chọn **nguồn tiền** — mặc định Tài khoản thanh toán (CASA); có thể có Cashback.
3. Chọn **hình thức**: **Toàn bộ** hoặc **Một phần** (nhập số tiền, từ 1đ tới số tiền cần thanh toán).
4. Màn **Tóm tắt giao dịch** — phí giao dịch **Miễn phí**.
5. Nhập **OTP**.
6. Màn **Giao dịch thành công**, có mã giao dịch.

**Lỗi khách hay gặp và ý nghĩa:**

| Thông báo | Nghĩa | Hướng dẫn khách |
|---|---|---|
| Số dư khả dụng không đủ | Tài khoản Cake không có tiền | Nạp tiền vào tài khoản Cake rồi thanh toán lại |
| Số tiền phải nhỏ hơn {số dư} | Nhập nhiều hơn số dư đang có | Nhập lại số nhỏ hơn hoặc nạp thêm |
| Số tiền phải nhỏ hơn hoặc bằng {số tiền cần thanh toán} | Nhập nhiều hơn mức cần trả | Nhập lại |
| Số tiền phải lớn hơn 0đ | Nhập 0 hoặc không còn gì phải trả | Kiểm tra lại khoản vay |

## Tất toán trước hạn

1. Màn Chi tiết khoản vay → icon hợp đồng → màn **Hợp đồng khoản vay**.
2. Bấm **Hủy hợp đồng**. Hệ thống kiểm tra điều kiện tất toán.
3. Đạt điều kiện → hiện **Hợp đồng tất toán** để khách xác nhận.
4. Màn **Tóm tắt giao dịch** — phí giao dịch **Miễn phí**.
5. Xác thực **OTP** (không cần chữ ký số).
6. Màn **Tất toán thành công**.

**Ba lý do tất toán bị chặn:**

- **Số dư CASA không đủ** để trả hết — khách cần nạp thêm tiền trước.
- Đang trong **giờ chốt sổ cuối ngày** — khách thử lại sau.
- Lỗi hệ thống chưa xử lý được — escalate.

Lưu ý: phí giao dịch miễn phí, nhưng **phí tất toán trước hạn của sản phẩm vẫn tính**
(với Cashloan là 8% hoặc 5% dư nợ còn lại tuỳ thời điểm — xem
`products/cashloan/loan-management.md`) và đã nằm trong số tiền phải trả.

## Khách của sản phẩm đã ngừng bán

Áp dụng cho `NGS_cashloan`, `FPT_paylater`, `VNHUB_cashloan`, `VDS_paylater_epass`,
`VTPO_cashloan`, `VDS_cashloan_LP`, `VDS_bikeloan`, `GSM_bikeloan`, `PD_CAKEVNPT_NEW`
— xem `_meta/product-matrix.md` mục C và D.

- Khoản vay **vẫn thanh toán và tất toán được, trên app Cake**, theo đúng luồng ở trên.
- Cái đã đóng là **kết nối với app đối tác**, không phải khả năng trả nợ.
- **Không hướng khách quay lại app đối tác** — luồng đó đã đóng, khách sẽ không làm được.
- **Không mở khoản vay mới** cho các sản phẩm này.

Khách hỏi *"app [đối tác] không thấy khoản vay nữa, tôi trả nợ kiểu gì?"* →
mở app Cake, vào tab Khoản vay, chọn khoản vay, bấm Thanh toán.

Nhóm này có thể **chưa từng dùng app Cake để vay**, nên hướng dẫn cần chi tiết từ đầu,
không giả định khách biết đường đi.

## Lưu ý cho agent

- Nhầm kênh là lỗi hay gặp nhất. Cùng một sản phẩm có thể chạy trên app Cake, trên webview
  nhúng trong app đối tác, hoặc trên app đối tác. Xác định đúng kênh trước khi hướng dẫn.
- Khách nói "app Cake" nhưng khoản vay thuộc đối tác → tra `_meta/product-matrix.md`
  theo onboarding source hoặc contract type.
- Thẻ khoản vay ở trạng thái onboarding chỉ hiện khi sản phẩm bật toggle tương ứng.
  Khách nói "không thấy khoản vay trong app" mà hồ sơ đã duyệt → escalate, đừng khẳng định
  là khách xem sai.

## Thông tin KHÔNG được nói với khách

- Ý nghĩa kế toán của write-off. Nhãn khách thấy là "Thu hồi nợ", giải thích trong phạm vi đó.
- Tên trạng thái hệ thống (ACTIVE, IN_ARREARS, WRITE_OFF, APPROVED).
- Tên toggle, tên hệ thống nội bộ (Mambu, ICE, LOS, LMS, Portal).
- Lý do sản phẩm ngừng bán, nội dung thoả thuận với đối tác.
- Số liệu dư nợ toàn danh mục.
