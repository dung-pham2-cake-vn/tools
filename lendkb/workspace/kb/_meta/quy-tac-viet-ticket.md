---
title: Quy tắc viết ticket Jira — style của PO Lending
audience: [po, ai]
last_verified: 2026-10-03
owner: dung.pham2
status: reference
source: 2.355 ticket project PL do dung.pham2 tạo (2024-01 → 2026-10)
---

# Quy tắc viết ticket Jira — style của PO Lending

Tài liệu cho **AI hỗ trợ viết ticket**. Rút ra từ 2.355 ticket project `PL` do
dung.pham2 tạo, trong đó 837 ticket (Story/Epic/Initiative) được đọc toàn văn.

Phân bố loại ticket: Story 781 · Backend-SubTask 711 · Task 517 · Epic 108 ·
Web/Mobile/QA/Design-SubTask 142 · Bug+Defect 31 · Security Task 23 ·
Initiative 18 · TechDebt 9.

> **Cách dùng**: mục 1–6 là quy tắc, **mục 7 là 9 ticket thật chép nguyên văn**.
> Khi không chắc một quy tắc trông ra sao trong thực tế, mở mục 7 đọc ví dụ
> tương ứng rồi bắt chước — đó là cách nhanh nhất để bắt đúng giọng.

---

## 1. Đặt title

### Công thức

```
[<tag>] <Tên sản phẩm hoặc scope> - <Việc cần làm>
```

Dấu `[]` **không bắt buộc**: 245/837 ticket dùng 1 cặp, 351 dùng 2 cặp, 205 không
dùng cặp nào. Khi không dùng `[]` thì mở đầu bằng `product_id` rồi ` - `.

### Hai biến thể, chọn theo ngữ cảnh

**Biến thể A — ticket thuộc một sản phẩm cụ thể**: mở đầu bằng `product_id`.

```
LCP_paylater - API get-loan-detail
VNP_cashloan Điều chỉnh lãi suất cho vay
MWG_paylater - Luồng xử lý đóng ví
PD_Viettel - Chặn ký hợp đồng khi KH chưa có NFC
VPO_cl_pension - Điều chỉnh lãi suất sản phẩm vay An Vui
CAKE_cashoan - Điều chỉnh Product Code cho các Segment đầu luồng
ZLP_payday - Enrich reject group trả cho Zalopay
VDS payday - Onboarding source
```

**Biến thể B — ticket cắt ngang nhiều sản phẩm, hoặc theo mảng kỹ thuật**: mở đầu bằng `[tag]`.

```
[DOP+Native] Auto reject eKYC
[Techdebt] Make Lending great again and again
[Alert] - No traffic on API client-create (Critical channel)
[Transaction Banking] Tạo yêu cầu trên app Cake
[Voucher] Lending Vouchers (Giảm lãi) - Cake Cashloan
[Sale App] Ứng dụng dành cho sale VNPost
[Base product] - DOP cashloan
[MWG PD] - Điều chỉnh request amount nhóm KH New
```

Ghép được cả hai khi cần thu hẹp phạm vi — càng nhiều `[]` thì phạm vi càng hẹp:

```
[MWG-PL][QTV][API external] - API generate-webview/payment-request
[VNPAY CL&PD&PL] Bổ sung thêm field ranking trong API gen token DOP
[MWG-PL][QTV][API internal] - API lấy thông tin ví
```

### Tag hay dùng

| Nhóm | Tag | Ví dụ title |
|---|---|---|
| Kênh / nền tảng | `API` · `API internal` · `API external` · `API partner` · `Portal` · `App` · `APP` · `DOP` · `MockAPI` · `CORE` · `LMS` | `[API partner] - Bổ sung field ranking` |
| Đối tác + sản phẩm | `MWG-PL` · `ZLP-PD` · `ZLP-CL` · `Cake-PD` · `VNPay-PD` · `VDS-O2O` · `QTV` | `[ZLP-PD] - Setup product code` |
| Mảng việc | `Techdebt` · `Alert` · `Ops` · `Voucher` · `Challenge` · `Base product` · `Transaction Banking` · `Sale App` · `Security` · `CakeTask` | `[Ops] Be cashloan lỗi create-token` |

### Theo loại ticket

| Loại | Công thức | Ví dụ thật |
|---|---|---|
| **Initiative** | `<PRODUCT_ID> - <Tên sản phẩm đầy đủ>` | `LCP_paylater - Long Châu Paylater` · `KOV_cashloan - Kiotviet Cashloan` · `MBF_cashloan - My Mobifone Cashloan` · `[VPO_cl_pension] - Vay hưu trí` · `[VNHUB_cashloan] - Triển khai cashloan trên VNeID` |
| **Epic** | `<PRODUCT_ID> - <Giai đoạn/khối việc>` | `Fiza payday - LOS, Precheck & CORE` · `MBF_cashloan - Setup & Onboarding DOP` · `LCP_paylater - system flow` · `BE_payday - Loan Management & Repayment` · `[ODTD_v2] Onboarding` |
| **Story** | `<PRODUCT_ID> - <Thay đổi cụ thể>` | `MWG_paylater - Terminate ví và điều chỉnh LSGD` · `VDS payday native enhance phase 2` · `Cake app add banner upsell Cake cashloan` |
| **Story API** | `<PRODUCT_ID> - API <tên endpoint>` | `LCP_paylater - API get-loan-detail` · `LCP_paylater - API generate-webview/onboarding & onboarding & callback status` · `LCP_paylater - API generate-webview/loan-detail & loan detail` |
| **Task** | `[<Tag>] <Việc hành chính/hạ tầng>` | `[DOP] - Bỏ Time to leave TTL ở token DOP` · `LCP_paylater - Kết nối stage` · `Tạo public domain cho public api specs` · `Datanest - Bật tắt datanest gateway` |
| **Bug** | `[Ops] <Sản phẩm> <triệu chứng>` hoặc `<SẢN PHẨM> - <TRIỆU CHỨNG VIẾT HOA>` | `[Ops] Be cashloan lỗi create-token` · `[Ops] MWG_cl_online chọn tài khoản ACB lỗi` · `VIETTEL CASHLOAN - CHECK GIẢI NGÂN` · `MWG PL - QUÉT QR THANH TOÁN LỖI` |

