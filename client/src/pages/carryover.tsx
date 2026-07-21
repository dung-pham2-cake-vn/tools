import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jiraAPI } from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

// Tối thiểu số sprint một ticket phải trải qua để bị coi là "tồn đọng".
const MIN_SPRINTS = 3;

// Ticket nằm trong sprint hiện tại (openSprints), chưa hoàn tất (statusCategory != Done).
const JQL =
  'project IN (DOP, PLO, PL) AND Sprint IN openSprints() AND statusCategory != Done ORDER BY created ASC';

interface NormalizedSprintDetail {
  id?: number;
  name: string;
  state?: string;
}

interface CarryoverTicket {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  issueType: string;
  sprintCount: number;
  created: string;
  daysSinceCreated: number;
}

type SortKey = 'sprintCount' | 'daysSinceCreated';

const UTC7_MS = 7 * 60 * 60 * 1000;

function toUtc7(value: string | number | Date): Date {
  return new Date(new Date(value).getTime() + UTC7_MS);
}

function daysBetween(createdIso: string, nowMs: number): number {
  const created = toUtc7(createdIso).getTime();
  const now = toUtc7(nowMs).getTime();
  return Math.max(0, Math.floor((now - created) / (24 * 60 * 60 * 1000)));
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return toUtc7(iso).toISOString().slice(0, 10);
}

function shortName(fullName: string): string {
  if (!fullName) return 'Chưa gán';
  const clean = fullName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length <= 2) return clean;
  return `${parts[parts.length - 1]} ${parts[0]}`;
}

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase().replace(/\s+/g, ' ').trim();
  if (['OPEN', 'DRAFT', 'TO DO', 'BACKLOG'].includes(s)) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (['IN CODING', 'IN PROGRESS', 'READY4TEST', 'IN TESTING', 'TEST FAILED', 'WAIT4DEV'].includes(s)) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (['PO/TM REVIEW', 'READY4RELEASE'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function daysBadgeClass(days: number): string {
  if (days >= 90) return 'text-red-700 font-bold';
  if (days >= 45) return 'text-orange-600 font-semibold';
  return 'text-gray-600';
}

export default function CarryoverPage() {
  const [tickets, setTickets] = useState<CarryoverTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('sprintCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jiraAPI.searchIssues({
        jql: JQL,
        maxResults: 500,
        fields: ['summary', 'status', 'assignee', 'created', 'issuetype'],
      });
      const issues: any[] = ((res.data.data as { issues?: any[] })?.issues) || [];
      const nowMs = Date.now();
      const mapped: CarryoverTicket[] = issues
        .map((issue: any) => {
          const sprints: NormalizedSprintDetail[] = issue.fields?.normalizedSprints || [];
          const created: string = issue.fields?.created || '';
          return {
            key: issue.key as string,
            summary: issue.fields?.summary || '',
            status: issue.fields?.normalizedStatusName || '',
            assignee: issue.fields?.normalizedAssigneeName || '',
            issueType: issue.fields?.issuetype?.name || '',
            sprintCount: sprints.length,
            created,
            daysSinceCreated: created ? daysBetween(created, nowMs) : 0,
          };
        })
        .filter((t) => t.sprintCount >= MIN_SPRINTS);
      setTickets(mapped);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Không tải được dữ liệu');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...tickets].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      if (diff !== 0) return diff * dir;
      // tie-break: nhiều sprint trước, rồi cũ hơn trước
      return (b.sprintCount - a.sprintCount) || (b.daysSinceCreated - a.daysSinceCreated);
    });
  }, [tickets, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ticket tồn đọng nhiều sprint</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Ticket ở board <span className="font-semibold">DOP · PLO · PL</span> đang trong sprint hiện tại,
            trải qua từ <span className="font-semibold">{MIN_SPRINTS} sprint</span> trở lên, chưa hoàn tất.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? 'Đang tải…' : '↻ Tải lại'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {loading ? 'Đang tải…' : `${sorted.length} ticket`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Đang tải dữ liệu từ Jira…</div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            🎉 Không có ticket nào tồn đọng từ {MIN_SPRINTS} sprint trở lên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold w-[120px]">Ticket</th>
                  <th className="text-left px-3 py-2 font-semibold">Tên</th>
                  <th className="text-left px-3 py-2 font-semibold w-[160px]">Assignee</th>
                  <th className="text-left px-3 py-2 font-semibold w-[130px]">Trạng thái</th>
                  <th
                    className="text-right px-3 py-2 font-semibold w-[90px] cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('sprintCount')}
                    title="Sắp xếp theo số sprint"
                  >
                    Số sprint{sortArrow('sprintCount')}
                  </th>
                  <th
                    className="text-right px-3 py-2 font-semibold w-[130px] cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('daysSinceCreated')}
                    title="Sắp xếp theo số ngày từ ngày tạo"
                  >
                    Số ngày tạo{sortArrow('daysSinceCreated')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.key} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <a
                        href={`${JIRA_BASE}/browse/${t.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs font-semibold"
                      >
                        {t.key}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{t.summary || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {t.assignee ? shortName(t.assignee) : <span className="text-red-500">Chưa gán</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadgeClass(t.status)}`}>
                        {t.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded font-mono text-xs font-bold ${
                          t.sprintCount >= 5
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                        title={`Đã trải qua ${t.sprintCount} sprint`}
                      >
                        {t.sprintCount}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono text-xs ${daysBadgeClass(t.daysSinceCreated)}`} title={`Tạo ngày ${formatDate(t.created)}`}>
                        {t.daysSinceCreated} ngày
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
