---
title: Lịch sử quyết định — vì sao từng con số đổi
audience:
  - po
last_verified: 2026-10-03T00:00:00.000Z
owner: dung.pham2
status: reference
---
# Lịch sử quyết định

KB này từng nằm ở repo riêng, lịch sử git ghi lý do từng thay đổi. Khi gộp vào
`lending_manage` repo thì bỏ lịch sử đó, nên chép phần đáng giữ sang đây.

Mục đích: lần sau ai đó thấy một con số và định "sửa lại cho khớp Confluence" thì
đọc trước — phần lớn trường hợp **Confluence mới là bản cũ**.

## Số liệu — những lần sửa và vì sao

| Ngày | Sửa gì | Vì sao |
| --- | --- | --- |
| 2026-09-30 | `CAKE_cashloan` phí tất toán **3% → 8%/5%** | Confluence ghi 3%, nhưng PL-9170 đã live 2025-07-28. Lệch gần 3 lần. Đây là lần đầu phát hiện Confluence tụt hậu có hệ thống |
| 2026-10-01 | `VPO_cashloan` thu nhập **4 → 5 triệu** | PL-12708, hiệu lực 2026-03-16 |
| 2026-10-06 | 4 sản phẩm Viettel: bước đi tiền cuối **TKĐBTT → tài khoản phải trả của đối tác** | PO xác nhận. Troubleshoot gốc gộp chung với nhóm giải ngân về TKĐBTT |
| 2026-10-06 | Cake Task "Lending Force Status Loan": cập nhật **`ACTIVE` → `DISBURSE`** | PO xác nhận. Troubleshoot gốc ghi "thành ACTIVE"; trạng thái LMS đúng là `DISBURSE`, khớp mẫu CSV đã dùng |
| 2026-10-02 | **Lãi phạt lãi chậm: ghi rõ chưa triển khai** ở 8 file | PO xác nhận core chưa hỗ trợ trên toàn bộ lending. 19 ticket có spec `get-loan-detail` đều trả `penalty_interest_balance = 0đ`. Trước đó KB ghi mức phạt như thể có thu — báo cho khách là sai |
| 2026-10-02 | `MBF_cashloan` thêm phí tất toán 8%/5% | Trường tên tiếng Anh `PrepaymentFee`, grep tiếng Việt trượt |
| 2026-10-02 | `FIZA_payday` phí tất toán "chưa áp dụng" → **không có phí** | PO xác nhận là chính sách cố định, không phải chưa kịp làm |
| 2026-10-02 | `PD_Viettel` nhóm SIM Viettel **3–5tr/30 ngày → 2tr / 7–30 ngày** | Đã bê nhầm số của nhóm ngoại mạng áp cho cả hai nhóm |
| 2026-10-02 | `FPT_paylater` thanh toán tối thiểu **30% → 15%** | 30% là mức chung của Paylater, FPT là ngoại lệ |
| 2026-10-02 | `MWG_paylater` phí phạt chậm: ghi rõ **thu 4 lần** | Thu 50.000đ tại mỗi mốc DPD 1, 5, 10, 15 — quá hạn 15 ngày là 200.000đ. KB cũ ngụ ý thu một lần |
| 2026-10-02 | `VNP_payday` bảo hiểm **tự chọn → bắt buộc** | Không mua thì khoản vay bị huỷ |
| 2026-10-02 | `VNP_cashloan` phí **3% → 8%/5%**, bỏ điều kiện 3 kỳ, lãi **45/50% → 50/55%** | PL-9170 có mục "Update: VNPay Cashloan" nằm dưới phần AC — lần đầu đọc chỉ xem AC nên sót |
| 2026-10-02 | `Be_Cashloan` **10–50tr/25–54% → 10–40tr/43–55%** | Confluence là bản trước BE score v2 (PL-13946) |
| 2026-10-02 | `MWG_cashloan`, `VT_Cashloan_S` phí **3% → 8%/5%** | Cùng nguyên nhân với Cake: trang chưa cập nhật sau PL-9170 |
| 2026-10-02 | `MWG_payday` thêm kỳ hạn 30/45 ngày, phí BH 8% | Value index tìm ra, KB trước ghi "chưa có số" |
| 2026-10-02 | `KLP_cashloan` thêm kỳ hạn 6–36 tháng | như trên |
| 2026-10-03 | `VNP_cashloan` thêm kỳ hạn 6–36 tháng | như trên |

## Phí tất toán — vì sao mỗi trang một kiểu

Chuỗi thay đổi khiến các trang Product Policy chụp ở thời điểm khác nhau:

