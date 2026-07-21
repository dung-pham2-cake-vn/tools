# Sprint Tools — Project Overview

Tài liệu mô tả toàn bộ hệ thống để AI có thể rebuild tool tương tự.

---

## 1. Mục đích

Hệ thống nội bộ giúp **Product Owner / Team Lead** quản lý sprint, ticket Jira và sức khoẻ dự án.
Tích hợp sâu với Jira + Confluence, có dashboard real-time và AI phân tích ticket.

**Đối tượng sử dụng:** PO, Team Lead của các lending product (Lending App, LOS, DOP).

**Bài toán giải quyết:**
- Kiểm tra sprint/fix-version có đồng bộ không (Sprint N ↔ Fix Version N)
- Theo dõi subtask dev còn tồn đọng
- Phát hiện story Draft / chưa assign từ ngày 1 sprint
- Quét support ticket Jira, đánh giá, ghi chú phân tích
- Parse Confluence sprint-planning page → bảng ticket có trạng thái
- Gửi UAT đúng thời điểm (ngày 7 sprint)

---

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js 20, Express 4, TypeScript 5 (strict) |
| Frontend | Next.js 15, React 19, Tailwind CSS 3 |
| Database | MongoDB 7 (Mongoose ODM) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — Claude |
| HTTP | Axios (cả BE và FE) |
| Dev tools | ts-node-dev, concurrently, ESLint, Prettier |
| Logging | Morgan |
| Notification | react-hot-toast |

---

## 3. Cấu trúc thư mục

```
tools/
├── src/                          # Backend (Express + TypeScript)
│   ├── server.ts                 # Entry point, route mounting
│   ├── config/
│   │   └── database.ts           # MongoDB connection (Mongoose)
│   ├── models/                   # Mongoose schemas
│   │   ├── Task.ts
│   │   ├── Sprint.ts
│   │   ├── Roadmap.ts
│   │   ├── SupportTicket.ts
│   │   └── AppConfig.ts          # Key-value store (config, cache)
│   ├── controllers/              # Route handlers
│   │   ├── TaskController.ts
│   │   ├── SprintController.ts
│   │   ├── RoadmapController.ts
│   │   ├── JiraController.ts
│   │   ├── SupportController.ts
│   │   ├── SprintManagementController.ts
│   │   └── ConfigController.ts
│   ├── services/                 # Business logic
│   │   ├── TaskService.ts
│   │   ├── SprintService.ts
│   │   ├── RoadmapService.ts
│   │   ├── JiraService.ts        # Jira + Confluence API client
│   │   ├── SupportService.ts
│   │   └── AIService.ts          # Claude / OpenAI wrapper
│   ├── routes/
│   │   ├── taskRoutes.ts
│   │   ├── sprintRoutes.ts
│   │   ├── roadmapRoutes.ts
│   │   ├── jiraRoutes.ts
│   │   ├── supportRoutes.ts
│   │   ├── sprintManagementRoutes.ts
│   │   └── configRoutes.ts
│   └── middleware/
│       ├── logger.ts             # Morgan middleware
│       └── errorHandler.ts      # 404 + global error handler
├── client/                       # Frontend (Next.js + Tailwind)
│   └── src/
│       ├── pages/
│       │   ├── index.tsx         # Dashboard chính
│       │   ├── tasks.tsx         # Quản lý task
│       │   ├── sprints/
│       │   │   ├── index.tsx     # Danh sách sprint
│       │   │   └── management.tsx# Sprint planning (Confluence loader)
│       │   ├── roadmap.tsx       # Roadmap từ Jira
│       │   ├── support.tsx       # Support ticket scanner
│       │   ├── config.tsx        # AI provider config
│       │   └── jira.tsx          # Placeholder
│       ├── components/
│       │   ├── SprintManagementAnalysis.tsx  # Shared types + helpers
│       │   ├── AdfRenderer.tsx               # Render Atlassian ADF
│       │   ├── Layout.tsx
│       │   └── Sidebar.tsx
│       └── utils/
│           └── api.ts            # Axios API client (grouped by domain)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 4. Biến môi trường (`.env`)

```env
# Server
PORT=3002
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/tools-management
MONGODB_USER=
MONGODB_PASSWORD=

