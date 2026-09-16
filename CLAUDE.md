# CLAUDE.md

## Atlassian credentials

Jira **và** Confluence dùng chung một Atlassian API token. Token nằm trong `.env`
(gitignored — không commit, không in giá trị ra output):

| Biến | Dùng cho |
|---|---|
| `JIRA_HOST` | Base URL Atlassian site |
| `JIRA_USERNAME` | Email account |
| `JIRA_API_TOKEN` | API token (`ATAT…`) — Basic auth cho **cả Jira lẫn Confluence** |

Load trước khi gọi API:

```bash
set -a && . ./.env && set +a
```

### Confluence REST API v2

Base: `https://cakedigitalbank.atlassian.net/wiki/api/v2`
Auth: `curl -u "$JIRA_USERNAME:$JIRA_API_TOKEN"`

```bash
# đọc page (kèm body storage format)
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "https://cakedigitalbank.atlassian.net/wiki/api/v2/pages/<PAGE_ID>?body-format=storage"

# ghi page — PUT ghi đè TOÀN BỘ body, version phải = version hiện tại + 1
curl -s -X PUT -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data @payload.json \
  "https://cakedigitalbank.atlassian.net/wiki/api/v2/pages/<PAGE_ID>"
```

Payload `PUT`:

```json
{
  "id": "<PAGE_ID>",
  "status": "current",
  "title": "<title>",
  "body": { "representation": "storage", "value": "<XHTML storage format>" },
  "version": { "number": <current+1>, "message": "<changelog>" }
}
```

Luôn `GET` lấy version + body hiện tại trước khi `PUT` — nội dung cũ bị thay hoàn toàn
(vẫn restore được qua page history).

### Jira

`src/services/JiraService.ts` đã wrap sẵn Jira API — dùng service đó thay vì curl tay.

### MCP servers

MCP `atlassian` (local) cần `uvx` — chưa cài trên máy này. Connector `claude.ai Atlassian`
cần OAuth interactive. Dùng REST API + token trong `.env` là đường ngắn nhất.
