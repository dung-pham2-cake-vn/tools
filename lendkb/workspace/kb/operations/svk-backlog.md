---
title: SVK — ticket vận hành đang mở
audience: [ops, po]
nhom: 2
last_verified: 2026-10-02
owner: dung.pham2
status: draft
coverage: partial
---

# SVK — 10 ticket đang mở (2026-10-02)

Kéo bằng `tools/export-svk.mjs`. JQL lọc request type Lending, bỏ Done/Cancelled/Ready4Test/Waiting for customer.

> Toàn bộ SĐT và CCCD đã ẩn danh hoá (62 lần) trước khi lưu vào `raw/jira/SVK/`.

## Ba nhóm sự cố

| Nhóm | Số ticket | Triệu chứng chung |
|---|---|---|
| **A — Gãy giải ngân** | 6 | Khoản vay kẹt `USER_SIGN`, đối tác đã giải ngân, core Cake chưa cập nhật |
| **B — ICE không gạch nợ** | 3 | Mambu có bút toán trừ tiền, ICE Portal không ghi nhận |
| **C — Đối soát timeout** | 1 | Danh sách giao dịch timeout cần xác nhận thành/bại |

## Nhóm A — Gãy giải ngân

| Ticket | Sản phẩm | Loan DD | Callback đối tác | Ghi chú |
|---|---|---|---|---|
| SVK-11736 | `Viettel_Cashloan` | 1 khoản **có** tiền · 1 khoản **chưa** | Cake→Partner có log · Partner→Cake **không có log** | 2 khoản |
| SVK-11731 | `Viettel_Cashloan` | chưa giải ngân ở core | VDS trả **lỗi 500 Internal server error** | VDS đã `DISBURSED` |
| SVK-11730 | `VNP_cashloan` + `VNP_payday` | **đủ** tiền, ICE đã active | hai chiều **thành công** | 4 khoản · recon xác nhận đối tác đã GN |
| SVK-11729 | `ZLP_cashloan` + `ZLP_payday` | — | — | 6 khoản |
| SVK-11716 | `ZLP_cashloan` | **chưa** có tiền | đối tác xác nhận đã GN qua email | 1 khoản |
| SVK-11711 | `PD_Viettel` | **đủ** tiền | đối tác đã GN, có email | 1 khoản |

**Điểm chung**: khách đã ký, đối tác đã chuyển tiền, nhưng trạng thái trên Cake vẫn `USER_SIGN`.
**Khác nhau ở**: Loan Drawdown đã có tiền hay chưa, và callback của đối tác có tới Cake không.

## Nhóm B — ICE không gạch nợ

| Ticket | Sản phẩm | Tình huống | Rủi ro |
|---|---|---|---|
| SVK-11719 | `ZLP_cashloan` | Tất toán trước hạn 29/09. Mambu trừ **53.208.188đ**, ICE vẫn `active` | Khách đã trả đủ mà vẫn bị tính lãi/phí |
| SVK-11718 | `CAKE_payday` | Trả một phần 2 lần. Lần 1 ICE ghi nhận, **lần 2 không** (cách nhau 59 giây) | Đến hạn 01/10 — sát |
| SVK-11715 | `CAKE_payday` | Trả trễ 2 ngày **6.800.000đ**. Mambu trừ, ICE không gạch nợ | Khoản vay đang treo quá hạn oan |

**Điểm chung**: tiền đã trừ của khách nhưng dư nợ chưa giảm. Khách bị tính lãi/phí oan.

## Nhóm C

| Ticket | Nội dung |
|---|---|
| SVK-11728 | Danh sách giao dịch timeout VDS ngày 29/09 cho 4 sản phẩm (Payday, Cashloan, ứng lương, vay lương). Cần xác nhận từng giao dịch thành hay bại để VDS ghi có cho khách hoặc cho Cake |

## Áp quy trình vào từng ticket (2026-10-02)

