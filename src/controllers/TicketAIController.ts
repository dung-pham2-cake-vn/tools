import { Request, Response } from 'express';
import {
  detectBrdLinks,
  importBrd,
  getBrdList,
  getBrdPdf,
  deleteBrd,
  getChat,
  clearChat,
  sendChatMessage,
  runPreset,
  CHAT_PRESETS,
} from '../services/TicketAIService';

const ideaKeyOf = (req: Request) => String(req.params.ideaKey || '').toUpperCase();

export class TicketAIController {
  async brdLinks(req: Request, res: Response): Promise<void> {
    try {
      const links = await detectBrdLinks(ideaKeyOf(req));
      res.status(200).json({ success: true, data: links });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async listBrd(req: Request, res: Response): Promise<void> {
    try {
      const items = await getBrdList(ideaKeyOf(req));
      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /** Nhận file dạng base64 để khỏi cần middleware multipart. */
  async uploadBrd(req: Request, res: Response): Promise<void> {
    try {
      const { filename, contentBase64, sourceUrl } = req.body || {};
      if (!filename || !contentBase64) {
        throw new Error('filename và contentBase64 là bắt buộc');
      }

      const brd = await importBrd({
        ideaKey: ideaKeyOf(req),
        filename: String(filename),
        data: Buffer.from(String(contentBase64), 'base64'),
        sourceUrl: sourceUrl ? String(sourceUrl) : undefined,
      });

      res.status(201).json({
        success: true,
        data: {
          _id: brd._id,
          filename: brd.filename,
          pdfSize: brd.pdfSize,
          textLength: brd.text.length,
          converter: brd.converter,
          sourceUrl: brd.sourceUrl,
          importedAt: brd.importedAt,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async downloadBrdPdf(req: Request, res: Response): Promise<void> {
    try {
      const brd = await getBrdPdf(String(req.params.brdId));
      if (!brd?.pdf) throw new Error('Không tìm thấy BRD');

      const safeName = String(brd.filename || 'brd').replace(/\.[^.]+$/, '');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeName)}.pdf"`);
      // lean() trả Binary của driver, không phải Buffer -> lấy .buffer ra trước.
      const raw: any = brd.pdf;
      res.status(200).send(Buffer.isBuffer(raw) ? raw : Buffer.from(raw?.buffer ?? raw));
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async removeBrd(req: Request, res: Response): Promise<void> {
    try {
      await deleteBrd(String(req.params.brdId));
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async chatHistory(req: Request, res: Response): Promise<void> {
    try {
      const thread = await getChat(ideaKeyOf(req));
      res.status(200).json({ success: true, data: thread?.messages || [] });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, preset } = req.body || {};
      const key = ideaKeyOf(req);
      const thread = preset ? await runPreset(key, String(preset)) : await sendChatMessage(key, String(message || ''));
      res.status(200).json({ success: true, data: thread.messages });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async resetChat(req: Request, res: Response): Promise<void> {
    try {
      await clearChat(ideaKeyOf(req));
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async presets(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: Object.entries(CHAT_PRESETS).map(([key, prompt]) => ({ key, prompt })),
    });
  }
}

export const ticketAIController = new TicketAIController();
