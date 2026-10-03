---
title: Câu hỏi thường gặp — Cashloan (Cake)
product: cashloan
partner: cake
channel: cake-app
topic: faq
sources:
  - confluence:198148097
  - jira:PL-9170
  - jira:PL-14087
  - jira:PL-13667
last_verified: 2026-09-30
owner: dung.pham2
audience: [ops, po]
status: draft
numbers_source: jira
needs_jira_verify: false
numbers_asof: 2026-08-25
coverage: partial
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Câu trả lời mẫu cho câu hỏi hay gặp. Mọi câu liên quan tới **con số cụ thể của khoản vay**
đều phải tra hệ thống, không dùng mẫu sẵn.

> **Chưa lấy từ case thật.** Phạm vi export không bao gồm project ticket CSKH, nên FAQ này
> suy ra từ tài liệu sản phẩm chứ chưa phải câu hỏi khách thực sự hay hỏi. Cần đối chiếu
> với dữ liệu CSKH thật trước khi dùng.

## Trả nợ

**Q: Tôi trả nợ bằng cách nào?**
A: Thanh toán trên app Cake. Khoản vay hiển thị dư nợ và kỳ đến hạn ngay trong app.

**Q: Ngày nào tôi phải trả?**
A: Hàng tháng vào đúng ngày của kỳ thanh toán đầu tiên. Nếu giải ngân vào ngày 1–28 thì
hạn đầu tiên là đúng ngày đó của tháng sau; giải ngân ngày 29–31 thì hạn đầu tiên là
ngày 28 tháng sau. Ngày đến hạn rơi vào ngày nghỉ sẽ được dời sang ngày làm việc kế tiếp.

**Q: Tôi trả rồi mà sao dư nợ gốc không giảm?**
A: Tiền trả vào được phân bổ theo thứ tự cố định. Với khoản đang trong hạn, tiền trả
vào lãi trước rồi mới tới gốc. Với khoản đang quá hạn, tiền trả vào gốc quá hạn, rồi
phạt, rồi lãi quá hạn, sau đó mới tới kỳ đúng hạn. Nếu số tiền chưa đủ, phần gốc chưa
được trừ hết.
→ *Khách vẫn thắc mắc hoặc cho rằng sai số: escalate.*

**Q: Trả chậm thì bị phạt thế nào?**
A: Có hai khoản phạt cộng thêm — phạt trên phần gốc chậm và phạt trên phần lãi chậm,
tính theo số ngày chậm. Trả chậm cũng ảnh hưởng tới lịch sử tín dụng.
→ *Số tiền phạt cụ thể: tra hệ thống, không tự tính.*

**Q: Sao tài khoản tôi tự nhiên bị trừ tiền?**
A: Khoản vay đang quá hạn, hệ thống thu nợ tự động theo hợp đồng đã ký khi tài khoản có số dư.
→ *Khách khiếu nại: escalate ngay.*

## Tất toán trước hạn

**Q: Tôi trả hết sớm được không?**
A: Được, bất kỳ lúc nào, không có điều kiện ràng buộc.

**Q: Trả sớm có mất phí không?**
A: Có, và mức phí phụ thuộc thời điểm:
- Tất toán **trước** ngày đến hạn kỳ thứ 3: phí **8%** dư nợ còn lại.
- Tất toán **từ** kỳ thứ 3 trở đi: phí **5%** dư nợ còn lại.

Ngoài phí, khách trả toàn bộ dư nợ gốc còn lại cộng lãi phát sinh tới ngày tất toán.
→ *Số tiền chính xác: tra hệ thống.*

**Q: Tổng cộng tôi phải trả bao nhiêu để tất toán?**
A: **Tra hệ thống.** Không tự tính cho khách.

## Bảo hiểm

**Q: Tôi có bắt buộc phải mua bảo hiểm không?**
A: Không bắt buộc. Khách tự chọn.

**Q: Mua bảo hiểm thì khác gì?**
A: Lãi suất thấp hơn so với không mua. Phí bảo hiểm được cộng vào số tiền vay chứ không
thu riêng.

## Đăng ký vay

**Q: Điều kiện vay là gì?**
A: Từ 20 đến 50 tuổi, thu nhập từ 5 triệu đồng/tháng, có tài khoản Cake và xác thực được
NFC căn cước.

**Q: Tôi vay được bao nhiêu, lãi bao nhiêu?**
A: Khung chung: vay từ 5 triệu, kỳ hạn 6–60 tháng, lãi suất 52%/năm nếu có bảo hiểm và
59%/năm nếu không. Hạn mức tối đa tuỳ từng khách.
→ *Hạn mức và lãi suất cụ thể của khách: tra hệ thống hoặc hướng dẫn khách xem trên app.*

**Q: Vì sao hồ sơ của tôi bị từ chối?**
A: **Không giải thích lý do.** Escalate.

**Q: Tiền giải ngân về đâu?**
A: Về tài khoản Cake của khách.

**Q: Bao giờ bắt đầu tính lãi?**
A: Từ ngày giải ngân thành công.

## Khoản vay của sản phẩm đã ngừng bán

**Q: App [đối tác] không còn thấy khoản vay, tôi trả nợ kiểu gì?**
A: Khoản vay vẫn còn và vẫn thanh toán được — trên **app Cake**. Chỉ phần kết nối với
app đối tác đã đóng. Xem `channels/cake-app.md`.

**Q: Sản phẩm ngừng rồi thì tôi hết nợ đúng không?**
A: Không. Nghĩa vụ trả nợ giữ nguyên theo hợp đồng đã ký.

## Câu hỏi luôn phải escalate

- Khiếu nại về số tiền (dư nợ, phạt, tiền bị trừ).
- Xin giảm/miễn lãi hoặc phạt, xin cơ cấu nợ, xin gia hạn.
- Khoản vay bị khoá.
- Lý do bị từ chối hoặc hạn mức thấp.
- Khách nói bị bên thứ ba đòi nợ.
- Bất kỳ câu hỏi nào cần số liệu mà hệ thống không tra được.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ` · *Chưa có nội dung. Ops bổ sung.*

Gợi ý: case hay gặp và cách xử lý · lỗi hệ thống đã biết · tra cứu ở đâu ·
khi nào escalate và cho ai.

## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ` · *Chưa có nội dung. PO bổ sung.*

Gợi ý: vì sao chính sách đặt như vậy · lịch sử thay đổi và lý do ·
ràng buộc hệ thống · backlog đang làm dở.

## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở mục 1–3.

**Không đọc cho khách:**

- Phân nhóm khách, product code (`CAKEM01`…), whitelist, pre-approve, và việc hạn mức khác nhau theo nhóm.
- Tiêu chí chấm điểm, lý do từ chối.
- Trạng thái write-off.
- Cơ chế thu nợ tự động (ngưỡng, tần suất, cách chọn danh sách).
- Tên hệ thống nội bộ, tên thông tư.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Jira | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