**Bộ chia Epic chuẩn khi mở sản phẩm mới.** Lặp lại gần như nguyên xi ở Fiza, MBF,
LCP, BE — mở sản phẩm mới thì cứ theo bộ này:

```
<Product> - Onboarding Process & APIs Integration
<Product> - LOS, Precheck & CORE
<Product> - Mobile App & Portal
<Product> - Loan Management & Repayment
<Product> - Setup & Onboarding DOP
<Product> - User flow
<Product> - system flow
```

### Quy tắc tên sản phẩm

Viết đúng `product_id` như trong hệ thống, **không** phiên dịch, **không** tự
chuẩn hoá hoa/thường. Bốn kiểu tên cùng tồn tại — xem `quy-tac-dat-ten.md`.
Dạng hay gặp trong title: `LCP_paylater`, `VPO_cl_pension`, `MWG_cl_online`,
`PD_Viettel`, `VDS_paylater_epass`, `CAKE_cl_affiliate`, `VT_Cashloan_S`.

Trong title đôi khi viết thoáng hơn (`VDS payday`, `Fiza payday`, `MWG PD`),
nhưng trong **thân ticket thì phải dùng đúng `product_id`** vì dev copy thẳng
vào config.

---

## 2. Cấu trúc description theo loại ticket

### 2.1 Story — khung chuẩn

Hai nhãn in đậm, **theo đúng thứ tự này** (217/217 ticket có cả hai đều đặt Context trước):

```markdown
**Context:** <vì sao làm>

**Acceptance Criteria:**

**Ac1**: <điều kiện 1>
- <chi tiết>

**Ac2**: <điều kiện 2>
```

Tần suất thực tế trên 704 Story có mô tả:

| Dạng | Số ticket |
|---|---|
| Có cả **Context** và **Acceptance Criteria** | 225 |
| Chỉ **Acceptance Criteria** | 215 |
| Chỉ **Context** | 33 |
| Không nhãn, viết thẳng nội dung | 231 |

→ Bỏ **Context** được khi lý do đã hiển nhiên từ title (ví dụ ticket API trong bộ
sản phẩm mới). **Không** bỏ Acceptance Criteria ở Story có logic nghiệp vụ.

**Nhãn phụ** — dùng khi cần, kèm ví dụ thật:

| Nhãn | Dùng khi | Ví dụ |
|---|---|---|
| `**Yêu cầu**:` | Thay cho AC ở ticket một việc | *"**Yêu cầu**: Điều chỉnh lãi suất sản phẩm"* |
| `**Mô tả:**` | Giải thích cơ chế trước khi vào AC | *"**Mô tả:** Khi submit API client-update, kiểm tra…"* |
| `**Constrains:**` | Ràng buộc triển khai | *"UAT xong là có thể deploy production, không cần toggle"* |
| `**Pre-condition**` | Điều kiện có trước | *"PO đã setup app-id trong Sola Portal"* |
| `**Note**:` / `Note:` | Định nghĩa, cảnh báo, việc PO phải làm trước | *"**Note**: Toàn bộ dư nợ = gốc trong hạn + lãi trong hạn + gốc quá hạn + lãi quá hạn + phí phạt + phí sử dụng dịch vụ (nếu có)"* |
| `Edge case:` | Trường hợp biên và cách chấp nhận | *"Mỗi KH với product_id = CAKE_cashloan trong bảng chỉ có 1 record… Nếu có 2 record, sẽ chấp nhận lấy tag của 1 trong 2 record đó (ngẫu nhiên)."* |
| `**Lưu ý/Open questions:**` | Điểm chờ dev xác nhận | *"Dev xác nhận path API client-create chính xác và cách phân biệt product"* |
| `**BRD**` / `**API spec:**` / `**Figma**:` | Link tài liệu nguồn | SharePoint, Confluence, Figma |

**Đánh số AC**: dùng `**Ac1**`, `**Ac2**` — 163/704 Story (23%) đánh số. Đánh số khi có
từ 2 điều kiện độc lập trở lên; một điều kiện thì gạch đầu dòng thẳng.
Viết `Ac1` (chữ thường `c`) là dạng phổ biến nhất; `AC1` cũng dùng, giữ nhất quán trong một ticket.

AC có thể có tiêu đề riêng khi nội dung dài:

```
**Ac1**: Với KH NTB, ghi nhận onboarding_source như sau:
**Ac2**: Ghi nhận App ID
**AC1: API /check-profile**
**Ac1: Danh sách khoản vay**
```

**Context viết gì** — sáu mẫu câu hay dùng, chép từ ticket thật:

| Loại lý do | Ví dụ nguyên văn |
|---|---|
| Kinh doanh | *"Nhằm đảm bảo profit của sản phẩm, trong bối cảnh chi phí vốn đang tăng mạnh"* |
| Kinh doanh (dài hơn) | *"Chi phí vốn COF của sản phẩm đang tăng thời gian gần đây, đồng thời margin lợi nhuận của sản phẩm đang ở mức thấp → nâng lãi suất để cải thiện revenue"* |
| Kỹ thuật | *"Face scan model đang load lâu trên DOP, hiện FE đã benchmark như sau"* |
| Yêu cầu đối tác | *"Zalopay mong muốn nhận được các lý do từ chối của CAKE thông qua API"* |
| Nối tiếp ticket cũ | *"Base trên ticket payday PL-13600"* · *"Refer ticket: PL-13264"* · *"Trước đó đã xử lý chặn ký hợp đồng khi KH chưa có NFC ở ticket PL-14137. Tuy nhiên bên hội đồng sản phẩm…"* |
| Mô tả hiện trạng | *"Hiện tại nhìn màn hình lỗi khá khó để trace được KH đang bị lỗi gì, phải đi hỏi KH nào, bị kẹt thời gian nào để trace ngược mất thời gian"* |

