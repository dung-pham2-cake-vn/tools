---
title: Payday — MWG (MWG_payday)
product: payday
partner: mwg
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12256
  - jira:PL-12290
  - jira:PL-12919
  - confluence:1774879256
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

# MWG — MWG_payday

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-06-10.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | MWG |
| Loại sản phẩm | payday |
| ProductId | `MWG_payday` |
| Onboarding source | `dop_mwg_payday` |
| Contract type | `dop_mwg_payday` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | `QTVPD01` (khách mới) | `QTVPD02` (vay lại) |
|---|---|---|
| Số tiền vay | **2 – 3 triệu** | **2 – 5 triệu** *(nâng lên 6 triệu, xem dưới)* |
| Bước nhảy | 500.000đ | 500.000đ |
| **Kỳ hạn** | **30 ngày** | **30 hoặc 45 ngày** |
| Lãi suất | **60%/năm** | 60%/năm |
| **Phí bảo hiểm** | **8%** × số tiền vay | 8% × số tiền vay |

| Chỉ tiêu chung | Giá trị |
|---|---|
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm |
| Phí tất toán trước hạn | **Không có** |
| Điều kiện tất toán | Không yêu cầu |

Nâng hạn mức lên 6 triệu từ [PL-12919](https://cakedigitalbank.atlassian.net/browse/PL-12919) (live 2026-06-10).

Nguồn: [PL-12256](https://cakedigitalbank.atlassian.net/browse/PL-12256) (setup product code),
[PL-12290](https://cakedigitalbank.atlassian.net/browse/PL-12290).

> Hạn mức `QTVPD02` sau đó nâng lên **6 triệu** ([PL-12919](https://cakedigitalbank.atlassian.net/browse/PL-12919), 2026-06-10).
> Hai nguồn lệch nhau về trần: 5 triệu (setup) vs 6 triệu (ticket nâng, mới hơn) — **lấy 6 triệu**.

> **Chưa có số** cho phạt trả chậm chi tiết.

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## 3. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với `products/payday/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc `products/payday/overview.md` và `channels/dop.md` trước file này.

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
