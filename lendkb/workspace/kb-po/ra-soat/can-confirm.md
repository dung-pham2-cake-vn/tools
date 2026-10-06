---
title: Điểm cần confirm
audience: [po]
last_verified: 2026-10-01
owner: dung.pham2
status: open
---

# Điểm cần anh confirm

> **Danh sách trang Confluence cần cập nhật**: `_meta/confluence-can-cap-nhat.md`
> — 9 nhóm, 18 chỗ đã xác nhận sai + 4 chỗ chờ quyết.

> **Cập nhật 2026-10-02**: B1, B2, B4 đã chốt · B6 PO đã sửa nguồn · D1, D2, E3 xong.
> Còn **9 câu** đang chờ — xem mục "Đang chờ" ngay dưới.

Gom toàn bộ tới 2026-10-01. Chia theo loại câu trả lời cần, không theo mức quan trọng.

## Đang chờ — gom ngắn

| # | Câu | Ai trả lời |
|---|---|---|
| **B3** | Lãi suất Cake OD v2 — nguồn ghi "TBD, Business confirm" | Business |
| **B5** | 3 trang nguồn quá 1 năm: `185171988` (2024-04-21) · `190611564` · `986873857` | PO |
| ~~B7~~ | ~~`MWG_cashloan` phí tất toán~~ | **Xong 2026-10-02: 8%/5%** |
| ~~B8~~ | ~~`VNP_cashloan` phí tất toán~~ | **Xong 2026-10-02**: 8%/5%, xác nhận bởi PL-9170 (mục Update) + PL-11936. Trang ghi 3% là ảnh cũ |
| **B9** *(hỏi lại)* | **`VT_Payday_S`** phạt gốc chậm 0% hay 150%? `conf:986873857` ghi **0%**, `conf:23691338` ghi **150%**. Lần trước tôi ghi nhầm tên là `VT_Cashloan_S` | PO |
| ~~B10 · B12~~ | ~~`Be_Cashloan`, `VT_Cashloan_S` phí tất toán~~ | **Xong 2026-10-02: 8%/5%** |
| ~~B11~~ | ~~`Be_Cashloan` hạn mức & lãi~~ | **Xong 2026-10-02: 10–40tr / 43–55%**, mới lên gần đây |
| **B14** | `VPO_cashloan` và `NGS_cashloan` phí tất toán có phải 8%/5% không? Trang ghi 3%, nhưng 4 sản phẩm khác cũng ghi 3% mà thực tế đã là 8%/5% | PO |
| **B15** | `VNP_cashloan`: trang nguồn ghi chồng hai giá trị — hạn mức `5–50` và `5-40`, kỳ hạn `6–36` và `6-38`. Cái nào hiện hành? | PO |
| **B16** | `VDS_paylater` kỳ hạn **36 hay 60 tháng**? Trang Product Policy ghi 60, trang VNPay Maturity ghi *"thay vì 36 tháng như VDS Paylater"* | PO |
| **S1** | SVK-11719 · SVK-11715 — Mambu trừ, ICE không gạch nợ | PO |
| **S2** | SVK-11728 — đối soát timeout, troubleshoot chưa có quy trình | Ops/Recon |
| **A1–A3** | Project key Jira CSKH · mốc mở rộng Jira · phạm vi BEF | dung.pham2 |

> **B7, B10, B12 — đã dựng được dòng thời gian** (2026-10-02), xem [[kb-po/ra-soat/lich-su-phi-tat-toan]].
> Phí đi 3% → 5% (PL-8654, 2025-05) → 8%/5% (PL-9170, 2025-07). Trang ghi 3% hay 5% đều là
> **ảnh chụp cũ**, không phải sản phẩm ngoài scheme. Chỉ cần anh xác nhận một lần.
>
> **B8 có đáp án**: điều kiện "đủ 3 kỳ mới tất toán" bị bỏ bởi PL-5240 (2024-07) rồi
> **bật lại** bởi PL-8654/8655/8656 (2025-05) cho *All Products* — nên VNPAY có điều kiện
> này là **đúng**, không phải trang cũ.
>
> **B13 đóng**: PL-9170 **thay** điều kiện 3 kỳ bằng bậc phí. Tất toán trước kỳ 3 được phép, phí 8%.

## A. Tham số cụ thể — chặn việc chạy tiếp

Tôi đã chốt hướng, chỉ thiếu giá trị.

| # | Cần gì | Chặn việc gì |
|---|---|---|
| A1 | **Project key của Jira vận hành/CSKH** + issuetype (`Task`/`Support`/`Bug`?) | Nhóm 2 (`kb/operations/`) trống hoàn toàn · Giai đoạn 5 (QA) không chạy được · FAQ 4 sản phẩm vẫn là suy đoán |
| A2 | **Mốc mở rộng Jira**: `2023-01-01` hay lấy hết? | 4 sản phẩm chưa có ticket khai sinh trong phạm vi hiện tại |
| A3 | **Phạm vi space BEF**: cả space hay chỉ nhánh lending? | Nhiều page PL link sang BEF, trong đó có trang Kiến thức domain sản phẩm cho vay |

