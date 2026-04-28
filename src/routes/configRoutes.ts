import express from 'express';
import { getAIConfig, saveAIConfig, testAIConfigEndpoint } from '../controllers/ConfigController';

const router = express.Router();

router.get('/ai', getAIConfig);
router.put('/ai', saveAIConfig);
router.post('/ai/test', testAIConfigEndpoint);

export default router;
