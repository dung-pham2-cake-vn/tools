---
title: Quy trình sau vay — thanh toán, quét nợ, tất toán
audience: [ops, po]
nhom: 2
sources:
  - "file: Troubleshoot Lending Ops.xls — tab Quy trình sau vay, Recon"
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Quy trình sau vay

| Bước | Nghiệp vụ | Lỗi phát sinh | Nguyên nhân | Hướng xử lý |
|---|---|---|---|---|
| Sao kê | Email |  |  |  |
|  |  | Không nhận được sao kê | 1/ Chưa có email · 2/ Đã có email | 1/ KH cập nhật lại email trên Portal, khoản vay sau mới gửi mail, khoản vay hiện tại k cập nhật nữa · 2/ KH đăng ký vay bằng 1 email khác với email trên Portal |
| Repayment |  |  |  |  |
|  | Thanh toán |  |  |  |
|  |  | Cần phân biệt auto collection hay KH chủ động thanh toán | Cần gửi tech kiểm tra, kể cả mambu channel là autoCollection vẫn có thể KH tự thanh toán | Tech kiểm tra WF, nếu Identity · @cake-loan-management là KH chủ động thanh toán · @cake-collection là auto collection |
|  |  | KH đã thanh toán, Recon có ghi nhận bút toán gốc lãi, nhưng ICE chưa ghi nhận gạch nợ | 1/ Kiểm tra có cùng 1 khoản vay không | 1/ KH thanh toán khoản vay A, recon check khoản vay B |
|  | Quét nợ |  |  |  |
|  |  | KH đang có tiền trong Prepayment nhưng không quét nợ được | 1/ KH đang bị block fund, số tiền lock là số âm, số tiền casa+cashback+prepayment = số âm, không thể quét nợ | 1/ Gỡ block fund · Tech: nghiên cứu thêm SVK-9443 |
|  |  | KH có tiền trong Casa nhưng không quét nợ được | 1/ KH bị lock fund, available balance = 0đ |  |
| Terminate |  |  |  |  |
|  | OD-TD |  |  |  |
|  |  | Có sổ TD nhưng không tất toán được | KH đang bị lock vì quá hạn, rule hiện tại của sp | Rule hiện tại |

## Đối soát (Recon)

| Bước | Công cụ | Lỗi phát sinh | Recon kiểm tra | Nguyên nhân | Hướng xử lý |
|---|---|---|---|---|---|
| Repayment |  |  |  |  |  |
|  | Mô tả công cụ |  |  |  |  |
|  |  | Superset = kết quả trả ra cho đối tác · BI/Mambu = ghi nhận tiền ở hệ thống · Recon check trên Core + chấm GL để kiểm tra kết quả cuối cùng |  |  | Đoạn chat hướng dẫn |
|  | Superset "[RECON] Check DOP lending" |  |  |  |  |
|  |  | Message nhận được không phải "Thành công" | Kiểm tra mambu và dash khác | Đây là trạng thái chưa xác định đã được gạch nợ hay chưa |  |

## Phân biệt khách tự trả hay hệ thống tự thu

Mambu ghi channel `autoCollection` **vẫn có thể là khách tự thanh toán**. Phải xem Identity trong workflow:

| Identity | Nghĩa |
|---|---|
| `@cake-loan-management` | **Khách chủ động** thanh toán |
| `@cake-collection` | **Hệ thống tự thu** |

Cần Tech kiểm tra workflow, Ops không tự tra được.