## B. Nghiệp vụ — cần người biết sản phẩm trả lời

Không tra được từ Confluence/Jira. Agent hiện bị chặn không trả lời các mục này.

| # | Câu hỏi | Hiện trạng trong KB |
|---|---|---|
| B1 | **MBF cashloan áp scheme phí tất toán nào?** PL-9170 (8%/5%) chỉ liệt kê 5 sản phẩm, không có MBF — mà MBF live sau ticket đó | Ghi "escalate", không trả lời khách |
| B2 | **FIZA payday**: "phạt lãi chậm chưa hỗ trợ" và "phí tất toán chưa áp dụng" là chính sách cố định hay chỉ chưa kịp làm? | Ghi "escalate", không cam kết miễn phí |
| B3 | **Lãi suất Cake OD v2** — page nguồn ghi "TBD, Business confirm", sản phẩm `[IN PROGRESS]` | [[kb/products/od/overview]] để trống mục lãi suất |
| B4 | **Lịch ngày lễ dời due date** — bảng nguồn mới cấu hình tới 2024, các năm sau đã cập nhật chưa? | [[kb/products/cashloan/loan-management]] có cảnh báo |
| B5 | **3 trang nguồn quá 1 năm chưa cập nhật** — Jira không có ticket đổi, nhưng thay đổi có thể chưa từng ghi vào Jira | [[kb/products/paylater/overview]] (2024-04-21) · [[kb/products/paylater/partners/be/be_paylater]] (2025-06-25) · [[kb/products/payday/partners/vds/vt_payday_s]] (2025-09-17) |
| B6 | **`MWG_payday` contract type** ghi `dop_mwg_payday`, khác quy ước UPPER_CASE của 25 dòng còn lại | Nghi lỗi nhập liệu trên page nguồn |

## C. Quyết định tôi tự làm — xác nhận đúng ý không

Đã làm rồi, sửa được nếu sai ý.

| # | Tôi quyết thế nào | Lý do |
|---|---|---|
| C1 | **Mục 5 (ghi chú PO/Product) để lại `kb/`**, không tách sang `kb-po/` | Là kiến thức sản phẩm, Ops cũng cần để trả lời khách. Chỉ core và kinh doanh mới tách |
| C2 | **`kb-po/core/` chỉ là index, không tổng hợp nội dung** | 766 tài liệu core đang chạy migration Mambu → ICE, tổng hợp bây giờ sẽ lỗi thời trước khi ai đọc |
| C3 | **File cấp loại sản phẩm không có file kinh doanh riêng** | Số kinh doanh gắn theo `product_id` cụ thể, không gắn theo "cashloan" nói chung |
| C4 | **`owner` = dung.pham2 cho cả 61 file** | Theo quyết định tự duyệt hết. Chia theo sản phẩm thì sửa sau |
| C5 | **Sản phẩm thẻ (6 sản phẩm) ngoài phạm vi KB** | Chốt 2026-09-30. Mục B trong product-matrix giữ để tra cứu |

## D. Cần quyết mới

| # | Việc | Vì sao hỏi |
|---|---|---|
| D1 | **Tách repo riêng cho `kb-po/`?** | Hiện cùng repo thì Ops clone về đọc hết. Tách thư mục chỉ là quy ước. Làm sớm dễ hơn — giờ mới 35 file |
| D2 | **Xuất bảng soát số tài chính?** | Gom toàn bộ lãi suất, hạn mức, phí bảo hiểm, phạt, phí tất toán của 33 sản phẩm lên một trang kèm nguồn + ngày, để soát một lượt trước khi chuyển `approved` |
| D3 | **Thêm `MBF_cashloan`, `FIZA_payday` vào bảng Partnership products** | Nội dung KB đã viết xong. Thiếu 3 trường chỉ bảng chuẩn mới có: kênh, yêu cầu NFC, nơi ký hợp đồng |

## E. Cần người viết — không confirm bằng câu trả lời được

| # | Việc | Ai | Hiện trạng |
|---|---|---|---|
| E1 | Mục 4 — ghi chú vận hành | Ops | Đã có nội dung gợi ý rút từ dữ liệu, cần người thật bổ sung |
| E2 | Mục 5 — ghi chú sản phẩm | PO | Như trên |
| E3 | `kb-po/business/` — số liệu kinh doanh | BI / Business | **33 file trống hoàn toàn**, không lấy được từ Confluence/Jira |

## B mới — phát hiện khi đọc kỹ nhánh Partnership (2026-10-01)

