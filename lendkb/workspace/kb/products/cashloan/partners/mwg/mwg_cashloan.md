---
title: Cashloan — MWG (MWG_cashloan)
product: cashloan
partner: mwg
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12086
  - jira:PL-9170
  - confluence:189300737
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

# MWG — MWG_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-04-07.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | MWG |
| Loại sản phẩm | cashloan |
| ProductId | `MWG_cashloan` |
| Onboarding source | `dop_mwg_cashloan` |
| Contract type | `MWG_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | None |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `CLMWGR01` |
| Hạn mức | **5 – 40 triệu** (bước 1 triệu) |
| Kỳ hạn | **6 – 48 tháng** (bước 3 tháng) |
| Lãi suất | **43% – 60%/năm**, tuỳ nhóm rủi ro và có/không bảo hiểm |
| Phí bảo hiểm | 7% trên số tiền vay, cộng vào khoản vay |
| Phạt gốc chậm | 150% × lãi suất × nợ gốc × số ngày chậm ÷ 365 |
| Phạt lãi chậm | 10% × lãi quá hạn × số kỳ chậm — **chưa áp dụng** |
| Phí tất toán trước hạn | **8%** nếu tất toán **trước** due date kỳ 3 · **5%** từ kỳ 3 trở đi |
> **Phí tất toán 8%/5%** — xác nhận bởi PO 2026-10-02.
> [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) (live 2025-07-28).
> Trang Product Policy ghi 3% là **ảnh chụp cũ**, trước 2025-05 — xem `_meta/lich-su-phi-tat-toan.md`.
>
> Cơ sở tính: **dư nợ gốc chưa đến hạn** (`prin_not_d`), không phải toàn bộ dư nợ.

### Nhóm khách có lương bảo hiểm xã hội (`MWGSL01`)

| | Nhóm Mass | BHXH ≥ 6 triệu, risk_group = 1 | BHXH < 6 triệu |
|---|---|---|---|
| Lãi có bảo hiểm | 48% | **39%** | 48% |
| Lãi không bảo hiểm | 53% | **44%** | 53% |

Nhóm BHXH ≥ 6 triệu và được LOS xếp `risk_group = 1` hưởng lãi thấp hơn ~9 điểm.



**Phí bảo hiểm nhóm `MWGSL01` đã bỏ mức 5%, còn 7% mọi trường hợp**
([PL-12086](https://cakedigitalbank.atlassian.net/browse/PL-12086), live 2026-04-07).

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng toàn bộ sản phẩm lending. Xác nhận bởi PO 2026-10-01.

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
