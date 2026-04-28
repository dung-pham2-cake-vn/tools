import { Request, Response } from 'express';
import { scanUnclosed, scanAll, executeJQLQuery, saveTicketsToDatabase } from '../services/SupportService';
import { SupportTicket } from '../models/SupportTicket';
import { analyzeTicketWithAI } from '../services/AIService';

export const scanTickets = async (req: Request, res: Response) => {
  const { mode } = req.body;
  try {
    const result = mode === 'Scan All' ? await scanAll() : await scanUnclosed();
    res.status(200).json({ message: 'Scan completed', ...result });
  } catch (error: any) {
    console.error('Error during scan:', error);
    res.status(500).json({ message: 'Scan failed', error: error?.message || String(error) });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await SupportTicket.find().sort({ created: -1 }).limit(500).lean();
    res.status(200).json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: error?.message });
  }
};

export const saveAnalyzeNote = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { analyzeNote } = req.body;
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { analyzeNote: analyzeNote ?? '' },
      { new: true }
    ).lean();
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.status(200).json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save note', error: error?.message });
  }
};

export const reloadTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await SupportTicket.findById(id).lean();
    if (!existing) return res.status(404).json({ message: 'Ticket not found' });

    const issues = await executeJQLQuery(`issue in (${existing.key})`);
    if (!issues.length) return res.status(404).json({ message: 'Issue not found in Jira' });

    await saveTicketsToDatabase(issues);
    const updated = await SupportTicket.findById(id).lean();
    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error reloading ticket:', error);
    res.status(500).json({ message: 'Reload failed', error: error?.message });
  }
};

export const aiAnalyzeTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const ticket = await SupportTicket.findById(id).lean();
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const analysis = await analyzeTicketWithAI({
      key: ticket.key,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      type: ticket.type,
      assignee: ticket.assignee,
      comments: ticket.comments as any[],
      linkedWorkItems: ticket.linkedWorkItems as any[],
    });

    res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({ message: error?.message || 'AI analysis failed' });
  }
};
