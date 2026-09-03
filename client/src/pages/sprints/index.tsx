import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI } from '@/utils/api';

type ProjectKey = 'PL' | 'PLO' | 'DOP';
type TimeStatus = 'within' | 'overdue' | 'upcoming';

interface NormalizedSprintDetail {
  id: number | null;
  name: string;
  state?: string;
  startDate: string | null;
  endDate: string | null;
}

interface NormalizedFixVersionDetail {
  id: string | undefined;
  name: string;
  startDate: string | null;
  releaseDate: string | null;
  released?: boolean;
  archived?: boolean;
}

interface JiraSearchIssue {
  id: string;
  key: string;
  fields: {
    normalizedSprints?: NormalizedSprintDetail[];
    normalizedFixVersions?: NormalizedFixVersionDetail[];
  };
}

interface JiraSearchResponse {
  issues: JiraSearchIssue[];
}

interface JiraVersion {
  id: string;
  name: string;
  released?: boolean;
  archived?: boolean;
  startDate?: string | null;
  releaseDate?: string | null;
}

interface TimelineItem {
  marker: '✅' | '❌';
  label: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  timeStatus: TimeStatus | null;
  notes: string[];
}

interface ProjectReport {
  projectKey: ProjectKey;
  sprintLine: TimelineItem;
  versionLine: TimelineItem;
}

const PROJECT_KEYS: ProjectKey[] = ['PL', 'PLO', 'DOP'];
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toUtc7Date = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  if (isDateOnly(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getTime() + UTC7_OFFSET_MS).toISOString().slice(0, 10);
};

const getTodayUtc7 = (): string => toUtc7Date(new Date().toISOString()) || '';

const compareDateStrings = (left: string, right: string) => left.localeCompare(right);

const getTimeStatus = (today: string, startDate: string | null, endDate: string | null): TimeStatus | null => {
  if (!startDate || !endDate) {
    return null;
  }

  if (compareDateStrings(today, startDate) < 0) {
    return 'upcoming';
  }

  if (compareDateStrings(today, endDate) > 0) {
    return 'overdue';
  }

  return 'within';
};

const appendTimeStatus = (rangeText: string, status: TimeStatus | null): string => {
  if (status === 'overdue') {
    return `${rangeText} 🔴 QUÁ HẠN`;
  }

  if (status === 'upcoming') {
    return `${rangeText} 🔴 CHƯA ĐẾN`;
  }

  return rangeText;
};

const formatRange = (startDate: string | null, endDate: string | null, status: TimeStatus | null): string => {
  const start = startDate || '?';
  const end = endDate || '?';
  return appendTimeStatus(`(${start} -> ${end})`, status);
};

const getMostCommonDate = (dates: Array<string | null>): string | null => {
  const counts = new Map<string, number>();

  dates.filter((value): value is string => Boolean(value)).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  let winner: string | null = null;
  let maxCount = 0;

  counts.forEach((count, value) => {
    if (count > maxCount) {
      winner = value;
      maxCount = count;
    }
  });

  return winner;
};

const buildOpenSprintJql = (projectKey: ProjectKey) => `project=${projectKey} and Sprint IN openSprints()`;

const dedupeByName = <T extends { name: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (!map.has(item.name)) {
      map.set(item.name, item);
    }
  });
  return Array.from(map.values());
};

const pickEarliestUnreleasedVersion = (versions: JiraVersion[]): { item: JiraVersion | null; notes: string[] } => {
  const unreleased = versions.filter((version) => !version.released && !version.archived);

  if (unreleased.length === 0) {
    return { item: null, notes: ['no earliest unreleased fix version returned by project versions'] };
  }

  const sorted = [...unreleased].sort((left, right) => {
    const leftPrimary = left.startDate || left.releaseDate || '9999-99-99';
    const rightPrimary = right.startDate || right.releaseDate || '9999-99-99';
    const primaryCompare = leftPrimary.localeCompare(rightPrimary);

    if (primaryCompare !== 0) {
      return primaryCompare;
    }

    return (left.releaseDate || '9999-99-99').localeCompare(right.releaseDate || '9999-99-99');
  });

  return { item: sorted[0], notes: [] };
};

const pickSingleSprint = (issues: JiraSearchIssue[]): { item: NormalizedSprintDetail | null; notes: string[] } => {
  const active = issues.flatMap((issue) => (issue.fields.normalizedSprints || []).filter((s) => s.state === 'active'));
  const sprints = dedupeByName(active);
  if (sprints.length === 0) return { item: null, notes: ['no active sprint returned by JQL'] };
  if (sprints.length === 1) return { item: sprints[0], notes: [] };

  // Issue có thể nằm trong sprint share từ board khác (vd PL ticket trong "Sprint - LOS").
  // Chọn sprint chiếm nhiều issue nhất của project; chỉ bỏ cuộc khi hoà.
  const counts = new Map<string, number>();
  active.forEach((s) => counts.set(s.name, (counts.get(s.name) || 0) + 1));
  const ranked = [...sprints].sort((l, r) => (counts.get(r.name) || 0) - (counts.get(l.name) || 0));
  const others = ranked.slice(1).map((s) => s.name).join(', ');
  if ((counts.get(ranked[0].name) || 0) === (counts.get(ranked[1].name) || 0)) {
    return { item: null, notes: [`multiple active sprints returned by JQL: ${sprints.map((s) => s.name).join(', ')}`] };
  }
  return { item: ranked[0], notes: [`bỏ qua sprint phụ: ${others}`] };
};

