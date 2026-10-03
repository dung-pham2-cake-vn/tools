---
title: Paylater — FPT (FPT_paylater)
product: paylater
partner: fpt
channel: api
topic: overview
product_status: sắp ngưng
audience: [ops, po]
sources:
  - jira:PL-5673
  - confluence:295436290
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

# FPT — FPT_paylater

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2024-10-08.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | FPT |
| Loại sản phẩm | paylater |
| ProductId | `FPT_paylater` |
| Onboarding source | `api_fpt_paylater` |
| Contract type | `FPT_PAYLATER` |
| Kênh | api |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | — |
| Trạng thái sản phẩm | **sắp ngưng** |

## 3. Sản phẩm ngừng bán

Khoản vay còn dư nợ **vẫn thanh toán và tất toán được trên app Cake** — xem `channels/cake-app.md`.
Luồng kết nối với app đối tác đã đóng; **không hướng khách quay lại app đối tác**.
**Không mở khoản vay mới.**

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `PLFPT_01` · `PLFPT_02` |
| Hạn mức | **3 – 5 triệu** |
| Kỳ hạn | 60 tháng |
| Lãi suất | **0%** |
| Phí sử dụng hạn mức | 30.000đ/tháng (chưa VAT) · **33.000đ** (đã VAT), khi có giao dịch trong tháng |
| Phí quản lý hạn mức/tháng | Không áp dụng |
| Phí phạt chậm thanh toán | **50.000đ** |
| Lãi phạt gốc quá hạn | **0%** |
| Thanh toán tối thiểu | **15%** dư nợ gốc + lãi phát sinh |
| Tất toán trước hạn | Được phép |
| Độ tuổi | 18 – 55 |

> **Thanh toán tối thiểu 15%, không phải 30% như các Paylater khác.** Đừng áp mức chung.

Khách hỏi "lãi bao nhiêu" → **0%**, nhưng có phí sử dụng hạn mức 33.000đ/tháng cho tháng
có phát sinh giao dịch. Tháng không dùng thì không mất phí.

**Sản phẩm ngừng bán, còn dư nợ lớn** — 470 giải ngân, 371 write-off, 53 khoá vĩnh viễn
tính đến 18/08/2026. Khách vẫn trả nợ qua app Cake.

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## 3b. Còn thiếu

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