Pattern `Hiện tại → Điều chỉnh` dùng ở 55 ticket. Đây là cách diễn đạt **mặc định**
khi thay đổi một con số đã có — viết thành hai cột bảng, hoặc hai dòng in đậm:

```markdown
| **Hiện tại** | **Điều chỉnh** |
| --- | --- |
| Amount limit = 40 triệu | Amount limit = 60 triệu |
```

```markdown
- **Hiện nay:** Drop off ở step nào thì sẽ quay về step đó trong vòng 3 ngày.
- **Điều chỉnh:** Không keep session nữa, **KH chưa được approve** khi đi vào sẽ đăng ký vay lại từ đầu
```

### 2.2 Story API — khung riêng

```markdown
**Context:** Base trên ticket <link ticket base>

**Acceptance Criteria:**
- <mục đích API, 2-4 gạch đầu dòng>

**API URL:** {path}/<endpoint>

---

#### **API request**
<bảng: Field | Type | Label | Description | Note>

---

#### **API response**
<bảng: Field | Type | Description | Note>
```

Quy ước trong bảng API, kèm ví dụ nguyên văn:

| Quy ước | Ví dụ |
|---|---|
| Field lồng nhau: tiền tố `└─ ` | `└─ loan_account_status` · `└─ principle_balance` |
| Field **bỏ đi** so với base: gạch ngang, cột Note ghi lý do | `~~└─ disburse_date~~` · `~~string~~` · `~~Ngày giải ngân khoản vay (yyyy-mm-dd)~~` → Note: *"Paylater không có field này"* |
| Field **giữ nguyên** so với base | Note: `tương tự base` |
| Enum liệt kê trong ô Description, phân cách `<br>` | `LOAN_ACTIVE: Khoản vay của KH đã được giải ngân thành công <br> LOAN_LOCK: Khoản vay bị tạm khóa, cần thanh toán để mở lại (chỉ Paylater)` |
| Công thức tính đặt ở cột Note | `= { prin_not_d + prin_d + prin_over_d } <br> (gốc chưa lên due, gốc ở due, gốc quá due)` |
| `required` / `optional` đặt ở cột **Label**, không đặt trong Description | `| phone_number | string | required | SĐT của KH… |` |
| Ghi rõ field nào đổi nghĩa theo sản phẩm | `disburse_amount` → Note: *"Với paylater, field này là hạn mức đã sử dụng"* |
| Giá trị chưa triển khai vẫn ghi, kèm lý do | `penalty_interest_balance` → Note: *"= 0đ (hiện tại chưa hỗ trợ lãi phạt lãi)"* |

**Không xoá hẳn dòng** khi bỏ field — 110/704 ticket dùng `~~`, để dev đối chiếu
được với sản phẩm base.

### 2.3 Task

Ngắn, hướng hành động. Không cần Acceptance Criteria.

```markdown
Context:
<bối cảnh — thường là một bên thứ ba yêu cầu, kèm mốc thời gian>

Todo:
<việc nhờ team làm>
```

Hoặc gọn hơn nữa, một câu: *"Đăng ký domain lending.cake.vn để đối tác xem API specs"*.

Ba kiểu Task hay gặp:

| Kiểu | Khung |
|---|---|
| **Nhờ việc có mốc thời gian** | `Context:` (ai yêu cầu, từ lúc nào đến lúc nào) → `Todo:` (việc + lý do) |
| **Hạ tầng / alert** | `Mô tả:` → `Phạm vi:` → `Cách tính` (có `expr:`) → `Cấu hình theo product` (bảng) → `Điều kiện resolve` → `Quy tắc đặt tên` → `Nội dung thông báo` → `Ví dụ thực tế:` → `Acceptance Criteria:` → `Lưu ý/Open questions:` |
| **Kết nối đối tác** | Liệt kê việc hai bên phải làm, rồi bảng `Key \| Value \| Description` với `CAKE_API_URL`, `CAKE_PARTNER_ID`, `CAKE_PARTNER_KEY`, `CAKE_IP_ADDRESS`, `PARTNER_API_URL`, `PARTNER_IP_ADDRESS`, `PARTNER_PUBLIC_KEY` |

### 2.4 Bug

Thường chuyển tiếp từ Ops. Thứ tự: **định danh → hiện tượng → bằng chứng → nhờ ai**.

```markdown
<Thông tin định danh: sđt / loan_code / loan_id / CCCD>
<Trạng thái hệ thống: Cake status: USER_SIGN>
<Mô tả hiện tượng>
<Log hoặc response lỗi, dán nguyên văn>
Nhờ Tech kiểm tra và xử lý
```

Luôn kèm **ít nhất một định danh tra được**: `loan_code` (dạng `CAKECLZLPxxxxxxxxx`,
`CAKEPDQTVxxxxxxxx`), `loan_id` (8 chữ số), hoặc `trace_id`.

Thêm `Note:` nếu stage không tái hiện được:
*"Note: dưới stage đang không tái hiện được vì chọn ngân hàng ACB và stk bất kì thì vẫn cho đi tiếp bình thường ạ"*.

