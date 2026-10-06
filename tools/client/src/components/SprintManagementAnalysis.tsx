import React, { useCallback, useEffect, useRef, useState } from 'react';
import { JiraStatusPill, statusCategoryOf } from '@/components/JiraBadges';
import { ACTIVE_SPRINT_ICON, confluencePageUrl, sprintNumberOfTitle, useActiveSprintNumbers } from '@/utils/sprintPages';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { sprintManagementAPI, configAPI, jiraAPI } from '@/utils/api';

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

// ─── Ticket type category (cho bộ lọc theo loại ticket) ───────────────────────
export type TypeCategory = 'backend' | 'mobile' | 'web' | 'qa' | 'task';

export const TYPE_CATEGORY_ORDER: TypeCategory[] = ['backend', 'mobile', 'web', 'qa', 'task'];
export const TYPE_CATEGORY_LABELS: Record<TypeCategory, string> = {
  backend: 'Backend',
  mobile: 'Mobile',
  web: 'Web',
  qa: 'QA',
  task: 'Task lẻ',
};

function getTypeCategory(type: string): TypeCategory | null {
  const t = (type || '').toLowerCase().replace(/[\s_]/g, '-');
  if (t.includes('backend')) return 'backend';
  if (t.includes('mobile')) return 'mobile';
  if (t.includes('web')) return 'web';
  if (t.includes('qa')) return 'qa';
  if (t === 'task') return 'task';
  return null;
}

function matchTypeCategories(type: string, filter: Set<TypeCategory>): boolean {
  if (filter.size === 0) return true;
  const cat = getTypeCategory(type);
  return cat !== null && filter.has(cat);
}


// ─── Label trạng thái UAT trên ticket PR ─────────────────────────────────────

/** Các label trạng thái — chọn một, gắn thẳng lên ticket PR trên Jira. */
export const PR_STATUS_LABELS = ['UatDoing', 'UatDone', 'Released'] as const;
type PrStatusLabel = (typeof PR_STATUS_LABELS)[number];

const PR_LABEL_STYLE: Record<PrStatusLabel, string> = {
  UatDoing: 'bg-amber-50 text-amber-700 border-amber-300',
  UatDone: 'bg-blue-50 text-blue-700 border-blue-300',
  Released: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

export const isPrStatusLabel = (label: string) =>
  PR_STATUS_LABELS.some((s) => s.toLowerCase() === label.toLowerCase());

export function PrLabelControl({
  prKey,
  labels,
  loaded,
  onChange,
}: {
  prKey: string;
  labels: string[];
  loaded: boolean;
  onChange: (prKey: string, next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PrStatusLabel | 'none' | null>(null);
  const [saving, setSaving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const statusLabels = labels.filter(isPrStatusLabel);
  const current = PR_STATUS_LABELS.find((s) => statusLabels.some((l) => l.toLowerCase() === s.toLowerCase()));
  const otherLabels = labels.filter((l) => !isPrStatusLabel(l));

  const toggleMenu = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const openUp = r.bottom + 170 > window.innerHeight && r.top > 170;
        setMenuStyle({
          position: 'fixed',
          left: r.left,
          ...(openUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
        });
      }
      return next;
    });
  };

  const confirmChange = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const add = target === 'none' ? [] : [target];
      // gỡ mọi label trạng thái cũ (kể cả khác hoa/thường), giữ nguyên label khác
      const remove = statusLabels.filter((l) => target === 'none' || l !== target);
      await jiraAPI.updateIssueLabels(prKey, add, remove);
      onChange(prKey, [...otherLabels, ...add]);
      toast.success(target === 'none' ? `Đã bỏ label trạng thái của ${prKey}` : `${prKey} → ${target}`);
      setTarget(null);
    } catch (err: any) {
      toast.error(`Đổi label thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <span className="text-[11px] text-gray-300">…</span>;

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleMenu}
        title={`Label trạng thái trên ${prKey} — bấm để đổi`}
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
          current ? PR_LABEL_STYLE[current] : 'border-dashed border-gray-300 bg-white text-gray-400'
        }`}
      >
        {current || 'Chưa có label'}
        <span className="text-[9px] opacity-60">▾</span>
      </button>
      {otherLabels.map((label) => (
        <span key={label} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {label}
        </span>
      ))}

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div style={menuStyle} className="z-[61] min-w-[170px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
              {PR_STATUS_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    setOpen(false);
                    if (label !== current) setTarget(label);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <span className={`inline-flex rounded border px-1.5 py-0.5 font-semibold ${PR_LABEL_STYLE[label]}`}>
                    {label}
                  </span>
                  {current === label && <span className="ml-auto text-gray-400">✓</span>}
                </button>
              ))}
              {current && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setTarget('none');
                  }}
                  className="mt-1 w-full border-t border-gray-100 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50"
                >
                  ✕ Bỏ label trạng thái
                </button>
              )}
            </div>
          </>,
          document.body
        )}

      {target &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
              <h3 className="text-sm font-bold text-gray-900">Đổi label trạng thái?</h3>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-mono font-semibold">{prKey}</span>:{' '}
                <span className="font-semibold">{current || 'chưa có'}</span> →{' '}
                <span className="font-semibold">{target === 'none' ? 'bỏ label' : target}</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">Ghi thẳng lên Jira, các label khác của ticket giữ nguyên.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setTarget(null)}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={confirmChange}
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Đang đổi...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
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
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-purple-600" fill="currentColor">
        <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
      </svg>
    );
  }
  if (t === 'story') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-600" fill="currentColor">
        <path d="M6 3h12a1 1 0 0 1 1 1v16.5a.75.75 0 0 1-1.17.62L12 17.5l-5.83 3.62A.75.75 0 0 1 5 20.5V4a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }
  if (t === 'task') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }
  if (t === 'techdebt' || t === 'tech-debt') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 8-4 4 4 4" />
        <path d="m15 8 4 4-4 4" />
      </svg>
    );
  }
  if (t === 'securitytask' || t === 'security-task') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (t === 'vendortask' || t === 'vendor-task') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }
  if (t === 'defect') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-500 text-white">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M13 3 6 13h4l-1 8 8-11h-4l1-7Z" />
        </svg>
      </span>
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
  if (t === 'initiative') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.5 14.5A6 6 0 1 1 15.5 14c-.9.7-1.5 1.7-1.5 3h-4c0-1.2-.6-2-1.5-2.5Z" />
      </svg>
    );
  }
  // Loại không xác định ("Không rõ" / khác)
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12h8" />
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

// ─── Sprint health check ──────────────────────────────────────────────────────

const JIRA_HEALTH_BASE = 'https://cakedigitalbank.atlassian.net';

function isSubTaskType(type: string): boolean {
  const t = (type || '').toLowerCase().replace(/[\s_]/g, '-');
  return t.includes('sub-task') || t.includes('subtask');
}

function noAssignee(t: CachedSprintTicket): boolean {
  return !t.assignee || t.assignee === 'Unassigned' || t.assignee.trim() === '';
}

interface HealthIssue {
  id: string;
  name: string;
  type: string;
  status: string;
  assignee: string;
  fixVersions?: string[];
}

