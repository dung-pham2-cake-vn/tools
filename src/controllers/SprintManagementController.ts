import { Request, Response } from 'express';
import { jiraService } from '../services/JiraService';
import { analyzeWithCustomPrompt } from '../services/AIService';
import { getConfig, setConfig } from '../models/AppConfig';

const ROOT_PAGE_ID = '1570209916';
const TICKET_CACHE_KEY = 'sprint_mgmt_ticket_cache';

interface SprintTicketCacheItem {
  id: string;
  name: string;
  type: string;
  status: string;
  lastUpdatedAt: string;
  jiraUpdatedAt?: string;
  parentId?: string;
  children?: string[];
}

function uniqueTicketIds(rawIds: unknown): string[] {
  const values = Array.isArray(rawIds)
    ? rawIds
    : typeof rawIds === 'string'
      ? rawIds.split(',')
      : [];

  return Array.from(new Set(
    values
      .map((id) => String(id).trim().toUpperCase())
      .filter((id) => /^[A-Z][A-Z0-9]+-\d+$/.test(id))
  ));
}

function buildTicketJql(ids: string[]): string {
  return `key in (${ids.join(',')}) ORDER BY key ASC`;
}

function buildParentJql(ids: string[]): string {
  return `parent in (${ids.join(',')}) ORDER BY key ASC`;
}

function readIssueFields(issue: any): Record<string, any> {
  return issue?.fields || {};
}

function readSubtaskIds(issue: any): string[] {
  const fields = readIssueFields(issue);
  return Array.isArray(fields.subtasks)
    ? fields.subtasks.map((subtask) => subtask?.key).filter(Boolean)
    : [];
}

function readParentId(issue: any): string | undefined {
  const fields = readIssueFields(issue);
  return fields.parent?.key;
}

function writeIssueToCache(
  cache: Record<string, SprintTicketCacheItem>,
  issue: any,
  now: string,
  parentId?: string,
  children?: string[]
) {
  const fields = readIssueFields(issue);
  cache[issue.key] = {
    id: issue.key,
    name: fields.summary || cache[issue.key]?.name || '',
    type: fields.issuetype?.name || cache[issue.key]?.type || 'Không rõ',
    status: fields.normalizedStatusName || fields.status?.name || cache[issue.key]?.status || '',
    lastUpdatedAt: now,
    jiraUpdatedAt: fields.updated || cache[issue.key]?.jiraUpdatedAt,
    parentId: parentId || readParentId(issue) || cache[issue.key]?.parentId,
    children: children || cache[issue.key]?.children || [],
  };
}

async function getTicketCache(): Promise<Record<string, SprintTicketCacheItem>> {
  return (await getConfig(TICKET_CACHE_KEY)) || {};
}

function mergeChildIds(existingIds: string[] | undefined, incomingIds: string[]): string[] {
  return Array.from(new Set([...(existingIds || []), ...incomingIds]));
}

function collectRequestedTicketIds(
  cache: Record<string, SprintTicketCacheItem>,
  ids: string[]
): string[] {
  const collected = new Set<string>();
  const queue = [...ids];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || collected.has(id)) continue;

    collected.add(id);
    cache[id]?.children?.forEach((childId) => {
      if (!collected.has(childId)) queue.push(childId);
    });
  }

  return Array.from(collected);
}

async function reloadTicketsFromJira(ids: string[]): Promise<Record<string, SprintTicketCacheItem>> {
  if (!ids.length) return await getTicketCache();

  const cache = await getTicketCache();
  const rootIds = uniqueTicketIds(ids);
  const result = await jiraService.searchIssuesWithOptions(buildTicketJql(rootIds), {
    maxResults: Math.max(ids.length, 50),
    fields: ['summary', 'status', 'issuetype', 'updated', 'subtasks', 'parent'],
  });
  const now = new Date().toISOString();
  const seenIds = new Set<string>();
  const pendingByKeyIds = new Set<string>();

  const recordIssues = (issues: any[]) => {
    const childIdsByParent = new Map<string, string[]>();

    for (const issue of issues) {
      const parentId = readParentId(issue);
      const subtaskIds = uniqueTicketIds(readSubtaskIds(issue));
      writeIssueToCache(cache, issue, now, parentId, mergeChildIds(cache[issue.key]?.children, subtaskIds));
      seenIds.add(issue.key);

      if (parentId) {
        const existingChildren = childIdsByParent.get(parentId) || [];
        childIdsByParent.set(parentId, mergeChildIds(existingChildren, [issue.key]));
      }

      subtaskIds.forEach((childId) => {
        if (!seenIds.has(childId)) {
          pendingByKeyIds.add(childId);
        }
      });
    }

    childIdsByParent.forEach((childIds, parentId) => {
      if (!cache[parentId]) return;
      cache[parentId] = {
        ...cache[parentId],
        children: mergeChildIds(cache[parentId]?.children, childIds),
      };
    });
  };

  recordIssues(result.issues || []);

  let frontier = (result.issues || []).map((issue: any) => issue.key);
  const expandedParents = new Set<string>();

  while (frontier.length > 0) {
    const parentIds = uniqueTicketIds(frontier.filter((id: string) => !expandedParents.has(id)));
    if (!parentIds.length) break;

    parentIds.forEach((id) => expandedParents.add(id));

    const childResult = await jiraService.searchIssuesWithOptions(buildParentJql(parentIds), {
      maxResults: Math.max(parentIds.length * 50, 50),
      fields: ['summary', 'status', 'issuetype', 'updated', 'parent', 'subtasks'],
    });
    const childIssues = childResult.issues || [];
    if (!childIssues.length) break;

    recordIssues(childIssues);
    frontier = childIssues.map((issue: any) => issue.key);
  }

  while (pendingByKeyIds.size > 0) {
    const missingIds = Array.from(pendingByKeyIds).filter((id) => !seenIds.has(id));
    pendingByKeyIds.clear();
    if (!missingIds.length) break;

    const missingResult = await jiraService.searchIssuesWithOptions(buildTicketJql(missingIds), {
      maxResults: Math.max(missingIds.length, 50),
      fields: ['summary', 'status', 'issuetype', 'updated', 'parent', 'subtasks'],
    });
    recordIssues(missingResult.issues || []);
  }

  await setConfig(TICKET_CACHE_KEY, cache);
  return cache;
}

