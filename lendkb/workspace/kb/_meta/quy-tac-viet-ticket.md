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

> **Cách dùng**: đọc mục 1 (title) + mục 2 (cấu trúc theo loại) + mục 7 (template).
> Các mục còn lại tra khi cần.

---

## 1. Đặt title

### Công thức

```
[<tag>] <Tên sản phẩm hoặc scope> - <Việc cần làm>
```

Dấu `[]` **không bắt buộc**: 245/837 ticket dùng 1 cặp, 351 dùng 2 cặp, 205 không
dùng cặp nào. Khi không dùng `[]` thì mở đầu bằng `product_id` rồi ` - `.

### Hai biến thể, chọn theo ngữ cảnh

| Biến thể | Khi nào | Ví dụ |
|---|---|---|
| `PRODUCT_ID - Việc` | Ticket thuộc một sản phẩm cụ thể | `LCP_paylater - API get-loan-detail` · `VNP_cashloan Điều chỉnh lãi suất cho vay` |
| `[Tag] Việc` | Ticket cắt ngang nhiều sản phẩm, hoặc theo mảng kỹ thuật | `[DOP+Native] Auto reject eKYC` · `[Techdebt] Make Lending great again` · `[Alert] - No traffic on API client-create` |

Ghép được cả hai khi cần thu hẹp phạm vi: `[MWG-PL][QTV][API external] - API generate-webview/payment-request`.

### Tag hay dùng

- **Kênh / nền tảng**: `API`, `API internal`, `API external`, `API partner`, `Portal`, `App`, `DOP`, `MockAPI`, `CORE`, `LMS`
- **Đối tác + sản phẩm**: `MWG-PL`, `ZLP-PD`, `ZLP-CL`, `Cake-PD`, `VNPay-PD`, `VDS-O2O`, `QTV`
- **Mảng việc**: `Techdebt`, `Alert`, `Ops`, `Voucher`, `Challenge`, `Base product`, `Transaction Banking`, `Sale App`, `Security`

### Theo loại ticket

| Loại | Công thức | Ví dụ thật |
|---|---|---|
| **Initiative** | `<PRODUCT_ID> - <Tên sản phẩm đầy đủ>` | `LCP_paylater - Long Châu Paylater` · `[VPO_cl_pension] - Vay hưu trí` |
| **Epic** | `<PRODUCT_ID> - <Giai đoạn/khối việc>` | `Fiza payday - LOS, Precheck & CORE` · `MBF_cashloan - Setup & Onboarding DOP` · `LCP_paylater - system flow` |
| **Story** | `<PRODUCT_ID> - <Thay đổi cụ thể>` | `MWG_paylater - Luồng xử lý đóng ví` · `PD_Viettel - Chặn ký hợp đồng khi KH chưa có NFC` |
| **Story API** | `<PRODUCT_ID> - API <tên endpoint>` | `LCP_paylater - API get-loan-detail` · `LCP_paylater - API generate-webview/onboarding & onboarding & callback status` |
| **Task** | `[<Tag>] <Việc hành chính/hạ tầng>` | `[DOP] - Bỏ Time to leave TTL ở token DOP` · `LCP_paylater - Kết nối stage` |
| **Bug** | `[Ops] <Sản phẩm> <triệu chứng>` hoặc `<SẢN PHẨM> - <TRIỆU CHỨNG VIẾT HOA>` | `[Ops] Be cashloan lỗi create-token` · `VIETTEL PAYDAY - KIỂM TRA TRẠNG THÁI KHOẢN VAY` |

**Bộ chia Epic chuẩn khi mở sản phẩm mới** (lặp lại ở Fiza, MBF, LCP, BE):
`Onboarding Process & APIs Integration` · `LOS, Precheck & CORE` · `Mobile App & Portal` ·
`Loan Management & Repayment` · `Setup & Onboarding DOP` · `User flow` · `system flow`.

### Quy tắc tên sản phẩm

Viết đúng `product_id` như trong hệ thống, **không** phiên dịch. Bốn kiểu tên cùng tồn tại —
xem `quy-tac-dat-ten.md`. Dạng hay dùng nhất trong title: `LCP_paylater`, `VPO_cl_pension`,
`MWG_cl_online`, `PD_Viettel`, `VDS_paylater_epass`.

---

## 2. Cấu trúc description theo loại ticket

### 2.1 Story — khung chuẩn

Hai nhãn in đậm, **theo đúng thứ tự này** (217/217 ticket có cả hai đều đặt Context trước):

