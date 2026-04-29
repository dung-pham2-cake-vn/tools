import { Request, Response } from 'express';
import { jiraService } from '../services/JiraService';
import { analyzeWithCustomPrompt } from '../services/AIService';
import { getConfig, setConfig } from '../models/AppConfig';

const ROOT_PAGE_ID = '1570209916';

function stripHtml(html: string): string {
  return html
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
    res.json({ success: true, data: { ...page, textContent: stripHtml(page.content) } });
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