Khi đã điều tra thì **thêm dòng mới chứ không sửa dòng cũ**:
*"Kiểm tra lần 1: Tài khoản NH này không tồn tại, kiểm tra các tài khoản ngân hàng không tồn tại khác lỗi tương tự. Khi nhập đúng thì không bị lỗi"*.

### 2.5 Epic và Initiative

**Mô tả để trống là bình thường** — 61/108 Epic và 1/18 Initiative không có mô tả.
Epic/Initiative là vỏ chứa; nội dung nằm ở Story con. **Không viết Acceptance Criteria**
cho hai loại này.

Nếu viết thì chọn một trong ba kiểu:

| Kiểu | Nội dung |
|---|---|
| **Bảng thông tin sản phẩm** (Initiative) | Link API spec · Confluence · Figma, rồi `**Nền tảng:**` / `**Giải ngân:**` / `**NFC**:` |
| **Phạm vi theo module** (Initiative/Epic) | `- Onboarding: …` / `- Spending: …` / `- Management: …` |
| **Danh sách Story con** (Epic) | `- Story 1.1: …` / `- Story 1.2: …` |

---

## 3. Giọng văn

- **Tiếng Việt có dấu** cho câu văn; **giữ nguyên tiếng Anh** cho thuật ngữ kỹ thuật
  và tên trường: `onboarding_source`, `product_code`, `disbursement`, `clearing`,
  `drop off`, `segment`, `toggle`, `whitelist`, `Amount limit`, `Tennor`.
- **Viết tắt quen dùng, không giải thích lại**: KH (khách hàng), NTB, ETB, GD (giao dịch),
  LSGD (lịch sử giao dịch), TKBĐTT, sp (sản phẩm), đtac/đối tác, sđt, GTTT, DPD, MAD, COF, IR, BH (bảo hiểm).
- **Dùng `→` thay cho "dẫn đến"**:
  *"chi phí vốn tăng → nâng lãi suất để cải thiện revenue"* ·
  *"Nếu tag = REPEAT => product_code = CAKER01"* (cả `→` và `=>` đều dùng).
- **Dùng `=` cho phép gán**: `product_code = CAKEM01` · `onboarding_source = api_fiza_payday` ·
  `expr: request_count == 0 trong {interval}`.
- **Câu mệnh lệnh cụt, bỏ chủ ngữ**: *"Điều chỉnh lãi suất sản phẩm"* ·
  *"Bỏ Time to leave TTL ở token DOP"* · *"Xoá bản cũ, giữ 5–50 triệu"*.
- **Nhờ team khác thì lịch sự có "ạ/nhé"**:
  *"Nhờ team hỗ trợ tắt service datanest bên mình trong khung giờ này để tránh ảnh hưởng đến KH ạ"* ·
  *"Nhờ Tech kiểm tra giúp ops"* · *"Bên BI báo kéo các loan_id sau không thấy loan_code, nhờ team check logic đang gen giúp em ạ"*.
- **Không** viết user story kiểu "As a … I want … so that" — chỉ 17/704 ticket dùng,
  và đó là ticket do người khác đặt khung.

---

## 4. Bảng — dùng nhiều, dùng đúng

496/704 Story (70%) có ít nhất một bảng.

| Tình huống | Cột | Ví dụ thật |
|---|---|---|
| Thay đổi một con số | `Hiện tại \| Điều chỉnh` | `\| Amount limit = 40 triệu \| Amount limit = 60 triệu \|` |
| Thay đổi theo nhiều hạng mục | `Hạng mục \| Hiện tại \| Điều chỉnh` | `\| Có bảo hiểm \| 45% \| 50% \|` |
| Thay đổi theo tệp KH | `Tệp \| Product code \| Hiện tại \| Điều chỉnh` | `\| Upsell \| CAKEU01 \| 5-30 \| 5-25 \|` |
| Spec API | `Field \| Type \| Label \| Description \| Note` | xem mục 7.3 |
| Cấu hình theo segment | mỗi segment một cột, mỗi thông số một dòng | `Segment / Product code / Tag nhận diện / Loan amount / Tennor / %IR (W.O ins) / %IR (W ins) / Insurance fee` |
| Ma trận service × flow | `Flow \| Service \| App-id \| cus-user-ID \| Source \| Note` | `\| NTB/reKYC \| compare_faces \| = onboarding_source \| phone \| Semi \| \|` |
| Cấu hình alert | `Product \| Interval \| Severity \| Channel` | `\| Viettel Cashloan \| 10 phút \| 🚨 Critical \| Critical channel (mới) \|` |
| Khoá kết nối đối tác | `Key \| Value \| Description` | `\| CAKE_PARTNER_KEY \| (Cake cấp) \| Gắn sau body khi ký API Cake \|` |

Header bảng in đậm: `| **Field** | **Type** | ... |`.
Xuống dòng trong ô bằng `<br>`.

---

## 5. Trường Jira kèm theo

| Trường | Quy ước | Số liệu |
|---|---|---|
| **Parent** | Story luôn treo dưới Epic | 585/711 Story có parent |
| **Fix version** | Gán sprint ngay khi tạo, dạng `Sprint 194 - Lending` | 636/711 Story có |
| **Components** | 1-2 component: loại sản phẩm (`Cashloan` 276 · `Paylater` 145 · `Payday` 135) + đối tác (`MWG` 117 · `Viettel Money` 111 · `Cake` 84 · `BeGroup` 45 · `VNPAY` 40 · `Zalopay` 34 · `Vnpost` 26) | |
| **Labels** | `TC_Covered` (QA đã có test case, 574 lần) · `PO_Covered` 60 · `adhoc` 48 · `DOP` 15 · `Change_Config` 12 · `off-sprint` 5 · `Biz_uat` / `Fin_uat` · `Production_Bug` **kèm** component `Production Bug` · `system_issue` · `alert-metrics` | |
| **Priority** | Để `Medium` trừ khi có lý do | |