```
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

**Nhãn phụ** (dùng khi cần, không bắt buộc):
`**Yêu cầu**:` · `**Mô tả:**` · `**Objective**` · `**Constrains:**` ·
`**Pre-condition**` · `**Note**:` · `**To-do**` · `Edge case:` · `**BRD**` (link).

**Đánh số AC**: dùng `**Ac1**`, `**Ac2**` — 163/704 Story (23%) đánh số. Đánh số khi có
từ 2 điều kiện độc lập trở lên; một điều kiện thì gạch đầu dòng thẳng.
Viết `Ac1` (chữ thường `c`) là dạng phổ biến nhất; `AC1` cũng dùng, giữ nhất quán trong một ticket.

**Context viết gì** — mẫu câu hay dùng:

- Lý do kinh doanh: *"Nhằm đảm bảo profit của sản phẩm, trong bối cảnh chi phí vốn đang tăng mạnh"*
- Lý do kỹ thuật: *"Face scan model đang load lâu trên DOP, hiện FE đã benchmark như sau"*
- Yêu cầu từ đối tác: *"Zalopay mong muốn nhận được các lý do từ chối của CAKE thông qua API"*
- Nối tiếp ticket cũ: *"Base trên ticket payday PL-13600"* / *"Refer ticket: PL-13264"*
- So sánh hiện trạng: *"Hiện tại đang trả lỗi như sau: …"*

Pattern `Hiện tại → Điều chỉnh` dùng ở 55 ticket; viết thành hai dòng in đậm hoặc hai
cột bảng. Đây là cách diễn đạt mặc định khi thay đổi một con số đã có.

### 2.2 Story API — khung riêng

```
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

Quy ước trong bảng API:

- Field lồng nhau: tiền tố `└─ ` (ví dụ `└─ loan_account_status`)
- Field **bỏ đi** so với base: gạch ngang `~~└─ disburse_date~~` + cột Note ghi lý do
  (*"Paylater không có field này"*) — 110/704 ticket dùng `~~`. **Không xoá hẳn dòng**,
  để dev đối chiếu được với base
- Field **giữ nguyên** so với base: cột Note ghi `tương tự base`
- Enum liệt kê ngay trong ô Description, mỗi giá trị một dòng bằng `<br>`,
  dạng `LOAN_ACTIVE: Khoản vay của KH đã được giải ngân thành công`
- Công thức tính đặt trong cột Note: `= { prin_not_d + prin_d + prin_over_d }`
- `required` / `optional` đặt ở cột **Label**, không đặt trong Description

### 2.3 Task

Ngắn, hướng hành động. Không cần Acceptance Criteria.

```
Context:
<bối cảnh — thường là một bên thứ ba yêu cầu, kèm mốc thời gian>

Todo:
<việc nhờ team làm>
```

Hoặc gọn hơn nữa, một câu: *"Đăng ký domain lending.cake.vn để đối tác xem API specs"*.

Task hạ tầng/alert thì viết đủ: **Mô tả** → **Phạm vi** → **Cách tính** (có `expr:`) →
**Cấu hình theo product** (bảng) → **Điều kiện resolve** → **Quy tắc đặt tên** →
**Nội dung thông báo**.

Task kết nối đối tác thì dùng bảng `Key | Value | Description` với
`CAKE_API_URL`, `CAKE_PARTNER_ID`, `CAKE_PARTNER_KEY`, `CAKE_IP_ADDRESS`,
`PARTNER_API_URL`, `PARTNER_IP_ADDRESS`, `PARTNER_PUBLIC_KEY`.

### 2.4 Bug

Thường chuyển tiếp từ Ops. Thứ tự: **định danh → hiện tượng → bằng chứng → nhờ ai**.

```
<Thông tin định danh: sđt / loan_code / loan_id / CCCD>
<Trạng thái hệ thống: Cake status: USER_SIGN>
<Mô tả hiện tượng>
<Log hoặc response lỗi, dán nguyên văn>
Nhờ Tech kiểm tra và xử lý
```

Luôn kèm **ít nhất một định danh tra được**: `loan_code` (`CAKECLZLP920969988`),
`loan_id`, hoặc `trace_id`. Kèm `Note:` nếu stage không tái hiện được.
Khi đã điều tra thì thêm dòng `Kiểm tra lần 1:` + kết luận.

### 2.5 Epic và Initiative

**Mô tả để trống là bình thường** — 61/108 Epic và 1/18 Initiative không có mô tả.
Epic/Initiative là vỏ chứa; nội dung nằm ở Story con. Nếu viết thì chỉ 2-5 dòng
phạm vi, không viết Acceptance Criteria.

---

## 3. Giọng văn

- **Tiếng Việt có dấu** cho câu văn; **giữ nguyên tiếng Anh** cho thuật ngữ kỹ thuật
  và tên trường: `onboarding_source`, `product_code`, `disbursement`, `clearing`,
  `drop off`, `segment`, `toggle`, `whitelist`.
- **Viết tắt quen dùng, không giải thích lại**: KH (khách hàng), NTB, ETB, GD (giao dịch),
  LSGD (lịch sử giao dịch), TKBĐTT, sp (sản phẩm), đtac/đối tác, sđt, GTTT, DPD, MAD, COF, IR.
