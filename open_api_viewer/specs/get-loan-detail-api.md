# API `get-loan-detail`

> Nguồn: tổng hợp từ các doc base — `base_dop_full.yaml`, `base_dop_paylater.yaml`, `base_product_native.yaml` (thư mục `tools/open_api_viewer/specs/base`).

Truy vấn thông tin chi tiết một khoản vay (trạng thái, số tiền phê duyệt, dư nợ, kỳ hạn thanh toán...). Dùng chung cho 3 nhóm sản phẩm: **Cashloan**, **Payday**, **Paylater** — nhưng mỗi nhóm trả về tập field khác nhau tùy đặc thù nghiệp vụ.

## Endpoint

```
POST /get-loan-detail
```

| Thuộc tính | Giá trị |
| --- | --- |
| operationId | `getLoanDetail` |
| Tag | Loan Info |
| Auth | Ký signature RSA-SHA256 (`rawBody = body + partner_key` → sha256 → RSA sign PKCS1v15 → base64) |

### Headers

| Header | Bắt buộc | Mô tả |
| --- | --- | --- |
| `Content-Type` | ✅ | `application/json; charset=utf-8` |
| `partner` | ✅ | `CAKE_PARTNER_ID` được cấu hình theo môi trường |
| `signature` | ✅ | Chữ ký RSA-SHA256 của request body |

## Request Body

Giống nhau cho cả 3 sản phẩm.

| Field | Type | Bắt buộc | Mô tả | Ví dụ |
| --- | --- | --- | --- | --- |
| `loan_code` | string | ✅ | Mã khoản vay, lấy từ API `/loan-register` | `"u8123123Sjsdb"` |
| `phone_number` | string | ✅ | SĐT khách hàng | `"0345678900"` |

```json
{
  "loan_code": "u8123123Sjsdb",
  "phone_number": "0345678900"
}
```

## Response

### Wrapper chung (`BaseResponse`)

| Field | Type | Mô tả | Ví dụ |
| --- | --- | --- | --- |
| `success` | boolean | Kết quả xử lý | `true` |
| `code` | integer | Mã trạng thái hệ thống | `1` |
| `message` | string | Thông báo phản hồi | `"Thành công"` |
| `response_id` | string | Mã định danh duy nhất của response | `"849KTQG7SQWLWQW5"` |
| `timestamp` | string (date-time) | Thời gian phản hồi (ISO 8601) | `"2025-11-03T07:00:00+07:00"` |

### `loan_account_status` (áp dụng chung 3 sản phẩm)

| Status | Mô tả |
| --- | --- |
| `LOAN_UNKNOWN` | Không xác định |
| `LOAN_INIT` | Mới khởi tạo, chưa nộp hồ sơ |
| `LOAN_REVIEWING` | Đang thẩm định |
| `LOAN_REJECT` | Hồ sơ bị từ chối |
| `LOAN_APPROVE` | Hồ sơ đã được phê duyệt |
| `LOAN_EXPIRED` | Hồ sơ hết hạn (7 ngày) |
| `LOAN_CANCEL` | Hồ sơ bị hủy |
| `LOAN_SIGNED` | Đã ký hợp đồng, đang giải ngân |
| `LOAN_ACTIVE` | Đã giải ngân thành công |
| `LOAN_LOCK` / `LOAN_LOCKED` | Khoản vay bị khóa, chỉ áp dụng cho Paylater |
| `LOAN_CLOSE` | Đã tất toán |

---

## 1. Field dùng chung cho cả 3 sản phẩm

Các field này có mặt trong response của **Cashloan, Payday, và Paylater**.

