---
title: Payday — VDS (Viettel Money) (PD_Viettel)
product: payday
partner: vds
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12076
  - jira:PL-12708
  - confluence:1025583
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# VDS (Viettel Money) — PD_Viettel

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-04-22.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | payday |
| ProductId | `PD_Viettel` |
| Onboarding source | `viettel` |
| Contract type | `VIETTEL_PAYDAY` |
| Kênh | dop |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| | Khách SIM Viettel (Mass) | SIM ngoại mạng |
|---|---|---|
| Product code | *(để trống)* | `NONVTPD_01` mới · `NONVTPD_02` vay lại |
| Số tiền vay | khách mới/ETB: **2 triệu** · vay lại: từ 2 triệu | mới **3 – 5 triệu** · vay lại **3 – 7 triệu** |
| Kỳ hạn | **7, 14, 21 hoặc 30 ngày** | 30 ngày · vay lại 30–45 ngày |
| Lãi suất | 60%/năm | 60%/năm |
| Phí bảo hiểm | 8% | 8% |
| Phí tất toán trước hạn | **Không có** | **Không có** |
| Điều kiện tất toán | Không yêu cầu | Không yêu cầu |

Phạt gốc chậm: 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm.

> **Nhóm SIM Viettel có kỳ hạn rất ngắn — 7 ngày trở lên**, khác hẳn nhóm ngoại mạng
> tối thiểu 30 ngày. Khách mới chỉ vay được **2 triệu**.

Thu nhập tối thiểu 5 triệu/tháng (tăng từ 3 triệu, [PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708)).

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
