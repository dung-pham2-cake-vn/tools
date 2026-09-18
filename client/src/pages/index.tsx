import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI, sprintManagementAPI, supportAPI } from '@/utils/api';
import { buildRows, type SvkTicketDoc, type Urgency } from '@/utils/svk';
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

// ─── Jira-style status / type badges ─────────────────────────────────────────

type JiraStatusCategory = 'new' | 'indeterminate' | 'done';

// Bảng màu lexical của Jira theo status category.
const STATUS_CATEGORY_STYLE: Record<JiraStatusCategory, string> = {
  new: 'bg-[#DFE1E6] text-[#42526E]',
  indeterminate: 'bg-[#DEEBFF] text-[#0052CC]',
  done: 'bg-[#E3FCEF] text-[#006644]',
};

const DONE_STATUS_NAMES = new Set([
  'done', 'closed', 'released', 'ready4release', 'will not do', 'resolved', 'cancelled', 'canceled',
]);
const NEW_STATUS_NAMES = new Set(['open', 'to do', 'backlog', 'draft', 'new', 'wait4dev', 'in coding']);

function statusCategoryOf(statusName: string, rawCategoryKey?: string): JiraStatusCategory {
  const raw = (rawCategoryKey || '').toLowerCase();
  if (raw === 'new' || raw === 'indeterminate' || raw === 'done') return raw;
  const s = (statusName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (DONE_STATUS_NAMES.has(s)) return 'done';
  if (NEW_STATUS_NAMES.has(s) || SM_TODO.has(s)) return 'new';
  return 'indeterminate';
}

function JiraStatusPill({ name, categoryKey }: { name: string; categoryKey?: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  const cls = STATUS_CATEGORY_STYLE[statusCategoryOf(name, categoryKey)];
  return (
    <span className={`inline-block rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {name}
    </span>
  );
}

// Màu/glyph icon type theo Jira.
function typeVisual(typeName: string): { color: string; glyph: string } {
  const t = (typeName || '').toLowerCase();
  if (t.includes('epic')) return { color: '#904EE2', glyph: '⚡' };
  if (t.includes('initiative')) return { color: '#904EE2', glyph: '◈' };
  if (t.includes('story')) return { color: '#63BA3C', glyph: '✦' };
  if (t.includes('bug') || t.includes('defect')) return { color: '#E5493A', glyph: '●' };
  if (t.includes('subtask') || t.includes('sub-task')) return { color: '#4BADE8', glyph: '↳' };
  if (t.includes('techdebt') || t.includes('tech debt')) return { color: '#FF991F', glyph: '◆' };
  if (t.includes('security')) return { color: '#FF5630', glyph: '⚑' };
  return { color: '#4BADE8', glyph: '✓' };
}

function JiraTypeTag({ name }: { name: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  const { color, glyph } = typeVisual(name);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] text-[10px] leading-none text-white"
        style={{ backgroundColor: color }}
      >
        {glyph}
      </span>
      <span className="text-xs text-gray-600">{name}</span>
    </span>
  );
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
  const plReport = sprintReports.find((r) => r.projectKey === 'PL') ?? sprintReports[0];
  const rawSprintName = plReport?.sprintLine.name ?? '';
  const sprintLabel = rawSprintName ? sprintPageLabel(rawSprintName) : '—';
  const { startDate, endDate, dayNumber, totalDays } = getSprintDayInfo(sprintReports);

  const progress = dayNumber && totalDays ? (dayNumber / totalDays) * 100 : 0;

  const fmtDate = (d: string | null) => {
    if (!d) return '?';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="px-6 py-5">
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
  statusCategoryKey?: string;
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
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Trạng thái</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Assignee</th>
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <JiraStatusPill name={ticket.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
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
  defaultOpen?: boolean;
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

function TaskItem({ title, status, defaultOpen = false, children }: TaskItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [everOpened, setEverOpened] = useState(defaultOpen);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setEverOpened(true);
      return !prev;
    });
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-400 select-none">{open ? '▼' : '▶'}</span>
        <StatusBadge status={status} />
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </button>

      {open && everOpened && (
        <div className="border-t border-slate-100 px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Sprint day timeline ──────────────────────────────────────────────────────

const TIMELINE_DAYS = 14;

interface DayTask {
  day: number;
  title: string;
  status: TaskStatus;
  content: React.ReactNode;
}

type DayNodeState = 'pass' | 'fail' | 'loading' | 'empty' | 'future';

interface DayMark {
  day: number;
  state: DayNodeState;
  tasks: DayTask[];
}

function buildDayMarks(tasks: DayTask[], totalDays: number, currentDay: number | null): DayMark[] {
  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const dayTasks = tasks.filter((task) => task.day === day);
    let state: DayNodeState;
    if (dayTasks.length === 0) state = 'empty';
    else if (currentDay !== null && day > currentDay) state = 'future';
    else if (dayTasks.some((task) => task.status === 'loading')) state = 'loading';
    else if (dayTasks.some((task) => task.status === 'error')) state = 'fail';
    else state = 'pass';
    return { day, state, tasks: dayTasks };
  });
}

const NODE_STYLE: Record<DayNodeState, { cls: string; glyph: string; hint: string }> = {
  pass: { cls: 'bg-emerald-500 border-emerald-500 text-white', glyph: '✓', hint: 'Đã xong' },
  fail: { cls: 'bg-red-500 border-red-500 text-white', glyph: '✕', hint: 'Cần xử lý' },
  loading: { cls: 'bg-white border-slate-300 text-slate-400 animate-pulse', glyph: '•', hint: 'Đang tải' },
  future: { cls: 'bg-slate-100 border-slate-200 text-slate-400', glyph: '', hint: 'Chưa tới' },
  empty: { cls: 'bg-white border-dashed border-slate-200 text-slate-300', glyph: '', hint: 'Không có việc' },
};

function SprintTimeline({
  marks,
  currentDay,
  overdueDays,
  selectedDay,
  onSelect,
}: {
  marks: DayMark[];
  currentDay: number | null;
  overdueDays: number;
  selectedDay: number | null;
  onSelect: (day: number) => void;
}) {
  const totalDays = marks.length;
  const progressPct =
    currentDay && totalDays > 1 ? (Math.min(currentDay, totalDays) - 1) / (totalDays - 1) * 100 : 0;

  return (
    <div className="border-t border-gray-100 px-6 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Timeline sprint ({totalDays} ngày)</h2>
          {overdueDays > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              Sprint quá hạn {overdueDays} ngày — chưa đóng sprint
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
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
              const clickable = mark.tasks.length > 0;
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
                      disabled={!clickable}
                      onClick={() => clickable && onSelect(mark.day)}
                      title={`Ngày ${mark.day} — ${style.hint}${mark.tasks.length ? ` (${mark.tasks.length} việc)` : ''}`}
                      className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] font-bold leading-none transition
                        ${style.cls}
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
                  {isToday && (
                    <span className="whitespace-nowrap text-[10px] font-semibold text-blue-600">hôm nay</span>
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

// ─── Công việc chung: SVK support ────────────────────────────────────────────

interface SvkUrgencyStat {
  count: number;
  maxWorkingDays: number;
  oldestKey: string;
}

interface SvkSummary {
  total: number;
  byUrgency: Record<Urgency, SvkUrgencyStat>;
  oldest: { key: string; summary: string; workingDays: number; plWorkingDays: number } | null;
}

const URGENCY_ORDER: Urgency[] = ['🔴', '🟡', '🟢'];

const URGENCY_META: Record<Urgency, { label: string; cls: string; num: string }> = {
  '🔴': { label: 'Cần xử lý gấp', cls: 'border-red-200 bg-red-50', num: 'text-red-600' },
  '🟡': { label: 'Đang theo dõi', cls: 'border-amber-200 bg-amber-50', num: 'text-amber-600' },
  '🟢': { label: 'Đã merge, chờ verify', cls: 'border-emerald-200 bg-emerald-50', num: 'text-emerald-600' },
};

async function loadSvkSummary(): Promise<SvkSummary> {
  const res = await supportAPI.getSvkTickets();
  const rows = buildRows((res.data as SvkTicketDoc[]) || []);

  const byUrgency = URGENCY_ORDER.reduce((acc, urgency) => {
    acc[urgency] = { count: 0, maxWorkingDays: 0, oldestKey: '' };
    return acc;
  }, {} as Record<Urgency, SvkUrgencyStat>);

  for (const row of rows) {
    const stat = byUrgency[row.urgency];
    stat.count += 1;
    if (row.workingDays > stat.maxWorkingDays) {
      stat.maxWorkingDays = row.workingDays;
      stat.oldestKey = row.doc.key;
    }
  }

  // buildRows đã sort theo tuổi PL rồi tới tuổi SVK -> phần tử đầu là ticket già nhất
  const top = [...rows].sort((a, b) => b.workingDays - a.workingDays)[0];

  return {
    total: rows.length,
    byUrgency,
    oldest: top
      ? {
          key: top.doc.key,
          summary: top.doc.summary,
          workingDays: top.workingDays,
          plWorkingDays: top.plWorkingDays,
        }
      : null,
  };
}

function SvkSupportCard({ summary, loading }: { summary: SvkSummary | null; loading: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Support SVK</h3>
          {summary && <span className="text-xs text-gray-400">{summary.total} ticket đang mở</span>}
        </div>
        <Link href="/support" className="text-xs font-medium text-blue-600 hover:underline">
          Mở trang Support →
        </Link>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded bg-gray-50" />
      ) : !summary || summary.total === 0 ? (
        <p className="text-sm font-medium text-green-600">✅ Không có ticket SVK nào đang mở</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {URGENCY_ORDER.map((urgency) => {
              const meta = URGENCY_META[urgency];
              const stat = summary.byUrgency[urgency];
              return (
                <div key={urgency} className={`rounded-lg border px-4 py-3 ${meta.cls}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg leading-none">{urgency}</span>
                    <span className={`text-2xl font-bold tabular-nums ${meta.num}`}>{stat.count}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-gray-600">{meta.label}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {stat.count === 0
                      ? '—'
                      : `Già nhất ${stat.maxWorkingDays} ngày công · ${stat.oldestKey}`}
                  </p>
                </div>
              );
            })}
          </div>

          {summary.oldest && (
            <p className="mt-3 text-xs text-gray-500">
              Ticket già nhất:{' '}
              <a
                href={`${JIRA_BASE}/browse/${summary.oldest.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-blue-600 hover:underline"
              >
                {summary.oldest.key}
              </a>{' '}
              — {summary.oldest.workingDays} ngày công
              {summary.oldest.plWorkingDays > 0 ? ` (PL link: ${summary.oldest.plWorkingDays} ngày công)` : ''}
              <span className="text-gray-400"> · {summary.oldest.summary}</span>
            </p>
          )}
        </>
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
  const [sprintClose, setSprintClose] = useState<SprintCloseResult | null>(null);
  const [sprintCloseLoading, setSprintCloseLoading] = useState(true);
  const [fixVerMigration, setFixVerMigration] = useState<FixVersionMigrationResult | null>(null);
  const [fixVerMigrationLoading, setFixVerMigrationLoading] = useState(true);
  const [svkSummary, setSvkSummary] = useState<SvkSummary | null>(null);
  const [svkLoading, setSvkLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
          loadSprintCloseCheck().then((result) => {
            setSprintClose(result);
            setSprintCloseLoading(false);
          }).catch(() => setSprintCloseLoading(false)),
          loadFixVersionMigration().then((result) => {
            setFixVerMigration(result);
            setFixVerMigrationLoading(false);
          }).catch(() => setFixVerMigrationLoading(false)),
          loadSvkSummary().then((result) => {
            setSvkSummary(result);
            setSvkLoading(false);
          }).catch(() => setSvkLoading(false)),
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
  const sprintCloseStatus: TaskStatus = sprintCloseLoading
    ? 'loading'
    : !sprintClose || sprintClose.overdueSprints.length === 0
    ? 'ok'
    : 'error';
  const fixVerMigrationStatus: TaskStatus = fixVerMigrationLoading
    ? 'loading'
    : !fixVerMigration || fixVerMigration.items.length === 0
    ? 'ok'
    : 'error';
  const fixVerStatus: TaskStatus = fixVerReviewLoading
    ? 'loading'
    : !fixVerReview || (fixVerReview.poReviewIssues.length === 0 && fixVerReview.notDoneIssues.length === 0)
    ? 'ok'
    : 'error';

  const { rawDay, totalDays: sprintTotalDays } = useMemo(
    () => getSprintDayInfo(sprintReports),
    [sprintReports]
  );
  // Timeline luôn 14 mốc; sprint quá hạn (rawDay > 14) coi như đang ở mốc cuối.
  const timelineDays = TIMELINE_DAYS;
  const currentSprintDay = rawDay === null ? null : Math.min(rawDay, timelineDays);
  const sprintOverdue = rawDay !== null && sprintTotalDays !== null && rawDay > sprintTotalDays;

  const dayTasks: DayTask[] = [
    {
      day: 1,
      title: 'Ngày 1 trở đi ticket đúng sprint',
      status: healthStatus,
      content: <SprintTicketHealthPanel result={sprintHealth} loading={sprintHealthLoading} />,
    },
    {
      day: 1,
      title: 'Đóng sprint cũ',
      status: sprintCloseStatus,
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
      title: 'Cập nhật sprint và fix version',
      status: sprintStatus,
      content: sprintLoading ? (
        <div className="py-6 text-center text-gray-500">Đang tải...</div>
      ) : (
        <SprintAlignmentDetail reports={sprintReports} loadError={sprintError} />
      ),
    },
    {
      day: 7,
      title: 'Ngày 7 trở đi xong hết subtask dev',
      status: devStatus,
      content: (
        <DevTicketTable
          tickets={devTickets}
          ticketCache={smTicketCache}
          reloadingAll={devReloadingAll}
          onReloadAll={handleReloadAllDev}
          loading={smLoading}
        />
      ),
    },
    {
      day: 9,
      title: 'Ngày 9 trở đi gửi UAT',
      status: uatStatus,
      content: smLoading ? (
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
      ),
    },
    {
      day: 13,
      title: 'Ngày 13 trở đi kiểm tra status PO và Fix version',
      status: fixVerStatus,
      content: (
        <FixVersionReviewPanel
          result={fixVerReview}
          loading={fixVerReviewLoading}
          onReload={reloadFixVerReview}
        />
      ),
    },
  ];

  const dayMarks = buildDayMarks(dayTasks, timelineDays, currentSprintDay);

  // mặc định luôn đứng ở ngày hôm nay — kể cả ngày đó không có việc,
  // để panel không hiện nhầm việc của ngày khác
  const defaultDay =
    currentSprintDay ?? dayMarks.find((mark) => mark.tasks.length > 0)?.day ?? 1;

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

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Tổng quan các việc cần quản lý</p>
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
          currentDay={currentSprintDay}
          overdueDays={sprintOverdue && rawDay !== null && sprintTotalDays !== null ? rawDay - sprintTotalDays : 0}
          selectedDay={activeDay}
          onSelect={setSelectedDay}
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
                onClick={() => setSelectedDay(suggestedMark.day)}
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
        <SvkSupportCard summary={svkSummary} loading={svkLoading} />
      </div>
    </div>
  );
}
