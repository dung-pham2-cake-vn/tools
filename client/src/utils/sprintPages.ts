import { useEffect, useState } from 'react';
import { sprintManagementAPI } from '@/utils/api';

/** "[Lending+] - Sprint 197" -> 197; không có số thì 0. */
export function sprintNumberOfTitle(title: string): number {
  const matched = title.match(/[Ss]print\s*(\d+)/);
  return matched ? parseInt(matched[1], 10) : 0;
}

/**
 * Đoạn URL đọc được thay cho pageId Confluence: "[Lending+] - Sprint 197" -> "sprint-197".
 * Không có số sprint thì slug hoá cả tiêu đề.
 */
export function sprintPageSlug(title: string): string {
  const num = sprintNumberOfTitle(title);
  const base = num > 0 ? `sprint-${num}` : title;
  return base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sprintPagePath(title: string): string {
  return `/sprints/management/${sprintPageSlug(title)}`;
}

const UTC7_MS = 7 * 60 * 60 * 1000;

const toUtc7Date = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime() + UTC7_MS).toISOString().slice(0, 10);
};

/** Số các sprint đang chạy hôm nay (theo ngày bắt đầu/kết thúc trên Jira). */
export function useActiveSprintNumbers(): Set<number> {
  const [numbers, setNumbers] = useState<Set<number>>(new Set());

  useEffect(() => {
    sprintManagementAPI
      .getActiveSprints()
      .then((res) => {
        const today = toUtc7Date(new Date().toISOString()) || '';
        const next = new Set<number>();
        for (const sprint of res.data.data || []) {
          const start = toUtc7Date(sprint.startDate);
          const end = toUtc7Date(sprint.endDate);
          if (!start || !end || today < start || today > end) continue;
          const num = sprintNumberOfTitle(sprint.name || '');
          if (num > 0) next.add(num);
        }
        setNumbers(next);
      })
      .catch(() => setNumbers(new Set()));
  }, []);

  return numbers;
}

/** Icon đánh dấu sprint đang chạy — dùng chung cho menu, danh sách và thanh công cụ. */
export const ACTIVE_SPRINT_ICON = '🔥';
