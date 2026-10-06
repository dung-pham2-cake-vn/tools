import { Router } from 'express';
import { ticketAIController } from '../controllers/TicketAIController';

const router = Router();

// BRD của từng ticket Product Roadmap
router.get('/:ideaKey/brd/links', (req, res) => ticketAIController.brdLinks(req, res));
router.get('/:ideaKey/brd', (req, res) => ticketAIController.listBrd(req, res));
router.post('/:ideaKey/brd', (req, res) => ticketAIController.uploadBrd(req, res));
router.post('/:ideaKey/brd/from-url', (req, res) => ticketAIController.importBrdFromLink(req, res));
router.get('/:ideaKey/brd/:brdId/pdf', (req, res) => ticketAIController.downloadBrdPdf(req, res));
router.delete('/:ideaKey/brd/:brdId', (req, res) => ticketAIController.removeBrd(req, res));

// Chat AI: xem /api/ai-chat (hội thoại đính kèm nhiều ticket)

export default router;
