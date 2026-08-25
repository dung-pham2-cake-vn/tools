import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Task API
export const taskAPI = {
  getAll: (params?: any) => apiClient.get('/tasks', { params }),
  getById: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post('/tasks', data),
  update: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) => apiClient.patch(`/tasks/${id}/status`, { status }),
  getBySprintId: (sprintId: string) => apiClient.get(`/tasks/sprint/${sprintId}/tasks`),
};

// Sprint API
export const sprintAPI = {
  getAll: (params?: any) => apiClient.get('/sprints', { params }),
  getById: (id: string) => apiClient.get(`/sprints/${id}`),
  create: (data: any) => apiClient.post('/sprints', data),
  update: (id: string, data: any) => apiClient.put(`/sprints/${id}`, data),
  delete: (id: string) => apiClient.delete(`/sprints/${id}`),
  addTask: (id: string, taskId: string) => apiClient.post(`/sprints/${id}/tasks`, { taskId }),
  removeTask: (id: string, taskId: string) => apiClient.delete(`/sprints/${id}/tasks`, { data: { taskId } }),
  getMetrics: (id: string) => apiClient.get(`/sprints/${id}/metrics`),
};

// Roadmap API
export const roadmapAPI = {
  getAll: (params?: any) => apiClient.get('/roadmaps', { params }),
  getById: (id: string) => apiClient.get(`/roadmaps/${id}`),
  create: (data: any) => apiClient.post('/roadmaps', data),
  update: (id: string, data: any) => apiClient.put(`/roadmaps/${id}`, data),
  delete: (id: string) => apiClient.delete(`/roadmaps/${id}`),
  addItem: (id: string, itemData: any) => apiClient.post(`/roadmaps/${id}/items`, itemData),
  updateItem: (id: string, itemId: string, data: any) => apiClient.put(`/roadmaps/${id}/items/${itemId}`, data),
  removeItem: (id: string, itemId: string) => apiClient.delete(`/roadmaps/${id}/items/${itemId}`),
};

// Support API
export const supportAPI = {
  scan: (mode: 'Scan Un-closed' | 'Scan All') => apiClient.post('/support/scan', { mode }),
  getTickets: () => apiClient.get('/support/tickets'),
  saveAnalyzeNote: (id: string, analyzeNote: string) =>
    apiClient.patch(`/support/tickets/${id}/analyze`, { analyzeNote }),
  reloadTicket: (id: string) => apiClient.post(`/support/tickets/${id}/reload`),
  aiAnalyze: (id: string) => apiClient.post(`/support/tickets/${id}/ai-analyze`),
  getSvkNotes: () => apiClient.get('/support/svk-notes'),
  saveSvkNote: (key: string, note: string) =>
    apiClient.put(`/support/svk-notes/${key}`, { note }),
  getSvkTickets: () => apiClient.get('/support/svk/tickets'),
  getSvkHistory: () => apiClient.get('/support/svk/history'),
  scanSvk: () => apiClient.post('/support/svk/scan'),
  svkAiStatus: () => apiClient.get('/support/svk/ai-status'),
  svkAiRunAll: (force = false) => apiClient.post(`/support/svk/ai-run?force=${force}`),
  svkAiRunOne: (key: string) => apiClient.post(`/support/svk/tickets/${key}/ai`),
};

// Config API
export const configAPI = {
  getAI: () => apiClient.get('/config/ai'),
  saveAI: (data: { provider: string; apiKey: string; model: string; baseUrl?: string }) =>
    apiClient.put('/config/ai', data),
  testAI: () => apiClient.post('/config/ai/test'),
  getTeamCapacity: () => apiClient.get('/config/team-capacity'),
  saveTeamCapacity: (data: { qa: number; backend: number; web: number; mobile: number }) =>
    apiClient.put('/config/team-capacity', data),
};

