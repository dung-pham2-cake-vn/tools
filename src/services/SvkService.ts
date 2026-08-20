import crypto from 'crypto';
import { jiraService } from './JiraService';
import { SvkTicket, ISvkTicket, ISvkComment } from '../models/SvkTicket';
import { SvkHistory } from '../models/SvkHistory';
import { SupportTicket } from '../models/SupportTicket';
import { analyzeWithCustomPrompt } from './AIService';
import { SVK_REVIEW_PROMPT } from './svkReviewPrompt';

const SVK_JQL = `project = SVK AND "Request Type" IN ("Lending Onboarding DOP","Lending Onboarding API","Lending Onboarding Appcake","Lending Disburse","Lending Payment Installment","Lending Repayment","Lending Get Detail","Lending Termination","Lending Core","Lending Portal Support","Lending Risk Support","Lending Others") AND status NOT IN (Done,Cancelled,Ready4Test,"Waiting for customer") ORDER BY created DESC`;

const PL_BROAD_JQL = `project in (PL,PLO,DOP) AND created >= -30d AND issueLinkType = "causes" AND status NOT IN (Invalid,"Test Passed")`;

const SVK_FIELDS = ['summary', 'status', 'priority', 'created', 'updated', 'description', 'issuelinks', 'comment'];
const PL_FIELDS = ['summary', 'status', 'comment', 'description', 'assignee', 'issuelinks', 'customfield_10020', 'created'];

const SVK_PORTAL_BASE = 'https://internal.support.cake.vn/servicedesk/customer/portal/1';

function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'text' && typeof n.text === 'string') out.push(n.text);
    // image-only comments would otherwise read as empty — keep the evidence signal for the AI
    if (n.type === 'media' || n.type === 'mediaInline') {
      out.push(`[đính kèm: ${n.attrs?.alt || n.attrs?.fileName || n.attrs?.id || 'file'}]`);
    }
    if (n.type === 'inlineCard' || n.type === 'blockCard') out.push(`[link: ${n.attrs?.url || ''}]`);
    if (n.type === 'hardBreak' || n.type === 'paragraph') out.push('\n');
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(node);
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}

/** Run tasks with bounded concurrency so a 50-ticket scan doesn't open 50 sockets at once. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchAllPages(jql: string, fields: string[]): Promise<any[]> {
  const all: any[] = [];
  let nextPageToken: string | undefined;
  for (;;) {
    const res = await jiraService.searchIssuesWithOptions(jql, { maxResults: 100, fields, nextPageToken });
    const page = res.issues || [];
    all.push(...page);
    if (!page.length || res.isLast || !res.nextPageToken) break;
    nextPageToken = res.nextPageToken;
  }
  return all;
}

async function loadComments(issueKey: string): Promise<ISvkComment[]> {
  const raw = await jiraService.getAllIssueComments(issueKey);
  return raw.map((c: any) => ({
    id: c.id,
    author: c.author?.displayName || '',
    body: adfToText(c.body),
    bodyAdf: c.body ?? null,
    created: c.created || '',
    updated: c.updated || '',
  }));
}

function plSprintName(fields: any): string {
  const sprints: any[] = fields?.customfield_10020 || [];
  if (!sprints.length) return '';
  const active = sprints.find((s: any) => s.state === 'active') || sprints[sprints.length - 1];
  return active?.name || '';
}

function commentsFingerprint(comments: ISvkComment[]): string {
  return comments.map((c) => `${c.id}:${c.updated || c.created}`).join('|');
}

/** Changes to description or any comment (SVK or linked PL) invalidate a cached AI result. */
function buildAiInputHash(doc: {
  description: string;
  comments: ISvkComment[];
  linkedPl: { key: string; description: string; comments: ISvkComment[] }[];
}): string {
  const parts = [
    doc.description,
    commentsFingerprint(doc.comments),
    ...doc.linkedPl.map((pl) => `${pl.key}::${pl.description}::${commentsFingerprint(pl.comments)}`),
  ];
  return crypto.createHash('sha1').update(parts.join('##')).digest('hex');
}

/**
 * Mirror a freshly loaded ticket into the history log: overwrite the snapshot,
 * bump the load counter, keep the original first-load timestamp.
 */
