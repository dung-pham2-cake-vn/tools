import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sprintManagementAPI } from '@/utils/api';

export interface LoadedPage {
  pageId: string;
  title: string;
  loadedAt: string;
  url: string;
}

interface SprintTicket {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface CachedSprintTicket {
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

export interface SprintItem {
  number: number;
  icon: '🟢' | '🟡' | '🔴';
  teams: string[];
  prNumber: string;
  title: string;
  tickets: SprintTicket[];
}

interface SprintSection {
  name: string;
  emoji: string;
  items: SprintItem[];
}

interface SprintData {
  sections: SprintSection[];
  contributors?: Record<string, string>;
}

interface AnalysisResult {
  id: string;
  prompt: string;
  result: string;
  pageIds: string[];
  pagesTitles: string[];
  timestamp: string;
}

export const DEFAULT_SPRINT_PROMPT = `Phân tích dữ liệu Sprint Release từ Confluence. Xuất JSON hợp lệ DUY NHẤT, không thêm text hay markdown bên ngoài JSON.

Format JSON:
{
  "sections": [
    {
      "name": "Core",
      "emoji": "😤",
      "items": [
        {
          "number": 1,
          "icon": "🟢",
          "teams": ["Lend", "DOP", "Prec", "LOS"],
          "prNumber": "PR-1540",
          "title": "QTV-Payday (185+186+187/2)",
          "tickets": [
            { "id": "PL-12221", "name": "MWG QTV Payday Loan", "type": "Task", "status": "OPEN" }
          ]
        }
      ]
    },
    { "name": "Must have", "emoji": "😍", "items": [ ... ] }
  ],
  "contributors": {
    "Nguyễn Văn A": "Software Engineer",
    "Trần Thị B": "QA Manual Engineer"
  }
}

Quy tắc:
- Lấy tất cả mục: Core, Must have (bỏ mục nếu không có dữ liệu), không lấy Nice to have dù có dữ liệu
- icon: copy ĐÚNG emoji 🟢/🟡/🔴 được viết trực tiếp trong nội dung Confluence, KHÔNG tự map hay suy luận từ ticket status
- teams: mảng tên team, tách từ [Lend+DOP] → ["Lend","DOP"]
- prNumber: mã PR nếu có, ví dụ "PR-1540" hoặc ""
- ticket.type: "Epic", "Story", "Task", "Sub-task" — suy luận từ context, không rõ → "Không rõ"
- ticket.status: OPEN | IN CODING | IN TESTING | READY4TEST | IN PROGRESS | DRAFT | PO/TM REVIEW
- tickets = [] nếu không có sub-ticket
- contributors: object mapping full tên người → role của họ (Software Engineer, QA Manual Engineer, QA Automation Engineer, v.v.), lấy từ danh sách team/contributors trên Confluence
- Không thêm bất kỳ text nào ngoài JSON`;

export function extractSprintNumber(title: string): number {
  const m = title.match(/[Ss]print\s*(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

export function sprintPageLabel(title: string): string {
  const sprintNumber = extractSprintNumber(title);
  return sprintNumber > 0 ? `Sprint ${sprintNumber}` : title;
}

const HIDDEN_STATUSES = new Set(['REQUEST BOT TO DELETE', 'WILL NOT DO']);
function isHiddenStatus(status: string): boolean {
  return HIDDEN_STATUSES.has(status.toUpperCase().replace(/\s+/g, ' ').trim());
}

type StatusCategory = 'todo' | 'in-progress' | 'done' | 'other';

const TODO_STATUSES = new Set(['open', 'in coding', 'wait4dev']);
const IN_PROGRESS_STATUSES = new Set(['test failed', 'ready4test', 'in testing', 'in progress']);
const DONE_STATUSES = new Set(['po/tm review', 'will not do', 'done', 'ready4release', 'released', 'request bot to delete', 'test passed', 'invalid']);

function getStatusCategory(status: string): StatusCategory {
  const s = status.toLowerCase().replace(/\s+/g, ' ').trim();
  if (TODO_STATUSES.has(s)) return 'todo';
  if (IN_PROGRESS_STATUSES.has(s)) return 'in-progress';
  if (DONE_STATUSES.has(s)) return 'done';
  return 'other';
}

// ─── PO Status ───────────────────────────────────────────────────────────────

export type PoStatus = 'na' | 'need-uat' | 'sent-uat' | 'need-confirm' | 'confirmed';

export const PO_STATUS_CONFIG: Record<PoStatus, { label: string; cls: string }> = {
  na: { label: 'N/A', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  'need-uat': { label: 'Need UAT', cls: 'bg-red-50 text-red-700 border-red-300' },
  'sent-uat': { label: 'Sent UAT', cls: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  'need-confirm': { label: 'Need confirm', cls: 'bg-red-50 text-red-700 border-red-300' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
};

export function getItemStorageKey(pageId: string, item: SprintItem): string {
  const slug = item.prNumber ? `pr-${item.prNumber}` : `n-${item.number}`;
  return `smpo-${pageId}-${slug}`;
}

export function collectItemStoryFlags(
  item: SprintItem,
  cache: Record<string, CachedSprintTicket>
): { hasReleased: boolean; hasReady4Release: boolean; hasPOTMReview: boolean } {
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (!id || visited.has(id)) return;
    visited.add(id);
    (cache[id]?.children || []).forEach(walk);
  };
  item.tickets.forEach((t) => walk(t.id));

  let hasReleased = false;
  let hasReady4Release = false;
  let hasPOTMReview = false;

  for (const id of visited) {
    const t = cache[id];
    if (!t || t.type?.toLowerCase() !== 'story') continue;
    const s = (t.status || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (s === 'released') hasReleased = true;
    if (s === 'ready4release') hasReady4Release = true;
    if (s === 'po/tm review') hasPOTMReview = true;
  }
  return { hasReleased, hasReady4Release, hasPOTMReview };
}

export function derivePoStatus(
  flags: { hasReleased: boolean; hasReady4Release: boolean; hasPOTMReview: boolean },
  stored: PoStatus | null
): PoStatus {
  if (flags.hasReleased) return stored === 'confirmed' ? 'confirmed' : 'need-confirm';
  if (flags.hasReady4Release) return 'na';
  if (flags.hasPOTMReview) return stored === 'sent-uat' ? 'sent-uat' : 'need-uat';
  return stored ?? 'na';
}

function PoStatusBadge({
  item,
  ticketCache,
  pageId,
}: {
  item: SprintItem;
  ticketCache: Record<string, CachedSprintTicket>;
  pageId: string;
}) {
  const key = getItemStorageKey(pageId, item);
  const [stored, setStored] = useState<PoStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v && v in PO_STATUS_CONFIG) setStored(v as PoStatus);
    } catch {}
  }, [key]);

  const flags = collectItemStoryFlags(item, ticketCache);

  useEffect(() => {
    if (flags.hasReady4Release && stored !== null) {
      try { localStorage.removeItem(key); } catch {}
      setStored(null);
    }
  }, [flags.hasReady4Release, stored, key]);

  const effective = derivePoStatus(flags, stored);
  const cfg = PO_STATUS_CONFIG[effective];

  const pick = (status: PoStatus) => {
    try {
      if (status === 'na') {
        localStorage.removeItem(key);
        setStored(null);
      } else {
        localStorage.setItem(key, status);
        setStored(status);
      }
    } catch {}
    setOpen(false);
  };

  return (
    <div className="relative ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border cursor-pointer select-none ${cfg.cls}`}
      >
        PO: {cfg.label}
        <span className="opacity-40 text-[10px]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px]">
            {(Object.entries(PO_STATUS_CONFIG) as [PoStatus, { label: string; cls: string }][]).map(([s, c]) => (
              <button
                key={s}
                onClick={() => pick(s)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                <span className={`inline-flex px-1.5 py-0.5 rounded border font-medium ${c.cls}`}>{c.label}</span>
                {effective === s && <span className="ml-auto text-gray-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase().replace(/\s+/g, ' ').trim();
  if (['OPEN', 'DRAFT'].includes(s)) return 'bg-gray-100 text-gray-900 border-gray-100';
  if (['IN CODING', 'IN PROGRESS', 'READY4TEST', 'IN TESTING', 'TEST FAILED'].includes(s)) {
    return 'bg-blue-50 text-blue-900 border-blue-200';
  }
  if (['PO/TM REVIEW', 'READY4RELEASE', 'RELEASED', 'WILL NOT DO', 'REQUEST BOT TO DELETE', 'DONE'].includes(s)) {
    return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  }
  return 'bg-gray-100 text-gray-700 border-gray-100';
}

function typeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'epic') return 'bg-purple-50 text-purple-700 border border-purple-100';
  if (t === 'story') return 'bg-lime-50 text-lime-700 border border-lime-100';
  if (t === 'task') return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (t === 'bug' || t === 'defect') return 'bg-red-50 text-red-700 border border-red-100';
  if (t.includes('subtask') || t.includes('sub-task')) return 'bg-blue-50 text-blue-700 border border-blue-100';
  return 'bg-slate-50 text-slate-600 border border-slate-100';
}

function stripRoleSuffix(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim();
}

function extractRoleFromAssignee(rawAssignee: string): string {
  const match = rawAssignee.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : '';
}

function shortName(fullName: string): string {
  if (!fullName || fullName === '-' || fullName === 'Unassigned') return fullName || 'Unassigned';
  const clean = stripRoleSuffix(fullName);
  const parts = clean.split(/\s+/);
  if (parts.length <= 2) return clean;
  return `${parts[parts.length - 1]} ${parts[0]}`;
}

function IssueTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase().replace(/\s+/g, '').replace(/_/g, '-');
  if (t === 'epic') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
      </svg>
    );
  }
  if (t === 'story') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-lime-700" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h12v17l-6-4-6 4V4Z" />
      </svg>
    );
  }
  if (t === 'defect') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m13 6-3 6h4l-3 6" />
      </svg>
    );
  }
  if (t === 'sub-task' || t === 'subtask') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="8" height="8" rx="1.5" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" />
      </svg>
    );
  }
  if (t === 'mobile-subtask' || t === 'mobile-sub-task') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="3" width="8" height="18" rx="1.5" />
          <path d="M11 18h2" />
        </svg>
      </span>
    );
  }
  if (t === 'backend-subtask' || t === 'backend-sub-task') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      </span>
    );
  }
  if (t === 'web-subtask' || t === 'web-sub-task') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5.5 17.5 12 12 18.5 6.5 12 12 5.5Z" />
          <path d="M8 8c2.5 2.5 5.5 5.5 8 8" />
          <path d="M16 8c-2.5 2.5-5.5 5.5-8 8" />
        </svg>
      </span>
    );
  }
  if (t === 'qa-subtask' || t === 'qa-sub-task') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="5" />
          <path d="m14 14 5 5" />
        </svg>
      </span>
    );
  }
  if (t === 'design-subtask' || t === 'design-sub-task') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v4" />
          <path d="M8 21h8" />
          <path d="M5 16c3.5-.5 5.5-3 7-9 1.5 6 3.5 8.5 7 9" />
          <path d="m7 12 5 3 5-3" />
        </svg>
      </span>
    );
  }
  if (t === 'bug') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8a4 4 0 0 1 8 0v9a4 4 0 0 1-8 0V8Z" />
        <path d="M3 13h5M16 13h5M4 19l4-2M16 17l4 2M4 7l4 2M16 9l4-2M12 4V2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.5 14.5A6 6 0 1 1 15.5 14c-.9.7-1.5 1.7-1.5 3h-4c0-1.2-.6-2-1.5-2.5Z" />
    </svg>
  );
}

