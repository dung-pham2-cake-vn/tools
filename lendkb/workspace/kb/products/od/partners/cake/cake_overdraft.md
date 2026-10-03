---
title: Od — Cake (CAKE_overdraft)
product: od
partner: cake
channel: cake
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12807
  - jira:PL-12708
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-09-03
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# Cake — CAKE_overdraft

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-09-03.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Cake |
| Loại sản phẩm | od |
| ProductId | `CAKE_overdraft` |
| Onboarding source | *(nguồn để trống)* |
| Contract type | `OVER_DRAFT` |
| Kênh | cake |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

Thấu chi có tài sản bảo đảm là sổ tiết kiệm. **Overdraft v2**, live 2026-09-03.

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **90%** giá trị sổ (loại TD0002) · **75%** (loại TD0003) |
| Lãi suất | Động: cao nhất của (lãi suất sổ + 2,5%), **tối thiểu 7,2%/năm** |
| Kỳ hạn | 1 – 12 tháng, mặc định 12 tháng |
| Thu nhập tối thiểu | 5 triệu/tháng (tăng từ 3 triệu, hiệu lực 2026-03-16) |

Trước v2: hạn mức cố định 85%, lãi cố định 7,5%, kỳ hạn mặc định 12 tháng.

**Lãi suất thay đổi theo sổ tiết kiệm của từng khách** — luôn tra hệ thống, không báo con số chung.

Nguồn: [PL-12807](https://cakedigitalbank.atlassian.net/browse/PL-12807), [PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708).

## 3. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [ ] Phí và điều kiện tất toán trước hạn — **từ Jira**
- [ ] Điểm khác biệt so với `products/od/overview.md`
- [ ] Câu hỏi khách hay gặp riêng của đối tác này

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`


- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc `products/od/overview.md` và `channels/cake.md` trước file này.

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