| Field | Type | Mô tả | Ví dụ |
| --- | --- | --- | --- |
| `loan_account_status` | string | Trạng thái tài khoản vay (bảng trên) | `"LOAN_ACTIVE"` |
| `contract_id` | string | Mã hợp đồng, dùng cho nhắc nợ / đối soát | `"1234567890"` |
| `loan_alias` | string | Mã thanh toán | `"G4JH5R"` |
| `contract_url` | string | URL hợp đồng đã ký song phương, **hết hạn sau 1h** | `"https://storage.googleapis.com/..."` |
| `full_name` | string | Họ tên khách hàng | `"Nguyễn Hoàng Sơn"` |
| `document_id` | string | Số CCCD/CMND | `"075099093845"` |
| `approved_amount` | string | Số tiền được phê duyệt (VNĐ) | `"12000000"` |
| `approved_term` | string | Thời hạn vay được phê duyệt | `"12"` |
| `disburse_amount` | string | Cashloan/Payday: số tiền **đã giải ngân**. Paylater: **hạn mức đã sử dụng** (không có sự kiện giải ngân lump-sum) | `"12840000"` |
| `interest_rate` | string | Lãi suất | `"43"` |
| `principle_balance` | string | Dư nợ gốc khả dụng còn lại | `"12640000"` |
| `interest_balance` | string | Dư nợ lãi phát sinh | `"197494"` |
| `due_date` | string (date) | Ngày đến hạn thanh toán gần nhất (`yyyy-mm-dd`) | `"2025-06-27"` |
| `day_arrears` | string | Số ngày quá hạn | `"191"` |
| `total_payment_amount` | string | Tổng tiền KH có thể/cần thanh toán | `"15331759"` |

---

## 2. Field riêng cho **Cashloan** và **Payday** (không có ở Paylater)

Lý do: Cashloan/Payday là vay giải ngân **lump-sum một lần** (có ngày giải ngân cụ thể, có bảo hiểm khoản vay, có phạt trễ hạn tính riêng gốc/lãi). Paylater là hạn mức tín dụng trả sau (revolving), không phát sinh các khái niệm này.

| Field | Type | Mô tả | Ví dụ |
| --- | --- | --- | --- |
| `loan_insurance` | string | Số tiền bảo hiểm khoản vay | `"840000"` |
| `disburse_date` | string (date) | Ngày giải ngân (`yyyy-mm-dd`) | `"2025-06-03"` |
| `penalty_principal_balance` | string | Lãi phạt gốc quá hạn | `"2494265"` |
| `penalty_interest_balance` | string | Lãi phạt lãi quá hạn | `"0"` |
| `paid_amount` | string | Số tiền KH đã thanh toán (lũy kế) | `"200000"` |

---

## 3. Field riêng cho **Cashloan** và **Paylater** (không có ở Payday)

Lý do: Cashloan/Paylater trả góp theo **kỳ hạn** (payment_period) nên tách rõ số tiền đến hạn trong kỳ (monthly), số tiền quá hạn bắt buộc phải trả (overdue), và số dư trả trước. Payday là vay ứng lương ngắn hạn, trả 1 lần khi đáo hạn, không chia kỳ nên không có các field này (chỉ dùng `total_payment_amount` chung).

| Field | Type | Mô tả | Ví dụ |
| --- | --- | --- | --- |
| `payment_period` | string | Kỳ thanh toán số | `"12"` |
| `monthly_payment_amount` | string | Số tiền KH có thể thanh toán sớm (trong kỳ) | `"0"` |
| `overdue_payment_amount` | string | Số tiền KH buộc phải thanh toán (đã quá hạn) | `"15331759"` |
| `prepayment_amount` | string | Số tiền KH đã thanh toán dư/trước trong kỳ | `"0"` |

---

## Tổng hợp field theo từng sản phẩm

| Field | Cashloan | Payday | Paylater |
| --- | --- | --- | --- |
| Field chung (mục 1) | ✅ | ✅ | ✅ |
| `loan_insurance`, `disburse_date`, `penalty_principal_balance`, `penalty_interest_balance`, `paid_amount` | ✅ | ✅ | ❌ |
| `payment_period`, `monthly_payment_amount`, `overdue_payment_amount`, `prepayment_amount` | ✅ | ❌ | ✅ |

→ **Cashloan** nhận đầy đủ tất cả field (union của cả 2 nhóm). **Payday** và **Paylater** mỗi bên chỉ nhận 1 nhóm field riêng, cộng với field chung.

---

## Ví dụ Response theo từng sản phẩm

### Cashloan

