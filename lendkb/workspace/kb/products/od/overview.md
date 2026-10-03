---
title: Tổng quan — Overdraft (thấu chi)
product: od
topic: overview
audience: [ops, po]
sources:
  - confluence:1833697315
  - confluence:1032019
  - confluence:1718452249
  - jira:PL-12807
last_verified: 2026-10-01
numbers_asof: 2026-07-09
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: confluence
needs_jira_verify: false
---

# Overdraft (thấu chi)

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Nhận diện sản phẩm

Thấu chi: khách được tiêu vượt số dư trong một hạn mức, **không phải vay từng lần**.
Lãi tính theo ngày trên phần thực sự đã dùng.

| Sản phẩm | ProductId | Bảo đảm |
|---|---|---|
| Thấu chi thường | `CAKE_overdraft` | Không |
| Thấu chi có bảo đảm | `CAKE_overdraft_TD` | Sổ tiết kiệm tại Cake |

Chỉ Cake cung cấp OD — không có đối tác nào.

## 2. Thông số sản phẩm — bản v2

> **Đối chiếu Jira 2026-10-01**: đã lọc ticket `Released`/`Done` có bảng thông số, ngày muộn hơn 2026-07-09 — **không tìm thấy thay đổi chính sách**. Các ticket mới hơn đều là spec API, màn hình, hoặc hạch toán GL.

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **10 – 100 triệu** |
| Công thức hạn mức | **90%** số dư sổ (loại TD0002) · **75%** (loại TD0003) |
| Kỳ hạn | **1 – 12 tháng**, mặc định 12 |
| Lãi suất | Động: cao nhất của (lãi suất sổ + 2,5%), **tối thiểu 7,2%/năm** |
| Phí thiết lập hạn mức | **100.000đ** |
| Số sổ tiết kiệm dùng được | Tối đa **5 sổ** |
| Số dư tối thiểu mỗi sổ | **10 triệu** |
| Thu nhập tối thiểu | 5 triệu/tháng |
| Khung giờ hoạt động | **06:30 – 23:30** |

So với bản v1: hạn mức 85% cố định → 90%/75% theo loại sổ · lãi 7,5% cố định → động ·
kỳ hạn cố định 12 tháng → chọn 1–12 · 1 sổ → tối đa 5 sổ · thu nhập 3 triệu → 5 triệu.

## 3. Quá hạn và khoá

| Số ngày quá hạn | Trạng thái | Khách phải trả |
|---|---|---|
| 1 – 5 ngày | Vẫn hoạt động | Lãi + phạt |
| 6 – 30 ngày | Khoá tạm thời | Lãi + phạt |
| Từ 31 ngày | **Khoá vĩnh viễn** | **Toàn bộ dư nợ gốc** + lãi + phạt |

Bản v2 thêm cơ chế **DPD+4: tự động gỡ liên kết sổ và tất toán** để thu nợ.

## 3b. Còn thiếu

- [ ] Lãi suất chính xác bản v2 — page nguồn ghi "TBD, Business confirm"
- [ ] Phí tất toán trước hạn
- [ ] Thông số `CAKE_overdraft` (không bảo đảm) — nguồn hiện tại chủ yếu về bản có sổ

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Khung giờ 06:30–23:30**: ngoài giờ này khách không thao tác được. Khách báo "không bấm được" ban đêm → kiểm tra giờ trước khi báo lỗi hệ thống.
- **Mốc DPD 31 ngày** là bước ngoặt: khách chuyển từ trả lãi+phạt sang phải trả toàn bộ gốc. Cảnh báo khách trước khi tới mốc.
- Bản v2 tự gỡ liên kết sổ và tất toán ở DPD+4 — khách có thể gọi lên hỏi "sao sổ tiết kiệm bị tất toán".
- Khoá có thể do nghi ngờ gian lận, không chỉ do quá hạn. **Không suy đoán lý do.**


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Lãi suất v2 chuyển từ cố định sang động theo lãi sổ tiết kiệm của khách — mỗi khách một mức, không có mức chung để truyền thông.
- Hạn mức tách theo loại sổ (90%/75%) thay vì 85% phẳng.
- Page nguồn vẫn ghi lãi suất **TBD**, trạng thái `[IN PROGRESS]`. Cần chốt trước khi KB chuyển `reviewed`.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được bản chất: tiêu vượt số dư trong hạn mức, lãi tính theo ngày trên phần đã dùng.
- Nói được khung giờ hoạt động 06:30–23:30.
- Nói được phí thiết lập hạn mức 100.000đ.
- Nói được yêu cầu số dư sổ tối thiểu 10 triệu, tối đa 5 sổ.

**Không đọc cho khách:**

- Lãi suất cụ thể — mỗi khách một mức theo sổ của họ, **tra hệ thống**.
- Tên loại sổ nội bộ (TD0002, TD0003) và tỷ lệ 90%/75%.
- Tên trạng thái hệ thống, ngưỡng DPD, cơ chế tự tất toán sổ.
- Lý do khoá hạn mức.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
