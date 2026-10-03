---
title: Thanh toán nợ qua VAN — dùng chung mọi sản phẩm
audience: [ops, po]
nhom: 2
sources:
  - "PO xác nhận 2026-10-02"
  - confluence:1781858305
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Thanh toán nợ qua VAN

**Luồng dùng chung cho tất cả sản phẩm**, không riêng MWG Paylater.
GL trung gian `3592170000` cũng dùng chung. (PO xác nhận 2026-10-02.)

Khách quét mã VAN để trả nợ. Tiền đi qua **Liab** trước khi tới Lending.

## Luồng 5 bước

| Bước | Hệ thống | Việc |
|---|---|---|
| 1 | — | Khách **quét mã VAN** để thanh toán nợ |
| 2 | **Liab** | Tiền đi qua cổng Liab |
| 3 | **Liab** | Ghi vào GL **Napas / VPBank / Cake** |
| 4 | **Liab** | Từ GL đó ghi sang **GL trung gian `3592170000`** |
| 5 | **Liab → Lending** | Liab **trigger Lending**. Lending lấy tiền từ GL `3592170000` để **gạch nợ** khoản vay |

GL `3592170000` = *Account Receivable - Settlement - VAN*. Đây là **GL trung gian**,
nơi bàn giao giữa Liab và Lending.

## Lỗi điển hình — debit trước khi có tiền vào

**Dấu hiệu**: GL `3592170000` có bút toán **debit** để gạch nợ, nhưng **chưa có bút toán
credit** đưa tiền vào GL đó.

**Nguyên nhân**: Lending đã nhận trigger nên thực hiện gạch nợ và rút tiền từ GL trung gian,
nhưng **Liab chưa đi tiền vào GL đó** (bước 4 chưa xong hoặc lỗi).

**Hướng xử lý**: **chuyển Liab kiểm tra.** Không phải lỗi Lending — Lending chạy đúng
theo trigger nhận được.

### Cách nhận biết nhanh

| Quan sát | Kết luận |
|---|---|
| GL `3592170000` có debit, **không có credit** tương ứng | Bước 4 lỗi → **Liab** |
| GL `3592170000` có đủ credit rồi debit, nhưng khoản vay chưa gạch nợ | Bước 5 lỗi → **Lending** |
| Khách báo đã trừ tiền ở đối tác nhưng chưa gạch nợ | Kiểm tra đối tác đã gọi đủ `repayment-request` + `repayment-confirm` chưa — xem `ma-loi-api.md` |

## Ví dụ thật — 2026-09-30

| Trường | Giá trị |
|---|---|
| Entry ID | `1314621773` |
| Transaction ID | `606AEM97IZ552` |
| GL | `3592170000` — Account Receivable - Settlement - VAN |
| Debit | 415.833đ |
| Tài khoản khoản vay | `CAKEPL215310557348608` |

Debit đã ghi để gạch nợ, nhưng tiền chưa vào GL. → Chuyển Liab.

## Quy ước tiền tố mã tài khoản khoản vay

| Tiền tố | Sản phẩm |
|---|---|
| `CAKEPL…` | Paylater |
| `CAKEPD…` | Payday |
| `CAKECL…` | Cashloan |

Tiếp theo là mã đối tác: `CAKECLVIETTEL…`, `CAKECLZLP…`, `CAKECLVNP…`, `CAKEPDVIETTEL…`.
Mã không có phần đối tác (`CAKEPD…`, `CAKEPL…`) là sản phẩm của chính Cake hoặc
kênh dùng chung — xác định bằng `loan_id` trên Portal.

## Lưu ý

Luồng này **đi qua hai đội**: tiền là việc của Liab tới hết bước 4, Lending chỉ vào từ
bước 5. Khi ticket nói "đã trừ tiền mà chưa gạch nợ", việc đầu tiên là xác định
**tiền đang nằm ở đâu trong 5 bước**, rồi mới quy trách nhiệm đội nào.
