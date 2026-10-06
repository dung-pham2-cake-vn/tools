---
title: Quy trình xử lý ticket vận hành
audience: [ops, po]
nhom: 2
sources:
  - "file: Troubleshoot Lending Ops.xls"
  - "file: code/lending_manage/open_api_viewer/specs/"
  - confluence:1084555273
last_verified: 2026-10-05
owner: dung.pham2
status: draft
---

# Quy trình xử lý ticket vận hành

Nguồn: file **Troubleshoot Lending Ops.xls** — 15 tab. Parse bằng `tools/parse-troubleshoot.py`,
sinh tài liệu bằng `tools/gen-ops-docs.py`, chạy lại được khi file nguồn cập nhật.

| Tab | Đã đưa vào |
|---|---|
| Quy trình · PIC | file này |
| Onb-DOP · Onb-Cake · Onb-API | file này, mục "Lỗi onboarding hay gặp" |
| Giải ngân | file này, mục "Luồng giải ngân" |
| APIs sau vay · Payment | [[kb/operations/ma-loi-api]] |
| Quy trình sau vay · Recon | [[kb/operations/quy-trinh-sau-vay]] |
| Cake task | file này, mục "Cake Task" |
| PO only · Dashboard cần bổ sung · Request tools | **không đưa vào** — việc của PO, không dùng để xử lý ticket |

## Thứ tự leo thang — 5 bước

| Bước | Ai | Làm gì |
|---|---|---|
| 1 | **Ops** | Tự check bằng tool sẵn có + tra file `Troubleshoot Lending.xlsx` |
| 2 | **Ops** | Troubleshoot note ghi "gửi Tech" → chuyển ticket sang Tech |
| 3 | **Ops** | Troubleshoot **không có** thông tin về case → gửi **Product** verify (theo tab PIC) |
| 4 | **Product** | Verify không được → comment chuyển sang **Tech** |
| 5 | **Tech** | Case xong, nếu đáng làm mẫu → cập nhật lại file troubleshoot |

**Nguyên tắc: tra troubleshoot trước, không đoán.** Case chưa có trong file thì đi qua
Product chứ không nhảy thẳng sang Tech.

## Ai phụ trách sản phẩm nào

| PIC | Sản phẩm |
|---|---|
| Phan Thị Thanh Duyên | OD (+TD) · Cake Cashloan · Cake Payday |
| Nguyễn Vũ Minh Định | MWG Paylater · ZLP Cashloan · ZLP Payday · VDS Paylater |
| Nguyễn Thanh Lâm | VDS Cashloan (+Payroll) · VDS Payday (+Payroll) · VDS O2O · MWG Cashloan |
| Cấn Thị Kim Tuyến | Vnpost Cashloan |
| Lê Chí Cường | Be Cashloan · Be Paylater · VNPay Cashloan · VNPay Paylater · VNPay Payday · FPT Paylater |

Tech: **Phạm Tiến Dũng** (chịu trách nhiệm case vận hành Lending) · Võ Tuấn Nghĩa (hỗ trợ) ·
Đỗ Phương Chi (eKYC) · Võ Trần Đăng Khoa (hỗ trợ eKYC).

---

# Luồng giải ngân

## Năm nhóm sản phẩm — bước đi tiền cuối cùng khác nhau

**Đây là chỗ hay nhầm nhất.** Xác nhận "đã giải ngân đủ bước" nghĩa là gì phụ thuộc nhóm:

