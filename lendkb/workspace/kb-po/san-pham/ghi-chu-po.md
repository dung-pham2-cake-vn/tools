---
title: Ghi chú PO theo sản phẩm
audience: [po]
last_verified: 2026-10-06
owner: dung.pham2
status: draft
---

# Ghi chú PO theo sản phẩm

Trước nằm ở mục 5 "Ghi chú sản phẩm — PO / Product" trong từng trang `kb/`.
Tách ra 2026-10-06 để `kb/` chỉ còn kiến thức Ops/CSKH dùng xử lý ticket.
Chỉ chép các trang mục 5 có nội dung; trang còn để trống thì bỏ.

Gợi ý nội dung: vì sao chính sách đặt như vậy · ràng buộc hệ thống · backlog · ý tưởng cải thiện.

## [[kb/channels/dop]]

- DOP là kênh có nhiều sản phẩm nhất (17/30). Thay đổi luồng chung ảnh hưởng diện rộng.
- Việc khách phải chuyển sang app Cake để trả nợ là điểm gãy trải nghiệm đã biết, đáng đo tỷ lệ rơi.

## [[kb/channels/native-api]]

- Kênh này Cake mất quyền kiểm soát trải nghiệm onboarding. Chất lượng phụ thuộc đối tác.
- Không có tài liệu màn hình từ phía đối tác là khoảng trống có hệ thống, ảnh hưởng cả CSKH lẫn QA.

## [[kb/products/od/faq]]

- Hai câu hỏi phổ biến nhất đều xuất phát từ thiết kế hiển thị và cơ chế thu nợ, không phải từ việc khách không hiểu sản phẩm. Đáng đưa vào backlog cải thiện.

## [[kb/products/od/loan-management]]

- Cơ chế tự tất toán sổ ở DPD+4 rất sớm so với bậc khoá (6 ngày). Cần xem lại trải nghiệm: khách mất sổ tiết kiệm trước cả khi bị khoá hạn mức.
- Wording "đang áp dụng lãi suất" khi dư nợ 0 gây hiểu nhầm, đáng sửa.

## [[kb/products/od/onboarding]]

- v2 chuyển từ 1 sổ sang tối đa 5 sổ, và từ 85% phẳng sang 90%/75% theo loại sổ.
- Sản phẩm đang `[IN PROGRESS]`, lãi suất chưa chốt. KB không chuyển `reviewed` được cho tới khi có số.

## [[kb/products/od/overview]]

- Lãi suất v2 chuyển từ cố định sang động theo lãi sổ tiết kiệm của khách — mỗi khách một mức, không có mức chung để truyền thông.
- Hạn mức tách theo loại sổ (90%/75%) thay vì 85% phẳng.
- Page nguồn vẫn ghi lãi suất **TBD**, trạng thái `[IN PROGRESS]`. Cần chốt trước khi KB chuyển `reviewed`.

## [[kb/products/payday/faq]]

- FAQ này chưa dựa trên dữ liệu thật. Khi có nguồn ticket CSKH, nên đo lại tần suất thực tế thay vì suy đoán.

## [[kb/products/payday/loan-management]]

- Phí tất toán sớm của Payday chưa thống nhất: 0% (Be), chưa áp dụng (FIZA), chưa rõ (5 sản phẩm còn lại). Nên chốt một chính sách chung.

## [[kb/products/payday/onboarding]]

- Payday là nhóm có nhiều ràng buộc "lần 1 / lần 2+" nhất. Mỗi đối tác một bậc khác nhau, chưa thống nhất.
- Bảo hiểm bắt buộc ở 2/7 sản phẩm — ảnh hưởng trực tiếp tới tỷ lệ bỏ giữa chừng, đáng theo dõi.

## [[kb/products/paylater/faq]]

- Ba hiểu nhầm trên đều bắt nguồn từ cách hiển thị trên app và hợp đồng. Đáng xem lại wording ở màn ký hợp đồng.

## [[kb/products/paylater/loan-management]]

- Mức tối thiểu 30% nhưng cơ sở tính khác nhau giữa các đối tác (có nơi gồm phí, có nơi không). Nên thống nhất.
- Giới hạn 100 triệu/tháng cho rút tiền mặt là ràng buộc Thông tư 18, không phải chính sách sản phẩm.

## [[kb/products/paylater/onboarding]]

- Màn ký hợp đồng Paylater không hiện lãi suất (spec ghi rõ phần lãi bị gạch) — khác Cashloan. Cần xem lại có đúng yêu cầu tuân thủ không.
- Hai nhóm cùng đối tác Be nhưng lãi 0% và 40% — tiêu chí phân nhóm cần được ghi lại rõ hơn.

## [[kb/products/paylater/overview]]

- Nhóm Paylater dùng mô hình doanh thu khác hẳn: phí hạn mức thay vì lãi. So sánh hiệu quả với Cashloan phải quy về cùng đơn vị, không so lãi suất trực tiếp.
- Lãi suất trải từ 0% đến 40% ngay trong cùng một đối tác (`BE_paylater` có cả `PLBE_01` 0% và `PLBE_02` 40%).
- Hai sản phẩm đang ngừng bán (`FPT_paylater`, `VDS_paylater_epass`) — `FPT_paylater` còn dư nợ đáng kể.
