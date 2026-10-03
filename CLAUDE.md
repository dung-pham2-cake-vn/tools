# lending_manage

Repo gốc cho mảng lending. Ba thư mục con độc lập nhau, **không** phải monorepo —
mỗi thư mục có `package.json` riêng, không dùng npm workspaces.

```
lending_manage/
├── open_api_viewer/   # Viewer tĩnh + bộ API spec (YAML) các sản phẩm lending
├── lendkb/            # Knowledge base lending + Telegram bridge
│   ├── workspace/     # KB (kb/, kb-po/), tools sinh KB, raw/ (gitignored)
│   └── tgbot/         # Bot Telegram ↔ Claude Code, chạy nền bằng launchd
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
| Bot Telegram | `lendkb/tgbot/` | `./service.sh install\|status\|logs` |

## Lưu ý về đường dẫn

`open_api_viewer/` nằm ở gốc repo, **không** nằm trong `tools/`. Code trong
`tools/` trỏ tới nó bằng đường dẫn tương đối:

- `tools/package.json` → `../open_api_viewer/`
- `tools/client/src/pages/api/openapi/specs.ts` và `.../specbuilder/meta.ts`
  → `process.cwd()` là `tools/client`, nên dùng `'..', '..', 'open_api_viewer'`

Đổi chỗ thư mục thì phải sửa đủ 4 chỗ trên.

## Bí mật

`.env` bị gitignore ở mọi độ sâu. Trong đó có Jira API token thật —
không commit, không in giá trị ra output. Chi tiết dùng token: `tools/CLAUDE.md`.

## Lịch sử

`lendkb/` trước là repo git riêng, đã gộp vào đây và bỏ lịch sử cũ.
Lý do từng con số trong KB thay đổi được chép lại ở
`lendkb/workspace/kb/_meta/lich-su-quyet-dinh.md`.
