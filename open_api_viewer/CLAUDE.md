# open_api_viewer

Bộ tài liệu OpenAPI cho các tích hợp lending giữa **Cake by VPBank** và đối tác, kèm một viewer HTML tĩnh để đọc/so sánh/in các spec đó.

Đọc hết file này trước khi sửa bất cứ gì trong thư mục.

---

## 1. Quy tắc bắt buộc

### `*.lock.yaml` — ĐÃ GỬI ĐỐI TÁC, KHÔNG ĐƯỢC SỬA

File có hậu tố `.lock.yaml` là **bản snapshot đã gửi ra ngoài cho đối tác** (qua email, ticket, hoặc kênh tích hợp). Chúng là bằng chứng của những gì đã cam kết.

- **Không sửa nội dung** — không format lại, không sắp xếp lại field, không sửa typo, không mask data, không cập nhật changelog.
- **Không đổi tên, không xoá, không di chuyển.**
- Chỉ được **đọc** — dùng để so sánh với bản working, để biết đối tác đang thấy gì.
- Nếu cần thay đổi: sửa file working (`*.yaml`), rồi tạo **lock mới**, không chạm lock cũ.

Nếu người dùng yêu cầu sửa một file `.lock.yaml`, hãy hỏi lại xác nhận trước khi làm — mặc định là từ chối.

### `*.yaml` (không `.lock`) — bản đang làm việc

Đây là spec sống, sửa tự do. Là nơi mọi thay đổi diễn ra.

### Ví dụ dữ liệu trong file working **phải được mask**

Trong `*.yaml` working, mọi `example` chứa dữ liệu cá nhân hoặc bí mật phải ở dạng mask:

| Loại | Mask dùng |
|---|---|
| Số điện thoại | `0xxxxxxxxx` |
| CCCD / CMND | `xxxxxxxxxxxx` |
| Public key, partner key | `*(Cake cấp)*` hoặc `-----BEGIN PUBLIC KEY-----MIIB **** AQAB-----END PUBLIC KEY-----` |

Các file `.lock.yaml` hiện có chứa giá trị thật (`0345678900`, `075099093845`) — **giữ nguyên**, không đi mask lại, vì bản đó đã gửi đối tác rồi.

Khi tạo lock mới từ working spec: lock chỉ là bản copy của working, nên nó thừa hưởng mask — đó là hành vi đúng, đừng "sửa lại thành số thật".

---

## 2. Cấu trúc thư mục

```
open_api_viewer/
├── CLAUDE.md                    # file này
├── index.html                   # viewer, 1 file standalone
├── build-specs-index.mjs        # bake specs/ → specs/specs-index.js
└── specs/
    ├── base/
    │   └── base_*.yaml          # spec gốc (source of truth) — xem §3
    ├── specs-index.js           # GENERATED, không sửa tay
    ├── get-loan-detail-api.md   # ghi chú so sánh field get-loan-detail giữa 3 nhóm sản phẩm
    └── <partner>/
        ├── index.yaml           # working spec (bản đang dùng)
        └── YYYYMMDD.lock.yaml   # bản đã gửi đối tác, YYYYMMDD = ngày gửi
```

### Base spec (`specs/base/base_*.yaml`)

| File | Tiêu đề | Mô hình | Endpoint |
|---|---|---|---|
| `base_native.yaml` | product_id - Native Lending APIs | Native (superset đầy đủ) | 38 |
| `base_native_cashloan.yaml` | product_id - Native Lending APIs (Cashloan) | Native cashloan — `predue_payment_amount` + `due_payment_amount` | 17 |
| `base_native_payday.yaml` | product_id - Native Lending APIs (Payday) | Native payday — không trả predue/due | 17 |
| `base_native_paylater.yaml` | product_id - Native Lending APIs (Paylater) | Native paylater — `period_payment_amount` | 17 |
| `base_dop_full.yaml` | product_id - DOP Lending APIs | DOP (webview) | 9 |
| `base_dop_paylater.yaml` | product_id - DOP Lending APIs | DOP paylater + installment | 20 |
| `base_collection_reminder.yaml` | product_id - Collection Reminder API | Collection | 1 |

Placeholder trong base: `product_id`, `email_title`, `2026-0x-0x`.

### Partner spec

