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

export interface SprintCreatePayload {
  name: string;
  originBoardId: number;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface SprintSuggestion {
  name: string;
  number: number | null;
  originBoardId: number;
  startDate: string;
  endDate: string;
  exists: boolean;
}

export interface SprintSuggestionResult {
  boardId: number;
  cadenceDays: number;
  lastSprint: JiraSprint | null;
  suggestions: SprintSuggestion[];
}

export interface SprintCreateResult {
  name: string;
  success: boolean;
  sprint?: JiraSprint;
  error?: string;
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

export interface ConfluencePage {
  id: string;
  title: string;
  status: string;
}

export interface ConfluencePageWithBody extends ConfluencePage {
  body: string;
}

const SPRINT_LENGTH_DAYS = 14;
const SPRINT_LENGTH_MS = SPRINT_LENGTH_DAYS * 24 * 60 * 60 * 1000;
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;

export class JiraService {
  private axiosInstance: AxiosInstance;
  private agileAxiosInstance: AxiosInstance;
  private confluenceAxiosInstance: AxiosInstance;
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

    this.confluenceAxiosInstance = axios.create({
      baseURL: `${jiraHost}/wiki/api/v2`,
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

  async getConfluenceChildPages(pageId: string): Promise<ConfluencePage[]> {
    try {
      const response = await this.confluenceAxiosInstance.get(`/pages/${pageId}/children`, {
        params: { limit: 50, sort: '-created-date' },
      });
      return (response.data.results || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
      }));
    } catch (error) {
      console.error(`Error fetching Confluence children for ${pageId}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async getConfluencePageContent(pageId: string): Promise<ConfluencePageWithBody> {
    try {
      const response = await this.confluenceAxiosInstance.get(`/pages/${pageId}`, {
        params: { 'body-format': 'storage' },
      });
      const page = response.data;
      return {
        id: page.id,
        title: page.title,
        status: page.status,
        body: page.body?.storage?.value || '',
      };
    } catch (error) {
      console.error(`Error fetching Confluence page ${pageId}:`, this.formatAxiosError(error));
      throw error;
    }
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

  /** Users assignable across the given projects — dùng cho dropdown đổi assignee hàng loạt. */
  async getAssignableUsers(projectKeys: string[]): Promise<Array<{ accountId: string; displayName: string }>> {
    try {
      const response = await this.axiosInstance.get('/user/assignable/multiProjectSearch', {
        params: { projectKeys: projectKeys.join(','), maxResults: 1000 },
      });
      return ((response.data || []) as Array<Record<string, any>>)
        .filter((u) => u.accountId && u.active !== false)
        .map((u) => ({ accountId: u.accountId, displayName: u.displayName || u.emailAddress || u.accountId }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
      console.error('Error fetching assignable users:', this.formatAxiosError(error));
      throw error;
    }
  }

  /** accountId = null để bỏ assign. */
  async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
    try {
      await this.axiosInstance.put(`/issue/${issueKey}/assignee`, { accountId });
    } catch (error) {
      const detail = this.formatAxiosError(error);
      console.error(`Error assigning Jira issue ${issueKey}:`, detail);
      // "Request failed with status code 404" vô nghĩa khi đổi hàng loạt — đẩy message thật của Jira ra
      const reason =
        detail.errorMessages?.join('; ') ||
        (detail.errors ? Object.values(detail.errors).join('; ') : '') ||
        detail.message;
      throw new Error(reason);
    }
  }

  /** Ghi đè fixVersions của issue. Mảng rỗng = xoá hết fix version. */
  async setIssueFixVersions(issueKey: string, versionIds: string[]): Promise<void> {
    try {
      await this.axiosInstance.put(`/issue/${issueKey}`, {
        fields: { fixVersions: versionIds.map((id) => ({ id })) },
      });
    } catch (error) {
      const detail = this.formatAxiosError(error);
      console.error(`Error setting fixVersions for ${issueKey}:`, detail);
      // Jira trả 400 kèm lý do thật (version thuộc project khác, field không có trên screen...)
      const reason =
        detail.errorMessages?.join('; ') ||
        (detail.errors ? Object.values(detail.errors).join('; ') : '') ||
        detail.message;
      throw new Error(reason);
    }
  }

  async getIssueTransitions(issueKey: string): Promise<Array<{ id: string; name: string; to?: { name?: string } }>> {
    try {
      const response = await this.axiosInstance.get(`/issue/${issueKey}/transitions`);
      return (response.data?.transitions || []) as Array<{ id: string; name: string; to?: { name?: string } }>;
    } catch (error) {
      console.error(`Error fetching transitions for ${issueKey}:`, this.formatAxiosError(error));
      throw error;
    }
  }

  async transitionIssueByTargetStatus(issueKey: string, targetStatusName: string): Promise<void> {
    const transitions = await this.getIssueTransitions(issueKey);
    const target = targetStatusName.trim().toLowerCase();
    const match = transitions.find((t) => (t.to?.name || t.name || '').trim().toLowerCase() === target)
      || transitions.find((t) => (t.name || '').trim().toLowerCase() === target);
    if (!match) {
      const available = transitions.map((t) => `${t.name} -> ${t.to?.name || '?'}`).join(', ');
      throw new Error(`No transition to "${targetStatusName}" available for ${issueKey}. Available: ${available || '(none)'}`);
    }
    try {
      await this.axiosInstance.post(`/issue/${issueKey}/transitions`, { transition: { id: match.id } });
    } catch (error) {
      console.error(`Error transitioning ${issueKey} to ${targetStatusName}:`, this.formatAxiosError(error));
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
      const rankField = this.findFieldIdByName(fieldMap, ['Rank']);

      return {
        ...response.data,
        issues: (response.data.issues || []).map((issue: JiraSearchIssue) =>
          this.normalizeSearchIssue(issue, sprintField, storyPointsField, rankField)
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

  async getAllBoardSprints(boardId: number): Promise<JiraSprint[]> {
    return this.getBoardSprints(boardId, 'future,active,closed');
  }

  async createSprint(payload: SprintCreatePayload): Promise<JiraSprint> {
    if (!payload?.name?.trim()) {
      throw new Error('Sprint name is required');
    }
    if (!payload?.originBoardId) {
      throw new Error('originBoardId is required');
    }

    try {
      const response = await this.agileAxiosInstance.post('/sprint', {
        name: payload.name.trim(),
        originBoardId: payload.originBoardId,
        ...(payload.startDate ? { startDate: payload.startDate } : {}),
        ...(payload.endDate ? { endDate: payload.endDate } : {}),
        ...(payload.goal ? { goal: payload.goal } : {}),
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating sprint "${payload.name}":`, this.formatAxiosError(error));
      throw error;
    }
  }