async function recordHistory(snapshot: Record<string, any>, keepAi: { aiResult: string; aiError: string; aiRunAt?: Date } | null) {
  const now = new Date();
  await SvkHistory.updateOne(
    { key: snapshot.key },
    {
      $set: { ...snapshot, ...(keepAi || { aiResult: '', aiError: '', aiRunAt: undefined }), lastLoadedAt: now },
      $inc: { loadCount: 1 },
      $setOnInsert: { firstLoadedAt: now },
    },
    { upsert: true }
  );
}

export const scanSvkTickets = async (): Promise<{ total: number; pendingAi: number }> => {
  const svkIssues = await fetchAllPages(SVK_JQL, SVK_FIELDS);

  // map SVK -> linked PL keys
  const svkPlMap = new Map<string, string[]>();
  const allPlKeys = new Set<string>();
  for (const svk of svkIssues) {
    const linked = new Set<string>();
    for (const link of svk.fields?.issuelinks || []) {
      const issue = link.inwardIssue || link.outwardIssue;
      if (issue?.key && /^(PL|PLO|DOP)-\d+$/.test(issue.key)) {
        linked.add(issue.key);
        allPlKeys.add(issue.key);
      }
    }
    svkPlMap.set(svk.key, [...linked]);
  }

  // fetch linked PL issues: one broad query, then fill gaps by key
  const plMap = new Map<string, any>();
  if (allPlKeys.size) {
    for (const pl of await fetchAllPages(PL_BROAD_JQL, PL_FIELDS)) plMap.set(pl.key, pl);

    const missing = [...allPlKeys].filter((k) => !plMap.has(k));
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50);
      for (const pl of await fetchAllPages(`issueKey in (${batch.join(',')})`, PL_FIELDS)) plMap.set(pl.key, pl);
    }
  }

  // the `comment` search field is truncated by Jira — pull full comment threads per issue
  const plKeysNeeded = [...allPlKeys].filter((k) => plMap.has(k));
  const plCommentsMap = new Map<string, ISvkComment[]>();
  await mapLimit(plKeysNeeded, 5, async (key) => {
    plCommentsMap.set(key, await loadComments(key));
  });

  const jiraHost = process.env.JIRA_HOST || '';
  let pendingAi = 0;

  await mapLimit(svkIssues, 5, async (svk) => {
    const f = svk.fields || {};
    const comments = await loadComments(svk.key);
    const plKeys = svkPlMap.get(svk.key) || [];

    const linkedPl = plKeys
      .filter((k) => plMap.has(k))
      .map((k) => {
        const pf = plMap.get(k).fields || {};
        return {
          key: k,
          summary: pf.summary || '',
          status: pf.normalizedStatusName || pf.status?.name || '',
          assignee: pf.normalizedAssigneeName || pf.assignee?.displayName || '',
          sprint: plSprintName(pf),
          created: pf.created || '',
          description: adfToText(pf.description),
          descriptionAdf: pf.description ?? null,
          comments: plCommentsMap.get(k) || [],
        };
      });

    const description = adfToText(f.description);
    const aiInputHash = buildAiInputHash({ description, comments, linkedPl });

    const existing = await SvkTicket.findOne({ key: svk.key }).select('aiInputHash aiResult aiError aiRunAt').lean();
    const needsAi = !existing || existing.aiInputHash !== aiInputHash || !existing.aiResult;
    if (needsAi) pendingAi++;

    await SvkTicket.findOneAndUpdate(
      { key: svk.key },
      {
        jiraId: svk.id,
        key: svk.key,
        summary: f.summary || '',
        status: f.normalizedStatusName || f.status?.name || '',
        priority: f.normalizedPriorityName || f.priority?.name || '',
        created: f.created || '',
        updated: f.updated || '',
        hyperlink: `${SVK_PORTAL_BASE}/${svk.key}`,
        description,
        descriptionAdf: f.description ?? null,
        comments,
        linkedPlKeys: plKeys,
        linkedPl,
        aiInputHash,
        lastScanAt: new Date(),
        // stale AI output is cleared so the UI never shows a result for outdated content
        ...(needsAi ? { aiResult: '', aiError: '' } : {}),
      },
      { upsert: true, new: true }
    );

    // history keeps this snapshot even after the ticket leaves the JQL; a still-valid
    // AI result is carried over, a stale one is cleared like on the live ticket
    await recordHistory(
      {
        jiraId: svk.id,
        key: svk.key,
        summary: f.summary || '',
        status: f.normalizedStatusName || f.status?.name || '',
        priority: f.normalizedPriorityName || f.priority?.name || '',
        created: f.created || '',
        updated: f.updated || '',
        hyperlink: `${SVK_PORTAL_BASE}/${svk.key}`,
        description,
        descriptionAdf: f.description ?? null,
        comments,
        linkedPlKeys: plKeys,
        linkedPl,
      },
      needsAi ? null : { aiResult: existing!.aiResult || '', aiError: existing!.aiError || '', aiRunAt: existing!.aiRunAt }
    );

    // kick AI off right away — don't wait for the rest of the scan
    if (needsAi) enqueueAi(svk.key);
  });

  // drop tickets that no longer match the JQL (closed/cancelled since last scan)
  const liveKeys = svkIssues.map((i) => i.key);
  await SvkTicket.deleteMany({ key: { $nin: liveKeys } });

  return { total: svkIssues.length, pendingAi };
};

