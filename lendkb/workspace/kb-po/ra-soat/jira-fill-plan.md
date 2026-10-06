---
title: Lượt 2 — fill số liệu từ Jira
last_verified: 2026-09-30
audience: [po]
owner: dung.pham2
status: plan
---

# Lượt 2: quét Jira để fill số liệu

Số liệu trên Confluence có thể đã cũ. Nguồn chuẩn là ticket Jira. Lượt 1 đã dựng xong
khung (nhận diện + kênh + luồng). Lượt này điền số.

## Ticket có sẵn trong `raw/jira/` theo từng sản phẩm

Đếm trên export 2026-09-30 (1.831 issue, project PL, created >= 2024-06-01):

| Nhiều ticket (≥ 35) | Trung bình (20–34) | Ít (< 20) |
|---|---|---|
| VDS_paylater 78 · MWG_paylater 50 · BE_paylater 48 · MISA_cashloan 44 · VNP_paylater 43 · FPT_paylater 42 · Viettel_Cashloan 38 · MWG_cashloan 38 · VNP_cashloan 36 · Be_Cashloan 36 | VT_Cashloan_S 29 · PD_Viettel 29 · MWG_payday 29 · ZLP_cashloan 28 · KLP_cashloan 28 · VPO_cashloan 26 · CAKE_payday 26 · BE_payday 24 · VNP_payday 20 | NGS_cashloan 18 · ZLP_payday 17 · **CAKE_overdraft 4** |

Mọi sản phẩm đều có ticket. `CAKE_overdraft` mỏng nhất — có thể cần mở rộng phạm vi
export cho riêng sản phẩm này.

## Cách làm cho mỗi sản phẩm

1. Lọc ticket theo `product_id` trong `raw/jira/PL/`.
2. Ưu tiên ticket **mới nhất** có `status` = Released / Done, và ticket có tiêu đề chứa
   `Product Policy`, `Setup product code`, `cấu hình tài chính`, `Core disbursement`,
   `Core repayment`, `LOS`.
3. Lấy các trường: hạn mức theo nhóm, kỳ hạn, lãi suất (có/không bảo hiểm), phí bảo hiểm,
   mức giảm lãi, phạt gốc chậm, phạt lãi chậm, phí + điều kiện tất toán sớm.
4. **Đối chiếu với số trên Confluence.** Lệch thì lấy Jira, và **ghi lại cả hai** cùng
   ngày ticket — để còn truy được vì sao đổi.
5. Cập nhật frontmatter: `numbers_source: jira`, `needs_jira_verify: false`,
   `status: draft`, thêm `sources: - jira:PL-xxxxx`.

## Thứ tự đề xuất

1. **`CAKE_cashloan`** — đang bị chặn bởi mâu thuẫn nội bộ của page Confluence (Q1 trong
   [[kb-po/ra-soat/open-questions]]). Jira sẽ giải quyết luôn câu hỏi này.
2. Nhóm còn dư nợ lớn: `NGS_cashloan`, `FPT_paylater` — khách đang gọi CSKH.
3. Nhóm nhiều ticket, dễ lấy số: VDS / MWG / VNPAY / BeGroup.
4. Phần còn lại.

## Rủi ro

- **Ticket mô tả thay đổi, không mô tả trạng thái hiện tại.** Một ticket "đổi lãi suất
  sang 57%" chỉ đúng tại thời điểm đó. Phải lấy ticket **mới nhất** và đọc theo dòng
  thời gian, không lấy ticket đầu tiên tìm được.
- **Ticket bị huỷ hoặc không release.** Chỉ tin `status` = Released / Done.
- Export chỉ có ticket từ **2024-06-01**. Sản phẩm không đổi chính sách từ trước đó sẽ
  không có ticket nào chứa số — lúc đó phải quay lại Confluence và chấp nhận rủi ro cũ,
  hoặc mở rộng phạm vi export.