| Nhóm | Sản phẩm | Có gọi đối tác? | Tạo TK trả trước? | **Bước đi tiền cuối** |
|---|---|---|---|---|
| 1 | `CAKE_cashloan` · `CAKE_cl_affiliate` · `MWG_cashloan` · `MWG_cl_online` | Không | Có | **Deposit vào CASA** / channel `externalDisburse` |
| 2 | `CAKE_payday` · `BE_payday` | Không | Không | **Deposit vào CASA** |
| 3 | `Viettel_Cashloan` · `VT_Cashloan_S` · `VTPO_cashloan` · `VNP_cashloan` · `VPO_cashloan` · `VPO_cl_pension` · `ZLP_cashloan` | **Có** | Có | **Giải ngân vào TKĐBTT của đối tác** |
| 4 | `PD_Viettel` · `VT_Payday_S` · `VNP_payday` · `ZLP_payday` | **Có** | Không | **Giải ngân vào TKĐBTT của đối tác** |
| 5 | `VDS_paylater` · `VNP_paylater` · paylater khác | Không | Không | **Không có bước đi tiền** |

## Giai đoạn 1 — Tạo tài khoản

| Bước | Việc | Ops làm gì khi lỗi |
|---|---|---|
| **1A** | Tạo loan account trên Core ICE (theo phê duyệt LOS) | Nhấn **"Thử giải ngân lại"** trên Portal → không được thì gửi Tech |
| **1B** | Tạo loan drawdown — **chỉ tạo nếu khách chưa có** | như trên |
| **1C** | Tạo tài khoản trả trước (prepayment) — **riêng từng sản phẩm**. Chỉ nhóm 1 và 3 | như trên |

## Giai đoạn 2 — Gọi đối tác · chỉ nhóm 3 và 4

Nhóm 1, 2, 5 **bỏ qua giai đoạn này**.

| Bước | Việc | Ops làm gì khi lỗi |
|---|---|---|
| **2A** | Cake gọi `disburse-request` sang đối tác | Nhấn **"Gửi lại yêu cầu giải ngân"** trên Portal. ⚠️ **Check kỹ các bước phía trên trước khi nhấn** |
| **2B** | Đối tác gọi `disburse-update` về Cake | Đối tác **chưa gọi** → yêu cầu gọi lại callback. Đã gọi nhưng **timeout** → yêu cầu gọi lại; không được thì yêu cầu đối tác gửi log để audit |

> **Riêng VNPay**: chỉ cần nhấn lại "Gửi lại yêu cầu giải ngân" — đối tác tự chống giải ngân trùng.

## Giai đoạn 3 — Giải ngân và cập nhật

| Bước | Việc | Ops làm gì khi lỗi |
|---|---|---|
| **3A** | Chuyển status account ICE thành `ACTIVE` | Gửi Tech. Tech active ICE và chạy workflow thủ công |
| **3B** | Loan drawdown (approve + bảo hiểm) → thu phí bảo hiểm → **bước cuối theo nhóm** (xem bảng trên) | xem bảng dưới |
| **3C** | Cập nhật LMS: `USER_SIGN` → `DISBURSE` | Nhấn "Thử giải ngân lại". **Nếu các bước đi tiền đã đủ** → Cake Task **"Lending Force Status Loan"** |

### Bước 3B — chi tiết

| Kẹt ở đâu | Xử lý |
|---|---|
| Chưa giải ngân loan drawdown | "Thử giải ngân lại" → **kiểm tra blacklist Mambu** → vẫn không được thì gửi Tech |
| Chưa thu phí bảo hiểm | "Thử giải ngân lại" → gửi Tech |
| Chưa deposit vào CASA | **Kiểm tra CASA có active không**, nếu không thì mở khoá CASA → "Thử giải ngân lại" → gửi Tech |

> Giải ngân ra ngoài đã thành công **vẫn dùng được tool retry**.

### Mã lỗi workflow

| Lỗi | Xử lý |
|---|---|
| `invalid connection` | Tech retry workflow |
| `context canceled => Excess loan limit` | **Recon đi tiền**, sau đó báo Tech cập nhật status + tạo lịch trả nợ (mẫu: PL-12149), đợi chuyển sang ICE |
| `ErrorCode:3305 EXTERNAL_ID_ALREADY_EXISTS` | **Không retry Mambu được** — báo Recon xử lý tay |

## Trường hợp ngoại lệ

