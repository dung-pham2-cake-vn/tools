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

> **Trả lời ticket cho Ops:** 1–2 câu — việc cần làm tiếp và ai làm. Không nêu tên file, đường dẫn hay mục của KB, không dẫn nguồn, không giải thích lý do, không ghi mã bước (3B.1…). Mẫu: [[kb/operations/quy-trinh-xu-ly]] mục *Cách phản hồi ticket SVK*.

**Mỗi nhóm sản phẩm giải ngân một kiểu.** Trước khi kết luận "đã giải ngân đủ bước",
xác định sản phẩm thuộc nhóm nào. Nguồn chính: tab *Giải ngân* của file
`Troubleshoot Lending Ops`.

## Năm nhóm sản phẩm

| Nhóm | Sản phẩm | Tiền về đâu | Tạo TK trả trước (1C) | Gọi đối tác (2A–2B) | **Bước đi tiền cuối (3B)** |
| --- | --- | --- | --- | --- | --- |
| 1 | `CAKE_cashloan` · `CAKE_cl_affiliate` · `MWG_cashloan` · `MWG_cl_online` | TKTT Cake của khách, hoặc ngân hàng khác | Có | Không | Deposit vào **CASA**, hoặc channel `externalDisburse` khi ra ngân hàng khác |
| 2 | `CAKE_payday` · `BE_payday` | TKTT Cake của khách | Không | Không | Deposit vào **CASA** |
| 3 | `Viettel_Cashloan` · `VT_Cashloan_S` · `VTPO_cashloan` · `VNP_cashloan` · `VPO_cashloan` · `VPO_cl_pension` · `ZLP_cashloan` | Ví khách ở đối tác | Có | **Có** | Chuyển vào **TKĐBTT của đối tác** — riêng Viettel: **tài khoản phải trả của đối tác** |
| 4 | `PD_Viettel` · `VT_Payday_S` · `VNP_payday` · `ZLP_payday` | Ví khách ở đối tác | Không | **Có** | Chuyển vào **TKĐBTT của đối tác** — riêng Viettel: **tài khoản phải trả của đối tác** |
| 5 | `VDS_paylater` · `VNP_paylater` · các Paylater khác | Không đi tiền — chỉ mở hạn mức | Không | Không | **Không có bước đi tiền** |

TKĐBTT = tài khoản đảm bảo thanh toán của đối tác tại Cake. Đối tác tự cộng tiền vào ví khách.

**Ewallet** là tài khoản ẩn trung gian của khách — **tuỳ sản phẩm mới có** (vd. VNPay). Sản phẩm
có Ewallet thì đường tiền là Loan DD → Ewallet → TKĐBTT, và tiền mới tới Ewallet là **chưa
xong** bước cuối (PO xác nhận 2026-10-07). Chưa có danh sách sản phẩm nào có Ewallet — nhìn
ảnh Core: có dòng chuyển vào Ewallet thì phải thấy tiếp dòng Ewallet → TKĐBTT.

**Bốn sản phẩm Viettel** (`Viettel_Cashloan`, `VT_Cashloan_S`, `PD_Viettel`, `VT_Payday_S`)
**không** chuyển vào TKĐBTT mà chuyển vào **tài khoản phải trả của đối tác** (PO xác nhận 2026-10-06).

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
| **2A** | Cake gọi `partner-disburse-request` sang đối tác | — | — | ✅ | ✅ | — |
| **2B** | Đối tác giải ngân vào ví khách, rồi gọi `disburse-update` về Cake | — | — | ✅ | ✅ | — |
| **3A** | Chuyển account ICE thành `ACTIVE` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **3B.1** | Giải ngân vào Loan Drawdown — số tiền approve + bảo hiểm | ✅ | ✅ | ✅ | ✅ | — |
| **3B.2** | Thu phí bảo hiểm — withdraw từ Loan Drawdown | ✅ | ✅ | ✅ | ✅ | — |
| **3B.3** | **Bước đi tiền cuối theo nhóm** — CASA / TKĐBTT / tài khoản phải trả đối tác (bảng trên) | ✅ | ✅ | ✅ | ✅ | — |
| **3C** | Cập nhật LMS: `USER_SIGN` → `DISBURSE` | ✅ | ✅ | ✅ | ✅ | ✅ |

## Ops làm gì khi kẹt ở từng bước

