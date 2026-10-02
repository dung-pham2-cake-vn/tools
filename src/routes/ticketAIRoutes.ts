import { Router } from 'express';
import { ticketAIController } from '../controllers/TicketAIController';

const router = Router();

router.get('/presets', (req, res) => ticketAIController.presets(req, res));

// BRD của từng ticket Product Roadmap
router.get('/:ideaKey/brd/links', (req, res) => ticketAIController.brdLinks(req, res));
router.get('/:ideaKey/brd', (req, res) => ticketAIController.listBrd(req, res));
router.post('/:ideaKey/brd', (req, res) => ticketAIController.uploadBrd(req, res));
router.get('/:ideaKey/brd/:brdId/pdf', (req, res) => ticketAIController.downloadBrdPdf(req, res));
router.delete('/:ideaKey/brd/:brdId', (req, res) => ticketAIController.removeBrd(req, res));

// Chat AI theo ticket
router.get('/:ideaKey/chat', (req, res) => ticketAIController.chatHistory(req, res));
router.post('/:ideaKey/chat', (req, res) => ticketAIController.chat(req, res));
router.delete('/:ideaKey/chat', (req, res) => ticketAIController.resetChat(req, res));

export default router;
