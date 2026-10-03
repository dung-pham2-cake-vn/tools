import { Request, Response } from 'express';
import { taskService } from '../services/TaskService';

export class TaskController {
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.createTask(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const { status, priority, sprint } = req.query;
      const filter: any = {};

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (sprint) filter.sprint = sprint;

      const tasks = await taskService.getTasks(filter);
      res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const success = await taskService.deleteTask(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTasksBySprintId(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await taskService.getTasksBySprintId(req.params.sprintId);
      res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const task = await taskService.updateTaskStatus(req.params.id, status);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const taskController = new TaskController();