Chuyển một account đã `CANCEL` thành `ACTIVE`: **cần mail phê duyệt của COO**.
Tech không tự xử lý.

# Cách phản hồi ticket SVK

Trả lời Ops bằng **2–3 dòng**. Ops cần biết phải làm gì tiếp, không cần đọc lại
quá trình điều tra.

## Công thức

```
<product_id> bước cuối là <bước cuối>. Ops đang dừng ở <bước Ops báo>.
Bổ sung <bằng chứng cụ thể> → duyệt ngay.
```

Ví dụ (SVK-11763):

> `CAKE_payday` bước cuối là **giải ngân vào CASA**. Ảnh mới có tab Loan Drawdown.
> Ops bổ sung ảnh tab **CASA 1105181238** có dòng `+5.000.000` lúc 30/09 00:40:57 → duyệt ngay.

Khi đã đủ điều kiện thì còn ngắn hơn:

> Đã xác nhận tới bước cuối (CASA). Duyệt Cake Task **Lending Force Status Loan**,
> `loan_id 17959045` · `status DISBURSE`.

## Ba quy tắc

| | |
|---|---|
| **Nêu số, đừng nêu lý luận** | "ảnh tab CASA `1105181238` có dòng `+5.000.000` lúc 00:40:57" — không phải "cần xác nhận tiền đã vào CASA" |
| **Một yêu cầu một lần** | Thiếu ba thứ thì liệt kê ba gạch đầu dòng, đừng hỏi rải qua nhiều comment |
| **Nói rõ điều gì xảy ra sau đó** | *"→ duyệt ngay"* để Ops biết đây là bước cuối, không phải thêm một vòng hỏi đáp |

## Những thứ **không** đưa vào comment

- Quá trình điều tra, đối chiếu ticket cũ, giải mã cột dữ liệu — để trong KB
- Phỏng đoán nguyên nhân gốc khi chưa chắc
- Nhắc lại thông tin Ops vừa gửi

Nguyên nhân gốc chỉ nhắc khi **đổi việc Ops phải làm**. Ví dụ *"thuộc đợt lỗi
thứ Ba–thứ Tư đã fix"* thì đáng nói, vì Ops biết không cần gom thêm ca nữa.

---

# Cake Task — công cụ Ops tác động hàng loạt

Cơ chế **maker / checker**: maker upload CSV, checker duyệt, hệ thống xử lý toàn bộ file.
**Hai người cùng chịu trách nhiệm** — phải kiểm tra kỹ từng dòng.

Xin quyền: `internal.support.cake.vn/servicedesk/customer/portal/1/create/1555`

> Sửa file template bằng **Notepad / VSCode**, **không dùng Excel**.
> Không điền Schedule time.

| Task | Dùng để |
|---|---|
| **Lending Force Status Loan** | Cập nhật status LMS khoản vay thành giải ngân |
| **Lending Send Status Loan** | Gửi lại trạng thái khoản vay sang đối tác |
| **Lending Manual Collection** | Thu hồi nợ thủ công |
| **Lending Adjustment Ice** | Điều chỉnh trên ICE (dành cho Recon) |
| Lending Cancel Loan | Huỷ khoản vay sau approve, đã lên portal, **chưa giải ngân** |
| Lending Force Close Loan | Huỷ khoản vay **sau khi đã giải ngân** |
| Lending Cancel Installment | Huỷ khoản trả góp |
| Lending Dop Reset Onboarding | Huỷ khoản vay trên DOP, **chưa vào LOS** |
| Lending Change Paylater Limit | Đổi hạn mức Paylater (dành cho Risk) |
| Lending Export Statement · Export E-Contract | Xuất sao kê · xuất hợp đồng có chữ ký số |

---

# Bộ API đối tác

Nguồn: `code/lending_manage/open_api_viewer/specs/` — `base2/base_dop.yaml`, `base2/base_native.yaml`.

