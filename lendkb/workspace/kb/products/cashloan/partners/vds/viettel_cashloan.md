---
title: Cashloan — VDS (Viettel Money) (Viettel_Cashloan)
product: cashloan
partner: vds
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-11720
  - jira:PL-9170
  - confluence:1121758
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

# VDS (Viettel Money) — Viettel_Cashloan

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2026-02-10.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | cashloan |
| ProductId | `Viettel_Cashloan` |
| Onboarding source | `viettel_cashloan` |
| Contract type | `VIETTEL_CASHLOAN` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

Chia **24 mã sản phẩm** theo 4 phân khúc × 6 bậc rủi ro.

| Phân khúc | Hạn mức | Lãi có bảo hiểm | Lãi không bảo hiểm |
|---|---|---|---|
| Khách mới (`NS_SLVT_01…06`) | 5 – **50 triệu** | 47% – 59% | 52% – 60% |
| Vay lại (`NS_XLVT_01…06`) | 5 – **60 triệu** | 43% – 55% | 48% – 60% |
| Vay thêm (`NS_ULVT_…`) | 5 – 20 triệu | 44% – 56% | 49% – 60% |
| Bán chéo (`VTPR_…`) | 5 – 50 triệu | 47% – 56% | 49% – 60% |

| Chỉ tiêu chung | Giá trị |
|---|---|
| Kỳ hạn | **6 – 48 tháng** |
| Phí bảo hiểm | **7%** trên số tiền giải ngân |
| Phạt gốc chậm | 150% × lãi suất × nợ gốc × số ngày chậm ÷ 365 |

Bậc rủi ro càng tốt thì hạn mức càng cao và lãi càng thấp — chênh tới **16 điểm lãi suất**
giữa bậc tốt nhất và kém nhất trong cùng phân khúc.

**Không nói với khách họ ở bậc nào, cũng không nêu dải lãi suất** — chỉ báo mức áp cho khách đó.

### Nhóm SIM ngoại mạng

| | Khách mới (`NONVTCL_01`) | Vay lại (`NONVTCL_02`) |
|---|---|---|
| Hạn mức | 5 – 25 triệu | 5 – 30 triệu |
| Kỳ hạn | 6 – 24 tháng | 6 – 24 tháng |
| Lãi không bảo hiểm | 59% | 54% |
| Lãi có bảo hiểm | 48% | 43% |

Nguồn: [PL-11720](https://cakedigitalbank.atlassian.net/browse/PL-11720).

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

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
- Đọc `products/cashloan/overview.md` và `channels/api.md` trước file này.

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
