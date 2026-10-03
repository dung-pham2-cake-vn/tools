---
title: Mã lỗi API & cách xử lý
audience: [ops, po]
nhom: 2
sources:
  - "file: Troubleshoot Lending Ops.xls — tab APIs sau vay, Payment"
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Mã lỗi API & cách xử lý

Sinh từ `tools/scan/troubleshoot.json` bằng `tools/gen-ops-docs.py`.
Nguồn gốc: file **Troubleshoot Lending Ops.xls**, tab *APIs sau vay* và *Payment*.

## Mã lỗi dùng chung

| Mã | Nghĩa | Nguyên nhân thường gặp |
|---|---|---|
| `600000` | Thông tin thanh toán không hợp lệ | `ref_id` đã được thanh toán · bộ `order_id + ref_id + loan_id + payment_amount` không khớp · SĐT đăng ký ví khác SĐT hiện tại |
| `10003` | Yêu cầu hiện tại khác yêu cầu trước đó | `order_id` đã gọi confirm thất bại trước đó |
| `100103` | Số tiền vượt quá dư nợ có thể thanh toán | Gọi lại `get-loan-detail` lấy dư nợ mới |
| `100102` | Đang có số dư thanh toán trước hạn, không tất toán được | Khách đã thanh toán trước hạn — **đợi tới kỳ thanh toán** mới tất toán được |
| `100002` | Hình selfie không đúng | Không khớp khuôn mặt đã đăng ký · hoặc `order_id` chưa facematch |
| `500014` | Trạng thái khoản vay không hợp lệ | Khoản vay không ở `DISBURSE`, `TEMP_LOCK`, `TEMP_LOCK_FRAUD`, `PERM_LOCK`, `WRITTEN_OFF` |
| `900000` | Có lỗi xảy ra | Khuôn mặt chưa verify (check Sola portal) → báo Ops KYC |
| `500004` | **Yêu cầu thanh toán hết hạn** | Quá **5 phút** kể từ lúc gọi `payment-request`. Tiền **không bị trừ** — hướng dẫn khách tạo đơn mới |
| `500017` | Ví chưa liên kết hoặc đã hết hạn | Token webview hết hạn (**5 phút**), hoặc ví ở trạng thái `CLOSE` |
| `160004` | OTP không chính xác | Hiệu lực OTP **khác nhau theo sản phẩm**: `MWG_paylater` **2 phút** · `VDS_paylater_epass` **1 phút** |
| `160003` | OTP vượt quá số lần nhập | **3 lần sai** → huỷ giao dịch, phải tạo đơn mới |
| `150001` | Số tiền vượt hạn mức | Ví không đủ hạn mức khả dụng |
| `500007` | Ví trả sau đang bị hạn chế | **Không giải thích lý do — escalate** |

## Vòng đời giao dịch payment

`INIT` → `IN_PROCESS` (đã confirm) → `SUCCESS` · `FAILED` · `HOLD` (cần đối soát tay) · `REVERT`

Giao dịch ở `INIT` quá **5 phút** mà chưa confirm → `FAILED`, **tiền không bị trừ**.

## Chi tiết theo API

