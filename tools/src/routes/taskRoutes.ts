import { Router } from 'express';
import { taskController } from '../controllers/TaskController';

const router = Router();

// Task endpoints
router.post('/', (req, res) => taskController.createTask(req, res));
router.get('/', (req, res) => taskController.getTasks(req, res));
router.get('/:id', (req, res) => taskController.getTaskById(req, res));
router.put('/:id', (req, res) => taskController.updateTask(req, res));
router.delete('/:id', (req, res) => taskController.deleteTask(req, res));

// Sprint-related task endpoints
router.get('/sprint/:sprintId/tasks', (req, res) => taskController.getTasksBySprintId(req, res));

// Task status endpoints
router.patch('/:id/status', (req, res) => taskController.updateTaskStatus(req, res));

export default router;
