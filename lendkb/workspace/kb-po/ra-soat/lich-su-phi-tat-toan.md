---
title: Lịch sử phí tất toán trước hạn — toàn danh mục
audience: [po]
sources:
  - jira:PL-5240
  - jira:PL-8654
  - jira:PL-8655
  - jira:PL-8656
  - jira:PL-8207
  - jira:PL-9170
  - jira:PL-12415
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Phí tất toán trước hạn — dòng thời gian

Đây là mục bị hiểu sai nhiều nhất trong KB. Các trang Product Policy ghi mức khác nhau
vì **chụp ở các thời điểm khác nhau** của chuỗi thay đổi dưới đây.

| Ngày live | Ticket | Thay đổi |
|---|---|---|
| — | — | Ban đầu: phí **3%**, **có** điều kiện phải trả đủ 3 kỳ mới được tất toán |
| **2024-07-31** | [PL-5240](https://cakedigitalbank.atlassian.net/browse/PL-5240) | **Bỏ** điều kiện 3 kỳ. Liệt kê: VDS Cashloan, Be Cashloan, VDS Cashloan Payroll, VDS_cashloan_LP |
| **2025-03-19** | [PL-8207](https://cakedigitalbank.atlassian.net/browse/PL-8207) | Update config phí tất toán cho Cake Cashloan |
| **2025-05-15** | [PL-8654](https://cakedigitalbank.atlassian.net/browse/PL-8654) *(All Products)* · [PL-8655](https://cakedigitalbank.atlassian.net/browse/PL-8655) *(VDS)* · [PL-8656](https://cakedigitalbank.atlassian.net/browse/PL-8656) *(CAKE)* | **Bật lại** điều kiện 3 kỳ (ngày tất toán ≥ due_date kỳ thứ 3) · phí **3% → 5%**, áp cho **cả khoản vay đang active và tương lai** |
| *(huỷ)* | PL-9150 | Định áp 8% cho mọi khách — **VDS không đồng ý**, không triển khai |
| **2025-07-28** | [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) | Scheme theo bậc: **8%** nếu tất toán **trước** due date kỳ 3 · **5%** từ kỳ 3 trở đi |
| **2026-06-12** | [PL-12415](https://cakedigitalbank.atlassian.net/browse/PL-12415) | Chuyển tính phí + GL từ LMS/Mambu sang **ICE**. **Không đổi mức phí** |

## Trạng thái hiện tại

| | |
|---|---|
| Mức phí | **8%** nếu tất toán trước due date kỳ thứ 3 · **5%** từ kỳ thứ 3 trở đi |
| Điều kiện | **Không có** — tất toán bất kỳ lúc nào |
| Cơ sở tính | `rate × (dư nợ gốc − gốc đến hạn)` — tức **gốc chưa đến hạn**, không phải toàn bộ dư nợ |
| Phạm vi PL-9170 | **AC liệt kê 4**: Cake Cashloan · VDS Cashloan · MWG Cashloan · Be Cashloan. **Mục "Update" bổ sung**: VNPay Cashloan |

## Điều kiện 3 kỳ — bị bỏ rồi bật lại

Đây là chỗ gây nhầm nhất:

1. **PL-5240** (2024-07) bỏ điều kiện
2. **PL-8654/8655/8656** (2025-05) **bật lại** cho *All Products*
3. **PL-9170** (2025-07) bảng AC ghi *"Tất toán trong vòng 3 tháng, ngày tất toán < due date kỳ thứ 3 → **được phép tất toán**, mức phí 8%"*

Tức PL-9170 mô tả việc tất toán trước kỳ 3 là **được phép** — mâu thuẫn với điều kiện
mà PL-8655 vừa bật lại 2 tháng trước đó.

> **Đã rõ (PO xác nhận 2026-10-02)**: PL-9170 **thay** điều kiện 3 kỳ bằng **bậc phí**.
> Khách tất toán trước kỳ 3 **được phép**, chịu 8%. Không còn điều kiện chặn.
>
> Trang Product Policy nào còn ghi *"đã trải qua 3 kỳ thanh toán"* là **bản cũ**.

## Vì sao trang Product Policy ghi 3% hoặc 5%

| Trang ghi | Chụp ở thời điểm |
|---|---|
| **3%** | Trước 2025-05-15 |
| **5%** | Giữa 2025-05-15 và 2025-07-28 |
| **8%/5%** | Sau 2025-07-28 — đúng hiện tại |

**PO xác nhận 2026-10-02**: `MWG_cashloan`, `Be_Cashloan`, `VT_Cashloan_S` và `VNP_cashloan`
**đều đang là 8%/5%**. Trang nào ghi 3% hoặc 5% đều là ảnh chụp cũ.

**VNPAY đã xác nhận hai lần**: PL-9170 mục Update, và [PL-11936](https://cakedigitalbank.atlassian.net/browse/PL-11936)
(2026-04-07) ghi rõ *"AC2: 5% khi tất toán ≥ due date kỳ 3 · AC3: 8% khi tất toán < due date kỳ 3"*.

Ngoại lệ thật sự (ngoài phạm vi PL-9170): `MISA_cashloan` **5%** · `VPO_cl_pension`
**2%/0% theo kỳ hạn** · `BE_payday`, `FIZA_payday`, `CAKE_payday`, `MWG_payday`,
`VNP_payday`, `PD_Viettel` **0%**.
