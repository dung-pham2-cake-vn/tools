---
title: Paylater — MWG (MWG_paylater)
product: paylater
partner: mwg
channel: dop + cake
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-8380
  - jira:PL-8376
  - jira:PL-14106
  - confluence:399048808
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# MWG — MWG_paylater

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-08-25.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | MWG |
| Loại sản phẩm | paylater |
| ProductId | `MWG_paylater` |
| Onboarding source | `dop_mwg_paylater`, `cake_app_mwg_paylater` |
| Contract type | `MWG_PAYLATER` |
| Kênh | dop + cake |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `PLMWG_01` |
| Hạn mức | 1 – 25 triệu → 1 – 40 triệu → **mặc định 60 triệu** (nhóm có điểm đối tác) |
| Kỳ hạn | 60 tháng |
| Lãi suất | **55%/năm** |
| Lãi phạt gốc quá hạn | **55%** |
| Phí phạt chậm thanh toán | **50.000đ tại mỗi mốc DPD 1, 5, 10, 15** |
| Phí sử dụng hạn mức | 20.000đ/tháng (chưa VAT) · **22.000đ** (đã VAT), khi có giao dịch trong tháng |
| Thanh toán tối thiểu | 30% dư nợ gốc + lãi phát sinh |
| Tất toán trước hạn | Được phép |

> **Phí phạt chậm thu 4 lần, không phải một lần.** 50.000đ ở mỗi mốc DPD 1, 5, 10, 15 —
> khách quá hạn 15 ngày chịu tới **200.000đ** tiền phạt chậm, chưa kể lãi phạt.
> Đây là chỗ khách dễ khiếu nại nhất.

Nâng hạn mức lên 60 triệu từ [PL-14106](https://cakedigitalbank.atlassian.net/browse/PL-14106) (live 2026-08-25).

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## 3. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với `products/paylater/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

## Spending MWG Paylater (QTV) — giới hạn thời gian

| Giới hạn | Giá trị | Mã lỗi khi vượt |
|---|---|---|
| **Yêu cầu thanh toán hết hạn** | **5 phút** kể từ lúc gọi `payment-request` | `500004` — *"Yêu cầu thanh toán hết hạn. Vui lòng thực hiện yêu cầu mới."* |
| Token webview | **5 phút** | `500017` — *"Ví chưa liên kết hoặc đã hết hạn"* |
| Hiệu lực OTP | **2 phút** | `160004` — OTP không chính xác |
| Số lần nhập sai OTP | **3 lần** → huỷ giao dịch | `160003` — OTP vượt quá số lần nhập cho phép |

Nguồn: [PL-8376](https://cakedigitalbank.atlassian.net/browse/PL-8376) ·
[PL-8380](https://cakedigitalbank.atlassian.net/browse/PL-8380) — cả hai Released.

> **Khách báo "đang thanh toán thì bị văng, tiền không trừ"**: nhiều khả năng quá 5 phút
> kể từ lúc tạo yêu cầu. Giao dịch chuyển `FAILED`, **tiền không bị trừ**.
> Hướng dẫn khách tạo lại đơn, thao tác trong vòng 5 phút.
>
> Phân biệt với `status = FAILED` do lỗi thật — xem `operations/ma-loi-api.md`.

### Mã lỗi spending khác

| Mã | Nghĩa |
|---|---|
| `150001` | Số tiền vượt hạn mức — ví không đủ hạn mức |
| `500007` | Ví trả sau đang bị hạn chế — **không giải thích lý do, escalate** |

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc `products/paylater/overview.md` và `channels/dop.md` trước file này.

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
