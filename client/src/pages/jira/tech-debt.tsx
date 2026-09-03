import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jiraAPI } from '@/utils/api';
import type {
  JiraNamedRef,
  TechDebtCreatePayload,
  TechDebtCreateResult,
  TechDebtSuggestionResult,
} from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';
const DEFAULT_COUNT = 5;
const UTC7_MS = 7 * 60 * 60 * 1000;
const PRIORITY = 'Medium';

interface BoardOption {
  key: string;
  boardId: number;
  projectKey: string;
  label: string;
  hint: string;
}

// Cùng board/project với trang Tạo Sprint — techdebt ticket bám theo sprint của board đó.
const BOARDS: BoardOption[] = [
  {
    key: 'PL',
    boardId: 4,
    projectKey: 'PL',
    label: 'PL — Lending',
    hint: 'Mỗi sprint 1 ticket TechDebt "Techdebt sprint N", gắn label tech-debt + component Backend + sprint + fix version cùng tên',
  },
  {
    key: 'DOP',
    boardId: 51,
    projectKey: 'DOP',
    label: 'DOP',
    hint: 'Chỉ chạy được nếu project DOP có issue type TechDebt',
  },
];

interface DraftRow {
  id: string;
  selected: boolean;
  summary: string;
  sprintId: number;
  sprintName: string;
  sprintState?: string;
  startDate: string | null;
  endDate: string | null;
  labels: string;
  componentIds: string[];
  fixVersion: JiraNamedRef | null;
  existingKey: string | null;
}

function formatUtc7(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Date(d.getTime() + UTC7_MS).toISOString().slice(0, 10);
}

