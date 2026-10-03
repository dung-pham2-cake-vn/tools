---
title: Cashloan — VNPAY (VNP_cashloan)
product: cashloan
partner: vnpay
channel: dop
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-9170
  - jira:PL-11936
  - jira:PL-14264
  - jira:PL-9170
  - confluence:310444033
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---


<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->

# VNPAY — VNP_cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-09-15.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VNPAY |
| Loại sản phẩm | cashloan |
| ProductId | `VNP_cashloan` |
| Onboarding source | `dop_vnp_cashloan` |
| Contract type | `VNP_CASHLOAN` |
| Kênh | dop |
| NFC khi đăng ký | Required |
| NFC khi ký hợp đồng | Required |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | Yes |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `CLVNP01` |
| Hạn mức | **5 – 50 triệu** (bước 1 triệu) |
| **Kỳ hạn** | **6 – 36 tháng** (bước nhảy 3 tháng) |
| Lãi suất không bảo hiểm | **55%/năm** |
| Lãi suất có bảo hiểm | **50%/năm** |
| Phí bảo hiểm | 7% trên tổng số tiền vay (không bắt buộc) |
| Phạt gốc chậm | 150% × lãi suất trong hạn × nợ gốc × số ngày chậm |
| Phạt lãi chậm | 10% × lãi quá hạn × số ngày chậm — **chưa áp dụng** |
| Phí tất toán trước hạn | **8%** nếu tất toán **trước** due date kỳ 3 · **5%** từ kỳ 3 trở đi |
| Cơ sở tính phí | `prin_not_d` — **dư nợ gốc chưa đến hạn** |
| Điều kiện tất toán | **Không có** — tất toán bất kỳ lúc nào |

> **VNPAY CÓ áp scheme 8%/5%.** [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170)
> liệt kê 4 sản phẩm ở phần AC rồi bổ sung **"Update: VNPay Cashloan"**.
> Xác nhận lại bởi [PL-11936](https://cakedigitalbank.atlassian.net/browse/PL-11936)
> (live 2026-04-07, migrate tất toán sang ICE): *"AC2: phí 5% khi tất toán ≥ due date kỳ 3 ·
> AC3: phí 8% khi tất toán < due date kỳ 3"*.
>
> **Trang Product Policy `conf:310444033` ghi 3% là ảnh chụp cũ, trước 2025-05.**
>
> **Không có điều kiện "đã trải qua 3 kỳ"** — PO xác nhận 2026-10-02.
> Trang Product Policy còn ghi điều kiện này là **bản cũ**. Khách tất toán trước kỳ 3
> được phép, chịu phí 8%.

### Công thức số tiền tất toán

```
prin_not_d + prin_d + prin_over_d + int_not_d + int_d + pen_d + (rate × prin_not_d)
```

Gốc chưa đến hạn + gốc đến hạn + gốc quá hạn + lãi chưa đến hạn + lãi đến hạn +
phạt + phí tất toán. **Phí chỉ tính trên `prin_not_d`.** Phí giao dịch miễn phí.

> ⚠️ **Trang nguồn ghi hai giá trị chồng nhau** ở cả hai dòng:
> hạn mức `5 – 50  5-40`, kỳ hạn `6 – 36  6-38`. Giống kiểu bảng Cake Cashloan —
> nhiều khả năng là giá trị trước/sau một lần đổi mà không ai xoá bản cũ.
> KB lấy giá trị **đầu tiên**; **cần xác nhận** (B15).

Lãi suất tăng lên 50%/55% từ [PL-14264](https://cakedigitalbank.atlassian.net/browse/PL-14264)
(live 2026-09-15); trang Confluence ghi 45%/50% là **bản cũ**.

Lãi bắt đầu tính từ ngày ghi nhận giải ngân thành công trên core. Gốc + lãi hàng tháng theo PMT.

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng toàn bộ sản phẩm lending. Xác nhận bởi PO 2026-10-01.

## 3. Phí tất toán trước hạn — đã xác minh Jira

| Thời điểm tất toán | Phí |
|---|---|
| **Trước** ngày đến hạn kỳ thứ 3 | **8%** dư nợ còn lại |
| **Từ** ngày đến hạn kỳ thứ 3 trở đi | **5%** dư nợ còn lại |

Nguồn: [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170), live 2025-07-28 —
áp dụng chung cho Cake / VDS / MWG / Be / VNPay Cashloan.

Đây là mục **duy nhất** đã xác minh Jira trong file này. Các số còn lại vẫn chưa điền.

## 3b. Còn thiếu

- [ ] Hạn mức, kỳ hạn, lãi suất theo từng nhóm khách — **từ Jira**
- [ ] Phí bảo hiểm, mức giảm lãi khi mua bảo hiểm — **từ Jira**
- [ ] Phạt trả chậm gốc / lãi — **từ Jira**
- [x] Phí và điều kiện tất toán trước hạn — **xong** (PL-9170)
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
