import express from 'express';
import { getAIConfig, saveAIConfig, testAIConfigEndpoint, getTeamCapacity, saveTeamCapacity } from '../controllers/ConfigController';

const router = express.Router();

router.get('/ai', getAIConfig);
router.put('/ai', saveAIConfig);
router.post('/ai/test', testAIConfigEndpoint);
router.get('/team-capacity', getTeamCapacity);
router.put('/team-capacity', saveTeamCapacity);

export default router;
