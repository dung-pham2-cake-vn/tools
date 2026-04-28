import { Request, Response } from 'express';
import { jiraService } from '../services/JiraService';
import { taskService } from '../services/TaskService';

export class JiraController {
  async getIssue(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const issue = await jiraService.getIssue(issueKey);
      res.status(200).json({ success: true, data: issue });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async searchIssues(req: Request, res: Response): Promise<void> {
    try {
      const { jql, startAt, maxResults, fields, nextPageToken } = req.query;
      const parsedFields =
        typeof fields === 'string'
          ? fields.split(',').map((field) => field.trim()).filter(Boolean)
          : undefined;

      const issues = await jiraService.searchIssuesWithOptions(jql as string, {
        startAt: startAt ? Number(startAt) : undefined,
        maxResults: maxResults ? Number(maxResults) : undefined,
        fields: parsedFields,
        nextPageToken: typeof nextPageToken === 'string' ? nextPageToken : undefined,
      });
      res.status(200).json({ success: true, data: issues });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await jiraService.getProjects();
      res.status(200).json({ success: true, data: projects });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async syncTaskFromJira(req: Request, res: Response): Promise<void> {
    try {
      const { jiraKey } = req.params;
      const syncedData = await jiraService.syncTaskFromJira(jiraKey);
      
      // Check if task already exists
      const existingTask = await taskService.getTasks({ jiraKey });
      
      let task;
      if (existingTask.length > 0) {
        task = await taskService.updateTask(existingTask[0]._id.toString(), syncedData);
      } else {
        task = await taskService.createTask(syncedData);
      }

      res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createJiraIssue(req: Request, res: Response): Promise<void> {
    try {
      const issueData = req.body;
      const issue = await jiraService.createIssue(issueData);
      
      // Also create task in our system
      const task = await taskService.createTask({
        title: issueData.fields.summary,
        description: issueData.fields.description,
        jiraKey: issue.key,
        storyPoints: issueData.fields.customfield_10016 || 0,
      });

      res.status(201).json({ success: true, data: { jiraIssue: issue, localTask: task } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const jiraController = new JiraController();