---

## 6. Tham chiếu chéo

- Link ticket liên quan bằng **URL đầy đủ**, không chỉ key:
  `https://cakedigitalbank.atlassian.net/browse/PL-13600`
- Ticket kéo data/hạ tầng thì link sang service desk:
  `https://internal.support.cake.vn/servicedesk/customer/portal/1/SVK-8659`
- Bảng BigQuery ghi đủ **cả stage lẫn production**:
  ```
  Staging: bef-cake-sandbox.feat_white_list_crc.tb_xsell_upsell_cashloan_data
  Production: bef-cake-prod.feat_white_list_crc.tb_xsell_upsell_cashloan_data
  ```
- Query SQL thì dán nguyên văn vào ticket, không mô tả bằng lời.
- Ảnh màn hình chèn ngay dưới AC tương ứng, kèm **một dòng chú thích bên dưới ảnh**:
  *"Portal ekyc detail - ekyc log - front side có ghi nhận onboarding_source"*.
  32% Story có ảnh.
- Link tài liệu nguồn ở đầu ticket: `**API spec:**` (SharePoint) · `**Confluence:**` · `**Figma**:` · `**BRD**`.

---

## 7. Chín ví dụ thật — chép nguyên văn

Thông tin định danh khách hàng đã thay bằng placeholder; còn lại giữ nguyên.

### 7.1 Story — đổi một con số (ngắn nhất có thể)

> **PL-14264** · `VNP_cashloan Điều chỉnh lãi suất cho vay`

```markdown
**Context**: Nhằm đảm bảo profit của sản phẩm, trong bối cảnh chi phí vốn đang tăng mạnh

**Yêu cầu**: Điều chỉnh lãi suất sản phẩm

| **Lãi suất cho vay** | **Hiện tại** | **Điều chỉnh** |
| --- | --- | --- |
| Có bảo hiểm | 45% | 50% |
| Không bảo hiểm | 50% | 55% |
```

*Đáng học*: Context một câu nêu lý do kinh doanh. Dùng `**Yêu cầu**` thay cho AC
vì chỉ có một việc. Bảng ba cột là đủ — không cần giải thích thêm.

### 7.2 Story — đổi một con số có điều kiện

> **PL-14106** · `[MWG PL] Nâng limit theo partner_score_2`

```markdown
**Context:**

Nâng số tiền từ 40tr lên 60tr khi API create-token truyền partner_score_2 >= 3300

[ảnh]

**Acceptance Criteria:**

Với điều kiện API create-token truyền partner_score_2 >= 3300

| **Hiện tại** | **Điều chỉnh** |
| --- | --- |
| Amount limit = 40 triệu | Amount limit = 60 triệu |
```

*Đáng học*: điều kiện kích hoạt (`partner_score_2 >= 3300`) được nhắc **hai lần** —
ở Context và ngay trước bảng. Cố ý, để dev đọc bảng không phải cuộn lên.

### 7.3 Story API

> **PL-14370** · `LCP_paylater - API get-loan-detail`

```markdown
**Context:**

Base trên ticket payday https://cakedigitalbank.atlassian.net/browse/PL-13600

**Acceptance Criteria:**

- API cung cấp thông tin chi tiết khoản vay cho Partner.
- Partner gọi API để lấy thông tin hợp đồng vay: thông tin hợp đồng, trạng thái, dư nợ, lịch thanh toán,…
- Cake phản hồi đầy đủ thông tin về khoản vay theo cấu trúc chuẩn.

**API URL:** {path}/get-loan-detail

---

#### **API request**

| **Field** | **Type** | **Label** | **Description** | **Note** |
| --- | --- | --- | --- | --- |
| loan_code | string | required | nhận từ API `/partner-update-status` | tương tự base |
| phone_number | string | required | SĐT của KH (định dạng bắt đầu bằng số 0). <br> Ví dụ: 034xxxx900 | tương tự base |

---

#### **API response**

| **Field** | **Type** | **Description** | **Note** |
| --- | --- | --- | --- |
| success | bool | Success |  |
| message | string | Message of response |  |
| code | int32 | Status code. Follow definition of status code |  |
| response_id | string | Response ID of each request |  |
| timestamp | string | Time when the response was generated (ISO 8601) |  |
| data | object | Follow the data response below |  |
| └─ loan_account_status | string | Trạng thái tài khoản vay (Follow status definition) <br> LOAN_REVIEWING: Khoản vay đang chờ phê duyệt <br> LOAN_ACTIVE: Khoản vay của KH đã được giải ngân thành công <br> LOAN_LOCK: Khoản vay bị tạm khóa, cần thanh toán để mở lại (chỉ Paylater) | Bỏ LOAN_UNKNOWN vì không tồn tại <br> Bổ sung LOAN_LOCK và LOAN_LOCKED cho paylater |
| └─ approved_amount | string | Số tiền được phê duyệt |  |
| ~~└─ loan_insurance~~ | ~~string~~ | ~~Số tiền bảo hiểm khoản vay (Ex: 700000)~~ | Paylater không có field này |
| └─ disburse_amount | string | Số tiền đã giải ngân | Với paylater, field này là hạn mức đã sử dụng |
| └─ principle_balance | string | Dư nợ gốc khả dụng còn lại | = { prin_not_d + prin_d + prin_over_d } <br> (gốc chưa lên due, gốc ở due, gốc quá due) |
| └─ penalty_interest_balance | string | Lãi phạt lãi quá hạn (nếu có) | = 0đ (hiện tại chưa hỗ trợ lãi phạt lãi) |
| └─ day_arrears | string | Số ngày quá hạn (nếu có) | = { dpd } |
```

