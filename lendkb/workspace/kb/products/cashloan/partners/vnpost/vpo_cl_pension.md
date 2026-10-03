---
title: Cashloan — Vnpost (VPO_cl_pension)
product: cashloan
partner: vnpost
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-12435
  - confluence:1348567065
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-05-14
owner: dung.pham2
status: draft
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# Vnpost — VPO_cl_pension

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-05-14.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | Vnpost |
| Loại sản phẩm | cashloan |
| ProductId | `VPO_cl_pension` |
| Onboarding source | *(nguồn để trống)* |
| Contract type | `VPO_CASHLOAN_PENSION` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

**Sản phẩm cho người hưu trí — điều kiện khác hẳn phần còn lại của danh mục:
hạn mức tới 300 triệu và lãi suất chỉ 13,5–16,5%/năm.**

| Chỉ tiêu | Kỳ hạn 0–24 tháng | Kỳ hạn 25–60 tháng |
|---|---|---|
| Số tiền vay | 10 – 300 triệu (bước 1 triệu) | như bên |
| Lãi suất có bảo hiểm | **13,5%/năm** | **15%/năm** |
| Lãi suất không bảo hiểm | **16,5%/năm** | **16%/năm** |
| Phí bảo hiểm | **1,5%** × số tiền vay | **2,5%** × số tiền vay |
| Phí tất toán trước hạn | **2%** | **0%** |
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm | như bên |

Thu nhập tối thiểu 5 triệu/tháng (tăng từ 4 triệu, hiệu lực 2026-03-16).

> **Bảo hiểm khoản vay là bắt buộc.** Khách chưa chọn thì bị chặn ngay sau khi nộp hồ sơ,
> trước khi vào thẩm định — hiện màn "chưa đủ điều kiện".
>
> Kỳ hạn dài (25–60 tháng) **tất toán sớm miễn phí**; kỳ hạn ngắn mất 2%.
> Đây là điểm ngược trực giác, khách dễ hiểu nhầm.

Nguồn: [PL-12435](https://cakedigitalbank.atlassian.net/browse/PL-12435), live 2026-05-14.
Trước đó: bảo hiểm 3%, lãi 13,5%/16,5%, phí tất toán 3%.

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
