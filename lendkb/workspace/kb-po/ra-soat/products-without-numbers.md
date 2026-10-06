---
title: Cần rà tiếp
last_verified: 2026-09-30
audience: [po]
owner: dung.pham2
status: open
---

# Không còn sản phẩm nào thiếu số

Cả 30 sản phẩm đối tác đã có số liệu. Nhưng **10 file lấy số từ Confluence**,
chưa đối chiếu Jira — số có thể đã cũ.

| ProductId | Nguồn | Rủi ro cụ thể |
|---|---|---|
| `MISA_cashloan` | conf 1108410369 | 17 tài liệu policy, chưa rà ticket |
| `ZLP_payday` | conf 838533123 | 34 tài liệu policy |
| `VT_Payday_S` | conf 986873857 | 25 tài liệu policy |
| `VNP_paylater` | conf 263782609 | 63 tài liệu policy — nhiều nhất nhóm này |
| `BE_paylater` | conf 190611564 | 89 tài liệu policy — trang nguồn từ 2024 |
| `VPO_cashloan` | conf 369688578 | 36 tài liệu policy |
| `MWG_cl_online` | conf 1587740860 | 14 tài liệu policy |
| `VNHUB_cashloan` | conf 1148878850 | 10 tài liệu policy |

## Vì sao phải rà

Đã có tiền lệ: Confluence ghi phí tất toán Cake Cashloan là **3%**, thực tế từ 2025-07-28
là **8% / 5%** ([PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170)).
Lệch gấp gần 3 lần. Các file `numbers_source: confluence` đang mang đúng rủi ro đó.

## Cách rà

1. `tools/scan/doc-index.csv`, lọc `products` chứa product_id và `src=jira`.
2. Đọc ticket Released mới hơn ngày `numbers_asof` trong file KB.
3. Lệch thì lấy Jira, ghi lại cả hai kèm ngày.
4. Đổi `numbers_source: jira`, `needs_jira_verify: false`.

## Còn lại

13 file `stub` — các file chủ đề cấp sản phẩm (onboarding / loan-management / faq
cho payday, paylater, od). Chưa viết, agent đã được chặn không dùng.

FAQ vẫn chưa có nguồn câu hỏi CSKH thật.

