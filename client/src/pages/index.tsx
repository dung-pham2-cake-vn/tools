import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI, sprintManagementAPI } from '@/utils/api';
import {
  extractSprintNumber,
  sprintPageLabel,
  SprintItem,
  CachedSprintTicket as SmAnalysisTicket,
  getItemStorageKey,
  collectItemStoryFlags,
  derivePoStatus,
  PoStatus,
  PO_STATUS_CONFIG,
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

const pickSingleSprint = (issues: JiraSearchIssue[]): { item: NormalizedSprintDetail | null; notes: string[] } => {
  const sprints = dedupeByName(
    issues.flatMap((issue) => issue.fields.normalizedSprints || []).filter((s) => s.state === 'active')
  );
  if (sprints.length === 0) return { item: null, notes: ['no active sprint returned by JQL'] };
  if (sprints.length > 1) return { item: null, notes: [`multiple active sprints: ${sprints.map((s) => s.name).join(', ')}`] };
  return { item: sprints[0], notes: [] };
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
    items,
  };
}

// ─── Dev ticket helpers ───────────────────────────────────────────────────────

function isSoftwareEngineer(rawAssignee: string, contributors: Record<string, string>): boolean {
  if (!rawAssignee || rawAssignee === 'Unassigned') return false;
  const inlineMatch = rawAssignee.match(/\(([^)]+)\)/);
  if (inlineMatch) return inlineMatch[1].toLowerCase().includes('software engineer');
  const cleanName = rawAssignee.replace(/\s*\(.*?\)\s*/g, '').trim();
  return (contributors[cleanName] || '').toLowerCase().includes('software engineer');
}

function smShortName(fullName: string): string {
  if (!fullName || fullName === 'Unassigned') return fullName || 'Unassigned';
  const clean = fullName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const parts = clean.split(/\s+/);
  return parts.length <= 2 ? clean : `${parts[parts.length - 1]} ${parts[0]}`;
}

