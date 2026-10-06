import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getSvkNotes: () => apiClient.get('/support/svk-notes'),
  saveSvkNote: (key: string, note: string) =>
    apiClient.put(`/support/svk-notes/${key}`, { note }),
  getSvkTickets: () => apiClient.get('/support/svk/tickets'),
  getSvkHistory: () => apiClient.get('/support/svk/history'),
  scanSvk: () => apiClient.post('/support/svk/scan'),
  svkScanRecipe: () => apiClient.get('/support/svk/scan-recipe'),
  svkAiStatus: () => apiClient.get('/support/svk/ai-status'),
  svkAiRunAll: (force = false) => apiClient.post(`/support/svk/ai-run?force=${force}`),
  svkAiRunOne: (key: string) => apiClient.post(`/support/svk/tickets/${key}/ai`),
  getSvkChats: () => apiClient.get('/support/svk/chats'),
  openSvkChat: (key: string) => apiClient.post(`/support/svk/tickets/${key}/chat`),
};

// Config API
export const configAPI = {
  getAI: () => apiClient.get('/config/ai'),
  saveAI: (data: { provider: string; apiKey: string; model: string; baseUrl?: string }) =>
    apiClient.put('/config/ai', data),
  testAI: () => apiClient.post('/config/ai/test'),
  getAIPrompts: () => apiClient.get('/config/ai/prompts'),
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


export interface JiraNamedRef {
  id: string;
  name: string;
}

export interface TechDebtSuggestion {
  sprintId: number;
  sprintName: string;
  sprintNumber: number | null;
  sprintState?: string;
  startDate: string | null;
  endDate: string | null;
  summary: string;
  fixVersion: JiraNamedRef | null;
  existingIssue: { key: string; summary: string } | null;
}

export interface TechDebtSuggestionResult {
  projectKey: string;
  boardId: number;
  issueType: JiraNamedRef | null;
  componentOptions: JiraNamedRef[];
  defaultComponents: JiraNamedRef[];
  defaultLabels: string[];
  summaryTemplate: string;
  suggestions: TechDebtSuggestion[];
}

export interface TechDebtCreatePayload {
  projectKey: string;
  summary: string;
  sprintId: number;
  issueTypeId?: string;
  labels?: string[];
  componentIds?: string[];
  fixVersionIds?: string[];
  priorityName?: string;
  assigneeAccountId?: string | null;
}

export interface TechDebtCreateResult {
  summary: string;
  success: boolean;
  issue?: { id: string; key: string };
  error?: string;
}

// Jira API
export interface DeliveryIssuePrefill {
  idea: { key: string; summary: string; descriptionAdf: any; sprintLabel: string };
  projectKey: string;
  boardId: number;
  issueTypes: Array<{ id: string; name: string }>;
  sprints: Array<{ id: number; name: string; state: string }>;
  fixVersions: Array<{ id: string; name: string }>;
  existingDeliveryKeys: string[];
  defaults: {
    issueTypeId: string;
    summary: string;
    descriptionAdf: any;
    sprintId: number | null;
    fixVersionIds: string[];
    priorityName: string;
    labels: string[];
    assigneeAccountId: string;
    assigneeName: string;
  };
}

export interface DeliveryIssueCreatePayload {
  ideaKey: string;
  projectKey?: string;
  issueTypeId: string;
  summary: string;
  descriptionAdf?: any;
  sprintId?: number | null;
  fixVersionIds?: string[];
  priorityName?: string;
  labels?: string[];
  assigneeAccountId?: string;
}

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
  suggestTechDebt: (boardId: number, projectKey: string, count = 5) =>
    apiClient.get('/jira/tech-debt/suggest', { params: { boardId, projectKey, count } }),
  createTechDebtIssues: (items: TechDebtCreatePayload[]) => apiClient.post('/jira/tech-debt/bulk', { items }),
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
  getProjectIssueTypes: (projectKeyOrId: string) =>
    apiClient.get(`/jira/projects/${projectKeyOrId}/issue-types`),
  setIssueType: (issueKey: string, issueTypeId: string) =>
    apiClient.put(`/jira/issue/${issueKey}/issue-type`, { issueTypeId }),
  prepareDeliveryIssue: (ideaKey: string) =>
    apiClient.get('/jira/delivery-issue/prepare', { params: { ideaKey } }),
  createDeliveryIssue: (payload: DeliveryIssueCreatePayload) =>
    apiClient.post('/jira/delivery-issue', payload),
};

