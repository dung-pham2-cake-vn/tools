---
title: Confluence cần cập nhật — Jira đã có số mới hơn
audience: [po]
last_verified: 2026-10-03
owner: dung.pham2
status: open
note: "Đã đối chiếu lại với bản Confluence LIVE ngày 2026-10-03, không phải với bản export cũ"
---

# Trang Confluence cần cập nhật

Chỗ nào **Jira đã có dữ liệu mới hơn** nhưng trang Confluence chưa sửa.
Mỗi dòng có **ticket PL** và **ngày live** để đối chiếu.

> **Đối chiếu lại 2026-10-03** trên bản live của 12 trang. PO đã sửa xong
> 3 trang: `198148097` (ver 16), `310444033` (ver 8), `453182180` (ver 10).
> Những dòng đã xong chuyển xuống mục "Đã sửa".

---

## A. Lỗi lặp trên cả bộ template — sửa được một lượt

Mỗi trang Product Policy có **ba chỗ nhắc lại phí tất toán** ngoài bảng cấu hình
chính. Đợt sửa vừa rồi mới chạm bảng chính, **ba chỗ kia vẫn ghi 3%** — kể cả
trên 3 trang sửa hôm nay.

Vị trí giống hệt nhau ở mọi trang:

| Mục | Dòng | Đang ghi |
|---|---|---|
| `1. Phân loại KH` | Early termination fee → *Phí tất toán sớm khoản vay* | `3% dư nợ còn lại` |
| `3. Số tiền phải trả hàng tháng` | dòng 6 *Phí thanh toán trước hạn (nếu có)* | `3% dư nợ còn lại` |
| `4. Tất toán trước hạn` | *Các khoản tiền phải thanh toán sẽ bao gồm:* | `Phí trả nợ trước hạn (3% * dư nợ còn lại)` |

Phải là: **8%** nếu ngày tất toán `<` due kỳ 3 · **5%** nếu `>=` due kỳ 3
([PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170), live 2025-07-22).

| # | Trang | Số chỗ còn 3% | Bảng chính đã đúng? |
|---|---|---|---|
| A1 | [198148097](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/198148097) `[CAKE] Cashloan` | 3 | ✅ đã sửa hôm nay |
| A2 | [310444033](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/310444033) `[VNPAY] Cashloan` | 2 | ✅ đã sửa hôm nay |
| A3 | [453182180](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/453182180) `[ZaloPay] Cashloan` | 3 | ✅ |
| A4 | [189300737](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/189300737) `[MWG] Cashloan` | 3 | ✅ |
| A5 | [39453176](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/39453176) `[BeG] Cashloan` | 3 | ❌ **bảng chính cũng còn 3%** |
| A6 | [15368221](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/15368221) `[Viettel] Cashloan 2` | 3 | ❌ **bảng chính cũng còn 3%** |

`39453176` và `15368221` là hai trang **chưa đụng tới chút nào** — PL-9170 nêu đích
danh *Be Cashloan* và *VDS Cashloan*, nên hai trang này sai từ bảng chính trở đi.

---

## B. Lệch cách diễn đạt — cùng một chính sách, hai cách hiểu

| # | Trang | Đang ghi | PL-9170 ghi | Chênh |
|---|---|---|---|---|
| B1 | [189300737](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/189300737) `[MWG] Cashloan` | *"Tất toán trong 3 kỳ đầu: 8% · từ kỳ thứ 4: 5%"* | *"Ngày tất toán < due date kỳ thứ 3: 8% · >= due date kỳ thứ 3: 5%"* | MWG thu 8% **thêm một kỳ** |

Ba trang kia (`198148097`, `310444033`, `453182180`) dùng đúng câu của PL-9170.
Hoặc MWG thật sự khác, hoặc trang viết sai — cần PO chốt rồi thống nhất một câu.

---

## C. Còn lại theo trang

