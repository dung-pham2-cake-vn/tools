# Frontend - Next.js + React + TypeScript

Modern, responsive web interface for managing tools, tasks, sprints, and roadmaps.

## Getting Started

### Prerequisites
- Node.js >= 16
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## Features

### 📊 Dashboard
- Overview of tasks, sprints, and progress
- Quick statistics and KPIs
- Navigation to all features

### 📋 Tasks Management
- Create, edit, and delete tasks
- Assign story points
- Set priority and status
- Filter by status and priority
- Real-time updates

### 🏃 Sprint Management
- Create and manage sprints
- Track sprint progress
- View completion percentage
- Add/remove tasks from sprints
- Monitor story points

### 🗺️ Roadmap (Coming Soon)
- Quarterly roadmap planning
- Milestone tracking
- Goal management

### 🔗 Jira Integration (Coming Soon)
- Sync Jira issues
- Two-way synchronization
- Issue creation and updates

## Technology Stack

- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

## Project Structure

```
client/
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Next.js pages
│   ├── styles/         # Global CSS
│   └── utils/          # Helper functions and API client
├── public/             # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Components

- **Layout** - Main layout wrapper
- **Sidebar** - Navigation sidebar
- **TaskCard** - Task display component
- **SprintCard** - Sprint display component
- **CreateTaskModal** - Task creation modal

## Utilities

- **api.ts** - API client and endpoints
- **helpers.ts** - Formatting and utility functions

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Running with Backend

Make sure the backend is running on `http://localhost:3000`:

```bash
# Terminal 1 - Backend
cd /path/to/backend
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Both will be accessible:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api

## Troubleshooting

### API Connection Issues
- Ensure backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Port Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

## Future Enhancements

- Real-time updates with WebSocket
- User authentication
- Advanced filtering and search
- Data export/import
- Custom workflows
- Analytics dashboard

## Contributing

Feel free to add more features and improvements!
