import { Request, Response } from 'express';
import { sprintService } from '../services/SprintService';

export class SprintController {
  async createSprint(req: Request, res: Response): Promise<void> {
    try {
      const sprint = await sprintService.createSprint(req.body);
      res.status(201).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getSprints(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const filter: any = {};

      if (status) filter.status = status;

      const sprints = await sprintService.getSprints(filter);
      res.status(200).json({ success: true, data: sprints });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getSprintById(req: Request, res: Response): Promise<void> {
    try {
      const sprint = await sprintService.getSprintById(req.params.id);
      if (!sprint) {
        res.status(404).json({ success: false, error: 'Sprint not found' });
        return;
      }
      res.status(200).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateSprint(req: Request, res: Response): Promise<void> {
    try {
      const sprint = await sprintService.updateSprint(req.params.id, req.body);
      if (!sprint) {
        res.status(404).json({ success: false, error: 'Sprint not found' });
        return;
      }
      res.status(200).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteSprint(req: Request, res: Response): Promise<void> {
    try {
      const success = await sprintService.deleteSprint(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, error: 'Sprint not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Sprint deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async addTaskToSprint(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.body;
      const sprint = await sprintService.addTaskToSprint(req.params.id, taskId);
      res.status(200).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async removeTaskFromSprint(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.body;
      const sprint = await sprintService.removeTaskFromSprint(req.params.id, taskId);
      res.status(200).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getSprintMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await sprintService.calculateSprintMetrics(req.params.id);
      res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const sprintController = new SprintController();
