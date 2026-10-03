---
title: Luồng giải ngân & trạng thái khoản vay — nền để xử lý ticket
audience: [ops, po]
nhom: 2
sources:
  - confluence:1084555273
  - confluence:1058504829
  - confluence:1058537573
  - confluence:1774879278
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Luồng giải ngân & trạng thái

Luồng **dùng chung cho mọi sản phẩm DOP và Native API**. Nguồn: ticket mẫu
`[Cake][Guideline] - Product Ticket` và bộ spec nó trỏ tới.

## Luồng giải ngân — 5 bước

| Bước | Hệ thống | Việc |
|---|---|---|
| 1 | **LMS** | Gửi yêu cầu giải ngân tới ICE **khi `loan_registration status = USER_SIGNED`** |
| 2 | **ICE** | Giải ngân vào bucket nội bộ `$loandd`. Số tiền = **số LMS duyệt + phí bảo hiểm** |
| 3 | **Mambu** | Deposit vào **Loan Drawdown** của khách, qua channel `iceLoanDrawdown` |
| 4 | **Mambu** | Thu phí bảo hiểm từ Loan Drawdown, qua channel `insuranceFeeOpec<Đối tác>` |
| 5 | **Mambu** | Chuyển từ Loan Drawdown sang **Ewallet** (số tiền = gốc − phí BH), rồi transfer sang **tài khoản công ty đối tác** (`Cxxxxxxxx`) |

Giải ngân ra ngoài Cake thì bước 5 chuyển vào tài khoản khách chỉ định thay vì Ewallet.

**Quy tắc khi đối tác giải ngân thất bại**: ICE chuyển loan account = `CLOSE`,
Backend mark `status = DISBURSE_FAILED`.

## Trạng thái khoản vay

| Trạng thái đối tác gửi | Trạng thái Cake | Nghĩa |
|---|---|---|
| `DISBURSE_SUCCESS` · `DISBURSE` | `ACTIVE` | Giải ngân thành công |
| `ACTIVE` | `ACTIVE` | Khoản vay đã kích hoạt |
| `ACTIVE_IN_ARREARS` | `IN_ARREARS` | Đang quá hạn |
| `DISBURSE_FAILED` | `LOAN_CANCEL` | Giải ngân thất bại phía đối tác |
| `LOAN_CANCELLED` · `CANCELLED` | `LOAN_CANCEL` | Khách huỷ hợp đồng |
| `WRITTEN_OFF` | `WRITTEN_OFF` | Write-off ngoại bảng |
| `CLOSED` | `CLOSED` | Đã tất toán |

Trạng thái trong luồng onboarding: `INIT` → `EKYC` → `EKYC_SUCCESS` → `APPROVE` →
**`USER_SIGN`** → `DISBURSE`.

`TEMP_LOCK` · `TEMP_LOCK_FRAUD` (riêng Paylater) · `PERM_LOCK` — xem `glossary.md`.

## Vì sao khoản vay kẹt ở `USER_SIGN`

`USER_SIGN` là trạng thái **sau khi khách ký, trước khi giải ngân**. Kẹt ở đây nghĩa là
**bước 1 → 2 chưa chạy hoặc chạy lỗi**.

Đối chiếu với dữ liệu trên ticket để khoanh vùng:

| Dấu hiệu | Suy ra |
|---|---|
| Loan Drawdown **chưa có tiền** | Kẹt từ bước 2–3. ICE chưa giải ngân hoặc deposit lỗi |
| Loan Drawdown **đã đủ tiền**, ICE đã active | Bước 2–5 xong. Vấn đề ở chỗ cập nhật ngược trạng thái về LMS |
| Partner→Cake **không có log** | Callback `partner-update-status` không tới |
| Partner trả **lỗi 500** | Callback tới nhưng Cake xử lý lỗi |

**Cách xử lý từng nhánh**: xem `quy-trinh-xu-ly.md`.

## Mambu trừ tiền nhưng ICE không gạch nợ

Xem `quy-trinh-sau-vay.md`. Bước kiểm tra đầu tiên: **có đúng cùng một khoản vay không.**