function parseSprintJSON(raw: string): SprintData | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned) as SprintData;
  } catch {
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      const sectionsMatch = cleaned.match(/"sections"\s*:\s*\[/);
      if (!sectionsMatch) return null;
      const partial = cleaned.replace(/,?\s*\{[^{}]*$/, '').replace(/,?\s*\[[^[]*$/, '');
      const fixedAttempts = [partial + ']}', partial + ']}]}', partial + ']}}', partial + ']}]}'];
      for (const attempt of fixedAttempts) {
        try {
          const parsed = JSON.parse(attempt) as SprintData;
          if (parsed?.sections?.length) return parsed;
        } catch {
          // try next recovery shape
        }
      }
    } catch {
      // ignore recovery failures
    }
    return null;
  }
}

function collectTicketIds(data: SprintData | null): string[] {
  if (!data) return [];
  return Array.from(new Set(
    data.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.tickets.map((ticket) => ticket.id).filter(Boolean)
      )
    )
  ));
}

function assigneeKey(rawAssignee: string | undefined): string {
  return stripRoleSuffix(rawAssignee || '') || 'Unassigned';
}

// ─── Ticket row renderer ──────────────────────────────────────────────────────

function renderTicketRows({
  jiraBase,
  ticketCache,
  formatDate,
  showChildTickets,
  filterAssignees,
  filterStatusCategory,
  hideClosedStatuses,
  collapsedTicketIds,
  onToggleTicket,
  ticket,
  depth = 0,
  visited = new Set<string>(),
}: {
  jiraBase: string;
  ticketCache: Record<string, CachedSprintTicket>;
  formatDate: (iso: string) => string;
  showChildTickets: boolean;
  filterAssignees: string[] | null;
  filterStatusCategory: StatusCategory | null;
  hideClosedStatuses: boolean;
  collapsedTicketIds: Set<string>;
  onToggleTicket: (id: string) => void;
  ticket: SprintTicket | CachedSprintTicket;
  depth?: number;
  visited?: Set<string>;
}): React.ReactNode[] {
  if (!ticket?.id || visited.has(ticket.id)) return [];

  const cached = ticketCache[ticket.id];
  const displayTicket = {
    ...ticket,
    ...cached,
    name: cached?.name || ticket.name,
    type: cached?.type || ticket.type,
    status: cached?.status || ticket.status,
  };
  const childIds = cached?.children || [];
  const rowKeyPrefix = `${ticket.id}-${depth}`;
  const childVisited = new Set(visited);
  childVisited.add(ticket.id);

  const recurseChildren = (resetDepth: boolean): React.ReactNode[] => {
    const childRows: React.ReactNode[] = [];
    childIds.forEach((childId) => {
      const child = ticketCache[childId];
      if (!child) return;
      childRows.push(...renderTicketRows({
        jiraBase, ticketCache, formatDate, showChildTickets,
        filterAssignees, filterStatusCategory, hideClosedStatuses,
        collapsedTicketIds, onToggleTicket,
        ticket: child,
        depth: resetDepth ? 0 : depth + 1,
        visited: childVisited,
      }));
    });
    return childRows;
  };

  const isCollapsed = collapsedTicketIds.has(ticket.id);
  const hasChildren = childIds.length > 0;

  if (hideClosedStatuses && isHiddenStatus(displayTicket.status)) {
    // Hidden from display but still recurse to surface matching children
    return (filterAssignees !== null || filterStatusCategory !== null) ? recurseChildren(true) : [];
  }

  // When a filter is active: only render self if directly matches; skip otherwise and recurse
  if (filterAssignees !== null || filterStatusCategory !== null) {
    const selfMatchAssignee = filterAssignees === null || filterAssignees.includes(assigneeKey(displayTicket.assignee));
    const selfMatchStatus = filterStatusCategory === null || getStatusCategory(displayTicket.status) === filterStatusCategory;

    if (!selfMatchAssignee || !selfMatchStatus) {
      return recurseChildren(true);
    }
    // Self matches: render self, then also recurse children (they may also match)
  }

  const rowClassName = depth === 0
    ? 'border-t border-gray-100 hover:bg-gray-50 transition-colors'
    : 'border-t border-gray-100 bg-slate-50 hover:bg-slate-100 transition-colors';

  const rows: React.ReactNode[] = [
    (
      <tr key={rowKeyPrefix} className={rowClassName}>
        <td className="px-3 py-2" style={{ paddingLeft: `${32 + depth * 24}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                onClick={() => onToggleTicket(ticket.id)}
                className="text-gray-400 hover:text-gray-600 text-[10px] w-3 shrink-0 select-none"
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <IssueTypeIcon type={displayTicket.type} />
            <a
              href={`${jiraBase}/browse/${ticket.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold hover:underline"
            >
              {ticket.id}
            </a>
          </div>
        </td>
        <td className={`px-3 py-2 text-sm ${depth === 0 ? 'text-gray-700' : 'text-gray-600'}`}>
          {depth > 0 && <span className="text-xs text-gray-400 mr-2">{'↳'.repeat(Math.min(depth, 6))}</span>}
          {displayTicket.name}
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${typeBadgeClass(displayTicket.type)}`}>
            <IssueTypeIcon type={displayTicket.type} />
            {displayTicket.type}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadgeClass(displayTicket.status)}`}>
            {displayTicket.status}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-gray-700">
          {shortName(displayTicket.assignee) || 'Unassigned'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500">
          {cached?.fixVersions?.length ? cached.fixVersions.join(', ') : '-'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500 font-mono text-center">
          {displayTicket.storyPoints ? displayTicket.storyPoints : '-'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500">
          {cached?.lastUpdatedAt ? formatDate(cached.lastUpdatedAt) : '-'}
        </td>
      </tr>
    ),
  ];

  if (!showChildTickets || isCollapsed) return rows;

  rows.push(...recurseChildren(false));

  return rows;
}

// ─── Sprint section table (single section) ────────────────────────────────────

function SprintSectionTable({
  section,
  jiraBase,
  ticketCache,
  formatDate,
  showChildTickets,
  filterAssignees,
  filterStatusCategory,
  hideClosedStatuses,
  pageId,
}: {
  section: SprintSection;
  jiraBase: string;
  ticketCache: Record<string, CachedSprintTicket>;
  formatDate: (iso: string) => string;
  showChildTickets: boolean;
  filterAssignees: string[] | null;
  filterStatusCategory: StatusCategory | null;
  hideClosedStatuses: boolean;
  pageId: string;
}) {
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [collapsedTicketIds, setCollapsedTicketIds] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onToggleTicket = (id: string) => {
    setCollapsedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const itemKey = (item: SprintItem) => item.prNumber || String(item.number);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Danh sách ticket</p>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket ID</th>
            <th className="text-left px-3 py-2 font-semibold">Tên Ticket</th>
            <th className="text-left px-3 py-2 font-semibold w-[90px]">Loại</th>
            <th className="text-left px-3 py-2 font-semibold w-[130px]">Trạng thái</th>
            <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
            <th className="text-left px-3 py-2 font-semibold w-[140px]">Fix Version</th>
            <th className="text-left px-3 py-2 font-semibold w-[52px]">SP</th>
            <th className="text-left px-3 py-2 font-semibold w-[170px]">Last update</th>
          </tr>
        </thead>
        <tbody>
          {section.items.map((item) => {
            const key = itemKey(item);
            const collapsed = collapsedItems.has(key);
            return (
              <React.Fragment key={item.number}>
                <tr className="bg-blue-50 border-t border-blue-100">
                  <td colSpan={8} className="px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleItem(key)}
                        className="text-gray-400 hover:text-gray-600 text-xs font-mono w-4 shrink-0 select-none"
                        title={collapsed ? 'Mở rộng' : 'Thu gọn'}
                      >
                        {collapsed ? '▶' : '▼'}
                      </button>
                      <span className="text-xs text-gray-400 font-mono min-w-[18px]">{item.number}.</span>
                      <span className="text-base leading-none">{item.icon}</span>
                      {item.teams.length > 0 && (
                        <span className="font-bold text-blue-700 text-sm">
                          [{item.teams.join('+')}]
                        </span>
                      )}
                      {item.prNumber && (
                        <a
                          href={`${jiraBase}/browse/${item.prNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:underline hover:text-blue-700"
                        >
                          {item.prNumber}
                        </a>
                      )}
                      <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                      <PoStatusBadge item={item} ticketCache={ticketCache} pageId={pageId} />
                    </div>
                  </td>
                </tr>

                {!collapsed && (
                  item.tickets.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td colSpan={8} className="px-3 py-1.5 text-xs text-red-500 italic pl-10">
                        Không có sub-ticket
                      </td>
                    </tr>
                  ) : (
                    item.tickets.map((ticket, ti) => (
                      <React.Fragment key={ticket.id || ti}>
                        {renderTicketRows({
                          jiraBase,
                          ticketCache,
                          formatDate,
                          showChildTickets,
                          filterAssignees,
                          filterStatusCategory,
                          hideClosedStatuses,
                          collapsedTicketIds,
                          onToggleTicket,
                          ticket,
                        })}
                      </React.Fragment>
                    ))
                  )
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ─── Summary table (per section) ─────────────────────────────────────────────

function SprintSummaryTable({
  sections,
  ticketCache,
  filterAssignees,
  onSelectAssignee,
  onSelectRole,
  hideClosedStatuses,
  filterStatusCategory,
  onSelectStatusFilter,
  onClearFilters,
}: {
  sections: SprintSection[];
  ticketCache: Record<string, CachedSprintTicket>;
  filterAssignees: string[] | null;
  onSelectAssignee: (name: string) => void;
  onSelectRole: (assignees: string[]) => void;
  hideClosedStatuses: boolean;
  filterStatusCategory: StatusCategory | null;
  onSelectStatusFilter: (assignee: string, category: StatusCategory) => void;
  onClearFilters: () => void;
}) {
  const ROLE_ORDER: Record<string, number> = {
    'Software Engineer': 1,
    'Mobile Engineer': 2,
    'QA Manual Engineer': 3,
    'QA Automation Engineer': 4,
    'Tech Product Manager': 5,
  };

  function normalizeRole(raw: string): string {
    const t = raw.toLowerCase();
    if (t.includes('software engineer')) return 'Software Engineer';
    if (t.includes('mobile engineer')) return 'Mobile Engineer';
    if (t.includes('qa manual')) return 'QA Manual Engineer';
    if (t.includes('qa automation')) return 'QA Automation Engineer';
    if (t.includes('tech product manager') || t.includes('product manager') || t.includes('product owner')) return 'Tech Product Manager';
    return raw;
  }

  const allTicketIds = new Set<string>();
  function collectDescendants(id: string, visited = new Set<string>()) {
    if (visited.has(id)) return;
    visited.add(id);
    allTicketIds.add(id);
    ticketCache[id]?.children?.forEach((childId) => collectDescendants(childId, visited));
  }

  for (const section of sections) {
    for (const item of section.items) {
      for (const ticket of item.tickets) {
        collectDescendants(ticket.id);
      }
    }
  }

  const assigneeMap = new Map<string, { count: number; points: number; rawAssignee: string; todo: number; inProgress: number; done: number; other: number }>();
  for (const ticketId of allTicketIds) {
    const cached = ticketCache[ticketId];
    if (hideClosedStatuses && cached && isHiddenStatus(cached.status)) continue;
    const rawAssignee = cached?.assignee || '';
    const clean = stripRoleSuffix(rawAssignee) || 'Unassigned';
    const entry = assigneeMap.get(clean) || { count: 0, points: 0, rawAssignee: rawAssignee || 'Unassigned', todo: 0, inProgress: 0, done: 0, other: 0 };
    entry.count++;
    if ((cached?.type || '').toLowerCase() !== 'story') {
      entry.points += cached?.storyPoints || 0;
    }
    const cat = getStatusCategory(cached?.status || '');
    if (cat === 'todo') entry.todo++;
    else if (cat === 'in-progress') entry.inProgress++;
    else if (cat === 'done') entry.done++;
    else entry.other++;
    assigneeMap.set(clean, entry);
  }

  function resolveRole(_cleanName: string, rawAssignee: string): string {
    return normalizeRole(extractRoleFromAssignee(rawAssignee));
  }

  const sorted = Array.from(assigneeMap.entries()).sort((a, b) => {
    if (a[0] === 'Unassigned' && b[0] !== 'Unassigned') return 1;
    if (b[0] === 'Unassigned' && a[0] !== 'Unassigned') return -1;
    const roleA = resolveRole(a[0], a[1].rawAssignee);
    const roleB = resolveRole(b[0], b[1].rawAssignee);
    const orderA = ROLE_ORDER[roleA] ?? 99;
    const orderB = ROLE_ORDER[roleB] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (b[1].points - a[1].points) || a[0].localeCompare(b[0]);
  });

  const totalTickets = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.count, 0);
  const totalPoints = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.points, 0);
  const totalTodo = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.todo, 0);
  const totalInProgress = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.inProgress, 0);
  const totalDone = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.done, 0);
  const totalOther = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.other, 0);

  if (sorted.length === 0) return null;

  const [open, setOpen] = useState(false);

  const grouped: { role: string; members: typeof sorted }[] = [];
  for (const entry of sorted) {
    const role = resolveRole(entry[0], entry[1].rawAssignee);
    const last = grouped[grouped.length - 1];
    if (last && last.role === role) {
      last.members.push(entry);
    } else {
      grouped.push({ role, members: [entry] });
    }
  }

  const isAssigneeFiltered = (assignee: string) => filterAssignees?.includes(assignee) ?? false;
  const isRoleFiltered = (members: typeof sorted) => filterAssignees !== null && members.every(([name]) => filterAssignees.includes(name)) && members.length === filterAssignees.length;

  const catCellClass = (cat: StatusCategory, assignee: string) => {
    const isActive = isAssigneeFiltered(assignee) && filterStatusCategory === cat;
    const baseHover = cat === 'todo' ? 'hover:bg-yellow-50' : cat === 'in-progress' ? 'hover:bg-blue-50' : cat === 'done' ? 'hover:bg-emerald-50' : 'hover:bg-orange-50';
    const activeClass = cat === 'todo' ? 'bg-yellow-100 font-bold' : cat === 'in-progress' ? 'bg-blue-100 font-bold' : cat === 'done' ? 'bg-emerald-100 font-bold' : 'bg-orange-100 font-bold';
    return `px-4 py-2.5 text-sm text-center cursor-pointer transition-colors ${isActive ? activeClass : baseHover}`;
  };

  const filterLabel = filterAssignees
    ? filterAssignees.length === 1
      ? shortName(filterAssignees[0])
      : `${filterAssignees.length} người`
    : null;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-6 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-mono">{open ? '▼' : '▶'}</span>
          <h3 className="font-bold text-gray-900 text-sm">Summary theo cá nhân</h3>
        </div>
        {(filterAssignees || filterStatusCategory) && (
          <span
            onClick={(e) => { e.stopPropagation(); onClearFilters(); }}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            ✕ Bỏ filter{filterLabel ? `: ${filterLabel}` : ''}{filterStatusCategory ? ` (${filterStatusCategory})` : ''}
          </span>
        )}
      </button>
      {open && <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 font-semibold">Assignee</th>
              <th className="text-left px-4 py-2.5 font-semibold">Role</th>
              <th className="text-center px-4 py-2.5 font-semibold">Tổng SP</th>
              <th className="text-center px-4 py-2.5 font-semibold">Tổng ticket</th>
              <th className="text-center px-4 py-2.5 font-semibold text-yellow-700">Todo</th>
              <th className="text-center px-4 py-2.5 font-semibold text-blue-700">In-progress</th>
              <th className="text-center px-4 py-2.5 font-semibold text-emerald-700">Done</th>
              <th className="text-center px-4 py-2.5 font-semibold text-orange-700">Other</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => {
              const groupMemberNames = group.members.map(([name]) => name);
              const groupTickets = group.members.reduce((s, [, m]) => s + m.count, 0);
              const groupPoints = group.members.reduce((s, [, m]) => s + m.points, 0);
              const groupTodo = group.members.reduce((s, [, m]) => s + m.todo, 0);
              const groupInProgress = group.members.reduce((s, [, m]) => s + m.inProgress, 0);
              const groupDone = group.members.reduce((s, [, m]) => s + m.done, 0);
              const groupOther = group.members.reduce((s, [, m]) => s + m.other, 0);
              const groupSelected = isRoleFiltered(group.members);
              return (
                <React.Fragment key={group.role || '__none__'}>
                  <tr
                    className={`border-t border-blue-100 cursor-pointer transition-colors ${groupSelected ? 'bg-blue-200 hover:bg-blue-300' : 'bg-blue-50 hover:bg-blue-100'}`}
                    onClick={() => onSelectRole(groupMemberNames)}
                    title="Lọc theo role này"
                  >
                    <td className="px-4 py-2 text-sm font-bold text-blue-800" colSpan={2}>
                      {group.role || 'Khác'}
                      {groupSelected && <span className="ml-2 text-xs font-normal text-blue-600">▶ đang lọc</span>}
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupPoints}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupTickets}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupTodo || '-'}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupInProgress || '-'}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupDone || '-'}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupOther || '-'}</td>
                  </tr>
                  {group.members.map(([assignee, stats]) => {
                    const isSelected = isAssigneeFiltered(assignee);
                    return (
                      <tr
                        key={assignee}
                        onClick={() => onSelectAssignee(assignee)}
                        className={`border-t border-gray-100 cursor-pointer transition-colors ${isSelected && !filterStatusCategory ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-gray-50'}`}
                      >
                        <td className={`px-4 py-2.5 text-sm font-medium pl-8 ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {shortName(assignee)}
                          {isSelected && !filterStatusCategory && <span className="ml-1.5 text-xs text-blue-500">▶ đang lọc</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{group.role || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 text-center font-semibold">{stats.points || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 text-center font-semibold">{stats.count}</td>
                        {(['todo', 'in-progress', 'done', 'other'] as StatusCategory[]).map((cat) => {
                          const cnt = cat === 'todo' ? stats.todo : cat === 'in-progress' ? stats.inProgress : cat === 'done' ? stats.done : stats.other;
                          return (
                            <td
                              key={cat}
                              className={catCellClass(cat, assignee)}
                              onClick={(e) => { e.stopPropagation(); onSelectStatusFilter(assignee, cat); }}
                            >
                              {cnt || '-'}
                              {isSelected && filterStatusCategory === cat && (
                                <span className="ml-1 text-xs opacity-60">▶</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-2.5 text-sm text-gray-900" colSpan={2}>Tổng cộng</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalPoints}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalTickets}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalTodo || '-'}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalInProgress || '-'}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalDone || '-'}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalOther || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SprintManagementAnalysis({ page }: { page: LoadedPage }) {
  const [parsing, setParsing] = useState(false);
  const [reloadingPage, setReloadingPage] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [ticketCache, setTicketCache] = useState<Record<string, CachedSprintTicket>>({});
  const [reloadingTicketIds, setReloadingTicketIds] = useState<Set<string>>(new Set());
  const [showChildTickets, setShowChildTickets] = useState(true);
  const [hideClosedStatuses, setHideClosedStatuses] = useState(true);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedRoleAssignees, setSelectedRoleAssignees] = useState<string[] | null>(null);
  const [filterStatusCategory, setFilterStatusCategory] = useState<StatusCategory | null>(null);

  // Computed filter: role takes precedence over single assignee
  const filterAssignees: string[] | null = selectedRoleAssignees ?? (selectedAssignee ? [selectedAssignee] : null);

  const handleSelectAssignee = (name: string) => {
    setSelectedRoleAssignees(null);
    setSelectedAssignee((prev) => (prev === name ? null : name));
    setFilterStatusCategory(null);
  };

  const handleSelectRole = (assignees: string[]) => {
    setSelectedAssignee(null);
    setFilterStatusCategory(null);
    setSelectedRoleAssignees((prev) => {
      if (prev && prev.length === assignees.length && prev.every((a) => assignees.includes(a))) return null;
      return assignees;
    });
  };

  const handleSelectStatusFilter = (assignee: string, category: StatusCategory) => {
    setSelectedRoleAssignees(null);
    const isSame = selectedAssignee === assignee && filterStatusCategory === category;
    setSelectedAssignee(isSame ? null : assignee);
    setFilterStatusCategory(isSame ? null : category);
  };

  const handleClearFilters = () => {
    setSelectedAssignee(null);
    setSelectedRoleAssignees(null);
    setFilterStatusCategory(null);
  };

  const jiraBase = page.url ? page.url.split('/wiki')[0] : 'https://cakedigitalbank.atlassian.net';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const loadTicketCache = useCallback(async (ticketIds: string[]) => {
    if (!ticketIds.length) { setTicketCache({}); return; }
    try {
      const res = await sprintManagementAPI.getTickets(ticketIds);
      setTicketCache((prev) => ({ ...prev, ...(res.data.data || {}) }));
    } catch {
      // non-critical
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const res = await sprintManagementAPI.getResults();
      const data: AnalysisResult[] = res.data.data || [];
      const pageResults = data.filter((r) => r.pageIds?.includes(page.pageId));
      setResults(pageResults);
      const latestParsed = pageResults[0] ? parseSprintJSON(pageResults[0].result) : null;
      await loadTicketCache(collectTicketIds(latestParsed));
    } catch {
      // non-critical
    } finally {
      setLoadingResults(false);
    }
  }, [loadTicketCache, page.pageId]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleReloadPage = async () => {
    setReloadingPage(true);
    try {
      await sprintManagementAPI.loadPage(page.pageId);
      toast.success('Đã reload từ Confluence');
    } catch (err: any) {
      toast.error(`Lỗi: ${err?.response?.data?.error || err.message}`);
    } finally {
      setReloadingPage(false);
    }
  };

  const handleParseByScript = async () => {
    setParsing(true);
    try {
      const res = await sprintManagementAPI.parseByScript({ pageIds: [page.pageId] });
      const entry: AnalysisResult = res.data.data;
      setResults((prev) => [entry, ...prev]);
      await loadTicketCache(collectTicketIds(parseSprintJSON(entry.result)));
      toast.success('Parse xong');
    } catch (err: any) {
      toast.error(`Lỗi: ${err?.response?.data?.error || err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleReloadTickets = async (ticketIds: string[]) => {
    const ids = Array.from(new Set(ticketIds.filter(Boolean)));
    if (!ids.length) return;
    setReloadingTicketIds((prev) => new Set([...prev, ...ids]));
    try {
      const res = await sprintManagementAPI.reloadTickets(ids);
      setTicketCache((prev) => ({ ...prev, ...(res.data.data || {}) }));
      toast.success(ids.length === 1 ? `Đã reload ${ids[0]}` : `Đã reload ${ids.length} tickets`);
    } catch (err: any) {
      toast.error(`Reload Jira thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setReloadingTicketIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const latestResult = results[0] || null;
  const latestParsed = latestResult ? parseSprintJSON(latestResult.result) : null;
  const latestTicketIds = collectTicketIds(latestParsed);

  // Split sections by name for structured rendering
  const getSection = (name: string) => latestParsed?.sections.find((s) => s.name === name) ?? null;
  const coreSection = getSection('Core');
  const mustHaveSection = getSection('Must have');
  const niceToHaveSection = getSection('Nice to have');

  const commonSectionProps = {
    jiraBase,
    ticketCache,
    formatDate,
    showChildTickets,
    filterAssignees,
    filterStatusCategory,
    hideClosedStatuses,
    pageId: page.pageId,
  };

  const commonSummaryProps = {
    ticketCache,
    filterAssignees,
    onSelectAssignee: handleSelectAssignee,
    onSelectRole: handleSelectRole,
    hideClosedStatuses,
    filterStatusCategory,
    onSelectStatusFilter: handleSelectStatusFilter,
    onClearFilters: handleClearFilters,
  };

  return (
    <div className="space-y-6 pb-48">
      {/* Step 1: Confluence + Parse */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
            Dữ liệu Confluence
            <span className="text-xs text-gray-400 font-normal ml-1">({page.title})</span>
          </h2>
        </div>
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleReloadPage}
            disabled={reloadingPage || parsing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
          >
            {reloadingPage ? <><span className="animate-spin inline-block">⏳</span> Đang reload...</> : '☁️ Reload từ Confluence'}
          </button>
          <button
            onClick={handleParseByScript}
            disabled={parsing || reloadingPage}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
          >
            {parsing ? <><span className="animate-spin inline-block">⏳</span> Đang parse...</> : '⚙️ Parse bằng Script'}
          </button>
        </div>
      </div>

      {/* Step 2: Parsed data */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Dữ liệu đã phân tích</h2>
              {latestResult && (
                <p className="text-xs text-gray-400 mt-0.5">Mới nhất: {formatDate(latestResult.timestamp)}</p>
              )}
            </div>
            {latestParsed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChildTickets((prev) => !prev)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                >
                  {showChildTickets ? 'Thu gọn ticket con' : 'Hiện ticket con'}
                </button>
                <button
                  onClick={() => setHideClosedStatuses((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${hideClosedStatuses ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {hideClosedStatuses ? 'Đang ẩn WND/RBD' : 'Hiện WND/RBD'}
                </button>
                <button
                  onClick={() => handleReloadTickets(latestTicketIds)}
                  disabled={latestTicketIds.length === 0 || reloadingTicketIds.size > 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {reloadingTicketIds.size > 0 ? 'Đang reload Jira...' : 'Reload Jira'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loadingResults ? (
          <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : !latestParsed ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            {results.length === 0
              ? 'Chưa có dữ liệu cho page này. Bấm "Parse bằng Script" để bắt đầu.'
              : 'Không parse được JSON.'}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-8">
            {/* Core section */}
            {coreSection && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{coreSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{coreSection.name}</h3>
                  <span className="text-xs text-gray-400">({coreSection.items.length} items)</span>
                </div>
                <SprintSectionTable section={coreSection} {...commonSectionProps} />
              </div>
            )}

            {/* Must have: summary above table */}
            {mustHaveSection && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">{mustHaveSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{mustHaveSection.name}</h3>
                  <span className="text-xs text-gray-400">({mustHaveSection.items.length} items)</span>
                </div>
                <SprintSummaryTable sections={[mustHaveSection]} {...commonSummaryProps} />
                <SprintSectionTable section={mustHaveSection} {...commonSectionProps} />
              </div>
            )}

            {/* Nice to have: summary above table */}
            {niceToHaveSection && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">{niceToHaveSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{niceToHaveSection.name}</h3>
                  <span className="text-xs text-gray-400">({niceToHaveSection.items.length} items)</span>
                </div>
                <SprintSummaryTable sections={[niceToHaveSection]} {...commonSummaryProps} />
                <SprintSectionTable section={niceToHaveSection} {...commonSectionProps} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
