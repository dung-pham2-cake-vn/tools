---
title: Cashloan — NGS (NGS_cashloan)
product: cashloan
partner: ngs
channel: dop
topic: overview
product_status: đã ngưng
audience: [ops, po]
sources:
  - jira:PL-4921
  - jira:PL-5240
  - confluence:164397075
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2024-07-31
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# NGS — NGS_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2024-07-31.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | NGS |
| Loại sản phẩm | cashloan |
| ProductId | `NGS_cashloan` |
| Onboarding source | *(nguồn để trống)* |
| Contract type | `NGS_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | None |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake |
| Ký hợp đồng trên app Cake | — |
| Trạng thái sản phẩm | **đã ngưng** |

## 3. Sản phẩm ngừng bán

Khoản vay còn dư nợ **vẫn thanh toán và tất toán được trên app Cake** — xem `channels/cake-app.md`.
Luồng kết nối với app đối tác đã đóng; **không hướng khách quay lại app đối tác**.
**Không mở khoản vay mới.**

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 5 – 100 triệu, tuỳ nhóm khách (các mức: 5–20, 5–30, 5–50, 5–70, 5–100) |
| Kỳ hạn | 6 – 36 tháng (bước 3 tháng) |
| Phí bảo hiểm | 7% trên số tiền giải ngân (không bắt buộc) |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số ngày chậm |
| Phạt lãi chậm | 10% × lãi chậm × số ngày chậm — **chưa áp dụng, xem cảnh báo dưới** |
| Phí tất toán trước hạn | **3%** dư nợ còn lại |
| Điều kiện tất toán | Không yêu cầu ([PL-5240](https://cakedigitalbank.atlassian.net/browse/PL-5240)) |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.


> ⚠️ **Mức 3% này đáng ngờ.** Bốn sản phẩm khác (`MWG_cashloan`, `Be_Cashloan`,
> `VT_Cashloan_S`, `VNP_cashloan`) cũng ghi 3% trên trang nguồn nhưng thực tế đang là
> **8%/5%** — trang chỉ là ảnh chụp cũ. Xem `_meta/lich-su-phi-tat-toan.md`.
>
> **Chưa xác nhận sản phẩm này.** Agent không trả lời phí tất toán — escalate. Xem B14.

Nguồn: [PL-4921](https://cakedigitalbank.atlassian.net/browse/PL-4921).

**Sản phẩm đã ngừng, đã xoá code, nhưng dư nợ lớn nhất danh mục** — 4.569 write-off,
373 giải ngân tính đến 18/08/2026. Khách vẫn trả nợ qua app Cake.

## 3b. Còn thiếu

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
