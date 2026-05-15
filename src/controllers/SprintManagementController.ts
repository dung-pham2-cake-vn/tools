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
  assignee: string;
  storyPoints: number;
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
    assignee: fields.normalizedAssigneeName || cache[issue.key]?.assignee || '',
    storyPoints: fields.normalizedStoryPoints ?? cache[issue.key]?.storyPoints ?? 0,
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
    fields: ['summary', 'status', 'issuetype', 'updated', 'subtasks', 'parent', 'assignee'],
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
      fields: ['summary', 'status', 'issuetype', 'updated', 'parent', 'subtasks', 'assignee'],
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
      fields: ['summary', 'status', 'issuetype', 'updated', 'parent', 'subtasks', 'assignee'],
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

// ── Script-based parser (no AI) ──────────────────────────────────────────────

interface ScriptSprintTicket {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ScriptSprintItem {
  number: number;
  icon: '🟢' | '🟡' | '🔴';
  teams: string[];
  prNumber: string;
  title: string;
  tickets: ScriptSprintTicket[];
}

interface ScriptSprintSection {
  name: string;
  emoji: string;
  items: ScriptSprintItem[];
}

interface ScriptSprintData {
  sections: ScriptSprintSection[];
}

const SECTION_CONFIG: { name: string; emoji: string }[] = [
  { name: 'Core', emoji: '😤' },
  { name: 'Must have', emoji: '😍' },
];
const ALL_KNOWN_SECTIONS = ['Core', 'Must have', 'Nice to have', 'Backlog', 'Business Planning'];

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  ndash: '–', mdash: '—', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  hellip: '…', bull: '•', loz: '◆', trade: '™', copy: '©', reg: '®',
  // Latin-1 lower
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  yacute: 'ý',
  // Latin-1 upper
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë',
  Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï',
  Ntilde: 'Ñ',
  Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö',
  Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü',
  Yacute: 'Ý',
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);
}

function htmlToStructuredText(rawHtml: string): string {
  const decoded = decodeHtmlEntities(rawHtml);
  return decoded
    // Confluence emoticons → emoji (must happen before tag stripping)
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="green[^"]*"[^>]*\/?>/gi, '🟢')
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="yellow[^"]*"[^>]*\/?>/gi, '🟡')
    .replace(/<ac:(?:emoticon|emoji)[^>]*ac:name="red[^"]*"[^>]*\/?>/gi, '🔴')
    // Confluence status macros
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Green<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🟢')
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Yellow<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🟡')
    .replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="colour"[^>]*>Red<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi, '🔴')
    // Jira macro key → inject ticket ID into text stream
    .replace(/<ac:parameter[^>]*ac:name="key"[^>]*>([A-Z][A-Z0-9]+-\d+)<\/ac:parameter>/gi, ' $1 ')
    // Block-level elements → newline so sections/items end up on separate lines
    .replace(/<\/?(tr|td|th|p|div|h[1-6]|li|br)\b[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]*>/g, ' ')
    // Remove UUIDs (Jira macro serverId noise)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
    // Remove "System Jira" noise from macros
    .replace(/\bSystem\s+Jira\b/gi, '')
    // Normalise whitespace per-line
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseItemsFromText(sectionText: string): ScriptSprintItem[] {
  const items: ScriptSprintItem[] = [];
  // Split by emoji — each chunk starting with an emoji is one item
  const chunks = sectionText.split(/(?=[🟢🟡🔴])/u).filter((c) => /^[🟢🟡🔴]/u.test(c.trim()));

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const icon = (chunk.match(/^[🟢🟡🔴]/u)?.[0] || '🟢') as '🟢' | '🟡' | '🔴';

    // Teams: [Lend+DOP+Prec] or [Adhoc] etc.
    const teamsMatch = chunk.match(/\[([^\]]+)\]/);
    const teams = teamsMatch
      ? teamsMatch[1].split(/[+,\s]+/).map((t) => t.trim()).filter(Boolean)
      : [];

    // PR number (PR-NNN, distinct from Jira keys which have letters in project part)
    const prMatch = chunk.match(/\bPR-(\d+)\b/i);

    // Ticket IDs: uppercase project key + hyphen + digits, but skip PR-NNN
    const KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
    const ticketIds: string[] = [];
    let km;
    while ((km = KEY_RE.exec(chunk)) !== null) {
      if (/^PR$/i.test(km[1].split('-')[0])) continue;
      ticketIds.push(km[1]);
    }

    // Title: strip structural prefix, keep actual description
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let title = chunk
      .replace(/^[🟢🟡🔴]\s*/u, '')          // remove icon
      .replace(/^\[[^\]]*\]\s*/u, '')          // remove first [bracket] = teams
      .replace(/^\[PR-\d+\]\s*/iu, '')         // remove [PR-NNN] if immediately after
      .replace(/^PR-\d+\s*/iu, '')             // remove bare PR-NNN if immediately after
      .replace(/^[^\p{L}\p{N}\[（(]+/u, '');    // strip any non-letter/digit/bracket prefix (◆, –, -, etc.)
    title = title.replace(/\bPR-\d+\b/gi, '');
    if (ticketIds.length) {
      title = title.replace(new RegExp(`\\b(${ticketIds.map(escapeRe).join('|')})\\b`, 'g'), '');
    }
    title = title.replace(/\s+/g, ' ').trim();

    items.push({
      number: idx + 1,
      icon,
      teams,
      prNumber: prMatch ? `PR-${prMatch[1]}` : '',
      title,
      tickets: ticketIds.map((id) => ({ id, name: '', type: 'Task', status: 'OPEN' })),
    });
  }

  return items;
}

