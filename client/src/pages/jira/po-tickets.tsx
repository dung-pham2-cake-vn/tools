import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI } from '@/utils/api';

type SortDirection = 'asc' | 'desc';

interface JiraIssueFields {
  summary?: string;
  normalizedAssigneeName?: string;
  normalizedStatusName?: string;
  normalizedPriorityName?: string;
  normalizedSprintNames?: string[];
  normalizedFixVersionNames?: string[];
  issuetype?: { name?: string; subtask?: boolean };
  updated?: string;
}

interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields: JiraIssueFields;
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total?: number;
  nextPageToken?: string;
  isLast?: boolean;
}

type SortKey = 'key' | 'summary' | 'type' | 'assignee' | 'status' | 'sprint' | 'priority' | 'updated';

const PAGE_SIZE = 50;
const PO_ROLE = 'tech product manager';

// Scope giống Dashboard: project IN (PL, "Product: DOP", "Platform: LOS").
// Lấy Task + mọi loại subtask (subTaskIssueTypes() bắt cả Backend-SubTask, ...).
const PO_JQL = `project IN (PL, "Product: DOP", "Platform: LOS")
AND (issuetype = Task OR issuetype IN subTaskIssueTypes())
AND status NOT IN ("Will Not Do", "Will Not Fix", "Test Passed", "Converted To Bug", Invalid, Done, Ready4Release, Released, "Request Bot To Delete")
ORDER BY updated DESC`;

const priorityRank: Record<string, number> = {
  Highest: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Lowest: 1,
};

const isPoAssignee = (name?: string): boolean =>
  (name || '').toLowerCase().includes(PO_ROLE);

const compareValues = (left: string | number, right: string | number): number => {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

const getIssueBrowseUrl = (issue: JiraIssue): string => {
  if (issue.self) {
    const apiBaseUrl = issue.self.split('/rest/api/3/issue/')[0];
    return `${apiBaseUrl}/browse/${issue.key}`;
  }
  return `#${issue.key}`;
};

export default function PoTicketsPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'updated',
    direction: 'desc',
  });

  const fetchPoIssues = async (): Promise<JiraIssue[]> => {
    const all: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    let isLast = false;

    do {
      const response = await jiraAPI.searchIssues({
        jql: PO_JQL,
        maxResults: PAGE_SIZE,
        fields: ['summary', 'assignee', 'status', 'priority', 'issuetype', 'fixVersions', 'updated'],
        nextPageToken,
      });

      const data = response.data.data as JiraSearchResponse;
      const pageIssues = data.issues || [];
      all.push(...pageIssues);
      nextPageToken = data.nextPageToken;
      isLast = Boolean(data.isLast);

      if (pageIssues.length === 0) break;
    } while (!isLast && Boolean(nextPageToken));

    // PO filter client-side: Jira không filter được theo "displayName chứa role".
    return all.filter((issue) => isPoAssignee(issue.fields.normalizedAssigneeName));
  };

  const handleLoad = async () => {
    try {
      setLoading(true);
      const result = await fetchPoIssues();
      setIssues(result);
      setLoaded(true);
      toast.success(`Tìm thấy ${result.length} ticket của PO`);
    } catch (error: any) {
      console.error('Error loading PO tickets:', error);
      toast.error(`Tải thất bại: ${error?.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedIssues = useMemo(() => {
    const getValue = (issue: JiraIssue, key: SortKey): string | number => {
      switch (key) {
        case 'key':
          return issue.key;
        case 'summary':
          return issue.fields.summary || '';
        case 'type':
          return issue.fields.issuetype?.name || '';
        case 'assignee':
          return issue.fields.normalizedAssigneeName || '';
        case 'status':
          return issue.fields.normalizedStatusName || '';
        case 'sprint':
          return (issue.fields.normalizedSprintNames || []).join(', ');
        case 'priority':
          return priorityRank[issue.fields.normalizedPriorityName || ''] || 0;
        case 'updated':
          return issue.fields.updated || '';
        default:
          return '';
      }
    };

    return [...issues].sort((left, right) => {
      const result = compareValues(getValue(left, sort.key), getValue(right, sort.key));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [issues, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIndicator = (active: boolean, direction: SortDirection) =>
    active ? <span className="text-blue-600">{direction === 'asc' ? '↑' : '↓'}</span> : <span className="text-gray-300">↕</span>;

  const taskCount = useMemo(
    () => issues.filter((i) => !i.fields.issuetype?.subtask).length,
    [issues],
  );
  const subtaskCount = issues.length - taskCount;

  const NO_FIX_VERSION = 'Không có Fix Version';

  // Chia ticket theo fix version. Ticket nhiều fixVersion → xuất hiện ở từng group.
  const fixVersionGroups = useMemo(() => {
    const map = new Map<string, JiraIssue[]>();
    for (const issue of sortedIssues) {
      const versions = issue.fields.normalizedFixVersionNames || [];
      const keys = versions.length > 0 ? versions : [NO_FIX_VERSION];
      for (const key of keys) {
        const list = map.get(key) || [];
        list.push(issue);
        map.set(key, list);
      }
    }
    return Array.from(map.entries()).sort((a, b) => {
      // "Không có Fix Version" xuống cuối, còn lại sort theo tên (numeric).
      if (a[0] === NO_FIX_VERSION) return 1;
      if (b[0] === NO_FIX_VERSION) return -1;
      return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [sortedIssues]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">PO Tickets</h1>
          <p className="mt-2 text-sm text-gray-600">
            Task &amp; Subtask đang assign cho PO (<span className="font-semibold text-gray-800">Tech Product Manager</span>)
          </p>
        </div>
        <button
          onClick={handleLoad}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? 'Đang tải...' : 'Reload'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Tổng ticket PO</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{issues.length}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Task</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{taskCount}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Subtask</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{subtaskCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">JQL</p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-gray-600">{PO_JQL}</pre>
        <p className="mt-2 text-xs text-gray-500">
          PO lọc client-side theo assignee chứa &quot;Tech Product Manager&quot;.
        </p>
      </div>

      {sortedIssues.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-md">
          {loading ? 'Đang tải ticket...' : loaded ? 'Không có ticket nào của PO' : 'Chưa tải dữ liệu'}
        </div>
      ) : (
        fixVersionGroups.map(([version, groupIssues]) => (
          <div key={version} className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">📦 {version}</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {groupIssues.length} ticket
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      ['key', 'Ticket ID'],
                      ['summary', 'Ticket Name'],
                      ['type', 'Type'],
                      ['assignee', 'Assignee'],
                      ['status', 'Status'],
                      ['sprint', 'Sprint'],
                      ['priority', 'Priority'],
                      ['updated', 'Updated'],
                    ].map(([key, label]) => (
                      <th key={key} className="px-4 py-3 text-left font-semibold text-gray-700">
                        <button onClick={() => toggleSort(key as SortKey)} className="flex items-center gap-2">
                          {label}
                          {renderSortIndicator(sort.key === key, sort.direction)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {groupIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="px-4 py-3">
                        <a
                          href={getIssueBrowseUrl(issue)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {issue.key}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{issue.fields.summary || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            issue.fields.issuetype?.subtask
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {issue.fields.issuetype?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedAssigneeName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedStatusName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {(issue.fields.normalizedSprintNames || []).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedPriorityName || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {issue.fields.updated ? new Date(issue.fields.updated).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