| Nhóm | Endpoint |
|---|---|
| Onboarding (DOP) | `generate-webview/onboarding` · `generate-webview/loan-detail` |
| Onboarding (Native) | `data-config` · `check-profile` · `client-create` · `client-update` · `loan-register` · `get-onboarding-status` |
| Ký hợp đồng | `get-esign` · `get-otp` · `verify-esign` · `contract-cancel` |
| **Giải ngân** | **`disburse-update`** — đối tác báo kết quả giải ngân về Cake, sau khi nhận `partner-disburse-request` |
| Thanh toán khoản vay | `repayment-van` (tạo QR) · `repayment-request` · `repayment-confirm` · `repayment-status` |
| Tất toán | `terminate-review` · `terminate-request` · `terminate-confirm` · `terminate-van` |
| Thanh toán dịch vụ (Paylater) | `payment-request` · `payment-confirm` · `payment-status` · `payment-revert` |
| Trả góp | `get-installment-offers` · `get-installment-detail` |
| Xác thực | `challenge-get-otp` · `challenge-verify-otp` · `challenge-facematch` |

Mọi API đối tác đều cần header `Partner` và `Signature`.

---

# Lỗi onboarding hay gặp

| Màn hình | Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|---|
| Mọi màn hình | Bấm nút xong hiện **màn hình trắng xoá** | Timeout | Bảo khách đợi rồi thử lại. Gửi ticket Tech kiểm tra timeout |
| Nhập OTP | Nhập sai OTP, báo đợi | Rule: tối đa **6 OTP sai / 24h**; cứ **3 lần sai → block 15 phút**; OTP hiệu lực **2 phút** | Theo rule. Báo khách đợi 15 phút hoặc hôm sau |
| Nhập OTP | Không nhận được OTP | Hệ thống chưa gửi, hoặc nhà mạng lỗi | Kiểm tra dashboard OTP |
| Quét khuôn mặt | Quét mãi không được | SDK eKYC không nhận diện | Bảo khách đợi tới khi màn hình **nền xanh đỏ**, đưa điện thoại từ gần ra xa dần, viền ngoài của tóc nằm trong khung đỏ |
| Chụp GTTT mặt trước | "Có lỗi xảy ra" | `detect_id_card_tampering` — **CCCD hết hạn** | Báo khách đổi CCCD mới |
| Chụp GTTT mặt trước | Lỗi sau khi submit | `invalid_parameter_exception` — **chưa thêm app-id cho sản phẩm mới** | Tech bổ sung app-id |
| Đăng ký nhu cầu | "Hồ sơ không được duyệt" | Hồ sơ **No KYC** → auto reject | Ops KYC reset để khách làm lại |
| Kiểm tra khoản vay | **[VDS payday]** báo không đủ điều kiện, portal báo `CANCEL` | **Khách chưa chọn bảo hiểm** — VDS payday huỷ khoản vay nếu không mua bảo hiểm | Hướng dẫn khách chọn bảo hiểm |
| LOS check | Loading liên tục không dừng | **OD**: khách chưa chọn sổ TD, hoặc sổ không đủ điều kiện. **Sản phẩm khác**: LOS duyệt có thể mất tới **10 phút** | Quá 10 phút chưa được thì báo |
| Mở khoản vay | Lỗi/màn hình trắng/`no Route matched` | Lỗi thông tin eKYC: trường "Tình trạng hôn nhân" trống · trường địa chỉ có **dấu xuống dòng** · đăng ký khuôn mặt không thành công | Ops Lending kiểm tra trước, sau đó Ops KYC |

**Rule OTP khi mở tài khoản Cake** (hay gặp với MWG): 3 SMS OTP/giờ · 20 SMS OTP/30 ngày.
Cần OTP khi: đăng nhập lần đầu · đổi thiết bị · sau NFC để ký mở TKTT.

> **OTP trên DOP webview, đăng nhập app Cake, và ký hợp đồng là ba luồng hoàn toàn độc lập.**
