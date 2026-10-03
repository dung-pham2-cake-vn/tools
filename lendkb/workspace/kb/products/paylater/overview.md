---
title: Tổng quan — Paylater (ví trả sau)
product: paylater
topic: overview
audience: [ops, po]
sources:
  - confluence:185171988
  - confluence:190611564
  - confluence:263782609
  - confluence:370081957
last_verified: 2026-10-01
numbers_asof: 2024-04-21
jira_checked: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: confluence
needs_jira_verify: false
---

# Paylater (ví trả sau)

<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

## 1. Nhận diện sản phẩm

Hạn mức quay vòng để chi tiêu, trả theo sao kê hàng tháng. **Cơ chế phí khác hẳn
Cashloan và Payday**: nhiều sản phẩm lãi suất 0%, thu bằng phí sử dụng hạn mức.

| Đối tác | ProductId | Kênh |
|---|---|---|
| VDS (Viettel Money) | `VDS_paylater` | api |
| VNPAY | `VNP_paylater` | dop |
| BeGroup | `BE_paylater` | dop |
| MWG | `MWG_paylater` | dop + cake-app |
| FPT | `FPT_paylater` | api — **sắp ngừng** |
| VDS ePass | `VDS_paylater_epass` | api — **sắp ngừng** |

## 2. Khác biệt cơ bản so với Cashloan / Payday

> **Đối chiếu Jira 2026-10-01**: đã lọc ticket `Released`/`Done` có bảng thông số, ngày muộn hơn 2024-04-21 — **không tìm thấy thay đổi chính sách**. Các ticket mới hơn đều là spec API, màn hình, hoặc hạch toán GL.
>
> ⚠️ **Trang nguồn cập nhật lần cuối 2024-04-21** — đã hơn một năm. Jira không có ticket đổi chính sách, nhưng cũng có thể thay đổi chưa bao giờ được ghi vào Jira. Nên xác nhận lại với PO phụ trách.

| | Cashloan | Payday | **Paylater** |
|---|---|---|---|
| Cách dùng | Giải ngân một lần | Giải ngân một lần | **Hạn mức quay vòng** |
| Trả nợ | Trả góp hàng tháng | Một lần cuối kỳ | **Theo sao kê, có mức tối thiểu** |
| Lãi suất | 27 – 60%/năm | 0 – 60%/năm | **0 – 40%/năm** |
| Nguồn thu chính | Lãi | Lãi + phí bảo hiểm | **Phí sử dụng / quản lý hạn mức** |
| Kỳ hạn | 3 – 60 tháng | 30 – 45 ngày | **60 tháng** (hợp đồng hạn mức) |

## 3. Thanh toán theo sao kê

Hai lựa chọn mỗi kỳ:

- **Tối thiểu** — **30%** dư nợ sao kê ở hầu hết sản phẩm, riêng `FPT_paylater` là **15%**
- **Toàn bộ** — tổng dư nợ sao kê

Trả đúng mức tối thiểu **vẫn còn dư nợ và vẫn phát sinh lãi/phí**. Đây là điểm khách
hiểu nhầm nhiều nhất trong nhóm sản phẩm này.

## 4. Các loại phí thường gặp

| Loại phí | Xuất hiện ở |
|---|---|
| Phí quản lý hạn mức hàng tháng | `BE_paylater` 36.000đ |
| Phí sử dụng hạn mức | `VNP_paylater` 30.000đ · `FPT_paylater` 33.000đ · `VDS_paylater_epass` 33.000đ · `MWG_paylater` **22.000đ** |
| Phí trên mỗi giao dịch (đối tác thu) | `VDS_paylater_epass` 7% giá trị giao dịch |
| Phí phạt chậm thanh toán | 50.000đ (VDS, Be, VNPAY, FPT) · `MWG_paylater` thu **tại mỗi mốc DPD 1, 5, 10, 15** |
| Phí chuyển đổi trả góp | Tính theo đơn hàng, có VAT |

## 5. Còn thiếu

- [ ] Thông số `MWG_paylater` và `VDS_paylater` đầy đủ
- [ ] Cơ chế tính lãi, ngày sao kê, ngày đến hạn theo từng đối tác
- [ ] Luồng chuyển đổi trả góp và rút tiền mặt

<!-- AUTO:end -->

## 4. Ghi chú vận hành — Ops

🟡 `nội bộ`

- **"Trả tối thiểu rồi mà vẫn bị tính lãi"** là khiếu nại phổ biến nhất nhóm này. Giải thích: trả tối thiểu chỉ giữ cho khoản vay không quá hạn, phần còn lại vẫn sinh lãi/phí.
- **Phí quản lý hạn mức của BE_paylater** thu cả khi khách đã trả hết, miễn là có chi tiêu trong 30 ngày trước ngày sao kê. Khiếu nại dạng "đã trả hết sao còn bị thu phí" thường rơi vào đây.
- `VDS_paylater_epass` có **hai khoản phí từ hai bên** — VDS thu theo giao dịch, Cake thu theo tháng. Khiếu nại phần VDS thu → escalate, Cake không giải thích thay đối tác.
- Paylater **không trả về trường phạt gốc/lãi quá hạn** qua API như Cashloan/Payday. Đừng tìm trường đó khi tra cứu.


## 5. Ghi chú sản phẩm — PO / Product

🟡 `nội bộ`

- Nhóm Paylater dùng mô hình doanh thu khác hẳn: phí hạn mức thay vì lãi. So sánh hiệu quả với Cashloan phải quy về cùng đơn vị, không so lãi suất trực tiếp.
- Lãi suất trải từ 0% đến 40% ngay trong cùng một đối tác (`BE_paylater` có cả `PLBE_01` 0% và `PLBE_02` 40%).
- Hai sản phẩm đang ngừng bán (`FPT_paylater`, `VDS_paylater_epass`) — `FPT_paylater` còn dư nợ đáng kể.


## 6. Số liệu kinh doanh

🔴 `hạn chế` — số kinh doanh gắn theo từng sản phẩm cụ thể, xem `kb-po/business/`.

## 7. Dành cho CSKH

🟢 `khách`

- Giải thích được bản chất hạn mức quay vòng, khác vay từng lần.
- Giải thích rõ **trả tối thiểu không phải trả hết** — phần còn lại vẫn sinh lãi/phí.
- Nói được các loại phí có trong hợp đồng của khách.

**Không đọc cho khách:**

- Mã sản phẩm nội bộ (`PLBE_01`, `PLVT_01`, `PLVNP_02`), và việc khách thuộc nhóm nào.
- Ngưỡng điểm rủi ro, tiêu chí phân nhóm.
- Thoả thuận phân chia phí giữa Cake và đối tác.

## 8. Lịch sử thay đổi

| Ngày | Thay đổi | Người | Nguồn |
|---|---|---|---|
| 2026-10-01 | Tạo file theo format đa-đối-tượng | tự sinh | xem `sources` |