| Bước | Xử lý |
| --- | --- |
| **1A · 1B · 1C** | Nhấn **"Thử giải ngân lại"** trên Portal → không được thì gửi Tech |
| **2A** | Nhấn **"Gửi lại yêu cầu giải ngân"** trên Portal. ⚠️ **Check kỹ các bước phía trên trước khi nhấn** |
| **2B** | Xem mục *Kẹt ở bước gọi đối tác* bên dưới |
| **3A** | Gửi Tech. Tech active ICE và chạy workflow thủ công |
| **3B.1 · 3B.2 · 3B.3** | Xem bảng dưới |
| **3C** | Nhấn "Thử giải ngân lại" — **bắt buộc**, kể cả khi các bước đi tiền đã đủ. Retry vẫn không qua và đủ bằng chứng tới bước cuối → tạo Cake Task **"Lending Force Status Loan"**, báo PO approve để cập nhật trạng thái khoản vay thành `DISBURSE` |

> **Riêng VNPay** (2A–2B): chỉ cần nhấn lại "Gửi lại yêu cầu giải ngân" — đối tác tự chống
> giải ngân trùng.

### Bước 3B — chi tiết

| Bước kẹt | Dấu hiệu | Xử lý |
| --- | --- | --- |
| **3B.1** | ICE đã active, Loan DD **chưa có tiền** | "Thử giải ngân lại" → **kiểm tra blacklist Mambu** → vẫn không được thì gửi Tech. **Nhóm 4: gỡ blacklist xong phải nhờ Recon đi tiền tay** |
| **3B.2** | Loan DD có tiền, **chưa thu phí bảo hiểm** | "Thử giải ngân lại" → gửi Tech |
| **3B.3** — nhóm 1, 2 | Đã thu phí bảo hiểm, tiền còn ở Loan DD, **chưa deposit vào CASA** | **Kiểm tra CASA có active không** — bị khoá thì làm việc với khách mở lại CASA → "Thử giải ngân lại" → gửi Tech |
| **3B.3** — nhóm 3, 4 | Đã thu phí bảo hiểm, **chưa chuyển vào TKĐBTT / tài khoản phải trả đối tác** | "Thử giải ngân lại" → gửi Tech. Không có bước kiểm tra CASA — tiền không đi qua CASA của khách |

> File troubleshoot gốc ở nhóm 3, 4 vẫn ghi "Chưa thực hiện lệnh deposit vào Casa" — chép
> nhầm từ nhóm 1, 2 (PO xác nhận 2026-10-06).

### Ops đã làm hết bước của Ops mà vẫn kẹt

1. Ops gửi Tech kiểm tra.
2. Tech không xử lý được → Tech **confirm để Ops nhờ Recon đi tiền thủ công**. Recon làm thay
   hệ thống các bước trong 3B.
3. Recon confirm đã đi xong → Ops tạo Cake Task **"Lending Force Status Loan"**, báo PO approve
   để cập nhật trạng thái khoản vay thành `DISBURSE`.

> Nhóm 1: giải ngân ra ngân hàng khác đã thành công **vẫn dùng được tool retry**.

### Mã lỗi workflow (Tech)

| Lỗi | Xử lý |
| --- | --- |
| `invalid connection` | Tech retry workflow |
| `context canceled => Excess loan limit` | **Recon đi tiền**, sau đó báo Tech cập nhật status + tạo lịch trả nợ (mẫu: PL-12149), đợi chuyển sang ICE |
| `ErrorCode:3305 EXTERNAL_ID_ALREADY_EXISTS` | **Không retry Mambu được** — báo Recon xử lý tay |
| Retry trên Portal báo **"Thiếu thông tin cần thiết"** | Lỗi hệ thống, **đã fix** (2026-10). Gặp lại → retry lần nữa; vẫn còn thì gửi Tech |

### Ngoại lệ

Chuyển một account đã `CANCEL` thành `ACTIVE`: **cần mail phê duyệt của COO**. Tech không tự xử lý.

## Vì sao khoản vay kẹt ở `USER_SIGN`

`USER_SIGN` là trạng thái **sau khi khách ký, trước khi 3C chạy xong**. Khoanh vùng theo nhóm:

| Dấu hiệu | Suy ra |
| --- | --- |
| ICE **chưa** active, Loan DD **chưa có tiền** | Kẹt ở 1A–1B hoặc 3A |
| ICE **đã** active, Loan DD **chưa có tiền** | Kẹt ở 3B.1 |
| Loan DD có tiền, đã thu phí bảo hiểm, tiền **chưa rời** Loan DD | Kẹt ở 3B.3 |
| Nhóm 3, 4 — Partner→Cake **không có log** | Kẹt ở 2B — xem mục *Kẹt ở bước gọi đối tác*. **Không phải lỗi Cake**, đừng force status |
| Nhóm 3, 4 — Partner gọi về nhưng Cake trả **900002 / 500** | Lỗi phía Cake — xem mục *Kẹt ở bước gọi đối tác* |
| ICE đã active, tiền **đã tới bước cuối** của nhóm | Kẹt ở 3C → "Thử giải ngân lại", rồi Cake Task "Lending Force Status Loan" |

Case mẫu: [[kb/operations/case-ket-user-sign]].

## Phản hồi ticket kẹt giải ngân

Cách làm:

1. Đọc bằng chứng Ops gửi (ảnh Portal, ICE, Loan DD, CASA) → xác định **bước cuối đã xong**.
2. Suy ra **bước đang kẹt** — bước kế tiếp theo nhóm sản phẩm.
3. Trả lời **cách xử lý của đúng bước đó** theo bảng trên. **Chỉ nêu việc Ops chưa làm** —
   Ops ghi đã retry, đã check blacklist thì không nhắc lại, chuyển sang bước tiếp.
4. **Ops không nói rõ đã tới bước nào** → không đoán, **hỏi lại Ops** kiểm tra đúng các bước
   còn mơ hồ (vd. đã thu phí bảo hiểm chưa, đã đi tiền bước cuối chưa).
5. Bước có API thì **nêu tên API** — Ops/đối tác tra log theo tên đó.

**Người trả lời không duyệt thay PO.** Chỉ kết luận đủ hay thiếu thông tin, và Ops làm gì tiếp.

### Ticket xin force status — tiêu chuẩn đủ

Ops báo đi tiền đủ bước, gửi CSV Cake Task. **Đủ** khi có cả ba:

1. Ops **đã nhấn "Thử giải ngân lại"** và vẫn không qua — bắt buộc.
2. **Ảnh giao dịch trên Core Cake** cho thấy tiền đã tới **bước cuối đúng nhóm**: CASA ·
   TKĐBTT (sản phẩm có Ewallet thì không dừng ở Ewallet) · tài khoản phải trả đối tác (Viettel).
3. ICE đã active (hoặc `IN_ARREARS` nếu đã quá hạn).

**Không đủ**: đối tác xác nhận đã giải ngân · khách báo đã nhận tiền · tiền mới tới Ewallet ·
Ops viết "đã giải ngân" chung chung không kèm ảnh.

Ngắn gọn, hai phần: vấn đề đang gặp + cách xử lý. **Không ghi mã bước** (3B.1…) trong câu trả lời,
không giải thích cả luồng. Mẫu chung cho ticket SVK: [[kb/operations/quy-trinh-xu-ly]] mục
*Cách phản hồi ticket SVK*.

**Ví dụ 1 — `PD_Viettel`.** Ops báo: ICE đã active, Loan DD chưa có tiền, đã thử giải ngân lại
không được, tài khoản không blacklist.

> Khoản vay đã active trên ICE nhưng chưa đi tiền vào Loan DD. Ops đã thử giải ngân lại và
> tài khoản không bị blacklist → chuyển Tech kiểm tra. Tech không xử lý được sẽ confirm để Ops
> nhờ Recon đi tiền thủ công.

**Ví dụ 2 — `BE_payday`.** Ops báo: ICE đã active, đã thu phí bảo hiểm, tiền còn ở Loan DD,
đã thử giải ngân lại không được.

> Đã thu phí bảo hiểm, tiền còn ở Loan DD, chưa deposit vào CASA. Kiểm tra CASA của khách có
> đang active không — bị khoá thì làm việc với khách mở lại CASA, rồi thử giải ngân lại trên
> Portal. Vẫn không được thì gửi Tech.

Thực tế ca này CASA bị khoá; Ops cùng khách mở lại CASA rồi retry thành công.

**Ví dụ 3 — `CAKE_payday`, ICE chưa active.** Ops báo: đã tạo khoản vay trên Core, đã có
Loan DD (hoặc ICE đã có khoản vay nhưng còn `INIT`), retry không qua.