```json
{
  "success": true,
  "code": 1,
  "message": "Thành công",
  "response_id": "849KTQG7SQWLWQW5",
  "timestamp": "2025-11-03T07:00:00+07:00",
  "data": {
    "loan_account_status": "LOAN_ACTIVE",
    "contract_id": "1234567890",
    "loan_alias": "G4JH5R",
    "contract_url": "https://storage.googleapis.com/...",
    "full_name": "Nguyễn Hoàng Sơn",
    "document_id": "075099093845",
    "approved_amount": "12000000",
    "approved_term": "12",
    "loan_insurance": "840000",
    "disburse_amount": "12840000",
    "disburse_date": "2025-06-03",
    "interest_rate": "43",
    "principle_balance": "12640000",
    "interest_balance": "197494",
    "penalty_principal_balance": "2494265",
    "penalty_interest_balance": "0",
    "payment_period": "12",
    "due_date": "2025-06-27",
    "day_arrears": "191",
    "monthly_payment_amount": "0",
    "overdue_payment_amount": "15331759",
    "total_payment_amount": "15331759",
    "paid_amount": "200000",
    "prepayment_amount": "0"
  }
}
```

### Payday

Không có `payment_period`, `monthly_payment_amount`, `overdue_payment_amount`, `prepayment_amount` — chỉ có `total_payment_amount` cho tổng tiền cần trả 1 lần khi đáo hạn.

```json
{
  "success": true,
  "code": 1,
  "message": "Thành công",
  "response_id": "849KTQG7SQWLWQW6",
  "timestamp": "2025-11-03T07:00:00+07:00",
  "data": {
    "loan_account_status": "LOAN_ACTIVE",
    "contract_id": "2234567891",
    "loan_alias": "H5KJ6S",
    "contract_url": "https://storage.googleapis.com/...",
    "full_name": "Trần Thị Bích",
    "document_id": "079099012345",
    "approved_amount": "5000000",
    "approved_term": "1",
    "loan_insurance": "0",
    "disburse_amount": "5000000",
    "disburse_date": "2025-06-10",
    "interest_rate": "18",
    "principle_balance": "5000000",
    "interest_balance": "45000",
    "penalty_principal_balance": "0",
    "penalty_interest_balance": "0",
    "due_date": "2025-07-10",
    "day_arrears": "0",
    "total_payment_amount": "5045000",
    "paid_amount": "0"
  }
}
```

### Paylater

Không có `loan_insurance`, `disburse_date`, `penalty_principal_balance`, `penalty_interest_balance`, `paid_amount` — thay vào đó dùng `payment_period`, `monthly_payment_amount`, `overdue_payment_amount`, `prepayment_amount` để mô tả trả góp theo kỳ trên hạn mức tín dụng.

```json
{
  "success": true,
  "code": 1,
  "message": "Thành công",
  "response_id": "849KTQG7SQWLWQW7",
  "timestamp": "2025-11-03T07:00:00+07:00",
  "data": {
    "loan_account_status": "LOAN_ACTIVE",
    "contract_id": "3234567892",
    "loan_alias": "K9LM2P",
    "contract_url": "https://storage.googleapis.com/...",
    "full_name": "Lê Văn Đức",
    "document_id": "081099054321",
    "approved_amount": "8000000",
    "approved_term": "6",
    "disburse_amount": "3500000",
    "interest_rate": "35",
    "principle_balance": "3500000",
    "interest_balance": "61250",
    "payment_period": "3",
    "due_date": "2025-06-27",
    "day_arrears": "0",
    "monthly_payment_amount": "600000",
    "overdue_payment_amount": "0",
    "total_payment_amount": "600000",
    "prepayment_amount": "0"
  }
}
```

## Error Codes liên quan

| Code | Message |
| --- | --- |
| `1` | Thành công |
| `200000` | Chữ ký không hợp lệ |
| `200001` | Mã đối tác không hợp lệ |
| `200003` | Request ID không hợp lệ (NID hoặc Phone không khớp) |
| `400001` | Không có thông tin khoản vay (Sản phẩm không tồn tại `loan_code` này) |
| `500013` | Trường dữ liệu không hợp lệ: `{{field_name}}` - `{{field_type}}` |
| `500014` | Trạng thái khoản vay không hợp lệ (đang không hỗ trợ) |
