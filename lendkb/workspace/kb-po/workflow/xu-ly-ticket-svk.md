---
title: Quy trình PO xử lý ticket SVK — dùng cho mọi agent
audience: [po, ai]
last_verified: 2026-10-06
owner: dung.pham2
status: draft
---

# Xử lý ticket SVK — quy trình cho PO và agent

Quy trình **không phụ thuộc công cụ**: agent nào (Claude, Codex, OpenCode…) hay người làm
tay cũng đi theo được. Dùng khi PO cần kết luận một ticket vận hành Lending
duyệt được hay chưa, và soạn câu trả lời cho Ops.

> Trên máy PO có bản đóng gói cho Claude Code (skill `lending-handle-ops-ticket` +
> `lending-scan-support-tickets`, nằm ngoài repo). Đó chỉ là một cách chạy quy trình này;
> **file này mới là nguồn chuẩn** — sửa quy trình thì sửa ở đây.

## Bước 1 — Kéo ticket về

- Jira REST, cách kết nối ở `lendkb/AGENTS.md` mục *Kết nối Jira*. Chỉ GET.
- Ticket: `/rest/api/3/issue/SVK-xxxxx?fields=summary,status,description,comment,attachment,issuelinks`
- Ảnh đính kèm: lấy `content` URL trong trường `attachment`, tải về rồi **đọc hết ảnh**.
  Ops hầu như luôn chụp màn hình thay vì gõ số — bỏ qua ảnh là bỏ qua phần lớn bằng chứng.
- Quét nhiều ticket đang mở cùng lúc: `node --env-file=tools/.env tools/export-svk.mjs`
  (JQL lọc request type Lending, có ẩn danh hoá).

**Không in token ra output.**

## Bước 2 — Nhận diện sản phẩm và bước đi tiền cuối

Lấy `product_id` từ ticket, hoặc suy từ tiền tố `loan_code` (`CAKEPD…` → `CAKE_payday`,
`CAKECLZLP…` → `ZLP_cashloan`…). Không chắc thì tra [[kb/product-matrix]].

**Bước hay sai nhất.** Bước đi tiền cuối khác nhau theo nhóm sản phẩm — bảng 5 nhóm ở
[[kb/operations/luong-giai-ngan]]. Sản phẩm không có trong bảng thì **không tự xếp nhóm**.

## Bước 3 — Đối chiếu bằng chứng với tiêu chuẩn duyệt

Câu hỏi quyết định:

> **Ops đã xác nhận tiền đi tới bước cuối ĐÚNG NHÓM chưa?**

| Bẫy | Thực tế |
|---|---|
| Balance Loan Drawdown về `₫0` | Chỉ chứng minh tiền **rời** Loan Drawdown, **không** chứng minh vào CASA. Hai tài khoản khác nhau, CASA có thể đang khoá |
| Khách tự báo "đã nhận tiền" | Dấu hiệu mạnh nhưng **không thay được bằng chứng hệ thống** — khách dễ nhầm với khoản khác về cùng ngày |
| Đối tác gửi email báo đã giải ngân | **Không phải** callback `disburse-update` đã tới Cake. Trước tiên yêu cầu log / đối tác gọi lại; mail xác nhận chỉ dùng khi đối tác **không gọi được** |
| Ops viết "đã giải ngân" chung chung | Hỏi lại **đúng bước cuối của nhóm đó**, không duyệt |

**Chưa đủ → không duyệt.** Nói rõ thiếu đúng cái gì, đừng tự suy luận bù.

Case đã gặp: [[kb/operations/case-ket-user-sign]].

## Bước 4 — Có thuộc đợt lỗi đã biết không

Tra JQL dưới đây và các `kb/operations/case-*`. Nhiều ticket cùng triệu chứng trong vài
ngày thường là **một đợt lỗi hệ thống** — không cần điều tra lại root cause. Ảnh chụp
backlog cũ ([[kb-po/ra-soat/svk-backlog-2026-10-02]]) chỉ để tham khảo lịch sử, đừng coi là trạng thái hiện tại.

```jql
project = SVK AND text ~ "<triệu chứng>" AND created >= -14d ORDER BY created DESC
```

## Bước 5 — Soạn câu trả lời cho Ops

**2–3 dòng**, theo mẫu ở [[kb/operations/quy-trinh-xu-ly]] mục *Cách phản hồi ticket SVK*.

```
<product_id> bước cuối là <bước cuối>. Ops đang dừng ở <bước Ops báo>.
Bổ sung <bằng chứng cụ thể> → duyệt ngay.
```

Đủ điều kiện:

```
Đã xác nhận tới bước cuối (<bước cuối>). Duyệt Cake Task "Lending Force Status Loan",
loan_id <id> · status DISBURSE.
```

**Nêu số, đừng nêu lý luận** — *"ảnh tab CASA có dòng `+5.000.000` lúc 30/09 00:40:57"*,
không phải *"cần xác nhận tiền đã vào CASA"*. Không đưa quá trình điều tra hay phỏng đoán
nguyên nhân vào comment.

## Bước 6 — Trình bày cho PO

PO đồng thời là checker duyệt Cake Task. Trình bày:

1. **Kết luận trước** — duyệt được hay chưa, một dòng
2. Bằng chứng đọc được từ ảnh, dạng bảng có số và mốc giờ
3. Thiếu gì, và lấy ở đâu
4. Dòng CSV cho Cake Task nếu đủ điều kiện
5. **Bản ngắn gửi Ops** — tách riêng

## Bước 7 — Ghi lại KB

Hỏi PO trước. Đáng ghi khi câu trả lời không suy ra được từ các trang hiện có, khi gặp
bẫy mới, hoặc ticket thuộc một đợt lỗi. Ghi case mới theo khung ở
[[kb/operations/README]] — mục **Điểm chưa xác nhận** bắt buộc nếu còn chỗ chưa chắc.
Quy trình ghi: [[kb-po/SCHEMA]].

## Giới hạn

- **Chỉ đọc Jira.** Comment, đổi trạng thái, duyệt task — soạn sẵn rồi chờ PO duyệt.
- **Không duyệt Cake Task thay PO.**
- **Không chép PII sang KB.** `loan_code`, `loan_id` che bớt hoặc chỉ mô tả định dạng.
