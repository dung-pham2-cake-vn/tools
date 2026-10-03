---
title: Tổng quan — Cashloan (Cake)
product: cashloan
partner: cake
channel: cake-app
topic: overview
sources:
  - confluence:198148097
  - confluence:27918827
  - jira:PL-14087
  - jira:PL-13667
  - jira:PL-12970
  - jira:PL-11683
  - jira:PL-9170
  - jira:PL-5240
last_verified: 2026-09-30
owner: dung.pham2
audience: [ops, po]
status: draft
numbers_source: jira
needs_jira_verify: false
numbers_asof: 2026-08-25
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Cashloan là khoản vay tiền mặt trả góp hàng tháng. Với sản phẩm của chính Cake
(`CAKE_cashloan`), khách đăng ký và ký hợp đồng ngay trên app Cake, tiền giải ngân
về tài khoản thanh toán của khách tại Cake.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| ProductId | `CAKE_cashloan` |
| Onboarding source | `cake_cashloan` |
| Contract type | `CAKE_CASHLOAN` |
| Kênh | app Cake |
| Xác thực NFC | Bắt buộc, cả khi đăng ký lẫn khi ký hợp đồng |
| Giải ngân về | Tài khoản Cake của khách |
| Ký hợp đồng tại | App Cake |

Cashloan còn được cung cấp qua nhiều đối tác khác (Viettel, VNPAY, BeGroup, MWG,
KLP, Vnpost, ZaloPay, MISA). **Điều kiện và biểu phí của các đối tác khác nhau** —
xác định đúng sản phẩm trước khi trả lời bất kỳ con số nào. Tra `_meta/product-matrix.md`.

## Cấu trúc một khoản vay

Khách trả hàng tháng một khoản cố định gồm gốc và lãi (tính theo công thức PMT).
Lãi tính trên dư nợ gốc thực tế, theo số ngày thực tế, chia cho 365.

Thành phần có thể phát sinh:

- **Phí bảo hiểm** — nếu khách chọn mua bảo hiểm khoản vay (OPES). Phí được **cộng vào số tiền vay**, không thu riêng.
- **Phạt trả chậm gốc** — khi trả chậm.
- **Phạt trả chậm lãi** — khi trả chậm.
- **Phí tất toán trước hạn** — khi khách trả hết sớm.

Chọn mua bảo hiểm thì lãi suất thấp hơn so với không mua.

## Phân nhóm khách

Hạn mức và điều kiện phụ thuộc nhóm khách. Có 4 nhóm: khách mới (Mass),
khách thuộc danh sách chọn sẵn (Pre-approve/ETB), khách từng vay và đã tất toán (Repeat),
và khách đang có khoản vay muốn vay thêm (Upsell).

**Không nói với khách họ thuộc nhóm nào.** Chỉ dùng thông tin này để agent hiểu vì sao
hạn mức mỗi khách một khác.

## Điều kiện khách hàng

- Độ tuổi 20–50.
- Thu nhập từ 5 triệu đồng/tháng.

## Hạn mức, kỳ hạn, lãi suất

**Số liệu đã đối chiếu Jira, cập nhật tới 2026-08-25.**

| Nhóm khách | Product code | Hạn mức | Lãi suất có bảo hiểm | Lãi suất không bảo hiểm |
|---|---|---|---|---|
| Khách mới (gồm bán chéo) | `CAKEM01` | 5 – 50 triệu | 52%/năm | 59%/năm |
| Chọn sẵn / đã có quan hệ | `CAKEP01` | 5 – 60 triệu | 52%/năm | 59%/năm |
| Vay lại | `CAKER01` | 5 – 60 triệu | 52%/năm | 59%/năm |
| Vay thêm | `CAKEU01` | 5 – 25 triệu | 52%/năm | 59%/năm |

**Kỳ hạn:** 6 – 60 tháng, mọi nhóm.

**Phí bảo hiểm:** 7% trên số tiền vay, cộng vào khoản vay. Mua bảo hiểm được giảm 7%/năm lãi suất.

Truy nguồn từng con số:

| Chỉ tiêu | Ticket | Live |
|---|---|---|
| Hạn mức 4 nhóm | [PL-14087](https://cakedigitalbank.atlassian.net/browse/PL-14087) | 2026-08-25 |
| Lãi suất có BH 48% → 52% | [PL-13667](https://cakedigitalbank.atlassian.net/browse/PL-13667) | 2026-07-23 |
| Kỳ hạn lên 60 tháng | [PL-12970](https://cakedigitalbank.atlassian.net/browse/PL-12970) | 2026-06-15 |
| Lãi 48/59%, phí BH 5% → 7% | [PL-11683](https://cakedigitalbank.atlassian.net/browse/PL-11683) | 2026-02-04 |

**Con số cụ thể của từng khách vẫn phải tra hệ thống** — bảng trên là khung chính sách,
không phải điều kiện đã duyệt cho một khách.

### Lệch so với Confluence

Page `198148097` có 2 chỗ sai, **lấy theo Jira**:

| | Confluence | Jira (đúng) |
|---|---|---|
| Hạn mức nhóm `CAKEP01` | 10 – 60 triệu | **5** – 60 triệu |
| Mục "1. Phân loại KH" | 10–100tr / 3–48 tháng / 35–50% | Đã cũ hoàn toàn, bỏ qua |

Bảng đầu trang Confluence về cơ bản đúng (59%/52%, 6–60 tháng), chỉ sai mức tối thiểu
của `CAKEP01`. Ticket PL-14087 có comment xử lý đúng điểm này: *"ticket 'hiện tại' ghi
CAKEP01 min=5tr nhưng file thực=10tr — user chọn đổi min=5tr theo bảng ticket"*.

Mục "1. Phân loại KH" trên Confluence đã cũ toàn bộ — **không dùng**.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Khung chính sách ở dưới đã đối chiếu Jira và dùng được. Nhưng **điều kiện thực tế của từng khách phải tra hệ thống** — hạn mức và lãi suất mỗi khách một khác trong khung đó.
- Số tiền tất toán, dư nợ, lịch trả nợ phải lấy từ hệ thống, không tự tính.
- Khách hỏi về khoản vay Cashloan qua đối tác khác → chuyển sang file đối tác tương ứng.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ` · *Chưa có nội dung. PO bổ sung.*

Gợi ý: vì sao chính sách đặt như vậy · lịch sử thay đổi và lý do ·
ràng buộc hệ thống · backlog đang làm dở.

## 6. Số liệu kinh doanh

🔴 `hạn chế` — xem `kb-po/business/README.md` (chỉ PO).

## 7. Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở mục 1–3.

**Không đọc cho khách:**

- Tên nhóm/segment và product code (`CAKEM01`, `CAKEP01`, `CAKER01`, `CAKEU01`).
- Tiêu chí để lọt vào danh sách pre-approve hay whitelist.
- Tiêu chí chấm điểm và lý do từ chối hồ sơ.
- Tên hệ thống nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Jira | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
