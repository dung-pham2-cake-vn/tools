import { Task, ITask } from '../models/Task';
import { Sprint } from '../models/Sprint';

export class TaskService {
  async createTask(taskData: Partial<ITask>): Promise<ITask> {
    try {
      const task = new Task(taskData);
      return await task.save();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async getTasks(filter: any = {}): Promise<ITask[]> {
    try {
      return await Task.find(filter).populate('sprint');
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<ITask | null> {
    try {
      return await Task.findById(taskId).populate('sprint');
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updateData: Partial<ITask>): Promise<ITask | null> {
    try {
      return await Task.findByIdAndUpdate(taskId, updateData, { new: true });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const result = await Task.findByIdAndDelete(taskId);
      return !!result;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async getTasksBySprintId(sprintId: string): Promise<ITask[]> {
    try {
      return await Task.find({ sprint: sprintId });
    } catch (error) {
      console.error('Error fetching tasks by sprint:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ITask | null> {
    try {
      return await Task.findByIdAndUpdate(taskId, { status }, { new: true });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
