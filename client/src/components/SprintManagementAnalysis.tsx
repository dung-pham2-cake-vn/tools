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

interface CachedSprintTicket {
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

interface SprintItem {
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

function renderTicketRows({
  jiraBase,
  ticketCache,
  reloadingTicketIds,
  onReloadTicket,
  formatDate,
  showChildTickets,
  ticket,
  depth = 0,
  visited = new Set<string>(),
}: {
  jiraBase: string;
  ticketCache: Record<string, CachedSprintTicket>;
  reloadingTicketIds: Set<string>;
  onReloadTicket: (ticketId: string) => void;
  formatDate: (iso: string) => string;
  showChildTickets: boolean;
  ticket: SprintTicket | CachedSprintTicket;
  depth?: number;
  visited?: Set<string>;
}): React.ReactNode[] {
  if (!ticket?.id || visited.has(ticket.id)) {
    return [];
  }

  const cached = ticketCache[ticket.id];
  const displayTicket = {
    ...ticket,
    ...cached,
    name: cached?.name || ticket.name,
    type: cached?.type || ticket.type,
    status: cached?.status || ticket.status,
  };
  const isReloading = reloadingTicketIds.has(ticket.id);
  const childIds = cached?.children || [];
  const rowKeyPrefix = `${ticket.id}-${depth}`;
  const childVisited = new Set(visited);
  childVisited.add(ticket.id);
  const rowClassName = depth === 0
    ? 'border-t border-gray-100 hover:bg-gray-50 transition-colors'
    : 'border-t border-gray-100 bg-slate-50 hover:bg-slate-100 transition-colors';

  const rows: React.ReactNode[] = [
    (
      <tr key={rowKeyPrefix} className={rowClassName}>
        <td className="px-3 py-2" style={{ paddingLeft: `${32 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
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
        <td className="px-3 py-2 text-xs text-gray-500 font-mono text-center">
          {displayTicket.storyPoints ? displayTicket.storyPoints : '-'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500">
          {cached?.lastUpdatedAt ? formatDate(cached.lastUpdatedAt) : '-'}
        </td>
        <td className="px-3 py-2">
          <button
            onClick={() => onReloadTicket(ticket.id)}
            disabled={isReloading}
            className="px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isReloading ? '...' : 'Reload'}
          </button>
        </td>
      </tr>
    ),
  ];

  if (!showChildTickets) return rows;

  childIds.forEach((childId) => {
    const child = ticketCache[childId];
    if (!child) return;
    rows.push(...renderTicketRows({
      jiraBase,
      ticketCache,
      reloadingTicketIds,
      onReloadTicket,
      formatDate,
      showChildTickets,
      ticket: child,
      depth: depth + 1,
      visited: childVisited,
    }));
  });

  return rows;
}

function SprintTable({
  data,
  jiraBase,
  ticketCache,
  reloadingTicketIds,
  onReloadTicket,
  formatDate,
  showChildTickets,
}: {
  data: SprintData;
  jiraBase: string;
  ticketCache: Record<string, CachedSprintTicket>;
  reloadingTicketIds: Set<string>;
  onReloadTicket: (ticketId: string) => void;
  formatDate: (iso: string) => string;
  showChildTickets: boolean;
}) {
  return (
    <div className="space-y-6">
      {data.sections.map((section) => (
        <div key={section.name}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{section.emoji}</span>
            <h3 className="font-bold text-gray-900">{section.name}</h3>
            <span className="text-xs text-gray-400">({section.items.length} items)</span>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket ID</th>
                  <th className="text-left px-3 py-2 font-semibold">Tên Ticket</th>
                  <th className="text-left px-3 py-2 font-semibold w-[90px]">Loại</th>
                  <th className="text-left px-3 py-2 font-semibold w-[130px]">Trạng thái</th>
                  <th className="text-left px-3 py-2 font-semibold w-[150px]">Assignee</th>
                  <th className="text-left px-3 py-2 font-semibold w-[52px]">SP</th>
                  <th className="text-left px-3 py-2 font-semibold w-[170px]">Last update</th>
                  <th className="text-left px-3 py-2 font-semibold w-[90px]"></th>
                </tr>
              </thead>
              <tbody>
                {data.sections.length > 0 && section.items.map((item) => (
                  <React.Fragment key={item.number}>
                    <tr className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={8} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        </div>
                      </td>
                    </tr>

                    {item.tickets.length === 0 ? (
                      <tr className="border-t border-gray-100">
                        <td colSpan={8} className="px-3 py-1.5 text-xs text-red-500 italic pl-10">
                          Không có sub-ticket
                        </td>
                      </tr>
                    ) : (
                      item.tickets.map((ticket, ti) => {
                        return (
                          <React.Fragment key={ticket.id || ti}>
                            {renderTicketRows({
                              jiraBase,
                              ticketCache,
                              reloadingTicketIds,
                              onReloadTicket,
                              formatDate,
                              showChildTickets,
                              ticket,
                            })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintSummaryTable({
  data,
  ticketCache,
}: {
  data: SprintData;
  ticketCache: Record<string, CachedSprintTicket>;
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
    if (t.includes('software engineer') || t.includes('software engineer')) return 'Software Engineer';
    if (t.includes('mobile engineer')) return 'Mobile Engineer';
    if (t.includes('qa manual')) return 'QA Manual Engineer';
    if (t.includes('qa automation')) return 'QA Automation Engineer';
    if (t.includes('tech product manager') || t.includes('product manager') || t.includes('product owner')) return 'Tech Product Manager';
    return raw;
  }

  const allTicketIds = new Set<string>();
  for (const section of data.sections) {
    for (const item of section.items) {
      for (const ticket of item.tickets) {
        allTicketIds.add(ticket.id);
        const cached = ticketCache[ticket.id];
        if (cached?.children) {
          cached.children.forEach((childId) => allTicketIds.add(childId));
        }
      }
    }
  }

  const assigneeMap = new Map<string, { count: number; points: number; rawAssignee: string }>();
  for (const ticketId of allTicketIds) {
    const cached = ticketCache[ticketId];
    if (!cached) continue;
    const clean = stripRoleSuffix(cached.assignee) || 'Unassigned';
    const entry = assigneeMap.get(clean) || { count: 0, points: 0, rawAssignee: cached.assignee || 'Unassigned' };
    entry.count++;
    if (cached.type?.toLowerCase() !== 'story') {
      entry.points += cached.storyPoints || 0;
    }
    assigneeMap.set(clean, entry);
  }

  function resolveRole(_cleanName: string, rawAssignee: string): string {
    return normalizeRole(extractRoleFromAssignee(rawAssignee));
  }

  const sorted = Array.from(assigneeMap.entries()).sort((a, b) => {
    const roleA = resolveRole(a[0], a[1].rawAssignee);
    const roleB = resolveRole(b[0], b[1].rawAssignee);
    const orderA = ROLE_ORDER[roleA] ?? 99;
    const orderB = ROLE_ORDER[roleB] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (b[1].points - a[1].points) || a[0].localeCompare(b[0]);
  });

  const totalTickets = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.count, 0);
  const totalPoints = Array.from(assigneeMap.values()).reduce((sum, e) => sum + e.points, 0);

  if (sorted.length === 0) return null;

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

  return (
    <div className="mt-6 rounded-xl bg-white shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Summary theo cá nhân</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 font-semibold">Assignee</th>
              <th className="text-left px-4 py-2.5 font-semibold">Role</th>
              <th className="text-center px-4 py-2.5 font-semibold">Số ticket</th>
              <th className="text-center px-4 py-2.5 font-semibold">Tổng SP</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => {
              const groupTickets = group.members.reduce((s, [, m]) => s + m.count, 0);
              const groupPoints = group.members.reduce((s, [, m]) => s + m.points, 0);
              return (
                <React.Fragment key={group.role || '__none__'}>
                  <tr className="bg-blue-50 border-t border-blue-100">
                    <td className="px-4 py-2 text-sm font-bold text-blue-800" colSpan={2}>{group.role || 'Khác'}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupTickets}</td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-800 text-center">{groupPoints}</td>
                  </tr>
                  {group.members.map(([assignee, stats]) => (
                    <tr key={assignee} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-700 font-medium pl-8">{shortName(assignee)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{group.role || '-'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900 text-center font-semibold">{stats.count}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900 text-center font-semibold">{stats.points}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-2.5 text-sm text-gray-900" colSpan={2}>Tổng cộng</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalTickets}</td>
              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{totalPoints}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SprintManagementAnalysis({ page }: { page: LoadedPage }) {
  const [prompt, setPrompt] = useState(DEFAULT_SPRINT_PROMPT);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [ticketCache, setTicketCache] = useState<Record<string, CachedSprintTicket>>({});
  const [reloadingTicketIds, setReloadingTicketIds] = useState<Set<string>>(new Set());
  const [showChildTickets, setShowChildTickets] = useState(true);

  const jiraBase = page.url ? page.url.split('/wiki')[0] : 'https://cakedigitalbank.atlassian.net';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const loadTicketCache = useCallback(async (ticketIds: string[]) => {
    if (!ticketIds.length) {
      setTicketCache({});
      return;
    }

    try {
      const res = await sprintManagementAPI.getTickets(ticketIds);
      setTicketCache((prev) => ({ ...prev, ...(res.data.data || {}) }));
    } catch {
      // non-critical; AI data is still visible without Jira cache
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

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await sprintManagementAPI.analyze({ pageIds: [page.pageId], prompt });
      const entry: AnalysisResult = res.data.data;
      setResults((prev) => [entry, ...prev]);
      await loadTicketCache(collectTicketIds(parseSprintJSON(entry.result)));
      toast.success('Phân tích xong');
    } catch (err: any) {
      toast.error(`Lỗi: ${err?.response?.data?.error || err.message}`);
    } finally {
      setAnalyzing(false);
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
  const historyResults = results.slice(1);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
            Kiểm tra Tickets với AI
            <span className="text-xs text-gray-400 font-normal ml-1">({page.title})</span>
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Prompt</p>
              <button
                onClick={() => setPrompt(DEFAULT_SPRINT_PROMPT)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                ↺ Reset
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y bg-gray-50"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
          >
            {analyzing ? <><span className="animate-spin inline-block">⏳</span> Đang xử lý...</> : '✨ Xử lý với AI'}
          </button>
        </div>
      </div>

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
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">Chưa có dữ liệu phân tích cho page này.</div>
        ) : (
          <div className="px-6 py-4">
            {latestParsed ? (
              <>
                <SprintTable
                  data={latestParsed}
                  jiraBase={jiraBase}
                  ticketCache={ticketCache}
                  reloadingTicketIds={reloadingTicketIds}
                  onReloadTicket={(ticketId) => handleReloadTickets([ticketId])}
                  formatDate={formatDate}
                  showChildTickets={showChildTickets}
                />
                <SprintSummaryTable
                  data={latestParsed}
                  ticketCache={ticketCache}
                />
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                <p className="text-xs text-amber-600 mb-2">⚠ Không parse được JSON, hiển thị raw:</p>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">{latestResult?.result}</pre>
              </div>
            )}

            {historyResults.length > 0 && (
              <details className="mt-6 rounded-lg border border-gray-200 bg-gray-50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700">
                  Lịch sử phân tích ({historyResults.length})
                </summary>
                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {historyResults.map((r) => {
                    const parsed = parseSprintJSON(r.result);
                    return (
                      <details key={r.id} className="px-4 py-3">
                        <summary className="cursor-pointer text-sm text-gray-700">
                          {formatDate(r.timestamp)} · {r.pagesTitles?.join(', ') || 'Kết quả'}
                        </summary>
                        <div className="mt-3">
                          {parsed ? (
                            <SprintTable
                              data={parsed}
                              jiraBase={jiraBase}
                              ticketCache={ticketCache}
                              reloadingTicketIds={reloadingTicketIds}
                              onReloadTicket={(ticketId) => handleReloadTickets([ticketId])}
                              formatDate={formatDate}
                              showChildTickets={showChildTickets}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">{r.result}</pre>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