`3% + điều kiện 3 kỳ` → **PL-5240** (2024-07) bỏ điều kiện → **PL-8654** (2025-05) bật lại
điều kiện và nâng **3% → 5%** → **PL-9170** (2025-07) chia bậc **8% / 5%** và thay điều kiện
bằng bậc phí → **PL-12415** (2026-06) chuyển tính phí sang ICE, giữ nguyên mức.

Trang ghi **3%** = chụp trước 2025-05 · ghi **5%** = chụp giữa 05 và 07/2025 · ghi **8%/5%** = đúng.

Chi tiết: [[kb-po/ra-soat/lich-su-phi-tat-toan]].

## Quyết định về cách làm

| Quyết định | Lý do |
| --- | --- |
| **Jira là nguồn chuẩn, Confluence dựng khung** | Confluence tụt hậu có hệ thống — 5 trang sai phí tất toán suốt 14 tháng |
| **Không tự chọn khi hai nguồn chọi nhau** | Ghi cả hai kèm ngày, đưa vào [[kb-po/ra-soat/can-confirm]], chờ PO |
| ~~Marker `AUTO:start` / `AUTO:end`~~ — **bỏ 2026-10-06** | Chưa script nào sinh lại vùng đó; marker "đừng sửa tay" chỉ gây hiểu sai. Cơ chế thật: script kéo nguồn + báo trang cần rà, agent đọc và sửa (chu trình tháng trong [[kb-po/SCHEMA]]) |
| **Tách `kb/` và `kb-po/`** | Ops không đọc core/GL và số kinh doanh. Là ranh giới quy ước, không phải phân quyền kỹ thuật |
| **`kb/` chỉ cho Ops/CSKH** (2026-10-06) | Bảo trì wiki, ghi chú PO, còn thiếu, đối chiếu nguồn, số đếm dư nợ đều sang `kb-po/`. Agent trả lời ticket đọc ít nhiễu hơn, và không vô tình lộ số kinh doanh. Frontmatter trạng thái số liệu vẫn giữ ở `kb/` vì là rào an toàn khi trả lời |
| **`kb-po/core/` chỉ là index** | 766 tài liệu core đang migration Mambu → ICE, tổng hợp bây giờ sẽ lỗi thời trước khi ai đọc |
| **Index theo giá trị, không chỉ từ khoá** | 7 lần quét sót đều do tìm sai hình thức diễn đạt, không phải do chưa đọc |

## Bảy lần công cụ quét sót — và cách sửa

Ghi lại để không lặp. Mọi lần đều **không phải** do tài liệu thiếu.

| # | Lỗi | Hậu quả |
| --- | --- | --- |
| 1 | Khớp `product_id` nguyên khối | `[Partner][Viettel] - Cashloan - Product Policy` map ra rỗng |
| 2 | Không biết mã nội bộ | `VDS-O2O`, `ODTD_v2` không khớp gì |
| 3 | Xếp ticket theo ngày mới nhất | Ticket khai sinh sản phẩm — nơi có bảng policy đầy đủ — bị đẩy xuống đáy |
| 4 | Dò policy chỉ theo bảng markdown | Sót 20 tài liệu viết dạng văn xuôi |
| 5 | `\b` không khớp qua dấu `_` | `\bMBF\b` không khớp `MBF_cashloan` |
| 6 | Quét thân để suy cặp đối tác × loại | Ticket MWG bị gán cho cả ZLP và VNP |
| 7 | Suy đối tác từ chuỗi `product_id` | Không suy được `Viettel_Cashloan` → `vds`, nên không loại được mã Cake lọt vào. **Sửa bằng cách đọc trường `partner` đã có sẵn trong frontmatter — dữ liệu có rồi thì đừng đoán lại** |

Thêm: tìm `expired_time` / `session` / `timeout` trong khi ticket viết *"thời gian valid = 5 phút"*.
Từ đó sinh ra `tools/value-index.mjs` — tra theo **giá trị** thay vì tên trường.

## Kết luận từng sai, đã sửa

| Từng kết luận | Thực tế |
| --- | --- |
| "8 sản phẩm không có số liệu trong Jira" | Sai. Dữ liệu vẫn ở `raw/`, hỏng là bộ nhận diện |
| "Troubleshoot chưa phủ nhóm Mambu/ICE" | Sai. Tab *Quy trình sau vay* có — bước đầu là kiểm tra **có đúng cùng một khoản vay không** |
| "`raw/` đã gitignore" | Sai. 62 file đã bị `git add`, `.gitignore` không có tác dụng với file đã vào index |
| "6 ticket nhóm A đối tác đã giải ngân thành công" | Gộp ẩu. Email đối tác không phải bằng chứng callback API đã tới |
| "SVK-11718 do chống trùng giao dịch" | Sai. Lỗi hệ thống đợt đó, đợi Recon xử lý tay |
