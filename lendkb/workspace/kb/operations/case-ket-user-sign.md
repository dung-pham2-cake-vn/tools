---
title: Case mẫu — khoản vay kẹt USER_SIGN sau khi đã giải ngân
audience: [ops, po]
nhom: 2
sources:
  - "jira: SVK-11748"
  - "file: Troubleshoot Lending Ops.xls — tab Giải ngân, Cake task"
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Case mẫu — kẹt `USER_SIGN` sau khi tiền đã đi đủ

Ca phổ biến nhất của nhóm giải ngân. Ví dụ gốc: **SVK-11748** (`CAKE_payday`, 2026-10-02).

## Dấu hiệu

- Trạng thái trên **LMS = `USER_SIGN`**
- Trạng thái trên **ICE = `ACTIVE`**
- Các bước đi tiền đã xong

## Việc duy nhất phải xác minh

> **Ops đã xác nhận tiền đi tới bước cuối cùng chưa?**

Bước cuối **khác nhau theo nhóm sản phẩm** — đây là chỗ hay nhầm:

| Sản phẩm | Bước đi tiền cuối cùng |
|---|---|
| `CAKE_payday` · `CAKE_cashloan` · `BE_payday` · `CAKE_cl_affiliate` · `MWG_cashloan` · `MWG_cl_online` | **Đã giải ngân vào CASA** |
| `ZLP_cashloan` · `ZLP_payday` · `Viettel_Cashloan` · `VT_Cashloan_S` · `VT_Payday_S` · `VTPO_cashloan` · `VNP_cashloan` · `VNP_payday` · `VPO_cashloan` · `VPO_cl_pension` · `PD_Viettel` | **Đã đi tiền vào TKĐBTT tại đối tác** |
| Paylater | Không có bước đi tiền |

**Ops chưa xác nhận tiền đi tới bước cuối → hỏi lại đúng điểm đó.** Không duyệt.

Chi tiết 5 nhóm: `quy-trinh-xu-ly.md`.

## Xử lý

Ops xác nhận đủ → duyệt Cake Task **"Lending Force Status Loan"**.

Hệ thống làm 2 việc:

1. Cập nhật status LMS thành `DISBURSE`
2. **Gọi cập nhật status sang đối tác**

Không cần chạy thêm `Lending Send Status Loan` — task này đã bao gồm.

## Điều kiện task từ chối

| Lỗi | Nguyên nhân |
|---|---|
| "Chưa nhập loan_account_id" / "Chưa nhập loan_id" | Thiếu trường |
| "[CAKE] Dữ liệu đầu vào không khớp với dữ liệu trên hệ thống" | `loan_account_id` và `loan_id` không khớp nhau |
| Báo lỗi trạng thái | Khoản vay không ở `USER_SIGN` |

Dòng CSV cần `status: DISBURSE` — **không phải** `USER_SIGN`.

## Ca SVK-11748

| | |
|---|---|
| Sản phẩm | `CAKE_payday` → bước cuối là **CASA** |
| Ops báo | Đã giải ngân loan drawdown, bảo hiểm, **tiền đã vào CASA**, ICE `ACTIVE`, LMS `USER_SIGN` |
| Kết luận | Đã xác nhận tới bước cuối đúng nhóm → **đủ điều kiện duyệt** |
| Nguyên nhân | Thuộc **đợt lỗi hệ thống thứ Ba–thứ Tư trong tuần**. Team đã fix; ticket này xử lý các case còn kẹt lại |

## Lưu ý

Đợt lỗi đó sinh ra nhiều ticket cùng dạng: SVK-11730, SVK-11711, SVK-11748.
Gặp ticket kẹt `USER_SIGN` trong giai đoạn này, **kiểm tra có thuộc đợt lỗi đã biết không**
trước khi điều tra từ đầu.
