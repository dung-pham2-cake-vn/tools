import { Request, Response } from 'express';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  sendMessage,
  clearMessages,
} from '../services/AIChatService';
import { CHAT_PRESETS } from '../services/TicketAIService';

const fail = (res: Response, error: any) => res.status(400).json({ success: false, error: error?.message || String(error) });

export class AIChatController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;
      res.status(200).json({ success: true, data: await listConversations(ticket) });
    } catch (error) {
      fail(res, error);
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await getConversation(String(req.params.id)) });
    } catch (error) {
      fail(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const doc = await createConversation(req.body || {});
      res.status(201).json({ success: true, data: doc.toObject() });
    } catch (error) {
      fail(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await updateConversation(String(req.params.id), req.body || {}) });
    } catch (error) {
      fail(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      await deleteConversation(String(req.params.id));
      res.status(200).json({ success: true });
    } catch (error) {
      fail(res, error);
    }
  }

  async send(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await sendMessage(String(req.params.id), req.body || {}) });
    } catch (error) {
      fail(res, error);
    }
  }

  async clear(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await clearMessages(String(req.params.id)) });
    } catch (error) {
      fail(res, error);
    }
  }

  async presets(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: Object.entries(CHAT_PRESETS).map(([key, prompt]) => ({ key, prompt })),
    });
  }
}

export const aiChatController = new AIChatController();
