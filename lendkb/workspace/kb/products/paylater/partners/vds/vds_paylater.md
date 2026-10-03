---
title: Paylater — VDS (Viettel Money) (VDS_paylater)
product: paylater
partner: vds
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12553
  - confluence:54067746
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

# VDS (Viettel Money) — VDS_paylater

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-05-28.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | paylater |
| ProductId | `VDS_paylater` |
| Onboarding source | `API_VT_PAYLATER` |
| Contract type | `VIETTEL_PAYLATER` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | `PLVT_01` | `PLVT_03` (ePass) |
|---|---|---|
| Hạn mức | 1 – 5 triệu | 1 – 5 triệu |
| Kỳ hạn | 60 tháng *(xem cảnh báo)* | 60 tháng |
| Lãi suất | **0%** | **0%** |
| Phí phạt chậm thanh toán | 50.000đ | 50.000đ |
| Phí sử dụng hạn mức — **VDS thu** | 7% × giá trị giao dịch | 7% × giá trị giao dịch |
| Phí sử dụng hạn mức — **Cake thu** | *(nguồn ghi `???`)* | 33.000đ/tháng khi có giao dịch |
| Phí quản lý hạn mức/tháng | Không áp dụng | Không áp dụng |
| Lãi phạt gốc quá hạn | **Không áp dụng** | **Không áp dụng** |
| Lãi phạt lãi quá hạn | **Không áp dụng** | **Không áp dụng** |

**Thanh toán**: tối thiểu = 30% dư nợ gốc + lãi phát sinh · toàn bộ = tổng dư nợ gốc + lãi phát sinh.

> ⚠️ **Kỳ hạn: hai nguồn lệch.** Trang Product Policy `conf:54067746` ghi **60 tháng**.
> Trang `[Partner][VNPay] - Paylater - Maturity` lại viết *"Tenor = 60 tháng **thay vì 36 tháng
> như VDS Paylater**"* — tức VDS Paylater là **36 tháng**. Chưa rõ cái nào hiện hành (B16).

> **Không có lãi phạt quá hạn** — chỉ phí phạt chậm thanh toán cố định 50.000đ.
> Khác Cashloan và Payday.

> Ô "Phí sử dụng hạn mức Cake thu" của `PLVT_01` trên trang nguồn ghi `???` —
> **chưa xác định**, agent không trả lời mục này.

### Rút tiền mặt từ hạn mức

| Giới hạn | Giá trị |
|---|---|
| Mỗi giao dịch | 150.000đ – 5.000.000đ |
| Tổng mỗi tháng | 100 triệu (Thông tư 18) |
| Kỳ hạn trả góp | 1 – 12 tháng, không vượt số tháng còn lại hợp đồng |

Nguồn: [PL-12553](https://cakedigitalbank.atlassian.net/browse/PL-12553).

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## 3. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với `products/paylater/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc `products/paylater/overview.md` và `channels/api.md` trước file này.

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
