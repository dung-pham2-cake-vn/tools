---
title: Payday — VDS (Viettel Money) (VT_Payday_S)
product: payday
partner: vds
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:986873857
  - confluence:986873857
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2025-09-17
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# VDS (Viettel Money) — VT_Payday_S

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | payday |
| ProductId | `VT_Payday_S` |
| Onboarding source | `vt_payday_payroll` |
| Contract type | `VIETTEL_PAYDAY_PAYROLL` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

> **Đối chiếu Jira 2026-10-01**: đã lọc ticket `Released`/`Done` có bảng thông số, ngày muộn hơn 2025-09-17 — **không tìm thấy thay đổi chính sách**. Các ticket mới hơn đều là spec API, màn hình, hoặc hạch toán GL.
>
> ⚠️ **Trang nguồn cập nhật lần cuối 2025-09-17** — đã hơn một năm. Jira không có ticket đổi chính sách, nhưng cũng có thể thay đổi chưa bao giờ được ghi vào Jira. Nên xác nhận lại với PO phụ trách.

**Sản phẩm vay trên lương — lãi suất 0%, không phạt trả chậm.**

| Chỉ tiêu | Nhân viên Viettel | Nhân viên đơn vị khác |
|---|---|---|
| Hạn mức | 2 – **30 triệu** (tối đa 50% thu nhập trung bình 3 tháng) | 2 – **10 triệu** (tối đa 50% thu nhập trung bình 6 tháng) |
| Kỳ hạn | 30 ngày | 30 ngày |
| Lãi suất | **0%** | **0%** |
| Phí bảo hiểm | **3%** | **5%** |
| Phạt trả chậm gốc | **0%** | **0%** |
| Điều kiện tất toán sớm | Không yêu cầu | Không yêu cầu |

Giải ngân về tài khoản Cake của khách, rồi nạp vào ví Viettel Money.

> **Lãi 0% và phạt 0%.** Chi phí duy nhất là phí bảo hiểm 3% hoặc 5%.
> Khách hỏi "lãi bao nhiêu" → **0%**, nhưng nêu rõ có phí bảo hiểm cộng vào khoản vay.
>
> Hạn mức phụ thuộc thu nhập trung bình của khách — **tra hệ thống**, không báo mức trần chung.

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
- Đọc `products/payday/overview.md` và `channels/api.md` trước file này.

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
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
