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

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