- **Dùng `→` thay cho "dẫn đến"**: *"chi phí vốn tăng → nâng lãi suất để cải thiện revenue"*.
- **Dùng `=` cho phép gán**: `product_code = CAKEM01`, `onboarding_source = api_fiza_payday`.
- Câu mệnh lệnh cụt, bỏ chủ ngữ: *"Điều chỉnh lãi suất sản phẩm"*, *"Bỏ Time to leave TTL ở token DOP"*.
- Nhờ team khác thì viết lịch sự có "ạ/nhé": *"Nhờ team hỗ trợ tắt service datanest bên mình trong khung giờ này để tránh ảnh hưởng đến KH ạ"*.
- **Không** viết user story kiểu "As a … I want … so that" — chỉ 17/704 ticket dùng,
  và đó là ticket do người khác đặt khung.

---

## 4. Bảng — dùng nhiều, dùng đúng

496/704 Story (70%) có ít nhất một bảng. Dùng bảng khi:

| Tình huống | Cột |
|---|---|
| Thay đổi một con số | `Hạng mục \| Hiện tại \| Điều chỉnh` |
| Spec API | `Field \| Type \| Label \| Description \| Note` |
| Cấu hình theo segment/sản phẩm | mỗi segment một cột, mỗi thông số một dòng |
| Ma trận service × flow | `Flow \| Service \| App-id \| cus-user-ID \| Source \| Note` |

Header bảng in đậm: `| **Field** | **Type** | ... |`.
Xuống dòng trong ô bằng `<br>`, không để ô rỗng mà ghi `-` nếu không áp dụng.

---

## 5. Trường Jira kèm theo

| Trường | Quy ước | Số liệu |
|---|---|---|
| **Parent** | Story luôn treo dưới Epic | 585/711 Story có parent |
| **Fix version** | Gán sprint ngay khi tạo, dạng `Sprint 194 - Lending` | 636/711 Story có |
| **Components** | 1-2 component: loại sản phẩm (`Cashloan`/`Paylater`/`Payday`) + đối tác (`MWG`, `Viettel Money`, `VNPAY`, `Zalopay`, `BeGroup`, `Vnpost`, `Cake`) | |
| **Labels** | `TC_Covered` (QA đã có test case) · `PO_Covered` · `adhoc` · `Change_Config` · `off-sprint` · `Biz_uat` / `Fin_uat` · `Production_Bug` + component `Production Bug` cho bug prod · `system_issue` · `alert-metrics` | `TC_Covered` 574 lần |
| **Priority** | Để `Medium` trừ khi có lý do | |

---

## 6. Tham chiếu chéo

- Link ticket liên quan bằng **URL đầy đủ**, không chỉ key:
  `https://cakedigitalbank.atlassian.net/browse/PL-13600`
- Ticket kéo data/hạ tầng thì link sang service desk:
  `https://internal.support.cake.vn/servicedesk/customer/portal/1/SVK-8659`
- Bảng BigQuery ghi đủ cả stage lẫn production:
  ```
  Staging: bef-cake-sandbox.feat_white_list_crc.tb_xsell_upsell_cashloan_data
  Production: bef-cake-prod.feat_white_list_crc.tb_xsell_upsell_cashloan_data
  ```
- Ảnh màn hình chèn ngay dưới AC tương ứng, kèm một dòng chú thích bên dưới
  (*"Portal ekyc detail - ekyc log - front side có ghi nhận onboarding_source"*).
  32% Story có ảnh.

---

## 7. Template copy-paste

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
<loan_code hoặc loan_id hoặc sđt>
Cake status: <TRẠNG_THÁI>
<hiện tượng KH/Ops gặp>

<log hoặc response lỗi nguyên văn>

Nhờ Tech kiểm tra và xử lý
```

---

## 8. Checklist trước khi tạo ticket

1. Title có `product_id` đúng chính tả hệ thống chưa?
2. Story có Acceptance Criteria chưa? Có từ 2 điều kiện thì đã đánh `Ac1`/`Ac2` chưa?
3. Con số nào thay đổi — đã ghi cả **Hiện tại** lẫn **Điều chỉnh** chưa?
4. Ticket API — đã ghi rõ **khác gì so với base** chưa? Field bỏ đã gạch `~~` kèm lý do chưa?
5. Đã gán parent Epic, fix version, components chưa?
6. Có ticket cũ liên quan không — đã link URL đầy đủ chưa?
7. Có điểm nào PO phải setup trước khi dev làm (app-id, mapping, config) — đã ghi `Note` chưa?
8. Bug — đã có ít nhất một định danh tra được (`loan_code` / `loan_id` / `trace_id`) chưa?

---

## 9. Những thứ **không** làm

- Không viết "As a user, I want…" — không phải style ở đây.
- Không xoá hẳn field khi sửa spec API; gạch `~~` và giải thích.
- Không viết tiếng Việt không dấu.
- Không dịch thuật ngữ kỹ thuật sang tiếng Việt (giữ `disbursement`, `toggle`, `segment`).
- Không viết Acceptance Criteria cho Epic/Initiative.
- Không ghi con số mới mà bỏ con số cũ — mất khả năng đối chiếu khi Confluence tụt hậu
  (xem `lich-su-quyet-dinh.md` để biết hậu quả).
- Không đưa PII thật (tên, sđt, CCCD, STK) vào ticket mẫu hay tài liệu; ticket Bug thật
  thì được, nhưng đừng sao chép sang KB.
