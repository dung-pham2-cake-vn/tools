import { jiraService } from './JiraService';
import { SupportTicket } from '../models/SupportTicket';

const SUPPORT_FIELDS = [
  'summary',
  'description',
  'issuelinks',
  'issuetype',
  'status',
  'assignee',
  'priority',
  'comment',
  'created',
  'updated',
];

const CLOSED_STATUSES = ['Invalid', 'Test Passed', 'Done'];

function extractDescriptionText(description: any): string {
  if (!description) return '';
  if (typeof description === 'string') return description;

  const texts: string[] = [];
  const traverse = (node: any) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') texts.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(traverse);
  };
  traverse(description);
  return texts.join(' ');
}

export const executeJQLQuery = async (jqlQuery: string) => {
  const allIssues: any[] = [];
  let nextPageToken: string | undefined;

  do {
    const result = await jiraService.searchIssuesWithOptions(jqlQuery, {
      fields: SUPPORT_FIELDS,
      maxResults: 100,
      nextPageToken,
    });

    allIssues.push(...(result.issues || []));
    nextPageToken = result.nextPageToken;
  } while (nextPageToken);

  return allIssues;
};

// Find tickets in DB that were open but are missing from latest scan results
// (they likely moved to a closed status since last scan)
const fetchRecentlyClosedTickets = async (scannedKeys: Set<string>) => {
  const prevOpenInDb = await SupportTicket.find({
    status: { $nin: CLOSED_STATUSES },
  }).select('key').lean();

  const staleKeys = prevOpenInDb
    .map((t) => t.key)
    .filter((key) => !scannedKeys.has(key));

  if (!staleKeys.length) return [];

  const allIssues: any[] = [];
  // Chunk into batches of 50 to stay within JQL limits
  for (let i = 0; i < staleKeys.length; i += 50) {
    const batch = staleKeys.slice(i, i + 50);
    const jql = `issue in (${batch.join(',')}) ORDER BY created DESC`;
    const issues = await executeJQLQuery(jql);
    allIssues.push(...issues);
  }

  return allIssues;
};

export const scanUnclosed = async () => {
  const openJQL = `project in (PL, PLO, DOP) AND created >= -365d AND (issueLinkType = "causes" or (type = Bug and (labels not in (NON_PROD, auto_stage) or labels is empty))) AND type in (Task, Bug) AND status NOT IN (Invalid, "Test Passed", Done) ORDER BY created DESC`;

  const openIssues = await executeJQLQuery(openJQL);
  const scannedKeys = new Set(openIssues.map((i: any) => i.key));

  const closedIssues = await fetchRecentlyClosedTickets(scannedKeys);

  const allIssues = [...openIssues, ...closedIssues];
  await saveTicketsToDatabase(allIssues);
  return { total: allIssues.length, open: openIssues.length, recentlyClosed: closedIssues.length };
};

export const scanAll = async () => {
  const jql = `project in (PL, PLO, DOP) AND created >= -365d AND (issueLinkType = "causes" or (type = Bug and (labels not in (NON_PROD, auto_stage) or labels is empty))) AND type in (Task, Bug) ORDER BY created DESC`;
  const issues = await executeJQLQuery(jql);
  await saveTicketsToDatabase(issues);
  return { total: issues.length, open: issues.length, recentlyClosed: 0 };
};

export const saveTicketsToDatabase = async (issues: any[]) => {
  const jiraHost = process.env.JIRA_HOST || '';

  for (const issue of issues) {
    const f = issue.fields || {};
    const sprintName = f.normalizedSprints?.[0]?.name || '';

    const rawComments = await jiraService.getAllIssueComments(issue.key);
    const comments = rawComments.map((c: any) => ({
      id: c.id,
      author: c.author?.displayName || '',
      body: extractDescriptionText(c.body),
      created: c.created,
      updated: c.updated,
    }));

    const linkedWorkItems = (f.issuelinks || []).map((link: any) => ({
      id: link.id,
      type: link.type?.name || '',
      inwardIssue: link.inwardIssue
        ? { key: link.inwardIssue.key, summary: link.inwardIssue.fields?.summary }
        : undefined,
      outwardIssue: link.outwardIssue
        ? { key: link.outwardIssue.key, summary: link.outwardIssue.fields?.summary }
        : undefined,
    }));

    await SupportTicket.findOneAndUpdate(
      { jiraId: issue.id },
      {
        jiraId: issue.id,
        key: issue.key,
        title: f.summary || '',
        description: extractDescriptionText(f.description),
        linkedWorkItems,
        hyperlink: `${jiraHost}/browse/${issue.key}`,
        type: f.issuetype?.name || '',
        status: f.normalizedStatusName || f.status?.name || '',
        assignee: f.normalizedAssigneeName || f.assignee?.displayName || '',
        priority: f.normalizedPriorityName || f.priority?.name || '',
        sprint: sprintName,
        created: f.created ? new Date(f.created) : undefined,
        updated: f.updated ? new Date(f.updated) : undefined,
        comments,
      },
      { upsert: true, new: true }
    );
  }
};
