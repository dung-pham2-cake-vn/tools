import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import NotesPanel from '@/components/NotesPanel';
import { sprintPagePath } from '@/utils/sprintPages';
import { JiraStatusPill, JiraTypeTag } from '@/components/JiraBadges';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI, sprintManagementAPI, supportAPI } from '@/utils/api';
import { buildRows, type SvkTicketDoc, type Urgency } from '@/utils/svk';
import {
  extractSprintNumber,
  sprintPageLabel,
  SprintItem,
  PR_STATUS_LABELS,
  isPrStatusLabel,
  PrLabelControl,
  representativeTicket,
  CachedSprintTicket as SmAnalysisTicket,
} from '@/components/SprintManagementAnalysis';

// ─── Sprint overview types ────────────────────────────────────────────────────

interface TicketStats {
  todo: number;
  inProgress: number;
  done: number;
}

interface SmStats {
  subtasks: TicketStats;
  stories: TicketStats;
}

// ─── Sprint management full data types ───────────────────────────────────────

interface SmCachedTicket {
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
  fixVersions?: string[];
}

interface SprintMgmtLoadResult {
  stats: SmStats;
  ticketCache: Record<string, SmCachedTicket>;
  contributors: Record<string, string>;
  topLevelIds: string[];
  pageId: string;
  pageTitle: string;
  items: SprintItem[];
}

// ─── Sprint alignment types ───────────────────────────────────────────────────

type ProjectKey = 'PL' | 'PLO' | 'DOP';
type TimeStatus = 'within' | 'overdue' | 'upcoming';

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

interface JiraSearchIssue {
  id: string;
  key: string;
  fields: {
    normalizedSprints?: NormalizedSprintDetail[];
    normalizedFixVersions?: NormalizedFixVersionDetail[];
  };
}

interface JiraSearchResponse {
  issues: JiraSearchIssue[];
}

interface JiraVersion {
  id: string;
  name: string;
  released?: boolean;
  archived?: boolean;
  startDate?: string | null;
  releaseDate?: string | null;
}

interface TimelineItem {
  marker: '✅' | '❌';
  label: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  timeStatus: TimeStatus | null;
  notes: string[];
}

interface ProjectReport {
  projectKey: ProjectKey;
  sprintLine: TimelineItem;
  versionLine: TimelineItem;
}

// ─── Sprint alignment helpers ─────────────────────────────────────────────────

// DOP tạm bỏ khỏi monitor sprint/fix-version (chưa cần theo dõi).
const PROJECT_KEYS: ProjectKey[] = ['PL', 'PLO'];
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;
const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toUtc7Date = (value?: string | null): string | null => {
  if (!value) return null;
  if (isDateOnly(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + UTC7_OFFSET_MS).toISOString().slice(0, 10);
};

const getTodayUtc7 = (): string => toUtc7Date(new Date().toISOString()) || '';

const compareDateStrings = (left: string, right: string) => left.localeCompare(right);

const getTimeStatus = (today: string, startDate: string | null, endDate: string | null): TimeStatus | null => {
  if (!startDate || !endDate) return null;
  if (compareDateStrings(today, startDate) < 0) return 'upcoming';
  if (compareDateStrings(today, endDate) > 0) return 'overdue';
  return 'within';
};

const appendTimeStatus = (rangeText: string, status: TimeStatus | null): string => {
  if (status === 'overdue') return `${rangeText} 🔴 QUÁ HẠN`;
  if (status === 'upcoming') return `${rangeText} 🔴 CHƯA ĐẾN`;
  return rangeText;
};

const formatRange = (startDate: string | null, endDate: string | null, status: TimeStatus | null): string => {
  const start = startDate || '?';
  const end = endDate || '?';
  return appendTimeStatus(`(${start} -> ${end})`, status);
};

interface SprintDayInfo {
  startDate: string | null;
  endDate: string | null;
  /** Ngày hiện tại, clamp trong độ dài sprint (dùng cho card tổng quan). */
  dayNumber: number | null;
  /** Ngày hiện tại tính từ start date, không clamp — > totalDays nghĩa là sprint quá hạn. */
  rawDay: number | null;
  totalDays: number | null;
}

const getSprintDayInfo = (reports: ProjectReport[]): SprintDayInfo => {
  const report = reports.find((r) => r.projectKey === 'PL') ?? reports[0];
  const startDate = report?.sprintLine.startDate ?? null;
  const endDate = report?.sprintLine.endDate ?? null;
  if (!startDate || !endDate) {
    return { startDate, endDate, dayNumber: null, rawDay: null, totalDays: null };
  }
  const msPerDay = 86_400_000;
  const today = getTodayUtc7();
  const totalDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay) + 1;
  const raw = Math.max(
    1,
    Math.round((new Date(today).getTime() - new Date(startDate).getTime()) / msPerDay) + 1
  );
  return { startDate, endDate, totalDays, rawDay: raw, dayNumber: Math.min(raw, totalDays) };
};

const getMostCommonDate = (dates: Array<string | null>): string | null => {
  const counts = new Map<string, number>();
  dates.filter((v): v is string => Boolean(v)).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let winner: string | null = null;
  let maxCount = 0;
  counts.forEach((count, v) => {
    if (count > maxCount) { winner = v; maxCount = count; }
  });
  return winner;
};

const buildOpenSprintJql = (projectKey: ProjectKey) => `project=${projectKey} and Sprint IN openSprints()`;

const dedupeByName = <T extends { name: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => { if (!map.has(item.name)) map.set(item.name, item); });
  return Array.from(map.values());
};

const pickEarliestUnreleasedVersion = (versions: JiraVersion[]): { item: JiraVersion | null; notes: string[] } => {
  const unreleased = versions.filter((v) => !v.released && !v.archived);
  if (unreleased.length === 0) return { item: null, notes: ['no earliest unreleased fix version returned by project versions'] };
  const sorted = [...unreleased].sort((l, r) => {
    const lp = l.startDate || l.releaseDate || '9999-99-99';
    const rp = r.startDate || r.releaseDate || '9999-99-99';
    const pc = lp.localeCompare(rp);
    if (pc !== 0) return pc;
    return (l.releaseDate || '9999-99-99').localeCompare(r.releaseDate || '9999-99-99');
  });
  return { item: sorted[0], notes: [] };
};

const MAX_KEYS_SHOWN = 6;

const pickSingleSprint = (issues: JiraSearchIssue[]): { item: NormalizedSprintDetail | null; notes: string[] } => {
  const active = issues.flatMap((issue) => (issue.fields.normalizedSprints || []).filter((s) => s.state === 'active'));
  const sprints = dedupeByName(active);
  if (sprints.length === 0) return { item: null, notes: ['no active sprint returned by JQL'] };
  if (sprints.length === 1) return { item: sprints[0], notes: [] };

  // Issue có thể nằm trong sprint share từ board khác (vd PL ticket trong "Sprint - LOS").
  // Chọn sprint chiếm nhiều issue nhất của project; chỉ bỏ cuộc khi hoà.
  // Ticket nào kéo sprint phụ vào cũng được ghi lại để còn truy ngược mà sửa.
  const keysBySprint = new Map<string, string[]>();
  issues.forEach((issue) => {
    (issue.fields.normalizedSprints || [])
      .filter((s) => s.state === 'active')
      .forEach((s) => {
        const list = keysBySprint.get(s.name) || [];
        if (!list.includes(issue.key)) list.push(issue.key);
        keysBySprint.set(s.name, list);
      });
  });

  const counts = new Map<string, number>();
  active.forEach((s) => counts.set(s.name, (counts.get(s.name) || 0) + 1));
  const ranked = [...sprints].sort((l, r) => (counts.get(r.name) || 0) - (counts.get(l.name) || 0));
  if ((counts.get(ranked[0].name) || 0) === (counts.get(ranked[1].name) || 0)) {
    return { item: null, notes: [`multiple active sprints: ${sprints.map((s) => s.name).join(', ')}`] };
  }

  const others = ranked
    .slice(1)
    .map((s) => {
      const keys = keysBySprint.get(s.name) || [];
      const shown = keys.slice(0, MAX_KEYS_SHOWN).join(', ');
      const rest = keys.length > MAX_KEYS_SHOWN ? ` +${keys.length - MAX_KEYS_SHOWN} ticket nữa` : '';
      return `${s.name} (${shown}${rest})`;
    })
    .join(' · ');
  return { item: ranked[0], notes: [`bỏ qua sprint phụ: ${others}`] };
};

// ─── Sprint overview data loader ──────────────────────────────────────────────

const SM_TODO = new Set(['open', 'in coding', 'wait4dev']);
const SM_IN_PROGRESS = new Set(['test failed', 'ready4test', 'in testing', 'in progress']);

