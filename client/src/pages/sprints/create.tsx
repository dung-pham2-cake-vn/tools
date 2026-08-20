import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jiraAPI } from '@/utils/api';
import type {
  SprintCreatePayload,
  SprintCreateResult,
  SprintSuggestionResult,
} from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';
const DEFAULT_COUNT = 5;
const UTC7_MS = 7 * 60 * 60 * 1000;

interface BoardOption {
  key: string;
  boardId: number;
  label: string;
  projectKey: string;
  hint: string;
}

// Board scrum sở hữu sprint. Sprint name pattern lấy từ chính sprint cuối của board, không hardcode.
const BOARDS: BoardOption[] = [
  {
    key: 'PL',
    boardId: 4,
    label: 'PL — Lending',
    projectKey: 'PL',
    hint: 'Board "Lending: All teams" · sprint đặt tên "Sprint N - Lending"',
  },
  {
    key: 'DOP',
    boardId: 51,
    label: 'DOP',
    projectKey: 'DOP',
    hint: 'Board "DOP: All teams" · sprint đặt tên "Sprint N - DOP"',
  },
];

interface DraftRow {
  id: string;
  selected: boolean;
  name: string;
  /** datetime-local value, giờ UTC+7 */
  start: string;
  end: string;
  goal: string;
  exists: boolean;
}

/** ISO (UTC) -> value cho input datetime-local, hiển thị theo giờ UTC+7. */
function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + UTC7_MS).toISOString().slice(0, 16);
}

/** value datetime-local (giờ UTC+7) -> ISO UTC gửi lên Jira. */
function localInputToIso(value: string): string {
  if (!value) return '';
  const asUtc = new Date(`${value}:00.000Z`);
  if (Number.isNaN(asUtc.getTime())) return '';
  return new Date(asUtc.getTime() - UTC7_MS).toISOString();
}

function formatUtc7(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Date(d.getTime() + UTC7_MS).toISOString().slice(0, 16).replace('T', ' ');
}