export default function SprintsPage() {
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlignmentReport = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const today = getTodayUtc7();

        const rawReports: ProjectReport[] = await Promise.all(
          PROJECT_KEYS.map(async (projectKey) => {
            const [sprintResponse, versionResponse] = await Promise.all([
              jiraAPI.searchIssues({
                jql: buildOpenSprintJql(projectKey),
                maxResults: 50,
                fields: ['fixVersions'],
              }),
              jiraAPI.getProjectVersions(projectKey),
            ]);

            const sprintIssues = ((sprintResponse.data.data as JiraSearchResponse)?.issues || []) as JiraSearchIssue[];
            const projectVersions = (versionResponse.data.data || []) as JiraVersion[];
            const sprintSelection = pickSingleSprint(sprintIssues);
            const versionSelection = pickEarliestUnreleasedVersion(projectVersions);

            const sprintStart = toUtc7Date(sprintSelection.item?.startDate);
            const sprintEnd = toUtc7Date(sprintSelection.item?.endDate);
            const versionStart = toUtc7Date(versionSelection.item?.startDate);
            const versionEnd = toUtc7Date(versionSelection.item?.releaseDate);

            const sprintLine: TimelineItem = {
              marker: sprintSelection.item ? '✅' : '❌',
              label: 'Sprint',
              name: sprintSelection.item?.name || 'Not found',
              startDate: sprintStart,
              endDate: sprintEnd,
              timeStatus: sprintSelection.item ? getTimeStatus(today, sprintStart, sprintEnd) : null,
              notes: sprintSelection.notes,
            };

            const versionLine: TimelineItem = {
              marker: versionSelection.item ? '✅' : '❌',
              label: 'Fix-ver',
              name: versionSelection.item?.name || 'Not found',
              startDate: versionStart,
              endDate: versionEnd,
              timeStatus: versionSelection.item ? getTimeStatus(today, versionStart, versionEnd) : null,
              notes: versionSelection.notes,
            };

            return {
              projectKey,
              sprintLine,
              versionLine,
            };
          })
        );

        const allItems = rawReports.flatMap((report) => [report.sprintLine, report.versionLine]);
        const canonicalStart = getMostCommonDate(allItems.map((item) => item.startDate));
        const canonicalEnd = getMostCommonDate(allItems.map((item) => item.endDate));

        const normalizedReports: ProjectReport[] = rawReports.map((report) => {
          const updateMarker = (item: TimelineItem): TimelineItem => {
            const notes = [...item.notes];
            let marker: '✅' | '❌' = item.marker;

            if (!item.startDate || !item.endDate) {
              notes.push('missing start/end date');
              marker = '❌';
            }

            if (canonicalStart && item.startDate && item.startDate !== canonicalStart) {
              notes.push(`start date differs from baseline ${canonicalStart}`);
              marker = '❌';
            }

            if (canonicalEnd && item.endDate && item.endDate !== canonicalEnd) {
              notes.push(`end date differs from baseline ${canonicalEnd}`);
              marker = '❌';
            }

            const updatedItem: TimelineItem = {
              ...item,
              marker,
              notes,
            };

            return updatedItem;
          };

          return {
            ...report,
            sprintLine: updateMarker(report.sprintLine),
            versionLine: updateMarker(report.versionLine),
          };
        });

        setReports(normalizedReports);
      } catch (error) {
        console.error('Error loading sprint alignment:', error);
        setReports([]);
        setLoadError('Failed to load sprint alignment report');
        toast.error('Failed to load sprint alignment report');
      } finally {
        setLoading(false);
      }
    };

    loadAlignmentReport();
  }, []);

  const summary = useMemo(() => {
    if (loadError) {
      return {
        isAligned: false,
        issues: [loadError],
      };
    }

    const issues = reports.flatMap((report) =>
      [report.sprintLine, report.versionLine].flatMap((item) => {
        const noteLines = item.notes.map((note) => `${report.projectKey} ${item.label}: ${note}`);
        const statusLine =
          item.timeStatus && item.timeStatus !== 'within'
            ? [`${report.projectKey} ${item.label}: ${item.timeStatus === 'overdue' ? 'QUÁ HẠN' : 'CHƯA ĐẾN'}`]
            : [];

        return [...noteLines, ...statusLine];
      })
    );

    return {
      isAligned: issues.length === 0,
      issues,
    };
  }, [loadError, reports]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-4xl font-bold text-gray-900">Sprints</h1>
        <p className="mt-2 text-sm text-gray-600">Alignment check using 6 JQL queries for PL, PLO, and DOP</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading sprint alignment...</div>
        ) : loadError ? (
          <div className="py-10 text-center text-red-600">{loadError}</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.projectKey} className="space-y-2 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="font-mono text-sm text-gray-900">
                  {report.sprintLine.marker} {report.projectKey} Sprint: {report.sprintLine.name}{' '}
                  {formatRange(report.sprintLine.startDate, report.sprintLine.endDate, report.sprintLine.timeStatus)}
                </div>
                <div className="font-mono text-sm text-gray-900">
                  {report.versionLine.marker} {report.projectKey} Fix-ver: {report.versionLine.name}{' '}
                  {formatRange(report.versionLine.startDate, report.versionLine.endDate, report.versionLine.timeStatus)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-900">
            Tong ket: {summary.isAligned ? '✅ Dong bo' : '❌ Lech'}
          </h2>
          {summary.isAligned ? (
            <p className="mt-3 text-sm text-gray-700">✅ Tat ca Sprint va Version dang dong bo va trong thoi han.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {summary.issues.map((issue) => (
                <p key={issue}>- {issue}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
