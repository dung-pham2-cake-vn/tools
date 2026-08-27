import { Request, Response } from 'express';
import {
  jiraService,
  SprintCreatePayload,
  TechDebtCreatePayload,
  VersionCreatePayload,
} from '../services/JiraService';
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

  async getAssignableUsers(req: Request, res: Response): Promise<void> {
    try {
      const { projectKeys } = req.query;
      const keys =
        typeof projectKeys === 'string'
          ? projectKeys.split(',').map((k) => k.trim()).filter(Boolean)
          : [];
      if (!keys.length) {
        res.status(400).json({ success: false, error: 'projectKeys is required' });
        return;
      }
      const users = await jiraService.getAssignableUsers(keys);
      res.status(200).json({ success: true, data: users });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async assignIssue(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { accountId } = req.body;
      await jiraService.assignIssue(issueKey, accountId || null);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async setIssueFixVersions(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { versionIds } = req.body as { versionIds?: unknown };
      if (!Array.isArray(versionIds) || versionIds.some((id) => typeof id !== 'string')) {
        res.status(400).json({ success: false, error: 'versionIds must be an array of string' });
        return;
      }
      await jiraService.setIssueFixVersions(issueKey, versionIds as string[]);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateIssueLabels(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { add, remove } = req.body as { add?: unknown; remove?: unknown };
      const isStringArray = (v: unknown) => v === undefined || (Array.isArray(v) && v.every((x) => typeof x === 'string'));
      if (!isStringArray(add) || !isStringArray(remove)) {
        res.status(400).json({ success: false, error: 'add/remove must be arrays of string' });
        return;
      }
      // Jira label không cho khoảng trắng — chặn sớm cho message rõ hơn lỗi 400 của Jira.
      const clean = (v: unknown) => ((v as string[]) || []).map((l) => l.trim()).filter(Boolean);
      const addList = clean(add);
      const removeList = clean(remove);
      const bad = [...addList, ...removeList].find((l) => /\s/.test(l));
      if (bad) {
        res.status(400).json({ success: false, error: `Label "${bad}" chứa khoảng trắng` });
        return;
      }
      await jiraService.updateIssueLabels(issueKey, addList, removeList);
      res.status(200).json({ success: true });
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

  async getBoards(req: Request, res: Response): Promise<void> {
    try {
      const { projectKeyOrId } = req.query;
      const boards = await jiraService.getBoards(projectKeyOrId as string);
      res.status(200).json({ success: true, data: boards });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getBoardSprints(req: Request, res: Response): Promise<void> {
    try {
      const { boardId } = req.params;
      const { state } = req.query;
      const sprints = await jiraService.getBoardSprints(Number(boardId), (state as string) || 'active');
      res.status(200).json({ success: true, data: sprints });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async suggestBoardSprints(req: Request, res: Response): Promise<void> {
    try {
      const { boardId } = req.params;
      const { count } = req.query;
      const result = await jiraService.suggestSprints(
        Number(boardId),
        count ? Number(count) : 5
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createSprint(req: Request, res: Response): Promise<void> {
    try {
      const sprint = await jiraService.createSprint(req.body as SprintCreatePayload);
      res.status(201).json({ success: true, data: sprint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createSprints(req: Request, res: Response): Promise<void> {
    try {
      const { sprints } = req.body as { sprints?: SprintCreatePayload[] };
      if (!Array.isArray(sprints) || sprints.length === 0) {
        res.status(400).json({ success: false, error: 'sprints must be a non-empty array' });
        return;
      }

      const results = await jiraService.createSprints(sprints);
      const created = results.filter((result) => result.success).length;
      res.status(200).json({
        success: results.every((result) => result.success),
        data: { created, failed: results.length - created, results },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getProjectVersions(req: Request, res: Response): Promise<void> {
    try {
      const { projectKeyOrId } = req.params;
      const versions = await jiraService.getProjectVersions(projectKeyOrId);
      res.status(200).json({ success: true, data: versions });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async suggestProjectVersions(req: Request, res: Response): Promise<void> {
    try {
      const { projectKeyOrId } = req.params;
      const { count, boardId } = req.query;
      const result = await jiraService.suggestVersions(
        projectKeyOrId,
        count ? Number(count) : 5,
        boardId ? Number(boardId) : undefined
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createProjectVersions(req: Request, res: Response): Promise<void> {
    try {
      const { projectKeyOrId } = req.params;
      const { versions } = req.body as { versions?: VersionCreatePayload[] };
      if (!Array.isArray(versions) || versions.length === 0) {
        res.status(400).json({ success: false, error: 'versions must be a non-empty array' });
        return;
      }
      const invalid = versions.find((version) => !version?.name || !String(version.name).trim());
      if (invalid) {
        res.status(400).json({ success: false, error: 'every version needs a name' });
        return;
      }

      const results = await jiraService.createVersions(projectKeyOrId, versions);
      const created = results.filter((result) => result.success).length;
      res.status(200).json({
        success: results.every((result) => result.success),
        data: { created, failed: results.length - created, results },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async suggestTechDebt(req: Request, res: Response): Promise<void> {
    try {
      const { boardId, projectKey, count } = req.query;
      if (!boardId || !projectKey) {
        res.status(400).json({ success: false, error: 'boardId and projectKey are required' });
        return;
      }
      const result = await jiraService.suggestTechDebtTickets(
        Number(boardId),
        String(projectKey),
        count ? Number(count) : 5
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async createTechDebtIssues(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body as { items?: TechDebtCreatePayload[] };
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, error: 'items must be a non-empty array' });
        return;
      }
      const invalid = items.find((item) => !item?.summary?.trim() || !item?.sprintId || !item?.projectKey);
      if (invalid) {
        res.status(400).json({ success: false, error: 'every item needs projectKey, summary, sprintId' });
        return;
      }

      const results = await jiraService.createTechDebtIssues(items);
      const created = results.filter((result) => result.success).length;
      res.status(200).json({
        success: results.every((result) => result.success),
        data: { created, failed: results.length - created, results },
      });
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

  async transitionIssue(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { targetStatus } = req.body as { targetStatus?: string };
      if (!targetStatus) {
        res.status(400).json({ success: false, error: 'targetStatus is required' });
        return;
      }
      await jiraService.transitionIssueByTargetStatus(issueKey, targetStatus);
      res.status(200).json({ success: true, data: { issueKey, targetStatus } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getIssueTransitions(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const transitions = await jiraService.getIssueTransitions(issueKey);
      res.status(200).json({ success: true, data: { transitions } });
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
