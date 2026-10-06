---
title: Luồng giải ngân & trạng thái khoản vay — theo nhóm sản phẩm
audience:
  - ops
  - po
nhom: 2
sources:
  - troubleshoot:Giải ngân
  - confluence:1084555273
  - confluence:1058504829
  - confluence:1058537573
  - confluence:1774879278
last_verified: 2026-10-06T00:00:00.000Z
owner: dung.pham2
status: draft
---
# Luồng giải ngân & trạng thái

**Mỗi nhóm sản phẩm giải ngân một kiểu.** Trước khi kết luận "đã giải ngân đủ bước",
xác định sản phẩm thuộc nhóm nào. Nguồn chính: tab *Giải ngân* của file
`Troubleshoot Lending Ops`.

## Năm nhóm sản phẩm

| Nhóm | Sản phẩm | Tiền về đâu | Tạo TK trả trước (1C) | Gọi đối tác (2A–2B) | **Bước đi tiền cuối (3B)** |
| --- | --- | --- | --- | --- | --- |
| 1 | `CAKE_cashloan` · `CAKE_cl_affiliate` · `MWG_cashloan` · `MWG_cl_online` | TKTT Cake của khách, hoặc ngân hàng khác | Có | Không | Deposit vào **CASA**, hoặc channel `externalDisburse` khi ra ngân hàng khác |
| 2 | `CAKE_payday` · `BE_payday` | TKTT Cake của khách | Không | Không | Deposit vào **CASA** |
| 3 | `Viettel_Cashloan` · `VT_Cashloan_S` · `VTPO_cashloan` · `VNP_cashloan` · `VPO_cashloan` · `VPO_cl_pension` · `ZLP_cashloan` | Ví khách ở đối tác | Có | **Có** | Chuyển vào **TKĐBTT của đối tác** |
| 4 | `PD_Viettel` · `VT_Payday_S` · `VNP_payday` · `ZLP_payday` | Ví khách ở đối tác | Không | **Có** | Chuyển vào **TKĐBTT của đối tác** |
| 5 | `VDS_paylater` · `VNP_paylater` · các Paylater khác | Không đi tiền — chỉ mở hạn mức | Không | Không | **Không có bước đi tiền** |

TKĐBTT = tài khoản đảm bảo thanh toán của đối tác tại Cake. Đối tác tự cộng tiền vào ví khách.

> **Sản phẩm không có trong bảng** (`Be_Cashloan`, `KLP_cashloan`, `MISA_cashloan`,
> `MBF_cashloan`, OD…): troubleshoot chưa phủ. Tham khảo cột *Giải ngân* ở
> [[kb/product-matrix]] (`cake` / `partner` / `nh-khác`) nhưng **đừng tự xếp nhóm** —
> gửi Product verify theo [[kb/operations/quy-trinh-xu-ly]].

## Các bước theo nhóm

| Bước | Việc | Nhóm 1 | Nhóm 2 | Nhóm 3 | Nhóm 4 | Nhóm 5 |
| --- | --- | --- | --- | --- | --- | --- |
| **1A** | Tạo loan account trên Core ICE + approve theo phê duyệt LOS | ✅ | ✅ | ✅ | ✅ | ✅ |
| **1B** | Tạo loan drawdown — chỉ tạo nếu khách **chưa có** | ✅ | ✅ | ✅ | ✅ | — |
| **1C** | Tạo tài khoản trả trước (prepayment) — **riêng từng sản phẩm**, chỉ tạo nếu chưa có | ✅ | — | ✅ | — | — |
| **2A** | Cake gọi `disburse-request` sang đối tác | — | — | ✅ | ✅ | — |
| **2B** | Đối tác giải ngân vào ví khách, rồi gọi `disburse-update` về Cake | — | — | ✅ | ✅ | — |
| **3A** | Chuyển account ICE thành `ACTIVE` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **3B** | Đi tiền: loan drawdown (approve + bảo hiểm) → thu phí bảo hiểm → **bước cuối theo nhóm** | ✅ | ✅ | ✅ | ✅ | — |
| **3C** | Cập nhật LMS: `USER_SIGN` → `DISBURSE` | ✅ | ✅ | ✅ | ✅ | ✅ |

## Ops làm gì khi kẹt ở từng bước

| Bước | Xử lý |
| --- | --- |
| **1A · 1B · 1C** | Nhấn **"Thử giải ngân lại"** trên Portal → không được thì gửi Tech |
| **2A** | Nhấn **"Gửi lại yêu cầu giải ngân"** trên Portal. ⚠️ **Check kỹ các bước phía trên trước khi nhấn** |
| **2B** | Đối tác **chưa gọi** `disburse-update` → yêu cầu gọi lại callback. Đã gọi nhưng **timeout** → yêu cầu gọi lại; không được thì yêu cầu đối tác gửi log để audit |
| **3A** | Gửi Tech. Tech active ICE và chạy workflow thủ công |
| **3B** | Xem bảng dưới |
| **3C** | Nhấn "Thử giải ngân lại". **Nếu các bước đi tiền đã đủ** → confirm với Product, tạo Cake Task **"Lending Force Status Loan"** để chuyển khoản vay thành `ACTIVE` |

