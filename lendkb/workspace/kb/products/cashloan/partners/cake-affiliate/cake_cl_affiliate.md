---
title: Cashloan — Cake (affiliate) (CAKE_cl_affiliate)
product: cashloan
partner: cake-affiliate
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12047
  - jira:PL-12163
  - confluence:198148097
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-05-08
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# Cake (affiliate) — CAKE_cl_affiliate

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-05-08.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Cake (affiliate) |
| Loại sản phẩm | cashloan |
| ProductId | `CAKE_cl_affiliate` |
| Onboarding source | `dop_cake_cl_affiliate` |
| Contract type | `CAKE_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | None |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 10 – 50 triệu |
| Lãi suất không bảo hiểm | 59%/năm |
| Lãi suất có bảo hiểm | 48%/năm |
| Phí bảo hiểm | 7% |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số ngày chậm |
| Phạt lãi chậm | 10% × lãi chậm × số ngày chậm — **chưa áp dụng, xem cảnh báo dưới** |
| Tuổi / thu nhập | 20–50 tuổi, thu nhập ≥ 5 triệu/tháng |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.


### Phí tất toán trước hạn

| Thời điểm | Phí | Công thức |
|---|---|---|
| Trong 3 tháng đầu | **8%** | `8% × (dư nợ gốc − gốc đến hạn)` |
| Từ tháng thứ 4 | **5%** | `5% × (dư nợ gốc − gốc đến hạn)` |

> Cơ sở tính phí là **dư nợ gốc chưa đến hạn**, không phải toàn bộ dư nợ gốc.
> Đừng nhân phí với tổng dư nợ khi ước tính cho khách — **tra hệ thống**.

Nguồn: [PL-12047](https://cakedigitalbank.atlassian.net/browse/PL-12047),
[PL-12163](https://cakedigitalbank.atlassian.net/browse/PL-12163).

## 3. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
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
