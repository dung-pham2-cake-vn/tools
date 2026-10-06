---
title: Ma trận sản phẩm — nguồn, quyết định, điểm treo
audience: [po]
last_verified: 2026-10-06
owner: dung.pham2
status: draft
---

# Ma trận sản phẩm — nguồn, quyết định, điểm treo

Tách khỏi [[kb/product-matrix]] 2026-10-06. Trang `kb/` giữ phần Ops tra hằng ngày;
đây là phần PO: nguồn dựng bảng, quyết định, điểm còn treo.

## Nguồn & phạm vi
Đối chiếu toàn bộ export ngày 2026-09-30: 1.079 page Confluence space PL + 1.831 issue Jira PL.
Bảng chuẩn là page Confluence `27918827` ([Partner] Partnership products). Cột định danh
lấy nguyên văn từ page đó; trạng thái sản phẩm mới đối chiếu thêm với Jira.

Bản trước dựng từ 2 page khi chưa có full export, **thiếu toàn bộ nhóm thẻ và nhóm đã ngưng**.

## F. Các điểm đã quyết (2026-09-30) và điểm còn treo
Quyết bởi dung.pham2. Mục nào ghi "treo" là chủ sở hữu sẽ xử lý sau, KB không tự suy diễn.

| # | Vấn đề | Quyết định |
|---|---|---|
| F1 | `MBF_cashloan` (MobiFone) không có trong bảng Active dù [PL-12531](https://cakedigitalbank.atlassian.net/browse/PL-12531) Done 2026-04-24. Onboarding source `dop_mbf_cashloan` | **Treo** — sẽ tự thêm vào bảng matrix sau. KB chưa viết nội dung cho sản phẩm này |
| F2 | `FIZA_payday` không có trong bảng Active dù [PL-13475](https://cakedigitalbank.atlassian.net/browse/PL-13475) Done 2026-07-08 | **Treo** — như F1 |
| F3 | Nhóm thẻ (dòng 27–32) nằm chung bảng sản phẩm Lending | **Chốt: KHÔNG đưa vào KB.** Bổ sung sau khi cần. Mục B giữ lại để tra cứu, không sinh file `kb/` |
| F4 | Sản phẩm đã/sắp ngưng còn dư nợ lớn (`NGS_cashloan` 4.569 write-off, `FPT_paylater` 470 disburse) | **Chốt: có phủ.** Khoản vay còn dư nợ vẫn thanh toán được **trên app Cake**. Chỉ luồng API với đối tác bị đóng. Agent trả lời theo luồng thanh toán trên app Cake — xem mục H |
| F5 | `MWG_payday` contract type ghi `dop_mwg_payday`, khác quy ước UPPER_CASE của 25 dòng còn lại | **Treo** — sẽ kiểm tra lại page nguồn |
| F6 | Space BEF chưa export (page `2167406668` và nhiều link từ PL trỏ sang) | **Treo** — chưa mở rộng. Quyết case by case khi gặp page cụ thể cần tới |

## G. Đối chiếu với 2 danh sách được đưa ngày 2026-09-29
- **Nhánh 1** (28 mã) = đúng bằng cột *Onboarding source* của bảng Active, phần có giá trị.
  5 dòng vắng mặt là các dòng nguồn để trống: `CAKE_overdraft`, `CAKE_payday`,
  `MWG_cl_online`, `VPO_cl_pension`, `CC Zalo`.
- **Nhánh 2** (6 mã) là tập con, trừ hai điểm:
  - `dop_mbf_cashloan` — không có trong bảng Active (xem F1).
  - `dop_cake_cl_aff` — viết tắt của `dop_cake_cl_affiliate`. Cần thống nhất một cách viết.

## Còn thiếu để chốt hẳn
1. **Trạng thái ETB reKYC** — page nguồn định nghĩa trường này (Allow / None / Pending)
   nhưng không điền cho dòng nào trong bảng Active.
2. **Người duyệt nội dung** — xem `PLAN.md` mục 0. Giữ `status: draft` cho tới khi có xác nhận.
3. Các mục treo F1, F2, F5, F6 ở trên.
