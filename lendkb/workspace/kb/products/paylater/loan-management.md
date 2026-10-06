---
title: Quản lý hạn mức — Paylater
product: paylater
topic: loan-management
audience: [ops, po]
sources:
  - confluence:263782609
  - confluence:190611564
  - jira:PL-12553
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Quản lý hạn mức — Paylater

## 1. Thanh toán theo sao kê

Mỗi kỳ khách chọn:

- **Tối thiểu** — 30% dư nợ sao kê ở hầu hết sản phẩm, riêng `FPT_paylater` là **15%**
- **Toàn bộ** — tổng dư nợ sao kê

| Sản phẩm | Mức tối thiểu |
|---|---|
| `VNP_paylater` | 30% × (gốc + lãi + phí sử dụng hạn mức) |
| `BE_paylater` | 30% × dư nợ gốc + lãi phát sinh |
| `MWG_paylater` | 30% × dư nợ gốc + lãi phát sinh |
| `VDS_paylater` | 30% × dư nợ gốc + lãi phát sinh |
| **`FPT_paylater`** | **15%** × dư nợ gốc + lãi phát sinh |

**Trả tối thiểu không phải trả hết.** Phần còn lại tiếp tục sinh lãi và phí.

## 2. Phí và phạt

| Khoản | `VNP_paylater` | `BE_paylater` |
|---|---|---|
| Phí phạt chậm thanh toán | 50.000đ | 50.000đ |
| | *`MWG_paylater`: 50.000đ tại **mỗi** mốc DPD 1, 5, 10, 15* | |
| Lãi phạt dư nợ chậm | 100% × lãi suất trong hạn | 100% × lãi suất × dư nợ × số ngày |
| Lãi phạt lãi quá hạn | — | 100% × lãi suất × lãi quá hạn × số ngày (tối đa 10%) — **chưa áp dụng** |
| Phí sử dụng hạn mức | 30.000đ (giai đoạn 1 miễn phí) | — |
| Phí quản lý hạn mức/tháng | Không áp dụng | **36.000đ** |

> ⚠️ **Lãi phạt lãi chậm: có trong chính sách nhưng CORE CHƯA HỖ TRỢ — khách không bị thu.**
> Áp dụng cho **toàn bộ sản phẩm lending**, không riêng sản phẩm này.
> API `get-loan-detail` của 19 ticket đều trả `penalty_interest_balance = 0đ (chưa triển khai)`.
> Xác nhận bởi PO 2026-10-01.
>
> **Agent không được nói với khách là sẽ bị phạt lãi chậm.** Chỉ có **phạt gốc chậm** thực sự thu.

Lãi tính từ **ngày ghi nhận giao dịch thành công**, không phải ngày sao kê.

## 3. Rút tiền mặt từ hạn mức

Áp dụng `VDS_paylater` (và các sản phẩm có bật tính năng):

| Giới hạn | Giá trị |
|---|---|
| Mỗi giao dịch | 150.000đ – 5.000.000đ |
| Tổng mỗi tháng | 100 triệu (Thông tư 18) |
| Kỳ hạn trả góp | 1 – 12 tháng, không vượt số tháng còn lại hợp đồng |

## 4. Tất toán trước hạn

Được phép ở mọi sản phẩm Paylater đã có dữ liệu. `VNP_paylater` **không mất phí**.

## 5. Trạng thái khoá hạn mức

| Trạng thái | Nguyên nhân |
|---|---|
| `TEMP_LOCK` | Khoá tạm thời, do quá hạn |
| **`TEMP_LOCK_FRAUD`** | Khoá tạm thời do **nghi ngờ gian lận** — riêng nhóm Paylater |
| `PERM_LOCK` | Khoá vĩnh viễn |

> **`TEMP_LOCK_FRAUD` chỉ có ở Paylater.** Cashloan và Payday không có trạng thái này.
>
> **Tuyệt đối không nói với khách là nghi ngờ gian lận**, và không gợi ý nguyên nhân khoá.
> Khách hỏi vì sao bị khoá → *"Khoản vay đang tạm khoá, em chuyển bộ phận phụ trách kiểm tra giúp anh/chị"* → **escalate ngay**.
>
> Khách vẫn **thanh toán được** khi bị khoá — khoá chặn chi tiêu mới, không chặn trả nợ.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- **Khiếu nại số 1**: "trả tối thiểu rồi mà vẫn bị tính lãi". Chuẩn bị sẵn cách giải thích.
- **Khiếu nại số 2**: phí quản lý hạn mức `BE_paylater` 36.000đ thu cả khi khách đã trả hết, miễn là có chi tiêu trong 30 ngày trước ngày sao kê.
- Lỗi rút tiền hay gặp: "vượt quá hạn mức" (quá hạn mức khả dụng hoặc quá 100 triệu/tháng) và "ngoài phạm vi cho phép" (dưới 150k hoặc trên 5 triệu).
- Paylater **không có** trường phạt gốc/lãi quá hạn qua API như Cashloan/Payday.

## Dành cho CSKH

🟢 `khách`

- Giải thích rõ trả tối thiểu vs toàn bộ, và hệ quả của việc chỉ trả tối thiểu.
- Giải thích các loại phí có trong hợp đồng của khách.
- Giải thích thông báo lỗi khi rút tiền.

**Không đọc cho khách:**

- Thoả thuận phân chia phí giữa Cake và đối tác.
- Mã nhóm sản phẩm, ngưỡng điểm.
- Tên thông tư, quy định nội bộ.