  // Tạo tuần tự để giữ đúng thứ tự sprint trên board và không nuốt lỗi từng dòng.
  async createSprints(payloads: SprintCreatePayload[]): Promise<SprintCreateResult[]> {
    const results: SprintCreateResult[] = [];

    for (const payload of payloads) {
      try {
        const sprint = await this.createSprint(payload);
        results.push({ name: payload.name, success: true, sprint });
      } catch (error) {
        results.push({ name: payload.name, success: false, error: this.describeError(error) });
      }
    }

    return results;
  }

  /**
   * Đề xuất N sprint kế tiếp cho một board, suy ra từ chính sprint cuối của board đó:
   * - tên: giữ nguyên prefix/suffix, tăng số cuối cùng trong tên
   * - thời gian: nối tiếp liền mạch, mỗi sprint SPRINT_LENGTH_DAYS ngày
   */
  async suggestSprints(boardId: number, count = 5): Promise<SprintSuggestionResult> {
    const total = Math.min(Math.max(count, 1), 20);
    const allSprints = await this.getAllBoardSprints(boardId);
    // Board có thể hiển thị sprint của board khác (shared backlog) — chỉ suy luận từ sprint do board này sở hữu.
    const owned = allSprints.filter((sprint) => sprint.originBoardId === boardId);
    const pool = owned.length > 0 ? owned : allSprints;

    const ranked = pool
      .map((sprint) => ({ sprint, number: this.parseSprintNumber(sprint.name) }))
      .sort((a, b) => {
        const numberDiff = (a.number ?? -1) - (b.number ?? -1);
        if (numberDiff !== 0) return numberDiff;
        return (a.sprint.startDate || '').localeCompare(b.sprint.startDate || '');
      });

    const latest = ranked.length > 0 ? ranked[ranked.length - 1] : null;
    const template = this.parseSprintNameTemplate(latest?.sprint.name || '');
    const existingNames = new Set(allSprints.map((sprint) => sprint.name.trim().toLowerCase()));

    let cursor = this.resolveNextSprintStart(latest?.sprint);
    const suggestions: SprintSuggestion[] = [];

    for (let index = 0; index < total; index += 1) {
      const number = template.number === null ? null : template.number + index + 1;
      const name =
        number === null
          ? `${(latest?.sprint.name || 'Sprint').trim()} +${index + 1}`
          : `${template.prefix}${number}${template.suffix}`;
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + SPRINT_LENGTH_MS);

      suggestions.push({
        name,
        number,
        originBoardId: boardId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        exists: existingNames.has(name.trim().toLowerCase()),
      });

      cursor = end;
    }