| Thư mục | Spec | Mô hình | Lock hiện có |
|---|---|---|---|
| `be_cashloan/` | Be_Cashloan - BE x CAKE Lending APIs | custom (create-link/token, get-be-score) | — |
| `dvs/` | DVS - Repayment APIs | thu hộ tại quầy `cake-proxy/cash-collection` (order/inquiry, transaction/collect, transaction/inquiry) | `lending_only.lock.yaml` |
| `be_payday/` | be_payday - APIs spec | DOP | `20260608.lock.yaml`, `20260611.lock.yaml` |
| `fiza_cashloan/` | Fiza Cashloan - Native API | Native | `index.lock.yaml` |
| `fiza_payday/` | Fiza Payday - Native API | Native | `index.lock.yaml` |
| `kov_cashloan/` | KOV_cashloan - Native Lending APIs | Native | `20260728.lock.yaml` |
| `lcp_paylater/` | LCP_paylater - DOP Lending APIs | DOP paylater | `index.lock.yaml` |
| `pd_viettel/` | Viettel Payday - Native API | Native | `20260810.lock.yaml`, `20260819.lock.yaml`, `current_product.lock.yaml` |
| `tiktok_cashloan/` | TikTok Cashloan — Native APIs | Native | — |
| `zlp_cashloan/` | ZaloPay Cashloan - Native Lending APIs | Native | — |
| `zlp_payday/` | ZaloPay Payday - Native Lending APIs | Native, không có luồng Termination | — |

Working spec của mọi partner đều là `index.yaml`; tên partner đã nằm ở tên thư mục nên không lặp lại trong tên file.

`pd_viettel/current_product.lock.yaml` là spec của sản phẩm **đang chạy production** với Viettel, tách riêng khỏi spec payday mới đang đàm phán.

---

## 3. Base spec là nguồn chân lý

Thay đổi mang tính **dùng chung** — signature, error code, môi trường/IP, tên field, enum, mô tả field, cấu trúc response wrapper — **sửa ở `specs/base/base_*.yaml` trước**, rồi lan xuống các partner spec dùng base đó.

Không sửa trực tiếp một partner spec cho thay đổi dùng chung, vì các partner khác sẽ lệch âm thầm.

Chỉ sửa riêng ở partner spec khi thay đổi **thật sự chỉ thuộc partner đó**: endpoint họ không dùng, field riêng theo hợp đồng, giá trị môi trường của họ, changelog của họ.

Tạo partner mới: copy base tương ứng → xoá endpoint không dùng → điền `product_id`/tên partner → điền changelog.

---

## 4. Quy ước file spec

Các file spec nên **giống nhau về cấu trúc** — sửa một file thì căn theo các file cùng mô hình (Native ↔ Native, DOP ↔ DOP).

- OpenAPI `3.0.3`.
- `info.title`: `<Partner> <Product> - <Native|DOP> API`.
- `info.description` là markdown dài, thứ tự khối cố định:
  1. Lưu ý bản quyền (Cake by VPBank)
  2. `## Mô tả`
  3. `## Changelog` — bảng `| Thời gian | Email title | Cập nhật |`, mỗi lần gửi đối tác thêm 1 dòng
  4. `## Cơ chế xác thực (Signature)` — `rawBody = body + partner_key` → sha256 → RSA PKCS1v15 → base64
  5. `## Môi trường` — bảng SIT+UAT và PROD (`CAKE_API_URL`, `CAKE_PARTNER_ID`, `CAKE_PARTNER_KEY`, IP whitelist...)
  6. `## Error Codes`
- Ngôn ngữ nội dung: **tiếng Việt** (description, mô tả field). Tên field/endpoint: tiếng Anh, `snake_case`.
- Endpoint đều là `POST`, đặt tên kebab-case: `/client-create`, `/get-loan-detail`, `/verify-esign`...

### Endpoint `partner-*` (Cake → Partner)

Mọi endpoint có prefix `partner-` là **callback: Cake gọi vào hệ thống đối tác**, đối tác phải expose. Hợp đồng cố định, mọi file phải giống nhau:

- **Header — cần và chỉ cần 2 cái:**
  ```yaml
  parameters:
    - $ref: "#/components/parameters/ContentTypeHeader"
    - $ref: "#/components/parameters/SignatureHeader"
  ```
  **Không có** `PartnerHeader` — header `partner` chỉ dùng chiều Partner → Cake để Cake nhận diện đối tác. Chiều ngược lại không cần.
  Signature ở đây do **Cake ký** bằng private key của Cake; partner verify bằng `CAKE_PUBLIC_KEY`.

