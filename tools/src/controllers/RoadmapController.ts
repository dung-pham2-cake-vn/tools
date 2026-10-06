import { Request, Response } from 'express';
import { roadmapService } from '../services/RoadmapService';

export class RoadmapController {
  async createRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const roadmap = await roadmapService.createRoadmap(req.body);
      res.status(201).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getRoadmaps(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const filter: any = {};

      if (status) filter.status = status;

      const roadmaps = await roadmapService.getRoadmaps(filter);
      res.status(200).json({ success: true, data: roadmaps });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getRoadmapById(req: Request, res: Response): Promise<void> {
    try {
      const roadmap = await roadmapService.getRoadmapById(req.params.id);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }
      res.status(200).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const roadmap = await roadmapService.updateRoadmap(req.params.id, req.body);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }
      res.status(200).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const success = await roadmapService.deleteRoadmap(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Roadmap deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async addItemToRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const roadmap = await roadmapService.addItemToRoadmap(req.params.id, req.body);
      res.status(201).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateRoadmapItem(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const roadmap = await roadmapService.updateRoadmapItem(
        req.params.id,
        itemId,
        req.body
      );
      res.status(200).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async removeItemFromRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const roadmap = await roadmapService.removeItemFromRoadmap(req.params.id, itemId);
      res.status(200).json({ success: true, data: roadmap });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const roadmapController = new RoadmapController();