// ── AI review ────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'không', 'được', 'của', 'cho', 'khi', 'này', 'các', 'với', 'lỗi', 'bị', 'là', 'có', 'và',
  'the', 'and', 'for', 'with', 'error', 'issue', 'ticket', 'from', 'that', 'this',
]);

function keywords(text: string): string[] {
  return [
    ...new Set(
      (text || '')
        .toLowerCase()
        .split(/[^a-zà-ỹ0-9_]+/i)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    ),
  ];
}

/**
 * Similar-ticket context comes from the PL tickets already saved by the PL tab scan,
 * whose analyzeNote records how each was resolved.
 */
async function findSimilarTickets(doc: ISvkTicket, limit = 5) {
  const candidates = await SupportTicket.find({ analyzeNote: { $nin: ['', null] } })
    .sort({ created: -1 })
    .limit(300)
    .select('key title status analyzeNote created')
    .lean();

  const target = new Set(keywords(`${doc.summary} ${doc.description}`));
  if (!target.size) return [];

  const ownKeys = new Set(doc.linkedPlKeys || []);
  return candidates
    .filter((c) => !ownKeys.has(c.key))
    .map((c) => ({ ...c, score: keywords(c.title).filter((w) => target.has(w)).length }))
    .filter((c) => c.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function formatComments(comments: ISvkComment[]): string {
  if (!comments?.length) return '(không có comment)';
  return comments
    .map((c) => `[${c.author} — ${c.created ? new Date(c.created).toLocaleString('vi-VN') : '?'}]\n${c.body || '(trống)'}`)
    .join('\n\n');
}

export const buildSvkReviewPrompt = (
  doc: ISvkTicket,
  similar: { key: string; title: string; status: string; analyzeNote: string }[]
): string => {
  const plBlocks = (doc.linkedPl || []).length
    ? doc.linkedPl
        .map(
          (pl) => `### PL ticket: ${pl.key} — ${pl.summary}
Link: ${process.env.JIRA_HOST || 'https://cakedigitalbank.atlassian.net'}/browse/${pl.key}
Trạng thái: ${pl.status || '?'} | Assignee: ${pl.assignee || 'chưa gán'} | Sprint: ${pl.sprint || '—'} | Tạo: ${pl.created || '?'}

Nội dung:
${pl.description || '(trống)'}

Comment:
${formatComments(pl.comments)}`
        )
        .join('\n\n')
    : '(SVK này chưa link tới PL ticket nào)';

  const similarBlock = similar.length
    ? similar
        .map((s) => `- ${s.key} (${s.status}) — ${s.title}\n  Đã xử lý: ${(s.analyzeNote || '').slice(0, 800)}`)
        .join('\n')
    : '(không tìm thấy ticket tương tự trong dữ liệu đã lưu)';

  return `${SVK_REVIEW_PROMPT}

---

# DỮ LIỆU TICKET CẦN ĐÁNH GIÁ

## SVK ticket: ${doc.key} — ${doc.summary}
Link: ${doc.hyperlink}
Trạng thái: ${doc.status || '?'} | Ưu tiên: ${doc.priority || '?'} | Tạo: ${doc.created || '?'}
PL liên quan: ${(doc.linkedPlKeys || []).join(', ') || '(chưa có)'}

Nội dung:
${doc.description || '(trống)'}

Comment:
${formatComments(doc.comments)}

## PL ticket liên quan
${plBlocks}

## Ticket tương tự gần đây (từ dữ liệu PL đã lưu, kèm cách đã xử lý)
${similarBlock}

---

Đánh giá ticket trên theo đúng 3 phần đã quy định. Trả lời bằng tiếng Việt, dùng Markdown.`;
};

export const runAiForTicket = async (key: string): Promise<string> => {
  const doc = await SvkTicket.findOne({ key });
  if (!doc) throw new Error(`SVK ticket ${key} not found`);

  const similar = await findSimilarTickets(doc);
  const prompt = buildSvkReviewPrompt(doc, similar as any);
  const result = await analyzeWithCustomPrompt(prompt);

  doc.aiResult = result;
  doc.aiError = '';
  doc.aiRunAt = new Date();
  await doc.save();
  await SvkHistory.updateOne(
    { key },
    { $set: { aiResult: result, aiError: '', aiRunAt: doc.aiRunAt } }
  ).catch(() => {});
  return result;
};

// ── background AI queue ──────────────────────────────────────────────────────
// A ticket is queued the moment the scan finishes saving it, so AI runs while the
// rest of the scan is still fetching from Jira instead of waiting for the whole batch.

export interface AiJobState {
  running: boolean;
  total: number;
  done: number;
  failed: number;
  queued: number;
  current: string[];
  startedAt: string | null;
  finishedAt: string | null;
}

const AI_CONCURRENCY = 3;

const queue: string[] = [];
const inFlight = new Set<string>();
let workerCount = 0;

const counters = {
  total: 0,
  done: 0,
  failed: 0,
  startedAt: null as string | null,
  finishedAt: null as string | null,
};

const isIdle = () => workerCount === 0 && queue.length === 0;

export const getAiJobState = (): AiJobState => ({
  running: !isIdle(),
  total: counters.total,
  done: counters.done,
  failed: counters.failed,
  queued: queue.length,
  current: [...inFlight],
  startedAt: counters.startedAt,
  finishedAt: counters.finishedAt,
});

async function worker() {
  for (;;) {
    const key = queue.shift();
    if (!key) break;
    inFlight.add(key);
    try {
      await runAiForTicket(key);
      counters.done++;
      console.log(`[SVK AI] ${key} done (${counters.done}/${counters.total})`);
    } catch (error: any) {
      counters.failed++;
      const message = error?.message || String(error);
      console.error(`[SVK AI] ${key} failed:`, message);
      await SvkTicket.updateOne({ key }, { aiError: message, aiRunAt: new Date() }).catch(() => {});
    } finally {
      inFlight.delete(key);
    }
  }
  workerCount--;
  if (isIdle()) counters.finishedAt = new Date().toISOString();
}

function pump() {
  while (workerCount < AI_CONCURRENCY && queue.length > 0) {
    workerCount++;
    void worker();
  }
}

/** Queue one ticket for AI review. Safe to call repeatedly — duplicates are ignored. */
export const enqueueAi = (key: string): void => {
  if (queue.includes(key) || inFlight.has(key)) return;

  // a fresh run after everything drained resets the progress counters
  if (isIdle()) {
    counters.total = 0;
    counters.done = 0;
    counters.failed = 0;
    counters.startedAt = new Date().toISOString();
    counters.finishedAt = null;
  }

  queue.push(key);
  counters.total++;
  pump();
};

/** Queue every ticket that has no AI result yet (force = re-run all). */
export const startPendingAiJob = async (force = false): Promise<AiJobState> => {
  const filter = force ? {} : { $or: [{ aiResult: '' }, { aiResult: { $exists: false } }] };
  const pending = await SvkTicket.find(filter).select('key').sort({ created: -1 }).lean();
  for (const { key } of pending) enqueueAi(key);
  return getAiJobState();
};

export const getSvkTickets = async () =>
  SvkTicket.find().sort({ created: -1 }).lean();

export const getSvkHistory = async () =>
  SvkHistory.find().sort({ lastLoadedAt: -1 }).lean();
