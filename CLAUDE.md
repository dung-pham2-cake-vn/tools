# lending_manage

Repo gốc cho mảng lending. Ba thư mục con độc lập nhau, **không** phải monorepo —
mỗi thư mục có `package.json` riêng, không dùng npm workspaces.

```
lending_manage/
├── open_api_viewer/   # Viewer tĩnh + bộ API spec (YAML) các sản phẩm lending
├── lendkb/            # Knowledge base lending
│   └── workspace/     # KB (kb/, kb-po/), tools sinh KB, raw/ (gitignored)
└── tools/             # App quản lý task/sprint/roadmap (Express + Next.js)
```

## Chạy gì ở đâu

| Việc | Thư mục | Lệnh |
|---|---|---|
| Backend tools | `tools/` | `npm run dev` (cổng 3001) |
| Frontend tools | `tools/client/` | `npm run dev` |
| Dựng index spec | `tools/` | `npm run specs:index` |
| Viewer spec độc lập | `tools/` | `npm run viewer` (cổng 8777) |
| Làm mới KB | `lendkb/workspace/` | `tools/refresh.sh` |

## Lưu ý về đường dẫn

`open_api_viewer/` nằm ở gốc repo, **không** nằm trong `tools/`. Code trong
`tools/` trỏ tới nó bằng đường dẫn tương đối:

- `tools/package.json` → `../open_api_viewer/`
- `tools/client/src/pages/api/openapi/specs.ts`
  → `process.cwd()` là `tools/client`, nên dùng `'..', '..', 'open_api_viewer'`

Đổi chỗ thư mục thì phải sửa đủ các chỗ trên.

## Trả lời ticket vận hành (vai trò PO)

Đọc `lendkb/AGENTS.md` — quy trình, kết nối Jira fallback, nguyên tắc KB.

## Bí mật

`.env` bị gitignore ở mọi độ sâu. Trong đó có Jira API token thật —
không commit, không in giá trị ra output. Chi tiết dùng token: `tools/CLAUDE.md`.

## Sửa knowledge base

`lendkb/workspace/kb/` theo chuẩn **LLM Wiki**
(<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>).
**Đọc `lendkb/workspace/kb-po/SCHEMA.md` trước khi sửa bất cứ trang nào** — ở đó có
quy trình ingest/query/lint, quy ước frontmatter, cách đặt wikilink, ranh giới
`kb/` (chỉ Ops/CSKH) ↔ `kb-po/` (PO: dữ liệu, số kinh doanh, bảo trì wiki).

Sửa xong chạy:

```bash
cd lendkb/workspace && node tools/kb-index.mjs && node tools/kb-lint.mjs
```

## Viết ticket Jira

Khi được nhờ soạn ticket PL: đọc `lendkb/workspace/kb-po/workflow/quy-tac-viet-ticket.md`
trước. Đó là style viết ticket rút từ 2.355 ticket PL của dung.pham2 — công thức
đặt title, khung Context/Acceptance Criteria, quy ước bảng spec API, label/component.

## Lịch sử

`lendkb/` trước là repo git riêng, đã gộp vào đây và bỏ lịch sử cũ.
Lý do từng con số trong KB thay đổi được chép lại ở
`lendkb/workspace/kb-po/bao-tri/lich-su-quyet-dinh.md`.
