import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface JiraFieldDefinition {
  id: string;
  key: string;
  name: string;
  schema?: {
    type?: string;
    custom?: string;
  };
}

interface SearchIssuesOptions {
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  nextPageToken?: string;
}

interface JiraSearchIssue {
  id: string;
  key: string;
  self?: string;
  fields: Record<string, unknown>;
}

interface JiraBoard {
  id: number;
  name: string;
  type?: string;
}

interface JiraSprint {
  id: number;
  name: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
}

interface JiraVersion {
  id: string;
  name: string;
  released?: boolean;
  archived?: boolean;
  startDate?: string;
  releaseDate?: string;
}

interface NormalizedSprintDetail {
  id: number | null;
  name: string;
  state?: string;
  startDate: string | null;
  endDate: string | null;
}

interface NormalizedFixVersionDetail {
  id: string | undefined;
  name: string;
  startDate: string | null;
  releaseDate: string | null;
  released?: boolean;
  archived?: boolean;
}

export class JiraService {
  private axiosInstance: AxiosInstance;
  private agileAxiosInstance: AxiosInstance;
  private fieldDefinitionsPromise: Promise<JiraFieldDefinition[]> | null = null;

  constructor() {
    const jiraHost = process.env.JIRA_HOST;
    const jiraUsername = process.env.JIRA_USERNAME;
    const jiraToken = process.env.JIRA_API_TOKEN;

    if (!jiraHost || !jiraUsername || !jiraToken) {
      throw new Error('Missing Jira configuration in environment variables');
    }

    this.axiosInstance = axios.create({
      baseURL: `${jiraHost}/rest/api/3`,
      auth: {
        username: jiraUsername,
        password: jiraToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.agileAxiosInstance = axios.create({
      baseURL: `${jiraHost}/rest/agile/1.0`,
      auth: {
        username: jiraUsername,
        password: jiraToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getIssue(issueKey: string) {
    try {
      const response = await this.axiosInstance.get(`/issues/${issueKey}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Jira issue ${issueKey}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async getAllIssueComments(issueKey: string): Promise<any[]> {
    const comments: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    try {
      while (true) {
        const response = await this.axiosInstance.get(`/issue/${issueKey}/comment`, {
          params: { startAt, maxResults, orderBy: 'created' },
        });
        const page = response.data.comments || [];
        comments.push(...page);
        if (comments.length >= response.data.total || page.length < maxResults) break;
        startAt += page.length;
      }
      return comments;
    } catch (error) {
      console.error(`Error fetching comments for ${issueKey}:`, this.formatAxiosError(error));
      return [];
    }
  }

  async createIssue(issueData: any) {
    try {
      const response = await this.axiosInstance.post('/issues', issueData);
      return response.data;
    } catch (error) {
      console.error('Error creating Jira issue:', this.formatAxiosError(error));
      throw error;
    }
  }

  async updateIssue(issueKey: string, updateData: any) {
    try {
      const response = await this.axiosInstance.put(`/issues/${issueKey}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating Jira issue ${issueKey}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async searchIssues(jql: string) {
    try {
      return await this.searchIssuesWithOptions(jql);
    } catch (error) {
      console.error('Error searching Jira issues:', this.formatAxiosError(error));
      throw error;
    }
  }

  async searchIssuesWithOptions(jql: string, options: SearchIssuesOptions = {}) {
    try {
      const fields = await this.resolveRequestedFields(options.fields);
      const response = await this.axiosInstance.post('/search/jql', {
        jql,
        maxResults: options.maxResults ?? 50,
        fields,
        nextPageToken: options.nextPageToken,
      });

      const fieldMap = await this.getFieldDefinitionMap();
      const sprintField = this.findFieldIdByName(fieldMap, ['Sprint']);
      const storyPointsField = this.findFieldIdByName(fieldMap, ['Story Points', 'Story point estimate']);

      return {
        ...response.data,
        issues: (response.data.issues || []).map((issue: JiraSearchIssue) =>
          this.normalizeSearchIssue(issue, sprintField, storyPointsField)
        ),
      };
    } catch (error) {
      console.error('Error searching Jira issues:', this.formatAxiosError(error));
      throw error;
    }
  }

  async getProjects() {
    try {
      const response = await this.axiosInstance.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching Jira projects:', this.formatAxiosError(error));
      throw error;
    }
  }

  async getBoards(projectKeyOrId: string): Promise<JiraBoard[]> {
    try {
      const boards: JiraBoard[] = [];
      let startAt = 0;
      let isLast = false;

      do {
        const response = await this.agileAxiosInstance.get('/board', {
          params: {
            projectKeyOrId,
            type: 'scrum',
            startAt,
            maxResults: 50,
          },
        });

        boards.push(...(response.data.values || []));
        startAt += (response.data.values || []).length;
        isLast = Boolean(response.data.isLast);

        if ((response.data.values || []).length === 0) {
          break;
        }
      } while (!isLast);

      return boards;
    } catch (error) {
      console.error(`Error fetching boards for ${projectKeyOrId}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async getBoardSprints(boardId: number, state = 'active'): Promise<JiraSprint[]> {
    try {
      const sprints: JiraSprint[] = [];
      let startAt = 0;
      let isLast = false;

      do {
        const response = await this.agileAxiosInstance.get(`/board/${boardId}/sprint`, {
          params: {
            state,
            startAt,
            maxResults: 50,
          },
        });

        sprints.push(...(response.data.values || []));
        startAt += (response.data.values || []).length;
        isLast = Boolean(response.data.isLast);

        if ((response.data.values || []).length === 0) {
          break;
        }
      } while (!isLast);

      return sprints;
    } catch (error) {
      console.error(`Error fetching sprints for board ${boardId}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async getProjectVersions(projectKeyOrId: string): Promise<JiraVersion[]> {
    try {
      const versions: JiraVersion[] = [];
      let startAt = 0;
      let isLast = false;

      do {
        const response = await this.axiosInstance.get(`/project/${projectKeyOrId}/version`, {
          params: {
            startAt,
            maxResults: 50,
          },
        });

        versions.push(...(response.data.values || []));
        startAt += (response.data.values || []).length;
        isLast = startAt >= (response.data.total || 0);

        if ((response.data.values || []).length === 0) {
          break;
        }
      } while (!isLast);

      return versions;
    } catch (error) {
      console.error(`Error fetching versions for ${projectKeyOrId}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  private async getFieldDefinitions(): Promise<JiraFieldDefinition[]> {
    if (!this.fieldDefinitionsPromise) {
      this.fieldDefinitionsPromise = this.axiosInstance
        .get('/field')
        .then((response) => response.data as JiraFieldDefinition[]);
    }

    return this.fieldDefinitionsPromise;
  }

  private async getFieldDefinitionMap(): Promise<Map<string, JiraFieldDefinition>> {
    const fields = await this.getFieldDefinitions();
    return new Map(fields.map((field) => [field.id, field]));
  }

  private findFieldIdByName(fieldMap: Map<string, JiraFieldDefinition>, candidateNames: string[]): string | null {
    const normalizedCandidates = candidateNames.map((name) => name.toLowerCase());

    for (const field of fieldMap.values()) {
      if (normalizedCandidates.includes(field.name.toLowerCase())) {
        return field.id;
      }
    }

    return null;
  }

  private async resolveRequestedFields(requestedFields?: string[]): Promise<string[]> {
    const defaultFields = [
      'summary',
      'assignee',
      'status',
      'priority',
      'fixVersions',
      'issuetype',
    ];

    const fieldMap = await this.getFieldDefinitionMap();
    const resolvedFields = new Set(requestedFields && requestedFields.length > 0 ? requestedFields : defaultFields);
    const sprintField = this.findFieldIdByName(fieldMap, ['Sprint']);
    const storyPointsField = this.findFieldIdByName(fieldMap, ['Story Points', 'Story point estimate']);

    if (sprintField) {
      resolvedFields.add(sprintField);
    }

    if (storyPointsField) {
      resolvedFields.add(storyPointsField);
    }

    return Array.from(resolvedFields);
  }

  private normalizeSearchIssue(
    issue: JiraSearchIssue,
    sprintFieldId: string | null,
    storyPointsFieldId: string | null
  ) {
    const sprintValues = sprintFieldId ? issue.fields[sprintFieldId] : undefined;
    const rawStoryPoints = storyPointsFieldId ? issue.fields[storyPointsFieldId] : undefined;
    const status = issue.fields.status as { name?: string } | undefined;
    const priority = issue.fields.priority as { name?: string } | undefined;
    const assignee = issue.fields.assignee as { displayName?: string } | null | undefined;
    const fixVersions = issue.fields.fixVersions as Array<{ name?: string }> | undefined;
    const sprintDetails = this.extractSprintDetails(sprintValues);
    const fixVersionDetails = this.extractFixVersionDetails(
      issue.fields.fixVersions as Array<Record<string, unknown>> | undefined
    );

    return {
      ...issue,
      fields: {
        ...issue.fields,
        normalizedSprintNames: sprintDetails.map((item) => item.name),
        normalizedSprints: sprintDetails,
        normalizedStoryPoints: typeof rawStoryPoints === 'number' ? rawStoryPoints : Number(rawStoryPoints || 0),
        normalizedStatusName: status?.name || '',
        normalizedPriorityName: priority?.name || '',
        normalizedAssigneeName: assignee?.displayName || '',
        normalizedFixVersionNames: (fixVersions || []).map((item) => item.name || '').filter(Boolean),
        normalizedFixVersions: fixVersionDetails,
      },
    };
  }

  private extractSprintDetails(rawSprintValue: unknown): NormalizedSprintDetail[] {
    if (!Array.isArray(rawSprintValue)) {
      return [];
    }

    const mapped: Array<NormalizedSprintDetail | null> = rawSprintValue
      .map((value) => {
        if (typeof value === 'string') {
          const idMatch = value.match(/id=([^,\]]+)/);
          const nameMatch = value.match(/name=([^,\]]+)/);
          const stateMatch = value.match(/state=([^,\]]+)/);
          const startDateMatch = value.match(/startDate=([^,\]]+)/);
          const endDateMatch = value.match(/endDate=([^,\]]+)/);

          return {
            id: idMatch ? Number(idMatch[1]) : null,
            name: nameMatch ? nameMatch[1] : value,
            state: stateMatch ? stateMatch[1] : undefined,
            startDate: startDateMatch ? startDateMatch[1] : null,
            endDate: endDateMatch ? endDateMatch[1] : null,
          };
        }

        if (value && typeof value === 'object' && 'name' in value) {
          const sprint = value as Record<string, unknown>;
          const sprintName = sprint.name;

          return {
            id: typeof sprint.id === 'number' ? sprint.id : null,
            name: typeof sprintName === 'string' ? sprintName : '',
            state: typeof sprint.state === 'string' ? sprint.state : undefined,
            startDate: typeof sprint.startDate === 'string' ? sprint.startDate : null,
            endDate: typeof sprint.endDate === 'string' ? sprint.endDate : null,
          };
        }

        return null;
      });

    return mapped.filter((item): item is NormalizedSprintDetail => item !== null && item.name.length > 0);
  }

  private extractFixVersionDetails(rawFixVersions: Array<Record<string, unknown>> | undefined): NormalizedFixVersionDetail[] {
    if (!rawFixVersions || rawFixVersions.length === 0) {
      return [];
    }

    const mapped: Array<NormalizedFixVersionDetail | null> = rawFixVersions
      .map((item) => {
        const name = item.name;

        if (typeof name !== 'string' || !name) {
          return null;
        }

        return {
          id: typeof item.id === 'string' ? item.id : undefined,
          name,
          startDate: typeof item.startDate === 'string' ? item.startDate : null,
          releaseDate: typeof item.releaseDate === 'string' ? item.releaseDate : null,
          released: typeof item.released === 'boolean' ? item.released : undefined,
          archived: typeof item.archived === 'boolean' ? item.archived : undefined,
        };
      });

    return mapped.filter((item): item is NormalizedFixVersionDetail => item !== null);
  }

  private formatAxiosError(error: unknown) {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorMessages: error.response?.data?.errorMessages,
        errors: error.response?.data?.errors,
      };
    }

    if (error instanceof Error) {
      return { message: error.message };
    }

    return { message: 'Unknown Jira error' };
  }

  async syncTaskFromJira(jiraKey: string) {
    try {
      const jiraIssue = await this.getIssue(jiraKey);
      const status = this.mapJiraStatusToLocal(jiraIssue.fields.status.name);
      const priority = this.mapJiraPriorityToLocal(jiraIssue.fields.priority?.name);

      return {
        jiraKey: jiraIssue.key,
        title: jiraIssue.fields.summary,
        description: jiraIssue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        storyPoints: jiraIssue.fields.customfield_10016 || 0,
        status: status as 'todo' | 'in-progress' | 'in-review' | 'done',
        priority: priority as 'low' | 'medium' | 'high' | 'critical',
        assignee: jiraIssue.fields.assignee?.displayName,
      };
    } catch (error) {
      console.error(`Error syncing task from Jira ${jiraKey}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  private mapJiraStatusToLocal(jiraStatus: string): 'todo' | 'in-progress' | 'in-review' | 'done' {
    const statusMap: Record<string, 'todo' | 'in-progress' | 'in-review' | 'done'> = {
      'To Do': 'todo',
      'In Progress': 'in-progress',
      'In Review': 'in-review',
      'Done': 'done',
    };
    return statusMap[jiraStatus] || 'todo';
  }

  private mapJiraPriorityToLocal(jiraPriority?: string): 'low' | 'medium' | 'high' | 'critical' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'Lowest': 'low',
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Highest': 'critical',
    };
    return priorityMap[jiraPriority || ''] || 'medium';
  }
}

export const jiraService = new JiraService();