function smCategory(status: string): 'todo' | 'inProgress' | 'done' {
  const s = (status || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (SM_TODO.has(s)) return 'todo';
  if (SM_IN_PROGRESS.has(s)) return 'inProgress';
  return 'done';
}

async function loadSprintMgmtData(activeSprintName: string): Promise<SprintMgmtLoadResult | null> {
  const [pagesRes, resultsRes] = await Promise.all([
    sprintManagementAPI.getLoadedPages(),
    sprintManagementAPI.getResults(),
  ]);

  const pages: Array<{ pageId: string; title: string }> = pagesRes.data.data || [];
  const results: Array<{ result: string; pageIds: string[]; timestamp: string }> = resultsRes.data.data || [];

  const activeNum = extractSprintNumber(activeSprintName);
  const matchPage = (activeNum > 0
    ? pages.find((p) => extractSprintNumber(p.title) === activeNum)
    : undefined) ?? pages[0];

  if (!matchPage) return null;

  const pageResult = [...results]
    .filter((r) => r.pageIds?.includes(matchPage.pageId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (!pageResult) return null;

  let topLevelIds: string[] = [];
  let contributors: Record<string, string> = {};
  let items: SprintItem[] = [];
  try {
    const raw = pageResult.result.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const data = JSON.parse(raw) as {
      sections?: Array<{ name?: string; emoji?: string; items?: Array<{
        number?: number; icon?: string; teams?: string[]; prNumber?: string; title?: string;
        tickets?: Array<{ id?: string; name?: string; type?: string; status?: string }>;
      }> }>;
      contributors?: Record<string, string>;
    };
    items = (data.sections || []).flatMap((s) =>
      (s.items || []).map((i, idx) => ({
        number: i.number ?? idx + 1,
        icon: (i.icon as SprintItem['icon']) ?? '🟡',
        teams: i.teams ?? [],
        prNumber: i.prNumber ?? '',
        title: i.title ?? '',
        tickets: (i.tickets || []).map((t) => ({
          id: t.id ?? '',
          name: t.name ?? '',
          type: t.type ?? 'Task',
          status: t.status ?? '',
        })).filter((t) => Boolean(t.id)),
        section: s.name ?? '',
      }))
    );
    topLevelIds = Array.from(new Set(items.flatMap((i) => i.tickets.map((t) => t.id))));
    contributors = data.contributors || {};
  } catch {
    return null;
  }

  if (!topLevelIds.length) return null;

  const ticketsRes = await sprintManagementAPI.getTickets(topLevelIds);
  const cache: Record<string, SmCachedTicket> = ticketsRes.data.data || {};

  const allIds = new Set<string>();
  const collectAll = (id: string, seen = new Set<string>()) => {
    if (seen.has(id)) return;
    seen.add(id);
    allIds.add(id);
    (cache[id]?.children || []).forEach((c) => collectAll(c, seen));
  };
  topLevelIds.forEach((id) => collectAll(id));

  const subtasks: TicketStats = { todo: 0, inProgress: 0, done: 0 };
  const stories: TicketStats = { todo: 0, inProgress: 0, done: 0 };

  for (const id of allIds) {
    const t = cache[id];
    if (!t) continue;
    const isStory = (t.type || '').toLowerCase() === 'story';
    const cat = smCategory(t.status || '');
    const bucket = isStory ? stories : subtasks;
    bucket[cat]++;
  }

  return {
    stats: { subtasks, stories },
    ticketCache: cache,
    contributors,
    topLevelIds,
    pageId: matchPage.pageId,
    pageTitle: matchPage.title,
    items,
  };
}

async function loadSprintAlignmentReports(): Promise<ProjectReport[]> {
  const today = getTodayUtc7();

  const rawReports: ProjectReport[] = await Promise.all(
    PROJECT_KEYS.map(async (projectKey) => {
      const [sprintResponse, versionResponse] = await Promise.all([
        jiraAPI.searchIssues({ jql: buildOpenSprintJql(projectKey), maxResults: 50, fields: ['fixVersions'] }),
        jiraAPI.getProjectVersions(projectKey),
      ]);

      const sprintIssues = ((sprintResponse.data.data as JiraSearchResponse)?.issues || []) as JiraSearchIssue[];
      const projectVersions = (versionResponse.data.data || []) as JiraVersion[];
      const sprintSelection = pickSingleSprint(sprintIssues);
      const versionSelection = pickEarliestUnreleasedVersion(projectVersions);

      const sprintStart = toUtc7Date(sprintSelection.item?.startDate);
      const sprintEnd = toUtc7Date(sprintSelection.item?.endDate);
      const versionStart = toUtc7Date(versionSelection.item?.startDate);
      const versionEnd = toUtc7Date(versionSelection.item?.releaseDate);

      return {
        projectKey,
        sprintLine: {
          marker: sprintSelection.item ? '✅' : '❌',
          label: 'Sprint',
          name: sprintSelection.item?.name || 'Not found',
          startDate: sprintStart,
          endDate: sprintEnd,
          timeStatus: sprintSelection.item ? getTimeStatus(today, sprintStart, sprintEnd) : null,
          notes: sprintSelection.notes,
        },
        versionLine: {
          marker: versionSelection.item ? '✅' : '❌',
          label: 'Fix-ver',
          name: versionSelection.item?.name || 'Not found',
          startDate: versionStart,
          endDate: versionEnd,
          timeStatus: versionSelection.item ? getTimeStatus(today, versionStart, versionEnd) : null,
          notes: versionSelection.notes,
        },
      };
    })
  );

  const allItems = rawReports.flatMap((r) => [r.sprintLine, r.versionLine]);
  const canonicalStart = getMostCommonDate(allItems.map((i) => i.startDate));
  const canonicalEnd = getMostCommonDate(allItems.map((i) => i.endDate));

  return rawReports.map((report) => {
    const updateMarker = (item: TimelineItem): TimelineItem => {
      const notes = [...item.notes];
      let marker: '✅' | '❌' = item.marker;
      if (!item.startDate || !item.endDate) { notes.push('missing start/end date'); marker = '❌'; }
      if (canonicalStart && item.startDate && item.startDate !== canonicalStart) { notes.push(`start date differs from baseline ${canonicalStart}`); marker = '❌'; }
      if (canonicalEnd && item.endDate && item.endDate !== canonicalEnd) { notes.push(`end date differs from baseline ${canonicalEnd}`); marker = '❌'; }
      return { ...item, marker, notes };
    };
    return { ...report, sprintLine: updateMarker(report.sprintLine), versionLine: updateMarker(report.versionLine) };
  });
}

// ─── Sprint alignment summary ─────────────────────────────────────────────────

function computeSprintSummary(reports: ProjectReport[], loadError: string | null) {
  if (loadError) return { isAligned: false, issues: [loadError] };
  const issues = reports.flatMap((report) =>
    [report.sprintLine, report.versionLine].flatMap((item) => {
      const noteLines = item.notes.map((note) => `${report.projectKey} ${item.label}: ${note}`);
      const statusLine =
        item.timeStatus && item.timeStatus !== 'within'
          ? [`${report.projectKey} ${item.label}: ${item.timeStatus === 'overdue' ? 'QUÁ HẠN' : 'CHƯA ĐẾN'}`]
          : [];
      return [...noteLines, ...statusLine];
    })
  );
  return { isAligned: issues.length === 0, issues };
}

// ─── Sprint alignment detail panel ───────────────────────────────────────────

/** Link mở thẳng backlog và trang Releases của từng project trên Jira. */
const JIRA_PROJECT_LINKS: Record<string, { backlog: string; releases: string }> = {
  PL: {
    backlog: `${JIRA_BASE}/jira/software/c/projects/PL/boards/4/backlog`,
    releases: `${JIRA_BASE}/projects/PL?selectedItem=com.atlassian.jira.jira-projects-plugin%3Arelease-page`,
  },
  PLO: {
    backlog: `${JIRA_BASE}/jira/software/c/projects/PLO/boards/46/backlog`,
    releases: `${JIRA_BASE}/projects/PLO?selectedItem=com.atlassian.jira.jira-projects-plugin%3Arelease-page`,
  },
};

function JiraProjectLinks({ projectKey }: { projectKey: string }) {
  const links = JIRA_PROJECT_LINKS[projectKey];
  if (!links) return null;
  const cls =
    'rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100';
  return (
    <span className="inline-flex items-center gap-1.5">
      <a href={links.backlog} target="_blank" rel="noopener noreferrer" className={cls}>
        Backlog {projectKey} →
      </a>
      <a href={links.releases} target="_blank" rel="noopener noreferrer" className={cls}>
        Releases {projectKey} →
      </a>
    </span>
  );
}

function SprintAlignmentDetail({ reports, loadError }: { reports: ProjectReport[]; loadError: string | null }) {
  const summary = useMemo(() => computeSprintSummary(reports, loadError), [reports, loadError]);

  if (loadError) {
    return <div className="py-6 text-center text-red-600">{loadError}</div>;
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.projectKey} className="space-y-1.5 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {report.projectKey}
                </span>
                <JiraProjectLinks projectKey={report.projectKey} />
              </div>
              <div className="font-mono text-sm text-gray-900">
                {report.sprintLine.marker} {report.projectKey} Sprint: {report.sprintLine.name}{' '}
                {formatRange(report.sprintLine.startDate, report.sprintLine.endDate, report.sprintLine.timeStatus)}
              </div>
              <div className="font-mono text-sm text-gray-900">
                {report.versionLine.marker} {report.projectKey} Fix-ver: {report.versionLine.name}{' '}
                {formatRange(report.versionLine.startDate, report.versionLine.endDate, report.versionLine.timeStatus)}
              </div>
              {[...report.sprintLine.notes, ...report.versionLine.notes].map((note) => (
                <div key={note} className="ml-5 text-xs text-amber-700">⚠ {note}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-100 p-4">
        <p className="text-sm font-semibold text-gray-900">
          Tổng kết: {summary.isAligned ? '✅ Đồng bộ' : '❌ Lệch'}
        </p>
        {summary.isAligned ? (
          <p className="mt-2 text-sm text-gray-600">Tất cả Sprint và Fix Version đang đồng bộ và trong thời hạn.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {summary.issues.map((issue) => (
              <li key={issue} className="text-sm text-red-600">- {issue}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── SprintOverviewCard ───────────────────────────────────────────────────────

function SmStatCell({ label, count, color }: { label: string; count: number; color: 'gray' | 'blue' | 'green' }) {
  const numCls = color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-emerald-600' : 'text-gray-500';
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <span className={`text-2xl font-bold tabular-nums ${numCls}`}>{count}</span>
      <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

function SprintOverviewCard({
  sprintReports,
  sprintLoading,
  smStats,
  smLoading,
}: {
  sprintReports: ProjectReport[];
  sprintLoading: boolean;
  smStats: SmStats | null;
  smLoading: boolean;
}) {
  const { dayNumber, totalDays } = getSprintDayInfo(sprintReports);
  const progress = dayNumber && totalDays ? (dayNumber / totalDays) * 100 : 0;

  return (
    <div className="px-6 pt-5">
      {sprintLoading ? (
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      ) : (
        <>
          {dayNumber && totalDays && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(progress, 100).toFixed(1)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 tabular-nums w-9 text-right">
                {Math.round(progress)}%
              </span>
            </div>
          )}

          {smLoading ? (
            <div className="h-16 animate-pulse rounded bg-gray-50" />
          ) : smStats ? (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { label: 'Sub-tasks', stats: smStats.subtasks },
                  { label: 'Stories', stats: smStats.stories },
                ] as const
              ).map(({ label, stats }) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
                  <div className="flex gap-5">
                    <SmStatCell label="Todo" count={stats.todo} color="gray" />
                    <SmStatCell label="In-progress" count={stats.inProgress} color="blue" />
                    <SmStatCell label="Done" count={stats.done} color="green" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Chưa nạp page Sprint check của sprint này nên không có thống kê subtask/story.{' '}
              <Link href="/sprints/management" className="text-blue-600 hover:underline">
                Mở Sprint check →
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sprint ticket health types + loader ─────────────────────────────────────

interface SprintHealthIssue {
  key: string;
  summary: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
}

interface SprintHealthResult {
  draftStories: SprintHealthIssue[];
  unassignedStories: SprintHealthIssue[];
}

const SPRINT_HEALTH_JQL =
  'project IN (PL, PLO, DOP) AND Sprint IN openSprints() AND issuetype = Story ORDER BY project';

async function loadSprintTicketHealth(): Promise<SprintHealthResult> {
  const res = await jiraAPI.searchIssues({
    jql: SPRINT_HEALTH_JQL,
    maxResults: 200,
    fields: ['summary', 'status', 'assignee'],
  });
  const issues: any[] = ((res.data.data as { issues?: any[] })?.issues) || [];
  const mapped: SprintHealthIssue[] = issues.map((issue: any) => ({
    key: issue.key as string,
    summary: issue.fields?.summary || '',
    statusName: issue.fields?.normalizedStatusName || '',
    statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
    assigneeName: issue.fields?.normalizedAssigneeName || '',
  }));
  return {
    draftStories: mapped.filter((i) => i.statusName.toLowerCase() === 'draft'),
    unassignedStories: mapped.filter((i) => !i.assigneeName),
  };
}

// ─── SprintTicketHealthTable ──────────────────────────────────────────────────

function HealthIssueTable({ issues, emptyMsg }: { issues: SprintHealthIssue[]; emptyMsg: string }) {
  if (issues.length === 0) {
    return <p className="text-sm text-green-600 font-medium">{emptyMsg}</p>;
  }
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket</th>
            <th className="text-left px-3 py-2 font-semibold">Tên</th>
            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Status</th>
            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.key} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2">
                <a
                  href={`${JIRA_BASE}/browse/${issue.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                >
                  {issue.key}
                </a>
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{issue.assigneeName || <span className="text-red-500">Chưa gán</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SprintTicketHealthPanel({ result, loading }: { result: SprintHealthResult | null; loading: boolean }) {
  if (loading) return <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>;
  if (!result) return <div className="py-6 text-center text-gray-400 text-sm">Không có dữ liệu</div>;
  return (
    <div className="pt-4 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Draft ({result.draftStories.length})
        </p>
        <HealthIssueTable issues={result.draftStories} emptyMsg="✅ Không có story Draft" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Chưa gán assignee ({result.unassignedStories.length})
        </p>
        <HealthIssueTable issues={result.unassignedStories} emptyMsg="✅ Tất cả story đã có assignee" />
      </div>
    </div>
  );
}

// ─── Sprint close check (đóng sprint cũ) ─────────────────────────────────────

interface UnclosedIssue {
  key: string;
  summary: string;
  typeName: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
  reporterName: string;
  sprintNames: string[];
}

interface OverdueSprint {
  name: string;
  endDate: string | null;
  daysOverdue: number;
}

interface SprintCloseResult {
  overdueSprints: OverdueSprint[];
  issues: UnclosedIssue[];
}

const UNCLOSED_JQL =
  'project IN (PL, PLO) AND Sprint IN openSprints() AND statusCategory != Done ORDER BY reporter ASC';

// Thứ tự hiển thị theo type; type lạ rơi xuống cuối và sort theo tên.
const TYPE_RANK: Record<string, number> = {
  epic: 0,
  story: 1,
  task: 2,
  bug: 3,
  'sub-task': 4,
  subtask: 4,
};

const typeRank = (typeName: string) => TYPE_RANK[(typeName || '').toLowerCase()] ?? 90;

const diffDays = (fromDate: string, toDate: string) =>
  Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000);

async function loadSprintCloseCheck(): Promise<SprintCloseResult> {
  // Jira /search/jql trả tối đa 100 issue/trang -> phải cuốn theo nextPageToken.
  const issues: any[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < 6; page++) {
    const res = await jiraAPI.searchIssues({
      jql: UNCLOSED_JQL,
      maxResults: 100,
      fields: ['summary', 'status', 'assignee', 'reporter', 'issuetype'],
      nextPageToken,
    });
    const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
    issues.push(...(payload?.issues || []));
    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
  }
  const today = getTodayUtc7();

  // Sprint "cũ chưa đóng" = sprint còn mở (active) nhưng đã qua end date.
  const overdueMap = new Map<string, OverdueSprint>();
  for (const issue of issues) {
    for (const sprint of (issue.fields?.normalizedSprints || []) as NormalizedSprintDetail[]) {
      if ((sprint.state || '').toLowerCase() === 'closed') continue;
      const end = toUtc7Date(sprint.endDate);
      if (!end || compareDateStrings(end, today) >= 0) continue;
      overdueMap.set(sprint.name, { name: sprint.name, endDate: end, daysOverdue: diffDays(end, today) });
    }
  }

  const overdueSprints = Array.from(overdueMap.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
  if (overdueSprints.length === 0) return { overdueSprints, issues: [] };

  const overdueNames = new Set(overdueSprints.map((s) => s.name));
  const mapped: UnclosedIssue[] = issues
    .map((issue: any) => ({
      key: issue.key as string,
      summary: issue.fields?.summary || '',
      typeName: issue.fields?.issuetype?.name || '',
      statusName: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
      statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
      assigneeName: issue.fields?.normalizedAssigneeName || '',
      reporterName: issue.fields?.reporter?.displayName || '',
      sprintNames: ((issue.fields?.normalizedSprints || []) as NormalizedSprintDetail[]).map((sp) => sp.name),
    }))
    .filter((issue) => issue.sprintNames.some((name) => overdueNames.has(name)));

  return { overdueSprints, issues: mapped };
}

// ─── SprintClosePanel ────────────────────────────────────────────────────────

type ReporterRole = 'po' | 'dev' | 'qa' | 'other';

const ROLE_RANK: Record<ReporterRole, number> = { po: 0, dev: 1, qa: 2, other: 3 };
const ROLE_LABEL: Record<ReporterRole, string> = { po: 'PO', dev: 'DEV', qa: 'QA', other: 'KHÁC' };
const ROLE_CHIP: Record<ReporterRole, string> = {
  po: 'bg-purple-50 text-purple-700 border-purple-200',
  dev: 'bg-blue-50 text-blue-700 border-blue-200',
  qa: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-gray-100 text-gray-500 border-gray-200',
};

/** Role lấy từ chức danh trong ngoặc của display name Jira. QA phải check trước dev
 *  vì "QA Manual Engineer" cũng chứa "engineer". */
function reporterRole(reporterName: string): ReporterRole {
  const title = (reporterName.match(/\(([^)]*)\)/)?.[1] || reporterName).toLowerCase();
  if (/product manager|product owner|\bpo\b|\btpm\b|business analyst|\bba\b/.test(title)) return 'po';
  if (/\bqa\b|quality|tester|\bsdet\b/.test(title)) return 'qa';
  if (/engineer|developer|\bdev\b|\bsre\b|devops|architect|\bem\b/.test(title)) return 'dev';
  return 'other';
}

interface ReporterGroup {
  reporter: string;
  role: ReporterRole;
  issues: UnclosedIssue[];
}

function groupUnclosedByReporter(issues: UnclosedIssue[]): ReporterGroup[] {
  const groups = new Map<string, UnclosedIssue[]>();
  for (const issue of issues) {
    const reporter = issue.reporterName || 'Không có reporter';
    const bucket = groups.get(reporter);
    if (bucket) bucket.push(issue);
    else groups.set(reporter, [issue]);
  }
  return Array.from(groups.entries())
    .map(([reporter, list]) => ({
      reporter,
      role: reporterRole(reporter),
      // trong mỗi reporter: sort theo type trước, rồi tới assignee
      issues: [...list].sort(
        (a, b) =>
          typeRank(a.typeName) - typeRank(b.typeName) ||
          a.typeName.localeCompare(b.typeName) ||
          (a.assigneeName || 'zzz').localeCompare(b.assigneeName || 'zzz') ||
          a.key.localeCompare(b.key)
      ),
    }))
    // PO -> DEV -> QA -> khác; trong cùng role thì nhiều item lên trước
    .sort(
      (a, b) =>
        ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
        b.issues.length - a.issues.length ||
        a.reporter.localeCompare(b.reporter)
    );
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text thuần — fallback khi chỗ dán không nhận HTML. */
function buildReporterText(group: ReporterGroup): string {
  const lines = group.issues.map(
    (issue, index) => `${index + 1}. ${issue.key} - ${issue.statusName || 'No status'} - ${issue.summary}`
  );
  return [`[${ROLE_LABEL[group.role]}] ${group.reporter} (${group.issues.length} item chưa đóng)`, ...lines].join('\n');
}

/** Bản HTML: tên PIC in đậm, ticket id là link Jira, list đánh số. */
function buildReporterHtml(group: ReporterGroup): string {
  const items = group.issues
    .map(
      (issue) =>
        `<li><a href="${JIRA_BASE}/browse/${issue.key}">${issue.key}</a> - ${escapeHtml(
          issue.statusName || 'No status'
        )} - ${escapeHtml(issue.summary)}</li>`
    )
    .join('');
  const heading = `[${ROLE_LABEL[group.role]}] ${group.reporter} (${group.issues.length} item chưa đóng)`;
  return `<p><strong>${escapeHtml(heading)}</strong></p><ol>${items}</ol>`;
}

const buildFullText = (groups: ReporterGroup[]) => groups.map(buildReporterText).join('\n\n');
const buildFullHtml = (groups: ReporterGroup[]) => groups.map(buildReporterHtml).join('');

function CopyReportButton({ text, html, label = 'Copy' }: { text: string; html: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        // ghi cả 2 flavor: chỗ nhận rich text (Slack, Confluence, Gmail) lấy HTML,
        // chỗ chỉ nhận plain text lấy bản text
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        // fallback: select node contentEditable rồi execCommand để giữ format
        const holder = document.createElement('div');
        holder.contentEditable = 'true';
        holder.innerHTML = html;
        holder.style.position = 'fixed';
        holder.style.opacity = '0';
        document.body.appendChild(holder);
        const range = document.createRange();
        range.selectNodeContents(holder);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
        selection?.removeAllRanges();
        document.body.removeChild(holder);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy thất bại');
    }
  }, [text, html]);

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy danh sách ticket (giữ link + đánh số)"
      className={`rounded border px-2 py-0.5 text-[11px] font-medium transition ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
      }`}
    >
      {copied ? '✓ Đã copy' : `⧉ ${label}`}
    </button>
  );
}

function SprintClosePanel({
  result,
  loading,
  onReload,
}: {
  result: SprintCloseResult | null;
  loading: boolean;
  onReload: () => void;
}) {
  const groups = useMemo(() => groupUnclosedByReporter(result?.issues || []), [result]);

  if (loading) return <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>;
  if (!result) return <div className="py-6 text-center text-gray-400 text-sm">Không có dữ liệu</div>;

  if (result.overdueSprints.length === 0) {
    return (
      <p className="pt-4 text-sm font-medium text-green-600">✅ Không có sprint quá hạn nào đang mở</p>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          {result.overdueSprints.map((sprint) => (
            <p key={sprint.name} className="text-sm text-red-600">
              ❌ <span className="font-semibold">{sprint.name}</span> hết hạn {sprint.endDate} — quá{' '}
              {sprint.daysOverdue} ngày, chưa đóng
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>

      {result.issues.length === 0 ? (
        <p className="text-sm font-medium text-emerald-600">
          ✅ Không còn item nào chưa xong — đóng sprint được rồi
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">
              {result.issues.length} item chưa đóng · {groups.length} reporter
            </p>
            <CopyReportButton text={buildFullText(groups)} html={buildFullHtml(groups)} label="Copy tất cả" />
          </div>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.reporter}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.reporter} ({group.issues.length})
                  </p>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${ROLE_CHIP[group.role]}`}>
                    {ROLE_LABEL[group.role]}
                  </span>
                  <CopyReportButton text={buildReporterText(group)} html={buildReporterHtml(group)} />
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
                        <th className="w-[110px] px-3 py-2 text-left font-semibold">Ticket</th>
                        <th className="w-[100px] px-3 py-2 text-left font-semibold">Type</th>
                        <th className="px-3 py-2 text-left font-semibold">Tên</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Status</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.issues.map((issue) => (
                        <tr key={issue.key} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <a
                              href={`${JIRA_BASE}/browse/${issue.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                            >
                              {issue.key}
                            </a>
                          </td>
                          <td className="px-3 py-2">
                            <JiraTypeTag name={issue.typeName} />
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Lệch fix version cha - con ──────────────────────────────────────────────

interface VersionMismatchIssue {
  key: string;
  summary: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
  ownVersions: string;
  parentKey: string;
  parentSummary: string;
  parentVersions: string;
}

// Giống rule ở /jira/backlog: chỉ soát subtask, bỏ ticket Done / Defect / đã gắn label bỏ qua.
const VERSION_MISMATCH_JQL = 'project IN (PL, PLO) AND sprint IN openSprints() ORDER BY key ASC';
const IGNORE_MISMATCH_LABEL = 'ignore-fix-mismatch';
const MISMATCH_DONE_RE =
  /(done|passed|released|ready4release|closed|resolved|converted|will not|reject|invalid|cancel|bot to delete)/;

const versionSetKey = (names: string[]) => [...names].sort().join(', ');

async function searchAllPages(jql: string, fields: string[], maxPages = 8): Promise<any[]> {
  const out: any[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await jiraAPI.searchIssues({ jql, maxResults: 100, fields, nextPageToken });
    const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
    out.push(...(payload?.issues || []));
    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
  }
  return out;
}

async function loadVersionMismatch(): Promise<VersionMismatchIssue[]> {
  const fields = ['summary', 'status', 'assignee', 'issuetype', 'fixVersions', 'parent', 'labels'];
  const byKey = new Map<string, any>();
  for (const issue of await searchAllPages(VERSION_MISMATCH_JQL, fields)) byKey.set(issue.key, issue);

  // subtask thường không dính JQL sprint -> lấy thêm con/cháu qua field parent
  let frontier = Array.from(byKey.keys());
  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (let i = 0; i < frontier.length; i += 50) {
      const batch = frontier.slice(i, i + 50);
      const kids = await searchAllPages(
        `project IN (PL, PLO) AND parent IN (${batch.join(',')})`,
        fields,
        4
      );
      for (const kid of kids) {
        if (byKey.has(kid.key)) continue;
        byKey.set(kid.key, kid);
        next.push(kid.key);
      }
    }
    frontier = next;
  }

  const isDone = (issue: any) => MISMATCH_DONE_RE.test((issue?.fields?.normalizedStatusName || '').toLowerCase());
  const isDefect = (issue: any) => (issue?.fields?.issuetype?.name || '').toLowerCase().includes('defect');
  const isIgnored = (issue: any) => (issue?.fields?.labels || []).includes(IGNORE_MISMATCH_LABEL);

  const result: VersionMismatchIssue[] = [];
  for (const issue of byKey.values()) {
    if (!issue.fields?.issuetype?.subtask) continue;
    if (isDone(issue) || isDefect(issue) || isIgnored(issue)) continue;
    const parentKey = issue.fields?.parent?.key;
    const parent = parentKey ? byKey.get(parentKey) : undefined;
    if (!parent) continue;
    if (isDone(parent) || isDefect(parent) || isIgnored(parent)) continue;

    const own = versionSetKey(issue.fields?.normalizedFixVersionNames || []);
    const parentVersions = versionSetKey(parent.fields?.normalizedFixVersionNames || []);
    if (own === parentVersions) continue;

    result.push({
      key: issue.key,
      summary: issue.fields?.summary || '',
      statusName: issue.fields?.normalizedStatusName || '',
      statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
      assigneeName: issue.fields?.normalizedAssigneeName || '',
      ownVersions: own,
      parentKey,
      parentSummary: parent.fields?.summary || '',
      parentVersions,
    });
  }

  return result.sort(
    (a, b) => a.parentVersions.localeCompare(b.parentVersions) || a.key.localeCompare(b.key)
  );
}

function VersionMismatchPanel({
  issues,
  loading,
  onReload,
}: {
  issues: VersionMismatchIssue[];
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) return <div className="py-6 text-center text-sm text-gray-500">Đang tải...</div>;
  if (issues.length === 0) {
    return <p className="pt-4 text-sm font-medium text-green-600">✅ Subtask và ticket cha khớp fix version</p>;
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">{issues.length} subtask lệch fix version so với cha</p>
        <div className="flex items-center gap-2">
          <Link
            href="/jira/backlog?mismatch=1&matched=1"
            className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Mở backlog để sửa →
          </Link>
          <button
            type="button"
            onClick={onReload}
            className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Tải lại
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="w-[110px] px-3 py-2 text-left font-semibold">Subtask</th>
              <th className="px-3 py-2 text-left font-semibold">Tên</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Fix version con</th>
              <th className="w-[110px] px-3 py-2 text-left font-semibold">Cha</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Fix version cha</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.key} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                <td className="px-3 py-2">
                  <a
                    href={`${JIRA_BASE}/browse/${issue.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {issue.key}
                  </a>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                    {issue.ownVersions || '⚠ trống'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`${JIRA_BASE}/browse/${issue.parentKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={issue.parentSummary}
                    className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {issue.parentKey}
                  </a>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                    {issue.parentVersions || 'không có'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fix version migration (item còn dính fix version cũ) ────────────────────

interface OldFixVersionIssue {
  key: string;
  projectKey: string;
  summary: string;
  typeName: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
  oldVersionNames: string[];
}

interface FixVersionMigrationResult {
  items: OldFixVersionIssue[];
  versionsByProject: Record<string, JiraVersion[]>;
}

const OLD_FIX_VER_JQL =
  'project IN (PL, PLO) AND statusCategory != Done AND fixVersion IS NOT EMPTY ORDER BY key ASC';

const MIGRATION_PROJECTS = ['PL', 'PLO'];

/** Fix version "cũ" = đã released, hoặc release date đã qua mà ticket vẫn chưa Done. */
function isOldFixVersion(version: NormalizedFixVersionDetail, today: string): boolean {
  if (version.archived) return true;
  if (version.released) return true;
  const release = toUtc7Date(version.releaseDate);
  return Boolean(release && compareDateStrings(release, today) < 0);
}

async function loadFixVersionMigration(): Promise<FixVersionMigrationResult> {
  const rawIssues: any[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < 6; page++) {
    const res = await jiraAPI.searchIssues({
      jql: OLD_FIX_VER_JQL,
      maxResults: 100,
      fields: ['summary', 'status', 'assignee', 'issuetype', 'fixVersions'],
      nextPageToken,
    });
    const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
    rawIssues.push(...(payload?.issues || []));
    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
  }

  const today = getTodayUtc7();
  const items: OldFixVersionIssue[] = [];
  for (const issue of rawIssues) {
    const versions = (issue.fields?.normalizedFixVersions || []) as NormalizedFixVersionDetail[];
    const oldVersionNames = versions.filter((v) => isOldFixVersion(v, today)).map((v) => v.name);
    if (oldVersionNames.length === 0) continue;
    items.push({
      key: issue.key,
      projectKey: (issue.key as string).split('-')[0],
      summary: issue.fields?.summary || '',
      typeName: issue.fields?.issuetype?.name || '',
      statusName: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
      statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
      assigneeName: issue.fields?.normalizedAssigneeName || '',
      oldVersionNames,
    });
  }

  const versionLists = await Promise.all(
    MIGRATION_PROJECTS.map(async (projectKey) => {
      try {
        const res = await jiraAPI.getProjectVersions(projectKey);
        const versions: JiraVersion[] = (res.data.data as JiraVersion[]) || [];
        const usable = versions
          .filter((v) => !v.released && !v.archived)
          .sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'));
        return [projectKey, usable] as const;
      } catch {
        return [projectKey, [] as JiraVersion[]] as const;
      }
    })
  );

  return { items, versionsByProject: Object.fromEntries(versionLists) };
}

// ─── FixVersionMigrationPanel ────────────────────────────────────────────────

function ProjectMigrationBlock({
  projectKey,
  items,
  versions,
  onDone,
}: {
  projectKey: string;
  items: OldFixVersionIssue[];
  versions: JiraVersion[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetVersionId, setTargetVersionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allChecked = items.length > 0 && selected.size === items.length;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map((i) => i.key)));

  const handleMigrate = async () => {
    const target = versions.find((v) => v.id === targetVersionId);
    if (!target || selected.size === 0) return;
    const keys = Array.from(selected);
    const confirmed = window.confirm(
      `Đổi fix version sang "${target.name}" cho ${keys.length} ticket?\n\n${keys.join(', ')}\n\n` +
        'Fix version hiện tại của ticket sẽ bị thay hoàn toàn.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    const results: Array<{ key: string; ok: boolean; error?: string }> = [];
    for (const key of keys) {
      try {
        await jiraAPI.setIssueFixVersions(key, [target.id]);
        results.push({ key, ok: true });
      } catch (err: any) {
        results.push({ key, ok: false, error: err?.response?.data?.error || err.message });
      }
    }
    setSubmitting(false);

    const okCount = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast.success(`Đã đổi fix version cho ${okCount} ticket sang ${target.name}`);
    } else {
      toast.error(
        `${okCount} OK, ${failed.length} lỗi:\n${failed.map((r) => `${r.key}: ${r.error}`).join('\n')}`
      );
    }
    setSelected(new Set());
    onDone();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {projectKey} ({items.length} item)
        </span>
        <select
          value={targetVersionId}
          onChange={(e) => setTargetVersionId(e.target.value)}
          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700"
        >
          <option value="">— Chọn fix version mới —</option>
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.name}
              {version.releaseDate ? ` (release ${version.releaseDate})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!targetVersionId || selected.size === 0 || submitting}
          onClick={handleMigrate}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {submitting ? 'Đang đổi...' : `Đổi fix version (${selected.size})`}
        </button>
        {versions.length === 0 && (
          <span className="text-xs text-red-500">Không có version nào chưa release</span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="w-[36px] px-3 py-2 text-left">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="cursor-pointer" />
              </th>
              <th className="w-[110px] px-3 py-2 text-left font-semibold">Ticket</th>
              <th className="px-3 py-2 text-left font-semibold">Tên</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Fix version cũ</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {items.map((issue) => (
              <tr key={issue.key} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(issue.key)}
                    onChange={() => toggle(issue.key)}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`${JIRA_BASE}/browse/${issue.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {issue.key}
                  </a>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <JiraTypeTag name={issue.typeName} />
                    <span>{issue.summary || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {issue.oldVersionNames.map((name) => (
                    <span
                      key={name}
                      className="mr-1 inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"
                    >
                      {name}
                    </span>
                  ))}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FixVersionMigrationPanel({
  result,
  loading,
  onReload,
}: {
  result: FixVersionMigrationResult | null;
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) return <div className="py-6 text-center text-sm text-gray-500">Đang tải...</div>;
  if (!result) return <div className="py-6 text-center text-sm text-gray-400">Không có dữ liệu</div>;
  if (result.items.length === 0) {
    return (
      <p className="pt-4 text-sm font-medium text-green-600">
        ✅ Không có item nào còn dính fix version cũ
      </p>
    );
  }

  const byProject = MIGRATION_PROJECTS.map((projectKey) => ({
    projectKey,
    items: result.items.filter((item) => item.projectKey === projectKey),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">
          {result.items.length} item chưa Done còn gắn fix version đã release / quá hạn
        </p>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>
      {byProject.map((group) => (
        <ProjectMigrationBlock
          key={group.projectKey}
          projectKey={group.projectKey}
          items={group.items}
          versions={result.versionsByProject[group.projectKey] || []}
          onDone={onReload}
        />
      ))}
    </div>
  );
}

// ─── Fix Version review types + loader ───────────────────────────────────────

interface FixVersionIssue {
  key: string;
  summary: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
}

interface FixVersionReviewResult {
  poReviewIssues: FixVersionIssue[];
  notDoneIssues: FixVersionIssue[];
}

const PO_REVIEW_JQL =
  'project in (PL, "Product: DOP", "Platform: LOS") AND type in (Epic, Task, Story) AND fixversion = earliestUnreleasedVersion() AND status in ("PO/TM Review", "Will Not Do", Done, Ready4Release, Released, "Request Bot To Delete") AND status = "PO/TM Review" ORDER BY resolution DESC, status ASC';

const FIX_VER_NOT_DONE_JQL =
  'project IN (PL, "Product: DOP", "Platform: LOS") AND type IN (Epic, Task, Story) AND fixversion = earliestUnreleasedVersion() AND status NOT IN ("PO/TM Review", "Will Not Do", Done, Ready4Release, Released, "Request Bot To Delete") ORDER BY resolution DESC, status ASC';

function mapFixVerIssue(issue: any): FixVersionIssue {
  return {
    key: issue.key as string,
    summary: issue.fields?.summary || '',
    statusName: issue.fields?.normalizedStatusName || '',
    assigneeName: issue.fields?.normalizedAssigneeName || '',
  };
}

async function loadFixVersionReview(): Promise<FixVersionReviewResult> {
  const [poRes, ndRes] = await Promise.all([
    jiraAPI.searchIssues({ jql: PO_REVIEW_JQL, maxResults: 200, fields: ['summary', 'status', 'assignee'] }),
    jiraAPI.searchIssues({ jql: FIX_VER_NOT_DONE_JQL, maxResults: 200, fields: ['summary', 'status', 'assignee'] }),
  ]);
  const poIssues: any[] = ((poRes.data.data as { issues?: any[] })?.issues) || [];
  const ndIssues: any[] = ((ndRes.data.data as { issues?: any[] })?.issues) || [];
  return {
    poReviewIssues: poIssues.map(mapFixVerIssue),
    notDoneIssues: ndIssues.map(mapFixVerIssue),
  };
}

// ─── PO Review Table (with bulk transition) ──────────────────────────────────

function PoReviewTable({
  issues,
  onTransitioned,
}: {
  issues: FixVersionIssue[];
  onTransitioned: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const allChecked = issues.length > 0 && selected.size === issues.length;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(issues.map((i) => i.key)));
  };

  const handleBulkTransition = async () => {
    if (selected.size === 0) return;
    const keys = Array.from(selected);
    const confirmed = window.confirm(
      `Đổi status sang Ready4Release cho ${keys.length} ticket?\n\n${keys.join(', ')}\n\nThao tác này gọi Jira trực tiếp.`
    );
    if (!confirmed) return;
    setSubmitting(true);
    const results: { key: string; ok: boolean; error?: string }[] = [];
    for (const key of keys) {
      try {
        await jiraAPI.transitionIssue(key, 'Ready4Release');
        results.push({ key, ok: true });
      } catch (err: any) {
        results.push({ key, ok: false, error: err?.response?.data?.error || err.message });
      }
    }
    setSubmitting(false);
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    if (failCount === 0) {
      toast.success(`Đã chuyển ${okCount} ticket sang Ready4Release`);
    } else {
      const failKeys = results.filter((r) => !r.ok).map((r) => `${r.key}: ${r.error}`).join('\n');
      toast.error(`${okCount} OK, ${failCount} lỗi:\n${failKeys}`);
    }
    setSelected(new Set());
    onTransitioned();
  };

  if (issues.length === 0) {
    return <p className="text-sm text-green-600 font-medium">✅ Không có ticket PO Review</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{issues.length} ticket · chọn để chuyển Ready4Release</p>
        <button
          onClick={handleBulkTransition}
          disabled={submitting || selected.size === 0}
          className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {submitting ? 'Đang chuyển...' : `Chuyển ${selected.size} ticket → Ready4Release`}
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 w-[40px]">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket</th>
              <th className="text-left px-3 py-2 font-semibold">Tên</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.key} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(issue.key)}
                    onChange={() => toggle(issue.key)}
                  />
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`${JIRA_BASE}/browse/${issue.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                  >
                    {issue.key}
                  </a>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FixVersionNotDoneTable({ issues }: { issues: FixVersionIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-green-600 font-medium">✅ Tất cả ticket Fix Version đã Done</p>;
  }
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket</th>
            <th className="text-left px-3 py-2 font-semibold">Tên</th>
            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Status</th>
            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.key} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2">
                <a
                  href={`${JIRA_BASE}/browse/${issue.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                >
                  {issue.key}
                </a>
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixVersionReviewPanel({
  result,
  loading,
  onReload,
}: {
  result: FixVersionReviewResult | null;
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) return <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>;
  if (!result) return <div className="py-6 text-center text-gray-400 text-sm">Không có dữ liệu</div>;
  return (
    <div className="pt-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Check fix ver not done ({result.notDoneIssues.length})
        </p>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>
      <FixVersionNotDoneTable issues={result.notDoneIssues} />
    </div>
  );
}

/** Bảng PO review tách riêng sang mục "Công việc chung" — không gắn với mốc ngày nào. */
function PoReviewCard({
  result,
  loading,
  onReload,
}: {
  result: FixVersionReviewResult | null;
  loading: boolean;
  onReload: () => void;
}) {
  const issues = result?.poReviewIssues || [];

  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Ticket chờ PO review</h3>
          {!loading && (
            <span className="text-xs text-gray-400">
              {issues.length === 0 ? 'không có' : `${issues.length} ticket`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>

      <p className="mb-3 text-[11px] text-gray-400">
        Fix version hiện tại, status PO/TM Review — tick chọn rồi chuyển hàng loạt sang Ready4Release
      </p>

      {loading ? (
        <div className="h-16 animate-pulse rounded bg-gray-50" />
      ) : (
        <PoReviewTable issues={issues} onTransitioned={onReload} />
      )}
    </div>
  );
}

/** Thứ tự team trong danh sách UAT: Lend → DOP → Pre → LOS → còn lại. */
const UAT_TEAM_ORDER = ['lend', 'dop', 'pre', 'los'];
function teamRank(teams: string[]): number {
  const ranks = (teams || []).map((team) => {
    const index = UAT_TEAM_ORDER.indexOf(team.trim().toLowerCase());
    return index === -1 ? UAT_TEAM_ORDER.length : index;
  });
  return ranks.length ? Math.min(...ranks) : UAT_TEAM_ORDER.length + 1;
}

// ─── Link sang Sprint check để gắn label UAT ─────────────────────────────────

function UatLabelLink({ pageId, pageTitle }: { pageId: string; pageTitle?: string }) {
  return (
    <Link
      href={pageTitle ? sprintPagePath(pageTitle) : pageId ? `/sprints/management/${pageId}` : '/sprints/management'}
      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
    >
      Gắn label UAT →
    </Link>
  );
}

// ─── Mô tả filter của từng task ──────────────────────────────────────────────

function TaskFilterNote({ jql, notes }: { jql?: string; notes?: string[] }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Đang lọc</p>
      {jql && (
        <code className="block whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-600">
          {jql}
        </code>
      )}
      {notes && notes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {notes.map((note) => (
            <li key={note} className="text-[11px] text-slate-500">
              • {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

type TaskStatus = 'idle' | 'loading' | 'ok' | 'error';

interface TaskItemProps {
  title: string;
  status: TaskStatus;
  defaultOpen?: boolean;
  filter?: React.ReactNode;
  children: React.ReactNode;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'idle') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        Chưa kiểm tra
      </span>
    );
  }
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        Đang tải
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        ✅ Hoàn thành
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
      ❌ Cần xử lý
    </span>
  );
}

function TaskItem({ title, status, defaultOpen = false, filter, children }: TaskItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [everOpened, setEverOpened] = useState(defaultOpen);

  const toggle = useCallback(() => {
    // vừa bôi đen tiêu đề thì click thả chuột không được coi là mở/đóng
    if ((window.getSelection()?.toString() || '').trim()) return;
    setOpen((prev) => {
      if (!prev) setEverOpened(true);
      return !prev;
    });
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-400 select-none">{open ? '▼' : '▶'}</span>
        <StatusBadge status={status} />
        <span className="select-text text-base font-semibold text-gray-900">{title}</span>
      </div>

      {open && everOpened && (
        <div className="border-t border-slate-100 px-5 pb-5">
          {children}
          {filter}
        </div>
      )}
    </div>
  );
}

// ─── Sprint day timeline ──────────────────────────────────────────────────────

const TIMELINE_DAYS = 14;
const WORKING_DAYS_PER_SPRINT = 10;

interface DayTask {
  day: number;
  title: string;
  status: TaskStatus;
  content: React.ReactNode;
  /** mô tả bộ lọc đang dùng, hiện ngay trong task */
  filter?: React.ReactNode;
}

type DayNodeState = 'pass' | 'fail' | 'loading' | 'empty' | 'future' | 'idle';

interface DayMark {
  /** ngày thứ N của sprint tính theo lịch (mốc cuối tuần bị bỏ khỏi timeline) */
  day: number;
  date: string | null;
  weekdayLabel: string;
  state: DayNodeState;
  /** state lấy từ cache lần kiểm tra trước, chưa chạy lại trong phiên này */
  fromCache: boolean;
  tasks: DayTask[];
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const addDays = (dateOnly: string, days: number) =>
  new Date(new Date(`${dateOnly}T00:00:00Z`).getTime() + days * 86_400_000);

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

/** Sprint đếm theo ngày làm việc (T2–T6): 14 ngày lịch -> 10 mốc, đánh số liền mạch 1..10. */
type CachedDayStatus = Record<number, 'pass' | 'fail'>;

function buildDayMarks(
  tasks: DayTask[],
  totalCalendarDays: number,
  currentDay: number | null,
  startDate: string | null,
  loadedDays: Set<number>,
  loadingDays: Set<number>,
  cachedStatus: CachedDayStatus
): DayMark[] {
  const skeleton: Array<{ day: number; date: string | null; weekdayLabel: string }> = [];
  if (startDate) {
    for (let calendarDay = 1; calendarDay <= totalCalendarDays; calendarDay++) {
      const date = addDays(startDate, calendarDay - 1);
      if (isWeekend(date)) continue;
      skeleton.push({
        day: skeleton.length + 1,
        date: date.toISOString().slice(0, 10),
        weekdayLabel: WEEKDAY_LABELS[date.getUTCDay()],
      });
    }
  } else {
    // chưa biết ngày bắt đầu sprint -> vẫn dựng 10 mốc, không có nhãn thứ
    for (let day = 1; day <= WORKING_DAYS_PER_SPRINT; day++) {
      skeleton.push({ day, date: null, weekdayLabel: '' });
    }
  }

  const lastDay = skeleton[skeleton.length - 1]?.day ?? WORKING_DAYS_PER_SPRINT;

  return skeleton.map((slot) => {
    const dayTasks = tasks.filter((task) => Math.min(task.day, lastDay) === slot.day);
    let state: DayNodeState;
    let fromCache = false;
    if (dayTasks.length === 0) state = 'empty';
    else if (loadingDays.has(slot.day)) state = 'loading';
    else if (loadedDays.has(slot.day)) {
      state = dayTasks.some((task) => task.status === 'error') ? 'fail' : 'pass';
    } else if (cachedStatus[slot.day]) {
      state = cachedStatus[slot.day];
      fromCache = true;
    } else if (currentDay !== null && slot.day > currentDay) state = 'future';
    else state = 'idle';
    return { ...slot, state, fromCache, tasks: dayTasks };
  });
}

/** Hôm nay là ngày làm việc thứ mấy của sprint; rơi vào T7/CN -> lấy ngày làm việc kế tiếp. */
function currentWorkingDay(startDate: string | null, totalCalendarDays: number): number | null {
  if (!startDate) return null;
  const today = getTodayUtc7();
  let workingDay = 0;
  for (let calendarDay = 1; calendarDay <= totalCalendarDays; calendarDay++) {
    const date = addDays(startDate, calendarDay - 1);
    if (isWeekend(date)) continue;
    workingDay += 1;
    if (compareDateStrings(date.toISOString().slice(0, 10), today) >= 0) return workingDay;
  }
  return workingDay || null;
}

const NODE_STYLE: Record<DayNodeState, { cls: string; glyph: string; hint: string }> = {
  pass: { cls: 'bg-emerald-500 border-emerald-500 text-white', glyph: '✓', hint: 'Đã xong' },
  fail: { cls: 'bg-red-500 border-red-500 text-white', glyph: '✕', hint: 'Cần xử lý' },
  loading: { cls: 'bg-white border-slate-300 text-slate-400 animate-pulse', glyph: '•', hint: 'Đang tải' },
  future: { cls: 'bg-slate-100 border-slate-200 text-slate-400', glyph: '', hint: 'Chưa tới' },
  empty: { cls: 'bg-white border-dashed border-slate-200 text-slate-300', glyph: '', hint: 'Không có việc' },
  idle: { cls: 'bg-white border-slate-300 text-slate-400', glyph: '?', hint: 'Chưa kiểm tra' },
};

const fmtShortDate = (value: string | null) => {
  if (!value) return '?';
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
};

function SprintTimeline({
  marks,
  currentDay,
  overdueDays,
  selectedDay,
  sprintLabel,
  startDate,
  endDate,
  onReloadAll,
  reloadingAll,
  onSelect,
}: {
  marks: DayMark[];
  currentDay: number | null;
  overdueDays: number;
  selectedDay: number | null;
  sprintLabel: string;
  startDate: string | null;
  endDate: string | null;
  onReloadAll: () => void;
  reloadingAll: boolean;
  onSelect: (day: number) => void;
}) {
  const totalDays = marks.length;
  const progressPct =
    currentDay && totalDays > 1 ? (Math.min(currentDay, totalDays) - 1) / (totalDays - 1) * 100 : 0;

  return (
    <div className="border-t border-gray-100 px-6 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            Timeline {sprintLabel} ({totalDays} ngày làm việc từ {fmtShortDate(startDate)} đến{' '}
            {fmtShortDate(endDate)})
          </h2>
          {overdueDays > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              Sprint quá hạn {overdueDays} ngày — chưa đóng sprint
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <button
            type="button"
            onClick={onReloadAll}
            disabled={reloadingAll}
            className="rounded border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            {reloadingAll ? 'Đang kiểm tra...' : 'Kiểm tra tất cả ngày'}
          </button>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Đã xong</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Cần xử lý</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Chưa tới / không có việc</span>
        </div>
      </div>

      {/* px-6 + py-3: chừa chỗ cho vòng ping và nhãn "hôm nay" ở mốc đầu/cuối khỏi bị cắt */}
      <div className="overflow-x-auto px-1 py-3">
        <div className="relative min-w-[680px] px-6">
          <div className="absolute left-[33px] right-[33px] top-[9px] h-0.5 bg-slate-200" />
          <div
            className="absolute left-[33px] top-[9px] h-0.5 bg-blue-400 transition-all"
            style={{ width: `calc((100% - 66px) * ${(progressPct / 100).toFixed(4)})` }}
          />
          <div className="relative flex items-start justify-between">
            {marks.map((mark) => {
              const style = NODE_STYLE[mark.state];
              const isToday = currentDay === mark.day;
              const isSelected = selectedDay === mark.day;
              // mốc không có việc vẫn bấm được -> panel báo "ngày này không có việc"
              const clickable = true;
              return (
                <div key={mark.day} className="flex flex-col items-center gap-1.5">
                  <span className="relative flex h-[18px] w-[18px] items-center justify-center">
                    {isToday && (
                      <>
                        {/* 2 lớp sóng + nhịp nền cho mốc hôm nay nổi hẳn lên */}
                        <span className="absolute -inset-[6px] animate-ping rounded-full bg-blue-500/60" />
                        <span className="absolute -inset-[3px] animate-pulse rounded-full bg-blue-400/50" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(mark.day)}
                      title={`Ngày ${mark.day}${mark.weekdayLabel ? ` · ${mark.weekdayLabel}` : ''}${
                        mark.date ? ` ${mark.date}` : ''
                      } — ${style.hint}${mark.fromCache ? ' (kết quả lần kiểm tra trước)' : ''}${
                        mark.tasks.length ? ` (${mark.tasks.length} việc)` : ''
                      }`}
                      className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] font-bold leading-none transition
                        ${style.cls}
                        ${mark.fromCache ? 'opacity-60' : ''}
                        ${clickable ? 'cursor-pointer hover:scale-125' : 'cursor-default'}
                        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                        ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    >
                      {style.glyph}
                    </button>
                  </span>
                  <span
                    className={`text-[11px] tabular-nums ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}
                  >
                    {mark.day}
                  </span>
                  {isToday ? (
                    <span className="whitespace-nowrap text-[10px] font-bold text-red-600">hôm nay</span>
                  ) : (
                    mark.weekdayLabel && <span className="text-[10px] text-gray-400">{mark.weekdayLabel}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subtask dev chưa xong (nguồn: backlog sprint hiện tại) ──────────────────

interface DevSubtask {
  key: string;
  summary: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
  assigneeEmail: string;
  ownSprint: number;
  parentSprint: number;
  parentIsTechDebt: boolean;
}

// Cùng bộ lọc với trang /jira/backlog: sprint đang mở, fix version của sprint này,
// type Backend-SubTask, ticket chưa Done.
const DEV_SUBTASK_JQL =
  'project IN (PL, PLO) AND sprint IN openSprints() AND fixVersion = earliestUnreleasedVersion() ' +
  'AND issuetype = "Backend-SubTask" AND statusCategory != Done ORDER BY assignee ASC';

/** Số sprint lớn nhất trong danh sách fix version (vd "Sprint 197 - Lending" -> 197). */
function maxFixVersionSprint(names: string[]): number {
  return names.reduce((max, name) => Math.max(max, extractSprintNumber(name)), 0);
}

async function loadDevSubtasks(): Promise<DevSubtask[]> {
  const raw: any[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < 6; page++) {
    const res = await jiraAPI.searchIssues({
      jql: DEV_SUBTASK_JQL,
      maxResults: 100,
      fields: ['summary', 'status', 'assignee', 'issuetype', 'parent', 'fixVersions'],
      nextPageToken,
    });
    const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
    raw.push(...(payload?.issues || []));
    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
  }

  // Cha đã dời sang fix version sau (sprint lớn hơn) -> subtask chưa tới hạn, bỏ khỏi danh sách.
  const parentKeys = Array.from(
    new Set(raw.map((issue: any) => issue.fields?.parent?.key).filter(Boolean) as string[])
  );
  const parentSprintByKey = new Map<string, number>();
  // Subtask nằm dưới TechDebt (ở bất kỳ cấp nào: cha, ông…) là việc kỹ thuật nội bộ,
  // không tính vào "xong hết subtask dev". Lần ngược lên tổ tiên tối đa 4 cấp.
  const typeOf = new Map<string, string>();
  const parentOf = new Map<string, string>();
  const normalizeType = (name: string) => (name || '').toLowerCase().replace(/[\s_-]/g, '');

  // cấp cha có sẵn trong kết quả search (field parent kèm issuetype) — khỏi query lại
  for (const issue of raw) {
    const parent = issue.fields?.parent;
    if (!parent?.key) continue;
    parentOf.set(issue.key, parent.key);
    if (parent.fields?.issuetype?.name) typeOf.set(parent.key, normalizeType(parent.fields.issuetype.name));
  }

  let frontier = parentKeys;
  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (let i = 0; i < frontier.length; i += 50) {
      const res = await jiraAPI.searchIssues({
        jql: `key IN (${frontier.slice(i, i + 50).join(',')})`,
        maxResults: 100,
        fields: ['fixVersions', 'issuetype', 'parent'],
      });
      for (const ancestor of ((res.data.data as { issues?: any[] })?.issues) || []) {
        typeOf.set(ancestor.key, normalizeType(ancestor.fields?.issuetype?.name || ''));
        if (depth === 0) {
          parentSprintByKey.set(ancestor.key, maxFixVersionSprint(ancestor.fields?.normalizedFixVersionNames || []));
        }
        const up = ancestor.fields?.parent?.key;
        if (up && !parentOf.has(ancestor.key)) {
          parentOf.set(ancestor.key, up);
          if (!typeOf.has(up)) next.push(up);
        }
      }
    }
    frontier = Array.from(new Set(next));
  }

  const underTechDebt = (key: string): boolean => {
    let current = parentOf.get(key);
    for (let guard = 0; current && guard < 6; guard++) {
      if (typeOf.get(current) === 'techdebt') return true;
      current = parentOf.get(current);
    }
    return false;
  };

  return raw
    .map((issue: any) => ({
      key: issue.key as string,
      summary: issue.fields?.summary || '',
      statusName: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
      statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
      assigneeName: issue.fields?.normalizedAssigneeName || '',
      assigneeEmail: issue.fields?.assignee?.emailAddress || '',
      ownSprint: maxFixVersionSprint(issue.fields?.normalizedFixVersionNames || []),
      parentSprint: parentSprintByKey.get(issue.fields?.parent?.key) ?? 0,
      parentIsTechDebt: underTechDebt(issue.key),
    }))
    .filter((item) => !item.parentIsTechDebt)
    .filter((item) => !(item.parentSprint > 0 && item.ownSprint > 0 && item.parentSprint > item.ownSprint))
    .sort(
      (a, b) =>
        (a.assigneeName || 'zzz').localeCompare(b.assigneeName || 'zzz') || a.key.localeCompare(b.key)
    );
}

interface DevAssigneeGroup {
  label: string;
  items: DevSubtask[];
}

/** Gom theo assignee; tiêu đề là handle @<phần trước @ của email> để gõ/tag trong Teams. */
function devAssigneeHandle(item: DevSubtask): string {
  const local = item.assigneeEmail.split('@')[0];
  if (local) return `@${local}`;
  return item.assigneeName || 'Chưa gán';
}

function groupDevSubtasksByAssignee(items: DevSubtask[]): DevAssigneeGroup[] {
  const groups = new Map<string, DevSubtask[]>();
  for (const item of items) {
    const label = devAssigneeHandle(item);
    const bucket = groups.get(label);
    if (bucket) bucket.push(item);
    else groups.set(label, [item]);
  }
  return Array.from(groups.entries())
    .map(([label, list]) => ({ label, items: list }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildDevSubtaskText(items: DevSubtask[]): string {
  return groupDevSubtasksByAssignee(items)
    .map((group) =>
      [
        group.label,
        ...group.items.map((item, index) => `${index + 1}. ${item.key} - ${item.summary}`),
      ].join('\n')
    )
    .join('\n\n');
}

function buildDevSubtaskHtml(items: DevSubtask[]): string {
  return groupDevSubtasksByAssignee(items)
    .map((group) => {
      const rows = group.items
        .map(
          (item) =>
            `<li><a href="${JIRA_BASE}/browse/${item.key}">${item.key}</a> - ${escapeHtml(item.summary)}</li>`
        )
        .join('');
      return `<p><strong>${escapeHtml(group.label)}</strong></p><ol>${rows}</ol>`;
    })
    .join('');
}

function DevSubtaskPanel({
  items,
  loading,
  onReload,
}: {
  items: DevSubtask[];
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) return <div className="py-6 text-center text-sm text-gray-500">Đang tải...</div>;
  if (items.length === 0) {
    return <p className="pt-4 text-sm font-medium text-green-600">✅ Không còn subtask dev nào chưa xong</p>;
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">{items.length} subtask chưa xong</p>
          <CopyReportButton
            text={buildDevSubtaskText(items)}
            html={buildDevSubtaskHtml(items)}
            label="Copy danh sách"
          />
        </div>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="w-[110px] px-3 py-2 text-left font-semibold">Ticket</th>
              <th className="px-3 py-2 text-left font-semibold">Tên</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                <td className="px-3 py-2">
                  <a
                    href={`${JIRA_BASE}/browse/${item.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {item.key}
                  </a>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">{item.summary || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <JiraStatusPill name={item.statusName} categoryKey={item.statusCategoryKey} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {item.assigneeName || <span className="text-red-500">Chưa gán</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Công việc chung: PO review nhưng con chưa xong ──────────────────────────

interface PoReviewChild {
  key: string;
  typeName: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
}

interface PoReviewParent {
  key: string;
  summary: string;
  children: PoReviewChild[];
}

const PO_REVIEW_PARENT_JQL = 'project IN (PL, PLO) AND status = "PO/TM Review" ORDER BY key ASC';

/** Ticket đang chờ PO review mà subtask/defect bên dưới chưa xong -> review sớm, dễ trả lại. */
async function loadPoReviewOpenChildren(): Promise<PoReviewParent[]> {
  const parents = await searchAllPages(PO_REVIEW_PARENT_JQL, ['summary', 'status', 'issuetype']);
  if (!parents.length) return [];

  const children: any[] = [];
  const keys = parents.map((p: any) => p.key);
  for (let i = 0; i < keys.length; i += 50) {
    const batch = keys.slice(i, i + 50);
    children.push(
      ...(await searchAllPages(
        `parent IN (${batch.join(',')})`,
        ['summary', 'status', 'assignee', 'issuetype', 'parent'],
        4
      ))
    );
  }

  const byParent = new Map<string, PoReviewChild[]>();
  for (const child of children) {
    const status = child.fields?.normalizedStatusName || child.fields?.status?.name || '';
    if (MISMATCH_DONE_RE.test(status.toLowerCase())) continue;
    const parentKey = child.fields?.parent?.key;
    if (!parentKey) continue;
    const list = byParent.get(parentKey) || [];
    list.push({
      key: child.key,
      typeName: child.fields?.issuetype?.name || '',
      statusName: status,
      statusCategoryKey: child.fields?.status?.statusCategory?.key || '',
      assigneeName: child.fields?.normalizedAssigneeName || '',
    });
    byParent.set(parentKey, list);
  }

  return parents
    .filter((p: any) => byParent.has(p.key))
    .map((p: any) => ({
      key: p.key,
      summary: p.fields?.summary || '',
      children: (byParent.get(p.key) || []).sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

function PoReviewChildrenCard({
  parents,
  loading,
  onReload,
}: {
  parents: PoReviewParent[];
  loading: boolean;
  onReload: () => void;
}) {
  const totalChildren = parents.reduce((sum, parent) => sum + parent.children.length, 0);

  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">PO review nhưng con chưa xong</h3>
          {!loading && (
            <span className="text-xs text-gray-400">
              {parents.length === 0 ? 'không có' : `${parents.length} ticket · ${totalChildren} item chưa xong`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>

      <p className="mb-3 text-[11px] text-gray-400">
        Ticket ở status PO/TM Review mà subtask hoặc defect bên dưới vẫn chưa Done
      </p>

      {loading ? (
        <div className="h-16 animate-pulse rounded bg-gray-50" />
      ) : parents.length === 0 ? (
        <p className="text-sm font-medium text-green-600">✅ Ticket PO review đều đã xong hết con</p>
      ) : (
        <div className="space-y-4">
          {parents.map((parent) => (
            <div key={parent.key}>
              <p className="mb-1.5 text-xs">
                <a
                  href={`${JIRA_BASE}/browse/${parent.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-blue-600 hover:underline"
                >
                  {parent.key}
                </a>
                <span className="text-gray-500"> · {parent.summary}</span>
              </p>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {parent.children.map((child) => (
                      <tr key={child.key} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="w-[110px] px-3 py-2">
                          <a
                            href={`${JIRA_BASE}/browse/${child.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                          >
                            {child.key}
                          </a>
                        </td>
                        <td className="px-3 py-2">
                          <JiraTypeTag name={child.typeName} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <JiraStatusPill name={child.statusName} categoryKey={child.statusCategoryKey} />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {child.assigneeName || <span className="text-red-500">Chưa gán</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Công việc chung: ticket gắn sprint sai board ────────────────────────────

interface WrongBoardIssue {
  key: string;
  projectKey: string;
  summary: string;
  statusName: string;
  statusCategoryKey?: string;
  assigneeName: string;
  wrongSprints: string[];
}

// Mỗi board chỉ nên gắn sprint của chính nó: PL -> Lending, PLO -> LOS, DOP -> DOP.
const BOARD_SPRINT_KEYWORD: Record<string, string> = {
  PL: 'lending',
  PLO: 'los',
  DOP: 'dop',
};

const WRONG_BOARD_JQL =
  'project IN (PL, PLO, DOP) AND (sprint IN openSprints() OR sprint IN futureSprints()) ORDER BY key ASC';

async function loadWrongBoardIssues(): Promise<WrongBoardIssue[]> {
  const raw: any[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < 8; page++) {
    const res = await jiraAPI.searchIssues({
      jql: WRONG_BOARD_JQL,
      maxResults: 100,
      fields: ['summary', 'status', 'assignee', 'issuetype'],
      nextPageToken,
    });
    const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
    raw.push(...(payload?.issues || []));
    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
  }

  const result: WrongBoardIssue[] = [];
  for (const issue of raw) {
    const projectKey = (issue.key as string).split('-')[0];
    const keyword = BOARD_SPRINT_KEYWORD[projectKey];
    if (!keyword) continue;
    const wrongSprints = ((issue.fields?.normalizedSprints || []) as NormalizedSprintDetail[])
      .filter((sprint) => (sprint.state || '').toLowerCase() !== 'closed')
      .filter((sprint) => !sprint.name.toLowerCase().includes(keyword))
      .map((sprint) => sprint.name);
    if (wrongSprints.length === 0) continue;
    result.push({
      key: issue.key,
      projectKey,
      summary: issue.fields?.summary || '',
      statusName: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
      statusCategoryKey: issue.fields?.status?.statusCategory?.key || '',
      assigneeName: issue.fields?.normalizedAssigneeName || '',
      wrongSprints: Array.from(new Set(wrongSprints)),
    });
  }
  // gom theo sprint đang gắn sai để dễ xử lý từng nhóm
  return result.sort(
    (a, b) =>
      a.wrongSprints.join(', ').localeCompare(b.wrongSprints.join(', ')) ||
      a.projectKey.localeCompare(b.projectKey) ||
      a.key.localeCompare(b.key)
  );
}

function WrongBoardCard({
  issues,
  loading,
  onReload,
}: {
  issues: WrongBoardIssue[];
  loading: boolean;
  onReload: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Ticket sai board</h3>
          {!loading && (
            <span className="text-xs text-gray-400">
              {issues.length === 0 ? 'không có' : `${issues.length} ticket`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReload}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Tải lại
        </button>
      </div>

      <p className="mb-3 text-[11px] text-gray-400">
        PL phải gắn sprint Lending · PLO gắn LOS · DOP gắn DOP (chỉ xét sprint đang mở và sắp tới)
      </p>

      {loading ? (
        <div className="h-16 animate-pulse rounded bg-gray-50" />
      ) : issues.length === 0 ? (
        <p className="text-sm font-medium text-green-600">✅ Không có ticket nào gắn sai sprint board</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="w-[110px] px-3 py-2 text-left font-semibold">Ticket</th>
                <th className="px-3 py-2 text-left font-semibold">Tên</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Sprint đang gắn</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.key} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <a
                      href={`${JIRA_BASE}/browse/${issue.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {issue.key}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">{issue.summary || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {issue.wrongSprints.map((name) => (
                      <span
                        key={name}
                        className="mr-1 inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"
                      >
                        {name}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <JiraStatusPill name={issue.statusName} categoryKey={issue.statusCategoryKey} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {issue.assigneeName || <span className="text-red-500">Chưa gán</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Công việc chung: SVK support ────────────────────────────────────────────

interface SvkLine {
  key: string;
  urgency: Urgency;
  plText: string;
  workingDays: number;
  note: string;
}

interface SvkSummary {
  total: number;
  counts: Record<Urgency, number>;
  lines: SvkLine[];
}

const URGENCY_ORDER: Urgency[] = ['🔴', '🟡', '🟢'];

const URGENCY_DOT: Record<Urgency, string> = {
  '🔴': 'bg-red-500',
  '🟡': 'bg-amber-400',
  '🟢': 'bg-emerald-500',
};

const URGENCY_TITLE: Record<Urgency, string> = {
  '🔴': 'Cần xử lý gấp',
  '🟡': 'Đang theo dõi',
  '🟢': 'Đã merge, chờ verify',
};

async function loadSvkSummary(): Promise<SvkSummary> {
  const [ticketsRes, notesRes] = await Promise.all([
    supportAPI.getSvkTickets(),
    supportAPI.getSvkNotes().catch(() => ({ data: {} as Record<string, string> })),
  ]);
  const notes = (notesRes.data as Record<string, string>) || {};
  const rows = buildRows((ticketsRes.data as SvkTicketDoc[]) || []);

  const counts = URGENCY_ORDER.reduce((acc, urgency) => {
    acc[urgency] = 0;
    return acc;
  }, {} as Record<Urgency, number>);

  const lines: SvkLine[] = rows
    .map((row) => {
      counts[row.urgency] += 1;
      const plKeys = row.doc.linkedPlKeys || [];
      return {
        key: row.doc.key,
        urgency: row.urgency,
        plText: plKeys.length ? plKeys.join(', ') : 'chưa có PL',
        workingDays: row.workingDays,
        note: (notes[row.doc.key] || '').trim(),
      };
    })
    .sort((a, b) => b.workingDays - a.workingDays || a.key.localeCompare(b.key));

  return { total: rows.length, counts, lines };
}

function SvkSupportCard({
  summary,
  loading,
  scanning,
  onRescan,
}: {
  summary: SvkSummary | null;
  loading: boolean;
  scanning: boolean;
  onRescan: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Support SVK</h3>
          {summary && (
            <div className="flex items-center gap-3">
              {URGENCY_ORDER.map((urgency) => (
                <span
                  key={urgency}
                  title={URGENCY_TITLE[urgency]}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${URGENCY_DOT[urgency]}`} />
                  <span className="font-semibold tabular-nums">{summary.counts[urgency]}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRescan}
            disabled={scanning}
            title="Quét lại SVK từ Jira (giống nút scan ở trang Support)"
            className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            {scanning ? 'Đang quét...' : 'Tải lại'}
          </button>
          <Link href="/support" className="text-xs font-medium text-blue-600 hover:underline">
            Mở trang Support →
          </Link>
        </div>
      </div>

      {loading || scanning ? (
        <div className="h-16 animate-pulse rounded bg-gray-50" />
      ) : !summary || summary.total === 0 ? (
        <p className="text-sm font-medium text-green-600">✅ Không có ticket SVK nào đang mở</p>
      ) : (
        <ul className="space-y-1">
          {summary.lines.map((line) => (
            <li key={line.key} className="text-sm text-gray-700">
              <a
                href={`${JIRA_BASE}/browse/${line.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                {line.key}
              </a>{' '}
              x {line.plText} · {line.workingDays}d
              {line.note ? ` · ${line.note}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [sprintReports, setSprintReports] = useState<ProjectReport[]>([]);
  const [sprintLoading, setSprintLoading] = useState(true);
  const [sprintError, setSprintError] = useState<string | null>(null);
  const [smStats, setSmStats] = useState<SmStats | null>(null);
  const [smLoading, setSmLoading] = useState(true);
  const [smItems, setSmItems] = useState<SprintItem[]>([]);
  const [smTicketCache, setSmTicketCache] = useState<Record<string, SmCachedTicket>>({});
  const [smPageId, setSmPageId] = useState('');
  const [smPageTitle, setSmPageTitle] = useState('');
  const [sprintHealth, setSprintHealth] = useState<SprintHealthResult | null>(null);
  const [sprintHealthLoading, setSprintHealthLoading] = useState(false);
  const [fixVerReview, setFixVerReview] = useState<FixVersionReviewResult | null>(null);
  const [fixVerReviewLoading, setFixVerReviewLoading] = useState(true);
  const [sprintClose, setSprintClose] = useState<SprintCloseResult | null>(null);
  const [sprintCloseLoading, setSprintCloseLoading] = useState(false);
  const [fixVerMigration, setFixVerMigration] = useState<FixVersionMigrationResult | null>(null);
  const [fixVerMigrationLoading, setFixVerMigrationLoading] = useState(false);
  const [devSubtasks, setDevSubtasks] = useState<DevSubtask[]>([]);
  const [devSubtasksLoading, setDevSubtasksLoading] = useState(false);
  const [versionMismatch, setVersionMismatch] = useState<VersionMismatchIssue[]>([]);
  const [versionMismatchLoading, setVersionMismatchLoading] = useState(false);
  const [poReviewParents, setPoReviewParents] = useState<PoReviewParent[]>([]);
  const [poReviewLoading, setPoReviewLoading] = useState(true);
  const [wrongBoardIssues, setWrongBoardIssues] = useState<WrongBoardIssue[]>([]);
  const [wrongBoardLoading, setWrongBoardLoading] = useState(true);
  const [svkSummary, setSvkSummary] = useState<SvkSummary | null>(null);
  const [svkLoading, setSvkLoading] = useState(true);
  const [svkScanning, setSvkScanning] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Ngày đã kiểm tra trong phiên này / đang chạy / kết quả cache của lần trước.
  const [loadedDays, setLoadedDays] = useState<Set<number>>(new Set());
  const [loadingDays, setLoadingDays] = useState<Set<number>>(new Set());
  const [cachedDayStatus, setCachedDayStatus] = useState<CachedDayStatus>({});
  const [reloadingAllDays, setReloadingAllDays] = useState(false);

  // Quét lại SVK từ Jira rồi nạp lại summary — đúng thao tác scan ở trang Support.
  const rescanSvk = useCallback(async () => {
    setSvkScanning(true);
    try {
      await supportAPI.scanSvk();
      setSvkSummary(await loadSvkSummary());
      toast.success('Đã quét lại SVK');
    } catch (err: any) {
      toast.error(
        `Quét SVK thất bại: ${err?.response?.data?.error || err?.response?.data?.message || err.message}`
      );
    } finally {
      setSvkScanning(false);
    }
  }, []);

  const reloadVersionMismatch = useCallback(async () => {
    setVersionMismatchLoading(true);
    try {
      setVersionMismatch(await loadVersionMismatch());
    } catch (err: any) {
      toast.error(`Tải check lệch fix version thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setVersionMismatchLoading(false);
    }
  }, []);

  const reloadSprintHealth = useCallback(async () => {
    setSprintHealthLoading(true);
    try {
      setSprintHealth(await loadSprintTicketHealth());
    } catch (err: any) {
      toast.error(`Tải ticket health thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSprintHealthLoading(false);
    }
  }, []);

  const reloadPoReviewChildren = useCallback(async () => {
    setPoReviewLoading(true);
    try {
      setPoReviewParents(await loadPoReviewOpenChildren());
    } catch (err: any) {
      toast.error(`Tải check PO review thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setPoReviewLoading(false);
    }
  }, []);

  const reloadWrongBoard = useCallback(async () => {
    setWrongBoardLoading(true);
    try {
      setWrongBoardIssues(await loadWrongBoardIssues());
    } catch (err: any) {
      toast.error(`Tải ticket sai board thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setWrongBoardLoading(false);
    }
  }, []);

  const reloadDevSubtasks = useCallback(async () => {
    setDevSubtasksLoading(true);
    try {
      setDevSubtasks(await loadDevSubtasks());
    } catch (err: any) {
      toast.error(`Tải subtask dev thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setDevSubtasksLoading(false);
    }
  }, []);

  const reloadFixVerMigration = useCallback(async () => {
    setFixVerMigrationLoading(true);
    try {
      setFixVerMigration(await loadFixVersionMigration());
    } catch (err: any) {
      toast.error(`Tải check fix version thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setFixVerMigrationLoading(false);
    }
  }, []);

  const reloadSprintClose = useCallback(async () => {
    setSprintCloseLoading(true);
    try {
      setSprintClose(await loadSprintCloseCheck());
    } catch (err: any) {
      toast.error(`Tải check đóng sprint thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSprintCloseLoading(false);
    }
  }, []);

  const reloadFixVerReview = useCallback(async () => {
    setFixVerReviewLoading(true);
    try {
      const result = await loadFixVersionReview();
      setFixVerReview(result);
    } catch (err: any) {
      toast.error(`Tải PO Review thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setFixVerReviewLoading(false);
    }
  }, []);

  const loadSmData = useCallback(async (activeSprintName: string) => {
    setSmLoading(true);
    try {
      const result = await loadSprintMgmtData(activeSprintName);
      if (result) {
        setSmStats(result.stats);
        setSmItems(result.items);
        setSmTicketCache(result.ticketCache);
        setSmPageId(result.pageId);
        setSmPageTitle(result.pageTitle);
      }
    } catch {
      // non-critical
    } finally {
      setSmLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Chỉ nạp thông tin sprint + mục "Công việc chung"; task theo ngày nạp riêng (lazy).
        const [reports] = await Promise.all([
          loadSprintAlignmentReports(),
          loadSvkSummary().then((result) => {
            setSvkSummary(result);
            setSvkLoading(false);
          }).catch(() => setSvkLoading(false)),
          loadWrongBoardIssues().then((result) => {
            setWrongBoardIssues(result);
            setWrongBoardLoading(false);
          }).catch(() => setWrongBoardLoading(false)),
          loadPoReviewOpenChildren().then((result) => {
            setPoReviewParents(result);
            setPoReviewLoading(false);
          }).catch(() => setPoReviewLoading(false)),
          loadFixVersionReview().then((result) => {
            setFixVerReview(result);
            setFixVerReviewLoading(false);
          }).catch(() => setFixVerReviewLoading(false)),
        ]);
        setSprintReports(reports);
        setSprintLoading(false);
        const detectedSprintName =
          reports.find((r) => r.sprintLine.name !== 'Not found')?.sprintLine.name ?? '';
        await loadSmData(detectedSprintName);
      } catch (error) {
        console.error('Error loading sprint:', error);
        setSprintError('Failed to load sprint alignment report');
        toast.error('Failed to load sprint alignment report');
        setSprintLoading(false);
        setSmLoading(false);
      }
    };
    load();
  }, [loadSmData]);

  const {
    rawDay,
    totalDays: sprintTotalDays,
    startDate: sprintStartDate,
    endDate: sprintEndDate,
  } = useMemo(() => getSprintDayInfo(sprintReports), [sprintReports]);
  const sprintLabel = useMemo(() => {
    const name = (sprintReports.find((r) => r.projectKey === 'PL') ?? sprintReports[0])?.sprintLine.name;
    return name ? sprintPageLabel(name) : 'sprint';
  }, [sprintReports]);
  // Timeline luôn 14 mốc; sprint quá hạn (rawDay > 14) coi như đang ở mốc cuối.
  const timelineDays = TIMELINE_DAYS;
  const currentSprintDay = rawDay === null ? null : Math.min(rawDay, timelineDays);
  const sprintOverdue = rawDay !== null && sprintTotalDays !== null && rawDay > sprintTotalDays;
  const todayMarkDay = currentWorkingDay(sprintStartDate, timelineDays);

  // ── Lazy load theo ngày ────────────────────────────────────────────────────
  const dayRunners = useMemo<Record<number, Array<() => Promise<void>>>>(
    () => ({
      1: [reloadSprintHealth, reloadSprintClose, reloadFixVerMigration, reloadVersionMismatch],
      5: [reloadDevSubtasks],
      10: [reloadFixVerReview],
    }),
    [
      reloadSprintHealth,
      reloadSprintClose,
      reloadFixVerMigration,
      reloadVersionMismatch,
      reloadDevSubtasks,
      reloadFixVerReview,
    ]
  );

  const runDay = useCallback(
    async (day: number, force = false) => {
      const runners = dayRunners[day];
      if (!runners || runners.length === 0) return;
      if (!force && (loadedDays.has(day) || loadingDays.has(day))) return;
      setLoadingDays((prev) => new Set([...prev, day]));
      try {
        await Promise.all(runners.map((run) => run()));
        setLoadedDays((prev) => new Set([...prev, day]));
      } finally {
        setLoadingDays((prev) => {
          const next = new Set(prev);
          next.delete(day);
          return next;
        });
      }
    },
    [dayRunners, loadedDays, loadingDays]
  );

  const reloadAllDays = useCallback(async () => {
    setReloadingAllDays(true);
    try {
      await Promise.all(Object.keys(dayRunners).map((day) => runDay(Number(day), true)));
    } finally {
      setReloadingAllDays(false);
    }
  }, [dayRunners, runDay]);

  const cacheKey = sprintLabel ? `dashboard:dayStatus:${sprintLabel}` : '';

  // đọc cache của sprint hiện tại để timeline có tick ngay khi vừa mở trang
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      setCachedDayStatus(raw ? (JSON.parse(raw) as CachedDayStatus) : {});
    } catch {
      setCachedDayStatus({});
    }
  }, [cacheKey]);

  // vào dashboard chỉ chạy task của ngày hôm nay
  const autoRanDayRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (todayMarkDay === null || autoRanDayRef.current === todayMarkDay) return;
    autoRanDayRef.current = todayMarkDay;
    runDay(todayMarkDay);
  }, [todayMarkDay, runDay]);

  const handleSelectDay = useCallback(
    (day: number) => {
      setSelectedDay(day);
      runDay(day);
    },
    [runDay]
  );

  const [needUatItems, setNeedUatItems] = useState<SprintItem[]>([]);
  const [prLabels, setPrLabels] = useState<Record<string, string[]>>({});
  // item vừa gắn label trong phiên vẫn hiện (để sửa nếu lỡ tay), nhưng không còn tính là "cần gửi"
  const uatPendingCount = needUatItems.filter(
    (item) => !(prLabels[item.prNumber] || []).some(isPrStatusLabel)
  ).length;
  const handleUatLabelChange = useCallback((prKey: string, next: string[]) => {
    setPrLabels((prev) => ({ ...prev, [prKey]: next }));
  }, []);


  // Cần gửi UAT = item mục Must have có ticket PR mà PR chưa gắn label trạng thái nào (UatDoing / UatDone / Released).
  // Label đọc thẳng từ Jira, cùng nguồn với control Labels ở Sprint check.
  useEffect(() => {
    if (smLoading || !smItems.length) {
      setNeedUatItems([]);
      return;
    }
    const withPr = smItems.filter(
      (item) => item.section === 'Must have' && /^[A-Z][A-Z0-9]+-\d+$/.test(item.prNumber || '')
    );
    const keys = Array.from(new Set(withPr.map((item) => item.prNumber)));
    if (!keys.length) {
      setNeedUatItems([]);
      return;
    }
    let alive = true;
    (async () => {
      const labelsByKey: Record<string, string[]> = {};
      for (let i = 0; i < keys.length; i += 50) {
        const batch = keys.slice(i, i + 50);
        const res = await jiraAPI.searchIssues({
          jql: `key IN (${batch.join(',')})`,
          maxResults: 100,
          fields: ['labels'],
        });
        for (const issue of ((res.data.data as { issues?: any[] })?.issues || [])) {
          labelsByKey[issue.key] = issue.fields?.labels || [];
        }
      }
      if (!alive) return;
      setPrLabels(labelsByKey);
      setNeedUatItems(
        withPr
          .filter((item) => !(labelsByKey[item.prNumber] || []).some(isPrStatusLabel))
          .sort((a, b) => teamRank(a.teams) - teamRank(b.teams) || a.number - b.number)
      );
    })().catch(() => alive && setNeedUatItems([]));
    return () => {
      alive = false;
    };
  }, [smLoading, smItems]);

  const sprintSummary = useMemo(
    () => computeSprintSummary(sprintReports, sprintError),
    [sprintReports, sprintError]
  );

  const sprintStatus: TaskStatus = sprintLoading ? 'loading' : sprintSummary.isAligned ? 'ok' : 'error';
  const devStatus: TaskStatus = devSubtasksLoading
    ? 'loading'
    : devSubtasks.length === 0
    ? 'ok'
    : 'error';
  const uatStatus: TaskStatus = smLoading ? 'loading' : uatPendingCount === 0 ? 'ok' : 'error';
  const healthStatus: TaskStatus = sprintHealthLoading
    ? 'loading'
    : !sprintHealth || (sprintHealth.draftStories.length === 0 && sprintHealth.unassignedStories.length === 0)
    ? 'ok'
    : 'error';
  const sprintCloseStatus: TaskStatus = sprintCloseLoading
    ? 'loading'
    : !sprintClose || sprintClose.overdueSprints.length === 0
    ? 'ok'
    : 'error';
  const versionMismatchStatus: TaskStatus = versionMismatchLoading
    ? 'loading'
    : versionMismatch.length === 0
    ? 'ok'
    : 'error';
  const fixVerMigrationStatus: TaskStatus = fixVerMigrationLoading
    ? 'loading'
    : !fixVerMigration || fixVerMigration.items.length === 0
    ? 'ok'
    : 'error';
  const fixVerStatus: TaskStatus = fixVerReviewLoading
    ? 'loading'
    : !fixVerReview || fixVerReview.notDoneIssues.length === 0
    ? 'ok'
    : 'error';


  const dayTasks: DayTask[] = [
    {
      day: 1,
      title: 'Ngày 1 trở đi ticket đúng sprint',
      status: healthStatus,
      filter: (
        <TaskFilterNote
          jql={SPRINT_HEALTH_JQL}
          notes={['Lấy story trong sprint đang mở, tách ra 2 nhóm: status Draft và chưa có assignee']}
        />
      ),
      content: <SprintTicketHealthPanel result={sprintHealth} loading={sprintHealthLoading} />,
    },
    {
      day: 1,
      title: 'Đóng sprint cũ',
      status: sprintCloseStatus,
      filter: (
        <TaskFilterNote
          jql={UNCLOSED_JQL}
          notes={[
            'Sprint "chưa đóng" = state khác closed nhưng đã qua end date',
            'Chỉ giữ item thuộc các sprint quá hạn đó, gom theo reporter (PO → DEV → QA)',
          ]}
        />
      ),
      content: (
        <SprintClosePanel
          result={sprintClose}
          loading={sprintCloseLoading}
          onReload={reloadSprintClose}
        />
      ),
    },
    {
      day: 1,
      title: 'Check fix version — item còn dính version cũ',
      status: fixVerMigrationStatus,
      filter: (
        <TaskFilterNote
          jql={OLD_FIX_VER_JQL}
          notes={[
            'Fix version "cũ" = đã released, archived, hoặc release date đã qua',
            'Dropdown đổi sang: version của project chưa released và chưa archived',
          ]}
        />
      ),
      content: (
        <FixVersionMigrationPanel
          result={fixVerMigration}
          loading={fixVerMigrationLoading}
          onReload={reloadFixVerMigration}
        />
      ),
    },
    {
      day: 1,
      title: 'Ticket khớp fix version với cha',
      status: versionMismatchStatus,
      filter: (
        <TaskFilterNote
          jql={VERSION_MISMATCH_JQL}
          notes={[
            'Lấy thêm con/cháu qua field parent rồi so tập fix version của subtask với ticket cha',
            `Bỏ qua ticket Done, loại Defect, hoặc có label ${IGNORE_MISMATCH_LABEL} (chọn "Bỏ qua fix lệch" ở backlog)`,
          ]}
        />
      ),
      content: (
        <VersionMismatchPanel
          issues={versionMismatch}
          loading={versionMismatchLoading}
          onReload={reloadVersionMismatch}
        />
      ),
    },
    {
      day: 1,
      title: 'Cập nhật sprint và fix version',
      status: sprintStatus,
      filter: (
        <TaskFilterNote
          jql={PROJECT_KEYS.map((key) => buildOpenSprintJql(key)).join('\n')}
          notes={[
            'Sprint: sprint xuất hiện nhiều nhất trong các issue đang mở của project',
            'Fix version: version chưa release có release date sớm nhất (earliestUnreleasedVersion)',
            'Báo lệch khi sprint và fix version khác khoảng ngày, hoặc đã quá hạn / chưa tới',
          ]}
        />
      ),
      content: sprintLoading ? (
        <div className="py-6 text-center text-gray-500">Đang tải...</div>
      ) : (
        <SprintAlignmentDetail reports={sprintReports} loadError={sprintError} />
      ),
    },
    {
      day: 5,
      title: 'Ngày 5 trở đi xong hết subtask dev',
      status: devStatus,
      filter: (
        <TaskFilterNote
          jql={DEV_SUBTASK_JQL}
          notes={[
            'Bỏ subtask có ticket cha gắn fix version của sprint sau (cha đã dời, chưa tới hạn)',
            'Bỏ subtask nằm dưới TechDebt (cha hoặc tổ tiên ở cấp cao hơn)',
          ]}
        />
      ),
      content: (
        <DevSubtaskPanel
          items={devSubtasks}
          loading={devSubtasksLoading}
          onReload={reloadDevSubtasks}
        />
      ),
    },
    {
      day: 7,
      title: 'Ngày 7 trở đi gửi UAT',
      status: uatStatus,
      filter: (
        <TaskFilterNote
          notes={[
            'Nguồn: item mục Must have trong page Sprint check của sprint hiện tại',
            `Cần gửi UAT = item có ticket PR mà PR chưa có label nào trong ${PR_STATUS_LABELS.join(' / ')}`,
            'Gắn label ngay tại Sprint check (chip Labels trên từng item)',
          ]}
        />
      ),
      content: smLoading ? (
        <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>
      ) : needUatItems.length === 0 ? (
        <div className="space-y-2 py-4 text-center">
          <p className="text-sm font-medium text-green-600">✅ Không có item nào cần UAT!</p>
          <UatLabelLink pageId={smPageId} pageTitle={smPageTitle} />
        </div>
      ) : (
        <div className="pt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              {uatPendingCount} item cần gửi UAT
              {needUatItems.length > uatPendingCount && ` · ${needUatItems.length - uatPendingCount} vừa gắn label`}
            </p>
            <UatLabelLink pageId={smPageId} pageTitle={smPageTitle} />
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold w-[90px]">PR</th>
                  <th className="text-left px-3 py-2 font-semibold">Tên item</th>
                  <th className="text-left px-3 py-2 font-semibold w-[110px]">Teams</th>
                  <th className="text-left px-3 py-2 font-semibold w-[120px]" title="Ticket đại diện (cấp cao nhất) của item">Ticket PL</th>
                  <th className="text-left px-3 py-2 font-semibold w-[140px]">Status</th>
                  <th className="text-left px-3 py-2 font-semibold w-[190px]">Label PR</th>
                </tr>
              </thead>
              <tbody>
                {needUatItems.map((item) => {
                  const rep = representativeTicket(item, smTicketCache as Record<string, SmAnalysisTicket>);
                  const labelled = (prLabels[item.prNumber] || []).some(isPrStatusLabel);
                  return (
                  <tr
                    key={item.prNumber || item.number}
                    className={`border-t border-gray-100 hover:bg-gray-50 ${labelled ? 'opacity-60' : ''}`}
                  >
                    <td className="px-3 py-2 text-xs font-mono">
                      <a
                        href={`${JIRA_BASE}/browse/${item.prNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {item.prNumber}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-800">{item.icon} {item.title || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{item.teams.join(', ') || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {rep ? (
                        <a
                          href={`${JIRA_BASE}/browse/${rep.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${rep.type} · ${rep.name}`}
                          className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {rep.id}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {rep ? <JiraStatusPill name={rep.status || ''} /> : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <PrLabelControl
                        prKey={item.prNumber}
                        labels={prLabels[item.prNumber] || []}
                        loaded={item.prNumber in prLabels}
                        onChange={handleUatLabelChange}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      day: 10,
      title: 'Ngày 10 trở đi kiểm tra Fix version',
      status: fixVerStatus,
      filter: (
        <TaskFilterNote
          jql={FIX_VER_NOT_DONE_JQL}
          notes={['Ticket của fix version hiện tại mà chưa Done (bảng PO review đã chuyển sang mục Công việc chung)']}
        />
      ),
      content: (
        <FixVersionReviewPanel
          result={fixVerReview}
          loading={fixVerReviewLoading}
          onReload={reloadFixVerReview}
        />
      ),
    },
  ];

  // Ngày chưa kiểm tra trong phiên này -> task hiện "Chưa kiểm tra" thay vì báo xanh nhầm.
  const dayTasksWithState: DayTask[] = dayTasks.map((task) =>
    loadedDays.has(task.day) || loadingDays.has(task.day) || !dayRunners[task.day]
      ? task
      : { ...task, status: 'idle' }
  );

  // ngày không có runner (data đã nạp sẵn lúc mở trang) coi như đã kiểm tra
  const effectiveLoadedDays = new Set(loadedDays);
  for (const task of dayTasks) {
    if (!dayRunners[task.day]) effectiveLoadedDays.add(task.day);
  }

  const dayMarks = buildDayMarks(
    dayTasksWithState,
    timelineDays,
    todayMarkDay,
    sprintStartDate,
    effectiveLoadedDays,
    loadingDays,
    cachedDayStatus
  );

  // lưu kết quả vừa kiểm tra để lần sau mở dashboard timeline có tick ngay
  useEffect(() => {
    if (!cacheKey) return;
    const next: CachedDayStatus = { ...cachedDayStatus };
    let changed = false;
    for (const mark of dayMarks) {
      if (mark.state !== 'pass' && mark.state !== 'fail') continue;
      if (mark.fromCache || next[mark.day] === mark.state) continue;
      next[mark.day] = mark.state;
      changed = true;
    }
    if (!changed) return;
    setCachedDayStatus(next);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {
      // localStorage bị chặn -> bỏ qua cache, không ảnh hưởng chức năng
    }
  }, [dayMarks, cacheKey, cachedDayStatus]);

  // mặc định luôn đứng ở ngày hôm nay — kể cả ngày đó không có việc,
  // để panel không hiện nhầm việc của ngày khác
  const defaultDay =
    todayMarkDay ?? currentSprintDay ?? dayMarks.find((mark) => mark.tasks.length > 0)?.day ?? 1;

  const activeDay = selectedDay ?? defaultDay;
  const activeMark = dayMarks.find((mark) => mark.day === activeDay) ?? null;

  // mốc gợi ý khi ngày đang chọn rỗng: ưu tiên ngày đang có việc cần xử lý,
  // sau đó tới mốc có việc gần nhất đã qua
  const suggestedMark =
    dayMarks.find((mark) => mark.state === 'fail') ??
    [...dayMarks]
      .reverse()
      .find(
        (mark) =>
          mark.tasks.length > 0 && (currentSprintDay === null || mark.day <= currentSprintDay)
      ) ??
    dayMarks.find((mark) => mark.tasks.length > 0) ??
    null;

  // mục nào không còn việc thì gom vào khối "Đã xong" thu gọn
  const generalWork: Array<{ key: string; done: boolean; node: React.ReactNode }> = [
    {
      key: 'svk',
      done: !svkLoading && !svkScanning && svkSummary !== null && svkSummary.total === 0,
      node: (
        <SvkSupportCard
          key="svk"
          summary={svkSummary}
          loading={svkLoading}
          scanning={svkScanning}
          onRescan={rescanSvk}
        />
      ),
    },
    {
      key: 'po-review',
      done: !fixVerReviewLoading && (fixVerReview?.poReviewIssues.length ?? 0) === 0,
      node: (
        <PoReviewCard
          key="po-review"
          result={fixVerReview}
          loading={fixVerReviewLoading}
          onReload={reloadFixVerReview}
        />
      ),
    },
    {
      key: 'po-review-children',
      done: !poReviewLoading && poReviewParents.length === 0,
      node: (
        <PoReviewChildrenCard
          key="po-review-children"
          parents={poReviewParents}
          loading={poReviewLoading}
          onReload={reloadPoReviewChildren}
        />
      ),
    },
    {
      key: 'wrong-board',
      done: !wrongBoardLoading && wrongBoardIssues.length === 0,
      node: (
        <WrongBoardCard
          key="wrong-board"
          issues={wrongBoardIssues}
          loading={wrongBoardLoading}
          onReload={reloadWrongBoard}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Tổng quan các việc cần quản lý</p>
        </div>
        <div className="w-full lg:w-[420px] lg:shrink-0">
          <NotesPanel />
        </div>
      </div>

      {/* sprint + timeline + việc theo ngày gộp chung một card */}
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <SprintOverviewCard
          sprintReports={sprintReports}
          sprintLoading={sprintLoading}
          smStats={smStats}
          smLoading={smLoading}
        />

        <SprintTimeline
          marks={dayMarks}
          currentDay={todayMarkDay}
          overdueDays={sprintOverdue && rawDay !== null && sprintTotalDays !== null ? rawDay - sprintTotalDays : 0}
          selectedDay={activeDay}
          sprintLabel={sprintLabel}
          startDate={sprintStartDate}
          endDate={sprintEndDate}
          onReloadAll={reloadAllDays}
          reloadingAll={reloadingAllDays}
          onSelect={handleSelectDay}
        />

        <div className="space-y-3 border-t border-gray-100 bg-slate-50 px-6 py-5">
        {activeMark && activeMark.tasks.length > 0 ? (
          <>
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-900">Ngày {activeMark.day}</h2>
              <span className="text-xs text-gray-400">
                {activeMark.tasks.length} việc
                {currentSprintDay !== null && activeMark.day > currentSprintDay ? ' · chưa tới' : ''}
              </span>
            </div>
            {activeMark.tasks.map((task) => (
              <TaskItem
                key={task.title}
                title={task.title}
                status={task.status}
                defaultOpen={activeMark.tasks.length === 1}
                filter={task.filter}
              >
                {task.content}
              </TaskItem>
            ))}
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              {activeDay ? `Ngày ${activeDay} không có việc cần làm` : 'Chọn một mốc trên timeline'}
            </p>
            {suggestedMark && suggestedMark.day !== activeDay && (
              <button
                type="button"
                onClick={() => handleSelectDay(suggestedMark.day)}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Xem việc ngày {suggestedMark.day} ({suggestedMark.tasks.length} việc
                {suggestedMark.state === 'fail' ? ' · cần xử lý' : ''})
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-md px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Công việc chung</h2>
        <div className="space-y-4">{generalWork.filter((item) => !item.done).map((item) => item.node)}</div>
        {generalWork.some((item) => item.done) && (
          <details className="mt-4 rounded-lg border border-gray-100 bg-gray-50">
            <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-gray-500">
              ✅ Đã xong ({generalWork.filter((item) => item.done).length})
            </summary>
            <div className="space-y-4 px-4 pb-4">
              {generalWork.filter((item) => item.done).map((item) => item.node)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
