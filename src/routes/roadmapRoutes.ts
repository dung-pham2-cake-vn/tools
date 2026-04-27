import { Router } from 'express';
import { roadmapController } from '../controllers/RoadmapController';

const router = Router();

// Roadmap endpoints
router.post('/', (req, res) => roadmapController.createRoadmap(req, res));
router.get('/', (req, res) => roadmapController.getRoadmaps(req, res));
router.get('/:id', (req, res) => roadmapController.getRoadmapById(req, res));
router.put('/:id', (req, res) => roadmapController.updateRoadmap(req, res));
router.delete('/:id', (req, res) => roadmapController.deleteRoadmap(req, res));

// Roadmap item management
router.post('/:id/items', (req, res) => roadmapController.addItemToRoadmap(req, res));
router.put('/:id/items/:itemId', (req, res) => roadmapController.updateRoadmapItem(req, res));
router.delete('/:id/items/:itemId', (req, res) => roadmapController.removeItemFromRoadmap(req, res));

export default router;
