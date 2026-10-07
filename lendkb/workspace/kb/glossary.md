---
title: Thuật ngữ Lending
sources:
  - confluence:198148097
  - confluence:1084555273
  - confluence:1120959
  - confluence:14155933
  - confluence:27918827
  - confluence:1042743307
last_verified: 2026-09-30
audience: [ops, po]
owner: dung.pham2
status: draft
---

# Thuật ngữ

## Sản phẩm & kênh

| Thuật ngữ | Nghĩa | Nói với khách thế nào |
|---|---|---|
| **Cashloan** | Vay tiền mặt trả góp theo tháng, kỳ hạn dài | "khoản vay tiền mặt" |
| **Payday** | Vay ngắn ngày, thường trả một lần | "khoản vay ngắn ngày" |
| **Paylater** | Mua trước trả sau, có hạn mức quay vòng | "ví trả sau" |
| **OD / Overdraft** | Thấu chi — được tiêu vượt số dư trong hạn mức | "thấu chi" |
| **OD Secured / OD TD** | Thấu chi có tài sản bảo đảm là sổ tiết kiệm | "thấu chi có bảo đảm" |
| **DOP** | Webview do Cake làm, nhúng vào app đối tác | Không dùng từ này với khách |
| **Native API** | Đối tác tự làm app, gọi API Cake | Không dùng từ này với khách |
| **Cake app** | Khách thao tác trên app Cake | "app Cake" |

## Tiền & kỳ hạn

| Thuật ngữ | Nghĩa |
|---|---|
| **Dư nợ gốc** (principal outstanding) | Phần tiền vay chưa trả, chưa tính lãi |
| **Lãi trong hạn** | Lãi phát sinh khi khoản vay còn đúng hạn |
| **Lãi quá hạn / phạt** | Phát sinh thêm khi trả chậm. Có hai loại: phạt trên gốc chậm và phạt trên lãi chậm |
| **Tenor** | Kỳ hạn khoản vay, tính bằng tháng |
| **Due date** | Ngày đến hạn thanh toán hàng tháng |
| **First due date** | Ngày thanh toán đầu tiên sau khi giải ngân |
| **Tất toán trước hạn** | Trả hết toàn bộ khoản vay trước ngày đáo hạn |
| **Phí tất toán sớm** | Phí tính khi tất toán trước hạn |
| **PMT** | Công thức tính số tiền gốc + lãi cố định hàng tháng |

## Trạng thái & rủi ro

| Thuật ngữ | Nghĩa | Nói với khách thế nào |
|---|---|---|
| **DPD** (Days Past Due) | Số ngày quá hạn | "số ngày trả chậm" |
| **Active** | Khoản vay đang trong hạn | "khoản vay đang hoạt động" |
| **In Arrears** | Khoản vay đang quá hạn | "khoản vay đang quá hạn" |
| **Closed** | Đã tất toán xong | "đã tất toán" |
| **Temp lock** | Khoá tạm thời, do quá hạn | Không giải thích lý do khoá — escalate |
| **Temp lock fraud** | Khoá tạm thời do **nghi ngờ gian lận** — riêng nhóm Paylater | **Tuyệt đối không nhắc tới gian lận.** Escalate ngay |
| **Perm lock** | Khoá vĩnh viễn | Không giải thích lý do khoá — escalate |
| **Write-off** | Xoá nợ khỏi sổ sách kế toán của ngân hàng | Trên app khách thấy nhãn **"Thu hồi nợ"**. Dùng đúng nhãn đó, **không** giải thích cơ chế kế toán, **không** nói khách hết nợ |

## Hệ thống nội bộ — KHÔNG nhắc với khách

| Thuật ngữ | Nghĩa |
|---|---|
| **LOS** | Loan Origination System — hệ thống thẩm định và duyệt vay |
| **LMS** | Loan Management System — hệ thống quản lý khoản vay sau giải ngân |
| **Mambu / ICE** | Hệ thống core banking. Cake chuyển dần từ Mambu sang ICE |
| **ACS** | Automatic Collection System — hệ thống tự động thu nợ |
| **CASA** | Tài khoản thanh toán của khách tại Cake |
| **VAN** | Mã/tài khoản ảo để khách quét trả nợ. Tiền đi qua Liab rồi mới tới Lending — xem [[kb/operations/luong-van]] |
| **Liab** | Đội/hệ thống phụ trách tiền vào ra trước khi tới Lending |
| **TKĐBTT** | Tài khoản đảm bảo thanh toán của đối tác tại Cake — bước đi tiền cuối của sản phẩm giải ngân về ví đối tác |
| **Tài khoản phải trả của đối tác** | Bước đi tiền cuối của 4 sản phẩm Viettel (`Viettel_Cashloan`, `VT_Cashloan_S`, `PD_Viettel`, `VT_Payday_S`) thay cho TKĐBTT — xem [[kb/operations/luong-giai-ngan]] |
| **ETB** | Existing To Bank — khách đã có quan hệ với ngân hàng |
| **NFC** | Xác thực bằng chip căn cước |
| **eKYC** | Định danh điện tử |
| **PCB** | Trung tâm thông tin tín dụng (kiểm tra lịch sử nợ) |
| **Segment / Product code** | Phân nhóm khách để quyết hạn mức và lãi suất (vd `CAKEM01`) |
| **TT06** | Thông tư 06 — quy định thứ tự thu nợ với khoản quá hạn |
| **OPES** | Đối tác bảo hiểm khoản vay |

## Hai quy tắc dùng chung toàn lending

**Lãi phạt lãi chậm — chưa triển khai.** Có trong chính sách của nhiều sản phẩm, nhưng
core banking chưa hỗ trợ nên **khách không bị thu**. API luôn trả `penalty_interest_balance = 0đ`.
Chỉ **phạt gốc chậm** là thực sự thu. Không nói với khách là sẽ bị phạt lãi chậm.

**Lịch ngày lễ dời due date** — dùng chung toàn lending, cập nhật linh động đầu mỗi năm.
Không tra ngày đến hạn từ KB, luôn lấy từ hệ thống.

## Lưu ý cho agent

- **Write-off** là thuật ngữ kế toán nội bộ. Trên app Cake khách **nhìn thấy nhãn "Thu hồi nợ"** (màu đỏ) nên có thể hỏi. Trả lời trong phạm vi: khoản nợ đang được thu hồi, **khách vẫn còn nghĩa vụ trả nợ đầy đủ**. Tuyệt đối không nói "đã xoá nợ", không giải thích cơ chế kế toán. Khách hỏi sâu hơn → escalate.
- **Segment / product code** quyết định hạn mức và lãi suất. Không tiết lộ khách thuộc nhóm nào, cũng không giải thích tiêu chí phân nhóm.
- **PCB** — không nói với khách là "hồ sơ bị từ chối do lịch sử tín dụng xấu". Lý do từ chối không được tiết lộ.

## Thông tin KHÔNG được nói với khách

- Tên hệ thống nội bộ: Mambu, ICE, LOS, LMS, ACS, Portal.
- Khách thuộc segment nào, product code nào, có nằm trong whitelist hay không.
- Tiêu chí chấm điểm, tiêu chí từ chối hồ sơ.
- Trạng thái write-off của khoản vay.