function HealthMiniTable({ issues, columns }: { issues: HealthIssue[]; columns: ('status' | 'assignee' | 'fixver')[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded border border-gray-200 overflow-hidden mt-1.5">
      <table className="w-full text-xs border-collapse table-fixed">
        <tbody>
          {issues.map((i) => (
            <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-2 py-1.5 w-[100px] shrink-0">
                <a href={`${JIRA_HEALTH_BASE}/browse/${i.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono font-semibold">
                  {i.id}
                </a>
              </td>
              <td className="px-2 py-1.5 text-gray-700 truncate max-w-0">{i.name || '—'}</td>
              {columns.includes('status') && (
                <td className="px-2 py-1.5 w-[130px]">
                  <JiraStatusPill name={i.status || ''} />
                </td>
              )}
              {columns.includes('assignee') && (
                <td className="px-2 py-1.5 w-[300px] whitespace-nowrap text-gray-500 truncate" title={i.assignee || ''}>
                  {i.assignee || <span className="text-red-500">Chưa gán</span>}
                </td>
              )}
              {columns.includes('fixver') && (
                <td className="px-2 py-1.5 w-[220px] whitespace-nowrap text-gray-500 truncate" title={i.fixVersions?.join(', ') || ''}>
                  {i.fixVersions?.join(', ') || <span className="text-red-500">Chưa có</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Copy một nhóm kiểm tra: tiêu đề đậm + danh sách đánh số, key là link Jira (dán Confluence/Teams giữ format). */
async function copyHealthIssues(label: string, issues: HealthIssue[]): Promise<void> {
  const text = [
    `${label} (${issues.length})`,
    ...issues.map((i, index) => `${index + 1}. ${i.id} - ${i.status || '—'} - ${i.name}`),
  ].join('\n');
  const html =
    `<p><strong>${escapeHtmlText(label)} (${issues.length})</strong></p><ol>` +
    issues
      .map(
        (i) =>
          `<li><a href="${JIRA_HEALTH_BASE}/browse/${i.id}">${i.id}</a> - ${escapeHtmlText(i.status || '—')} - ${escapeHtmlText(i.name)}</li>`
      )
      .join('') +
    '</ol>';

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}

function HealthGroup({
  label,
  count,
  warning = false,
  issues,
  children,
}: {
  label: string;
  count: number;
  /** chỉ cảnh báo (màu vàng), không tính vào số vấn đề */
  warning?: boolean;
  /** có truyền thì hiện nút copy danh sách */
  issues?: HealthIssue[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasIssues = count > 0;

  const handleCopy = async () => {
    if (!issues?.length) return;
    try {
      await copyHealthIssues(label, issues);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy thất bại');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          className={`flex flex-1 items-center gap-2 text-xs font-semibold text-left px-1 py-1 rounded hover:bg-gray-50 transition-colors ${
            !hasIssues ? 'text-emerald-600' : warning ? 'text-amber-600' : 'text-red-600'
          }`}
        >
          <span className="text-[10px] font-mono w-3">{open ? '▼' : '▶'}</span>
          {hasIssues ? `⚠ ${label} (${count})` : `✅ ${label}`}
        </button>
        {hasIssues && issues && issues.length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copy danh sách (giữ link + đánh số)"
            className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium transition ${
              copied
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {copied ? '✓ Đã copy' : '⧉ Copy'}
          </button>
        )}
      </div>
      {open && <div className="ml-5">{children}</div>}
    </div>
  );
}

function SprintHealthCheck({
  section,
  ticketCache,
  strayStories,
  sprintNumber = 0,
}: {
  section: SprintSection;
  ticketCache: Record<string, CachedSprintTicket>;
  /** story gắn sprint này nhưng không nằm trong Must have / Nice to have — chỉ cảnh báo */
  strayStories?: HealthIssue[];
  /** số sprint của page, để biết fix version nào là "sprint sau" */
  sprintNumber?: number;
}) {
  const [open, setOpen] = useState(false);

  const allIds = new Set<string>();
  // ticket nằm dưới một TechDebt: việc kỹ thuật nội bộ, không bắt buộc gán người ngay
  const underTechDebt = new Set<string>();
  const isTechDebt = (t?: CachedSprintTicket) => (t?.type || '').toLowerCase().replace(/[\s_-]/g, '') === 'techdebt';
  // QA chỉ cần vào việc khi story còn ở sprint này: story có fix version sprint sau thì QA chưa cần assign
  const underLaterStory = new Set<string>();
  const storyIsLater = (t?: CachedSprintTicket) =>
    sprintNumber > 0 &&
    (t?.type || '').toLowerCase().includes('story') &&
    (t?.fixVersions || []).some((fv) => sprintNumberOfTitle(fv) > sprintNumber);
  const walkTree = (id: string, inTechDebt: boolean, inLaterStory: boolean, visited = new Set<string>()) => {
    if (!id || visited.has(id)) return;
    visited.add(id); allIds.add(id);
    if (inTechDebt) underTechDebt.add(id);
    if (inLaterStory) underLaterStory.add(id);
    const childInTechDebt = inTechDebt || isTechDebt(ticketCache[id]);
    const childInLaterStory = inLaterStory || storyIsLater(ticketCache[id]);
    (ticketCache[id]?.children || []).forEach((c) => walkTree(c, childInTechDebt, childInLaterStory, visited));
  };
  section.items.forEach((item) => item.tickets.forEach((t) => walkTree(t.id, false, false)));
  const isQaType = (type: string) => (type || '').toLowerCase().includes('qa');

  const toHealthIssue = (id: string): HealthIssue => {
    const t = ticketCache[id] || { id, name: '', type: '', status: '', assignee: '', fixVersions: [] };
    return { id, name: t.name, type: t.type, status: t.status, assignee: t.assignee, fixVersions: t.fixVersions };
  };

  const storiesNoAssignee = [...allIds]
    .filter((id) => { const t = ticketCache[id]; return t && t.type?.toLowerCase() === 'story' && noAssignee(t); })
    .map(toHealthIssue);

  const storiesNoFixVer = [...allIds]
    .filter((id) => { const t = ticketCache[id]; return t && t.type?.toLowerCase() === 'story' && (!t.fixVersions || t.fixVersions.length === 0); })
    .map(toHealthIssue);

  const storiesDraft = [...allIds]
    .filter((id) => { const t = ticketCache[id]; return t && t.type?.toLowerCase() === 'story' && (t.status || '').toLowerCase() === 'draft'; })
    .map(toHealthIssue);

  const subtasksNoAssignee = [...allIds]
    .filter((id) => {
      const t = ticketCache[id];
      if (!t || !isSubTaskType(t.type) || !noAssignee(t) || underTechDebt.has(id)) return false;
      return !(isQaType(t.type) && underLaterStory.has(id));
    })
    .map(toHealthIssue);

  const itemsNoTickets = section.items.filter((item) => item.tickets.length === 0);

  const totalIssues = storiesNoAssignee.length + storiesNoFixVer.length + storiesDraft.length + subtasksNoAssignee.length + itemsNoTickets.length;
  const allOk = totalIssues === 0;
  const warningCount = strayStories?.length || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[10px] font-mono">{open ? '▼' : '▶'}</span>
          <span className="font-semibold text-gray-800 text-sm">Kiểm tra</span>
          {allOk
            ? <span className="text-xs text-emerald-600 font-medium">✅ Không có vấn đề</span>
            : <span className="text-xs text-red-600 font-medium">⚠ {totalIssues} vấn đề</span>}
          {warningCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">· {warningCount} cảnh báo</span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-gray-100">
          <HealthGroup label="Story chưa có Assignee" count={storiesNoAssignee.length} issues={storiesNoAssignee}>
            {storiesNoAssignee.length === 0
              ? <p className="text-xs text-gray-400 mt-1">Tất cả story đã có assignee.</p>
              : <HealthMiniTable issues={storiesNoAssignee} columns={['status', 'assignee']} />}
          </HealthGroup>

          <HealthGroup label="Story chưa có Fix Version" count={storiesNoFixVer.length} issues={storiesNoFixVer}>
            {storiesNoFixVer.length === 0
              ? <p className="text-xs text-gray-400 mt-1">Tất cả story đã có fix version.</p>
              : <HealthMiniTable issues={storiesNoFixVer} columns={['status', 'fixver']} />}
          </HealthGroup>

          <HealthGroup label="Story đang Draft" count={storiesDraft.length} issues={storiesDraft}>
            {storiesDraft.length === 0
              ? <p className="text-xs text-gray-400 mt-1">Không có story Draft.</p>
              : <HealthMiniTable issues={storiesDraft} columns={['status', 'assignee']} />}
          </HealthGroup>

          <HealthGroup label="Subtask chưa có Assignee" count={subtasksNoAssignee.length} issues={subtasksNoAssignee}>
            {subtasksNoAssignee.length === 0
              ? <p className="text-xs text-gray-400 mt-1">Tất cả subtask đã có assignee (không tính subtask dưới TechDebt, và QA của story đã dời fix version sang sprint sau).</p>
              : <HealthMiniTable issues={subtasksNoAssignee} columns={['status', 'assignee']} />}
          </HealthGroup>

          {strayStories && (
            <HealthGroup
              label="Story trong sprint nhưng không thuộc Must have / Nice to have"
              count={strayStories.length}
              warning
              issues={strayStories}
            >
              {strayStories.length === 0
                ? <p className="text-xs text-gray-400 mt-1">Mọi story gắn sprint này đều có trong danh sách.</p>
                : (
                  <>
                    <p className="text-[11px] text-amber-600 mt-1">Chỉ cảnh báo, không tính vào số vấn đề.</p>
                    <HealthMiniTable issues={strayStories} columns={['status', 'assignee']} />
                  </>
                )}
            </HealthGroup>
          )}

          <HealthGroup label="Item không có sub-ticket" count={itemsNoTickets.length}>
            {itemsNoTickets.length === 0
              ? <p className="text-xs text-gray-400 mt-1">Tất cả item đều có sub-ticket.</p>
              : (
                <div className="mt-1.5 space-y-1">
                  {itemsNoTickets.map((item) => (
                    <div key={item.number} className="text-xs text-gray-700 px-2 py-1 rounded bg-gray-50 border border-gray-200">
                      {item.icon} {item.number}. {item.title}
                    </div>
                  ))}
                </div>
              )}
          </HealthGroup>
        </div>
      )}
    </div>
  );
}

// ─── Story point aggregation ──────────────────────────────────────────────────
// Quy tắc: node có ticket con → tổng point từ các con (đệ quy xuống lá);
// node lá (không có con) → dùng story point của chính nó.
// Vậy: Initiative = tổng Epic, Epic = tổng Story, Story = tổng Sub-task,
// KHÔNG dùng point gốc của node cha. Truyền matchLeaf để chỉ cộng các lá
// thoả filter (vd theo assignee / status).
function aggregateStoryPoints(
  id: string,
  ticketCache: Record<string, CachedSprintTicket>,
  matchLeaf?: (t: CachedSprintTicket) => boolean,
  visited: Set<string> = new Set<string>()
): number {
  if (!id || visited.has(id)) return 0;
  visited.add(id);
  const t = ticketCache[id];
  if (!t) return 0;
  const children = t.children || [];
  if (children.length === 0) {
    if (matchLeaf && !matchLeaf(t)) return 0;
    return t.storyPoints || 0;
  }
  return children.reduce(
    (sum, childId) => sum + aggregateStoryPoints(childId, ticketCache, matchLeaf, visited),
    0
  );
}

// Predicate lọc ở cấp lá, dùng chung cho bảng và phần tính tổng.
interface LeafFilterOpts {
  filterAssignees: string[] | null;
  filterStatusCategory: StatusCategory | null;
  filterTypeCategories: Set<TypeCategory>;
  hideClosedStatuses: boolean;
}

function makeLeafMatcher(opts: LeafFilterOpts): (t: CachedSprintTicket) => boolean {
  return (t) => {
    if (opts.hideClosedStatuses && isHiddenStatus(t.status || '')) return false;
    if (opts.filterAssignees !== null && !opts.filterAssignees.includes(assigneeKey(t.assignee))) return false;
    if (opts.filterStatusCategory !== null && getStatusCategory(t.status || '') !== opts.filterStatusCategory) return false;
    if (!matchTypeCategories(t.type, opts.filterTypeCategories)) return false;
    return true;
  };
}

// Key duy nhất của item trong 1 section (KHÔNG dùng prNumber vì có thể trùng).
function sectionItemKey(item: SprintItem): string {
  return String(item.number);
}

function itemFilteredPoints(
  item: SprintItem,
  ticketCache: Record<string, CachedSprintTicket>,
  matchLeaf: (t: CachedSprintTicket) => boolean
): number {
  return item.tickets.reduce((sum, t) => sum + aggregateStoryPoints(t.id, ticketCache, matchLeaf), 0);
}

function sumSectionPoints(
  section: SprintSection,
  ticketCache: Record<string, CachedSprintTicket>,
  matchLeaf: (t: CachedSprintTicket) => boolean,
  uncheckedKeys: Set<string>
): number {
  return section.items.reduce(
    (sum, item) => (uncheckedKeys.has(sectionItemKey(item)) ? sum : sum + itemFilteredPoints(item, ticketCache, matchLeaf)),
    0
  );
}

// ─── % tải theo team capacity ─────────────────────────────────────────────────
// Cấu hình số point/sprint cho từng team (lưu ở Settings). 0 = chưa cấu hình.
export type TeamCapacity = Record<'backend' | 'web' | 'mobile' | 'qa', number>;
export const DEFAULT_TEAM_CAPACITY: TeamCapacity = { backend: 0, web: 0, mobile: 0, qa: 0 };

// % của 1 subtask (lá) = point lá / capacity team của lá đó.
function leafPercent(t: CachedSprintTicket, capacity: TeamCapacity): number {
  const cat = getTypeCategory(t.type);
  if (cat === 'backend' || cat === 'web' || cat === 'mobile' || cat === 'qa') {
    const cap = capacity[cat];
    if (cap > 0) return ((t.storyPoints || 0) / cap) * 100;
  }
  return 0;
}

// % của 1 node = tổng % các lá bên dưới (giống cách cộng story point).
// node lá → % của chính nó; node cha → cộng dồn từ con.
function aggregatePercent(
  id: string,
  ticketCache: Record<string, CachedSprintTicket>,
  capacity: TeamCapacity,
  matchLeaf?: (t: CachedSprintTicket) => boolean,
  visited: Set<string> = new Set<string>()
): number {
  if (!id || visited.has(id)) return 0;
  visited.add(id);
  const t = ticketCache[id];
  if (!t) return 0;
  const children = t.children || [];
  if (children.length === 0) {
    if (matchLeaf && !matchLeaf(t)) return 0;
    return leafPercent(t, capacity);
  }
  return children.reduce(
    (sum, childId) => sum + aggregatePercent(childId, ticketCache, capacity, matchLeaf, visited),
    0
  );
}

function itemFilteredPercent(
  item: SprintItem,
  ticketCache: Record<string, CachedSprintTicket>,
  capacity: TeamCapacity,
  matchLeaf: (t: CachedSprintTicket) => boolean
): number {
  return item.tickets.reduce((sum, t) => sum + aggregatePercent(t.id, ticketCache, capacity, matchLeaf), 0);
}

function sumSectionPercent(
  section: SprintSection,
  ticketCache: Record<string, CachedSprintTicket>,
  capacity: TeamCapacity,
  matchLeaf: (t: CachedSprintTicket) => boolean,
  uncheckedKeys: Set<string>
): number {
  return section.items.reduce(
    (sum, item) => (uncheckedKeys.has(sectionItemKey(item)) ? sum : sum + itemFilteredPercent(item, ticketCache, capacity, matchLeaf)),
    0
  );
}

function fmtPercent(p: number): string {
  if (!p) return '-';
  return `${Math.round(p * 10) / 10}%`;
}

// ─── Ticket row renderer ──────────────────────────────────────────────────────

// ─── Ticket đại diện + bảng tóm tắt của một item ─────────────────────────────

/** Cấp của type: số nhỏ = cấp cao (Initiative > Epic > Story > Task > Bug > Subtask). */
function typeLevel(type: string): number {
  const t = (type || '').toLowerCase();
  if (t.includes('initiative')) return 0;
  if (t === 'epic') return 1;
  if (t.includes('story')) return 2;
  if (t.includes('subtask') || t.includes('sub-task')) return 6;
  if (t.includes('task')) return 3;
  if (t.includes('bug') || t.includes('defect')) return 4;
  return 5;
}

const isInitiative = (t?: CachedSprintTicket) => (t?.type || '').toLowerCase().includes('initiative');
const isEpic = (t?: CachedSprintTicket) => (t?.type || '').toLowerCase() === 'epic';

/** Ticket cấp cao nhất trong item — dùng làm thông tin đại diện cho dòng item. */
// ─── Body check: description của ticket PL có đủ Context + Constraints ───────

export interface BodyCheck {
  context: boolean;
  constraints: boolean;
}

/** ADF → text thường, mỗi block (paragraph/heading/list item...) một dòng. */
function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const inner = (node.content || []).map(adfToText).join('');
  const isBlock = ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock', 'tableRow', 'panel'].includes(node.type);
  return isBlock ? `${inner}\n` : inner;
}

// header = tên section đứng riêng 1 dòng, hoặc theo sau là ":" (tránh bắt nhầm câu thường bắt đầu bằng "Context ...")
const BODY_HEADER_RE = /^\s*[#*_\s]*(context|constraints?|acceptance criteria|ac\d*|description|mô tả|notes?|ghi chú|scope|solution|out of scope|figma)\s*[*_]*\s*(?::\s*(.*))?$/i;

/** Có header `name` và có nội dung (cùng dòng sau dấu ":" hoặc dòng kế tiếp không phải header khác). */
function hasFilledSection(lines: string[], name: RegExp): boolean {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(BODY_HEADER_RE);
    if (!m || !name.test(m[1])) continue;
    if ((m[2] || '').trim()) return true;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (!line) continue;
      return !BODY_HEADER_RE.test(line);
    }
  }
  return false;
}

export function checkBody(description: any): BodyCheck {
  const lines = adfToText(description).split('\n');
  return {
    context: hasFilledSection(lines, /^context$/i),
    constraints: hasFilledSection(lines, /^constraints?$/i),
  };
}

function BodyCheckBadge({ check, ticketKey }: { check: BodyCheck | undefined; ticketKey?: string }) {
  if (!ticketKey) return <span className="text-xs text-gray-300">-</span>;
  if (!check) return <span className="text-[11px] text-gray-300">…</span>;
  const n = Number(check.context) + Number(check.constraints);
  const style = n === 2 ? 'bg-emerald-500 text-white' : n === 1 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-400';
  const mark = (ok: boolean, name: string) => `${ok ? '✅' : '⬜'} ${name}: ${ok ? 'đã có' : 'chưa có'}`;
  const title = [`Body ${ticketKey}`, mark(check.context, 'Context'), mark(check.constraints, 'Constraints')].join('\n');
  return (
    <span title={title} className={`inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-[11px] font-bold ${style}`}>
      ✓
    </span>
  );
}

export function representativeTicket(
  item: SprintItem,
  ticketCache: Record<string, CachedSprintTicket>
): CachedSprintTicket | undefined {
  return item.tickets
    .map((t) => ticketCache[t.id])
    .filter((t): t is CachedSprintTicket => Boolean(t))
    .sort((a, b) => typeLevel(a.type) - typeLevel(b.type))[0];
}

function descendantsOf(id: string, ticketCache: Record<string, CachedSprintTicket>): CachedSprintTicket[] {
  const out: CachedSprintTicket[] = [];
  const visited = new Set<string>([id]);
  const walk = (current: string) => {
    for (const childId of ticketCache[current]?.children || []) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      const child = ticketCache[childId];
      if (child) out.push(child);
      walk(childId);
    }
  };
  walk(id);
  return out;
}

/** Thứ tự loại trong bảng tóm tắt: Task → Backend → Web → Mobile → QA → Defect → Story. */
function summaryTypeRank(type: string): number {
  const t = (type || '').toLowerCase();
  if (t === 'task') return 0;
  if (t.includes('backend')) return 1;
  if (t.includes('web')) return 2;
  if (t.includes('mobile')) return 3;
  if (t.includes('qa')) return 4;
  if (t.includes('subtask') || t.includes('sub-task')) return 5;
  if (t.includes('defect')) return 6;
  if (t.includes('bug')) return 7;
  if (t.includes('story')) return 8;
  if (t === 'epic') return 9;
  if (t.includes('initiative')) return 10;
  return 11;
}

/** Story / Epic / Initiative là ticket chứa — không đếm vào tổng số lượng, % done và SP. */
const isContainerType = (type: string) => {
  const t = (type || '').toLowerCase();
  return t.includes('story') || t === 'epic' || t.includes('initiative');
};

const isDoneTicket = (t: CachedSprintTicket) => statusCategoryOf(t.status || '') === 'done';

/** Tất cả ticket của item: ticket gốc + con cháu, không trùng. */
function itemScopeTickets(item: SprintItem, ticketCache: Record<string, CachedSprintTicket>): CachedSprintTicket[] {
  const seen = new Map<string, CachedSprintTicket>();
  for (const root of item.tickets) {
    const cached = ticketCache[root.id];
    if (!cached) continue;
    seen.set(cached.id, cached);
    for (const d of descendantsOf(cached.id, ticketCache)) seen.set(d.id, d);
  }
  return Array.from(seen.values());
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const fmtPoints = (n: number) => (Math.round(n * 10) / 10).toString();

/** "done/all (x%)" — chỉ đếm ticket làm việc thật (bỏ Story/Epic/Initiative). */
function countDoneLabel(tickets: CachedSprintTicket[]): { done: number; all: number; text: string } {
  const work = tickets.filter((t) => !isContainerType(t.type));
  const done = work.filter(isDoneTicket).length;
  const tick = work.length > 0 && done === work.length ? '✅ ' : '';
  return {
    done,
    all: work.length,
    text: work.length ? `${tick}${done}/${work.length} (${pct(done, work.length)}%)` : '-',
  };
}

interface SummaryRow {
  type: string;
  assignee: string;
  tickets: CachedSprintTicket[];
  done: number;
  points: number;
  percent: number;
}

/**
 * Tóm tắt item theo loại × assignee: Count = done/all (%), SP = điểm (% tải capacity).
 * Item có Initiative/Epic thì cho chọn phạm vi (mặc định cấp cao nhất) — chỉ đếm con cháu của ticket được chọn.
 * Bấm vào tên loại để xem danh sách ticket của loại đó.
 */
function ItemSummary({
  item,
  ticketCache,
  teamCapacity,
  matchLeaf,
  jiraBase,
}: {
  item: SprintItem;
  ticketCache: Record<string, CachedSprintTicket>;
  teamCapacity: TeamCapacity;
  matchLeaf: (t: CachedSprintTicket) => boolean;
  jiraBase: string;
}) {
  const roots = item.tickets
    .map((t) => ticketCache[t.id])
    .filter((t): t is CachedSprintTicket => Boolean(t));

  const initiatives = roots.filter(isInitiative);
  const epicMap = new Map<string, CachedSprintTicket>();
  for (const epic of roots.filter(isEpic)) epicMap.set(epic.id, epic);
  for (const init of initiatives) {
    for (const childId of init.children || []) {
      const child = ticketCache[childId];
      if (isEpic(child)) epicMap.set(child!.id, child!);
    }
  }
  const containers = [...initiatives, ...Array.from(epicMap.values())];

  const [selectedId, setSelectedId] = useState(containers[0]?.id || '');
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const selected = containers.find((c) => c.id === selectedId) || containers[0];

  const scope = (selected ? descendantsOf(selected.id, ticketCache) : itemScopeTickets(item, ticketCache)).filter(
    matchLeaf
  );

  const rowsByKey = new Map<string, SummaryRow>();
  for (const ticket of scope) {
    const type = ticket.type || 'Khác';
    const assignee = shortName(ticket.assignee) || 'Unassigned';
    const key = `${type}::${assignee}`;
    const row = rowsByKey.get(key) || { type, assignee, tickets: [], done: 0, points: 0, percent: 0 };
    row.tickets.push(ticket);
    if (isDoneTicket(ticket)) row.done += 1;
    row.points += ticket.storyPoints || 0;
    row.percent += leafPercent(ticket, teamCapacity);
    rowsByKey.set(key, row);
  }

  const rows = Array.from(rowsByKey.values()).sort(
    (a, b) =>
      summaryTypeRank(a.type) - summaryTypeRank(b.type) ||
      a.type.localeCompare(b.type) ||
      a.assignee.localeCompare(b.assignee)
  );
  const typeSpan = new Map<string, number>();
  rows.forEach((r) => typeSpan.set(r.type, (typeSpan.get(r.type) || 0) + 1));

  // tổng chỉ tính ticket làm việc thật
  const countable = rows.filter((r) => !isContainerType(r.type));
  const total = countable.reduce(
    (acc, r) => ({
      all: acc.all + r.tickets.length,
      done: acc.done + r.done,
      points: acc.points + r.points,
      percent: acc.percent + r.percent,
    }),
    { all: 0, done: 0, points: 0, percent: 0 }
  );

  const toggleType = (type: string) =>
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const cell = 'px-2 py-1 text-xs';
  const num = `${cell} text-left tabular-nums whitespace-nowrap`;
  const countText = (done: number, all: number) =>
    all ? `${done === all ? '✅ ' : ''}${done}/${all} (${pct(done, all)}%)` : '-';
  const pointText = (points: number, percent: number) =>
    points ? `${fmtPoints(points)}${percent ? ` (${fmtPercent(percent)})` : ''}` : '-';

  return (
    <div className="space-y-2 py-1 pl-8 pr-2">
      {containers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {containers.map((c) => {
            const active = c.id === selected?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                title={c.name}
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-mono font-semibold transition-colors ${
                  active
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex" title={c.type}>
                  <IssueTypeIcon type={c.type} />
                </span>
                {c.id}
              </button>
            );
          })}
          {selected && (
            <a
              href={`${jiraBase}/browse/${selected.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 truncate text-xs text-gray-500 hover:text-blue-600 hover:underline"
            >
              {selected.name}
            </a>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs italic text-gray-400">Không có ticket con khớp bộ lọc hiện tại</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <th className={`${cell} text-left font-semibold`}>Loại</th>
                <th className={`${cell} text-left font-semibold`}>Assignee</th>
                <th className={`${num} font-semibold`} title="Số ticket done / tổng (% done)">Count</th>
                <th className={`${num} font-semibold`} title="Story point (% tải so với capacity team)">SP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => {
                const firstOfType = index === 0 || rows[index - 1].type !== r.type;
                const lastOfType = index === rows.length - 1 || rows[index + 1].type !== r.type;
                const open = openTypes.has(r.type);
                const container = isContainerType(r.type);
                const typeTickets = rows.filter((x) => x.type === r.type).flatMap((x) => x.tickets);
                return (
                  <React.Fragment key={`${r.type}::${r.assignee}`}>
                    <tr className={`border-t border-gray-100 hover:bg-blue-50 ${container ? 'text-gray-400' : ''}`}>
                      {firstOfType && (
                        <td rowSpan={typeSpan.get(r.type)} className={`${cell} align-top`}>
                          <button
                            type="button"
                            onClick={() => toggleType(r.type)}
                            title={container ? 'Không tính vào tổng' : 'Xem danh sách ticket'}
                            className="inline-flex items-center gap-1.5 text-left text-gray-700 hover:text-blue-600"
                          >
                            <span className="w-2.5 text-[9px] text-gray-400">{open ? '▼' : '▶'}</span>
                            <IssueTypeIcon type={r.type} />
                            <span className={container ? 'italic text-gray-400' : ''}>{r.type}</span>
                          </button>
                        </td>
                      )}
                      <td className={`${cell} ${container ? '' : 'text-gray-700'}`}>{r.assignee}</td>
                      <td className={`${num} ${container ? '' : 'font-semibold text-gray-700'}`}>
                        {countText(r.done, r.tickets.length)}
                      </td>
                      <td className={`${num} ${container ? '' : 'text-indigo-700'}`}>{pointText(r.points, r.percent)}</td>
                    </tr>
                    {lastOfType && open && (
                      <tr className="border-t border-gray-100 bg-slate-50">
                        {/* thụt vào qua chữ tên loại để thấy đây là cấp con vừa mở */}
                        <td colSpan={4} className="py-1.5 pl-14 pr-2">
                          <table className="w-full border-collapse">
                            <tbody>
                              {typeTickets
                                .sort((a, b) => a.id.localeCompare(b.id))
                                .map((t) => (
                                  <tr key={t.id} className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50">
                                    <td className="w-[110px] whitespace-nowrap px-2 py-0.5">
                                      <a
                                        href={`${jiraBase}/browse/${t.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                                      >
                                        {t.id}
                                      </a>
                                    </td>
                                    <td className="px-2 py-0.5 text-xs text-gray-700">{t.name}</td>
                                    <td className="w-[130px] whitespace-nowrap px-2 py-0.5">
                                      <JiraStatusPill name={t.status || ''} />
                                    </td>
                                    <td className="w-[140px] whitespace-nowrap px-2 py-0.5 text-xs text-gray-600">
                                      {shortName(t.assignee) || 'Unassigned'}
                                    </td>
                                    <td className="w-[50px] px-2 py-0.5 text-left text-xs text-gray-500">
                                      {t.storyPoints || '-'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                <td className={`${cell} text-gray-700`} colSpan={2} title="Không tính Story / Epic / Initiative">
                  Tổng
                </td>
                <td className={`${num} text-gray-800`}>{countText(total.done, total.all)}</td>
                <td className={`${num} text-indigo-700`}>{pointText(total.points, total.percent)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SprintSectionTable({
  section,
  jiraBase,
  ticketCache,
  teamCapacity,
  showChildTickets,
  filterAssignees,
  filterStatusCategory,
  filterTypeCategories,
  hideClosedStatuses,
  uncheckedItems: controlledUnchecked,
  onUncheckedItemsChange,
  hideTotals = false,
  prLabels,
  onPrLabelsChange,
  bodyChecks,
}: {
  section: SprintSection;
  jiraBase: string;
  ticketCache: Record<string, CachedSprintTicket>;
  teamCapacity: TeamCapacity;
  showChildTickets: boolean;
  filterAssignees: string[] | null;
  filterStatusCategory: StatusCategory | null;
  filterTypeCategories: Set<TypeCategory>;
  hideClosedStatuses: boolean;
  // Khi truyền vào → state tick được điều khiển từ ngoài (vd header trang).
  uncheckedItems?: Set<string>;
  onUncheckedItemsChange?: (next: Set<string>) => void;
  /** tổng SP / % / tick tất cả đã hiện trên thanh công cụ thì không lặp lại ở bảng */
  hideTotals?: boolean;
  /** label hiện tại của từng ticket PR (key có mặt = đã tải xong) */
  prLabels: Record<string, string[]>;
  onPrLabelsChange: (prKey: string, next: string[]) => void;
  /** kết quả check body của ticket PL (key có mặt = đã tải xong) */
  bodyChecks: Record<string, BodyCheck>;
}) {
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(
    () => new Set(showChildTickets ? [] : section.items.map(sectionItemKey))
  );
  const [internalUnchecked, setInternalUnchecked] = useState<Set<string>>(new Set());
  const uncheckedItems = controlledUnchecked ?? internalUnchecked;
  const applyUnchecked = (updater: (prev: Set<string>) => Set<string>) => {
    if (onUncheckedItemsChange) onUncheckedItemsChange(updater(uncheckedItems));
    else setInternalUnchecked(updater);
  };
  const [tableOpen, setTableOpen] = useState(true);
  const prevExpandAllRef = useRef(showChildTickets);

  // nút "Mở / Thu gọn tất cả" trên thanh công cụ
  useEffect(() => {
    if (prevExpandAllRef.current === showChildTickets) return;
    prevExpandAllRef.current = showChildTickets;
    setCollapsedItems(showChildTickets ? new Set() : new Set(section.items.map(sectionItemKey)));
  }, [showChildTickets, section.items]);

  const toggleItem = (key: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Key duy nhất trong section = item.number (KHÔNG dùng prNumber vì có thể trùng).
  const itemKey = sectionItemKey;

  const toggleItemCheck = (key: string) => {
    applyUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filter áp dụng ở cấp lá: chỉ cộng point các lá thoả filter đang bật.
  const matchLeaf = makeLeafMatcher({ filterAssignees, filterStatusCategory, filterTypeCategories, hideClosedStatuses });

  const itemPointsOf = (item: SprintItem) => itemFilteredPoints(item, ticketCache, matchLeaf);
  const itemPercentOf = (item: SprintItem) => itemFilteredPercent(item, ticketCache, teamCapacity, matchLeaf);

  const grandTotal = sumSectionPoints(section, ticketCache, matchLeaf, uncheckedItems);
  const grandTotalPercent = sumSectionPercent(section, ticketCache, teamCapacity, matchLeaf, uncheckedItems);
  const allChecked = uncheckedItems.size === 0;
  // cột co theo nội dung, phần dư dồn cho cột Tên Ticket
  const fitTh = 'text-left px-2 py-1.5 font-semibold w-px whitespace-nowrap';
  const tickAll = () => applyUnchecked(() => new Set());
  const untickAll = () => applyUnchecked(() => new Set(section.items.map(itemKey)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1 gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTableOpen((p) => !p)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors select-none"
        >
          <span className="font-mono">{tableOpen ? '▼' : '▶'}</span>
          Danh sách ticket
        </button>
        {!hideTotals && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded"
            title="Tổng story point của các item đang được tick (theo filter hiện tại)"
          >
            Tổng: {grandTotal} SP
          </span>
          {grandTotalPercent > 0 && (
            <span
              className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded"
              title="Tổng % tải so với capacity team của các item đang tick (theo filter hiện tại)"
            >
              {fmtPercent(grandTotalPercent)}
            </span>
          )}
          <button
            type="button"
            onClick={allChecked ? untickAll : tickAll}
            className="text-xs font-medium px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {allChecked ? 'Bỏ tick tất cả' : 'Tick tất cả'}
          </button>
        </div>
        )}
      </div>
      {!tableOpen ? null : <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-2 py-1.5 font-semibold" title="Số thứ tự, mức độ (🟢/🟡/🔴), team và ticket PR của item">Ticket ID</th>
            <th className="text-left px-2 py-1.5 font-semibold" title="Tên item theo trang Sprint Release trên Confluence">Tên Ticket</th>
            <th className={`${fitTh}`} title="Label trạng thái trên ticket PR — bấm để đổi (ghi thẳng lên Jira)">Labels</th>
            <th className={`${fitTh}`} title="Ticket đại diện của item — trạng thái/assignee/fix version lấy từ ticket này">Ticket PL</th>
            <th className={`${fitTh}`} title="Trạng thái Jira của ticket PL">Trạng thái</th>
            <th className={`${fitTh}`} title="Người được assign ticket PL">Assignee</th>
            <th className={`${fitTh}`} title="Fix version của ticket PL">Fix Version</th>
            <th className={`${fitTh}`} title="Story point (% tải so với capacity team)">SP</th>
            <th className={`${fitTh}`} title="Ticket làm việc done / tổng (% done) — không tính Story/Epic/Initiative">Subtask</th>
            <th className={`${fitTh} text-center`} title={'Description ticket PL đã có Context và Constraints chưa\n⚪ xám: chưa có mục nào\n🟡 vàng: có 1 mục\n🟢 xanh: đủ 2 mục\nRê chuột vào icon để xem chi tiết'}>Body</th>
          </tr>
        </thead>
        <tbody>
          {section.items.map((item) => {
            const key = itemKey(item);
            const collapsed = collapsedItems.has(key);
            const checked = !uncheckedItems.has(key);
            const itemPoints = itemPointsOf(item);
            const itemPercent = itemPercentOf(item);
            const rep = representativeTicket(item, ticketCache);
            const subtaskCount = countDoneLabel(itemScopeTickets(item, ticketCache).filter(matchLeaf));
            return (
              <React.Fragment key={item.number}>
                <tr className={`border-t border-blue-100 transition-colors hover:bg-blue-100 ${checked ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <td colSpan={2} className="px-2 py-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItemCheck(key)}
                        title="Tính point item này vào tổng"
                        className="w-4 h-4 accent-purple-600 cursor-pointer shrink-0"
                      />
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
                    </div>
                  </td>
                  <td className="px-2 py-1.5 align-top whitespace-nowrap">
                    {item.prNumber ? (
                      <PrLabelControl
                        prKey={item.prNumber}
                        labels={prLabels[item.prNumber] || []}
                        loaded={item.prNumber in prLabels}
                        onChange={onPrLabelsChange}
                      />
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  {/* thông tin của ticket đại diện (cấp cao nhất trong item) */}
                  <td className="px-2 py-1.5 align-top whitespace-nowrap">
                    {rep ? (
                      <a
                        href={`${jiraBase}/browse/${rep.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${rep.type} · ${rep.name}`}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <IssueTypeIcon type={rep.type} />
                        {rep.id}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    {rep ? (
                      <span title={`Đại diện: ${rep.id} (${rep.type})`}>
                        <JiraStatusPill name={rep.status || ''} />
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 align-top whitespace-nowrap text-xs text-gray-700">
                    {rep ? shortName(rep.assignee) || 'Unassigned' : '-'}
                  </td>
                  <td className="px-2 py-1.5 align-top whitespace-nowrap text-xs text-gray-500">
                    {rep?.fixVersions?.join(', ') || '-'}
                  </td>
                  <td
                    className="px-2 py-1.5 align-top whitespace-nowrap text-left text-xs font-mono font-bold text-purple-700"
                    title="Tổng story point của item (% tải so với capacity team), theo filter hiện tại"
                  >
                    {itemPoints > 0 ? (
                      <>
                        {fmtPoints(itemPoints)}
                        {itemPercent > 0 && (
                          <span className="font-semibold text-indigo-600"> ({fmtPercent(itemPercent)})</span>
                        )}
                      </>
                    ) : (
                      <span className="font-normal text-gray-300">-</span>
                    )}
                  </td>
                  <td
                    className="px-2 py-1.5 align-top whitespace-nowrap text-left text-xs font-mono font-semibold text-gray-700"
                    title="Ticket làm việc done / tổng (% done) — không tính Story/Epic/Initiative"
                  >
                    {subtaskCount.all ? subtaskCount.text : <span className="font-normal text-gray-300">-</span>}
                  </td>
                  <td className="px-2 py-1.5 align-top text-center">
                    <BodyCheckBadge check={rep ? bodyChecks[rep.id] : undefined} ticketKey={rep?.id} />
                  </td>
                </tr>

                {!collapsed && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={10} className="bg-white">
                      {item.tickets.length === 0 ? (
                        <p className="py-1.5 pl-10 text-xs italic text-red-500">Không có sub-ticket</p>
                      ) : (
                        <ItemSummary
                          item={item}
                          ticketCache={ticketCache}
                          teamCapacity={teamCapacity}
                          matchLeaf={matchLeaf}
                          jiraBase={jiraBase}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>}
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
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [ticketCache, setTicketCache] = useState<Record<string, CachedSprintTicket>>({});
  const [teamCapacity, setTeamCapacity] = useState<TeamCapacity>(DEFAULT_TEAM_CAPACITY);
  // true = mở tóm tắt của mọi item; mặc định thu gọn để chỉ thấy dòng item
  const [showChildTickets, setShowChildTickets] = useState(false);
  const [hideClosedStatuses, setHideClosedStatuses] = useState(true);
  const [niceToHaveOpen, setNiceToHaveOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedRoleAssignees, setSelectedRoleAssignees] = useState<string[] | null>(null);
  const [filterStatusCategory, setFilterStatusCategory] = useState<StatusCategory | null>(null);
  const [filterTypeCategories, setFilterTypeCategories] = useState<Set<TypeCategory>>(new Set());
  const [reloadingAll, setReloadingAll] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  // State tick/untick của section "Must have" — lift lên đây để header trang điều khiển.
  const [mustHaveUnchecked, setMustHaveUnchecked] = useState<Set<string>>(new Set());

  const toggleTypeFilter = (cat: TypeCategory) => {
    setFilterTypeCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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

  useEffect(() => {
    configAPI.getTeamCapacity()
      .then((res) => {
        const c = res.data || {};
        setTeamCapacity({
          backend: Number(c.backend) || 0,
          web: Number(c.web) || 0,
          mobile: Number(c.mobile) || 0,
          qa: Number(c.qa) || 0,
        });
      })
      .catch(() => {});
  }, []);

  // Reload All: chạy tuần tự Confluence → Parse script → Reload Jira.
  const handleReloadAll = async () => {
    if (reloadingAll) return;
    setReloadingAll(true);
    try {
      await sprintManagementAPI.loadPage(page.pageId);
      toast.success('1/3 · Đã reload Confluence');

      const res = await sprintManagementAPI.parseByScript({ pageIds: [page.pageId] });
      const entry: AnalysisResult = res.data.data;
      setResults((prev) => [entry, ...prev]);
      const ids = collectTicketIds(parseSprintJSON(entry.result));
      await loadTicketCache(ids);
      toast.success('2/3 · Parse script xong');

      if (ids.length) {
        const jiraRes = await sprintManagementAPI.reloadTickets(ids);
        setTicketCache((prev) => ({ ...prev, ...(jiraRes.data.data || {}) }));
      }
      toast.success('3/3 · Đã reload Jira — hoàn tất');
    } catch (err: any) {
      toast.error(`Reload All lỗi: ${err?.response?.data?.error || err.message}`);
    } finally {
      setReloadingAll(false);
    }
  };

  const handleToggleChildTickets = () => setShowChildTickets((v) => !v);

  const latestResult = results[0] || null;
  const latestParsed = latestResult ? parseSprintJSON(latestResult.result) : null;

  // Split sections by name for structured rendering
  const getSection = (name: string) => latestParsed?.sections.find((s) => s.name === name) ?? null;
  const coreSection = getSection('Core');
  const mustHaveSection = getSection('Must have');
  const niceToHaveSection = getSection('Nice to have');

  // Tổng point "Must have" của các item đang tick (theo filter hiện tại).
  const headerMatchLeaf = makeLeafMatcher({ filterAssignees, filterStatusCategory, filterTypeCategories, hideClosedStatuses });
  const mustHaveTotal = mustHaveSection
    ? sumSectionPoints(mustHaveSection, ticketCache, headerMatchLeaf, mustHaveUnchecked)
    : 0;
  // label của các ticket PR trong sprint — đọc thẳng từ Jira, đổi xong cập nhật tại chỗ
  const [prLabels, setPrLabels] = useState<Record<string, string[]>>({});
  const prKeys = Array.from(
    new Set(
      (latestParsed?.sections || [])
        .flatMap((sec) => sec.items.map((it) => it.prNumber))
        .filter((key): key is string => Boolean(key) && /^[A-Z][A-Z0-9]+-\d+$/.test(key))
    )
  ).sort();
  const prKeysSig = prKeys.join(',');

  useEffect(() => {
    if (!prKeys.length) return;
    let alive = true;
    (async () => {
      const next: Record<string, string[]> = {};
      for (let i = 0; i < prKeys.length; i += 50) {
        const batch = prKeys.slice(i, i + 50);
        try {
          const res = await jiraAPI.searchIssues({
            jql: `key IN (${batch.join(',')})`,
            maxResults: 100,
            fields: ['labels'],
          });
          for (const issue of ((res.data.data as { issues?: any[] })?.issues || [])) {
            next[issue.key] = issue.fields?.labels || [];
          }
          // ticket PR không trả về (đã xoá/không có quyền) -> coi như không có label
          batch.forEach((key) => {
            if (!(key in next)) next[key] = [];
          });
        } catch {
          batch.forEach((key) => {
            next[key] = [];
          });
        }
      }
      if (alive) setPrLabels(next);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prKeysSig]);

  // body (description) của ticket PL từng item — check Context + Constraints
  const [bodyChecks, setBodyChecks] = useState<Record<string, BodyCheck>>({});
  const repTickets = new Map<string, CachedSprintTicket>();
  for (const sec of latestParsed?.sections || []) {
    for (const it of sec.items) {
      const r = representativeTicket(it, ticketCache);
      if (r) repTickets.set(r.id, r);
    }
  }
  const repKeys = Array.from(repTickets.keys()).sort();
  // kèm thời điểm reload ticket → bấm reload Jira là check lại body
  const repKeysSig = repKeys.map((k) => `${k}@${repTickets.get(k)?.lastUpdatedAt || ''}`).join(',');

  useEffect(() => {
    if (!repKeys.length) return;
    let alive = true;
    (async () => {
      const next: Record<string, BodyCheck> = {};
      for (let i = 0; i < repKeys.length; i += 50) {
        const batch = repKeys.slice(i, i + 50);
        try {
          const res = await jiraAPI.searchIssues({
            jql: `key IN (${batch.join(',')})`,
            maxResults: 100,
            fields: ['description'],
          });
          for (const issue of ((res.data.data as { issues?: any[] })?.issues || [])) {
            next[issue.key] = checkBody(issue.fields?.description);
          }
          batch.forEach((key) => {
            if (!(key in next)) next[key] = { context: false, constraints: false };
          });
        } catch {
          // lỗi tải → bỏ qua, badge giữ "…"
        }
      }
      if (alive) setBodyChecks(next);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repKeysSig]);

  const handlePrLabelsChange = useCallback((prKey: string, nextLabels: string[]) => {
    setPrLabels((prev) => ({ ...prev, [prKey]: nextLabels }));
  }, []);

  // story gắn sprint này trên Jira (PL + PLO) — để soi story lọt ngoài Must have / Nice to have
  const pageSprintNumber = sprintNumberOfTitle(page.title);
  const [sprintStories, setSprintStories] = useState<HealthIssue[] | null>(null);

  useEffect(() => {
    if (!pageSprintNumber) return;
    let alive = true;
    (async () => {
      const found: HealthIssue[] = [];
      let nextPageToken: string | undefined;
      try {
        for (let pageNo = 0; pageNo < 5; pageNo++) {
          const res = await jiraAPI.searchIssues({
            jql: 'project IN (PL, PLO) AND issuetype = Story AND (sprint IN openSprints() OR sprint IN futureSprints())',
            maxResults: 100,
            fields: ['summary', 'status', 'assignee', 'issuetype', 'fixVersions'],
            nextPageToken,
          });
          const payload = res.data.data as { issues?: any[]; nextPageToken?: string } | undefined;
          for (const issue of payload?.issues || []) {
            const sprints: Array<{ name: string; state?: string }> = issue.fields?.normalizedSprints || [];
            const inThisSprint = sprints.some(
              (sp) => (sp.state || '').toLowerCase() !== 'closed' && sprintNumberOfTitle(sp.name) === pageSprintNumber
            );
            if (!inThisSprint) continue;
            found.push({
              id: issue.key,
              name: issue.fields?.summary || '',
              type: issue.fields?.issuetype?.name || 'Story',
              status: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
              assignee: issue.fields?.normalizedAssigneeName || '',
              fixVersions: issue.fields?.normalizedFixVersionNames || [],
            });
          }
          nextPageToken = payload?.nextPageToken;
          if (!nextPageToken) break;
        }
        if (alive) setSprintStories(found);
      } catch {
        if (alive) setSprintStories(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pageSprintNumber]);

  const activeSprintNumbers = useActiveSprintNumbers();
  const isActiveSprint = activeSprintNumbers.has(sprintNumberOfTitle(page.title));

  const mustHavePercent = mustHaveSection
    ? sumSectionPercent(mustHaveSection, ticketCache, teamCapacity, headerMatchLeaf, mustHaveUnchecked)
    : 0;
  const mustHaveAllChecked = mustHaveUnchecked.size === 0;
  const toggleMustHaveAll = () => {
    if (!mustHaveSection) return;
    setMustHaveUnchecked(mustHaveAllChecked ? new Set(mustHaveSection.items.map(sectionItemKey)) : new Set());
  };

  const strayStories = (() => {
    if (!sprintStories) return undefined;
    const listed = new Set<string>();
    const walk = (id: string) => {
      if (!id || listed.has(id)) return;
      listed.add(id);
      (ticketCache[id]?.children || []).forEach(walk);
    };
    [coreSection, mustHaveSection, niceToHaveSection].forEach((sec) =>
      sec?.items.forEach((item) => item.tickets.forEach((t) => walk(t.id)))
    );
    return sprintStories
      .filter((story) => !listed.has(story.id) && statusCategoryOf(story.status || '') !== 'done')
      .sort((a, b) => a.id.localeCompare(b.id));
  })();

  const commonSectionProps = {
    jiraBase,
    ticketCache,
    teamCapacity,
    showChildTickets,
    filterAssignees,
    filterStatusCategory,
    filterTypeCategories,
    hideClosedStatuses,
    prLabels,
    onPrLabelsChange: handlePrLabelsChange,
    bodyChecks,
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
    <div className="space-y-3 pb-24">
      {/* Thanh công cụ sticky — thay cho tiêu đề trang */}
      <div className="sticky top-0 z-40 -mx-8 -mt-8 px-8 py-2 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mr-1 flex items-center gap-1.5 text-lg font-bold text-gray-900" title={page.title}>
            {sprintPageLabel(page.title)}
            {isActiveSprint && <span title="Sprint đang chạy">{ACTIVE_SPRINT_ICON}</span>}
          </span>
          <button
            onClick={handleReloadAll}
            disabled={reloadingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
            title={`Chạy tuần tự: Reload Confluence → Parse script → Reload Jira${
              latestResult ? ` · lần parse gần nhất ${formatDate(latestResult.timestamp)}` : ''
            }`}
          >
            {reloadingAll ? <><span className="animate-spin inline-block">⏳</span> Đang reload...</> : '🔄 Reload'}
          </button>
          <a
            href={confluencePageUrl(page.pageId)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Mở page Confluence: ${page.title}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            📄 Confluence ↗
          </a>

          {/* Bộ lọc theo loại — dropdown cho gọn */}
          <div className="relative">
            <button
              onClick={() => setTypeMenuOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                filterTypeCategories.size > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Lọc loại{filterTypeCategories.size > 0 ? ` (${filterTypeCategories.size})` : ''}
              <span className="opacity-50 text-[10px]">▾</span>
            </button>
            {typeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTypeMenuOpen(false)} />
                <div className="absolute left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[190px]">
                  {TYPE_CATEGORY_ORDER.map((cat) => {
                    const active = filterTypeCategories.has(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleTypeFilter(cat)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        <span className={`w-4 h-4 inline-flex items-center justify-center rounded border text-[10px] ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                        {TYPE_CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                  {filterTypeCategories.size > 0 && (
                    <button
                      onClick={() => setFilterTypeCategories(new Set())}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-gray-50 border-t border-gray-100 mt-1"
                    >
                      ✕ Bỏ lọc loại
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <label
            className="flex cursor-pointer items-center gap-1.5 px-1 text-sm text-gray-600"
            title="Ẩn ticket ở status Will Not Do và Request Bot To Delete"
          >
            <input
              type="checkbox"
              checked={hideClosedStatuses}
              onChange={(e) => setHideClosedStatuses(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Ẩn ticket đã huỷ
          </label>

          <button
            onClick={handleToggleChildTickets}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showChildTickets ? 'Thu gọn tất cả' : 'Mở tất cả'}
          </button>

          {mustHaveSection && (
            <div className="ml-auto flex items-center gap-2">
              <span
                className="text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg"
                title="Tổng story point Must have của các item đang tick (theo filter hiện tại)"
              >
                Must have: {mustHaveTotal} SP
              </span>
              {mustHavePercent > 0 && (
                <span
                  className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg"
                  title="Tổng % tải so với capacity team của các item Must have đang tick"
                >
                  {fmtPercent(mustHavePercent)}
                </span>
              )}
              <button
                onClick={toggleMustHaveAll}
                className="px-2.5 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {mustHaveAllChecked ? 'Bỏ tick tất cả' : 'Tick tất cả'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dữ liệu sprint — tên + thời điểm parse đã lên thanh công cụ */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        {loadingResults ? (
          <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : !latestParsed ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            {results.length === 0
              ? 'Chưa có dữ liệu cho sprint này. Bấm "Reload" để bắt đầu.'
              : 'Không parse được JSON.'}
          </div>
        ) : (
          <div className="px-4 py-3 space-y-5">
            {/* Core section */}
            {coreSection && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{coreSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{coreSection.name}</h3>
                  <span className="text-xs text-gray-400">({coreSection.items.length} items)</span>
                </div>
                <SprintSectionTable section={coreSection} {...commonSectionProps} />
              </div>
            )}

            {/* Must have: health check → summary → table */}
            {mustHaveSection && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{mustHaveSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{mustHaveSection.name}</h3>
                  <span className="text-xs text-gray-400">({mustHaveSection.items.length} items)</span>
                </div>
                <SprintHealthCheck
                  section={mustHaveSection}
                  ticketCache={ticketCache}
                  strayStories={strayStories}
                  sprintNumber={pageSprintNumber}
                />
                <SprintSummaryTable sections={[mustHaveSection]} {...commonSummaryProps} />
                <SprintSectionTable
                  section={mustHaveSection}
                  {...commonSectionProps}
                  uncheckedItems={mustHaveUnchecked}
                  onUncheckedItemsChange={setMustHaveUnchecked}
                  hideTotals
                />
              </div>
            )}

            {/* Nice to have: lazy — only render content when opened */}
            {niceToHaveSection && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setNiceToHaveOpen((p) => !p)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-mono text-gray-400">{niceToHaveOpen ? '▼' : '▶'}</span>
                  <span className="text-base">{niceToHaveSection.emoji}</span>
                  <h3 className="font-bold text-gray-900">{niceToHaveSection.name}</h3>
                  <span className="text-xs text-gray-400">({niceToHaveSection.items.length} items)</span>
                  {!niceToHaveOpen && <span className="text-xs text-gray-400 italic">— bấm để xem</span>}
                </button>
                {niceToHaveOpen && (
                  <>
                    <SprintHealthCheck section={niceToHaveSection} ticketCache={ticketCache} sprintNumber={pageSprintNumber} />
                    <SprintSummaryTable sections={[niceToHaveSection]} {...commonSummaryProps} />
                    <SprintSectionTable section={niceToHaveSection} {...commonSectionProps} />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