| Bước | API | Lỗi phát sinh | Ops kiểm tra | Nguyên nhân | Hướng xử lý |
|---|---|---|---|---|---|
| Status |  |  |  |  |  |
|  | get-status |  |  |  |  |
|  |  | [MWG-CL] Hồ sơ khoản vay đã bị hủy, hoặc không tồn tại | Field reference_id được truyền vào API get-status có khác với reference_id được truyền vào API create-token mới nhất | DOP dựa vào reference_id cuối cùng được tạo ra, nếu truyền ref cũ sẽ báo lỗi | Báo đối tác truyền reference_id được tạo gần nhất |
|  | get-loan-detail |  |  |  |  |
|  |  | [VDS-PD] KH lệch ngày giải ngân so với ngày ký hợp đồng, nhưng ngày due_date đang hiển thị là ngày ký HĐ -1 ngày. Mong muốn due_date là ngày giải ngân -1 ngày. | Dữ liệu field due_date trả ra có đúng expect không hay như KH đang thấy ? (có thể kéo thêm field hoặc nhờ BI lấy) | Đối tác tự store lại dữ liệu cũ của field due_date | Báo đối tác cập nhật lấy dữ liệu từ API trả ra |
| Repayment |  |  |  |  |  |
|  | App Cake |  |  |  |  |
|  |  | Nhập tiền dưới 10k bị lỗi không rõ ràng |  | Hệ thống chặn KH nhập số tiền nhỏ hơn 10k khi dư nợ lớn hơn 10k | Báo KH cập nhật ứng dụng bản mới nhất (update 9/2026) |
|  | Chưa gọi API |  |  |  |  |
|  |  | KH báo đã trừ tiền ở đối tác, nhưng chưa được gạch nợ | Đối tác đã gọi đủ API request và confirm chưa, trạng thái có thành công không | Chưa gọi API hoặc gọi không thành công nên không gạch nợ | Kiểm tra lại với đối tác |
|  | repayment-request |  |  |  |  |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Khi truyền ref_id đã được thanh toán | Đối tác/KH tạo đơn hàng mới |
|  |  | 100103 - Số tiền thanh toán vượt quá dư nợ có thể thanh toán |  |  | Gọi lại API get-loan-detail để lấy lại thông tin dư nợ |
|  | repayment-confirm |  |  |  |  |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Bộ order_id + ref_id + loan_id + payment_amount không khớp nhau | Kiểm tra lại so với API repayment-request |
|  |  | 10003 - Yêu cầu hiện tại khác với yêu cầu trước đó |  | order_id đã được gọi repayment-confirm thất bại trước đó | Kiểm tra lại các API repayment-request trước đó |
|  |  | Sau khi thanh toán đủ MAD/TAD, nhưng KH vẫn bị khóa hạn mức | 1/ Khoản vay có status = ACTIVE · 2/ Khoản vay có status = TEMP_LOCK · a/ Kiểm tra days_in_arrears = 0 | 1/ Bắn status ACTIVE sang đối tác thất bại · 2a/ Update status trên LMS thất bại | 1/ Gửi tech bắn lại status, sau khi có tool Ops có thể tự bắn status được · 2/ Gửi tech cập nhật lại status |
| Terminate | terminate-review |  |  |  |  |
|  |  | 100102 - Đang có số dư thanh toán trước hạn, không thể tất toán. |  | KH đã thanh toán trước hạn | Đợi tới kì thanh toán mới có thể tất toán |
|  | terminate-request |  |  |  |  |
|  |  | 100102 - Đang có số dư thanh toán trước hạn, không thể tất toán. |  | KH đã thanh toán trước hạn | Đợi tới kì thanh toán mới có thể tất toán |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Khi truyền ref_id đã được tất toán | Đối tác/KH tạo đơn hàng mới |
|  | terminate-facematch |  |  |  |  |
|  |  | 100002 - Hình selfie không đúng |  | Hình không khớp với khuôn mặt đã đăng ký | Kiểm tra lại Portal saas eKYC |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Bộ order_id + ref_id + loan_id + payment_amount không khớp nhau |  |
|  | terminate-confirm |  |  |  |  |
|  |  | 10003 - Yêu cầu hiện tại khác với yêu cầu trước đó |  | order_id đã được gọi terminate-confirm thất bại trước đó | Kiểm tra lại các API terminate-request trước đó |
|  |  | 100002 - Hình selfie không đúng |  | order_id chưa được facematch | Đối tác kiểm tra lại flow |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Bộ order_id + ref_id + loan_id + payment_amount không khớp nhau |  |
|  |  | 900000 - Có lỗi xảy ra, vui lòng thử lại sau! · Đối tác hoàn tiền cho KH, Cake ghi nhận thành công |  |  | Báo product làm việc với đối tác, khi ghi nhận mã lỗi lạ không tự hoàn tiền cho KH mà phải đợi đối soát thủ công, tham khảo đoạn chat tại SVK-8969 |
| Sau Terminate |  |  |  |  |  |
|  | OD-TD |  |  |  |  |
|  |  | Đã tất toán OD nhưng vẫn bị lock TD | - | Liên kết dưới OD vẫn còn | Gửi tech gỡ liên kết |
| Payment |  |  |  |  |  |
|  | payment-request |  |  |  |  |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | a/ Khi truyền ref_id đã được thanh toán · b/ SĐT đăng ký ví ban đầu và SĐT hiện tại khác nhau | a/ Đối tác/KH tạo đơn hàng mới · b/ KH đổi lại sđt ban đầu hoặc hủy khoản vay hiện tại để đăng ký lại |
|  |  | 100103 - Số tiền thanh toán vượt quá dư nợ có thể thanh toán |  |  | Gọi lại API get-loan-detail để lấy lại thông tin dư nợ |
|  | payment-confirm |  |  |  |  |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | Bộ order_id + ref_id + loan_id + payment_amount không khớp nhau | Kiểm tra lại so với API payment-request |
|  |  | 10003 - Yêu cầu hiện tại khác với yêu cầu trước đó |  | order_id đã được gọi payment-confirm thất bại trước đó | Kiểm tra lại các API payment-request trước đó |
|  | payment-revert |  |  |  |  |
|  |  | API trả về · Workflow execution error |  | Hệ thống bị lỗi tại thời điểm đó (ví dụ SVK-10423) | Recon hoàn tiền thủ công và lên ticket báo tech |
|  | generate-webview/payment-request | Note: hiện dùng cho MWG Paylater(QTV) |  |  |  |
|  |  | 100103 - Số tiền thanh toán vượt quá dư nợ có thể thanh toán |  |  | KH kiểm tra lại dư nợ |
|  |  | 600000 - Thông tin thanh toán không hợp lệ |  | a/ Khi truyền ref_id đã được thanh toán · b/ SĐT đăng ký ví ban đầu và SĐT hiện tại khác nhau | a/ Đối tác/KH tạo đơn hàng mới · b/ KH đổi lại sđt ban đầu hoặc hủy khoản vay hiện tại để đăng ký lại |
|  |  | 900000 - Có lỗi xảy ra, vui lòng thử lại sau! | Face-auth-regíster thành công chưa? | Do KH chưa đăng ký khuôn mặt thành công | Báo Ops KYC điều chỉnh lại khuôn mặt |
|  |  | Giao dịch payment thành công, trả góp thất bại | 1/ KH có tiền trong prepayment | 1/ Tiền trừ payment lấy từ prepayment trước, nên số tiền payment không đúng với số tiền cần trả góp, khiến trả góp bị fail | 1/ Báo product đưa hướng xử lý dứt điểm, trước đó đã báo anh Định |
|  | generate-webview/loan-detail |  |  |  |  |
|  |  | 500014 - Trạng thái khoản vay không hợp lệ |  | Khoản vay có trạng thái khác với: · DISBURSE, TEMP_LOCK, TEMP_LOCK_FRAUD, PERM_LOCK, WRITTEN_OFF | Kiểm tra lại trạng thái khoản vay giữa Cake và đối tác |

