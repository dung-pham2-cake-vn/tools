---
title: Paylater — VDS (Viettel Money) (VDS_paylater_epass)
product: paylater
partner: vds
channel: api
topic: overview
product_status: sắp ngưng
audience: [ops, po]
sources:
  - jira:PL-10194
  - jira:PL-10519
  - confluence:1077346320
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-11-13
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# VDS (Viettel Money) — VDS_paylater_epass

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | paylater |
| ProductId | `VDS_paylater_epass` |
| Onboarding source | `vds_paylater_epass` |
| Contract type | `vds_paylater_epass` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | — |
| Trạng thái sản phẩm | **sắp ngưng** |

## 3. Sản phẩm ngừng bán

Khoản vay còn dư nợ **vẫn thanh toán và tất toán được trên app Cake** — xem `channels/cake-app.md`.
Luồng kết nối với app đối tác đã đóng; **không hướng khách quay lại app đối tác**.
**Không mở khoản vay mới.**

## 2. Số liệu — đã xác minh Jira

**Cơ chế phí giống FPT Paylater: lãi suất 0%, thu phí sử dụng hạn mức.**

| Chỉ tiêu | Giá trị |
|---|---|
| Lãi suất | **0%** |
| Kỳ hạn | 60 tháng |
| Phí sử dụng hạn mức — **VDS thu** | **7% × giá trị giao dịch** |
| Phí sử dụng hạn mức — **Cake thu** | **33.000đ/tháng**, chỉ khi có phát sinh giao dịch trong tháng |

> **Có hai khoản phí từ hai bên khác nhau.** Khách hỏi "sao bị thu phí hai lần" →
> một khoản do VDS thu theo giao dịch, một khoản Cake thu theo tháng.
> Khiếu nại về phí VDS thu → **escalate**, Cake không giải thích thay đối tác.

Nguồn: [PL-10519](https://cakedigitalbank.atlassian.net/browse/PL-10519).

**Sản phẩm sắp ngừng** — 0 giải ngân, 0 write-off tính đến 18/08/2026, dư nợ ~0.

## 3b. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với `products/paylater/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

## Giới hạn thời gian thanh toán

| Giới hạn | Giá trị |
|---|---|
| Yêu cầu thanh toán hết hạn | **5 phút** kể từ `payment-request` |
| Hiệu lực OTP | **1 phút** |

Nguồn: [PL-10194](https://cakedigitalbank.atlassian.net/browse/PL-10194).

> **OTP của sản phẩm này chỉ 1 phút, không phải 2 phút như `MWG_paylater`.**
> Đừng áp mức chung.

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
