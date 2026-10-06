# -*- coding: utf-8 -*-
"""Đọc Troubleshoot Lending Ops.xls → kb/operations/.
Nguồn gốc là .xls (BIFF8). Bản PDF mất dấu tiếng Việt nên không dùng.
Cần: pip install xlrd==2.0.1
"""
import sys, json, pathlib
try:
    import xlrd
except ImportError:
    sys.exit("Cần xlrd: pip install xlrd==2.0.1")

SRC = sys.argv[1] if len(sys.argv) > 1 else '/Users/dung.pham2/Downloads/Troubleshoot Lending Ops.xls'
b = xlrd.open_workbook(SRC)
data = {}
for s in b.sheets():
    rows = []
    for r in range(s.nrows):
        row = [str(s.cell_value(r, c)).strip() for c in range(s.ncols)]
        if any(row):
            rows.append(row)
    data[s.name] = rows

out = pathlib.Path('tools/scan'); out.mkdir(parents=True, exist_ok=True)
(out / 'troubleshoot.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"{len(data)} tab → tools/scan/troubleshoot.json")
for n, rows in data.items():
    print(f"  {n:28} {len(rows):4} dòng")