function durationDays(startLocal: string, endLocal: string): number | null {
  if (!startLocal || !endLocal) return null;
  const start = new Date(`${startLocal}:00.000Z`).getTime();
  const end = new Date(`${endLocal}:00.000Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round(((end - start) / (24 * 60 * 60 * 1000)) * 10) / 10;
}

function stateBadgeClass(state?: string): string {
  if (state === 'active') return 'bg-green-100 text-green-700 border-green-200';
  if (state === 'future') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

const CreateSprintPage: React.FC = () => {
  const [board, setBoard] = useState<BoardOption>(BOARDS[0]);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SprintSuggestionResult | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [dryRun, setDryRun] = useState<SprintCreatePayload[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<SprintCreateResult[] | null>(null);

  const load = useCallback(
    async (target: BoardOption, howMany: number) => {
      setLoading(true);
      setError(null);
      setDryRun(null);
      setResults(null);
      try {
        const response = await jiraAPI.suggestBoardSprints(target.boardId, howMany);
        const data: SprintSuggestionResult = response.data.data;
        setMeta(data);
        setRows(
          data.suggestions.map((suggestion, index) => ({
            id: `${target.boardId}-${suggestion.name}-${index}`,
            selected: !suggestion.exists,
            name: suggestion.name,
            start: isoToLocalInput(suggestion.startDate),
            end: isoToLocalInput(suggestion.endDate),
            goal: '',
            exists: suggestion.exists,
          }))
        );
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Không tải được đề xuất sprint');
        setMeta(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(board, count);
  }, [board, count, load]);

  const patchRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setDryRun(null);
    setResults(null);
  };

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);

  const validationErrors = useMemo(() => {
    const problems: string[] = [];
    const seen = new Set<string>();

    selectedRows.forEach((row) => {
      const name = row.name.trim();
      if (!name) problems.push('Có sprint chưa đặt tên');
      if (seen.has(name.toLowerCase())) problems.push(`Trùng tên trong danh sách: ${name}`);
      seen.add(name.toLowerCase());
      if (!row.start || !row.end) {
        problems.push(`${name || 'Sprint'}: thiếu ngày bắt đầu/kết thúc`);
        return;
      }
      if (new Date(`${row.end}:00.000Z`) <= new Date(`${row.start}:00.000Z`)) {
        problems.push(`${name}: ngày kết thúc phải sau ngày bắt đầu`);
      }
    });

    return Array.from(new Set(problems));
  }, [selectedRows]);

  const buildPayloads = (): SprintCreatePayload[] =>
    selectedRows.map((row) => ({
      name: row.name.trim(),
      originBoardId: board.boardId,
      startDate: localInputToIso(row.start),
      endDate: localInputToIso(row.end),
      ...(row.goal.trim() ? { goal: row.goal.trim() } : {}),
    }));

  const handleDryRun = () => {
    setResults(null);
    setDryRun(buildPayloads());
  };

  const handleCreate = async () => {
    const payloads = dryRun ?? buildPayloads();
    const confirmed = window.confirm(
      `Tạo ${payloads.length} sprint trên board "${board.label}" (id ${board.boardId})?\n\n` +
        payloads.map((p) => `• ${p.name}`).join('\n')
    );
    if (!confirmed) return;

    setCreating(true);
    setError(null);
    try {
      const response = await jiraAPI.createSprints(payloads);
      setResults(response.data.data.results as SprintCreateResult[]);
      await load(board, count);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Tạo sprint thất bại');
    } finally {
      setCreating(false);
    }
  };

  const createdCount = results?.filter((r) => r.success).length ?? 0;
  const failedCount = results ? results.length - createdCount : 0;
  const canSubmit = selectedRows.length > 0 && validationErrors.length === 0 && !creating && !loading;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo Sprint</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Đề xuất {count} sprint kế tiếp cho board, chu kỳ{' '}
            <span className="font-semibold">{meta?.cadenceDays ?? 14} ngày</span>, nối liền sprint cuối
            của chính board đó. Ngày giờ hiển thị theo <span className="font-semibold">UTC+7</span> và
            sửa được trước khi tạo.
          </p>
        </div>
        <button
          onClick={() => load(board, count)}
          disabled={loading || creating}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? 'Đang tải…' : '↻ Tải lại đề xuất'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Board</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {BOARDS.map((option) => (
              <button
                key={option.key}
                onClick={() => setBoard(option)}
                disabled={creating}
                className={`px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  option.boardId === board.boardId
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Số sprint</span>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={creating}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-gray-500">{board.hint}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {meta?.lastSprint && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Sprint cuối trên board:</span>
          <a
            href={`${JIRA_BASE}/jira/software/c/projects/${board.projectKey}/boards/${board.boardId}/backlog`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline font-semibold"
          >
            {meta.lastSprint.name}
          </a>
          <span
            className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${stateBadgeClass(
              meta.lastSprint.state
            )}`}
          >
            {meta.lastSprint.state}
          </span>
          <span className="text-gray-500">
            {formatUtc7(meta.lastSprint.startDate)} → {formatUtc7(meta.lastSprint.endDate)}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {loading ? 'Đang tải…' : `${selectedRows.length}/${rows.length} sprint được chọn`}
          </span>
          <button
            onClick={() =>
              setRows((prev) => {
                const allOn = prev.every((row) => row.selected);
                return prev.map((row) => ({ ...row, selected: !allOn }));
              })
            }
            disabled={rows.length === 0 || creating}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Chọn / bỏ chọn tất cả
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Đang lấy sprint từ Jira…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">Không có đề xuất nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-10"> </th>
                  <th className="px-4 py-3 text-left font-semibold">Tên sprint</th>
                  <th className="px-4 py-3 text-left font-semibold">Bắt đầu (UTC+7)</th>
                  <th className="px-4 py-3 text-left font-semibold">Kết thúc (UTC+7)</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">Số ngày</th>
                  <th className="px-4 py-3 text-left font-semibold">Goal (tùy chọn)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const days = durationDays(row.start, row.end);
                  return (
                    <tr key={row.id} className={row.selected ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { selected: event.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.name}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { name: event.target.value })}
                          className="w-64 rounded border border-gray-200 px-2 py-1 font-semibold text-gray-900"
                        />
                        {row.exists && (
                          <div className="mt-1 text-xs text-amber-600">⚠ Tên này đã tồn tại trên board</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="datetime-local"
                          value={row.start}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { start: event.target.value })}
                          className="rounded border border-gray-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="datetime-local"
                          value={row.end}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { end: event.target.value })}
                          className="rounded border border-gray-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{days === null ? '—' : days}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.goal}
                          disabled={creating}
                          placeholder="—"
                          onChange={(event) => patchRow(row.id, { goal: event.target.value })}
                          className="w-full min-w-[200px] rounded border border-gray-200 px-2 py-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-semibold mb-1">Cần sửa trước khi tạo:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {validationErrors.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={handleDryRun}
          disabled={selectedRows.length === 0 || validationErrors.length > 0 || creating}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          🔍 Dry-run — xem payload
        </button>
        <button
          onClick={handleCreate}
          disabled={!canSubmit || !dryRun}
          title={!dryRun ? 'Chạy dry-run trước' : undefined}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {creating ? 'Đang tạo…' : `✓ Tạo ${selectedRows.length} sprint`}
        </button>
        {!dryRun && selectedRows.length > 0 && (
          <span className="text-xs text-gray-500">Chạy dry-run để xem payload trước khi tạo.</span>
        )}
      </div>

      {dryRun && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Dry-run · POST {`{JIRA_HOST}`}/rest/agile/1.0/sprint × {dryRun.length}
            </span>
            <span className="text-xs text-gray-500">Chưa gọi Jira — chỉ hiển thị payload</span>
          </div>
          <pre className="px-4 py-3 text-xs text-gray-800 bg-gray-50 overflow-x-auto">
            {JSON.stringify(dryRun, null, 2)}
          </pre>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Kết quả: {createdCount} thành công
            {failedCount > 0 && <span className="text-red-600"> · {failedCount} lỗi</span>}
          </div>
          <ul className="divide-y divide-gray-100">
            {results.map((result) => (
              <li key={result.name} className="px-4 py-3 text-sm flex flex-wrap items-center gap-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✓' : '✗'}
                </span>
                <span className="font-semibold text-gray-900">{result.name}</span>
                {result.success && result.sprint && (
                  <span className="text-gray-500">id {result.sprint.id}</span>
                )}
                {!result.success && <span className="text-red-600">{result.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CreateSprintPage;
