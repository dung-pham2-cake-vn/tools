import React, { useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI } from '@/utils/api';

type SortDirection = 'asc' | 'desc';

interface JiraIssueFields {
  summary?: string;
  normalizedStoryPoints?: number;
  normalizedAssigneeName?: string;
  normalizedStatusName?: string;
  normalizedSprintNames?: string[];
  normalizedFixVersionNames?: string[];
  normalizedPriorityName?: string;
}

interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields: JiraIssueFields;
}

interface AssigneeSummary {
  assignee: string;
  storyPoints: number;
  ticketCount: number;
  withPoints: number;
  withoutPoints: number;
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total?: number;
  startAt?: number;
  maxResults?: number;
  nextPageToken?: string;
  isLast?: boolean;
}

type TicketSortKey =
  | 'key'
  | 'summary'
  | 'storyPoints'
  | 'assignee'
  | 'status'
  | 'sprint'
  | 'fixVersions'
  | 'priority';

const PAGE_SIZE = 50;
const DEFAULT_SPRINT = '186';

const buildSprintJql = (sprintNumber: string) => `project IN (PL, "Product: DOP", "Platform: LOS")
AND status NOT IN ("PO/TM Review", "Will Not Do", Done, Ready4Release, Released, "Request Bot To Delete")
and type = Backend-SubTask
AND (Sprint in ("Sprint ${sprintNumber} - Lending", "Sprint ${sprintNumber} - LOS", "Sprint ${sprintNumber} - DOP")
OR fixVersion ~ "Sprint ${sprintNumber}*")
ORDER BY priority DESC, status ASC`;

const priorityRank: Record<string, number> = {
  Highest: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Lowest: 1,
};

const compareValues = (left: string | number, right: string | number): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const getIssueBrowseUrl = (issue: JiraIssue): string => {
  if (issue.self) {
    const apiBaseUrl = issue.self.split('/rest/api/3/issue/')[0];
    return `${apiBaseUrl}/browse/${issue.key}`;
  }

  return `#${issue.key}`;
};