- **Response — 3 field `success`, `code`, `message`**, dùng schema chung `PartnerCallbackResponse`:
  ```yaml
  PartnerCallbackResponse:
    type: object
    required: [success, code, message]
    properties:
      success:  { type: boolean }
      code:     { type: integer }   # 1 = thành công; khác 1 = lỗi, Cake retry
      message:  { type: string }
  ```
  Không dùng `BaseResponse` cho `partner-*` (nó có thêm `response_id`, `timestamp` — không bắt partner sinh 2 field đó).
  Ngoại lệ duy nhất: `partner-disburse-status` là endpoint **truy vấn**, dùng `PartnerDisburseStatusResponse` = 3 field trên **+ `data`**.
  Ngoại lệ thứ hai: `zlp_payday/` — ZLP đã cố định hợp đồng cho 2 endpoint họ expose, nên `/partner-update-status` dùng header `x-client-key` + `x-sign` và response `return_code`/`sub_return_code`, còn `/partner-disburse-request` (top-up, `fnc=BankCashIn`) và `/partner-disburse-status` (query, `fnc=QueryStatus`) theo chuẩn ZaloPay bankconnector (`fnc`, `partnerId`, `bankTransId`, `data` string-json). Không đồng bộ 3 endpoint này về base.
  `zlp_cashloan/` cũng vậy: cả `/partner-disburse-request` lẫn `/partner-disburse-status` theo bankconnector ZLP (`Zalopay-IB_Mobile_Banking_Integration` v1.5). Bảng error code bankconnector dùng chung cho 2 file: `resultCode`/`returnCode` = `00` là đã giải ngân, mã khác là chưa.

- Ví dụ response trong spec phải có `success: true`.

### Đặt tên file trong thư mục partner

```
index.yaml           # working spec
YYYYMMDD.lock.yaml   # bản đã gửi đối tác, YYYYMMDD = ngày gửi
```

Ví dụ: `fiza_payday/20260820.lock.yaml`. Không nhắc lại tên partner trong tên file — thư mục đã mang thông tin đó.

Ngoại lệ đang có:
- `index.lock.yaml` — lock cũ không rõ ngày gửi (fiza_cashloan, fiza_payday, lcp_paylater).
- `pd_viettel/current_product.lock.yaml` — không phải snapshot theo ngày mà là spec sản phẩm đang chạy production, giữ tên mô tả trạng thái.

### Quy trình gửi spec cho đối tác

1. Sửa `<partner>/index.yaml` (working).
2. Thêm 1 dòng vào bảng `## Changelog`: thời gian, email title, nội dung thay đổi.
3. Kiểm tra example đã mask (§1).
4. Copy working → `<partner>/YYYYMMDD.lock.yaml`.
5. Chạy `node open_api_viewer/build-specs-index.mjs`.
6. Xuất PDF từ viewer (nút Print) và gửi.

---

## 5. Viewer

`index.html` là app một file, chạy được bằng cách mở trực tiếp (`file://`) hoặc qua HTTP server.

Vì `fetch()` không hoạt động trên `file://`, toàn bộ nội dung spec được **bake sẵn** vào `specs/specs-index.js`:

```bash
node open_api_viewer/build-specs-index.mjs
```

**Chạy lại lệnh này sau mỗi lần thêm/sửa/xoá file `.yaml` trong `specs/`**, nếu không viewer sẽ hiển thị nội dung cũ.

`specs/specs-index.js` là **file sinh tự động** (~1.2 MB) — không bao giờ sửa tay. Script chỉ lấy `.yaml`/`.yml`, bỏ qua file/dir bắt đầu bằng `.`; file `.md` không được bake.

Tính năng viewer: cây thư mục spec, render endpoint + flatten schema, mermaid flow, **Compare mode** (2 chế độ: *Side by side* — render đủ 2 tài liệu 2 bên, bôi màu phần khác nhau ở mức endpoint + từng field/ô; *Summary* — danh sách diff gọn. Có checkbox "Only differences". Dùng để so working vs lock), print CSS để xuất PDF, live-reload khi phục vụ qua HTTP, mở thư mục cục bộ qua File System Access API.

Dependency nạp từ CDN: js-yaml, marked, highlight.js, mermaid → cần internet lần đầu.

