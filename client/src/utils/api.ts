import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
  syncTask: (jiraKey: string) => apiClient.post(`/jira/sync/${jiraKey}`),
  createIssue: (data: any) => apiClient.post('/jira/create', data),
};
