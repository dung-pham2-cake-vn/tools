---
title: Thông báo từ chối hồ sơ — tra cứu
topic: reference
sources:
  - confluence:852792931
  - jira:PL-12708
last_verified: 2026-09-30
audience: [ops, po]
owner: dung.pham2
status: draft
---

# Khách bị từ chối — tra theo thông báo khách đọc được

Khách thường nhắc lại **nguyên văn câu thông báo trên màn hình**. Dùng bảng này để biết
khách vướng gì và nói được gì.

> **Nguyên tắc xuyên suốt: không tiết lộ tiêu chí phía sau.**
> Được phép nói *khách cần làm gì tiếp theo*. Không được nói *vì sao hệ thống chặn*.
> Khách hỏi sâu hơn → escalate.

## Tra theo thông báo

| Thông báo khách thấy | Nghĩa thật | Nói được gì với khách |
|---|---|---|
| "Bạn đang có khoản vay tương tự đã được giải ngân. Hãy quay lại sau nhé!" | Khách đã có khoản vay cùng nhóm sản phẩm đang hoạt động | Xác nhận khách đang có khoản vay cùng loại. Tất toán xong mới đăng ký khoản mới được |
| "Ops, hồ sơ của bạn mới bị từ chối gần đây. Hãy quay lại sau ít ngày nhé!" | Có hồ sơ bị từ chối trong **7 ngày** gần đây | Hướng dẫn quay lại sau 7 ngày kể từ lần từ chối gần nhất |
| "Hồ sơ của bạn không trùng khớp với hồ sơ tại Cake. Vui lòng gọi tổng đài 1900 636 686" | Thông tin định danh lệch giữa hồ sơ Cake và dữ liệu đối chiếu | Hướng dẫn gọi tổng đài cập nhật thông tin. **Không nói trường nào lệch** |
| "Ops, giấy tờ tùy thân của bạn không còn đủ hiệu lực. Hãy cập nhật giấy tờ tùy thân mới nhất..." | CCCD sắp/đã hết hạn (còn **≤ 7 ngày**), **hoặc** khách dùng CMND 9 số | Hướng dẫn cập nhật CCCD gắn chip 12 số còn hiệu lực với Cake |
| "Rất tiếc, độ tuổi của bạn không phù hợp, sản phẩm này yêu cầu độ tuổi từ 20 đến 50 tuổi" | Ngoài khoảng tuổi của sản phẩm | Nhắc lại khoảng tuổi mà **chính thông báo đã nêu**. Xem lưu ý bên dưới |
| "Ops, hồ sơ của bạn chưa thực hiện xác thực định danh NFC. Hãy bổ sung..." | Chưa xác thực NFC căn cước | Hướng dẫn khách xác thực NFC trên app Cake |
| "Rất tiếc! Hồ sơ của bạn không đủ điều kiện đăng ký sản phẩm này. Hãy quay lại sau nhé!" | **Câu gộp nhiều nguyên nhân khác nhau** | Xem mục dưới — **tuyệt đối không suy đoán nguyên nhân** |

## Câu "không đủ điều kiện" — cảnh báo

Cùng một câu này được dùng cho **ít nhất ba nguyên nhân rất khác nhau**, trong đó có
nguyên nhân liên quan rủi ro và gian lận.

**Không bao giờ đoán vì sao.** Không gợi ý khách "thử lại sau vài tháng", "cải thiện
lịch sử tín dụng", hay bất kỳ suy luận nào. Ghi nhận và **escalate**.

Nói với khách được: *"Hồ sơ chưa đáp ứng điều kiện của sản phẩm này. Em ghi nhận và
chuyển bộ phận phụ trách kiểm tra giúp anh/chị."*

## Điều kiện tuổi — khác nhau theo sản phẩm

Mặc định 20–50, nhưng **không đúng cho mọi sản phẩm**:

| Sản phẩm | Tuổi |
|---|---|
| Hầu hết sản phẩm | 20 – 50 |
| `MISA_cashloan` | **20 – 60** |
| `BE_payday` | **18 – 50** |
| `FPT_paylater` | **18 – 55** |

Chỉ nhắc lại con số **đúng như thông báo trên màn hình khách đọc**, không tự nêu khoảng tuổi.

## Yêu cầu giấy tờ

- Chỉ chấp nhận **CCCD 12 số**. CMND 9 số bị từ chối.
- CCCD phải còn hạn **trên 7 ngày** tính tới ngày đăng ký.

Đây là hai nguyên nhân khách tự xử lý được, nên giải thích rõ và cụ thể.

## Thu nhập tối thiểu

Đa số sản phẩm: **5 triệu/tháng** (nâng lên từ 2026-03-16,
[PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708)).

Ngoại lệ: `ZLP_payday` vẫn là **4 triệu/tháng**.

## Thông tin KHÔNG được nói với khách

- Tên rule, mã rule, mã lỗi nội bộ (`age_invalid`, `dup_product_found`, `risk_status_invalid`…).
- Sự tồn tại của danh sách đen / danh sách rủi ro cao, và việc khách có nằm trong đó không.
- Việc hệ thống kiểm tra điểm gian lận, ảnh selfie, hay lịch sử bị từ chối.
- Ngưỡng điểm, tiêu chí chấm điểm, tên đối tác cung cấp dữ liệu.
- Danh sách tỉnh/thành bị hạn chế.
- Số lần khách đã bị từ chối.