# JWT (chưa enforce, để sẵn cho tương lai)
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Jira / Confluence
JIRA_HOST=https://your-domain.atlassian.net
JIRA_USERNAME=your_jira_email@example.com
JIRA_API_TOKEN=your_jira_api_token   # API token từ Atlassian account settings

# Logging
LOG_LEVEL=info
```

**Lưu ý:** AI config (API key, model, provider) được lưu trong MongoDB (`AppConfig` collection), không phải env — để user có thể thay đổi qua UI mà không cần restart server.

---

## 5. Database Models

### Task
```typescript
{
  title: string            // required
  description?: string
  storyPoints: number      // default 0
  status: 'todo' | 'in-progress' | 'in-review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  sprint?: ObjectId        // ref: Sprint
  jiraKey?: string         // unique, sparse index
  createdAt, updatedAt     // auto timestamps
}
```

### Sprint
```typescript
{
  name: string             // required
  description?: string
  startDate: Date          // required
  endDate: Date            // required
  status: 'planning' | 'active' | 'closed'
  totalStoryPoints: number
  completedStoryPoints: number
  tasks: ObjectId[]        // ref: Task[]
}
```

### Roadmap
```typescript
{
  title: string
  description?: string
  version: string          // default '1.0.0'
  status: 'planning' | 'in-progress' | 'completed'
  targetDate?: Date
  items: [{
    id: string             // timestamp-based unique ID
    title: string
    description?: string
    quarter: string        // e.g. 'Q1 2026'
    status: 'planned' | 'in-progress' | 'completed'
    priority: 'low' | 'medium' | 'high'
    relatedTasks?: ObjectId[]
  }]
}
```

### SupportTicket
```typescript
{
  jiraId: string           // unique, Jira internal ID
  key: string              // e.g. 'PL-1234'
  title: string
  description: string      // plain text extracted
  descriptionAdf: any      // raw Atlassian Document Format
  linkedWorkItems: any[]   // Jira issue links
  hyperlink: string        // URL to Jira issue
  type: string             // Task, Bug, Story
  status: string           // Jira status name
  assignee: string
  priority: string
  sprint: string
  created: Date
  updated: Date
  comments: [{
    id: string
    author: string
    body: string
    created: Date
    updated: Date
  }]
  analyzeNote: string      // Manual PO analysis note
  attachments: [{          // Image attachments only
    id: string
    filename: string
    mimeType: string
    url: string
  }]
}
```

### AppConfig (Key-Value Store)
```typescript
{
  key: string              // unique key
  value: any               // flexible JSON value
}
```

**Keys được dùng:**
| Key | Value |
|---|---|
| `ai_config` | `{ provider, apiKey, model, baseUrl }` |
| `sprint_mgmt_pages` | `Record<pageId, { title, content, loadedAt, url }>` |
| `sprint_mgmt_results` | `Array<{ result, pageIds, timestamp }>` (giữ 20 gần nhất) |
| `sprint_mgmt_ticket_cache` | `Record<ticketId, NormalizedTicket>` |

---

## 6. API Endpoints

### Tasks `/api/tasks`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | Tạo task mới |
| GET | `/` | Lấy danh sách (filter: status, priority, sprint) |
| GET | `/:id` | Chi tiết task |
| PUT | `/:id` | Cập nhật task |
| DELETE | `/:id` | Xóa task |
| GET | `/sprint/:sprintId/tasks` | Tasks theo sprint |
| PATCH | `/:id/status` | Cập nhật status |

### Sprints `/api/sprints`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | Tạo sprint |
| GET | `/` | Danh sách (filter: status) |
| GET | `/:id` | Chi tiết sprint |
| PUT | `/:id` | Cập nhật sprint |
| DELETE | `/:id` | Xóa sprint |
| POST | `/:id/tasks` | Thêm task vào sprint |
| DELETE | `/:id/tasks` | Xóa task khỏi sprint |
| GET | `/:id/metrics` | Story point metrics |

### Jira `/api/jira`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/issue/:issueKey` | Lấy issue theo key |
| GET | `/search` | JQL search (params: jql, startAt, maxResults, fields, nextPageToken) |
| GET | `/projects` | Danh sách project |
| GET | `/boards` | Boards theo project (param: projectKeyOrId) |
| GET | `/boards/:boardId/sprints` | Sprints theo board (param: state) |
| GET | `/projects/:projectKeyOrId/versions` | Fix versions |
| POST | `/sync/:jiraKey` | Sync Jira issue → local Task |
| POST | `/create` | Tạo Jira issue + local Task |

