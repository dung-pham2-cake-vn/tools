---
title: Payday — ZaloPay (ZLP_payday)
product: payday
partner: zalopay
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - confluence:838533123
  - confluence:838533123
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-09-17
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: confluence
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# ZaloPay — ZLP_payday

> Số liệu lấy từ page Product Policy trên Confluence, **đã đối chiếu Jira 2026-10-01**
> — không có ticket nào đổi chính sách sau ngày trang nguồn cập nhật.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | ZaloPay |
| Loại sản phẩm | payday |
| ProductId | `ZLP_payday` |
| Onboarding source | `api_zlp_payday` |
| Contract type | `ZLP_PAYDAY` |
| Kênh | api |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — từ Confluence, đã đối chiếu Jira

> **Đối chiếu Jira 2026-10-01**: đã lọc ticket `Released`/`Done` có bảng thông số, ngày muộn hơn 2026-09-17 — **không tìm thấy thay đổi chính sách**. Các ticket mới hơn đều là spec API, màn hình, hoặc hạch toán GL.

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **2 – 6 triệu** (mặc định 4 triệu, bước 1 triệu, làm tròn trăm nghìn) |
| Kỳ hạn | Khách mới **30 ngày** · khách vay lại **30 hoặc 45 ngày** (mặc định 45) |
| Lãi suất | **60%/năm**, dư nợ giảm dần — có hay không bảo hiểm đều như nhau |
| Phí bảo hiểm | **8%** trên gốc — **bắt buộc** |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số ngày chậm |
| Thu nhập tối thiểu | **4 triệu/tháng** |

> **Thu nhập tối thiểu của ZaloPay Payday là 4 triệu, không phải 5 triệu.**
> Ticket nâng lên 5 triệu ([PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708))
> chỉ áp cho 6 sản phẩm khác, **không có ZLP_payday**.

> Bảo hiểm **bắt buộc** và **không giảm lãi** — khách hỏi bỏ bảo hiểm để rẻ hơn thì trả lời là không được.

### Điều kiện loại trừ

Khách bị từ chối nếu CCCD có địa chỉ thường trú thuộc một số tỉnh, hoặc không đạt các
kiểm tra phía ZaloPay (thay đổi thông tin định danh gần đây, thiết bị bị can thiệp,
quá nhiều tài khoản trên một thiết bị).

**Không liệt kê tỉnh nào, không giải thích tiêu chí — escalate.**

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
