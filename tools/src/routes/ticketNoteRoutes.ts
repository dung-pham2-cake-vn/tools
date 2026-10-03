import { Router, Request, Response } from 'express';
import { getNote, saveNote } from '../services/TicketNoteService';

const router = Router();

// Note riêng theo ticket Jira — chỉ lưu ở tool
router.get('/:ticketKey', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await getNote(String(req.params.ticketKey)) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:ticketKey', async (req: Request, res: Response) => {
  try {
    const data = await saveNote(String(req.params.ticketKey), String(req.body?.content ?? ''));
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
