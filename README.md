# Tools Management System

Hệ thống quản lý các công cụ tích hợp Node.js, Express.js, TypeScript và MongoDB.

## Tính năng

- 📋 **Quản lý Task/Story Point**: Tạo, cập nhật, xoá các task với story point
- 🏃 **Quản lý Sprint**: Quản lý sprint với tính toán metrics tự động
- 🗺️ **Quản lý Roadmap**: Lập kế hoạch roadmap với các quarter khác nhau
- 🔗 **Tích hợp Jira**: Kết nối với Jira API để đồng bộ issues
- ✨ **API RESTful**: API đầy đủ cho tất cả tính năng

## Yêu cầu

- Node.js >= 16
- MongoDB >= 4.4
- npm hoặc yarn

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd tools
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình environment:
```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin của bạn:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tools-management
JIRA_HOST=https://your-domain.atlassian.net
JIRA_USERNAME=your_email@example.com
JIRA_API_TOKEN=your_token
```

4. Khởi động development server:
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## Lệnh

- `npm run dev` - Khởi động development server với hot-reload
- `npm run dev:all` - Khởi động development server&client với hot-reload
- `npm run build` - Build project sang folder dist
- `npm start` - Khởi động server production
- `npm run lint` - Chạy ESLint
- `npm run format` - Format code với Prettier

## API Endpoints

### Tasks
- `POST /api/tasks` - Tạo task mới
- `GET /api/tasks` - Lấy danh sách tasks
- `GET /api/tasks/:id` - Lấy chi tiết task
- `PUT /api/tasks/:id` - Cập nhật task
- `DELETE /api/tasks/:id` - Xoá task
- `PATCH /api/tasks/:id/status` - Cập nhật status task

### Sprints
- `POST /api/sprints` - Tạo sprint mới
- `GET /api/sprints` - Lấy danh sách sprints
- `GET /api/sprints/:id` - Lấy chi tiết sprint
- `PUT /api/sprints/:id` - Cập nhật sprint
- `DELETE /api/sprints/:id` - Xoá sprint
- `POST /api/sprints/:id/tasks` - Thêm task vào sprint
- `DELETE /api/sprints/:id/tasks` - Xoá task khỏi sprint
- `GET /api/sprints/:id/metrics` - Lấy metrics sprint

### Roadmaps
- `POST /api/roadmaps` - Tạo roadmap mới
- `GET /api/roadmaps` - Lấy danh sách roadmaps
- `GET /api/roadmaps/:id` - Lấy chi tiết roadmap
- `PUT /api/roadmaps/:id` - Cập nhật roadmap
- `DELETE /api/roadmaps/:id` - Xoá roadmap
- `POST /api/roadmaps/:id/items` - Thêm item vào roadmap
- `PUT /api/roadmaps/:id/items/:itemId` - Cập nhật item
- `DELETE /api/roadmaps/:id/items/:itemId` - Xoá item

### Jira Integration
- `GET /api/jira/issue/:issueKey` - Lấy issue từ Jira
- `GET /api/jira/search` - Tìm kiếm issues trên Jira
- `GET /api/jira/projects` - Lấy danh sách projects
- `POST /api/jira/sync/:jiraKey` - Đồng bộ issue từ Jira
- `POST /api/jira/create` - Tạo issue mới trên Jira

## Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # API controllers
├── middleware/      # Express middleware
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
└── server.ts        # Main server file
```

## Technologies

- **Express.js** - Web framework
- **TypeScript** - Programming language
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Axios** - HTTP client for Jira API
- **CORS** - Cross-origin resource sharing

## Jira Custom Fields (cakedigitalbank.atlassian.net)

Các custom field dùng trong JQL và API calls — tra cứu qua `GET /rest/api/3/field`.

| Field ID | Tên | Ghi chú |
|---|---|---|
| `customfield_10016` | Story point estimate | SP của issue |
| `customfield_10222` | Roadmap | Values: `Now`, `Next`, `Someday` — dùng để group Roadmap page |
| `customfield_10225` | Effort | Effort score |
| `customfield_10227` | Goal impact | Impact score |
| `customfield_10235` | Project start | Ngày bắt đầu project |
| `customfield_10631` | Target Sprint | Sprint mục tiêu |

> Dùng `cf[XXXXX]` trong JQL, ví dụ: `ORDER BY cf[10222] ASC`

## License

MIT
