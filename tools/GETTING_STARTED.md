# Hướng dẫn Bắt đầu - Tools Management System

## 🚀 Khởi động nhanh

### Bước 1: Cài đặt Dependencies
```bash
npm install
```

### Bước 2: Cấu hình Environment
```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa .env với thông tin của bạn
# Đặc biệt là MongoDB URI và Jira credentials
```

### Bước 3: Khởi động MongoDB
```bash
# Nếu sử dụng local MongoDB
mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
# Cập nhật MONGODB_URI trong .env
```

### Bước 4: Chạy Server
```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

## 📚 Ví dụ API Usage

### 1. Tạo Task mới
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication",
    "storyPoints": 5,
    "priority": "high",
    "status": "todo"
  }'
```

### 2. Tạo Sprint
```bash
curl -X POST http://localhost:3000/api/sprints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint 1",
    "description": "First sprint of Q2 2024",
    "startDate": "2024-04-01T00:00:00Z",
    "endDate": "2024-04-14T23:59:59Z",
    "status": "active"
  }'
```

### 3. Thêm Task vào Sprint
```bash
curl -X POST http://localhost:3000/api/sprints/{sprintId}/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "{taskId}"
  }'
```

### 4. Lấy Metrics Sprint
```bash
curl -X GET http://localhost:3000/api/sprints/{sprintId}/metrics
```

### 5. Đồng bộ Task từ Jira
```bash
curl -X POST http://localhost:3000/api/jira/sync/PROJ-123
```

### 6. Tạo Roadmap
```bash
curl -X POST http://localhost:3000/api/roadmaps \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2024 Product Roadmap",
    "version": "1.0.0",
    "status": "in-progress"
  }'
```

### 7. Thêm Item vào Roadmap
```bash
curl -X POST http://localhost:3000/api/roadmaps/{roadmapId}/items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mobile App Launch",
    "description": "Launch iOS and Android apps",
    "quarter": "Q2 2024",
    "priority": "high",
    "status": "planned"
  }'
```

## 🔑 Cấu hình Jira

1. Truy cập [Jira API Tokens](https://id.atlassian.com/manage/api-tokens)
2. Tạo API Token mới
3. Sao chép token và email Jira của bạn
4. Thêm vào file `.env`:
```env
JIRA_HOST=https://your-domain.atlassian.net
JIRA_USERNAME=your_email@example.com
JIRA_API_TOKEN=your_api_token
```

## 📊 Database Schema

### Tasks
- `title`: Tên task (bắt buộc)
- `description`: Mô tả chi tiết
- `storyPoints`: Số story point (0+)
- `status`: todo | in-progress | in-review | done
- `priority`: low | medium | high | critical
- `assignee`: Người được giao
- `sprint`: Reference tới Sprint
- `jiraKey`: Mã issue Jira (nếu có)

### Sprints
- `name`: Tên sprint (bắt buộc)
- `description`: Mô tả
- `startDate`: Ngày bắt đầu (bắt buộc)
- `endDate`: Ngày kết thúc (bắt buộc)
- `status`: planning | active | closed
- `tasks`: Danh sách tasks
- `totalStoryPoints`: Tính toán tự động
- `completedStoryPoints`: Tính toán tự động

### Roadmaps
- `title`: Tên roadmap (bắt buộc)
- `version`: Phiên bản
- `status`: planning | in-progress | completed
- `items`: Danh sách items
  - `id`: ID duy nhất
  - `title`: Tên item
  - `quarter`: Q1/Q2/Q3/Q4
  - `priority`: low | medium | high
  - `status`: planned | in-progress | completed
  - `relatedTasks`: Liên kết tới tasks

## 🐛 Troubleshooting

### MongoDB Connection Error
```
❌ MongoDB connection error: Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp**: Đảm bảo MongoDB đang chạy hoặc cập nhật MONGODB_URI trong .env

### Jira Authentication Failed
```
Error: Invalid Jira credentials
```
**Giải pháp**: Kiểm tra JIRA_HOST, JIRA_USERNAME, JIRA_API_TOKEN trong .env

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Giải pháp**: Thay đổi PORT trong .env hoặc kill process đang sử dụng port 3000

## 📁 Project Structure
```
src/
├── config/              # Configuration files
│   └── database.ts      # MongoDB connection
├── controllers/         # API logic
│   ├── TaskController.ts
│   ├── SprintController.ts
│   ├── RoadmapController.ts
│   └── JiraController.ts
├── models/              # Database schemas
│   ├── Task.ts
│   ├── Sprint.ts
│   └── Roadmap.ts
├── routes/              # API routes
│   ├── taskRoutes.ts
│   ├── sprintRoutes.ts
│   ├── roadmapRoutes.ts
│   └── jiraRoutes.ts
├── services/            # Business logic
│   ├── TaskService.ts
│   ├── SprintService.ts
│   ├── RoadmapService.ts
│   └── JiraService.ts
├── middleware/          # Express middleware
│   ├── logger.ts
│   └── errorHandler.ts
├── utils/               # Utility functions
│   └── validators.ts
└── server.ts            # Main server file
```

## 🔄 Development Workflow

1. **Tạo task mới**
   ```bash
   POST /api/tasks
   ```

2. **Tạo sprint**
   ```bash
   POST /api/sprints
   ```

3. **Thêm task vào sprint**
   ```bash
   POST /api/sprints/{id}/tasks
   ```

4. **Cập nhật task status khi làm việc**
   ```bash
   PATCH /api/tasks/{id}/status
   ```

5. **Xem sprint metrics**
   ```bash
   GET /api/sprints/{id}/metrics
   ```

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Docker (Optional)
Tạo `Dockerfile`:
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

Build image:
```bash
docker build -t tools-management .
docker run -p 3000:3000 tools-management
```

## 📞 Support & Documentation

- GitHub Issues: Report bugs tại đây
- API Documentation: Xem README.md
- Jira Documentation: https://developer.atlassian.com/

Chúc bạn thành công! 🎉
