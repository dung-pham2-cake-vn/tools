---
title: Cashloan — BeGroup (Be_Cashloan)
product: cashloan
partner: be
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-13946
  - jira:PL-9170
  - confluence:39453176
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# BeGroup — Be_Cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-09-03.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | BeGroup |
| Loại sản phẩm | cashloan |
| ProductId | `Be_Cashloan` |
| Onboarding source | `dop_be_cashloan` |
| Contract type | `BE_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | DOP |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

### Theo điểm rủi ro BE score v2 — nguồn Jira, mới nhất

| Nhóm | Product code | Hạn mức | Lãi có bảo hiểm | Lãi không bảo hiểm |
|---|---|---|---|---|
| 1 | `BECL01` | 10 – 40 triệu | 43%/năm | 48%/năm |
| 2 | `BECL02` | 10 – 40 triệu | 45%/năm | 50%/năm |
| 3 | `BECL03` | 10 – 30 triệu | 48%/năm | 53%/năm |
| 4 | `BECL04` | 10 – 30 triệu | 50%/năm | 55%/năm |
| 5 | `BECL05` | 10 – 20 triệu | 50%/năm | 55%/năm |
| Không có điểm | `BECL06` | 10 – 20 triệu | 50%/năm | 55%/năm |

Nguồn: [PL-13946](https://cakedigitalbank.atlassian.net/browse/PL-13946), live 2026-09-03.

### Chỉ tiêu chung

| Chỉ tiêu | Giá trị |
|---|---|
| Kỳ hạn | **3 – 24 tháng** |
| Phí bảo hiểm | **7%** trên số tiền vay, cộng vào khoản vay |
| Phạt gốc chậm | 150% × lãi suất × nợ gốc × số ngày chậm ÷ 365 |
| Phí tất toán trước hạn | **8%** nếu tất toán **trước** due date kỳ 3 · **5%** từ kỳ 3 trở đi |
> **Phí tất toán 8%/5%** — xác nhận bởi PO 2026-10-02.
> [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) (live 2025-07-28).
> Trang Product Policy ghi 3% là **ảnh chụp cũ**, trước 2025-05 — xem `_meta/lich-su-phi-tat-toan.md`.
>
> Cơ sở tính: **dư nợ gốc chưa đến hạn** (`prin_not_d`), không phải toàn bộ dư nợ.
| Thu nhập tối thiểu | 5 triệu/tháng |

> **Số đúng là 10–40 triệu / lãi 43–55%** — PO xác nhận 2026-10-02, *"mới lên vừa rồi"*.
> Trang Confluence `39453176` ghi 10–50 triệu / 25–54% là **bản cũ**, trước khi chuyển
> sang BE score v2 ([PL-13946](https://cakedigitalbank.atlassian.net/browse/PL-13946), 2026-09-03).



Chuyển từ BE score v1 sang v2: lãi nhóm tốt nhất **tăng từ 25% lên 43%**.
Khách vay lại sẽ thắc mắc — không giải thích cơ chế chấm điểm.

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## 3. Phí tất toán trước hạn — đã xác minh Jira

| Thời điểm tất toán | Phí |
|---|---|
| **Trước** ngày đến hạn kỳ thứ 3 | **8%** dư nợ còn lại |
| **Từ** ngày đến hạn kỳ thứ 3 trở đi | **5%** dư nợ còn lại |

Nguồn: [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170), live 2025-07-28 —
áp dụng chung cho Cake / VDS / MWG / Be / VNPay Cashloan.

Đây là mục **duy nhất** đã xác minh Jira trong file này. Các số còn lại vẫn chưa điền.

## 3b. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [x] Phí và điều kiện tất toán trước hạn — **xong** (PL-9170)
- [ ] Điểm khác biệt so với `products/cashloan/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc `products/cashloan/overview.md` và `channels/dop.md` trước file này.

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

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-09-30 | Tạo file, điền thông số từ Jira | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
