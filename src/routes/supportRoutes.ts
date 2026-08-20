import express from 'express';
import {
  scanTickets,
  getTickets,
  saveAnalyzeNote,
  reloadTicket,
  aiAnalyzeTicket,
  proxyAttachment,
  getSvkNotes,
  saveSvkNote,
  getSvkTickets,
  getSvkHistoryTickets,
  scanSvk,
  svkAiStatus,
  svkAiRunAll,
  svkAiRunOne,
} from '../controllers/SupportController';

const router = express.Router();

router.post('/scan', scanTickets);
router.get('/tickets', getTickets);
router.get('/svk-notes', getSvkNotes);
router.put('/svk-notes/:key', saveSvkNote);
router.get('/svk/tickets', getSvkTickets);
router.get('/svk/history', getSvkHistoryTickets);
router.post('/svk/scan', scanSvk);
router.get('/svk/ai-status', svkAiStatus);
router.post('/svk/ai-run', svkAiRunAll);
router.post('/svk/tickets/:key/ai', svkAiRunOne);
router.patch('/tickets/:id/analyze', saveAnalyzeNote);
router.post('/tickets/:id/reload', reloadTicket);
router.post('/tickets/:id/ai-analyze', aiAnalyzeTicket);
router.get('/attachment/:attachmentId', proxyAttachment);

export default router;