| # | Mâu thuẫn | Chi tiết |
|---|---|---|
| B7 | **`MWG_cashloan` phí tất toán: 3% hay 8%/5%?** | Trang Product Policy ghi **3%**, nhưng MWG nằm trong danh sách 5 sản phẩm của [PL-9170](https://cakedigitalbank.atlassian.net/browse/PL-9170) đổi sang 8%/5% (live 2025-07-28). Hai nguồn chọi nhau trực tiếp |
| B8 | **`VNP_cashloan` có điều kiện tất toán?** | Trang ghi *"Đã trải qua 3 kỳ thanh toán"*. Nhưng [PL-5240](https://cakedigitalbank.atlassian.net/browse/PL-5240) (2024-07-31) đã bỏ điều kiện này cho VDS/Be/VDS payroll/VDS_cashloan_LP — **không liệt kê VNPAY**. VNPAY nằm ngoài đợt đó, hay trang chưa cập nhật? |

| B9 | **`VT_Cashloan_S` phạt gốc chậm: 0% hay 150%?** | `conf:986873857` (VDS Payday Payroll) ghi **0%**, `conf:23691338` (Viettel Payday 2) ghi **150%**. Hai trang Confluence chọi nhau cho cùng sản phẩm |
| B10 | **`Be_Cashloan` phí tất toán: 3% hay 8%/5%?** | Trang `conf:39453176` ghi **3%**, nhưng Be nằm trong 5 sản phẩm của PL-9170 (8%/5%). Cùng dạng với B7 (MWG) |
| B11 | **`Be_Cashloan` hạn mức & lãi** | Trang ghi 10–50 triệu / lãi 25–54%; ticket `PL-13946` (2026-09-03) ghi 10–40 triệu / 43–55%. KB **lấy theo Jira** vì mới hơn — cần xác nhận |
| B12 | **`VT_Cashloan_S` phí tất toán: 3% hay 8%/5%?** | Trang ghi 3%; PL-9170 liệt kê "VDS Cashloan Payroll". Cùng dạng B7, B10 |

Tất cả đều ảnh hưởng trực tiếp tới câu trả lời cho khách. KB ghi cả hai nguồn kèm cảnh báo, chưa chọn.

**Mẫu lặp lại**: 4/6 mâu thuẫn là **phí tất toán 3% trên trang Product Policy vs 8%/5% theo PL-9170**.
Nhiều khả năng PL-9170 đã live nhưng các trang Product Policy chưa ai cập nhật. Nếu đúng vậy thì
chỉ cần một xác nhận là giải quyết được cả B7, B10, B12 và kiểm lại VNPAY, Vnpost, NGS, MISA.

## Đã trả lời 2026-10-01

| # | Câu | Trả lời | Đã áp vào KB |
|---|---|---|---|
| B1 | MBF phí tất toán | **8% kỳ 1–3, 5% từ kỳ 4**, tính trên dư nợ gốc tất toán sớm. Trường `PrepaymentFee` trên `conf:1861025856` — tôi đọc sót vì tên trường tiếng Anh | ✅ |
| B2 | FIZA phạt lãi / phí tất toán | **Lãi phạt lãi chưa làm trên TOÀN BỘ lending, core chưa hỗ trợ.** Phí tất toán FIZA = **cố định không phí** | ✅ vá 8 file + glossary |
| B3 | Lãi suất Cake OD v2 | Đã gửi link tài liệu | ⏳ chờ số |
| B4 | Lịch ngày lễ | **Dùng chung toàn lending**, cập nhật linh động đầu mỗi năm | ✅ |
| B5 | 3 trang quá hạn | Đã liệt kê | ⏳ chờ PO xác nhận |
| B6 | `MWG_payday` contract type | PO đã sửa trên `conf:27918827` | ⏳ cần export lại |
| C1–C5 | Quyết định thiết kế | Đúng (C3 cần giải thích thêm) | ✅ |
| D1 | Tách repo | **Không cần** — file KB sẽ upload lên hệ thống agent của công ty | ✅ bỏ khỏi backlog |
| D2 | Bảng soát số tài chính | OK | ✅ `_meta/soat-so-tai-chinh.md` |
| D3 | Thêm MBF/FIZA vào matrix | Từ từ | ⏳ |
| E3 | Số liệu kinh doanh | **Gửi lẻ, không tách 33 file** | ✅ gộp 1 file |

## Đã chốt, không cần hỏi lại

- Phạm vi nguồn: Confluence space PL + Jira project PL
- Phạm vi KB: 26 sản phẩm đang chạy + nhóm ngừng bán còn dư nợ. Không có thẻ
- Sản phẩm ngừng bán: trả nợ qua app Cake, không hướng về app đối tác
- Hai nhóm người dùng: Ops (gồm CSKH) và PO. Hai tầng `kb/` và `kb-po/`
- Core = core banking + GL (không gồm API spec)
- Người duyệt: dung.pham2 toàn bộ
- Nguyên tắc nguồn: Confluence dựng khung, Jira chốt số
