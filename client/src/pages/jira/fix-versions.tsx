import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jiraAPI } from '@/utils/api';
import type {
  VersionCreatePayload,
  VersionCreateResult,
  VersionSuggestionResult,
} from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';
const DEFAULT_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ProjectOption {
  key: string;
  projectKey: string;
  boardId: number;
  label: string;
  hint: string;
}

// Fix version ở đây luôn trùng tên sprint, nên boardId dùng để lấy đúng ngày của sprint.
const PROJECTS: ProjectOption[] = [
  {
    key: 'PL',
    projectKey: 'PL',
    boardId: 4,
    label: 'PL — Lending',
    hint: 'Fix version đặt tên "Sprint N - Lending", ngày lấy từ sprint cùng tên trên board Lending',
  },
  {
    key: 'DOP',
    projectKey: 'DOP',
    boardId: 51,
    label: 'DOP',
    hint: 'Fix version đặt tên theo version cuối của project DOP, ngày lấy từ sprint cùng tên',
  },
];

interface DraftRow {
  id: string;
  selected: boolean;
  name: string;
  /** YYYY-MM-DD */
  start: string;
  release: string;
  description: string;
  exists: boolean;
  fromSprint: boolean;
}

function durationDays(start: string, release: string): number | null {
  if (!start || !release) return null;
  const from = new Date(`${start}T00:00:00.000Z`).getTime();
  const to = new Date(`${release}T00:00:00.000Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / DAY_MS);
}

function formatDate(value?: string): string {
  return value ? value : '—';
}

const FixVersionsPage: React.FC = () => {
  const [project, setProject] = useState<ProjectOption>(PROJECTS[0]);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VersionSuggestionResult | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [dryRun, setDryRun] = useState<VersionCreatePayload[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<VersionCreateResult[] | null>(null);

  const load = useCallback(async (target: ProjectOption, howMany: number) => {
    setLoading(true);
    setError(null);
    setDryRun(null);
    setResults(null);
    try {
      const response = await jiraAPI.suggestProjectVersions(target.projectKey, howMany, target.boardId);
      const data: VersionSuggestionResult = response.data.data;
      setMeta(data);
      setRows(
        data.suggestions.map((suggestion, index) => ({
          id: `${target.projectKey}-${suggestion.name}-${index}`,
          selected: !suggestion.exists,
          name: suggestion.name,
          start: suggestion.startDate,
          release: suggestion.releaseDate,
          description: '',
          exists: suggestion.exists,
          fromSprint: suggestion.fromSprint,
        }))
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Không tải được đề xuất fix version');
      setMeta(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(project, count);
  }, [project, count, load]);

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
      if (!name) problems.push('Có fix version chưa đặt tên');
      if (seen.has(name.toLowerCase())) problems.push(`Trùng tên trong danh sách: ${name}`);
      seen.add(name.toLowerCase());
      if (row.exists) problems.push(`${name}: đã tồn tại trên project — bỏ chọn dòng này`);
      if (!row.start || !row.release) {
        problems.push(`${name || 'Fix version'}: thiếu ngày bắt đầu/release`);
        return;
      }
      if (new Date(`${row.release}T00:00:00.000Z`) <= new Date(`${row.start}T00:00:00.000Z`)) {
        problems.push(`${name}: ngày release phải sau ngày bắt đầu`);
      }
    });

    return Array.from(new Set(problems));
  }, [selectedRows]);

  const buildPayloads = (): VersionCreatePayload[] =>
    selectedRows.map((row) => ({
      name: row.name.trim(),
      startDate: row.start,
      releaseDate: row.release,
      ...(row.description.trim() ? { description: row.description.trim() } : {}),
    }));

  const handleDryRun = () => {
    setResults(null);
    setDryRun(buildPayloads());
  };

  const handleCreate = async () => {
    const payloads = dryRun ?? buildPayloads();
    const confirmed = window.confirm(
      `Tạo ${payloads.length} fix version trên project "${project.projectKey}"?\n\n` +
        payloads.map((p) => `• ${p.name} (${p.startDate} → ${p.releaseDate})`).join('\n')
    );
    if (!confirmed) return;

    setCreating(true);
    setError(null);
    try {
      const response = await jiraAPI.createProjectVersions(project.projectKey, payloads);
      setResults(response.data.data.results as VersionCreateResult[]);
      await load(project, count);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Tạo fix version thất bại');
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
          <h1 className="text-3xl font-bold text-gray-900">Tạo Fix Version</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Đề xuất {count} fix version kế tiếp cho project, suy ra từ version cuối. Nếu sprint cùng tên
            đã có trên board thì <span className="font-semibold">lấy đúng ngày của sprint</span>, nếu chưa
            thì nối tiếp theo chu kỳ{' '}
            <span className="font-semibold">{meta?.cadenceDays ?? 14} ngày</span>. Ngày sửa được trước khi
            tạo.
          </p>
        </div>
        <button
          onClick={() => load(project, count)}
          disabled={loading || creating}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? 'Đang tải…' : '↻ Tải lại đề xuất'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Project</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {PROJECTS.map((option) => (
              <button
                key={option.key}
                onClick={() => setProject(option)}
                disabled={creating}
                className={`px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  option.projectKey === project.projectKey
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
          <span className="text-sm font-semibold text-gray-700">Số version</span>
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

        <span className="text-xs text-gray-500">{project.hint}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {meta?.lastVersion && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Version cuối trên project:</span>
          <a
            href={`${JIRA_BASE}/projects/${project.projectKey}?selectedItem=com.atlassian.jira.jira-projects-plugin:release-page`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline font-semibold"
          >
            {meta.lastVersion.name}
          </a>
          <span
            className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${
              meta.lastVersion.released
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            {meta.lastVersion.released ? 'released' : 'unreleased'}
          </span>
          <span className="text-gray-500">
            {formatDate(meta.lastVersion.startDate)} → {formatDate(meta.lastVersion.releaseDate)}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">
            {loading ? 'Đang tải…' : `${selectedRows.length}/${rows.length} version được chọn`}
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
          <div className="py-12 text-center text-gray-500 text-sm">Đang lấy version từ Jira…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">Không có đề xuất nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-10"> </th>
                  <th className="px-4 py-3 text-left font-semibold">Tên fix version</th>
                  <th className="px-4 py-3 text-left font-semibold">Start date</th>
                  <th className="px-4 py-3 text-left font-semibold">Release date</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">Số ngày</th>
                  <th className="px-4 py-3 text-left font-semibold">Description (tùy chọn)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const days = durationDays(row.start, row.release);
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
                        {row.exists ? (
                          <div className="mt-1 text-xs text-amber-600">
                            ⚠ Version này đã tồn tại trên project
                          </div>
                        ) : row.fromSprint ? (
                          <div className="mt-1 text-xs text-green-600">✓ Ngày khớp sprint cùng tên</div>
                        ) : (
                          <div className="mt-1 text-xs text-gray-400">
                            Chưa có sprint cùng tên — ngày suy ra theo chu kỳ
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={row.start}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { start: event.target.value })}
                          className="rounded border border-gray-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={row.release}
                          disabled={creating}
                          onChange={(event) => patchRow(row.id, { release: event.target.value })}
                          className="rounded border border-gray-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{days === null ? '—' : days}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.description}
                          disabled={creating}
                          placeholder="—"
                          onChange={(event) => patchRow(row.id, { description: event.target.value })}
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
          {creating ? 'Đang tạo…' : `✓ Tạo ${selectedRows.length} fix version`}
        </button>
        {!dryRun && selectedRows.length > 0 && (
          <span className="text-xs text-gray-500">Chạy dry-run để xem payload trước khi tạo.</span>
        )}
      </div>

      {dryRun && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Dry-run · POST {`{JIRA_HOST}`}/rest/api/3/version × {dryRun.length}
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
                {result.success && result.version && (
                  <span className="text-gray-500">
                    id {result.version.id} · {formatDate(result.version.startDate)} →{' '}
                    {formatDate(result.version.releaseDate)}
                  </span>
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

export default FixVersionsPage;
