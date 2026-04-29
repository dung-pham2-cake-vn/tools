import express from 'express';
import { scanTickets, getTickets, saveAnalyzeNote, reloadTicket, aiAnalyzeTicket, proxyAttachment } from '../controllers/SupportController';

const router = express.Router();

router.post('/scan', scanTickets);
router.get('/tickets', getTickets);
router.patch('/tickets/:id/analyze', saveAnalyzeNote);
router.post('/tickets/:id/reload', reloadTicket);
router.post('/tickets/:id/ai-analyze', aiAnalyzeTicket);
router.get('/attachment/:attachmentId', proxyAttachment);

export default router;
