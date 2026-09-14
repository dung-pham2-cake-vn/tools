# `specs/base2/` — base superset

Thay cho 7 file trong `specs/base/`. Mỗi mô hình tích hợp giờ chỉ còn **một** file
chứa toàn bộ endpoint + field; spec gửi đối tác được **sinh ra** từ đây, không copy tay.

| File | Mô hình | Endpoint | Gộp từ |
|---|---|---|---|
| `base_native.yaml` | Native | 39 | `base_native` + `base_native_{cashloan,payday,paylater}` |
| `base_dop.yaml` | DOP (webview) | 25 | `base_dop_full` + `base_dop_paylater` |
| `base_collection.yaml` | Collection Reminder | 1 | `base_collection_reminder` (không có gì để gộp) |
| `custom/*.yaml` | fragment ngoài base | — | tách từ partner spec |

## Sản phẩm nằm ở đâu

Ba file `base_native_{cashloan,payday,paylater}.yaml` cũ chỉ khác nhau ở
`info.title` + ~15 dòng field trong `get-loan-detail` + enum `LOAN_LOCK`.
Giữ 3 file 1.700 dòng để chứa 20 dòng khác biệt là nguồn drift, nên phần khác biệt
đó chuyển thành **marker trên field**:

```yaml
predue_payment_amount:
  type: string
  description: "[CL] Số tiền KH có thể thanh toán sớm"
  x-product: [ cashloan ]            # ← máy đọc
loan_account_status:
  x-product-enum:
    LOAN_LOCK:   [ paylater ]
    LOAN_LOCKED: [ paylater ]
```

- `x-product` **thiếu** = field có ở cả 3 sản phẩm.
- Prefix `[CL]` / `[CL/PD]` / `[CL/PL]` / `[PL]` trong `description` là **bản cho người đọc**
  của cùng thông tin đó — sửa `x-product` thì sửa cả prefix.
- Builder lọc field theo `product` trong manifest của partner.

Tập field theo sản phẩm (nguồn: `specs/get-loan-detail-api.md` + đối chiếu 6 file base cũ):

| Nhóm field | cashloan | payday | paylater |
|---|:--:|:--:|:--:|
| chung (15 field) | ✅ | ✅ | ✅ |
| `loan_insurance`, `disburse_date`, `paid_amount` | ✅ | ✅ | ❌ |
| `penalty_principal_balance`, `penalty_interest_balance` | ✅ | ✅ | ✅ |
| `payment_period`, `prepayment_amount` | ✅ | ❌ | ✅ |
| `predue_payment_amount`, `due_payment_amount` | ✅ | ❌ | ❌ |
| `period_payment_amount` | ❌ | ❌ | ✅ |

## Quy tắc

- **Thay đổi dùng chung sửa ở đây**, rồi build lại partner spec. Không sửa partner spec cho
  thay đổi dùng chung (xem `CLAUDE.md` §3).
- Không xoá endpoint khỏi superset vì "partner này không dùng" — tắt trong manifest của partner.
- Field mới thuộc một sản phẩm: thêm vào superset kèm `x-product`, không tạo file base mới.
- `specs/base/` giữ nguyên để đối chiếu, và sẽ bỏ sau khi cả 11 partner đã build được từ `base2/`.

## Chênh lệch so với `base/` (có chủ ý)

| Chỗ | `base/` | `base2/` | Lý do |
|---|---|---|---|
| `/partner-disburse-status` | chỉ có ở 3 file `base_native_*`, thiếu ở `base_native` | có | superset phải phủ hết |
| `PartnerDisburseRequest` | `base_native` thiếu `loan_insurance`/`disburse_amount`; 3 file variant lại có thêm `partner_disburse_status` | có `loan_insurance` + `disburse_amount`, **không** có `partner_disburse_status` | `partner_disburse_status` là field *response* của `/partner-disburse-status`, xuất hiện trong request là lỗi copy-paste |
| `disburse_date` (paylater) | `base_native_paylater` có | không (`x-product: [cashloan, payday]`) | theo `get-loan-detail-api.md` và `base_dop_paylater`; bản paylater cũ lệch |
| `base_dop.yaml` info | 2 file DOP không có `## Mô tả` / `## Changelog` | có | builder cần bảng Changelog để chèn dòng mỗi lần gửi đối tác |
| Mô tả field trùng tên | lệch câu chữ giữa 6 file (`order_id từ /repayment-request` vs `/repayment-van`, ...) | một câu đúng cho mọi cấu hình | drift câu chữ |
| Flow `repayment` (DOP) | mỗi file một luồng | `repayment` (VAN) + `repayment_request_confirm` | builder chọn theo `repayment.mode` |

## Sinh lại

`builder/_mk_base2.py` là script migration một lần, giữ để audit — đọc nó để biết từng
quyết định gộp đến từ đâu. **Sau migration, `base2/*.yaml` là source of truth, sửa tay trực tiếp**;
đừng chạy lại script vì nó sẽ ghi đè bằng bản dựng từ `base/`.