function parseSprintByScript(rawHtml: string): ScriptSprintData {
  const text = htmlToStructuredText(rawHtml);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Build a regex that matches any known section name at the start of a line
  const sectionNameRe = new RegExp(
    `^(${ALL_KNOWN_SECTIONS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s|\\(|$)`
  );

  const boundaries: { name: string; lineIdx: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(sectionNameRe);
    if (m) boundaries.push({ name: m[1], lineIdx: i });
  }

  const sections: ScriptSprintSection[] = [];

  for (let i = 0; i < boundaries.length; i++) {
    const { name, lineIdx } = boundaries[i];
    const config = SECTION_CONFIG.find((s) => name.startsWith(s.name));
    if (!config) continue; // Skip Nice to have, Backlog, etc.

    const endLineIdx = boundaries[i + 1]?.lineIdx ?? lines.length;
    const sectionText = lines.slice(lineIdx + 1, endLineIdx).join('\n');
    const items = parseItemsFromText(sectionText);

    if (items.length > 0) {
      sections.push({ name: config.name, emoji: config.emoji, items });
    }
  }

  // Fallback: if no section boundaries found, treat entire content as Must have
  if (sections.length === 0) {
    const items = parseItemsFromText(lines.join('\n'));
    if (items.length > 0) {
      sections.push({ name: 'Must have', emoji: '😍', items });
    }
  }

  return { sections };
}

export const parsePagesByScript = async (req: Request, res: Response): Promise<void> => {
  const { pageIds } = req.body;
  try {
    const allPages: any[] = (await getConfig('sprint_mgmt_pages')) || [];
    const selectedPages = allPages.filter((p) => pageIds.includes(p.pageId));
    if (!selectedPages.length) {
      res.status(400).json({ success: false, error: 'No loaded pages selected' });
      return;
    }

    const combined = selectedPages
      .map((p) => parseSprintByScript(p.content))
      .reduce<ScriptSprintData>(
        (acc, cur) => ({ sections: [...acc.sections, ...cur.sections] }),
        { sections: [] }
      );

    const result = JSON.stringify(combined, null, 2);

    const results: any[] = (await getConfig('sprint_mgmt_results')) || [];
    const entry = {
      id: Date.now().toString(),
      prompt: '[script-parse]',
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

// ─────────────────────────────────────────────────────────────────────────────

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
