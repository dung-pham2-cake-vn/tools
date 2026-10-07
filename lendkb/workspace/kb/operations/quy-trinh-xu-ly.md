---
title: Quy trình xử lý ticket vận hành
audience:
  - ops
  - po
nhom: 2
sources:
  - "file: Troubleshoot Lending Ops.xls"
  - "file: code/lending_manage/open_api_viewer/specs/"
  - confluence:1084555273
last_verified: 2026-10-05T00:00:00.000Z
owner: dung.pham2
status: draft
---
# Quy trình xử lý ticket vận hành

Nguồn: file **Troubleshoot Lending Ops.xls** — 15 tab. Parse bằng `tools/parse-troubleshoot.py`,
sinh tài liệu bằng `tools/gen-ops-docs.py`, chạy lại được khi file nguồn cập nhật.

| Tab | Đã đưa vào |
| --- | --- |
| Quy trình · PIC | file này |
| Onb-DOP · Onb-Cake · Onb-API | file này, mục "Lỗi onboarding hay gặp" |
| Giải ngân | [[kb/operations/luong-giai-ngan]] |
| APIs sau vay · Payment | [[kb/operations/ma-loi-api]] |
| Quy trình sau vay · Recon | [[kb/operations/quy-trinh-sau-vay]] |
| Cake task | file này, mục "Cake Task" |
| PO only · Dashboard cần bổ sung · Request tools | **không đưa vào** — việc của PO, không dùng để xử lý ticket |

## Thứ tự leo thang — 5 bước

| Bước | Ai | Làm gì |
| --- | --- | --- |
| 1 | **Ops** | Tự check bằng tool sẵn có + tra file `Troubleshoot Lending.xlsx` |
| 2 | **Ops** | Troubleshoot note ghi "gửi Tech" → chuyển ticket sang Tech |
| 3 | **Ops** | Troubleshoot **không có** thông tin về case → gửi **Product** verify (theo tab PIC) |
| 4 | **Product** | Verify không được → comment chuyển sang **Tech** |
| 5 | **Tech** | Case xong, nếu đáng làm mẫu → cập nhật lại file troubleshoot |

**Nguyên tắc: tra troubleshoot trước, không đoán.** Case chưa có trong file thì đi qua
Product chứ không nhảy thẳng sang Tech.

## Ai phụ trách sản phẩm nào

| PIC | Sản phẩm |
| --- | --- |
| Phan Thị Thanh Duyên | OD (+TD) · Cake Cashloan · Cake Payday |
| Nguyễn Vũ Minh Định | MWG Paylater · ZLP Cashloan · ZLP Payday · VDS Paylater |
| Nguyễn Thanh Lâm | VDS Cashloan (+Payroll) · VDS Payday (+Payroll) · VDS O2O · MWG Cashloan |
| Cấn Thị Kim Tuyến | Vnpost Cashloan |
| Lê Chí Cường | Be Cashloan · Be Paylater · VNPay Cashloan · VNPay Paylater · VNPay Payday · FPT Paylater |

Tech: **Phạm Tiến Dũng** (chịu trách nhiệm case vận hành Lending) · Võ Tuấn Nghĩa (hỗ trợ) ·
Đỗ Phương Chi (eKYC) · Võ Trần Đăng Khoa (hỗ trợ eKYC).

---

# Luồng giải ngân

Đã chuyển sang [[kb/operations/luong-giai-ngan]] — 5 nhóm sản phẩm, các bước 1A–3C theo
từng nhóm, Ops làm gì khi kẹt ở từng bước, mã lỗi workflow.

---

# Cách phản hồi ticket SVK

Trả lời Ops bằng **2–3 dòng**. Ops cần biết phải làm gì tiếp, không cần đọc lại
quá trình điều tra.

**Người trả lời (AI hoặc người tra KB) không duyệt thay PO.** Chỉ kết luận đủ hay thiếu
thông tin, và Ops làm gì tiếp. Duyệt Cake Task là việc của PO.

## Công thức

```
<product_id> bước cuối là <bước cuối>. Ops đang dừng ở <bước Ops báo>.
Bổ sung <bằng chứng cụ thể> → đủ điều kiện tạo Cake Task.
```

Ví dụ (SVK-11763):

> `CAKE_payday` bước cuối là **giải ngân vào CASA**. Ảnh mới có tab Loan Drawdown.
> Ops bổ sung ảnh tab **CASA 1105181238** có dòng `+5.000.000` lúc 30/09 00:40:57 → đủ điều kiện tạo Cake Task.

Khi đã đủ điều kiện thì còn ngắn hơn:

> Đủ bằng chứng tới bước cuối (CASA). Ops tạo Cake Task **Lending Force Status Loan**
> (`status DISBURSE`), báo PO duyệt.

## Ba quy tắc



| **Nêu số, đừng nêu lý luận** | "ảnh tab CASA `1105181238` có dòng `+5.000.000` lúc 00:40:57" — không phải "cần xác nhận tiền đã vào CASA" |
| **Một yêu cầu một lần** | Thiếu ba thứ thì liệt kê ba gạch đầu dòng, đừng hỏi rải qua nhiều comment |
| **Nói rõ điều gì xảy ra sau đó** | *"→ đủ điều kiện tạo Cake Task"* để Ops biết đây là bước cuối, không phải thêm một vòng hỏi đáp |

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
| --- | --- |
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
| --- | --- |
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
| --- | --- | --- | --- |
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