### Support `/api/support`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/scan` | Quét Jira tickets (body: `{ mode: 'Scan Un-closed' \| 'Scan All' }`) |
| GET | `/tickets` | Lấy stored tickets (limit 500, sort created DESC) |
| PATCH | `/tickets/:id/analyze` | Lưu note phân tích |
| POST | `/tickets/:id/reload` | Refresh ticket từ Jira |
| POST | `/tickets/:id/ai-analyze` | AI phân tích ticket |
| GET | `/attachment/:attachmentId` | Proxy stream Jira attachment |

### Sprint Management `/api/sprint-management`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/confluence-children` | Child pages của ROOT_PAGE trên Confluence |
| GET | `/loaded-pages` | Danh sách pages đã load vào cache |
| POST | `/load-page/:pageId` | Load + cache Confluence page |
| GET | `/page-content/:pageId` | Nội dung page (param: raw=1 cho HTML thuần) |
| POST | `/analyze` | AI analyze các pages (body: `{ pageIds, prompt }`) |
| POST | `/parse` | Parse pages bằng regex script (body: `{ pageIds }`) |
| GET | `/results` | Kết quả analyze/parse đã lưu |
| GET | `/tickets` | Cached tickets (param: ids) |
| POST | `/tickets/reload` | Reload tickets từ Jira (body: `{ ticketIds }`) |

### Config `/api/config`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/ai` | Lấy AI config |
| PUT | `/ai` | Lưu AI config |
| POST | `/ai/test` | Test kết nối AI |

---

## 7. JiraService — Chi tiết tích hợp

`JiraService` tạo 3 axios instances:

```typescript
// REST API v3 — CRUD issues, search, projects
axiosInstance: baseURL = `${JIRA_HOST}/rest/api/3`

// Agile API — Boards, sprints
agileAxiosInstance: baseURL = `${JIRA_HOST}/rest/agile/1.0`

// Confluence API v2 — Pages, content
confluenceAxiosInstance: baseURL = `${JIRA_HOST}/wiki/api/v2`
```

Auth: Basic Auth với `JIRA_USERNAME:JIRA_API_TOKEN` (Base64 encoded).

### `searchIssuesWithOptions(jql, options)`
Đây là method quan trọng nhất. Nó:
1. Resolve custom field names (ví dụ `'storyPoints'` → `'customfield_10016'`) dựa trên Jira field definitions
2. Paginate tự động nếu cần
3. Normalize mỗi issue trả về với các fields chuẩn:

```typescript
// Fields được normalize (thêm vào issue.fields):
normalizedSprints: [{
  id, name, state,          // 'active' | 'closed' | 'future'
  startDate, endDate        // ISO strings (UTC+7 safe)
}]
normalizedFixVersions: [{
  id, name, released, archived,
  startDate, releaseDate
}]
normalizedSprintNames: string[]
normalizedFixVersionNames: string[]
normalizedStatusName: string     // e.g. 'In Progress'
normalizedAssigneeName: string   // display name, '' if unassigned
normalizedPriorityName: string
normalizedStoryPoints: number
```

### Custom Fields dùng trong dự án
| Custom Field | Mô tả |
|---|---|
| `customfield_10016` | Story Point Estimate |
| `customfield_10020` | Sprint field |
| `customfield_10222` | Roadmap (Now / Next / Someday) |
| `customfield_10225` | Effort Score |
| `customfield_10227` | Goal Impact Score |
| `customfield_10235` | Project Start Date |
| `customfield_10631` | Target Sprint |

