import { Router } from 'express';
import { sprintController } from '../controllers/SprintController';

const router = Router();

// Sprint endpoints
router.post('/', (req, res) => sprintController.createSprint(req, res));
router.get('/', (req, res) => sprintController.getSprints(req, res));
router.get('/:id', (req, res) => sprintController.getSprintById(req, res));
router.put('/:id', (req, res) => sprintController.updateSprint(req, res));
router.delete('/:id', (req, res) => sprintController.deleteSprint(req, res));

// Sprint task management
router.post('/:id/tasks', (req, res) => sprintController.addTaskToSprint(req, res));
router.delete('/:id/tasks', (req, res) => sprintController.removeTaskFromSprint(req, res));

// Sprint metrics
router.get('/:id/metrics', (req, res) => sprintController.getSprintMetrics(req, res));

export default router;