> **Riêng VNPay** (2A–2B): chỉ cần nhấn lại "Gửi lại yêu cầu giải ngân" — đối tác tự chống
> giải ngân trùng.

### Bước 3B — chi tiết

| Kẹt ở đâu | Xử lý |
| --- | --- |
| Chưa giải ngân loan drawdown | "Thử giải ngân lại" → **kiểm tra blacklist Mambu** → vẫn không được thì gửi Tech. **Nhóm 4: gỡ blacklist xong phải nhờ Recon đi tiền tay** |
| Chưa thu phí bảo hiểm | "Thử giải ngân lại" → gửi Tech |
| Nhóm 1, 2 — chưa deposit vào CASA | **Kiểm tra CASA có active không**, không thì mở khoá CASA → "Thử giải ngân lại" → gửi Tech |
| Nhóm 3, 4 — chưa chuyển vào TKĐBTT đối tác | "Thử giải ngân lại" → gửi Tech |

> Nhóm 1: giải ngân ra ngân hàng khác đã thành công **vẫn dùng được tool retry**.

### Mã lỗi workflow (Tech)

| Lỗi | Xử lý |
| --- | --- |
| `invalid connection` | Tech retry workflow |
| `context canceled => Excess loan limit` | **Recon đi tiền**, sau đó báo Tech cập nhật status + tạo lịch trả nợ (mẫu: PL-12149), đợi chuyển sang ICE |
| `ErrorCode:3305 EXTERNAL_ID_ALREADY_EXISTS` | **Không retry Mambu được** — báo Recon xử lý tay |

### Ngoại lệ

Chuyển một account đã `CANCEL` thành `ACTIVE`: **cần mail phê duyệt của COO**. Tech không tự xử lý.

## Vì sao khoản vay kẹt ở `USER_SIGN`

`USER_SIGN` là trạng thái **sau khi khách ký, trước khi 3C chạy xong**. Khoanh vùng theo nhóm:

| Dấu hiệu | Suy ra |
| --- | --- |
| Loan Drawdown **chưa có tiền** | Kẹt ở 1A–1B hoặc đầu 3B |
| Nhóm 3, 4 — Cake→Partner có log, Partner→Cake **không có log** | Kẹt ở 2B: đối tác chưa gọi `disburse-update`. **Không phải lỗi Cake** — giữ `USER_SIGN` là đúng thiết kế. Yêu cầu đối tác gọi lại callback, đừng force status |
| Nhóm 3, 4 — đối tác gửi **email** báo đã giải ngân | Email **không** thay cho callback `disburse-update`. Vẫn yêu cầu đối tác gọi callback |
| Nhóm 3, 4 — Partner trả **lỗi 500** | Callback tới nhưng Cake xử lý lỗi — gửi Tech |
| Loan Drawdown **đã đủ tiền**, ICE đã active, tiền đã tới bước cuối | Kẹt ở 3C → "Thử giải ngân lại", rồi Cake Task "Lending Force Status Loan" |

Case mẫu: [[kb/operations/case-ket-user-sign]].

## Trạng thái khoản vay

| Trạng thái đối tác gửi | Trạng thái Cake | Nghĩa |
| --- | --- | --- |
| `DISBURSE_SUCCESS` · `DISBURSE` | `ACTIVE` | Giải ngân thành công |
| `ACTIVE` | `ACTIVE` | Khoản vay đã kích hoạt |
| `ACTIVE_IN_ARREARS` | `IN_ARREARS` | Đang quá hạn |
| `DISBURSE_FAILED` | `LOAN_CANCEL` | Giải ngân thất bại phía đối tác |
| `LOAN_CANCELLED` · `CANCELLED` | `LOAN_CANCEL` | Khách huỷ hợp đồng |
| `WRITTEN_OFF` | `WRITTEN_OFF` | Write-off ngoại bảng |
| `CLOSED` | `CLOSED` | Đã tất toán |

Nhóm 3, 4 — **đối tác giải ngân thất bại**: ICE chuyển loan account = `CLOSE`,
Backend mark `status = DISBURSE_FAILED`.

Trạng thái trong luồng onboarding: `INIT` → `EKYC` → `EKYC_SUCCESS` → `APPROVE` →
**`USER_SIGN`** → `DISBURSE`.

`TEMP_LOCK` · `TEMP_LOCK_FRAUD` (riêng Paylater) · `PERM_LOCK` — xem [[kb/glossary]].

## Mambu trừ tiền nhưng ICE không gạch nợ

Xem [[kb/operations/quy-trinh-sau-vay]]. Bước kiểm tra đầu tiên: **có đúng cùng một khoản vay không.**
