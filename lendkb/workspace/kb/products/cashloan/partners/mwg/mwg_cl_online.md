---
title: Cashloan — MWG (MWG_cl_online)
product: cashloan
partner: mwg
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:1587740860
  - confluence:1587740860
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-02-09
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# MWG — MWG_cl_online

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | MWG |
| Loại sản phẩm | cashloan |
| ProductId | `MWG_cl_online` |
| Onboarding source | *(nguồn để trống)* |
| Contract type | `MWG_CL_ONLINE` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | cake / ngoài |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

> **Đối chiếu Jira 2026-10-01**: đã lọc ticket `Released`/`Done` có bảng thông số, ngày muộn hơn 2026-02-09 — **không tìm thấy thay đổi chính sách**. Các ticket mới hơn đều là spec API, màn hình, hoặc hạch toán GL.

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `QTVCL01` |
| Hạn mức | **5 – 50 triệu** |
| Kỳ hạn | 6 – 48 tháng |
| Lãi suất có bảo hiểm | **48%/năm** |
| Lãi suất không bảo hiểm | **53%/năm** |
| Phí bảo hiểm | 7% × số tiền vay |
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm |
| Phạt lãi chậm | 10% × dư nợ lãi chậm × số ngày chậm — **chưa áp dụng, xem cảnh báo dưới** |
| Phí tất toán trước hạn | **8%** (trong 3 kỳ đầu) · **5%** (từ kỳ thứ 4) |
| Điều kiện tất toán | Không yêu cầu |
| Tuổi / thu nhập | 20 – 50 tuổi, thu nhập ≥ 5 triệu/tháng |
| Giải ngân về | Tài khoản Cake **hoặc** ngân hàng khác |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.


Khác `MWG_cashloan` (kênh cửa hàng): sản phẩm này bán trên kênh online.

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
| 2026-09-30 | Tạo file, điền thông số từ Confluence | tự sinh | xem `sources` |
| 2026-10-01 | Chuyển sang format đa-đối-tượng | tự sinh | `_meta/format.md` |
