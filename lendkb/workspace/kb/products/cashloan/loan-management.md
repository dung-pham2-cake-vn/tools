---
title: Quản lý khoản vay — Cashloan (Cake)
product: cashloan
partner: cake
channel: cake-app
topic: loan-management
sources:
  - confluence:198148097
  - confluence:1120959
  - confluence:14155933
  - jira:PL-9170
  - jira:PL-5240
  - jira:PL-13667
last_verified: 2026-09-30
owner: dung.pham2
audience: [ops, po]
status: draft
numbers_source: jira
needs_jira_verify: false
numbers_asof: 2026-08-25
---

## Tóm tắt

Khách trả góp hàng tháng vào một ngày cố định. Trả chậm phát sinh phạt trên cả gốc
lẫn lãi. Khách được tất toán trước hạn bất kỳ lúc nào, chịu thêm phí 8% hoặc 5% dư nợ còn lại
tuỳ thời điểm (xem mục Tất toán trước hạn).

## Lịch trả nợ

**Ngày bắt đầu tính lãi** = ngày giải ngân thành công được ghi nhận trên hệ thống.

**Ngày thanh toán đầu tiên:**

- Giải ngân ngày 1–28 → đúng ngày đó của tháng sau.
- Giải ngân ngày 29–31 → ngày 28 của tháng sau. Ví dụ giải ngân 30/06 thì hạn trả đầu tiên là 28/07.

**Hàng tháng** khách trả vào đúng ngày thanh toán đầu tiên đó.

**Trùng ngày lễ** → hệ thống **dời tất cả các kỳ** rơi vào ngày nghỉ sang ngày làm việc
kế tiếp. Ví dụ hạn 28/07 rơi vào ngày nghỉ thì chuyển 29/07.

> **Lịch ngày lễ dùng chung cho toàn bộ sản phẩm lending**, không riêng Cashloan.
> Cấu hình được cập nhật **linh động vào đầu mỗi năm**, nên bảng trên trang nguồn
> (mới tới 2024) không phản ánh cấu hình đang chạy.
>
> **Không tra ngày đến hạn cụ thể từ KB** — luôn lấy từ hệ thống. Xác nhận bởi PO 2026-10-01.

## Số tiền phải trả hàng tháng

Gồm gốc và lãi, cố định theo công thức PMT.

- **Lãi tháng** = dư nợ gốc thực tế × số ngày thực tế của kỳ × lãi suất ÷ 365
- **Gốc tháng** = (gốc + lãi phải trả) − lãi tháng
- **Kỳ cuối cùng** = toàn bộ dư nợ gốc còn lại + lãi tháng đó

Các công thức này để agent hiểu bản chất. **Số tiền báo cho khách phải lấy từ hệ thống.**

## Trả chậm

Hai loại phạt cộng thêm:

| Loại | Cách tính |
|---|---|
| Phạt gốc chậm | 150% × lãi suất × gốc chậm trả × số ngày chậm ÷ 365 |
| Phạt lãi chậm | 10% × lãi chậm trả × số ngày chậm ÷ 365 — **chưa áp dụng, xem cảnh báo dưới** |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.

Trả chậm còn ảnh hưởng lịch sử tín dụng của khách và có thể dẫn tới khoá khoản vay.

## Tất toán trước hạn

**Không có điều kiện ràng buộc — khách tất toán được bất kỳ lúc nào.**
(bỏ điều kiện từ [PL-5240](https://cakedigitalbank.atlassian.net/browse/PL-5240), 2024-07-31)

### Phí tất toán — tính theo mốc kỳ thứ 3

| Thời điểm tất toán | Phí |
|---|---|
| **Trước** ngày đến hạn của kỳ thứ 3 | **8%** dư nợ còn lại |
| **Từ** ngày đến hạn kỳ thứ 3 trở đi | **5%** dư nợ còn lại |

Nguồn: [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170), live 2025-07-28.
Áp dụng chung cho Cake Cashloan, VDS Cashloan, MWG Cashloan, Be Cashloan, VNPay Cashloan.

> ⚠️ **Page Confluence `198148097` vẫn ghi phí 3% — đã cũ, KHÔNG dùng.**
> Scheme 8%/5% đã live từ 2025-07-28. Báo 3% cho khách là sai và sẽ thành khiếu nại
> khi khách thấy số tiền thực tế.

### Số tiền tất toán gồm

1. Toàn bộ dư nợ gốc còn lại.
2. Lãi phát sinh theo ngày thực tế, tính từ ngày đến hạn gần nhất đã trả tới ngày khách đề nghị tất toán.
3. Phí tất toán trước hạn theo bảng trên.

Khách muốn biết số tiền chính xác → **tra hệ thống**, không tự tính.

## Thứ tự thu nợ

Tiền khách trả vào được phân bổ theo thứ tự cố định, khác nhau giữa khoản trong hạn và quá hạn.

**Khoản đang trong hạn:** lãi → gốc.

**Khoản đang quá hạn** (theo Thông tư 06):

1. Kỳ quá hạn: gốc quá hạn → phạt gốc quá hạn → lãi quá hạn
2. Kỳ đúng hạn: gốc → lãi

Nếu khách trả không đủ, tiền được phân bổ theo đúng thứ tự trên cho tới khi hết.
Đây là lý do một khoản trả có thể không làm giảm dư nợ gốc như khách mong đợi —
giải thích được cho khách theo thứ tự này, nhưng **không nêu tên thông tư**.

## Thu nợ tự động

Hệ thống có cơ chế tự động trừ tiền từ tài khoản Cake của khách khi có số dư, áp dụng
với khoản quá hạn.

**Không mô tả chi tiết cơ chế này với khách** (ngưỡng DPD, tần suất, cách chọn danh sách).
Khách thắc mắc "sao tự nhiên bị trừ tiền" → giải thích là khoản vay đang quá hạn và hệ thống
thu nợ tự động theo hợp đồng đã ký, rồi chuyển nhân viên nếu khách khiếu nại.

## Khoản vay bị khoá

Khoản vay có thể bị khoá tạm thời hoặc vĩnh viễn.

**Không giải thích lý do khoá với khách. Luôn chuyển nhân viên.** Lý do khoá có thể liên
quan tới nghi ngờ gian lận — tiết lộ sẽ gây rủi ro.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

Chuyển nhân viên ngay khi:

- Khách khiếu nại về số tiền bị trừ, số tiền phạt, hoặc dư nợ.
- Khoản vay đang bị khoá.
- Khách hỏi vì sao bị từ chối hoặc vì sao hạn mức thấp.
- Khách yêu cầu giảm/miễn lãi, phạt, hoặc xin cơ cấu nợ.
- Khách nói đang bị bên thứ ba đòi nợ.
- Số liệu khách đưa ra lệch với hệ thống.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Trạng thái write-off. Khoản bị write-off **khách vẫn còn nghĩa vụ trả nợ** — không bao giờ nói "đã xoá nợ".
- Ngưỡng DPD kích hoạt thu nợ tự động, cách sinh danh sách thu nợ, quy tắc chuyển sang bot gọi hoặc nhân viên thu hồi.
- Lý do khoá khoản vay.
- Tên hệ thống nội bộ (Mambu, ICE, ACS, LMS, Portal).
- Tên thông tư, quy định nội bộ.