## Payment (Paylater)

| Bước | Màn hình/API | Lỗi phát sinh | Nguyên nhân | Hướng xử lý |
|---|---|---|---|---|
| Payment | generate-webview/payment-request |  |  |  |
|  |  | UI đối tác báo lỗi | Check với đối tác | Check xem đã gọi API chưa, API trả lỗi gì |
|  |  | 900000 - Có lỗi xảy ra, vui lòng thử lại sau! | 1/ Khuôn mặt chưa được verify, check Sola portal | 1/ Báo Ops KYC |
|  | payment-status |  |  |  |
|  |  | status = FAILED | Giao dịch thất bại hoặc quá thời gian confirm nhưng chưa confirm | Logic sản phẩm như vậy, check với product |
| Payment xxx | generate-webview/payment-request |  |  |  |
|  |  | UI đối tác báo lỗi | Check với đối tác | Check xem đã gọi API chưa, API trả lỗi gì |
|  |  | 900000 - Có lỗi xảy ra, vui lòng thử lại sau! | 1/ Khuôn mặt chưa được verify, check Sola portal | 1/ Báo Ops KYC |
|  | payment-status |  |  |  |
|  |  | status = FAILED | Giao dịch thất bại hoặc quá thời gian confirm nhưng chưa confirm | Logic sản phẩm như vậy, check với product |
