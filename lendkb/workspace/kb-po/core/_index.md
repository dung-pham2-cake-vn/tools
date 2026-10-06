---
title: Core banking & GL — index
audience: [po]
nhom: 3
last_verified: 2026-10-01
owner: dung.pham2
status: reference
---

# Nhóm 3 — Core banking & GL

🔴 `hạn chế` — chỉ PO.

**766 tài liệu** trong `raw/` có nội dung hạch toán / GL / cấu hình core.
Đây là index trỏ sang tài liệu gốc, chưa phải nội dung đã tổng hợp.

## Vì sao chỉ là index

Nội dung core thay đổi theo hệ thống (Mambu → ICE) và theo từng bút toán, tổng hợp sớm sẽ
nhanh lỗi thời. Dùng index tra ngược về `raw/` đúng lúc cần, rồi mới viết lại phần nào ổn định.

## Theo sản phẩm

| ProductId | Tài liệu core/GL | Tài liệu tiêu biểu |
|---|---|---|
| `BE_paylater` | 59 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VDS_paylater` | 49 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `MWG_paylater` | 43 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `MWG_cashloan` | 40 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `CAKE_overdraft` | 37 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VPO_cashloan` | 37 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VNP_cashloan` | 34 | `1451950152` Instalments - Cashloan GL flow |
| `Viettel_Cashloan` | 33 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VNP_paylater` | 33 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `CAKE_payday` | 30 | `1451950152` Instalments - Cashloan GL flow |
| `CAKE_cashloan` | 30 | `1451950152` Instalments - Cashloan GL flow |
| `MISA_cashloan` | 29 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `FPT_paylater` | 29 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `Be_Cashloan` | 29 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VT_Payday_S` | 28 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `ZLP_cashloan` | 27 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `PD_Viettel` | 26 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `NGS_cashloan` | 25 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VTPO_cashloan` | 24 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VT_Cashloan_S` | 23 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VPO_cl_pension` | 22 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `CAKE_overdraft_TD` | 19 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `ZLP_payday` | 18 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `MWG_cl_online` | 18 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VNHUB_cashloan` | 17 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VDS_paylater_epass` | 15 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `CAKE_cl_affiliate` | 15 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `VNP_payday` | 15 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `KLP_cashloan` | 14 | `PL-13663` Product config tool - Cake & VNpay cashloan |
| `BE_payday` | 12 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `MWG_payday` | 11 | `1770225925` MWG - Payday - GL |
| `MBF_cashloan` | 10 | `852792931` [Rule Engine] - Product onboarding pre-check p |
| `FIZA_payday` | 8 | `PL-13607` Fiza payday - Core disbursement + GL |
| `KOV_cashloan` | 7 | `PL-14081` KOV_cashloan - Kiotviet Cashloan |
| `PD_CAKEVNPT_NEW` | 6 | `949305` VNPT - Interest calculation and Accounting Flo |
| `GSM_bikeloan` | 5 | `41386015` VinFast bike loan - Product Policy |
| `VDS_cashloan_LP` | 5 | `60751873` [Partner] - [Viettel] Landing page VT Cashloan |
| `LCP_paylater` | 5 | `PL-14378` LCP_paylater - Core disbursement + GL |
| `VDS_bikeloan` | 5 | `52593354` [Partner][Viettel] - Bikeloan - Accounting Flo |
| `FIZA_cashloan` | 3 | `PL-13841` Fiza cashloan - Core disbursement + GL |

## Tài liệu core dùng chung (không gắn sản phẩm cụ thể)

286 tài liệu.

| Id | Tiêu đề |
|---|---|
| `287473796` | Product GL details and breakdown |
| `758087938` | [Lending][Portal] - Portal for Search + Loan Details |
| `1060929556` | [Product][DOP] - Onboarding |
| `370081957` | [CORE] - Paylater - Repayment |
| `370082026` | [CORE] - Paylater - Accounting Flow |
| `1007925` | DOP - DOCUMENT ATTACHED |
| `1621753860` | [VPB] - SFTP File Ingestion to BigQuery |
| `1110604` | [Cake][Guideline] - Product/Project doc templates |
| `370049132` | [CORE][V2] - Paylater - Statement with Interest |
| `3735712` | Accounting entries |
| `429850683` | CRC - EOD + Interest |
| `1124817` | [LOS][Pre-Approve] - Credit Card Pre-Approve list |
| `336692576` | [Core][Cake] Instalments |
| `388530282` | CRC - Disbursement |
| `1957331043` | Paylater VCC — Business Use Cases |
| `370081793` | [CORE] - Paylater - Core v1 (without Interest) |
| `370082170` | [CORE] - Paylater - Transaction Fee |
| `571637804` | Instalments - CC - GL |
| `91848748` | Core Components - Idea |
| `PL-13374` | DOP cashloan - API get-loan-detail |
| `340983864` | Instalments - Paylater |
| `370049170` | [CORE][V2] - Paylater - Repayment/Revert with Interest |
| `370049291` | [CORE][V2] - Paylater - Terminate |
| `370049350` | [CORE][V2] - Paylater - Monthly Fee |
| `679510188` | [CAKE] - Superloan Product Policy |

## Cách tra

1. Mở `tools/scan/doc-index.csv`
2. Lọc `tags` chứa `gl`, `products` chứa product_id cần tìm
3. Sắp theo `tableRows` giảm dần — tài liệu nhiều bảng thường là spec cấu hình

## Chuyển sang `kb/` khi nào

Phần nào Ops cần để xử lý case (ví dụ: ý nghĩa một bút toán khách nhìn thấy trên sao kê)
thì trích sang `kb/`, không chuyển cả tài liệu core.

