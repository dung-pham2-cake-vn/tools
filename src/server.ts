import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import taskRoutes from './routes/taskRoutes';
import sprintRoutes from './routes/sprintRoutes';
import roadmapRoutes from './routes/roadmapRoutes';
import jiraRoutes from './routes/jiraRoutes';
import supportRoutes from './routes/supportRoutes';
import configRoutes from './routes/configRoutes';
import sprintManagementRoutes from './routes/sprintManagementRoutes';
import ticketAIRoutes from './routes/ticketAIRoutes';
import { startSvkAutoScan } from './services/svkAutoScan';
import { startTelegramBot } from './services/telegramBot';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/sprint-management', sprintManagementRoutes);
app.use('/api/ticket-ai', ticketAIRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Tools Management System API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks',
      sprints: '/api/sprints',
      roadmaps: '/api/roadmaps',
      jira: '/api/jira',
      support: '/api/support',
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection and server start
const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    // app.listen báo lỗi qua event, không throw — nếu start job ngoài callback thì một
    // instance trùng port vẫn kịp mở Telegram long polling rồi chết, gây 409 Conflict.
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      startSvkAutoScan();
      startTelegramBot();
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} đang bị chiếm — có server khác đang chạy. Dừng tiến trình này.`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