*Đáng học*: ticket **không** mô tả lại toàn bộ API — nó mô tả **khác gì so với base**.
Cột Note làm toàn bộ việc đó: `tương tự base`, `Paylater không có field này`,
`Bỏ LOAN_UNKNOWN vì không tồn tại`. Field bỏ vẫn nằm trong bảng, gạch `~~`.

### 7.4 Story — logic nghiệp vụ nhiều nhánh

> **PL-14276** · `CAKE_cashoan - Điều chỉnh Product Code cho các Segment đầu luồng`

```markdown
**Context:** Nhằm phục vụ mục đích kinh doanh → Điều chỉnh product code cho các segment tương ứng nhằm monitor chính xác và tối ưu các hoạt động kinh doanh.

Bảng data dữ liệu: Gọi bảng data universal cho tất cả các group (Bao gồm pre-approve, repeat, Xsell, Xsell_Eli, Upsell)

- Staging: bef-cake-sandbox.feat_white_list_crc.tb_xsell_upsell_cashloan_data
- Production: bef-cake-prod.feat_white_list_crc.tb_xsell_upsell_cashloan_data

**Constrains:**

- UAT xong là có thể deploy production, không cần toggle

**Acceptance Criteria:**

**Ac1**: Khi KH đăng ký vay Cake Cashloan, KH vào màn hình chọn nhu cầu vay, thực hiện rule check segment theo thứ tự sau:

- Nếu có số khoản vay Cashloan đang Active > 1: product_code = CAKEM01 (tuy nhiên sẽ bị chặn ở precheck)
- Nếu có số khoản vay Cashloan đang Active = 1

  - Kiểm tra bảng **tb_xsell_upsell_cashloan_data** mà KH có tag UPSELL: product_code = CAKEU01
  - Còn lại => product_code = CAKEM01
- Nếu có số khoản vay Cashloan đang Active = 0. Kiểm tra bảng **tb_xsell_upsell_cashloan_data**

  - Nếu tag = PRE_APPROVED_MAX100 => product_code = CAKEP01
  - Nếu tag = REPEAT => product_code = CAKER01
  - Nếu tag = XSELL => product_code = CAKEX01

Edge case: Mỗi KH với product_id = CAKE_cashloan trong bảng chỉ có 1 record, bên Risk sẽ đảm bảo trường hợp này. Nếu trường hợp có 2 record, sẽ chấp nhận lấy tag của 1 trong 2 record đó (ngẫu nhiên).

Note: khoản vay cashloan active khi status là DISBURSE hoặc WRITTEN_OFF

Ticket kéo Doris: https://internal.support.cake.vn/servicedesk/customer/portal/1/SVK-8659 , bảng sẽ reload dữ liệu từ BQ mỗi ~7h sáng

| **Segment** | **Upsell** | **Pre-approve** | **Repeat** | **Xsell** | **Mass** |
| --- | --- | --- | --- | --- | --- |
| **Product code** | CAKEU01 | CAKEP01 | CAKER01 | CAKEX01 | CAKEM01 |
| **Tag nhận diện** | UPSELL | PRE_APPROVED_MAX100 | REPEAT | XSELL |  |
| **Loan amount** | 5 - 25 | 70 – 100 | 5 - 60 | 5 - 50 | 5 – 50 |
| **%IR (W.O ins)** | 59% | 36% | 59% | 59% | 59% |

**Ac2**: Điều chỉnh rule drop off:

- **Hiện nay:** Drop off ở step nào thì sẽ quay về step đó trong vòng 3 ngày.

- **Điều chỉnh:** Không keep session nữa, **KH chưa được approve** khi đi vào sẽ đăng ký vay lại từ đầu
```

*Đáng học*: logic phân nhánh viết thành **cây gạch đầu dòng lồng một cấp**, mỗi
nhánh kết thúc bằng `=> product_code = X`. Luôn có nhánh `Còn lại =>`. Bảng đặt
**sau** phần logic, đóng vai trò tra cứu chứ không thay thế lời văn.

### 7.5 Story — AC tách từ ticket khác

> **PL-14604** · `MWG_paylater - Luồng xử lý đóng ví`

```markdown
**Ac3**: Tách Ac này ra ticket riêng

- Hệ thống lending sẽ gọi sang Card để chuyển sang status CLOSE (thẻ đã đóng, nhưng một số giao dịch vẫn sẽ được Visa đẩy về Card, Card đẩy về Payment service)
- Trong 30 ngày đầu

  - Khoản vay sẽ chuyển sang status = TBD trên LMS (team sẽ chốt lại phương án sau)
  - Trạng thái hiển thị trên app Cake: Tạm khóa
  - Trạng thái trả API get-loan-detail cho đối tác là LOAN_LOCK → nhưng gọi sang thì sẽ trả lỗi, không phát sinh giao dịch disbursement
- Sau 30 ngày

  - Nếu ví có toàn bộ dư nợ = 0: thực hiện đóng ví tự động
  - Nếu ví có toàn bộ dư nợ khác 0:

    - Chuyển status sang TBD trên LMS
    - Cho phép KH vào app cake để tất toán như luồng Paylater hiện tại
    - **Bắn sms** cho KH như sau: Ví trả sau MWG của bạn chưa tất toán tự động thành công và tài khoản vẫn còn dư nợ. Vui lòng vào ứng dụng Cake by VPBank để hoàn tất việc tất toán.

**Note**: Toàn bộ dư nợ = gốc trong hạn + lãi trong hạn + gốc quá hạn + lãi quá hạn + phí phạt + phí sử dụng dịch vụ (nếu có)
```