function stateBadgeClass(state?: string): string {
  if (state === 'active') return 'bg-green-100 text-green-700 border-green-200';
  if (state === 'future') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

const TechDebtPage: React.FC = () => {
  const [board, setBoard] = useState<BoardOption>(BOARDS[0]);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TechDebtSuggestionResult | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [dryRun, setDryRun] = useState<TechDebtCreatePayload[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<TechDebtCreateResult[] | null>(null);

  const load = useCallback(async (target: BoardOption, howMany: number) => {
    setLoading(true);
    setError(null);
    setDryRun(null);
    setResults(null);
    try {
      const response = await jiraAPI.suggestTechDebt(target.boardId, target.projectKey, howMany);
      const data: TechDebtSuggestionResult = response.data.data;
      setMeta(data);
      setRows(
        data.suggestions.map((suggestion, index) => ({
          id: `${target.projectKey}-${suggestion.sprintId}-${index}`,
          selected: !suggestion.existingIssue,
          summary: suggestion.summary,
          sprintId: suggestion.sprintId,
          sprintName: suggestion.sprintName,
          sprintState: suggestion.sprintState,
          startDate: suggestion.startDate,
          endDate: suggestion.endDate,
          labels: data.defaultLabels.join(', '),
          componentIds: data.defaultComponents.map((component) => component.id),
          fixVersion: suggestion.fixVersion,
          existingKey: suggestion.existingIssue?.key || null,
        }))
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Không tải được đề xuất techdebt');
      setMeta(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(board, count);
  }, [board, count, load]);

  const patchRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setDryRun(null);
    setResults(null);
  };

  const componentName = (id: string) =>
    meta?.componentOptions.find((component) => component.id === id)?.name || id;

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);

  const validationErrors = useMemo(() => {
    const problems: string[] = [];
    const seen = new Set<string>();

    if (!meta?.issueType && rows.length > 0) {
      problems.push(`Project ${board.projectKey} không có issue type "TechDebt"`);
    }

    selectedRows.forEach((row) => {
      const summary = row.summary.trim();
      if (!summary) problems.push('Có ticket chưa đặt summary');
      if (seen.has(summary.toLowerCase())) problems.push(`Trùng summary trong danh sách: ${summary}`);
      seen.add(summary.toLowerCase());
      if (row.existingKey) problems.push(`${summary}: sprint này đã có ${row.existingKey} — bỏ chọn dòng này`);
      const badLabel = row.labels
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean)
        .find((label) => /\s/.test(label));
      if (badLabel) problems.push(`${summary}: label "${badLabel}" chứa khoảng trắng`);
    });

    return Array.from(new Set(problems));
  }, [selectedRows, meta, rows.length, board.projectKey]);

  const buildPayloads = (): TechDebtCreatePayload[] =>
    selectedRows.map((row) => ({
      projectKey: board.projectKey,
      summary: row.summary.trim(),
      sprintId: row.sprintId,
      ...(meta?.issueType ? { issueTypeId: meta.issueType.id } : {}),
      labels: row.labels.split(',').map((label) => label.trim()).filter(Boolean),
      componentIds: row.componentIds,
      fixVersionIds: row.fixVersion ? [row.fixVersion.id] : [],
      priorityName: PRIORITY,
    }));

  const handleDryRun = () => {
    setResults(null);
    setDryRun(buildPayloads());
  };

  const handleCreate = async () => {
    const payloads = dryRun ?? buildPayloads();
    const confirmed = window.confirm(
      `Tạo ${payloads.length} ticket TechDebt trên project "${board.projectKey}"?\n\n` +
        payloads.map((p) => `• ${p.summary} (sprint ${p.sprintId})`).join('\n')
    );
    if (!confirmed) return;

    setCreating(true);
    setError(null);
    try {
      const response = await jiraAPI.createTechDebtIssues(payloads);
      setResults(response.data.data.results as TechDebtCreateResult[]);
      await load(board, count);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Tạo ticket techdebt thất bại');
    } finally {
      setCreating(false);
    }
  };

  const createdCount = results?.filter((r) => r.success).length ?? 0;
  const failedCount = results ? results.length - createdCount : 0;
  const missingFixVersion = selectedRows.filter((row) => !row.fixVersion).length;
  const canSubmit = selectedRows.length > 0 && validationErrors.length === 0 && !creating && !loading;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo Tech Debt</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Mỗi sprint (active + future) một ticket <span className="font-semibold">TechDebt</span> theo format{' '}
            <a
              href={`${JIRA_BASE}/browse/PL-14023`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline font-semibold"
            >
              PL-14023
            </a>
            : summary <span className="font-semibold">Techdebt sprint N</span>, label{' '}
            <span className="font-semibold">tech-debt</span>, component{' '}
            <span className="font-semibold">Backend</span>, gắn sprint + fix version cùng tên. Sửa được trước
            khi tạo.
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

      {meta && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Issue type:</span>
          {meta.issueType ? (
            <span className="px-2 py-0.5 rounded-full border bg-purple-100 text-purple-700 border-purple-200 text-xs font-semibold">
              {meta.issueType.name} · id {meta.issueType.id}
            </span>
          ) : (
            <span className="text-red-600 font-semibold">không tìm thấy "TechDebt" trên project</span>
          )}
          <span className="text-gray-400">·</span>
          <span className="font-semibold">Priority:</span>
          <span className="text-gray-600">{PRIORITY}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {loading ? 'Đang tải…' : `${selectedRows.length}/${rows.length} ticket được chọn`}
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
          <div className="py-12 text-center text-gray-500 text-sm">Không có sprint active/future nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-10"> </th>
                  <th className="px-4 py-3 text-left font-semibold">Summary</th>
                  <th className="px-4 py-3 text-left font-semibold">Sprint</th>
                  <th className="px-4 py-3 text-left font-semibold">Fix version</th>
                  <th className="px-4 py-3 text-left font-semibold">Component</th>
                  <th className="px-4 py-3 text-left font-semibold">Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className={row.selected ? '' : 'opacity-50'}>
                    <td className="px-4 py-3 align-top pt-4">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={creating}
                        onChange={(event) => patchRow(row.id, { selected: event.target.checked })}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="text"
                        value={row.summary}
                        disabled={creating}
                        onChange={(event) => patchRow(row.id, { summary: event.target.value })}
                        className="w-64 rounded border border-gray-200 px-2 py-1 font-semibold text-gray-900"
                      />
                      {row.existingKey && (
                        <div className="mt-1 text-xs text-amber-600">
                          ⚠ Sprint này đã có{' '}
                          <a
                            href={`${JIRA_BASE}/browse/${row.existingKey}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-semibold"
                          >
                            {row.existingKey}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{row.sprintName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${stateBadgeClass(
                            row.sprintState
                          )}`}
                        >
                          {row.sprintState || '—'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        id {row.sprintId} · {formatUtc7(row.startDate)} → {formatUtc7(row.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.fixVersion ? (
                        <span className="text-gray-800">{row.fixVersion.name}</span>
                      ) : (
                        <span className="text-xs text-amber-600">
                          ⚠ Chưa có version cùng tên — tạo ở tab Tạo Fix Version
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        multiple
                        value={row.componentIds}
                        disabled={creating}
                        onChange={(event) =>
                          patchRow(row.id, {
                            componentIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                          })
                        }
                        className="w-40 h-20 rounded border border-gray-200 px-2 py-1 text-xs"
                      >
                        {(meta?.componentOptions || []).map((component) => (
                          <option key={component.id} value={component.id}>
                            {component.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-xs text-gray-500">
                        {row.componentIds.length === 0
                          ? '—'
                          : row.componentIds.map(componentName).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="text"
                        value={row.labels}
                        disabled={creating}
                        placeholder="tech-debt"
                        onChange={(event) => patchRow(row.id, { labels: event.target.value })}
                        className="w-40 rounded border border-gray-200 px-2 py-1"
                      />
                      <div className="mt-1 text-xs text-gray-400">Ngăn cách bằng dấu phẩy</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {missingFixVersion > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {missingFixVersion} ticket được chọn chưa có fix version cùng tên sprint — vẫn tạo được, nhưng
          field Fix versions sẽ trống.
        </div>
      )}

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
          {creating ? 'Đang tạo…' : `✓ Tạo ${selectedRows.length} ticket techdebt`}
        </button>
        {!dryRun && selectedRows.length > 0 && (
          <span className="text-xs text-gray-500">Chạy dry-run để xem payload trước khi tạo.</span>
        )}
      </div>

      {dryRun && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Dry-run · POST {`{JIRA_HOST}`}/rest/api/3/issue × {dryRun.length}
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
              <li key={result.summary} className="px-4 py-3 text-sm flex flex-wrap items-center gap-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✓' : '✗'}
                </span>
                <span className="font-semibold text-gray-900">{result.summary}</span>
                {result.success && result.issue && (
                  <a
                    href={`${JIRA_BASE}/browse/${result.issue.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    {result.issue.key}
                  </a>
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

export default TechDebtPage;