---

## 8. AIService — Chi tiết tích hợp AI

AI config lưu trong MongoDB (`AppConfig.key = 'ai_config'`), không cần restart khi đổi.

### Providers hỗ trợ
- `anthropic` — Anthropic SDK, streaming
- `openai` — OpenAI-compatible REST API
- `custom-openai` — Custom base URL, OpenAI format
- `custom-claude` — Custom base URL, Claude format

### `analyzeWithCustomPrompt(fullPrompt)`
Gọi AI với prompt hoàn chỉnh, stream response về. Dùng cho:
- Phân tích Confluence sprint page → JSON có cấu trúc
- Phân tích support ticket

### `analyzeTicketWithAI(ticketData)`
Gửi toàn bộ ticket data (title, description, comments, linked items) cho AI phân tích.

---

## 9. SprintManagementController — Logic phức tạp nhất

### `parsePagesByScript()` — Parse Confluence HTML (không dùng AI)
Regex-based parser, không tốn API:
1. Load HTML từ cache
2. Convert Confluence emoticons → emoji (`<ac:image>` → 🟢/🟡/🔴)
3. Convert `<ac:structured-macro name="status">` → text status
4. Strip HTML tags
5. Detect sections: `Core`, `Must have`, `Nice to have`, `Backlog`
6. Detect items: Dòng có emoji + số thứ tự (e.g. `🟢 1. Title ...`)
7. Extract:
   - PR number (pattern `PR\d+` hoặc `#\d+`)
   - Team tags (BE, FE, Mobile, Data, etc.)
   - Ticket IDs (pattern `[A-Z]+-\d+`)
8. Output JSON:
   ```json
   {
     "sections": [{
       "name": "Core",
       "emoji": "🟢",
       "items": [{
         "number": 1,
         "icon": "🟢",
         "teams": ["BE", "FE"],
         "prNumber": "PR001",
         "title": "Tên feature",
         "tickets": [{ "id": "PL-1234", "name": "", "type": "Story", "status": "" }]
       }]
     }],
     "contributors": {}
   }
   ```

### `reloadCachedTickets()` — Sync Jira ticket tree
1. Nhận list ticket IDs
2. Query Jira theo batch (`issuekey IN (...)`)
3. Với mỗi ticket: fetch subtasks (children)
4. Build parent-child map
5. Normalize ticket:
   ```typescript
   {
     id, name, type, status, assignee,
     storyPoints, lastUpdatedAt, jiraUpdatedAt,
     parentId, children: string[],
     fixVersions: string[]
   }
   ```
6. Lưu vào `AppConfig['sprint_mgmt_ticket_cache']`

---

## 10. Dashboard (Frontend) — Logic chính

File: `client/src/pages/index.tsx`

Dashboard load song song 3 data sources khi mount:

```
Promise.all([
  loadSprintAlignmentReports(),   // Sprint/FixVersion alignment
  loadSprintTicketHealth(),       // Draft + unassigned stories
])
→ loadSprintMgmtData(sprintName) // Confluence parse results + ticket cache
```

### Các TaskItem sections (theo thứ tự hiển thị)

#### 1. "Ngày 1 trở đi ticket đúng sprint"
- JQL: `project IN (PL, PLO, DOP) AND Sprint IN openSprints() AND issuetype = Story`
- Hiển thị:
  - Stories có `normalizedStatusName === 'draft'`
  - Stories có `normalizedAssigneeName === ''`
- Status badge: `ok` nếu không có vấn đề, `error` nếu có

#### 2. "Ngày 7 trở đi xong hết subtask dev"
- Nguồn: ticket cache từ Confluence parse
- Filter: `isSoftwareEngineer(assignee)` + status in (todo, inProgress)
- Thêm filter: subtask phải thuộc sprint hiện tại (check fixVersion)
- Status badge: `ok` nếu không còn subtask dev tồn đọng

#### 3. "Ngày 9 trở đi gửi UAT"
- Nguồn: `smItems` (items từ parse) + `localStorage` PO status
- `derivePoStatus(flags, storedStatus)` → nếu `'need-uat'` thì hiện
- `collectItemStoryFlags()` phân tích subtask → đưa ra flags

