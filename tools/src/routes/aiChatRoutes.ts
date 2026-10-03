import { Router } from 'express';
import { aiChatController } from '../controllers/AIChatController';

const router = Router();

router.get('/presets', (req, res) => aiChatController.presets(req, res));

// Hội thoại AI, mỗi hội thoại đính kèm được nhiều ticket Jira
router.get('/conversations', (req, res) => aiChatController.list(req, res));
router.post('/conversations', (req, res) => aiChatController.create(req, res));
router.get('/conversations/:id', (req, res) => aiChatController.get(req, res));
router.patch('/conversations/:id', (req, res) => aiChatController.update(req, res));
router.delete('/conversations/:id', (req, res) => aiChatController.remove(req, res));
router.post('/conversations/:id/messages', (req, res) => aiChatController.send(req, res));
router.delete('/conversations/:id/messages', (req, res) => aiChatController.clear(req, res));

export default router;
