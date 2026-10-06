---
title: Phân loại ticket SVK Lending 12 tháng — câu hỏi nào lặp nhiều nhất
audience:
  - po
last_verified: 2026-10-06T00:00:00.000Z
owner: dung.pham2
status: draft
---
# Phân loại ticket SVK Lending — 2025-10 → 2026-10

327 ticket SVK thuộc request type Lending tạo trong 365 ngày (kéo 2026-10-06 bằng
`tools/export-svk.mjs --history 365`, raw ở `raw/jira/SVK-history/`). Bỏ 5 ticket test,
8 ticket tool/phân quyền nội bộ → **314 ticket có vấn đề của khách**.

Xếp nhóm bằng từ khoá trên tiêu đề + mô tả, rồi sửa tay ~130 ticket mơ hồ. **Sai số vài
ticket mỗi nhóm** — đủ để xếp hạng, không đủ để báo cáo số chính xác.

> SVK là ticket **Ops gửi Tech/PO**, không phải câu khách hỏi nguyên văn. Mỗi ticket là
> một case khách mà Ops không tự xử lý được bằng troubleshoot.

## Xếp hạng

| # | Nhóm | Ticket | % | Đối tác nhiều nhất |
| --- | --- | --- | --- | --- |
| 1 | Gãy giải ngân — kẹt `USER_SIGN`, cần active, lệch trạng thái với đối tác | 148 | 47% | Viettel 59 · ZLP 39 · Cake 28 · VNPay 10 |
| 2 | Đã trả nhưng chưa gạch nợ / sai DPD / thu nợ tự động sai | 55 | 18% | Cake 15 · Viettel 13 · ZLP 13 |
| 3 | Đăng ký vay lỗi | 34 | 11% | MWG 13 · Viettel 9 |
| 4 | Paylater — ví trả sau, spending, revert, sao kê | 26 | 8% | Be · MWG · VNPay |
| 5 | Ký hợp đồng / OTP lỗi | 17 | 5% | Viettel 6 · MWG 3 |
| 6 | Tất toán lỗi / số tiền tất toán | 15 | 5% | Cake 8 (nhiều khoản WO) |
| 7 | Hợp đồng / chứng từ sai thông tin | 8 | 3% | — |
| 8 | Đối soát giao dịch với đối tác | 7 | 2% | Viettel 5 |
| 9 | Huỷ khoản vay lỗi | 4 | 1% | — |

## Nhóm 1 — Gãy giải ngân (148)

| Dạng | Ticket | Ví dụ |
| --- | --- | --- |
| Tiền kẹt ở Loan Drawdown / ICE chưa active / "Thử giải ngân lại" lỗi | 49 | SVK-10855, SVK-10939, SVK-11018 |
| **Đủ bước đi tiền, chỉ kẹt `USER_SIGN`** → force status qua Cake Task | 40 | SVK-11284, SVK-11748, SVK-11810 |
| Đối tác chưa gọi / callback `disburse-update` lỗi (900002, 500, connection refused) | 25 | SVK-9263, SVK-9763, SVK-11099 |
| Lệch trạng thái Cake ↔ đối tác (`DISBURSE_FAILED` vs `DISBURSED`) | 13 | SVK-11006, SVK-10698 |
| Khoản đã `CANCEL` cần active lại — cần COO duyệt | 7 | SVK-10273, SVK-10297 |
| Chưa xếp được | 14 |  |

Quy trình đã có: [[kb/operations/luong-giai-ngan]], [[kb/operations/case-ket-user-sign]].
Dạng "đủ bước, chỉ kẹt `USER_SIGN`" (40 ticket) Ops vẫn phải gửi lên vì cần checker duyệt
Cake Task — không phải vì thiếu kiến thức.

## Nhóm 2 — Đã trả nhưng chưa gạch nợ (55)

| Dạng | Ticket | Ví dụ |
| --- | --- | --- |
| Trả trước hạn vào prepayment/overpaid, đến hạn vẫn báo quá hạn | 18 | SVK-10659, SVK-11211, SVK-11249, SVK-11555 |
| Trả qua ví đối tác (ZLP, VDS) — trừ tiền nhưng ICE không ghi nhận | 11 | SVK-11183, SVK-9497 |
| Thu nợ tự động sai — thu 2 lần, thu dư, không quét | 11 | SVK-11131, SVK-11125, SVK-10815 |
| Trạng thái / DPD hiển thị sai (close trên ICE mà app còn active, DPD sai, WO sai) | 6 | SVK-10060, SVK-10421, SVK-10695 |
| Trả từ CASA / app Cake — tiền vào suspend, không ghi nhận | 6 | SVK-11264, SVK-10314 |
| Khác | 3 |  |

Nhiều ticket rơi vào **giai đoạn chuyển core Mambu → ICE** (SVK-9861, SVK-10957).
Quy trình đã có: [[kb/operations/quy-trinh-sau-vay]], [[kb/operations/luong-van]].

## Nhóm 3–9 — chưa có trang KB riêng

- **Đăng ký vay** (34): MWG cashloan/paylater chiếm nhiều nhất — màn hình trắng, lỗi chụp CCCD,
  "đăng ký không thành công"; Viettel/ZLP lỗi `client-create` 900000; OCR địa chỉ lệch CCCD (MISA);
  staff OD trong whitelist bị chặn đầu luồng.
- **Paylater** (26): revert không thành công (Be), spending/quét QR fail (MWG), không liên kết lại
  được ví sau khi đã trả hết nợ (Be), khoản đã huỷ vẫn nhận sao kê, dư nợ ví hiển thị sai.
- **Ký HĐ / OTP** (17): mã lỗi 200003 / 124523 / 900000 (Viettel, ZLP), không nhận OTP, hit limit OTP,
  đổi số điện thoại không nhận OTP, hợp đồng hết hạn ký, không hiện nội dung HĐ.
- **Tất toán** (15): khoản **WO** không tất toán được hoặc số tiền tất toán trên app khác kỳ vọng,
  tiền tất toán vào suspend, OD tất toán khi sổ tiết kiệm đã đóng.
- **Hợp đồng sai thông tin** (8): giới tính, ngày cấp CCCD, TK nhận giải ngân, HĐBH gửi nhầm email.
- **Đối soát** (7): danh sách giao dịch timeout VDS cần xác nhận thành/bại.
- **Huỷ khoản vay** (4): API `contract-cancel` lỗi, huỷ trên Cake Task lỗi.

## Bước tiếp

PO hướng dẫn cách trả lời từng nhóm, theo thứ tự xếp hạng → ghi vào `kb/` (FAQ / case mẫu /
trang quy trình tương ứng).