#### 4. "Cập nhật sprint và fix version"
- JQL: `project=PL/PLO/DOP AND Sprint IN openSprints()`
- So sánh sprint dates với fix version dates
- Kiểm tra start/end date khớp nhau giữa các project
- Dùng `getMostCommonDate()` để tìm "canonical" dates
- Status badge: `ok` nếu tất cả aligned

### `SprintOverviewCard`
- Lấy sprint name từ PL project (report đầu tiên)
- Progress bar: `(today - startDate) / (endDate - startDate) * 100%`
- Stats: subtasks + stories breakdown theo todo/inProgress/done
- Nguồn stats: duyệt qua toàn bộ ticket cache (kể cả children)

### Status categorization cho ticket cache
```typescript
SM_TODO = ['open', 'in coding', 'wait4dev']
SM_IN_PROGRESS = ['test failed', 'ready4test', 'in testing', 'in progress']
// else → done
```

---

## 11. Sprint Alignment Logic

### Mốc tính sprint
```
Sprint 182 bắt đầu: 24/02/2026
Mỗi sprint = 14 ngày calendar
sprint_offset = floor(days_since_base / 14)
sprint_current = 182 + sprint_offset
```

### Sprint milestones (tính bằng ngày làm việc thứ 2-6)
| Sprint Day | Việc |
|---|---|
| Ngày 1 | Đóng sprint cũ, start sprint mới |
| Ngày 4 | Kiểm tra backend done chưa |
| Ngày 7 | Gửi UAT các story PO Review |
| Ngày 9 | Review tổng ticket tồn đọng |

### Sprint Alignment Check
1. Query `openSprints()` cho PL, PLO, DOP
2. Extract `normalizedSprints` → lấy sprint active duy nhất
3. Query project versions → `pickEarliestUnreleasedVersion()`
4. So sánh start/end dates giữa sprint và fix version
5. Dùng `getMostCommonDate()` để tìm canonical date (majority vote)
6. Đánh dấu ❌ nếu lệch khỏi canonical date

---

## 12. Support Ticket Scanner

### JQL quét support tickets
```jql
project IN (PL, PLO, DOP) 
AND issuetype IN (Task, Bug)
AND status NOT IN ("Invalid", "Test Passed", "Done")
AND created >= -365d
ORDER BY created DESC
```

### Scan Modes
- **Scan Un-closed:** Chỉ quét tickets đang open, thêm check "recently closed" (có trong DB nhưng không còn trong scan)
- **Scan All:** Quét tất cả bất kể status

### Recently Closed Detection
1. Lấy tất cả keys đang open trong DB
2. Keys không có trong kết quả scan mới → có thể đã closed
3. Query Jira verify → mark là `recentlyClosed`

### `saveTicketsToDatabase(issues)`
Upsert logic:
- Key: `jiraId`
- Extract comments: paginate qua `getAllIssueComments(issueKey)`
- Extract attachments: chỉ lấy image (`mimeType.startsWith('image/')`)
- Extract linked work items: `issue.fields.issuelinks`
- Description: thử plain text trước, fallback ADF

---

## 13. Frontend API Client Pattern

`client/src/utils/api.ts` dùng một `apiClient` (axios instance) với `baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'`.

Tất cả API calls được group theo domain:

```typescript
export const jiraAPI = {
  searchIssues: (params: { jql, startAt?, maxResults?, fields?, nextPageToken? }) =>
    apiClient.get('/jira/search', { params: { ...params, fields: params.fields?.join(',') } }),
  getProjectVersions: (projectKeyOrId) => apiClient.get(`/jira/projects/${projectKeyOrId}/versions`),
  // ...
}

export const sprintManagementAPI = {
  getLoadedPages: () => apiClient.get('/sprint-management/loaded-pages'),
  getResults: () => apiClient.get('/sprint-management/results'),
  getTickets: (ids: string[]) => apiClient.get('/sprint-management/tickets', { params: { ids: ids.join(',') } }),
  reloadTickets: (ticketIds: string[]) => apiClient.post('/sprint-management/tickets/reload', { ticketIds }),
  // ...
}
```