| # | Trang | Mục | Đang ghi | Phải là | Ticket PL | Live | Tồn |
|---|---|---|---|---|---|---|---|
| C1 | [198148097](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/198148097) `[CAKE] Cashloan` | Bảng ngày lễ dời due date | Mới tới **2024** | Lịch dùng chung toàn lending, cập nhật đầu mỗi năm | — *(không có ticket)* | — | — |
| C2 | [39453176](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/39453176) `[BeG] Cashloan` | Hạn mức · lãi suất | 10–50 triệu · 25–54% | **10–40 triệu** · **43–55%** theo 6 nhóm BE score v2 | [PL-13946](https://cakedigitalbank.atlassian.net/browse/PL-13946) | 2026-09-03 | 1 th |
| C3 | [399048808](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/399048808) `[MWG] Paylater` | Cột Limit | 3 mức chồng nhau: `1–25 / 1–40 / Default 60` | Giữ **60 triệu**, xoá 2 mức cũ | [PL-14106](https://cakedigitalbank.atlassian.net/browse/PL-14106) | 2026-08-25 | 1 th |
| C4 | [27918827](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/27918827) **Partnership products** | **Thiếu dòng** `MBF_cashloan` | — | Thêm dòng: kênh · NFC · nơi ký hợp đồng | [PL-12531](https://cakedigitalbank.atlassian.net/browse/PL-12531) | 2026-08-17 | 2 th |
| C5 | [27918827](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/27918827) **Partnership products** | **Thiếu dòng** `FIZA_payday` | — | Thêm dòng | [PL-13475](https://cakedigitalbank.atlassian.net/browse/PL-13475) | 2026-09-08 | 1 th |
| C6 | Nhiều trang Product Policy | Lãi phạt lãi chậm | *"10% × lãi quá hạn × số kỳ chậm"* | Ghi rõ **core chưa hỗ trợ, khách không bị thu** — như `15368221` đã ghi *"HIỆN TẠI MAMBU chưa support"* | 19 ticket spec `get-loan-detail` trả `penalty_interest_balance = 0đ`, vd [PL-12920](https://cakedigitalbank.atlassian.net/browse/PL-12920) | — | — |

Trang `27918827` hiện có **26 dòng sản phẩm**. Ngoài MBF và FIZA_payday, ba sản phẩm
đang phát triển cũng chưa có dòng: `KOV_cashloan`, `LCP_paylater`, `FIZA_cashloan` —
để sau khi live mới thêm thì bỏ qua.

---

## D. Mới phát hiện khi đối chiếu bản live — cần PO quyết, đừng sửa vội

| # | Trang | Vấn đề |
|---|---|---|
| D1 | [198148097](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/198148097) `[CAKE] Cashloan` | Bảng hạn mức mới sửa ghi **Pre-approve 10–60** và **Upsell 5–30**. [PL-14087](https://cakedigitalbank.atlassian.net/browse/PL-14087) (Released 2026-08-25) ghi **Pre-approve 5–60** và **Upsell 5–25**. Mass 5–50 và Repeat 5–60 thì khớp. → Hai ô lệch so với ticket |
| D2 | [198148097](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/198148097) `[CAKE] Cashloan` | Trang chỉ có **4 segment**. [PL-14276](https://cakedigitalbank.atlassian.net/browse/PL-14276) (Ready4Release, resolved 2026-09-29) định nghĩa **6**: thêm `CAKEX01` (Xsell 5–50) và `CAKEXE01` (Xsell_Eli 5–60). Cùng ticket đó ghi `CAKEP01` = `PRE_APPROVED_MAX100` **70–100 triệu** — tức ba nguồn cho ba giá trị `CAKEP01` khác nhau (trang 10–60 · PL-14087 5–60 · PL-14276 70–100) |
| D3 | [310444033](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/310444033) `[VNPAY] Cashloan` | Đợt sửa đã dọn hai giá trị ghi chồng, nhưng **giữ bản `5–40 triệu` · `6–38 tháng`**. KB đang ghi `5–50 triệu` · `6–36 tháng` (xem `products/cashloan/partners/vnpay/`). Không tìm được ticket PL nào quyết hạn mức VNPAY → không biết bên nào đúng. Nếu trang mới là đúng thì **KB phải sửa theo**, không phải ngược lại |

---

## E. Chưa xác nhận — câu hỏi cho PO

| Trang | Nghi vấn | Mã theo dõi |
|---|---|---|
| [369688578](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/369688578) `[Vnpost] Cashloan` (6 chỗ ghi 3%) · [164397075](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/164397075) `[NGS] Cashloan` (3 chỗ) | PL-9170 **không nêu tên** hai sản phẩm này. 3% là chính sách thật, hay cũng là bản cũ như 5 trang kia? NGS đã ngừng nên có thể không cần sửa | B14 |
| [986873857](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/986873857) `VDS Payday Payroll` vs [23691338](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/23691338) `[Viettel] Payday 2` | Phạt gốc chậm: **0%** vs **150%**, cùng sản phẩm `VT_Payday_S` | B9 |
| [54067746](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/54067746) `[Viettel] Paylater` | Kỳ hạn **60 tháng**; trang VNPay Maturity viết *"thay vì 36 tháng như VDS Paylater"* | B16 |
| [1833697315](https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/1833697315) `[CAKE] Cake OD v2` | Lãi suất ghi **"TBD — Business confirm"**, sản phẩm vẫn `[IN PROGRESS]` | B3 |

---

## Đã sửa — đối chiếu 2026-10-03

| Trang | Mục | Nay ghi |
|---|---|---|
| `198148097` ver 16 | Phí tất toán (bảng chính) | `< due kỳ 3: 8%` · `>= due kỳ 3: 5%` |
| `198148097` ver 16 | Bảng hạn mức | Còn **một dòng mỗi nhóm**, hết cảnh 2 dòng chồng nhau |
| `198148097` ver 16 | Mục `1. Phân loại KH` | Đã bỏ bộ số sai `10–100tr · 3–48 th · 35–50%` |
| `310444033` ver 8 | Phí tất toán · điều kiện · lãi suất | `8% / 5%` · *"Không chặn"* · `55%` / `50%` |
| `453182180` ver 10 | Hạn mức · kỳ hạn | `3–70 triệu` · `3–60 tháng` |
| `1774879256` ver 6 | MWG_payday | Đã có `30 ngày` / `30 & 45 ngày`, phí BH `8%`, hạn mức `2–6 triệu` |
| `1823572040` ver 5 | KLP_cashloan | Đã có kỳ hạn `6 – 36` |
