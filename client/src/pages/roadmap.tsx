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
  };
}

const ROADMAP_ORDER = ['Now', 'Next', 'Someday'] as const;

function roadmapBadgeClass(value: string) {
  if (value === 'Now') return 'bg-green-100 text-green-800';
  if (value === 'Next') return 'bg-blue-100 text-blue-800';
  if (value === 'Someday') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-500';
}

interface JiraSearchResponse {
  issues: RoadmapIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

const PAGE_SIZE = 50;

const SEGMENTS: Array<{ key: SegmentKey; label: string; prefix: string }> = [
  { key: 'lending', label: 'Lending', prefix: 'Lend' },
  { key: 'plos', label: 'PLOS', prefix: 'PLOS' },
  { key: 'los', label: 'LOS', prefix: 'LOS' },
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

export default function RoadmapPage() {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('lending');
  const [issues, setIssues] = useState<RoadmapIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const activeSegmentMeta = useMemo(
    () => SEGMENTS.find((segment) => segment.key === activeSegment) || SEGMENTS[0],
    [activeSegment]
  );

  const groupedIssues = useMemo(() => {
    const map: Record<string, RoadmapIssue[]> = { Now: [], Next: [], Someday: [], __other__: [] };
    for (const issue of issues) {
      const v = issue.fields.customfield_10222?.value || '';
      if (ROADMAP_ORDER.includes(v as typeof ROADMAP_ORDER[number])) {
        map[v].push(issue);
      } else {
        map.__other__.push(issue);
      }
    }
    return map;
  }, [issues]);


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
            fields: ['key', 'summary', 'issuelinks', 'customfield_10222'],
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
          <p className="text-sm font-semibold text-gray-900">{activeSegmentMeta.label} JQL</p>
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
                const groupIssues = groupedIssues[group];
                if (!groupIssues.length) return null;
                const label = group === '__other__' ? 'Khác / Chưa set' : group;
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${roadmapBadgeClass(group)}`}>{label}</span>
                      <span className="text-xs text-gray-400">{groupIssues.length} tickets</span>
                    </div>
                    <ol className="space-y-4">
                      {groupIssues.map((issue, index) => {
                        const linkedWorkItemUrls = extractLinkedIssueUrls(issue.fields.issuelinks);
                        const hasLinks = linkedWorkItemUrls.length > 0;
                        return (
                          <li key={issue.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                            <div className="text-gray-900">
                              <span className="mr-1">🟡</span>
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
          )}
        </div>
      </>
    </div>
  );
}