function smStatusCls(status: string): string {
  const s = (status || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (SM_TODO.has(s)) return 'bg-gray-100 text-gray-600 border-gray-200';
  if (SM_IN_PROGRESS.has(s)) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function smFormatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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
  const today = getTodayUtc7();

  const plReport = sprintReports.find((r) => r.projectKey === 'PL') ?? sprintReports[0];
  const sprint = plReport?.sprintLine;
  const startDate = sprint?.startDate ?? null;
  const endDate = sprint?.endDate ?? null;
  const rawSprintName = sprint?.name ?? '';
  const sprintLabel = rawSprintName ? sprintPageLabel(rawSprintName) : '—';

  let dayNumber: number | null = null;
  let totalDays: number | null = null;
  if (startDate && endDate) {
    const msPerDay = 86_400_000;
    totalDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay) + 1;
    const raw = Math.round((new Date(today).getTime() - new Date(startDate).getTime()) / msPerDay) + 1;
    dayNumber = Math.max(1, Math.min(raw, totalDays));
  }

  const progress = dayNumber && totalDays ? (dayNumber / totalDays) * 100 : 0;

  const fmtDate = (d: string | null) => {
    if (!d) return '?';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="rounded-lg bg-white shadow-md px-6 py-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Sprint hiện tại</h2>

      {sprintLoading ? (
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3">
            <span className="text-xl font-bold text-blue-700">{sprintLabel}</span>
            <span className="text-sm text-gray-600">
              {fmtDate(startDate)} → {fmtDate(endDate)}
            </span>
            {dayNumber && totalDays && (
              <span className="text-sm text-gray-700">
                Ngày thứ <span className="font-bold text-blue-600">{dayNumber}</span>
                <span className="text-gray-400"> / {totalDays} ngày</span>
              </span>
            )}
          </div>

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
            <p className="text-sm italic text-gray-400">Chưa có dữ liệu Sprint Management</p>
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
  assigneeName: string;
}

interface SprintHealthResult {
  draftStories: SprintHealthIssue[];
  unassignedStories: SprintHealthIssue[];
}

async function loadSprintTicketHealth(): Promise<SprintHealthResult> {
  const jql = 'project IN (PL, PLO, DOP) AND Sprint IN openSprints() AND issuetype = Story ORDER BY project';
  const res = await jiraAPI.searchIssues({ jql, maxResults: 200, fields: ['summary', 'status', 'assignee'] });
  const issues: any[] = ((res.data.data as { issues?: any[] })?.issues) || [];
  const mapped: SprintHealthIssue[] = issues.map((issue: any) => ({
    key: issue.key as string,
    summary: issue.fields?.summary || '',
    statusName: issue.fields?.normalizedStatusName || '',
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
            <th className="text-left px-3 py-2 font-semibold w-[130px]">Status</th>
            <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
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
              <td className="px-3 py-2">
                <span className="text-xs px-2 py-0.5 rounded border font-medium bg-amber-50 text-amber-700 border-amber-200">
                  {issue.statusName || '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{issue.assigneeName || <span className="text-red-500">Chưa gán</span>}</td>
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

// ─── Fix Version review types + loader ───────────────────────────────────────

interface FixVersionIssue {
  key: string;
  summary: string;
  statusName: string;
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
              <th className="text-left px-3 py-2 font-semibold w-[130px]">Status</th>
              <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
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
                <td className="px-3 py-2">
                  <span className="text-xs px-2 py-0.5 rounded border font-medium bg-amber-50 text-amber-700 border-amber-200">
                    {issue.statusName || '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
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
            <th className="text-left px-3 py-2 font-semibold w-[130px]">Status</th>
            <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
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
              <td className="px-3 py-2">
                <span className="text-xs px-2 py-0.5 rounded border font-medium bg-amber-50 text-amber-700 border-amber-200">
                  {issue.statusName || '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
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
    <div className="pt-4 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Check tickets PO review ({result.poReviewIssues.length})
        </p>
        <PoReviewTable issues={result.poReviewIssues} onTransitioned={onReload} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Check fix ver not done ({result.notDoneIssues.length})
        </p>
        <FixVersionNotDoneTable issues={result.notDoneIssues} />
      </div>
    </div>
  );
}

// ─── DevTicketTable ───────────────────────────────────────────────────────────

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

function DevTicketTable({
  tickets,
  ticketCache,
  reloadingAll,
  onReloadAll,
  loading,
}: {
  tickets: SmCachedTicket[];
  ticketCache: Record<string, SmCachedTicket>;
  reloadingAll: boolean;
  onReloadAll: () => void;
  loading: boolean;
}) {
  if (loading) {
    return <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>;
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Software Engineer · Todo &amp; In-progress ({tickets.length} tickets)
        </p>
        <button
          onClick={onReloadAll}
          disabled={reloadingAll}
          className="ml-3 shrink-0 px-2.5 py-1 text-xs font-medium rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {reloadingAll ? 'Đang reload Jira...' : 'Reload Jira'}
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="py-4 text-center text-sm text-green-600 font-medium">
          ✅ Tất cả subtask dev đã xong!
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket ID</th>
                <th className="text-left px-3 py-2 font-semibold">Tên Ticket</th>
                <th className="text-left px-3 py-2 font-semibold w-[130px]">Trạng thái</th>
                <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
                <th className="text-center px-3 py-2 font-semibold w-[48px]">SP</th>
                <th className="text-left px-3 py-2 font-semibold w-[100px]">Parent</th>
                <th className="text-left px-3 py-2 font-semibold w-[130px]">Parent Fix Ver</th>
                <th className="text-left px-3 py-2 font-semibold w-[160px]">Last update</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                return (
                  <tr key={ticket.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <a
                        href={`${JIRA_BASE}/browse/${ticket.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                      >
                        {ticket.id}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">{ticket.name || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${smStatusCls(ticket.status)}`}>
                        {ticket.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {smShortName(ticket.assignee) || 'Unassigned'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono text-center">
                      {ticket.storyPoints || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {ticket.parentId ? (
                        <a
                          href={`${JIRA_BASE}/browse/${ticket.parentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                        >
                          {ticket.parentId}
                        </a>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {ticket.parentId && ticketCache[ticket.parentId]?.fixVersions?.length
                        ? ticketCache[ticket.parentId].fixVersions!.join(', ')
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {ticket.lastUpdatedAt ? smFormatDate(ticket.lastUpdatedAt) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

type TaskStatus = 'loading' | 'ok' | 'error';

interface TaskItemProps {
  title: string;
  status: TaskStatus;
  children: React.ReactNode;
}

function StatusBadge({ status }: { status: TaskStatus }) {
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

function TaskItem({ title, status, children }: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setEverOpened(true);
      return !prev;
    });
  }, []);

  return (
    <div className="rounded-lg bg-white shadow-md">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-400 select-none">{open ? '▼' : '▶'}</span>
          <span className="text-base font-semibold text-gray-900">{title}</span>
        </div>
        <StatusBadge status={status} />
      </button>

      {open && everOpened && (
        <div className="border-t border-slate-100 px-5 pb-5">
          {children}
        </div>
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
  const [smTicketCache, setSmTicketCache] = useState<Record<string, SmCachedTicket>>({});
  const [smContributors, setSmContributors] = useState<Record<string, string>>({});
  const [smItems, setSmItems] = useState<SprintItem[]>([]);
  const [smPageId, setSmPageId] = useState('');
  const [activeSprintName, setActiveSprintName] = useState('');
  const [devReloadingIds, setDevReloadingIds] = useState<Set<string>>(new Set());
  const [devReloadingAll, setDevReloadingAll] = useState(false);
  const [sprintHealth, setSprintHealth] = useState<SprintHealthResult | null>(null);
  const [sprintHealthLoading, setSprintHealthLoading] = useState(true);
  const [fixVerReview, setFixVerReview] = useState<FixVersionReviewResult | null>(null);
  const [fixVerReviewLoading, setFixVerReviewLoading] = useState(true);

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
        setSmTicketCache(result.ticketCache);
        setSmContributors(result.contributors);
        setSmItems(result.items);
        setSmPageId(result.pageId);
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
        const [reports] = await Promise.all([
          loadSprintAlignmentReports(),
          loadSprintTicketHealth().then((result) => {
            setSprintHealth(result);
            setSprintHealthLoading(false);
          }).catch(() => setSprintHealthLoading(false)),
          loadFixVersionReview().then((result) => {
            setFixVerReview(result);
            setFixVerReviewLoading(false);
          }).catch(() => setFixVerReviewLoading(false)),
        ]);
        setSprintReports(reports);
        setSprintLoading(false);
        const detectedSprintName =
          reports.find((r) => r.sprintLine.name !== 'Not found')?.sprintLine.name ?? '';
        setActiveSprintName(detectedSprintName);
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

  const activeSprintNum = useMemo(() => extractSprintNumber(activeSprintName), [activeSprintName]);

  const devTickets = useMemo(() => {
    const cacheIds = new Set(Object.keys(smTicketCache));
    return Object.values(smTicketCache)
      .filter((t) => {
        const cat = smCategory(t.status || '');
        if (!isSoftwareEngineer(t.assignee || '', smContributors)) return false;
        if (cat !== 'todo' && cat !== 'inProgress') return false;
        // Exclude subtask whose parent is not part of this sprint's data
        if (t.parentId && !cacheIds.has(t.parentId)) return false;
        // Exclude subtask whose parent has fixVersions pointing to a different sprint
        if (t.parentId && cacheIds.has(t.parentId) && activeSprintNum > 0) {
          const parentFvs = smTicketCache[t.parentId]?.fixVersions;
          if (parentFvs && parentFvs.length > 0) {
            const parentSprintMatches = parentFvs.some((fv) => extractSprintNumber(fv) === activeSprintNum);
            if (!parentSprintMatches) return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.assignee || '').localeCompare(b.assignee || '') || (a.status || '').localeCompare(b.status || ''));
  }, [smTicketCache, smContributors, activeSprintNum]);

  const handleReloadDevTicket = useCallback(async (ticketId: string) => {
    setDevReloadingIds((prev) => new Set([...prev, ticketId]));
    try {
      const parentId = smTicketCache[ticketId]?.parentId;
      const ids = Array.from(new Set([ticketId, ...(parentId ? [parentId] : [])]));
      const res = await sprintManagementAPI.reloadTickets(ids);
      setSmTicketCache((prev) => ({ ...prev, ...(res.data.data || {}) }));
    } catch (err: any) {
      toast.error(`Reload thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setDevReloadingIds((prev) => { const next = new Set(prev); next.delete(ticketId); return next; });
    }
  }, [smTicketCache]);

  const handleReloadAllDev = useCallback(async () => {
    if (!devTickets.length) return;
    setDevReloadingAll(true);
    const parentIds = devTickets.map((t) => t.parentId).filter((id): id is string => Boolean(id));
    const ids = Array.from(new Set([...devTickets.map((t) => t.id), ...parentIds]));
    try {
      const res = await sprintManagementAPI.reloadTickets(ids);
      setSmTicketCache((prev) => ({ ...prev, ...(res.data.data || {}) }));
      toast.success(`Đã reload ${ids.length} tickets`);
    } catch (err: any) {
      toast.error(`Reload thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setDevReloadingAll(false);
    }
  }, [devTickets]);

  const [needUatItems, setNeedUatItems] = useState<SprintItem[]>([]);

  useEffect(() => {
    if (smLoading || !smPageId || !smItems.length) {
      setNeedUatItems([]);
      return;
    }
    const result: SprintItem[] = [];
    for (const item of smItems) {
      const key = getItemStorageKey(smPageId, item);
      let stored: PoStatus | null = null;
      try {
        const v = localStorage.getItem(key);
        if (v && v in PO_STATUS_CONFIG) stored = v as PoStatus;
      } catch {}
      const flags = collectItemStoryFlags(item, smTicketCache as Record<string, SmAnalysisTicket>);
      const effective = derivePoStatus(flags, stored);
      if (effective === 'need-uat') result.push(item);
    }
    setNeedUatItems(result);
  }, [smLoading, smPageId, smItems, smTicketCache]);

  const sprintSummary = useMemo(
    () => computeSprintSummary(sprintReports, sprintError),
    [sprintReports, sprintError]
  );

  const sprintStatus: TaskStatus = sprintLoading ? 'loading' : sprintSummary.isAligned ? 'ok' : 'error';
  const devStatus: TaskStatus = smLoading ? 'loading' : devTickets.length === 0 ? 'ok' : 'error';
  const uatStatus: TaskStatus = smLoading ? 'loading' : needUatItems.length === 0 ? 'ok' : 'error';
  const healthStatus: TaskStatus = sprintHealthLoading
    ? 'loading'
    : !sprintHealth || (sprintHealth.draftStories.length === 0 && sprintHealth.unassignedStories.length === 0)
    ? 'ok'
    : 'error';
  const fixVerStatus: TaskStatus = fixVerReviewLoading
    ? 'loading'
    : !fixVerReview || (fixVerReview.poReviewIssues.length === 0 && fixVerReview.notDoneIssues.length === 0)
    ? 'ok'
    : 'error';

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Tổng quan các việc cần quản lý</p>
      </div>

      <SprintOverviewCard
        sprintReports={sprintReports}
        sprintLoading={sprintLoading}
        smStats={smStats}
        smLoading={smLoading}
      />

      <div className="space-y-3">
        <TaskItem title="Ngày 1 trở đi ticket đúng sprint" status={healthStatus}>
          <SprintTicketHealthPanel result={sprintHealth} loading={sprintHealthLoading} />
        </TaskItem>

        <TaskItem title="Ngày 7 trở đi xong hết subtask dev" status={devStatus}>
          <DevTicketTable
            tickets={devTickets}
            ticketCache={smTicketCache}
            reloadingAll={devReloadingAll}
            onReloadAll={handleReloadAllDev}
            loading={smLoading}
          />
        </TaskItem>

        <TaskItem title="Ngày 9 trở đi gửi UAT" status={uatStatus}>
          {smLoading ? (
            <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>
          ) : needUatItems.length === 0 ? (
            <div className="py-4 text-center text-sm text-green-600 font-medium">
              ✅ Không có item nào cần UAT!
            </div>
          ) : (
            <div className="pt-4 space-y-2">
              <p className="text-xs text-gray-400">{needUatItems.length} item cần gửi UAT</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-2 font-semibold w-[80px]">PR</th>
                      <th className="text-left px-3 py-2 font-semibold">Tên item</th>
                      <th className="text-left px-3 py-2 font-semibold w-[120px]">Teams</th>
                      <th className="text-left px-3 py-2 font-semibold w-[100px]">PO Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needUatItems.map((item) => (
                      <tr key={item.prNumber || item.number} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-gray-500">{item.prNumber || `#${item.number}`}</td>
                        <td className="px-3 py-2 text-sm text-gray-800">{item.icon} {item.title || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.teams.join(', ') || '—'}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 rounded border font-medium bg-red-50 text-red-700 border-red-300">
                            Need UAT
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TaskItem>

        <TaskItem title="Ngày 13 trở đi kiểm tra status PO và Fix version" status={fixVerStatus}>
          <FixVersionReviewPanel
            result={fixVerReview}
            loading={fixVerReviewLoading}
            onReload={reloadFixVerReview}
          />
        </TaskItem>

        <TaskItem title="Cập nhật sprint và fix version" status={sprintStatus}>
          {sprintLoading ? (
            <div className="py-6 text-center text-gray-500">Đang tải...</div>
          ) : (
            <SprintAlignmentDetail reports={sprintReports} loadError={sprintError} />
          )}
        </TaskItem>
      </div>
    </div>
  );
}
