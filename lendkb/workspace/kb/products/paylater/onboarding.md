---
title: Mở hạn mức — Paylater
product: paylater
topic: onboarding
audience: [ops, po]
sources:
  - confluence:1042743307
  - confluence:185171988
last_verified: 2026-10-01
owner: dung.pham2
status: draft
numbers_source: none
needs_jira_verify: true
---

# Mở hạn mức — Paylater

## 1. Khác onboarding Cashloan / Payday

Khách **mở hạn mức**, không phải vay một khoản. Màn ký hợp đồng hiển thị
**"Tổng hạn mức được cấp"** thay vì "Tổng số tiền giải ngân", và **không hiển thị lãi suất**
như Cashloan.

Kỳ hạn hợp đồng hạn mức là **60 tháng** ở mọi sản phẩm Paylater.

## 2. Hạn mức theo sản phẩm

| Sản phẩm | Hạn mức | Lãi suất |
|---|---|---|
| `VNP_paylater` | 1 – 35 triệu | 39%/năm |
| `BE_paylater` (`PLBE_01`) | 1 triệu | 0% |
| `BE_paylater` (`PLBE_02`) | 1 – 5 triệu | 40%/năm |
| `VDS_paylater_epass` | — | 0% |
| `FPT_paylater` | — | 0% |
| `MWG_paylater` | tới 60 triệu (nhóm có điểm đối tác) | — |
| `VDS_paylater` | — | — |

## 3. Điều kiện

- `FPT_paylater`: tuổi **18 – 55**
- Các sản phẩm khác: theo điều kiện chung, xem [[kb/reject-messages]]

## Ghi chú vận hành — Ops

🟡 `nội bộ`

- Khách hay nhầm "được cấp hạn mức 5 triệu" thành "được giải ngân 5 triệu". Giải thích rõ: hạn mức là mức tối đa được tiêu, chưa phải tiền đã nhận.
- Hợp đồng ghi kỳ hạn 60 tháng — khách tưởng phải trả nợ trong 60 tháng. Đó là thời hạn **hiệu lực hạn mức**, không phải kỳ hạn khoản nợ.

## Dành cho CSKH

🟢 `khách`

- Giải thích được hạn mức khác khoản vay.
- Giải thích được 60 tháng là thời hạn hiệu lực hạn mức.

**Không đọc cho khách:** mã nhóm sản phẩm, tiêu chí phân nhóm, điểm rủi ro.