> Đã tạo khoản vay và Loan DD nhưng ICE chưa active → Tech active ICE và chạy lại luồng
> giải ngân.

**Ví dụ 4 — `PD_Viettel`, ICE còn `INIT`.** Ops báo: ICE đã có khoản vay nhưng `INIT`, retry
báo lỗi. Nhóm 4 phải qua bước gọi đối tác trước khi active ICE.

> ICE còn INIT. Kiểm tra Cake đã gọi API `partner-disburse-request` gửi yêu cầu giải ngân
> sang Viettel chưa, và Viettel đã gọi API `disburse-update` cập nhật trạng thái giải ngân
> chưa. Chưa gửi → nhấn "Gửi lại yêu cầu giải ngân". Đã gửi mà Viettel chưa gọi về → yêu cầu
> Viettel gọi lại. Đủ cả hai mà ICE vẫn INIT → gửi Tech.

**Ví dụ 5 — `CAKE_cashloan`, chưa thu phí bảo hiểm.** Ops báo: ICE active, Loan DD đã có tiền,
chưa trừ phí bảo hiểm, không blacklist, retry lỗi.

> Tiền đã vào Loan DD nhưng chưa thu phí bảo hiểm. Ops đã thử giải ngân lại → chuyển Tech
> kiểm tra. Tech không xử lý được sẽ confirm để Ops nhờ Recon đi tiền thủ công.

**Ví dụ 6 — `PD_Viettel`, chưa chuyển tiền cho đối tác.** Ops báo: Viettel đã giải ngân và gọi
cập nhật thành công, tiền còn ở Loan DD, retry lỗi.

> Viettel đã giải ngân và cập nhật thành công, tiền còn ở Loan DD, chưa chuyển sang tài khoản
> phải trả của đối tác. Ops đã thử giải ngân lại → chuyển Tech. Tech không xử lý được thì
> nhờ Recon đi tiền thủ công.

**Ví dụ 7 — Ops không nói rõ bước.** Ops báo: tiền còn ở Loan DD, retry lỗi — không nói đã
thu phí bảo hiểm chưa.

> Nhờ Ops kiểm tra giúp: đã thu phí bảo hiểm chưa, và đã đi tiền vào <bước cuối của nhóm —
> CASA / TKĐBTT / tài khoản phải trả đối tác> chưa. Có kết quả thì xử lý theo đúng bước đang kẹt.

**Ví dụ 8 — `CAKE_payday`, xin force status, đủ.** Ops báo: đã vào Loan DD, đã thu phí bảo hiểm,
tiền đã vào CASA (có ảnh), ICE active, LMS `USER_SIGN`, đã retry không qua, gửi kèm CSV.

> Đủ bằng chứng tới bước cuối (CASA). Ops tạo Cake Task Lending Force Status Loan
> (`status DISBURSE`), báo PO duyệt.

**Ví dụ 9 — `PD_Viettel`, xin force status, thiếu bằng chứng Core.** Ops báo: đã vào Loan DD,
đã thu phí bảo hiểm, "tiền đã giải ngân sang đối tác (VDS đã xác nhận)".

> VDS xác nhận chưa thay được bằng chứng hệ thống. Bổ sung ảnh trên Core Cake cho thấy đã đi
> tiền vào tài khoản phải trả của đối tác → đủ điều kiện tạo Cake Task.

**Ví dụ 10 — `ZLP_cashloan`, khách báo đã nhận tiền.** Ops báo: đã vào Loan DD, đã thu phí bảo
hiểm, ICE active, khách nhận được tiền trong ví ZaloPay.

> Khách nhận được tiền chưa thay được bằng chứng hệ thống. Bổ sung ảnh trên Core Cake cho thấy
> đã đi tiền vào TKĐBTT của ZaloPay → đủ điều kiện tạo Cake Task.

**Ví dụ 11 — `VNP_cashloan`, tiền mới tới Ewallet.** Ops báo: ICE active, API hai chiều thành
công, ảnh có dòng chuyển tiền từ Loan DD vào Lending Ewallet, retry lỗi.

> Tiền mới tới Ewallet (tài khoản trung gian), chưa tới TKĐBTT của VNPay. Ops thử giải ngân
> lại; vẫn không qua thì bổ sung ảnh trạng thái chuyển tiền Ewallet → TKĐBTT, chưa có thì gửi Tech.

**Ví dụ 12 — `CAKE_payday`, ICE active, không nói gì thêm.** Ops báo: ICE active, Portal
`USER_SIGN`, retry không thành công.

