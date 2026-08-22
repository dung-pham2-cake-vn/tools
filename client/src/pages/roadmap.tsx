import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI } from '@/utils/api';

type SegmentKey = 'lending' | 'plos' | 'los';

interface LinkedIssueReference {
  key?: string;
  self?: string;
}

interface JiraIssueLink {
  outwardIssue?: LinkedIssueReference;
  inwardIssue?: LinkedIssueReference;
}

interface RoadmapIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    issuelinks?: JiraIssueLink[];
    customfield_10222?: { value: string } | null;
    customfield_10631?: { value: string } | null;
  };
}

const ROADMAP_ORDER = ['Now', 'Next', 'Someday'] as const;

function roadmapBadgeClass(value: string) {
  if (value === 'Now') return 'bg-green-100 text-green-800';
  if (value === 'Next') return 'bg-blue-100 text-blue-800';
  if (value === 'Someday') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-500';
}

const NO_SPRINT = 'Chưa set sprint';

function sprintSortValue(label: string): number {
  if (label === NO_SPRINT) return Number.POSITIVE_INFINITY;
  const matched = label.match(/(\d+)/);
  return matched ? Number(matched[1]) : Number.POSITIVE_INFINITY - 1;
}

interface JiraSearchResponse {
  issues: RoadmapIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

const PAGE_SIZE = 50;

const SEGMENTS: Array<{ key: SegmentKey; label: string; prefix: string; boardUrl: string }> = [
  {
    key: 'lending',
    label: 'Lending',
    prefix: 'Lend',
    boardUrl:
      'https://cakedigitalbank.atlassian.net/jira/polaris/projects/PR/ideas/view/8761b8ac-5623-422f-9ac0-bab4426aca2f',
  },
  {
    key: 'plos',
    label: 'PLOS',
    prefix: 'PLOS',
    boardUrl:
      'https://cakedigitalbank.atlassian.net/jira/polaris/projects/PR/ideas/view/fa0cbdd9-db70-4348-bfbf-b5748be2fd0e',
  },
  {
    key: 'los',
    label: 'LOS',
    prefix: 'LOS',
    boardUrl:
      'https://cakedigitalbank.atlassian.net/jira/polaris/projects/PR/ideas/view/466e9ca5-44dc-4578-bf6a-c75bb2def845',
  },
];

const LENDING_JQL = `project = "Product Roadmap"
AND status in (Impact)
AND "Pillars[Checkboxes]" = Lending
ORDER BY "cf[10016]" ASC, status ASC, cf[10235] ASC, cf[10631] asc, cf[10222] asc, cf[10227] DESC, cf[10225] DESC`;

const PLOS_JQL = `project = "Product Roadmap"
and status in (Impact)
and "Products[Checkboxes]" in (PLOS)
ORDER BY "cf[10016]" ASC, status ASC, cf[10235] ASC, cf[10631] asc, cf[10222] asc, cf[10227] DESC, cf[10225] DESC`;

const LOS_JQL = `project = "Product Roadmap"
and status in (Impact)
and "Products[Checkboxes]" in (LOS)
ORDER BY "cf[10016]" ASC, status ASC, cf[10235] ASC, cf[10631] asc, cf[10222] asc, cf[10227] DESC, cf[10225] DESC`;

const getIssueBrowseUrl = (issueKey: string) => `https://cakedigitalbank.atlassian.net/browse/${issueKey}`;

const extractLinkedIssueUrls = (issueLinks: JiraIssueLink[] | undefined): string[] => {
  if (!issueLinks || issueLinks.length === 0) {
    return [];
  }

  const linkedIssueKeys = issueLinks
    .flatMap((item) => [item.outwardIssue?.key, item.inwardIssue?.key])
    .filter((key): key is string => Boolean(key));

  return Array.from(new Set(linkedIssueKeys)).map((key) => getIssueBrowseUrl(key));
};

const getSegmentJql = (segment: SegmentKey): string => {
  switch (segment) {
    case 'lending':
      return LENDING_JQL;
    case 'plos':
      return PLOS_JQL;
    case 'los':
      return LOS_JQL;
    default:
      return LENDING_JQL;
  }
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const copyToClipboard = async (plainText: string, htmlText: string) => {
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
        'text/html': new Blob([htmlText], { type: 'text/html' }),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(plainText);
};

export default function RoadmapPage() {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('lending');
  const [issues, setIssues] = useState<RoadmapIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const activeSegmentMeta = useMemo(
    () => SEGMENTS.find((segment) => segment.key === activeSegment) || SEGMENTS[0],
    [activeSegment]
  );

  const groupedIssues = useMemo(() => {
    const map: Record<string, Record<string, RoadmapIssue[]>> = {
      Now: {},
      Next: {},
      Someday: {},
      __other__: {},
    };

    for (const issue of issues) {
      const roadmapValue = issue.fields.customfield_10222?.value || '';
      const groupKey = ROADMAP_ORDER.includes(roadmapValue as typeof ROADMAP_ORDER[number])
        ? roadmapValue
        : '__other__';
      const sprintKey = issue.fields.customfield_10631?.value || NO_SPRINT;

      if (!map[groupKey][sprintKey]) {
        map[groupKey][sprintKey] = [];
      }
      map[groupKey][sprintKey].push(issue);
    }

    return map;
  }, [issues]);

  const sortedSprintKeys = (group: string): string[] =>
    Object.keys(groupedIssues[group] || {}).sort((a, b) => sprintSortValue(a) - sprintSortValue(b));

  const buildCopyPayload = () => {
    const plainLines: string[] = [];
    const htmlItems: string[] = [];
    let counter = 0;

    for (const group of [...ROADMAP_ORDER, '__other__'] as const) {
      for (const sprintKey of sortedSprintKeys(group)) {
        for (const issue of groupedIssues[group][sprintKey]) {
          counter += 1;
          const summary = issue.fields.summary || '-';
          const issueUrl = getIssueBrowseUrl(issue.key);
          const linkedWorkItemUrls = extractLinkedIssueUrls(issue.fields.issuelinks);

          plainLines.push(`${counter}. 🟡 [${activeSegmentMeta.prefix}] [${issue.key}] ${summary}`);
          if (linkedWorkItemUrls.length) {
            linkedWorkItemUrls.forEach((url) => plainLines.push(`   ${url}`));
          } else {
            plainLines.push('   No linked work items');
          }

          const linkedHtml = linkedWorkItemUrls.length
            ? linkedWorkItemUrls
                .map((url) => `<div><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></div>`)
                .join('')
            : '<div>No linked work items</div>';

          htmlItems.push(
            `<li>🟡 <strong>[${escapeHtml(activeSegmentMeta.prefix)}]</strong> ` +
              `<a href="${escapeHtml(issueUrl)}">[${escapeHtml(issue.key)}]</a> ${escapeHtml(summary)}${linkedHtml}</li>`
          );
        }
      }
    }

    return {
      plainText: plainLines.join('\n'),
      htmlText: `<ol>${htmlItems.join('')}</ol>`,
    };
  };

  const handleCopyTickets = async () => {
    if (!issues.length) {
      toast.error('Chưa có ticket để copy');
      return;
    }

    try {
      const { plainText, htmlText } = buildCopyPayload();
      await copyToClipboard(plainText, htmlText);
      toast.success(`Đã copy ${issues.length} tickets`);
    } catch (error) {
      console.error('Error copying roadmap tickets:', error);
      toast.error('Copy thất bại');
    }
  };


  useEffect(() => {
    const fetchRoadmapIssues = async () => {
      try {
        setLoading(true);

        const allIssues: RoadmapIssue[] = [];
        let nextPageToken: string | undefined;
        let isLast = false;
        const jql = getSegmentJql(activeSegment);

        do {
          const response = await jiraAPI.searchIssues({
            jql,
            maxResults: PAGE_SIZE,
            fields: ['key', 'summary', 'issuelinks', 'customfield_10222', 'customfield_10631'],
            nextPageToken,
          });

          const data = response.data.data as JiraSearchResponse;
          const pageIssues = data.issues || [];

          allIssues.push(...pageIssues);
          nextPageToken = data.nextPageToken;
          isLast = Boolean(data.isLast);

          if (pageIssues.length === 0) {
            break;
          }
        } while (!isLast && Boolean(nextPageToken));

        setIssues(allIssues);
      } catch (error) {
        console.error('Error loading lending roadmap tickets:', error);
        toast.error('Failed to load lending roadmap tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmapIssues();
  }, [activeSegment]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-4xl font-bold text-gray-900">Roadmap</h1>
        <p className="mt-2 text-sm text-gray-600">Track Product Roadmap tickets by segment</p>
      </div>

      <div className="rounded-lg bg-white p-2 shadow-md">
        <div className="grid grid-cols-3 gap-2">
          {SEGMENTS.map((segment) => {
            const isActive = segment.key === activeSegment;

            return (
              <button
                key={segment.key}
                onClick={() => setActiveSegment(segment.key)}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {segment.label}
              </button>
            );
          })}
        </div>
      </div>

      <>
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-gray-900">{activeSegmentMeta.label} JQL</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTickets}
                disabled={loading || issues.length === 0}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy danh sách ({issues.length})
              </button>
              <a
                href={activeSegmentMeta.boardUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Mở board {activeSegmentMeta.label} ↗
              </a>
            </div>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-gray-600">{getSegmentJql(activeSegment)}</pre>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tickets</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{issues.length}</p>
            </div>
            <div className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800">
              Impact
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{activeSegmentMeta.label} Tickets</h2>
            <p className="mt-1 text-sm text-gray-600">Danh sach Product Roadmap tickets cho segment {activeSegmentMeta.label}</p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading roadmap tickets...</div>
          ) : issues.length === 0 ? (
            <div className="py-10 text-center text-gray-500">Không tìm thấy ticket nào</div>
          ) : (
            <div className="space-y-8">
              {([...ROADMAP_ORDER, '__other__'] as const).map((group) => {
                const sprintKeys = sortedSprintKeys(group);
                if (!sprintKeys.length) return null;
                const groupLabel = group === '__other__' ? 'Khác / Chưa set' : group;
                const groupTotal = sprintKeys.reduce(
                  (total, sprintKey) => total + groupedIssues[group][sprintKey].length,
                  0
                );
                return (
                  <div key={group}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${roadmapBadgeClass(group)}`}>
                        {groupLabel}
                      </span>
                      <span className="text-xs text-gray-400">{groupTotal} tickets</span>
                    </div>

                    <div className="space-y-6 pl-1">
                      {sprintKeys.map((sprintKey) => {
                        const sprintIssues = groupedIssues[group][sprintKey];
                        return (
                          <div key={`${group}-${sprintKey}`}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-bold ${roadmapBadgeClass(group)}`}>
                                {groupLabel} · {sprintKey}
                              </span>
                              <span className="text-xs text-gray-400">{sprintIssues.length} tickets</span>
                            </div>
                            <ol className="space-y-4 border-l-2 border-slate-100 pl-4">
                              {sprintIssues.map((issue) => {
                                const linkedWorkItemUrls = extractLinkedIssueUrls(issue.fields.issuelinks);
                                const hasLinks = linkedWorkItemUrls.length > 0;
                                return (
                                  <li key={issue.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                    <div className="text-gray-900">
                                      <span className="mr-1">🟡</span>{' '}
                                      <span className="font-semibold">[{activeSegmentMeta.prefix}]</span>{' '}
                                      <a
                                        href={getIssueBrowseUrl(issue.key)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-blue-600 hover:text-blue-800"
                                      >
                                        [{issue.key}]
                                      </a>{' '}
                                      <span>{issue.fields.summary || '-'}</span>
                                    </div>
                                    {hasLinks ? (
                                      <div className="mt-1.5 space-y-0.5">
                                        {linkedWorkItemUrls.map((url) => (
                                          <a key={url} href={url} target="_blank" rel="noreferrer"
                                            className="block text-sm text-blue-600 hover:text-blue-800">
                                            {url}
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-sm font-medium text-red-500">No linked work items</p>
                                    )}
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    </div>
  );
}