Theo [[kb/operations/quy-trinh-xu-ly]]. Tất cả nhóm A đều kẹt ở **bước 3C — cập nhật LMS `USER_SIGN` → `DISBURSE`**.

| Ticket | Kẹt ở | Hướng xử lý theo troubleshoot |
|---|---|---|
| **SVK-11736** | 2B — đối tác **chưa gọi** `disburse-update` | **Không phải lỗi Cake.** Giữ `USER_SIGN` là đúng thiết kế. → Yêu cầu Viettel gọi lại callback. Khoản thứ 2 (Loan DD chưa có tiền) kẹt sớm hơn, ở 3B |
| **SVK-11731** | 2B — đối tác gọi nhưng Cake trả **lỗi 500** | Yêu cầu VDS gọi lại callback; không được thì yêu cầu gửi log để audit. Lỗi 500 phía Cake → gửi Tech |
| **SVK-11730** | 3C — các bước đi tiền **đã đủ** (Loan DD đủ, ICE active, callback thành công) | Đúng ca mà troubleshoot mô tả: **confirm với Product → tạo Cake Task "Lending Force Status Loan"** chuyển thành `ACTIVE`. **Riêng VNPay** còn có thể nhấn lại "Gửi lại yêu cầu giải ngân" — đối tác tự chống trùng |
| **SVK-11729** | chưa rõ | Cần xác định Loan DD có tiền chưa và callback đã tới chưa, rồi theo nhánh tương ứng |
| **SVK-11716** | 3B — Loan DD **chưa có tiền** | "Thử giải ngân lại" trên Portal → kiểm tra **blacklist Mambu** → không được thì Tech. Email đối tác **không** thay cho callback API |
| **SVK-11711** | 3C — Loan DD **đủ tiền** | Như SVK-11730: confirm Product → Cake Task "Lending Force Status Loan" |

## Nhóm B — Mambu trừ tiền, ICE không gạch nợ

Troubleshoot **có phủ** ca này (tab *Quy trình sau vay*):

> *"KH đã thanh toán, Recon có ghi nhận bút toán gốc lãi, nhưng ICE chưa ghi nhận gạch nợ"*
> → **Kiểm tra có cùng một khoản vay không** — khách thanh toán khoản A, recon check khoản B.

| Ticket | Trạng thái |
|---|---|
| **SVK-11718** | **Lỗi hệ thống đợt này** (PO xác nhận 2026-10-02). Đang **đợi Recon xử lý thủ công**. Không phải lỗi chống trùng giao dịch như tôi đoán |
| SVK-11719 · SVK-11715 | Chưa hỏi PO. Bước đầu theo troubleshoot: xác nhận đúng cùng một khoản vay |

> **Bài học**: trước khi kết luận nguyên nhân kỹ thuật, kiểm tra điều đơn giản nhất trước —
> có đang soi đúng khoản vay không.

**SVK-11728** — đối soát timeout. Chưa có quy trình trong troubleshoot.

## Nguyên nhân gốc nhóm A

Phần lớn ticket kẹt `USER_SIGN` trong lô này thuộc **đợt lỗi hệ thống thứ Ba–thứ Tư trong tuần**
(PO xác nhận 2026-10-02). **Team đã fix.** Các ticket còn lại là xử lý case đã kẹt.

Xem case mẫu: [[kb/operations/case-ket-user-sign]].

| Ticket cùng đợt |
|---|
| SVK-11730 · SVK-11711 · SVK-11748 · SVK-11763 |

## PIC theo sản phẩm

| Ticket | Sản phẩm | PIC Product |
|---|---|---|
| SVK-11736 · 11731 · 11711 | Viettel Cashloan / Payday | Nguyễn Thanh Lâm |
| SVK-11730 | VNPay | Lê Chí Cường |
| SVK-11729 · 11719 · 11716 | ZaloPay | Nguyễn Vũ Minh Định |
| SVK-11718 · 11715 | Cake Payday | Phan Thị Thanh Duyên |
| SVK-11728 | VDS nhiều sản phẩm | Nguyễn Thanh Lâm |
