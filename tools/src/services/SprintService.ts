import { Sprint, ISprint } from '../models/Sprint';
import { Task } from '../models/Task';

export class SprintService {
  async createSprint(sprintData: Partial<ISprint>): Promise<ISprint> {
    try {
      const sprint = new Sprint(sprintData);
      return await sprint.save();
    } catch (error) {
      console.error('Error creating sprint:', error);
      throw error;
    }
  }

  async getSprints(filter: any = {}): Promise<ISprint[]> {
    try {
      return await Sprint.find(filter).populate('tasks');
    } catch (error) {
      console.error('Error fetching sprints:', error);
      throw error;
    }
  }

  async getSprintById(sprintId: string): Promise<ISprint | null> {
    try {
      return await Sprint.findById(sprintId).populate('tasks');
    } catch (error) {
      console.error('Error fetching sprint by ID:', error);
      throw error;
    }
  }

  async updateSprint(sprintId: string, updateData: Partial<ISprint>): Promise<ISprint | null> {
    try {
      return await Sprint.findByIdAndUpdate(sprintId, updateData, { new: true });
    } catch (error) {
      console.error('Error updating sprint:', error);
      throw error;
    }
  }

  async deleteSprint(sprintId: string): Promise<boolean> {
    try {
      // Remove sprint reference from all tasks
      await Task.updateMany({ sprint: sprintId }, { sprint: null });
      const result = await Sprint.findByIdAndDelete(sprintId);
      return !!result;
    } catch (error) {
      console.error('Error deleting sprint:', error);
      throw error;
    }
  }

  async addTaskToSprint(sprintId: string, taskId: string): Promise<ISprint | null> {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw new Error('Sprint not found');

      if (!sprint.tasks.includes(taskId as any)) {
        sprint.tasks.push(taskId as any);
        await sprint.save();
      }

      // Update task with sprint reference
      await Task.findByIdAndUpdate(taskId, { sprint: sprintId });

      return sprint;
    } catch (error) {
      console.error('Error adding task to sprint:', error);
      throw error;
    }
  }

  async removeTaskFromSprint(sprintId: string, taskId: string): Promise<ISprint | null> {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw new Error('Sprint not found');

      sprint.tasks = sprint.tasks.filter((id) => id.toString() !== taskId);
      await sprint.save();

      // Update task to remove sprint reference
      await Task.findByIdAndUpdate(taskId, { sprint: null });

      return sprint;
    } catch (error) {
      console.error('Error removing task from sprint:', error);
      throw error;
    }
  }

  async calculateSprintMetrics(sprintId: string): Promise<{
    totalStoryPoints: number;
    completedStoryPoints: number;
    completionPercentage: number;
  }> {
    try {
      const sprint = await Sprint.findById(sprintId).populate('tasks');
      if (!sprint) throw new Error('Sprint not found');

      const tasks = sprint.tasks as any[];
      const totalStoryPoints = tasks.reduce((sum, task) => sum + task.storyPoints, 0);
      const completedStoryPoints = tasks
        .filter((task) => task.status === 'done')
        .reduce((sum, task) => sum + task.storyPoints, 0);

      const completionPercentage =
        totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

      // Update sprint metrics
      await Sprint.findByIdAndUpdate(sprintId, {
        totalStoryPoints,
        completedStoryPoints,
      });

      return {
        totalStoryPoints,
        completedStoryPoints,
        completionPercentage,
      };
    } catch (error) {
      console.error('Error calculating sprint metrics:', error);
      throw error;
    }
  }
}

export const sprintService = new SprintService();
