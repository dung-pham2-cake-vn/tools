---
title: Câu hỏi chờ quyết
last_verified: 2026-09-30
audience: [po]
owner: dung.pham2
status: open
---

# Điểm chưa rõ — chờ anh trả lời

Gom từ toàn bộ KB. Mục nào chưa chốt thì file KB liên quan giữ `status: draft`
và agent bị cấm trả lời khách về nội dung đó.

## Chặn việc chốt nội dung

| # | Câu hỏi | Ảnh hưởng | Nguồn |
|---|---|---|---|
| Q2 | **MBF cashloan áp scheme phí tất toán nào?** Page policy MBF không ghi. PL-9170 (8% trước kỳ 3 / 5% sau) chỉ liệt kê Cake/VDS/MWG/Be/VNPay — không có MBF, mà MBF live 2026-04 *sau* ticket đó | `products/cashloan/partners/mbf/` | 1861025856 + PL-9170 |
| Q3 | **FIZA payday: "phạt lãi chậm — chưa hỗ trợ" và "phí tất toán — chưa áp dụng" là chính sách cố định hay chỉ chưa kịp làm?** Nếu là tạm thời thì agent không được cam kết miễn phí với khách | `products/payday/partners/fiza/` | 1961427522 |
| Q4 | **Lịch ngày lễ dời due date** — bảng trên page nguồn mới cấu hình tới 2024. Các năm sau đã cập nhật chưa? | [[kb/products/cashloan/loan-management]] | 198148097 |

## Cần nguồn bổ sung

| # | Việc | Ghi chú |
|---|---|---|
| Q5 | **Câu hỏi CSKH thật** để dựng FAQ | Phạm vi export không có project ticket CSKH. FAQ hiện suy từ tài liệu sản phẩm. Anh nói sẽ ráp thêm sau khi duyệt khung |
| Q6 | **Space BEF** | Đang treo, quyết case by case. Page `2167406668` (Kiến thức domain — Sản phẩm cho vay) có thể cần cho glossary và phần chung |

## Đang treo (anh tự xử lý)

| # | Việc | Trạng thái |
|---|---|---|
| Q7 | Thêm `MBF_cashloan`, `FIZA_payday` vào bảng Partnership products | Nội dung KB **đã viết xong**. Thiếu: kênh (DOP/API), yêu cầu NFC, nơi ký hợp đồng — các trường chỉ bảng chuẩn mới có |
| Q8 | `MWG_payday` contract type ghi `dop_mwg_payday`, khác quy ước UPPER_CASE của 25 dòng còn lại | Nghi lỗi nhập liệu |
| Q9 | Người xác nhận nội dung lãi/phí/điều kiện tín dụng | Chưa chỉ định. Anh duyệt phần còn lại |

## Đã giải quyết bằng Jira (2026-09-30)

| # | Câu hỏi cũ | Kết luận |
|---|---|---|
| Q1 | Cake cashloan: số liệu đúng là bộ nào? | **Xong.** Quét 4 ticket policy Released: hạn mức 5–25/50/60tr tuỳ nhóm, kỳ hạn 6–60 tháng, lãi 52% (có BH) / 59% (không BH), phí BH 7%. Bảng đầu trang Confluence gần đúng, chỉ sai min của `CAKEP01` (ghi 10tr, thực 5tr). Mục "1. Phân loại KH" đã cũ toàn bộ |
| Q10 | *(mới phát hiện)* Phí tất toán trước hạn | **Confluence ghi 3% là SAI.** Từ [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) live 2025-07-28: **8%** nếu tất toán trước kỳ 3, **5%** từ kỳ 3 trở đi. Áp cho Cake / VDS / MWG / Be / VNPay Cashloan |

## Đã chốt

- Thẻ (6 sản phẩm): **ngoài phạm vi KB**.
- Sản phẩm ngừng bán: **trả nợ qua app Cake**, không hướng về app đối tác.
- Phạm vi nguồn: Confluence space PL + Jira project PL.