function stripHtml(html: string): string {
  return html
    // Confluence emoticon → emoji (ac:emoticon and ac:emoji tags)
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="green[^"]*"[^>]*\/?>/gi, '🟢')
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="yellow[^"]*"[^>]*\/?>/gi, '🟡')
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="red[^"]*"[^>]*\/?>/gi, '🔴')
    // Confluence status macro with colour attribute
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Green<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🟢')
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Yellow<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🟡')
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Red<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🔴')
    // Strip remaining tags
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export const getConfluenceChildren = async (req: Request, res: Response): Promise<void> => {
  try {
    const pages = await jiraService.getConfluenceChildPages(ROOT_PAGE_ID);
    const loaded: any[] = (await getConfig('sprint_mgmt_pages')) || [];
    const loadedMap = new Map(loaded.map((p) => [p.pageId, p]));
    const result = pages.map((p) => ({
      ...p,
      loaded: loadedMap.has(p.id),
      loadedAt: loadedMap.get(p.id)?.loadedAt || null,
    }));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLoadedPages = async (req: Request, res: Response): Promise<void> => {
  try {
    const pages = (await getConfig('sprint_mgmt_pages')) || [];
    res.json({ success: true, data: pages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loadPage = async (req: Request, res: Response): Promise<void> => {
  const { pageId } = req.params;
  try {
    const pageContent = await jiraService.getConfluencePageContent(pageId);
    const pages: any[] = (await getConfig('sprint_mgmt_pages')) || [];
    const existingIndex = pages.findIndex((p) => p.pageId === pageId);
    const entry = {
      pageId,
      title: pageContent.title,
      content: pageContent.body,
      loadedAt: new Date().toISOString(),
      url: `${process.env.JIRA_HOST}/wiki/spaces/PL/pages/${pageId}`,
    };
    if (existingIndex >= 0) {
      pages[existingIndex] = entry;
    } else {
      pages.push(entry);
    }
    await setConfig('sprint_mgmt_pages', pages);
    res.json({ success: true, data: { ...entry, content: undefined } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPageContent = async (req: Request, res: Response): Promise<void> => {
  const { pageId } = req.params;
  try {
    const pages: any[] = (await getConfig('sprint_mgmt_pages')) || [];
    const page = pages.find((p) => p.pageId === pageId);
    if (!page) {
      res.status(404).json({ success: false, error: 'Page not loaded' });
      return;
    }
    const raw = req.query.raw === '1';
    res.json({ success: true, data: { ...page, textContent: raw ? page.content : stripHtml(page.content) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const analyzePages = async (req: Request, res: Response): Promise<void> => {
  const { pageIds, prompt } = req.body;
  try {
    const allPages: any[] = (await getConfig('sprint_mgmt_pages')) || [];
    const selectedPages = allPages.filter((p) => pageIds.includes(p.pageId));
    if (!selectedPages.length) {
      res.status(400).json({ success: false, error: 'No loaded pages selected' });
      return;
    }
    const combined = selectedPages
      .map((p) => `=== ${p.title} ===\n${stripHtml(p.content)}`)
      .join('\n\n');
    const fullPrompt = `${prompt}\n\nDữ liệu từ Confluence:\n\n${combined}`;
    const result = await analyzeWithCustomPrompt(fullPrompt);

    const results: any[] = (await getConfig('sprint_mgmt_results')) || [];
    const entry = {
      id: Date.now().toString(),
      prompt,
      result,
      pageIds,
      pagesTitles: selectedPages.map((p) => p.title),
      timestamp: new Date().toISOString(),
    };
    results.unshift(entry);
    await setConfig('sprint_mgmt_results', results.slice(0, 20));
    res.json({ success: true, data: entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const results = (await getConfig('sprint_mgmt_results')) || [];
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCachedTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = uniqueTicketIds(req.query.ids);
    const cache = await getTicketCache();
    const requestedIds = collectRequestedTicketIds(cache, ids);
    const data = requestedIds.length
      ? Object.fromEntries(requestedIds.map((id) => [id, cache[id]]).filter(([, ticket]) => Boolean(ticket)))
      : cache;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reloadCachedTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = uniqueTicketIds(req.body?.ticketIds);
    if (!ids.length) {
      res.status(400).json({ success: false, error: 'No ticket ids provided' });
      return;
    }

    const cache = await reloadTicketsFromJira(ids);
    const returnedIds = collectRequestedTicketIds(cache, ids);
    const data = Object.fromEntries(returnedIds.map((id) => [id, cache[id]]).filter(([, ticket]) => Boolean(ticket)));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