> Nhờ Ops kiểm tra giúp: tiền đã vào Loan DD chưa, đã thu phí bảo hiểm chưa, đã vào CASA chưa,
> khách có bị blacklist không.

**Ví dụ 13 — `PD_Viettel`, đối tác báo DISBURSED, Loan DD chưa có tiền.** Ops báo: đối tác
`DISBURSED`, ICE active, Loan DD chưa có tiền, đã thử giải ngân lại không được.

> Khoản vay đã active trên ICE nhưng chưa đi tiền vào Loan DD — xử lý như mọi sản phẩm: Ops đã
> thử giải ngân lại → kiểm tra blacklist Mambu (gỡ blacklist xong nhờ Recon đi tiền tay) →
> vẫn không được thì gửi Tech.

**Ví dụ 14 — `VNP_payday`, đã thu phí bảo hiểm, không nói bước cuối.** Ops báo: đã vào Loan DD,
đã thu phí bảo hiểm, ICE active, đã nhấn "Gửi lại yêu cầu giải ngân".

> Nhờ Ops kiểm tra giúp: đã đi tiền vào TKĐBTT của VNPay chưa. Có kết quả thì xử lý theo đúng
> bước đang kẹt.

## Kẹt ở bước gọi đối tác — nhóm 3, 4

Hai API: Cake gọi `partner-disburse-request` sang đối tác (2A) → đối tác giải ngân vào ví khách
rồi gọi `disburse-update` về Cake (2B). PO chốt 2026-10-07:

| Tình huống | Xử lý |
|---|---|
| **Cake chưa gọi** `partner-disburse-request` | Nhấn "Gửi lại yêu cầu giải ngân". Gửi lại báo success mà vẫn chưa có log → gửi Tech |
| Cake gọi sang, **đối tác trả mã lỗi** (vd. `LOAN_APPLICATION_NOT_FOUND`) | Ops hỏi đối tác vì sao trả mã lỗi này khi Cake gọi sang |
| **Không có log** đối tác gọi `disburse-update` (kể cả khi đối tác/Recon đã xác nhận giải ngân) | 1. Yêu cầu Ops cung cấp log đối tác đã gọi `disburse-update` · 2. Đối tác chưa gọi → yêu cầu đối tác gọi lại · 3. Đối tác không gọi được → yêu cầu **mail xác nhận từ đối tác** |
| Đối tác **có gọi** `disburse-update` nhưng Cake trả lỗi — `900002 Request is processing`, `500 Internal server error` | Lỗi phía Cake. **Không tính là timeout** → Ops "Thử giải ngân lại" trên Portal → không được thì gửi Tech → Tech không xử lý được thì confirm để Ops nhờ Recon đi tiền thủ công |
| Gateway Cake trả *Connection refused* khi đối tác gọi | Lỗi hạ tầng → gửi Tech |
| **API hai chiều đều thành công** mà vẫn `USER_SIGN` | Bước gọi đối tác đã xong → xử lý tiếp theo 3A / 3B như các mục trên |
| Không có log đối tác gọi về, nhưng **Loan DD đã có tiền / ICE đã active** | Có thể Ops tìm thiếu log — coi như đối tác đã gọi, xử lý tiếp bước 3B |

> ⚠️ **Đối tác đã giải ngân và đã gọi `disburse-update` → không nhấn "Gửi lại yêu cầu giải ngân"**
> nữa (gửi lại = yêu cầu đối tác giải ngân lần nữa). Dùng "Thử giải ngân lại" để chạy tiếp phía Cake.
> Riêng VNPay đối tác tự chống trùng.

**Ví dụ 15 — Viettel trả 900002.** Ops báo: VDS đã giải ngân, gọi `disburse-update` về Cake bị
`900002 Request is processing`, Cake vẫn `USER_SIGN`.

> Viettel đã gọi API `disburse-update` nhưng Cake trả lỗi 900002 — lỗi phía Cake. Ops thử giải
> ngân lại trên Portal; không được thì gửi Tech, Tech không xử lý được sẽ confirm để Ops nhờ
> Recon đi tiền thủ công.

**Ví dụ 16 — ZaloPay không có log, Recon xác nhận đã giải ngân.** Ops báo: Loan DD chưa có tiền,
API Cake gọi đối tác thành công, chưa có log đối tác gọi về, Recon xác nhận ZLP đã giải ngân.

