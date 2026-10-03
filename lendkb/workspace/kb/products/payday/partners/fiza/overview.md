---
title: Payday — FIZA
product: payday
partner: fiza
topic: overview
sources:
  - confluence:1961427498
  - confluence:1961427522
  - confluence:1961427545
  - confluence:1961427594
  - jira:PL-13475
last_verified: 2026-09-30
numbers_asof: 2026-08-18
jira_checked: 2026-10-01
owner: dung.pham2
audience: [ops, po]
status: draft
numbers_source: confluence
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Vay ngắn ngày cho khách FIZA. Số tiền nhỏ, trả gốc và lãi một lần vào cuối kỳ.
Giải ngân về tài khoản Cake, hoặc tài khoản khách chỉ định tại Napas/VPBank.

> **Chưa có trong bảng Partnership products.** Jira [PL-13475](https://cakedigitalbank.atlassian.net/browse/PL-13475)
> đã Done từ 2026-07-08 và có đủ page nghiệp vụ, nhưng bảng chuẩn chưa liệt kê.
> Chủ sở hữu matrix sẽ bổ sung sau. Nội dung dưới đây **chưa đối chiếu được với bảng chuẩn.**

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| ProductId | `FIZA_payday` |
| Product code | `FIZAPD01` |
| Đối tác | FIZA |
| Giải ngân về | Tài khoản Cake, **hoặc** tài khoản thanh toán khách chỉ định tại Napas / VPBank |

Sản phẩm này là **Payday** — đọc `products/payday/overview.md` trước.

## Điều kiện khách hàng

- Độ tuổi 20–50.
- Thu nhập từ 5 triệu đồng/tháng.

## Số tiền và kỳ hạn

- **Số tiền vay**: 2.000.000 – 6.000.000đ. Mặc định 3 triệu, bước nhảy 1 triệu.
- **Kỳ hạn**: khách mới 30 ngày. Khách cũ chọn 30–45 ngày, bước nhảy 15 ngày.

## Lãi và phí

| Khoản | Mức |
|---|---|
| Lãi suất | **60%/năm**, có hay không có bảo hiểm đều như nhau |
| Phí bảo hiểm khoản vay | **9%** trên số tiền vay |
| Phạt gốc chậm trả | 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm |
| Phạt lãi chậm trả | **Chưa hỗ trợ** |
| Phí tất toán trước hạn | **Không có phí** |
| Điều kiện tất toán trước hạn | Không yêu cầu — tất toán bất kỳ lúc nào |

**Điểm khác biệt đáng chú ý:** mua bảo hiểm ở FIZA **không được giảm lãi suất**
(khác Cake cashloan và MBF). Khách hỏi mua bảo hiểm có lợi gì về lãi → **trả lời là không giảm lãi**.

Tất toán sớm hiện **không mất phí**.

## Khác biệt so với sản phẩm khác

| | MBF cashloan | FIZA payday |
|---|---|---|
| Loại | Trả góp hàng tháng | Trả một lần cuối kỳ |
| Kỳ hạn | 6–48 tháng | 30–45 ngày |
| Lãi suất | 47–57%/năm tuỳ nhóm | 60%/năm, cố định |
| Bảo hiểm giảm lãi | Có, 5%/năm | **Không** |
| Phí bảo hiểm | 7% | **9%** |
| Phí tất toán sớm | Chưa rõ | **Chưa áp dụng** |

## Điểm chưa rõ

- Sản phẩm chưa có trong bảng Partnership products: chưa xác nhận được kênh (DOP hay API), yêu cầu NFC, và nơi ký hợp đồng.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Kiểm tra khoản vay là `FIZA_payday` trước khi trả lời số liệu.
- Khách vay lần đầu **không chọn được** số tiền và kỳ hạn — mặc định 3 triệu / 30 ngày.
- Giải ngân có thể về ngân hàng khác, không nhất thiết về tài khoản Cake. Khách hỏi "tiền về đâu" → kiểm tra tài khoản nhận trên hồ sơ, đừng mặc định là Cake.

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

- Product code `FIZAPD01`, quy tắc sinh mã tài khoản.
- Tiêu chí chấm điểm, lý do từ chối.
- Tên hệ thống nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