Response format nhất quán:
```typescript
{ success: boolean, data: T, error?: string }
```

---

## 14. Key Component Patterns

### `TaskItem` — Collapsible section
```tsx
function TaskItem({ title, status, children }) {
  // status: 'loading' | 'ok' | 'error'
  // lazy render: chỉ render children khi đã mở ít nhất 1 lần
  // StatusBadge hiển thị badge màu tương ứng
}
```

### `SprintManagementAnalysis` — Shared types + helpers
```typescript
// PO Status cho từng sprint item
type PoStatus = 'need-uat' | 'uat-sent' | 'uat-done' | 'pending'

// derivePoStatus logic:
// - Nếu tất cả subtask dev done + không có issue → 'need-uat'
// - User có thể override bằng localStorage
// - Key: `po_status_${pageId}_${item.number}_${item.prNumber}`
```

### Timezone handling
Toàn bộ date comparison dùng UTC+7:
```typescript
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000
const toUtc7Date = (value) => new Date(new Date(value).getTime() + UTC7_OFFSET_MS).toISOString().slice(0, 10)
```

---

## 15. Chạy local

```bash
# Clone + install
git clone <repo>
npm install
cd client && npm install && cd ..

# Config
cp .env.example .env
# Điền JIRA_HOST, JIRA_USERNAME, JIRA_API_TOKEN, MONGODB_URI

# Dev (cả BE + FE)
npm run dev:all
# BE: http://localhost:3002
# FE: http://localhost:3000 (mặc định Next.js, trỏ API sang 3002)

# Build production
npm run build
npm start
```

---

## 16. Các điểm cần chú ý khi rebuild

1. **Jira custom fields** — ID như `customfield_10016` khác nhau giữa các Jira instance. `JiraService.resolveRequestedFields()` giải quyết bằng cách lookup tên field → ID động, không hardcode.

2. **AppConfig pattern** — Thay vì tạo bảng riêng cho từng loại config, dùng key-value generic. Đặc biệt hữu ích cho ticket cache (có thể lớn tùy sprint).

3. **Confluence HTML parsing** — Confluence storage format có nhiều macro đặc biệt (`ac:structured-macro`, `ac:image`, emoticons). Cần convert trước khi parse text.

4. **Sprint ngày làm việc** — Chỉ đếm thứ 2-6, không đếm cuối tuần. Sprint day dùng để trigger checklist (ngày 1/4/7/9).

5. **normalizedSprints** — Jira sprint field là custom field, tên thay đổi theo instance. Service resolve bằng `findFieldIdByName` với nhiều tên candidate.

6. **AI config runtime** — Lưu trong MongoDB để không cần restart server khi đổi provider/model. Frontend có UI riêng để cấu hình.

7. **Ticket cache parent-child** — Khi reload, phải fetch cả subtasks để build cây. Cache lưu `children: string[]` và `parentId` để traverse.

8. **`getMostCommonDate` cho alignment** — Thay vì hardcode "PL là source of truth", dùng majority vote để tìm canonical date. Robust hơn khi một project bị lệch.

9. **Lazy render trong TaskItem** — `everOpened` state đảm bảo không fetch/compute data cho section chưa được mở, giúp dashboard load nhanh hơn.

10. **Jira attachment proxy** — Browser không thể gọi trực tiếp Jira attachment vì auth. Backend làm proxy stream với Jira credentials.

---

## 17. Jira Projects trong hệ thống

| Project Key | Tên đầy đủ | Dùng cho |
|---|---|---|
| `PL` | Lending (Platform) | Sprint alignment, support scan |
| `PLO` | Platform: LOS | Sprint alignment, support scan |
| `DOP` | Product: DOP | Sprint alignment, support scan |

Confluence ROOT_PAGE_ID = `1570209916` — chứa các sprint planning pages con.

---

*Tài liệu này mô tả trạng thái hệ thống tính đến cuối tháng 5/2026.*