export interface BrdLinkCandidate {
  url: string;
  source: 'description' | 'comment';
  author: string;
  likelyBrd: boolean;
}

export interface BrdDoc {
  _id: string;
  ideaKey: string;
  filename: string;
  sourceUrl: string;
  pdfSize: number;
  text: string;
  converter: string;
  importedAt: string;
}

export interface TicketChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const ticketAIAPI = {
  /** scan=true quét lại Jira và lưu; mặc định trả link đã lưu lần trước. */
  getBrdLinks: (ideaKey: string, scan = false) =>
    apiClient.get(`/ticket-ai/${ideaKey}/brd/links`, { params: scan ? { scan: 1 } : undefined }),
  /** Word trên máy chạy backend mở link SharePoint, xuất PDF, lưu làm BRD. */
  importBrdFromUrl: (ideaKey: string, url: string) =>
    apiClient.post(`/ticket-ai/${ideaKey}/brd/from-url`, { url }),
  listBrd: (ideaKey: string) => apiClient.get(`/ticket-ai/${ideaKey}/brd`),
  uploadBrd: (ideaKey: string, payload: { filename: string; contentBase64: string; sourceUrl?: string }) =>
    apiClient.post(`/ticket-ai/${ideaKey}/brd`, payload),
  brdPdfUrl: (ideaKey: string, brdId: string) => `${API_BASE_URL}/ticket-ai/${ideaKey}/brd/${brdId}/pdf`,
  deleteBrd: (ideaKey: string, brdId: string) => apiClient.delete(`/ticket-ai/${ideaKey}/brd/${brdId}`),
};

export interface AIConversationSummary {
  _id: string;
  title: string;
  ticketKeys: string[];
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversation {
  _id: string;
  title: string;
  ticketKeys: string[];
  messages: TicketChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Chat AI: nhiều hội thoại, mỗi hội thoại đính kèm được nhiều ticket Jira (PR, PL, PLO, DOP, PKA...). */
export const aiChatAPI = {
  /** ticket → chỉ hội thoại có đính kèm ticket đó */
  list: (ticket?: string) => apiClient.get('/ai-chat/conversations', { params: ticket ? { ticket } : undefined }),
  get: (id: string) => apiClient.get(`/ai-chat/conversations/${id}`),
  create: (body: { title?: string; ticketKeys?: string[] }) => apiClient.post('/ai-chat/conversations', body),
  update: (id: string, body: { title?: string; ticketKeys?: string[] }) =>
    apiClient.patch(`/ai-chat/conversations/${id}`, body),
  remove: (id: string) => apiClient.delete(`/ai-chat/conversations/${id}`),
  send: (id: string, body: { message?: string; preset?: string }) =>
    apiClient.post(`/ai-chat/conversations/${id}/messages`, body),
  clear: (id: string) => apiClient.delete(`/ai-chat/conversations/${id}/messages`),
};

export interface TicketNoteData {
  ticketKey: string;
  content: string;
  updatedAt: string | null;
}

/** Note riêng theo ticket Jira — lưu ở tool, không ghi lên Jira. */
export const ticketNoteAPI = {
  get: (ticketKey: string) => apiClient.get(`/ticket-notes/${ticketKey}`),
  save: (ticketKey: string, content: string) => apiClient.put(`/ticket-notes/${ticketKey}`, { content }),
};

/** Bắn khi note ticket đổi (vd AI ghi hộ) để overlay đang mở tải lại. */
export const TICKET_NOTE_CHANGED_EVENT = 'ticket-note-changed';