// Sprint Management API
export const sprintManagementAPI = {
  getConfluenceChildren: () => apiClient.get('/sprint-management/confluence-children'),
  getLoadedPages: () => apiClient.get('/sprint-management/loaded-pages'),
  getActiveSprints: () => apiClient.get('/sprint-management/active-sprints'),
  loadPage: (pageId: string) => apiClient.post(`/sprint-management/load-page/${pageId}`),
  unlinkPage: (pageId: string) => apiClient.delete(`/sprint-management/pages/${pageId}`),
  getPageContent: (pageId: string) => apiClient.get(`/sprint-management/page-content/${pageId}`),
  analyze: (data: { pageIds: string[]; prompt: string }) => apiClient.post('/sprint-management/analyze', data),
  parseByScript: (data: { pageIds: string[] }) => apiClient.post('/sprint-management/parse', data),
  getResults: () => apiClient.get('/sprint-management/results'),
  getTickets: (ticketIds: string[]) => apiClient.get('/sprint-management/tickets', { params: { ids: ticketIds.join(',') } }),
  getAllTickets: () => apiClient.get('/sprint-management/tickets'),
  reloadTickets: (ticketIds: string[]) => apiClient.post('/sprint-management/tickets/reload', { ticketIds }),
};

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
  lastSprint: {
    id: number;
    name: string;
    state?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  suggestions: SprintSuggestion[];
}

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  released?: boolean;
  archived?: boolean;
  startDate?: string;
  releaseDate?: string;
  projectId?: number;
}

export interface VersionCreatePayload {
  name: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  releaseDate?: string;
  description?: string;
}

export interface VersionSuggestion {
  name: string;
  number: number | null;
  startDate: string;
  releaseDate: string;
  exists: boolean;
  fromSprint: boolean;
}

export interface VersionSuggestionResult {
  projectKey: string;
  cadenceDays: number;
  lastVersion: JiraVersion | null;
  suggestions: VersionSuggestion[];
}

export interface VersionCreateResult {
  name: string;
  success: boolean;
  version?: JiraVersion;
  error?: string;
}

export interface SprintCreateResult {
  name: string;
  success: boolean;
  sprint?: { id: number; name: string };
  error?: string;
}

// Jira API
export const jiraAPI = {
  getIssue: (issueKey: string) => apiClient.get(`/jira/issue/${issueKey}`),
  searchIssues: (params: {
    jql: string;
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    nextPageToken?: string;
  }) =>
    apiClient.get('/jira/search', {
      params: {
        ...params,
        fields: params.fields?.join(','),
      },
    }),
  getProjects: () => apiClient.get('/jira/projects'),
  getBoards: (projectKeyOrId: string) => apiClient.get('/jira/boards', { params: { projectKeyOrId } }),
  getBoardSprints: (boardId: number, state = 'active') =>
    apiClient.get(`/jira/boards/${boardId}/sprints`, { params: { state } }),
  suggestBoardSprints: (boardId: number, count = 5) =>
    apiClient.get(`/jira/boards/${boardId}/sprints/suggest`, { params: { count } }),
  createSprints: (sprints: SprintCreatePayload[]) => apiClient.post('/jira/sprints/bulk', { sprints }),
  getProjectVersions: (projectKeyOrId: string) => apiClient.get(`/jira/projects/${projectKeyOrId}/versions`),
  suggestProjectVersions: (projectKeyOrId: string, count = 5, boardId?: number) =>
    apiClient.get(`/jira/projects/${projectKeyOrId}/versions/suggest`, {
      params: { count, ...(boardId ? { boardId } : {}) },
    }),
  createProjectVersions: (projectKeyOrId: string, versions: VersionCreatePayload[]) =>
    apiClient.post(`/jira/projects/${projectKeyOrId}/versions`, { versions }),
  syncTask: (jiraKey: string) => apiClient.post(`/jira/sync/${jiraKey}`),
  createIssue: (data: any) => apiClient.post('/jira/create', data),
  transitionIssue: (issueKey: string, targetStatus: string) =>
    apiClient.post(`/jira/transition/${issueKey}`, { targetStatus }),
  getIssueTransitions: (issueKey: string) => apiClient.get(`/jira/issue/${issueKey}/transitions`),
  getAssignableUsers: (projectKeys: string[]) =>
    apiClient.get('/jira/assignable-users', { params: { projectKeys: projectKeys.join(',') } }),
  assignIssue: (issueKey: string, accountId: string | null) =>
    apiClient.put(`/jira/issue/${issueKey}/assignee`, { accountId }),
  setIssueFixVersions: (issueKey: string, versionIds: string[]) =>
    apiClient.put(`/jira/issue/${issueKey}/fix-versions`, { versionIds }),
  updateIssueLabels: (issueKey: string, add: string[], remove: string[]) =>
    apiClient.put(`/jira/issue/${issueKey}/labels`, { add, remove }),
};
