#!/bin/bash
# Chu trình cập nhật KB — chạy hàng tháng.
#   ./tools/refresh.sh            kéo dữ liệu mới + index lại + báo cáo cần rà gì
#   ./tools/refresh.sh --no-pull  chỉ index lại từ raw/ đang có
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ "${1:-}" != "--no-pull" ]; then
  echo "==> 1/4 Kéo dữ liệu mới từ Confluence + Jira"
  node --env-file=tools/.env tools/export.mjs
else
  echo "==> 1/4 Bỏ qua bước kéo dữ liệu"
fi

echo
echo "==> 2/4 Thu product_code + index lại toàn bộ tài liệu"
node tools/harvest-codes.mjs | tail -1
node tools/build-index.mjs
node tools/value-index.mjs | tail -1
node tools/policy-values.mjs | tail -1

echo
echo "==> 3/4 Soát file KB cần rà"
python3 - <<'PY'
import json, re, pathlib, datetime
idx = json.load(open('tools/scan/doc-index.json'))
today = datetime.date.today()
stale, unverified, newer = [], [], []

for p in sorted(pathlib.Path('kb').rglob('*.md')):
    s = p.read_text(encoding='utf-8')
    m = re.match(r'^---\n(.*?)\n---', s, re.S)
    if not m:
        continue
    fm = m.group(1)
    g = lambda k: (re.search(rf'^{k}:\s*(.*)$', fm, re.M) or [None, ''])[1].strip()

    lv = g('last_verified')
    if lv:
        try:
            if (today - datetime.date.fromisoformat(lv)).days > 180:
                stale.append((str(p), lv))
        except ValueError:
            pass

    if g('needs_jira_verify') == 'true':
        unverified.append(str(p))

    # Ticket policy mới hơn ngày số liệu của file
    pid = (re.search(r'ProductId \| `(.+?)`', s) or [None, None])[1]
    asof = g('numbers_asof')
    if pid and asof and asof != '—':
        hits = [r for r in idx
                if pid in r['products'] and r['src'] == 'jira'
                and any(t.startswith('policy-') for t in r['tags'])
                and r['status'] in ('Released', 'Done') and r['date'] > asof]
        if hits:
            newer.append((pid, asof, len(hits), max(h['date'] for h in hits)))

print(f"\n[{len(newer)}] sản phẩm có ticket policy mới hơn số liệu trong KB:")
for pid, asof, n, last in sorted(newer, key=lambda x: -x[2]):
    print(f"    {pid:22} số tới {asof} · {n} ticket mới, gần nhất {last}")

print(f"\n[{len(unverified)}] file chưa đối chiếu Jira (needs_jira_verify: true):")
for f in unverified[:15]:
    print(f"    {f}")
if len(unverified) > 15:
    print(f"    … và {len(unverified) - 15} file nữa")

print(f"\n[{len(stale)}] file quá 180 ngày chưa rà lại:")
for f, lv in stale[:15]:
    print(f"    {lv}  {f}")

print("\nXong. Agent đọc ticket/page của từng mục trên rồi sửa trang kb/ — xem kb-po/SCHEMA.md mục Chu trình tháng.")
PY

echo
echo "==> 4/4 Sinh lại index + soát sức khoẻ wiki"
node tools/kb-index.mjs
node tools/kb-lint.mjs || echo "   ^ có lỗi 🔴, sửa trước khi chốt đợt này"

echo
echo "Nhớ ghi một dòng vào kb-po/bao-tri/log.md — xem kb-po/SCHEMA.md."
