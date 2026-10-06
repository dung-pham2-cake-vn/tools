# -*- coding: utf-8 -*-
"""Chuyển file KB sang format đa-đối-tượng (xem kb-po/bao-tri/format.md).
Bọc nội dung tự sinh trong AUTO markers, thêm mục Ops và CSKH.
Ghi chú PO, số kinh doanh, lịch sử file KHÔNG thêm vào kb/ — chúng ở kb-po/ (2026-10-06).
ĐÃ CHẠY XONG 2026-10-01 — giữ làm lịch sử, KHÔNG chạy lại.
Script nhận biết file đã migrate qua marker AUTO; marker đã bỏ 2026-10-06 nên chạy lại
sẽ chèn trùng mục vào cả 50 trang."""
import re, pathlib, sys

sys.exit('migrate-format.py đã ngừng dùng — xem docstring.')

HUMAN = """
## Ghi chú vận hành — Ops

🟡 `nội bộ` · *Chưa có nội dung. Ops bổ sung.*

Gợi ý: case hay gặp và cách xử lý · lỗi hệ thống đã biết · tra cứu ở đâu ·
khi nào escalate và cho ai.

## Dành cho CSKH
{cskh}"""

def migrate(p: pathlib.Path) -> bool:
    s = p.read_text(encoding='utf-8')
    if 'AUTO:start' in s:
        return False
    fm_m = re.match(r'^---\n(.*?)\n---\n', s, re.S)
    if not fm_m:
        return False
    fm, body = fm_m.group(1), s[fm_m.end():]

    # audience: file sản phẩm dùng cho cả 3 nhóm
    if 'audience:' not in fm:
        fm = fm.replace('status:', 'audience: [cskh, ops, po]\nstatus:', 1)

    # Tách phần "KHÔNG được nói với khách" ra làm hạt nhân cho mục 7.
    cskh = ''
    m = re.search(r'\n## Thông tin KHÔNG được nói với khách\n(.*?)(?=\n## |\Z)', body, re.S)
    if m:
        cskh = ('\n🟢 `khách` — những gì nói được với khách nằm ở các mục số phía trên.\n\n'
                '**Không đọc cho khách:**\n' + m.group(1).rstrip() + '\n')
        body = body[:m.start()] + body[m.end():]
    else:
        cskh = '\n🟢 `khách` · *Chưa có nội dung.*\n\nCâu trả lời mẫu và ranh giới thông tin.\n'

    # "Lưu ý cho agent" là nội dung người viết -> đẩy xuống mục 4 (Ops).
    ops_extra = ''
    m = re.search(r'\n## Lưu ý cho agent.*?\n(.*?)(?=\n## |\Z)', body, re.S)
    if m:
        ops_extra = m.group(1).rstrip()
        body = body[:m.start()] + body[m.end():]

    # Đánh số lại các heading tự sinh.
    body = re.sub(r'\n## Nhận diện sản phẩm', '\n## 1. Nhận diện sản phẩm', body)
    body = re.sub(r'\n## (Số liệu[^\n]*)', r'\n## 2. \1', body)
    body = re.sub(r'\n## (Phí tất toán[^\n]*)', r'\n## 3. \1', body)
    body = re.sub(r'\n## (Sản phẩm ngừng bán)', r'\n## 3. \1', body)

    # "Cần viết" là checklist của vùng tự sinh, giữ trong AUTO.
    title_m = re.match(r'(# [^\n]*\n)', body)
    head = title_m.group(1) if title_m else ''
    rest = body[len(head):]

    human = HUMAN.format(
        cskh=cskh,
        src='Jira' if 'numbers_source: jira' in fm else 'Confluence')
    if ops_extra:
        human = human.replace(
            '🟡 `nội bộ` · *Chưa có nội dung. Ops bổ sung.*\n\nGợi ý: case hay gặp và cách xử lý · lỗi hệ thống đã biết · tra cứu ở đâu ·\nkhi nào escalate và cho ai.',
            '🟡 `nội bộ`\n\n' + ops_extra + '\n\n*Ops bổ sung thêm: case hay gặp, lỗi đã biết, cách tra cứu.*')

    out = (f'---\n{fm}\n---\n\n{head}'
           '\n<!-- AUTO:start — script sinh lại phần này, đừng sửa tay -->\n'
           f'{rest.rstrip()}\n'
           '\n<!-- AUTO:end -->\n'
           f'{human}')
    p.write_text(out, encoding='utf-8')
    return True

n = 0
for p in sorted(pathlib.Path('kb/products').rglob('*.md')):
    if 'status: stub' in p.read_text(encoding='utf-8'):
        continue
    if migrate(p):
        n += 1
print(f'đã migrate {n} file')
