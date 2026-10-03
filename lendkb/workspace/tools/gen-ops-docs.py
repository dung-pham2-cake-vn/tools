# -*- coding: utf-8 -*-
"""Sinh kb/operations/ từ tools/scan/troubleshoot.json. Chạy lại được sau mỗi lần cập nhật file nguồn."""
import json, pathlib, re
d = json.load(open('tools/scan/troubleshoot.json', encoding='utf-8'))

def tbl(sheet, cols=None, skip=1):
    """Đổi một tab thành bảng markdown, bỏ dòng tiêu đề."""
    rows = d.get(sheet, [])
    if not rows: return []
    head = cols or [c for c in rows[0] if c]
    w = len(head)
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * w]
    for r in rows[skip:]:
        cells = [(r[i] if i < len(r) else '').replace('\n', ' · ').replace('|', '/')[:160] for i in range(w)]
        if not any(cells): continue
        out.append('| ' + ' | '.join(cells) + ' |')
    return out

L = ['---', 'title: Mã lỗi API & cách xử lý', 'audience: [ops, po]', 'nhom: 2',
     'sources:', '  - "file: Troubleshoot Lending Ops.xls — tab APIs sau vay, Payment"',
     'last_verified: 2026-10-02', 'owner: dung.pham2', 'status: draft', '---', '',
     '# Mã lỗi API & cách xử lý', '',
     'Sinh từ `tools/scan/troubleshoot.json` bằng `tools/gen-ops-docs.py`.',
     'Nguồn gốc: file **Troubleshoot Lending Ops.xls**, tab *APIs sau vay* và *Payment*.', '',
     '## Mã lỗi dùng chung', '',
     '| Mã | Nghĩa | Nguyên nhân thường gặp |', '|---|---|---|',
     '| `600000` | Thông tin thanh toán không hợp lệ | `ref_id` đã được thanh toán · bộ `order_id + ref_id + loan_id + payment_amount` không khớp · SĐT đăng ký ví khác SĐT hiện tại |',
     '| `10003` | Yêu cầu hiện tại khác yêu cầu trước đó | `order_id` đã gọi confirm thất bại trước đó |',
     '| `100103` | Số tiền vượt quá dư nợ có thể thanh toán | Gọi lại `get-loan-detail` lấy dư nợ mới |',
     '| `100102` | Đang có số dư thanh toán trước hạn, không tất toán được | Khách đã thanh toán trước hạn — **đợi tới kỳ thanh toán** mới tất toán được |',
     '| `100002` | Hình selfie không đúng | Không khớp khuôn mặt đã đăng ký · hoặc `order_id` chưa facematch |',
     '| `500014` | Trạng thái khoản vay không hợp lệ | Khoản vay không ở `DISBURSE`, `TEMP_LOCK`, `TEMP_LOCK_FRAUD`, `PERM_LOCK`, `WRITTEN_OFF` |',
     '| `900000` | Có lỗi xảy ra | Khuôn mặt chưa verify (check Sola portal) → báo Ops KYC |', '',
     '## Chi tiết theo API', '']
L += tbl('APIs sau vay', ['Bước', 'API', 'Lỗi phát sinh', 'Ops kiểm tra', 'Nguyên nhân', 'Hướng xử lý'])
L += ['', '## Payment (Paylater)', '']
L += tbl('Payment', ['Bước', 'Màn hình/API', 'Lỗi phát sinh', 'Nguyên nhân', 'Hướng xử lý'])
pathlib.Path('kb/operations/ma-loi-api.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print('kb/operations/ma-loi-api.md')

L = ['---', 'title: Quy trình sau vay — thanh toán, quét nợ, tất toán', 'audience: [ops, po]', 'nhom: 2',
     'sources:', '  - "file: Troubleshoot Lending Ops.xls — tab Quy trình sau vay, Recon"',
     'last_verified: 2026-10-02', 'owner: dung.pham2', 'status: draft', '---', '',
     '# Quy trình sau vay', '']
L += tbl('Quy trình sau vay', ['Bước', 'Nghiệp vụ', 'Lỗi phát sinh', 'Nguyên nhân', 'Hướng xử lý'])
L += ['', '## Đối soát (Recon)', '']
L += tbl('Recon', ['Bước', 'Công cụ', 'Lỗi phát sinh', 'Recon kiểm tra', 'Nguyên nhân', 'Hướng xử lý'])
L += ['', '## Phân biệt khách tự trả hay hệ thống tự thu', '',
      'Mambu ghi channel `autoCollection` **vẫn có thể là khách tự thanh toán**. Phải xem Identity trong workflow:', '',
      '| Identity | Nghĩa |', '|---|---|',
      '| `@cake-loan-management` | **Khách chủ động** thanh toán |',
      '| `@cake-collection` | **Hệ thống tự thu** |', '',
      'Cần Tech kiểm tra workflow, Ops không tự tra được.', '']
pathlib.Path('kb/operations/quy-trinh-sau-vay.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print('kb/operations/quy-trinh-sau-vay.md')
