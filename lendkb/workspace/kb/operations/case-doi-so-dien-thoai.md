---
title: Case mẫu — KH muốn đổi số điện thoại khi đang có ví/khoản vay
audience: [ops, po]
nhom: 2
sources:
  - "jira: SVK-11370, SVK-11393, SVK-11634, SVK-11233"
  - "confluence: 1074593793 [RE][EKYC] - Change phone pre-check rule(s)"
  - "confluence: 1058504829, 1060929556 — vòng đời trạng thái khoản vay"
  - "file: kb/operations/ma-loi-api.md — mã 600000"
  - "PO xác nhận 2026-10-04"
last_verified: 2026-10-04
owner: dung.pham2
status: draft
---

# Case mẫu — KH đổi số điện thoại khi đang có ví / khoản vay

Ví dụ gốc: *"KH mở ví được duyệt nhưng chưa ký, giờ muốn đổi sđt khác thì có đổi được không?"*

## Trả lời ngắn

**Được** — nhưng **không đổi trực tiếp**. Thứ tự bắt buộc:

> **1. Huỷ khoản vay / ví hiện tại → 2. Đổi số điện thoại → 3. Đăng ký lại khoản vay mới**

Đổi sđt trước rồi mới xử lý ví là **sai thứ tự**, ví sẽ hỏng.

## Vì sao không đổi thẳng được

Số điện thoại là **khoá định danh của ví**. Hồ sơ ví đã gắn sđt cũ ở cả phía Cake lẫn
phía đối tác. Khi sđt đăng ký ví khác sđt hiện tại:

| Hậu quả | Nguồn |
|---|---|
| Giao dịch chi tiêu/thanh toán trả về `600000 — Thông tin thanh toán không hợp lệ` | [[kb/operations/ma-loi-api]] |
| Không nhận được SMS OTP để thanh toán trước hạn | SVK-11370 |

Đổi sđt là tính năng của **KYC / app Cake**, không thuộc Lending. Lending **không chặn**
và cũng không được hỏi ý kiến khi KH đổi — nên KH hoàn toàn có thể tự đổi rồi mới phát
hiện ví hỏng.

## Lý do phải huỷ trước, không phải ký xong rồi đổi

Ví đã ký và active thì còn dư nợ, còn giao dịch. Lúc đó muốn đổi sđt phải **tất toán
toàn bộ rồi đóng ví**, lâu hơn nhiều. Hồ sơ **đã duyệt nhưng chưa ký thì chưa có dư nợ,
chưa có hợp đồng** — huỷ gần như không mất gì. Đây là thời điểm dễ xử lý nhất.

## Các bước hướng dẫn KH

### Bước 1 — Huỷ hồ sơ ví hiện tại

Hai cách, ưu tiên cách đầu:

| Cách | Trạng thái | Đăng ký lại |
|---|---|---|
| KH bấm **"Huỷ hợp đồng"** ở màn *Xem HĐ vay* | `LOAN_CANCEL` | **Ngay** |
| Để yên, không ký | `LOAN_EXPIRED` sau **T+7 kể từ ngày phê duyệt** | Phải tạo đăng ký mới |

→ **Hướng dẫn KH huỷ chủ động**, đừng bảo khách chờ hết hạn. Chờ 7 ngày không nhanh hơn
mà còn dễ sinh khiếu nại.

> Phân biệt với `LOAN_REJECT`: bị từ chối thì **phải chờ 7 ngày** mới đăng ký lại được.
> Còn `LOAN_CANCEL` do KH tự huỷ thì đăng ký lại được ngay.

### Bước 2 — Đổi số điện thoại

KH tự thực hiện trên app Cake. **Điều kiện: còn giữ SIM cũ** (luồng Phase 1 cần xác thực
SMS OTP trên số cũ).

Mất SIM thì KH **không tự đổi được**, phải qua CS. Cơ chế chung cho cả nhóm mất SIM đang
nằm ở Phase 2 (`PKA-2900`), chưa live.

### Bước 3 — Đăng ký lại ví bằng sđt mới

**Kiểm tra sđt bên đối tác trước khi cho KH đăng ký lại.**

Ví paylater qua đối tác thì đối tác gửi `phone_number` sang Cake ở `client-create`.
Nếu KH mới chỉ đổi ở Cake mà tài khoản bên đối tác vẫn số cũ → **lại lệch tiếp**, quay
về đúng vấn đề ban đầu.

→ KH phải đổi sđt ở **app đối tác** (QTV / Viettel Money / Long Châu / Be …) rồi mới
đăng ký ví lại.

## Hỏi KH ba câu trước khi tư vấn

1. **Ví sản phẩm nào?** (`MWG_paylater` / `VDS_paylater` / `LCP_paylater` / `BE_paylater` /
   `VNP_paylater` / `FPT_paylater`) — thứ tự đổi bên đối tác mỗi bên một kiểu.
2. **Còn giữ SIM cũ không?** Mất SIM thì không tự đổi được, phải chuyển CS.
3. **Đã đổi sđt ở app đối tác chưa?** Chưa thì làm bên đó trước.

## Trường hợp KH đã lỡ đổi sđt rồi

Ví đã hỏng, hai lựa chọn ([[kb/operations/ma-loi-api]], mã `600000`):

- **Đổi lại về sđt ban đầu** — nếu còn giữ SIM cũ
- **Huỷ khoản vay hiện tại để đăng ký lại** — về đúng quy trình 3 bước ở trên

Ví đã active và còn dư nợ thì phải **tất toán hết rồi mới đóng ví được**.

## Điểm chưa xác nhận

Confluence `[RE][EKYC] - Change phone pre-check rule(s)` (page `1074593793`) có rule
**`loan_01`: client có bất kỳ khoản vay đang active → `REJECT` / `HIGH_RISK`**, tức hệ
thống lẽ ra phải tự chặn.

Nhưng trang đó vẫn ở trạng thái **`planning`** (ver 26, 14/01/2026), và **SVK-11370 cho
thấy thực tế KH có khoản vay active vẫn đổi sđt thành công** rồi mới vỡ ở bước SMS OTP.

→ **Chưa rõ rule này đã live chưa.** Cần hỏi team KYC.
**Đừng nói với KH là "hệ thống sẽ chặn nếu không được phép"** — hiện tại không chặn.

## Ticket liên quan

| Ticket | Nội dung | Rút ra |
|---|---|---|
| SVK-11370 (2026-08-24) | 3 KH đổi sđt xong không nhận được SMS OTP để thanh toán trước hạn khoản vay Cashloan | Đổi sđt khi đang có khoản vay active **không bị chặn**, nhưng vỡ ở bước sau |
| SVK-11393 (2026-08-26) | KH huỷ SIM, đăng ký lại SIM mới; VDS truy vấn sổ TD báo không tồn tại tài khoản | Lệch sđt làm hỏng cả liên kết phía đối tác, không riêng lending |
| SVK-11634 (2026-09-23) · SVK-11233 (2026-08-06) | Đổi sđt xong Click To Pay vẫn gắn số cũ | Cùng gốc: các dịch vụ gắn sđt không tự đồng bộ sau khi đổi |
