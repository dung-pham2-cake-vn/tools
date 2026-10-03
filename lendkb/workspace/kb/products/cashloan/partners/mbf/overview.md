---
title: Cashloan — MobiFone (MBF)
product: cashloan
partner: mbf
channel: dop
topic: overview
sources:
  - jira:PL-12974
  - confluence:1861025824
  - confluence:1861025856
  - confluence:1861025881
  - confluence:1861025931
  - jira:PL-12531
last_verified: 2026-09-30
numbers_asof: 2026-07-20
owner: dung.pham2
audience: [ops, po]
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## Tóm tắt

Vay tiền mặt cho khách MobiFone, đăng ký qua webview Cake nhúng trong app My MobiFone.
Tiền giải ngân về tài khoản Cake của khách.

> **Đã đối chiếu Jira 2026-10-01**: [PL-12974](https://cakedigitalbank.atlassian.net/browse/PL-12974)
> (Setup product code & cấu hình tài chính, live 2026-07-20) khớp đúng số trên Confluence.
>
> **Chưa có trong bảng Partnership products.** Jira [PL-12531](https://cakedigitalbank.atlassian.net/browse/PL-12531)
> đã Done từ 2026-04-24 và có đủ page nghiệp vụ, nhưng bảng chuẩn trên Confluence chưa
> liệt kê. Chủ sở hữu matrix sẽ bổ sung sau. Nội dung dưới đây lấy từ page nghiệp vụ của
> sản phẩm, **chưa đối chiếu được với bảng chuẩn.**

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| ProductId | `MBF_cashloan` |
| Onboarding source | `dop_mbf_cashloan` |
| Đối tác | MobiFone |
| Kênh | DOP — webview nhúng trong app My MobiFone |
| Giải ngân về | Tài khoản Cake (CASA) của khách |

## Điều kiện khách hàng

- Độ tuổi 20–50.
- Thu nhập từ 5 triệu đồng/tháng.

## Hạn mức và lãi suất

Chia theo 4 nhóm khách: khách mới, khách vay lại, khách vay thêm, và khách chéo sản phẩm.

| | Khách mới | Vay lại | Vay thêm | Chéo sản phẩm |
|---|---|---|---|---|
| Hạn mức | 5 – 40 triệu | 10 – 50 triệu | 5 – 40 triệu | 5 – 50 triệu |
| Lãi suất không bảo hiểm | 57%/năm | 52%/năm | 57%/năm | 57%/năm |
| Lãi suất có bảo hiểm | 52%/năm | 47%/năm | 52%/năm | 52%/năm |

**Kỳ hạn:** 6 – 48 tháng, bội số 3 tháng.

**Không nói với khách họ thuộc nhóm nào.** Con số cụ thể của từng khách lấy từ hệ thống.

## Bảo hiểm khoản vay

- Không bắt buộc.
- Phí bảo hiểm **7%**. Khi đăng ký tính trên hạn mức đề nghị; khi phê duyệt tính lại trên **số tiền được duyệt**.
- Mua bảo hiểm được **giảm 5%/năm** lãi suất.
- Phí bảo hiểm được **cộng vào số tiền vay**. Số tiền khách đề nghị và số LOS duyệt đều **chưa gồm bảo hiểm** — hệ thống cộng thêm khi tạo khoản vay và giải ngân.

Khách hay hiểu nhầm ở đây: số tiền nhận về và số tiền ghi nợ khác nhau đúng bằng phí bảo hiểm.
Giải thích rõ nếu khách thắc mắc.

## Phí tất toán trước hạn

| Thời điểm tất toán | Phí |
|---|---|
| Kỳ 1 – 3 | **8%** |
| Từ kỳ 4 | **5%** |

Tính trên **dư nợ gốc tất toán sớm**. Không có điều kiện ràng buộc — tất toán tự do.

Nguồn: [confluence:1861025856](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/1861025856),
trường `PrepaymentFee` / `EarlySettlementCondition`. Xác nhận bởi PO 2026-10-01.

## Trả chậm

- Phạt gốc chậm: **150%** × lãi suất × gốc chậm trả × số ngày chậm ÷ 365.
- **Không có phạt lãi chậm** — khác với Cake cashloan. BRD ghi rõ không áp dụng.

## Khác biệt so với Cashloan chung

| | Cake cashloan | MBF cashloan |
|---|---|---|
| Kênh | app Cake | webview trong app MobiFone |
| Lãi suất | *(đang mâu thuẫn nguồn)* | 47–57%/năm tuỳ nhóm và bảo hiểm |
| Kỳ hạn | *(đang mâu thuẫn nguồn)* | 6–48 tháng, bội số 3 |
| Phạt lãi chậm | Có | **Không** |
| Giảm lãi khi mua bảo hiểm | Có, mức chưa chốt | 5%/năm |

## Điểm chưa rõ

- Sản phẩm chưa có trong bảng Partnership products, nên chưa xác nhận được NFC onboard/ký và nơi ký hợp đồng.

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source `dop_mbf_cashloan` trước khi trả lời số liệu.
- **Không áp con số của Cake cashloan sang MBF** và ngược lại.
- Khách đăng ký trong app MobiFone nhưng khoản vay là của Cake — giải thích được điểm này khi khách bối rối về việc "vay của ai".

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

- Nhóm khách, mã phân khúc (`MBFCLN01`, `MBFCLR01`, `MBFCLU01`, `MBFCLX01`).
- Quy tắc sinh mã tài khoản, tên channel thu phí.
- Tiêu chí chấm điểm, lý do từ chối.
- Tên hệ thống nội bộ.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
