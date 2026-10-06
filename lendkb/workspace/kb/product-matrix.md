---
title: Ma trận Đối tác × Sản phẩm × Kênh
sources:
  - confluence:27918827   # [Partner] Partnership products — bảng chuẩn
  - jira:PL-14081         # KOV_cashloan
  - jira:PL-14293         # LCP_paylater
  - jira:PL-13819         # FIZA_cashloan
  - jira:PL-13475         # FIZA_payday
  - jira:PL-12531         # MBF_cashloan
last_verified: 2026-09-30
audience: [ops, po]
owner: dung.pham2
status: draft
decided_by: dung.pham2
decided_on: 2026-09-30
---

## Chú thích

- **Kênh** — `api` = đối tác tự làm app, gọi API Cake · `dop` = webview Cake nhúng vào app đối tác · `cake` = làm trên app Cake.
- **NFC onboard** — yêu cầu đối tác truyền `nfc_data` khi gọi `create-token` (DOP) hoặc `client-update` (API). Toggle `cake.lending.NFC.required.nfc_data`.
- **NFC ký** — KH phải có NFC verified khi ký HĐTD, không thì trả lỗi. Toggle `cake.lending.NFC.sign.contract`.
- **Giải ngân** — `partner` = tiền vào TK đảm bảo của đối tác tại Cake, đối tác cộng vào ví KH (không qua CASA Cake) · `cake` = vào CASA của KH tại Cake · `nh-khác` = ngân hàng khác.
- **Ký app Cake** — mặc định Yes; thực tế chỉ sản phẩm bật toggle `cake.enableOnboardingInLoanList.{ProductId}` mới ký được trên app Cake.
- **Onboarding source** — cấu trúc `[source]_[product_id]`, dùng để filter ảnh trên Portal.
- Core banking: Payday lên ICE từ 21/07/2025 (nhóm Viettel 09/10/2025), Paylater 25/08/2025, Cashloan 04–06/2026 tuỳ đối tác, Overdraft 07/07/2026. Trước đó là Mambu.

---

## A. Sản phẩm cho vay đang chạy (26)

| # | Đối tác | Sản phẩm | ProductId | Kênh | NFC onboard | NFC ký | Giải ngân | Ký app Cake | Onboarding source | Contract type |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | VDS (Viettel Money) | cashloan | `Viettel_Cashloan` | api | Optional | None | partner | No | `viettel_cashloan` | `VIETTEL_CASHLOAN` |
| 2 | VDS | cashloan payroll | `VT_Cashloan_S` | api | Optional | None | partner | No | `vt_cashloan_payroll` | `VIETTEL_CASHLOAN_PAYROLL` |
| 3 | VDS | payday | `PD_Viettel` | dop | Optional | None | partner | No | `viettel` | `VIETTEL_PAYDAY` |
| 4 | VDS | payday payroll | `VT_Payday_S` | api | Optional | None | partner | No | `vt_payday_payroll` | `VIETTEL_PAYDAY_PAYROLL` |
| 5 | VDS | paylater | `VDS_paylater` | api | Optional | None | partner | No | `API_VT_PAYLATER` | `VIETTEL_PAYLATER` |
| 6 | Cake | cashloan | `CAKE_cashloan` | cake | Required | Required | cake | Yes | `cake_cashloan` | `CAKE_CASHLOAN` |
| 7 | Cake | overdraft | `CAKE_overdraft` | cake | Required | Required | cake | Yes | — | `OVER_DRAFT` |
| 8 | Cake | overdraft secured (TD) | `CAKE_overdraft_TD` | cake | Required | Required | cake | Yes | `od_face_match` | `OVER_DRAFT` |
| 9 | Cake | payday | `CAKE_payday` | cake | Required | Required | cake | Yes | — | `CAKE_PAYDAY` |
| 10 | Cake (affiliate) | cashloan | `CAKE_cl_affiliate` | dop | None | Required | cake | Yes | `dop_cake_cl_affiliate` | `CAKE_CASHLOAN` |
| 11 | VNPAY | cashloan | `VNP_cashloan` | dop | Required | Required | partner | Yes | `dop_vnp_cashloan` | `VNP_CASHLOAN` |
| 12 | VNPAY | paylater | `VNP_paylater` | dop | Required | Required | partner | Yes | `dop_vnp_paylater` | `VNP_PAYLATER` |
| 13 | VNPAY | payday | `VNP_payday` | dop | Required | Required | partner | Yes | `dop_vnp_payday` | `VNP_PAYDAY` |
| 14 | BeGroup | cashloan | `Be_Cashloan` | dop | DOP | Required | cake | Yes | `dop_be_cashloan` | `BE_CASHLOAN` |
| 15 | BeGroup | payday | `BE_payday` | dop | DOP | Required | cake | Yes | `dop_be_payday` | `BE_PAYDAY` |
| 16 | BeGroup | paylater | `BE_paylater` | dop | DOP | Required | cake | Yes | `dop_be_paylater` | `BE_PAYLATER` |
| 17 | MISA | cashloan | `MISA_cashloan` | api | Required | Required | nh-khác | Yes | `api_misa_cashloan` | `MISA_CASHLOAN` |
| 18 | MWG | cashloan | `MWG_cashloan` | dop | None | Required | cake | Yes | `dop_mwg_cashloan` | `MWG_CASHLOAN` |
| 19 | MWG | cashloan online | `MWG_cl_online` | dop | Required | Required | cake / ngoài | Yes | — | `MWG_CL_ONLINE` |
| 20 | MWG | paylater | `MWG_paylater` | dop + cake (spending) | Required | Required | cake | Yes | `dop_mwg_paylater`, `cake_app_mwg_paylater` | `MWG_PAYLATER` |
| 21 | MWG | payday | `MWG_payday` | dop | Required | Required | cake | Yes | `dop_mwg_payday` | `dop_mwg_payday` |
| 22 | KLP | cashloan | `KLP_cashloan` | dop | None | Required | cake | Yes | `dop_klp_cashloan` | `DOP_KLP_CASHLOAN` |
| 23 | Vnpost | cashloan | `VPO_cashloan` | dop | Required | Required | partner | No | `dop_vpo_cashloan` | `VNPOST_CASHLOAN` |
| 24 | Vnpost | cashloan hưu trí | `VPO_cl_pension` | dop | Required | Required | partner | No | — | `VPO_CASHLOAN_PENSION` |
| 25 | ZaloPay | cashloan | `ZLP_cashloan` | api | Required | Required | partner | No | `api_zlp_cashloan` | `ZLP_CASHLOAN` |
| 26 | ZaloPay | payday | `ZLP_payday` | api | Required | Required | partner | No | `api_zlp_payday` | `ZLP_PAYDAY` |