> Chưa có log ZaloPay gọi API `disburse-update` về Cake. Ops cung cấp log nếu đối tác đã gọi;
> chưa gọi thì yêu cầu ZaloPay gọi lại API này; ZaloPay không gọi được thì cần mail xác nhận
> từ ZaloPay.

**Ví dụ 17 — Đối tác đã gọi, Ops lại gửi lại yêu cầu giải ngân.** Ops báo: Loan DD có giao dịch
giải ngân, Cake đã gọi `partner-disburse-request`, VDS đã gọi `disburse-update`, Ops đã nhấn
"Gửi lại yêu cầu giải ngân" nhưng không đổi trạng thái.

> Đối tác đã giải ngân và đã gọi `disburse-update` — không gửi lại yêu cầu giải ngân nữa. Ops
> kiểm tra đã đi tiền vào tài khoản phải trả của đối tác chưa; đủ thì "Thử giải ngân lại", vẫn
> không qua thì đủ điều kiện tạo Cake Task.

**Ví dụ 18 — `disbursed_amount` lớn hơn số duyệt.** Đối tác hỏi vì sao `get-loan-detail` trả
`disbursed_amount` 8.560.000 trong khi số duyệt 8.000.000.

> `disbursed_amount` = số tiền duyệt + phí bảo hiểm — đúng với số giải ngân vào Loan DD.

## Lệch trạng thái Cake ↔ đối tác

| Cake | Đối tác | Xử lý |
|---|---|---|
| `DISBURSE_FAILED` (ICE đã `CLOSE`) | `Disbursed` — đã chuyển tiền cho khách | Trình **ngoại lệ COO duyệt** để chuyển account đã `CANCEL` thành `ACTIVE` (mục *Ngoại lệ*). Ví dụ SVK-11006 |
| `USER_SIGN` | `CANCELLED` / `CALLED_OFF`, đối tác trả `CONTRACT_IS_CLOSED` | **Lỗi phía đối tác** — đối tác tự huỷ khoản vay. Ops hỏi đối tác vì sao trả trạng thái `CONTRACT_IS_CLOSED`. Ví dụ SVK-10698 (~280 khoản `PD_Viettel` một ngày) |
| `Approved` | `Rejected` (lệch ngay lúc onboarding) | Kiểm tra log Cake bắn sang đối tác là approve hay reject: bắn **approve** → báo đối tác kiểm tra; bắn **reject** → báo Tech kiểm tra. Ví dụ SVK-11339 |
| `USER_SIGN` | Đối tác báo order đã success, nhờ Cake cập nhật | Như mục *Kẹt ở bước gọi đối tác*: cần log đối tác đã gọi `disburse-update`; chưa gọi thì yêu cầu gọi lại; không gọi được thì cần mail xác nhận. Ví dụ SVK-9533 |

**Ví dụ 19 — `DISBURSE_FAILED` nhưng đối tác đã giải ngân.**

> Cake ghi giải ngân thất bại nhưng Viettel đã chuyển tiền cho khách → trình ngoại lệ COO duyệt
> chuyển khoản vay từ CANCEL sang ACTIVE, có mail duyệt thì gửi Tech xử lý.

**Ví dụ 20 — Đối tác trả `CONTRACT_IS_CLOSED`.**

> Viettel tự huỷ các khoản vay này — Ops hỏi Viettel vì sao trả trạng thái CONTRACT_IS_CLOSED.

**Ví dụ 21 — Cake `Approved`, Viettel `Rejected`.**

> Ops kiểm tra log Cake gửi sang Viettel: gửi approve thì nhờ Viettel kiểm tra; gửi reject thì
> gửi Tech kiểm tra.

### Khoản vay kẹt `USER_SIGN` mà khách vẫn trả nợ được, rồi bị `CLOSE`

Đối tác đã giải ngân nên coi khoản vay là active (không cần chờ Cake), trong khi Cake đã
active ICE nhưng kẹt các bước đi tiền. Khách vẫn thanh toán → ICE đóng account → LMS đồng bộ
về `CLOSE`. Ví dụ: SVK-11246, SVK-11141.

Đã chặn: khách **không được repayment khi khoản vay còn `USER_SIGN`** tại Cake
([PL-13944](https://cakedigitalbank.atlassian.net/browse/PL-13944)). Gặp lại trường hợp tương tự
→ **gửi Tech**.

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
