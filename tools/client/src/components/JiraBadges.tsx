import React from 'react';

/**
 * Badge status / type theo bảng màu của Jira — dùng chung cho Dashboard, Backlog,
 * Sprint Management để mọi trang hiển thị status cùng một kiểu.
 */


export type JiraStatusCategory = 'new' | 'indeterminate' | 'done';

// Bảng màu lexical của Jira theo status category.
const STATUS_CATEGORY_STYLE: Record<JiraStatusCategory, string> = {
  new: 'bg-[#DFE1E6] text-[#42526E]',
  indeterminate: 'bg-[#DEEBFF] text-[#0052CC]',
  done: 'bg-[#E3FCEF] text-[#006644]',
};

// Chỉ dùng khi không có statusCategory từ Jira (vd dữ liệu cache của Sprint Management).
// PO/TM Review tính là xong phía team — đúng quy ước Sprint Management đang dùng.
const DONE_STATUS_NAMES = new Set([
  'done', 'closed', 'released', 'ready4release', 'will not do', 'resolved', 'cancelled', 'canceled',
  'po/tm review', 'request bot to delete', 'test passed', 'converted to bug',
]);
const NEW_STATUS_NAMES = new Set(['open', 'to do', 'backlog', 'draft', 'new', 'wait4dev', 'in coding']);

export function statusCategoryOf(statusName: string, rawCategoryKey?: string): JiraStatusCategory {
  const raw = (rawCategoryKey || '').toLowerCase();
  if (raw === 'new' || raw === 'indeterminate' || raw === 'done') return raw;
  const s = (statusName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (DONE_STATUS_NAMES.has(s)) return 'done';
  if (NEW_STATUS_NAMES.has(s)) return 'new';
  return 'indeterminate';
}

/** className của pill — dùng khi cần gắn vào phần tử khác span (vd nút đổi status). */
export function statusPillClassOf(name: string, categoryKey?: string): string {
  return STATUS_CATEGORY_STYLE[statusCategoryOf(name, categoryKey)];
}

export function JiraStatusPill({ name, categoryKey }: { name: string; categoryKey?: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  const cls = STATUS_CATEGORY_STYLE[statusCategoryOf(name, categoryKey)];
  return (
    <span className={`inline-block rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {name}
    </span>
  );
}

// Màu/glyph icon type theo Jira.
export function typeVisual(typeName: string): { color: string; glyph: string } {
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

export function JiraTypeTag({ name }: { name: string }) {
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