**DOP partner / DOP link** (chỉ sản phẩm kênh dop): VNP_cashloan 20/27 · VNP_paylater 20/25 ·
Be_Cashloan 16/19 (link 12 đã ngưng support) · BE_payday 12/37 · BE_paylater 16/23 ·
MWG_cashloan 21/26 · MWG_paylater 23/29 · KLP_cashloan 25/36 · VPO_cashloan 22/28.

**Deeplink onboarding BeGroup** (cashloan & paylater): `https://begroup.onelink.me/ZOqn/backtohomeappcakecashloan`

---

## B. Sản phẩm thẻ đang chạy (6)

Nằm cùng bảng nguồn nhưng **không phải sản phẩm cho vay**. Tất cả `Contract type: CREDIT_CARD`.
Bản matrix trước bỏ sót hoàn toàn nhóm này.

| # | Sản phẩm | Status | App-id | Onboarding source |
|---|---|---|---|---|
| 27 | Debit Card | (nguồn để trống) | — | `HPV_Validation` |
| 28 | Debit Card Visa | (nguồn để trống) | — | `verifyFacematch` |
| 29 | CC Be | active | `credit_card_phone_number_be` | `dop_cc_be` (map từ `80855471597669151426`) |
| 30 | CC affiliate | active | `credit_card_phone_number_affiliate` | `dop_cc_affiliate` (map từ `27785870085`), DOP 13/13 |
| 31 | CC VDS | active | — | `dop_credit_card_vds` |
| 32 | CC Zalo | active | `credit_card_phone_number_zalo` | — |

Cần quyết: KB lending có bao gồm nhóm thẻ không? Nếu có thì cần taxonomy riêng (`card`),
vì 4 loại sản phẩm trong PLAN.md (`cashloan`/`payday`/`paylater`/`od`) không phủ được.

---

## C. Sắp ngưng (4) — KH cũ vẫn trả nợ / tất toán được

Đều off auto qua [PL-13156](https://cakedigitalbank.atlassian.net/browse/PL-13156).

| Đối tác | Sản phẩm | ProductId | Kênh | Onboarding source |
|---|---|---|---|---|
| DataVN | cashloan | `VNHUB_cashloan` | api | `api_vnhub_cashloan` |
| FPT | paylater | `FPT_paylater` | api | `api_fpt_paylater` |
| VDS | paylater ePass | `VDS_paylater_epass` | api | `vds_paylater_epass` |
| VDS | cashloan O2O | `VTPO_cashloan` | api | `api_vtpo_cashloan` |

**Khách `FPT_paylater` vẫn còn nhiều khoản vay đang trả** — hay gọi CSKH về trả nợ,
tất toán, khiếu nại. Hướng xử lý: mục H.

## D. Đã ngưng (5) — đã xoá code

| Đối tác | Sản phẩm | ProductId |
|---|---|---|
| NGS | cashloan | `NGS_cashloan` |
| VDS | cashloan landing page | `VDS_cashloan_LP` |
| VDS | bikeloan | `VDS_bikeloan` |
| GSM (Vinfast) | bikeloan | `GSM_bikeloan` |
| VNPT | payday | `PD_CAKEVNPT_NEW` |

**Khách `NGS_cashloan` còn nhiều khoản nợ đang thu hồi** dù code đã xoá — hay hỏi về
nợ xấu, nhắc nợ, khiếu nại. Khách vẫn trả nợ qua app Cake (mục H).

## E. Đang phát triển (3)

| Đối tác | Sản phẩm | ProductId | Jira | Trạng thái |
|---|---|---|---|---|
| KOV (KiotViet) | cashloan | `KOV_cashloan` | [PL-14081](https://cakedigitalbank.atlassian.net/browse/PL-14081) | In Progress · core disb/repay đã Ready4Release |
| LCP (Long Châu) | paylater | `LCP_paylater` | [PL-14293](https://cakedigitalbank.atlassian.net/browse/PL-14293) | In Progress · API Ready4Test, core In Coding |
| FIZA | cashloan | `FIZA_cashloan` | [PL-13819](https://cakedigitalbank.atlassian.net/browse/PL-13819) | Draft |

---

## H. Sản phẩm ngừng bán — luồng trả nợ

Áp dụng cho toàn bộ mục C (sắp ngưng) và mục D (đã ngưng).

- Khoản vay còn dư nợ **vẫn thanh toán / tất toán được**, qua **app Cake**.
- Cái bị đóng là **luồng API với đối tác**, không phải khả năng trả nợ của khách.
- Agent trả lời theo luồng thanh toán trên app Cake, **không** hướng khách quay lại app đối tác.
- Không mở khoản vay mới cho các sản phẩm này.
