# `base2/custom/` — fragment ngoài base

Hợp đồng đối tác đã cố định, **không** đồng bộ về base được. Mỗi file là một OpenAPI
rời rạc, builder merge lên trên spec đã dựng từ base:

| Khoá trong fragment | Builder làm gì |
|---|---|
| `paths` | ghi đè theo key (endpoint cùng tên trong base bị thay) |
| `components.parameters` / `components.schemas` | merge theo key |
| `x-error-tables.<tên>` | append vào `info.description` sau `## Error Codes` |
| `x-fragment` | metadata: `name`, `applies-to`, `overrides-paths`, `adds-paths`, `adds-tags` |

| File | Dùng cho | Nội dung |
|---|---|---|
| `zlp_bankconnector.yaml` | `zlp_cashloan`, `zlp_payday` | `/partner-disburse-request` + `/partner-disburse-status` theo chuẩn ZaloPay bankconnector (`fnc`, `partnerId`, `bankTransId`, `data` string-json; ký trong body) + bảng error `resultCode`/`returnCode` |
| `zlp_partner_update_status.yaml` | `zlp_cashloan`, `zlp_payday` | `/partner-update-status` header `x-client-key` + `x-sign`, response `return_code`/`sub_return_code` |
| `viettel_legacy_loan_id.yaml` | `pd_viettel` | `/get-loan-code-from-loan-id` — bắc cầu `loan_id` (DOP cũ) → `loan_code` (Native) |

## Không có fragment ở đây

`be_cashloan/` và `dvs/` **không** dựng từ base — toàn bộ endpoint là riêng
(`create-link`/`create-token`/`get-be-score`; `cake-proxy/cash-collection/*`).
Hai spec đó khai `model: custom` trong manifest và giữ nguyên là partner spec độc lập;
builder chỉ dùng lại phần môi trường / error code chung và chạy `validate` trên chúng.

## Thêm fragment mới

Chỉ khi hợp đồng **thật sự** do đối tác cố định và Cake không đổi được. Nếu chỉ là
"partner này không dùng endpoint đó" hoặc "field này khác kiểu" → tắt/override trong
manifest của partner, không tạo fragment.
