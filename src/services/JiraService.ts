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

export class JiraService {
  private axiosInstance: AxiosInstance;
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

    return {
      ...issue,
      fields: {
        ...issue.fields,
        normalizedSprintNames: this.extractSprintNames(sprintValues),
        normalizedStoryPoints: typeof rawStoryPoints === 'number' ? rawStoryPoints : Number(rawStoryPoints || 0),
        normalizedStatusName: status?.name || '',
        normalizedPriorityName: priority?.name || '',
        normalizedAssigneeName: assignee?.displayName || '',
        normalizedFixVersionNames: (fixVersions || []).map((item) => item.name || '').filter(Boolean),
      },
    };
  }

  private extractSprintNames(rawSprintValue: unknown): string[] {
    if (!Array.isArray(rawSprintValue)) {
      return [];
    }

    return rawSprintValue
      .map((value) => {
        if (typeof value === 'string') {
          const nameMatch = value.match(/name=([^,\]]+)/);
          return nameMatch ? nameMatch[1] : value;
        }

        if (value && typeof value === 'object' && 'name' in value) {
          const sprintName = (value as { name?: unknown }).name;
          return typeof sprintName === 'string' ? sprintName : '';
        }

        return '';
      })
      .filter((name): name is string => Boolean(name));
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