*Đáng học*: tách AC khỏi ticket mẹ thì **giữ nguyên số AC cũ** (`Ac3`) và ghi rõ
*"Tách Ac này ra ticket riêng"* — truy ngược được. Chỗ chưa chốt ghi thẳng `TBD`
kèm *"team sẽ chốt lại phương án sau"*, không bịa. Nội dung SMS chép nguyên văn.

### 7.6 Task — nhờ việc có mốc thời gian

> **PL-14611** · `Datanest - Bật tắt datanest gateway`

```markdown
Context:
Bên datanest họ tắt server để chuyển đổi thiết bị
Từ 22:00 ngày 28/09/2026 đến 02:00 ngày 29/09/2026.
Todo:
Nhờ team hỗ trợ tắt service datanest bên mình trong khung giờ này để tránh ảnh hưởng đến KH ạ
```

*Đáng học*: Task thì `Context:` / `Todo:` viết thường, không in đậm, không có dòng
trống giữa nhãn và nội dung. Mốc thời gian ghi đủ ngày + giờ. Lý do (*"để tránh
ảnh hưởng đến KH"*) nằm trong câu nhờ việc.

### 7.7 Task — hạ tầng / alert

> **PL-14724** · `[Alert] - No traffic on API client-create (Critical channel)`

```markdown
Mô tả:
Cần dựng alert rule trên Grafana để phát hiện trường hợp không có request nào gọi vào API client-create trong một khoảng thời gian X phút, theo từng product/partner. Đây là dấu hiệu nghi ngờ downtime, lỗi phía partner/client hoặc đứt luồng onboarding.
Alert này gửi vào channel Critical riêng, tách biệt với channel alert hiện tại (group chat team).

Phạm vi: API client-create, tính riêng theo từng product/partner

Cách tính
- request_count: tổng số request gọi API client-create (tính mọi response, không loại trừ status code) của từng product, trong cửa sổ {interval} phút gần nhất
- expr: request_count == 0 trong {interval}

Cấu hình theo product

| Product | Interval (không có request) | Severity | Channel |
| --- | --- | --- | --- |
| Viettel Cashloan | 10 phút | 🚨 Critical | Critical channel (mới) |
| ZLP Cashloan | 20 phút | 🚨 Critical | Critical channel (mới) |
| VDS Paylater | 20 phút | 🚨 Critical | Critical channel (mới) |
| ZLP Payday | 20 phút | 🚨 Critical | Critical channel (mới) |

Điều kiện resolve
- Có ít nhất 1 request gọi API client-create của product tương ứng → alert tự resolve và gửi thông báo resolved vào cùng channel

Quy tắc đặt tên alert
Format: <Layer>_<Scope>_<Signal>_<Condition>
Ví dụ: API_ClientCreate_Traffic_NoRequest

Nội dung thông báo (message template)
Title: [🚨 Critical] No request on client-create ({product}) in {interval}
Content:
No request to client-create for {product} in the last {interval}.
Possible downtime / partner-side failure / onboarding flow broken.
product: {product}
api: {api}
last_request_at: {last_request_time}
Link: <dev_define_grafana_link>

Ví dụ thực tế:
[🚨 Critical] No request on client-create (Viettel Cashloan) in 10m
No request to client-create for Viettel Cashloan in the last 10m.
Possible downtime / partner-side failure / onboarding flow broken.
product: viettel_cashloan
api: <dev_define_api_path>
last_request_at: 2026-10-02 10:30:00
Link: <dev_define_grafana_link>

Acceptance Criteria:
- Tạo mới Critical channel riêng và cấu hình contact point trên Grafana; alert này không gửi vào channel alert hiện tại
- 4 alert rule tính độc lập theo từng product: Viettel Cashloan (10 phút), ZLP Cashloan (20 phút), VDS Paylater (20 phút), ZLP Payday (20 phút)
- Alert bắn khi request_count = 0 trong đúng interval cấu hình của product; có request trở lại thì alert resolve
- Interval cấu hình được theo từng product (dễ thay đổi X phút về sau)
- Message alert hiển thị đúng format, đủ thông tin: product, api, interval, thời điểm request cuối, link Grafana

Lưu ý/Open questions:
- Dev xác nhận path API client-create chính xác và cách phân biệt product (product code / partner header)
- Cân nhắc khung giờ traffic thấp (ban đêm) có thể gây false alarm → xác nhận có cần giới hạn giờ hoạt động của alert không
```

*Đáng học*: Task hạ tầng thì viết đủ như Story. Có **template** (`{product}`,
`{interval}`) rồi **ví dụ thực tế đã điền** ngay bên dưới — dev không phải đoán.
Chỗ chưa chắc ghi vào `Lưu ý/Open questions` chứ không chốt bừa.
Chỗ dev tự quyết ghi `<dev_define_grafana_link>`.

### 7.8 Bug

> **PL-11977** · `VIETTEL CASHLOAN - CHECK GIẢI NGÂN` · label `system_issue`

```markdown
Thông tin KH:
Loan ID: <loan_id>
Phone: <sđt>
LoanUpdateDisburseStatus
Success
status: DISBURSE_SUCCESS amount: 3000000 disburse date 2026-03-05
{"success":true,"message":"Success"}
05-03-2026 09:50:19

VDS đã update disburse sang Cake nhưng khoản vay vẫn treo ở trạng thái User-sign tại Cake. Nhờ Tech xử lý nhé.
```

*Đáng học*: định danh lên đầu, log dán **nguyên văn kèm timestamp**, câu cuối nêu
mâu thuẫn (*"đối tác báo thành công nhưng Cake vẫn treo"*) rồi mới nhờ. Không suy
đoán nguyên nhân.

### 7.9 Initiative và Epic

> **PL-12531** · Initiative · `MBF_cashloan - My Mobifone Cashloan`

```markdown
**API spec:** <link SharePoint>

**Ticket:** https://cakedigitalbank.atlassian.net/browse/PL-12531

**Confluence:** https://cakedigitalbank.atlassian.net/wiki/spaces/PL/pages/1861025824

**Figma**: <link Figma>

**Nền tảng:** DOP

**Giải ngân:** Cake Casa

**NFC**: SDK NFC
```

> **PL-14293** · Initiative · `LCP_paylater - Long Châu Paylater`

```markdown
Figma: <link Figma>

- Onboarding: DOP paylater

  - SDK nfc tích hợp trên DOP
- Spending: Product catalog

  - có thêm phần trả góp
- Management: Product catalog

  - Trả góp
  - Quản lý lịch sử giao dịch
```

> **PL-13049** · Epic · `BE_payday - Setup & Onboarding`

```markdown
## Epic 1 — Setup & Onboarding

Cover toàn bộ luồng setup product config và onboarding cho sản phẩm BE Payday:

- Story 1.1: Setup product code và cấu hình tài chính
- Story 1.2: API generate-webview/onboarding
- Story 1.3: Onboarding source & App ID
- Story 1.4: PreCheck (PLO board)
```

*Đáng học*: Initiative là **bảng tra cứu đầu mối** — ba đặc điểm quyết định mọi
thứ phía sau (`Nền tảng` / `Giải ngân` / `NFC`) cộng link tài liệu. Không có AC,
không mô tả nghiệp vụ. Epic thì hoặc liệt kê Story con, hoặc chia theo module.

---

## 8. Template copy-paste

### Story nghiệp vụ

```markdown
**Context:** <lý do — kinh doanh, kỹ thuật, hay yêu cầu đối tác>

**Acceptance Criteria:**

**Ac1**: <điều kiện>

- <chi tiết>
- <chi tiết>

**Ac2**: <điều kiện>

| **Hạng mục** | **Hiện tại** | **Điều chỉnh** |
| --- | --- | --- |
|  |  |  |

Note: <ràng buộc, edge case, hoặc điểm PO cần setup trước>
```

### Story API

```markdown
**Context:** Base trên ticket <link>

**Acceptance Criteria:**

- <API làm gì>
- <ai gọi, khi nào>

**API URL:** {path}/<endpoint>

---

#### **API request**

| **Field** | **Type** | **Label** | **Description** | **Note** |
| --- | --- | --- | --- | --- |
|  | string | required |  | tương tự base |

---

#### **API response**

| **Field** | **Type** | **Description** | **Note** |
| --- | --- | --- | --- |
| success | bool | Success |  |
| message | string | Message of response |  |
| code | int32 | Status code. Follow definition of status code |  |
| response_id | string | Response ID of each request |  |
| timestamp | string | Time when the response was generated (ISO 8601) |  |
| data | object | Follow the data response below |  |
| └─ <field> | string |  |  |
```

### Task

```markdown
Context:
<bối cảnh, mốc thời gian nếu có>

Todo:
<việc cần làm>
```

### Bug

```markdown
Thông tin KH:
Loan ID: <loan_id>
Phone: <sđt>
<log hoặc response lỗi nguyên văn, kèm timestamp>

<hiện tượng: bên nào báo gì, Cake đang ở trạng thái nào>
Nhờ Tech kiểm tra và xử lý
```

### Initiative

```markdown
**API spec:** <link>

**Confluence:** <link>

**Figma**: <link>

**Nền tảng:** <DOP | Native | App Cake>

**Giải ngân:** <Cake Casa | TKBĐTT tại đối tác>

**NFC**: <SDK NFC | Không yêu cầu>
```

---

## 9. Checklist trước khi tạo ticket

1. Title có `product_id` đúng chính tả hệ thống chưa?
2. Story có Acceptance Criteria chưa? Có từ 2 điều kiện thì đã đánh `Ac1`/`Ac2` chưa?
3. Con số nào thay đổi — đã ghi cả **Hiện tại** lẫn **Điều chỉnh** chưa?
4. Logic phân nhánh đã có nhánh `Còn lại =>` chưa?
5. Ticket API — đã ghi rõ **khác gì so với base** chưa? Field bỏ đã gạch `~~` kèm lý do chưa?
6. Đã gán parent Epic, fix version, components chưa?
7. Có ticket cũ liên quan không — đã link URL đầy đủ chưa?
8. Có điểm nào PO phải setup trước khi dev làm (app-id, mapping, config) — đã ghi `Note` chưa?
9. Chỗ chưa chốt đã ghi `TBD` hoặc `Lưu ý/Open questions` chưa, hay đang bịa cho đủ?
10. Bug — đã có ít nhất một định danh tra được (`loan_code` / `loan_id` / `trace_id`) chưa?

---

## 10. Những thứ **không** làm

- Không viết "As a user, I want…" — không phải style ở đây.
- Không xoá hẳn field khi sửa spec API; gạch `~~` và giải thích ở cột Note.
- Không viết tiếng Việt không dấu.
- Không dịch thuật ngữ kỹ thuật sang tiếng Việt (giữ `disbursement`, `toggle`, `segment`).
- Không viết Acceptance Criteria cho Epic/Initiative.
- Không mô tả lại toàn bộ API đã có ở sản phẩm base — chỉ mô tả phần khác.
- Không ghi con số mới mà bỏ con số cũ — mất khả năng đối chiếu khi Confluence tụt hậu
  (xem `lich-su-quyet-dinh.md` để biết hậu quả).
- Không đoán nguyên nhân trong ticket Bug; dán bằng chứng rồi để Tech kết luận.
- Không đưa PII thật (tên, sđt, CCCD, STK) vào ticket mẫu hay tài liệu; ticket Bug thật
  thì được, nhưng đừng sao chép sang KB.
