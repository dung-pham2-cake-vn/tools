---
title: Cashloan — VDS (Viettel Money) (VT_Cashloan_S)
product: cashloan
partner: vds
channel: api
topic: overview
product_status: active
audience: [ops, po]
sources:
  - jira:PL-9170
  - jira:PL-5240
  - confluence:15368221
  - confluence:27918827
last_verified: 2026-09-30
numbers_asof: 2026-10-01
owner: dung.pham2
status: draft
coverage: partial
numbers_source: jira
needs_jira_verify: false
---

# VDS (Viettel Money) — VT_Cashloan_S

> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới 2024-07-31.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.

## 1. Nhận diện sản phẩm

| Trường | Giá trị |
|---|---|
| Đối tác | VDS (Viettel Money) |
| Loại sản phẩm | cashloan |
| ProductId | `VT_Cashloan_S` |
| Onboarding source | `vt_cashloan_payroll` |
| Contract type | `VIETTEL_CASHLOAN_PAYROLL` |
| Kênh | api |
| NFC khi đăng ký | Optional |
| NFC khi ký hợp đồng | None |
| Giải ngân về | partner |
| Ký hợp đồng trên app Cake | No |
| Trạng thái sản phẩm | **active** |

## 2. Số liệu — đã xác minh Jira

Sản phẩm **vay trên lương** — lãi thấp hơn hẳn Cashloan thường.

| Chỉ tiêu | Giá trị |
|---|---|
| Product code | `VTCSN01` · `VTCSR01` · `VTCON01` · `VTCOR01` (Viettel cung cấp) |
| Hạn mức | **10 – 70 triệu** |
| Kỳ hạn | **6 – 36 tháng** |
| Lãi suất | **25% – 39%/năm** — thấp nhất nhóm cashloan Viettel |
| Phí bảo hiểm | **5%** (thấp hơn mức 7% thường thấy) |
| Phạt gốc chậm | 150% × lãi suất × nợ gốc × số ngày chậm ÷ 365 |
| Phí tất toán trước hạn | **8%** nếu tất toán **trước** due date kỳ 3 · **5%** từ kỳ 3 trở đi |
> **Phí tất toán 8%/5%** — xác nhận bởi PO 2026-10-02.
> [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) (live 2025-07-28).
> Trang Product Policy ghi 3% là **ảnh chụp cũ**, trước 2025-05.
>
> Cơ sở tính: **dư nợ gốc chưa đến hạn** (`prin_not_d`), không phải toàn bộ dư nợ.

> **Lãi 25–39% so với 43–60% của `Viettel_Cashloan` thường.** Khách có thể so sánh và
> thắc mắc — khác nhau vì đây là sản phẩm vay trên lương, điều kiện khác hẳn.

Trang nguồn ghi thẳng: *"Late payment (Penalty Interest) — HIỆN TẠI MAMBU chưa support"*,
khớp với xác nhận của PO rằng phạt lãi chưa triển khai toàn lending.

> ⚠️ **Lãi phạt lãi chậm: core chưa hỗ trợ — khách không bị thu.** Áp dụng toàn lending.

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Xác nhận đúng sản phẩm qua onboarding source hoặc contract type trước khi trả lời.
- **Không áp số liệu của sản phẩm khác sang đây.** Cùng loại sản phẩm nhưng khác đối tác thì hạn mức, lãi suất, phí đều khác.
- Đọc [[kb/products/cashloan/overview]] và [[kb/channels/native-api]] trước file này.

*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*

## Dành cho CSKH

🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.

**Không đọc cho khách:**

- Phân nhóm khách, product code, whitelist.
- Tiêu chí chấm điểm, lý do từ chối hồ sơ.
- Tên hệ thống nội bộ, tên toggle, quy tắc sinh mã tài khoản.