export default function TasksPage() {
  const [sprintInput, setSprintInput] = useState(DEFAULT_SPRINT);
  const [currentSprint, setCurrentSprint] = useState<string | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketSort, setTicketSort] = useState<{ key: TicketSortKey; direction: SortDirection }>({
    key: 'priority',
    direction: 'desc',
  });
  const [assigneeSort, setAssigneeSort] = useState<{ key: 'assignee' | 'storyPoints' | 'ticketCount'; direction: SortDirection }>({
    key: 'storyPoints',
    direction: 'desc',
  });

  const fetchAllIssues = async (sprintNumber: string): Promise<JiraIssue[]> => {
    const jql = buildSprintJql(sprintNumber);
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    let isLast = false;

    do {
      const response = await jiraAPI.searchIssues({
        jql,
        maxResults: PAGE_SIZE,
        fields: ['summary', 'assignee', 'status', 'priority', 'fixVersions', 'issuetype'],
        nextPageToken,
      });

      const data = response.data.data as JiraSearchResponse;
      const pageIssues = (data.issues || []).map((issue) => {
        if (issue.fields.normalizedStoryPoints === 0 && !('normalizedStoryPoints' in issue.fields)) {
          issue.fields.normalizedStoryPoints = null;
        }
        return issue;
      });

      allIssues.push(...pageIssues);
      nextPageToken = data.nextPageToken;
      isLast = Boolean(data.isLast);

      if (pageIssues.length === 0) {
        break;
      }
    } while (!isLast && Boolean(nextPageToken));

    return allIssues;
  };

  const handleSearch = async () => {
    const sprintNumber = sprintInput.trim();

    if (!/^\d+$/.test(sprintNumber)) {
      toast.error('Sprint must be a number');
      return;
    }

    try {
      setLoading(true);
      const loadedIssues = await fetchAllIssues(sprintNumber);
      setIssues(loadedIssues);
      setCurrentSprint(sprintNumber);
      toast.success(`Loaded ${loadedIssues.length} tickets for Sprint ${sprintNumber}`);
    } catch (error) {
      console.error('Error loading Jira tickets:', error);
      toast.error('Failed to load Jira tickets');
    } finally {
      setLoading(false);
    }
  };

  const assigneeSummaries = useMemo<AssigneeSummary[]>(() => {
    const summaryMap = new Map<string, AssigneeSummary & { withPoints: number; withoutPoints: number }>();

    issues.forEach((issue) => {
      const assignee = issue.fields.normalizedAssigneeName || 'Unassigned';
      const storyPoints = issue.fields.customfield_10036;
      const existing = summaryMap.get(assignee);

      if (existing) {
        existing.storyPoints += storyPoints || 0;
        existing.ticketCount += 1;
        if (storyPoints === null) {
          existing.withoutPoints += 1;
        } else {
          existing.withPoints += 1;
        }
        return;
      }

      summaryMap.set(assignee, {
        assignee,
        storyPoints: storyPoints || 0,
        ticketCount: 1,
        withPoints: storyPoints === null ? 0 : 1,
        withoutPoints: storyPoints === null ? 1 : 0,
      });
    });

    return Array.from(summaryMap.values()).sort((left, right) => {
      const leftValue = left[assigneeSort.key];
      const rightValue = right[assigneeSort.key];
      const result = compareValues(leftValue, rightValue);
      return assigneeSort.direction === 'asc' ? result : -result;
    });
  }, [assigneeSort, issues]);

  const sortedIssues = useMemo(() => {
    const getValue = (issue: JiraIssue, key: TicketSortKey): string | number => {
      switch (key) {
        case 'key':
          return issue.key;
        case 'summary':
          return issue.fields.summary || '';
        case 'storyPoints':
          return issue.fields.normalizedStoryPoints || 0;
        case 'assignee':
          return issue.fields.normalizedAssigneeName || 'Unassigned';
        case 'status':
          return issue.fields.normalizedStatusName || '';
        case 'sprint':
          return (issue.fields.normalizedSprintNames || []).join(', ');
        case 'fixVersions':
          return (issue.fields.normalizedFixVersionNames || []).join(', ');
        case 'priority':
          return priorityRank[issue.fields.normalizedPriorityName || ''] || 0;
        default:
          return '';
      }
    };

    return [...issues].sort((left, right) => {
      const result = compareValues(getValue(left, ticketSort.key), getValue(right, ticketSort.key));
      return ticketSort.direction === 'asc' ? result : -result;
    });
  }, [issues, ticketSort]);

  const toggleTicketSort = (key: TicketSortKey) => {
    setTicketSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleAssigneeSort = (key: 'assignee' | 'storyPoints' | 'ticketCount') => {
    setAssigneeSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIndicator = (isActive: boolean, direction: SortDirection) => {
    if (!isActive) {
      return <span className="text-gray-300">↕</span>;
    }

    return <span className="text-blue-600">{direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-2 text-sm text-gray-600">
            Default filter: <span className="font-semibold text-gray-800">Backend-SubTask</span>
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="grid gap-4 md:grid-cols-[220px_140px_1fr] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Sprint Number</label>
            <input
              value={sprintInput}
              onChange={(event) => setSprintInput(event.target.value)}
              placeholder="186"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">Hint: 186</p>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? 'Searching...' : 'Continue / Search'}
          </button>

          <div className="rounded-lg border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">JQL</p>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-gray-600">{buildSprintJql(currentSprint || sprintInput || DEFAULT_SPRINT)}</pre>
            <a
              href="https://cakedigitalbank.atlassian.net/issues?jql=project%20IN%20(PL%2C%20%22Product%3A%20DOP%22%2C%20%22Platform%3A%20LOS%22)%20AND%20status%20NOT%20IN%20(%22PO%2FTM%20Review%22%2C%20%22Will%20Not%20Do%22%2C%20Done%2C%20Ready4Release%2C%20Released%2C%20%22Request%20Bot%20To%20Delete%22)%20and%20type%20%3D%20Backend-SubTask%20AND%20(Sprint%20in%20(%22Sprint%20186%20-%20Lending%22%2C%20%22Sprint%20186%20-%20LOS%22%2C%20%22Sprint%20186%20-%20DOP%22)%20OR%20fixVersion%20~%20%22Sprint%20186*%22)%20ORDER%20BY%20priority%20DESC%2C%20status%20ASC"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Open in Jira
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Sprint</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{currentSprint ? `Sprint ${currentSprint}` : '-'}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Total Tickets</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{issues.length}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Total Story Points</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {issues.reduce((sum, issue) => sum + (issue.fields.normalizedStoryPoints || 0), 0)}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assignee Dashboard</h2>
            <p className="mt-1 text-sm text-gray-600">Story points and ticket count by assignee</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button onClick={() => toggleAssigneeSort('assignee')} className="flex items-center gap-2">
                    Assignee
                    {renderSortIndicator(assigneeSort.key === 'assignee', assigneeSort.direction)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button onClick={() => toggleAssigneeSort('storyPoints')} className="flex items-center gap-2">
                    Tickets with Points
                    {renderSortIndicator(assigneeSort.key === 'storyPoints', assigneeSort.direction)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button onClick={() => toggleAssigneeSort('ticketCount')} className="flex items-center gap-2">
                    Tickets without Points
                    {renderSortIndicator(assigneeSort.key === 'ticketCount', assigneeSort.direction)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button onClick={() => toggleAssigneeSort('ticketCount')} className="flex items-center gap-2">
                    Total Tickets
                    {renderSortIndicator(assigneeSort.key === 'ticketCount', assigneeSort.direction)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button onClick={() => toggleAssigneeSort('storyPoints')} className="flex items-center gap-2">
                    Total Story Points
                    {renderSortIndicator(assigneeSort.key === 'storyPoints', assigneeSort.direction)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {assigneeSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No assignee data yet
                  </td>
                </tr>
              ) : (
                assigneeSummaries.map((item) => (
                  <tr key={item.assignee}>
                    <td className="px-4 py-3 text-gray-900">{item.assignee}</td>
                    <td className="px-4 py-3 text-gray-700">{item.withPoints}</td>
                    <td className="px-4 py-3 text-gray-700">{item.withoutPoints}</td>
                    <td className="px-4 py-3 text-gray-700">{item.ticketCount}</td>
                    <td className="px-4 py-3 text-gray-700">{item.storyPoints}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Ticket Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">All Backend-SubTask tickets for the selected sprint</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  ['key', 'Ticket ID'],
                  ['summary', 'Ticket Name'],
                  ['storyPoints', 'Story Points'],
                  ['assignee', 'Assignee'],
                  ['status', 'Status'],
                  ['sprint', 'Sprint'],
                  ['fixVersions', 'Fix Versions'],
                  ['priority', 'Priority'],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      onClick={() => toggleTicketSort(key as TicketSortKey)}
                      className="flex items-center gap-2"
                    >
                      {label}
                      {renderSortIndicator(ticketSort.key === key, ticketSort.direction)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {sortedIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {loading ? 'Loading tickets...' : 'No tickets found'}
                  </td>
                </tr>
              ) : (
                sortedIssues.map((issue) => (
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
                      {issue.fields.customfield_10036 === null
                        ? 'Not Estimated'
                        : issue.fields.customfield_10036}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedAssigneeName || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedStatusName || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {(issue.fields.normalizedSprintNames || []).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(issue.fields.normalizedFixVersionNames || []).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{issue.fields.normalizedPriorityName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
