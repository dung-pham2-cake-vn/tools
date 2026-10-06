---
title: Dashboard, query & tool nội bộ
audience: [po]
nhom: 3
sources:
  - "file: Troubleshoot Lending Ops.xls — tab PO only, Dashboard cần bổ sung, Request tools"
last_verified: 2026-10-02
owner: dung.pham2
status: draft
---

# Dashboard, query & tool nội bộ

🔴 `hạn chế` — chỉ PO.

Trích từ tab **PO only**, **Dashboard cần bổ sung**, **Request tools** của file troubleshoot.
Tách khỏi `kb/` vì chứa query database và chỉ số nội bộ.


## PO only

- Bước · Loại · Lỗi phát sinh · Kiểm tra · Nguyên nhân · Hướng xử lý
- Dashboard · Giải nghĩa
- Native Cashloan
- Bước #Loscheck thấp (loan-register = 1) / (client-create code = 1)
- Query Postpay
- SELECT * from tb_loan_request where loan_code = 'vD9AFq84mjtdaVbhs7vn';
- select * from tb_audit_client_request where tb_audit_client_request.metadata->>'request_id' = tb_loan_request.uid
- /app/customer/account/bank/depositConfirm-v3

## Dashboard cần bổ sung

- Use cases · Cần
- KH đăng ký khoản vay với email khác trên Portal, nên KH không nhận được mail sao kê · Bổ sung thêm cột mail vào SS > Check loan
- Xem application DOP, dùng id để reset luồng đăng ký DOP cho KH bị lỗi · Bổ sung dash mới lấy từ bảng application
- Xem thời gian được approve, được ký hợp đồng của KH, check đúng trạng thái KH · Bổ sung cột thời gian approve và ký hợp đồng vào SS > Check loan
- Xem log api gọi sang VNPost · Bảng audit_partner_requests  WHERE identify_id = '{client_id}'; Bảng tb_partner_event
- Tab Paylater Balance không dùng nữa, Check log Paylater balance trên ICE · Bảng bef-cake-prod.mart_paylater.rpt_ice_paylater_account_balances_by_booking_date
- tab statement vẫn xài được, nhưng chart dpd và account_state thì vẫn đang là core cũ. · Chuyển sang Viz
- Thêm số tiền bảo hiểm KH chọn và được duyệt · SELECT coalesce(json_value(metadata, '$.original_insurance_fee'),json_value(metadata, '$.insurance_fee'),json_value(metadata, '$.approve_insurance_amount'),json_value(metadata, '$.request_insurance_amount')) FROM `bef-cake-prod.cake_loan_management.loan_
- Không hiển thị API disburse-request gọi sang đối tác với các sp Viettel · Điều chỉnh lại câu query

## Request tools

- Use cases · Cần
- KH bị miss auto collection · Thêm tool để biết danh sách các KH bị miss auto collection