    return {
      boardId,
      cadenceDays: SPRINT_LENGTH_DAYS,
      lastSprint: latest?.sprint ?? null,
      suggestions,
    };
  }

  private parseSprintNumber(name: string): number | null {
    const match = /(\d+)[^\d]*$/.exec(name || '');
    return match ? Number(match[1]) : null;
  }

  private parseSprintNameTemplate(name: string): { prefix: string; number: number | null; suffix: string } {
    const match = /^([\s\S]*?)(\d+)([^\d]*)$/.exec(name || '');
    if (!match) {
      return { prefix: 'Sprint ', number: null, suffix: '' };
    }
    return { prefix: match[1], number: Number(match[2]), suffix: match[3] };
  }

  // Sprint kế tiếp nối liền sprint cuối. Board chưa có sprint nào thì lấy mốc thứ Hai kế tiếp (00:00 UTC+7).
  private resolveNextSprintStart(latest?: JiraSprint | null): Date {
    if (latest?.endDate) {
      return new Date(latest.endDate);
    }
    if (latest?.startDate) {
      return new Date(new Date(latest.startDate).getTime() + SPRINT_LENGTH_MS);
    }
    return this.nextMondayUtc7();
  }

  private nextMondayUtc7(): Date {
    const nowUtc7 = new Date(Date.now() + UTC7_OFFSET_MS);
    const daysUntilMonday = (8 - nowUtc7.getUTCDay()) % 7 || 7;
    const mondayUtc7 = Date.UTC(
      nowUtc7.getUTCFullYear(),
      nowUtc7.getUTCMonth(),
      nowUtc7.getUTCDate() + daysUntilMonday
    );
    return new Date(mondayUtc7 - UTC7_OFFSET_MS);
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
      // a rejected promise must not stay cached — otherwise one transient network error
      // makes every later call fail instantly with the same stale error until restart
      this.fieldDefinitionsPromise = this.axiosInstance
        .get('/field')
        .then((response) => response.data as JiraFieldDefinition[])
        .catch((error) => {
          this.fieldDefinitionsPromise = null;
          throw error;
        });
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
    const rankField = this.findFieldIdByName(fieldMap, ['Rank']);

    if (sprintField) {
      resolvedFields.add(sprintField);
    }

    if (storyPointsField) {
      resolvedFields.add(storyPointsField);
    }

    if (rankField) {
      resolvedFields.add(rankField);
    }

    return Array.from(resolvedFields);
  }

  private normalizeSearchIssue(
    issue: JiraSearchIssue,
    sprintFieldId: string | null,
    storyPointsFieldId: string | null,
    rankFieldId?: string | null
  ) {
    const rawRank = rankFieldId ? issue.fields[rankFieldId] : undefined;
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
        // LexoRank string — plain lexicographic compare gives Jira backlog order
        normalizedRank: typeof rawRank === 'string' ? rawRank : '',
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

  // Gộp lỗi Jira thành một dòng đọc được để trả về cho UI.
  private describeError(error: unknown): string {
    const detail = this.formatAxiosError(error) as {
      message?: string;
      status?: number;
      errorMessages?: string[];
      errors?: Record<string, string>;
    };
    const parts: string[] = [];

    if (detail.status) parts.push(`HTTP ${detail.status}`);
    if (detail.errorMessages?.length) parts.push(detail.errorMessages.join('; '));
    if (detail.errors && Object.keys(detail.errors).length) {
      parts.push(
        Object.entries(detail.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join('; ')
      );
    }
    if (parts.length === 0 && detail.message) parts.push(detail.message);

    return parts.join(' — ') || 'Unknown error';
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
