---
title: Case mẫu — khoản vay kẹt USER_SIGN sau khi đã giải ngân
audience: [ops, po]
nhom: 2
sources:
  - "jira: SVK-11748"
  - "file: Troubleshoot Lending Ops.xls — tab Giải ngân, Cake task"
last_verified: 2026-10-05
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
| `ZLP_cashloan` · `ZLP_payday` · `VTPO_cashloan` · `VNP_cashloan` · `VNP_payday` · `VPO_cashloan` · `VPO_cl_pension` | **Đã đi tiền vào TKĐBTT tại đối tác** |
| `Viettel_Cashloan` · `VT_Cashloan_S` · `PD_Viettel` · `VT_Payday_S` | **Đã đi tiền vào tài khoản phải trả của đối tác** |
| Paylater | Không có bước đi tiền |

**Ops chưa xác nhận tiền đi tới bước cuối → hỏi lại đúng điểm đó.** Chưa đủ điều kiện tạo Cake Task.

Bằng chứng phải là **ảnh giao dịch trên Core Cake**. Đối tác xác nhận, khách báo đã nhận
tiền đều không thay được. Sản phẩm có **Ewallet** (tài khoản ẩn trung gian của khách, tuỳ sản phẩm): tiền mới tới Ewallet là
chưa tới TKĐBTT.

Chi tiết 5 nhóm: [[kb/operations/luong-giai-ngan]].

## Xử lý

Ops đã nhấn **"Thử giải ngân lại"** (bắt buộc) và xác nhận đủ bước → Ops tạo Cake Task
**"Lending Force Status Loan"**, PO duyệt.

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

## Các cột trong bản ghi trạng thái

Ops hay chụp màn hình bản ghi này mà không có header, nên khó đọc. Thứ tự cột:

```
LOAN_ID | CONTRACT_ID | PRODUCT_TYPE | STATUS | PARTNER_STATUS | LOAN_ACCOUNT_ID
| PHONE_NUMBER | DOCUMENT_ID | DISBURSEMENT_DATE | AMOUNT | LOAN_ALIAS
| CREATED_AT | UPDATED_AT | ACTIONS
```

Ví dụ một dòng (SVK-11763):

| Cột | Giá trị |
|---|---|
| `LOAN_ID` | `17959045` |
| `CONTRACT_ID` | `H6C77J4FM0` — 10 ký tự chữ+số |
| `PRODUCT_TYPE` | `CAKE_payday` |
| `STATUS` | `USER_SIGN` |
| `LOAN_ACCOUNT_ID` | `CAKEPD225337447216640` |
| `DOCUMENT_ID` | CCCD 12 số |
| `DISBURSEMENT_DATE` | **trống** — bình thường ở case này, vì LMS chưa ghi nhận giải ngân |
| `AMOUNT` | `5400000` — số **được duyệt**, chưa trừ phí bảo hiểm |
| `LOAN_ALIAS` | `I2YI45HR` — 8 ký tự, là **mã thanh toán** |

`LOAN_ID` và `LOAN_ACCOUNT_ID` nằm cùng một dòng nên chắc chắn khớp nhau — dùng luôn
cặp này cho CSV, khỏi lo lỗi *"Dữ liệu đầu vào không khớp"*.

## Đọc màn hình giao dịch Loan Drawdown

Ba giao dịch liền nhau trong vài giây là **một lần giải ngân hoàn chỉnh**:

| Thứ tự | Type | Số tiền | Nghĩa |
|---|---|---|---|
| 1 | Deposit | `+5.400.000` | Giải ngân vào Loan Drawdown, note *"Giải ngân khoản vay CAKEPD…"* |
| 2 | Withdrawal | `−400.000` | Thu phí bảo hiểm |
| 3 | Transfer | `−5.000.000` | Chuyển sang CASA → `Total Balance` về `₫0` |

Channel `iceLoanDrawdown`, user `cake-glpayment-svc`.

> **Balance về `₫0` chứng minh tiền đã rời Loan Drawdown, không chứng minh tiền đã
> vào CASA.** Đó là hai tài khoản khác nhau, và CASA có thể đang bị khoá
> (xem bước 3B trong [[kb/operations/luong-giai-ngan]]). Muốn chắc thì mở tab **CASA** ngay cạnh
> tab Loan Drawdown — chỉ một cú click — xem có dòng `+5.000.000` cùng mốc giờ không.

## Ca SVK-11748

| | |
|---|---|
| Sản phẩm | `CAKE_payday` → bước cuối là **CASA** |
| Ops báo | Đã giải ngân loan drawdown, bảo hiểm, **tiền đã vào CASA**, ICE `ACTIVE`, LMS `USER_SIGN` |
| Kết luận | Đã xác nhận tới bước cuối đúng nhóm → **đủ điều kiện duyệt** |
| Nguyên nhân | Thuộc **đợt lỗi hệ thống thứ Ba–thứ Tư trong tuần**. Team đã fix; ticket này xử lý các case còn kẹt lại |

## Ca SVK-11763

| | |
|---|---|
| Sản phẩm | `CAKE_payday` → bước cuối là **CASA** |
| Khoản vay | `CAKEPD225337447216640` · loan_id `17959045` · 5.400.000đ |
| Giải ngân | 30/09/2026 00:40 — **thứ Tư**, trùng đợt lỗi đã biết |
| Ops báo | Tiền vào **Loan Drawdown**, ICE `ACTIVE`, Portal `USER_SIGN` |
| Thiếu | Ops **dừng ở Loan Drawdown**, chưa xác nhận tiền vào CASA — dù KH tự báo đã nhận tiền |
| Xử lý | Xin thêm ảnh tab CASA `1105181238` rồi duyệt. Không duyệt bằng mỗi ảnh Loan Drawdown |

Comment đã gửi Ops — mẫu trả lời ngắn, xem [[kb/operations/quy-trinh-xu-ly]] mục *Cách phản hồi ticket SVK*:

> `CAKE_payday` bước cuối là **giải ngân vào CASA**. Ảnh mới có tab Loan Drawdown.
> Ops bổ sung ảnh tab **CASA 1105181238** có dòng `+5.000.000` lúc 30/09 00:40:57 → đủ điều kiện tạo Cake Task.

> KH nói "đã nhận tiền" là **dấu hiệu mạnh nhưng không thay được bằng chứng hệ thống**:
> khách dễ nhầm giữa tiền giải ngân và một khoản khác về cùng ngày. Quy tắc vẫn là
> Ops xác nhận tới bước cuối đúng nhóm sản phẩm.

## Lưu ý

Đợt lỗi đó sinh ra nhiều ticket cùng dạng: SVK-11730, SVK-11711, SVK-11748, SVK-11763.
Gặp ticket kẹt `USER_SIGN` trong giai đoạn này, **kiểm tra có thuộc đợt lỗi đã biết không**
trước khi điều tra từ đầu.
