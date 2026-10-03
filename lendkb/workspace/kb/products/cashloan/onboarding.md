---
title: Đăng ký vay — Cashloan (Cake)
product: cashloan
partner: cake
channel: cake-app
topic: onboarding
sources:
  - confluence:198148097
  - confluence:27918827
  - confluence:1042743307
  - confluence:1058537573
last_verified: 2026-09-30
owner: dung.pham2
audience: [ops, po]
status: draft
coverage: full
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Khách đăng ký vay ngay trên app Cake. Bắt buộc xác thực NFC căn cước cả khi đăng ký
lẫn khi ký hợp đồng. Duyệt xong, khách ký hợp đồng trên app, tiền về tài khoản Cake của khách.

> Luồng màn hình lấy từ ticket mẫu `[MOBILE] Mobile App & Cake Portal`
> (`confluence:1042743307`) — spec dùng chung cho mọi sản phẩm lending trên app Cake.

## Điều kiện khách hàng

- Độ tuổi 20–50.
- Thu nhập từ 5 triệu đồng/tháng.
- Có tài khoản Cake (tiền giải ngân về tài khoản này).
- Xác thực NFC căn cước — **bắt buộc**, không có đường vòng.

## Các bước

1. **Màn giới thiệu sản phẩm** — khách bấm "Đăng ký ngay", đồng thời chấp nhận Điều khoản sử dụng. Hệ thống chạy kiểm tra sơ bộ; không đạt thì dừng ở đây.
2. **Đăng ký nhu cầu vay** — khách chọn số tiền và kỳ hạn. App hiện tiền lãi tạm tính và bảng "Xem chi tiết" (tổng tiền vay, phí bảo hiểm, tổng thanh toán tạm tính). Có ô nhập mã ưu đãi. **Checkbox bảo hiểm mặc định được tick, khách bỏ tick được.**
3. **Xác thực khuôn mặt** — yêu cầu lại mỗi lần khách quay vào luồng đăng ký.
4. **Thông tin cá nhân** — nghề nghiệp (nhân viên văn phòng/công chức, lao động phổ thông, tự kinh doanh, sinh viên/học sinh), tên công ty (bắt buộc nếu là nhân viên văn phòng/công chức), thu nhập hàng tháng (tối thiểu 5.000.000đ), mục đích vay, địa chỉ hiện tại.
5. **Thông tin người tham chiếu** — 2 người, mỗi người gồm họ tên và số điện thoại. Số điện thoại không được trùng nhau và không trùng số của khách.
6. **Xác nhận thông tin** — khách xem lại toàn bộ trước khi gửi.
7. **Nhập OTP** để nộp hồ sơ.
8. **Chờ thẩm định** — màn "Đang xử lý hồ sơ", app tự tải lại kết quả mỗi 5 giây. Khách được nhắc giữ màn hình.
9. **Kết quả** — duyệt, từ chối, hoặc huỷ (xem bảng dưới).
10. **Thông tin phê duyệt** — số tiền giải ngân, tổng tiền vay, thời hạn, tiền lãi, số tiền thanh toán, ngày thanh toán.
11. **Ký hợp đồng** trên app, xác nhận bằng **OTP**. Khách bấm "Từ chối" thì phải đăng ký lại từ đầu, khoản vay về trạng thái "Chưa đăng ký".
12. **Giải ngân** về tài khoản Cake của khách.
13. Lãi bắt đầu tính từ ngày giải ngân thành công được ghi nhận trên hệ thống.

### Kết quả thẩm định — nói gì với khách

| Màn hình | Nội dung app hiển thị | Khách đăng ký lại được không |
|---|---|---|
| Hồ sơ không được duyệt (reject) | "Rất tiếc, bạn chưa đủ điều kiện… vui lòng đăng ký lại sau 7 ngày" | Sau 7 ngày |
| Hồ sơ không được duyệt (cancel) | "Rất tiếc, bạn không được cấp…" | Ngay, có nút "Đăng ký lại" |
| Duyệt hồ sơ thành công | "Chúc mừng bạn đã được duyệt hồ sơ…" | — |

**Chỉ nhắc lại đúng nội dung app hiển thị. Không giải thích vì sao bị từ chối.**

### Bỏ dở giữa chừng

Khách bỏ dở khi **chưa tới bước thẩm định**: sau **3 ngày** hệ thống reset, khách phải làm lại từ đầu.
Đã qua bước thẩm định thì theo trạng thái khoản vay.

## Bảo hiểm khoản vay

- Không bắt buộc. Khách tự chọn.
- Phí bảo hiểm được **cộng vào số tiền vay**, không thu riêng.
- Có bảo hiểm thì lãi suất thấp hơn không có bảo hiểm.

Khách hỏi có bắt buộc mua bảo hiểm không → **trả lời rõ là không bắt buộc**. Đây là
điểm khách hay hiểu nhầm và dễ thành khiếu nại.

## Hạn mức, kỳ hạn, lãi suất

**Chưa được duyệt — agent không báo con số cho khách.**

Nguồn đang mâu thuẫn (xem `overview.md`, mục "Điểm chưa rõ"). Hạn mức và lãi suất còn
phụ thuộc phân nhóm khách, mỗi khách một khác. Khách hỏi → tra hệ thống hoặc chuyển nhân viên.

## Điểm còn cần xác nhận

- Con số hạn mức / kỳ hạn / lãi suất cụ thể của `CAKE_cashloan` — nguồn mâu thuẫn, xem `overview.md`.
- Ticket mẫu mô tả luồng dùng chung, phần ví dụ minh hoạ lấy theo Payday. Các bước áp dụng chung cho Cashloan (spec ghi rõ "tương tự Cake Cashloan"), nhưng **giá trị số** trong ví dụ đó là của Payday, không dùng cho Cashloan.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Khách hỏi vì sao bị từ chối.
- Khách hỏi vì sao hạn mức thấp hơn mong đợi.
- Khách hỏi bao giờ được vay lại sau khi bị từ chối.
- Khách không xác thực được NFC.
- Khách hỏi số liệu cụ thể về lãi/hạn mức/kỳ hạn.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ` · *Chưa có nội dung. PO bổ sung.*

Gợi ý: vì sao chính sách đặt như vậy · lịch sử thay đổi và lý do ·
ràng buộc hệ thống · backlog đang làm dở.

## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở mục 1–3.

**Không đọc cho khách:**

- Khách thuộc nhóm/segment nào, có nằm trong whitelist hay pre-approve không.
- Tiêu chí chấm điểm, tiêu chí sàng lọc, lý do từ chối.
- Việc hệ thống có kiểm tra lịch sử tín dụng (PCB) hay không.
- Tên hệ thống nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
