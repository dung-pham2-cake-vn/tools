import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI, type DeliveryIssuePrefill } from '@/utils/api';

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
    status?: { name?: string } | null;
    normalizedStatusName?: string;
    customfield_10222?: { value: string } | null;
    customfield_10631?: { value: string } | null;
  };
}

const READY_FOR_DELIVERY = 'Ready for delivery';

const issueStatus = (issue: RoadmapIssue) =>
  issue.fields.normalizedStatusName || issue.fields.status?.name || '';

/** "Sprint 198" -> 198; không parse được thì trả 0. */
const sprintNumberOf = (label?: string | null) => Number(label?.match(/(\d+)/)?.[1] || 0);

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
AND status in (Impact, "Ready for delivery")
AND "Pillars[Checkboxes]" = Lending
ORDER BY "cf[10016]" ASC, status ASC, cf[10235] ASC, cf[10631] asc, cf[10222] asc, cf[10227] DESC, cf[10225] DESC`;

const PLOS_JQL = `project = "Product Roadmap"
and status in (Impact, "Ready for delivery")
and "Products[Checkboxes]" in (PLOS)
ORDER BY "cf[10016]" ASC, status ASC, cf[10235] ASC, cf[10631] asc, cf[10222] asc, cf[10227] DESC, cf[10225] DESC`;

const LOS_JQL = `project = "Product Roadmap"
and status in (Impact, "Ready for delivery")
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

// ── Modal tạo ticket PL từ PR idea ───────────────────────────────────────────

interface CreatePlModalProps {
  ideaKey: string;
  onClose: () => void;
  onCreated: (ideaKey: string, plKey: string) => void;
}

const CreatePlModal: React.FC<CreatePlModalProps> = ({ ideaKey, onClose, onCreated }) => {
  const [prefill, setPrefill] = useState<DeliveryIssuePrefill | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [issueTypeId, setIssueTypeId] = useState('');
  const [summary, setSummary] = useState('');
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [fixVersionId, setFixVersionId] = useState('');
  const [priorityName, setPriorityName] = useState('Medium');
  const [labelsText, setLabelsText] = useState('');
  const [assignToMe, setAssignToMe] = useState(true);

  useEffect(() => {
    let cancelled = false;

    jiraAPI
      .prepareDeliveryIssue(ideaKey)
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data as DeliveryIssuePrefill;
        setPrefill(data);
        setIssueTypeId(data.defaults.issueTypeId);
        setSummary(data.defaults.summary);
        setSprintId(data.defaults.sprintId);
        setFixVersionId(data.defaults.fixVersionIds[0] || '');
        setPriorityName(data.defaults.priorityName);
        setLabelsText(data.defaults.labels.join(', '));
      })
      .catch((error: any) => {
        if (cancelled) return;
        setLoadError(error?.response?.data?.error || error?.message || 'Không tải được dữ liệu');
      });

    return () => {
      cancelled = true;
    };
  }, [ideaKey]);

  const handleSubmit = async () => {
    if (!prefill || !summary.trim()) {
      toast.error('Summary không được rỗng');
      return;
    }

    setSubmitting(true);
    try {
      const res = await jiraAPI.createDeliveryIssue({
        ideaKey,
        projectKey: prefill.projectKey,
        issueTypeId,
        summary: summary.trim(),
        descriptionAdf: prefill.defaults.descriptionAdf,
        sprintId,
        fixVersionIds: fixVersionId ? [fixVersionId] : [],
        priorityName,
        labels: labelsText.split(',').map((label) => label.trim()).filter(Boolean),
        assigneeAccountId: assignToMe ? prefill.defaults.assigneeAccountId : undefined,
      });

      const created = res.data.data as {
        key: string;
        linked: boolean;
        linkError?: string;
        strippedMedia?: number;
        copiedMedia?: number;
        mediaErrors?: string[];
      };
      const mediaNote = created.strippedMedia
        ? ` · ${created.copiedMedia || 0}/${created.strippedMedia} ảnh đã copy sang ticket mới`
        : '';
      if (created.linked) {
        toast.success(`Đã tạo ${created.key} và gắn vào ${ideaKey}${mediaNote}`);
      } else {
        toast.error(`Đã tạo ${created.key} nhưng không gắn được idea: ${created.linkError || ''}`);
      }
      if (created.mediaErrors?.length) {
        toast.error(`Ảnh lỗi: ${created.mediaErrors.join('; ')}`, { duration: 8000 });
      }
      onCreated(ideaKey, created.key);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Tạo ticket thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const sprintOptions = useMemo(() => {
    if (!prefill) return [];
    return [...prefill.sprints].sort((a, b) => sprintSortValue(a.name) - sprintSortValue(b.name));
  }, [prefill]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tạo ticket PL từ {ideaKey}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Nội dung copy nguyên từ idea; ticket mới sẽ được gắn "implements" về {ideaKey}.
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {loadError ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-600">{loadError}</p>
        ) : !prefill ? (
          <p className="py-8 text-center text-gray-500">Đang tải dữ liệu từ Jira...</p>
        ) : (
          <div className="space-y-4">
            {prefill.existingDeliveryKeys.length > 0 && (
              <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
                Idea này đã có ticket {prefill.projectKey}: {prefill.existingDeliveryKeys.join(', ')}. Tạo thêm sẽ có 2 ticket cùng gắn.
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Summary</label>
              <input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Issue type</label>
                <select
                  value={issueTypeId}
                  onChange={(event) => setIssueTypeId(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {prefill.issueTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Priority</label>
                <select
                  value={priorityName}
                  onChange={(event) => setPriorityName(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Sprint</label>
                <select
                  value={sprintId ?? ''}
                  onChange={(event) => setSprintId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— không set —</option>
                  {sprintOptions.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Fix version{prefill.idea.sprintLabel ? ` (idea: ${prefill.idea.sprintLabel})` : ''}
                </label>
                <select
                  value={fixVersionId}
                  onChange={(event) => setFixVersionId(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— không set —</option>
                  {prefill.fixVersions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Labels <span className="font-normal text-gray-400">(phân cách bằng dấu phẩy, không có khoảng trắng trong label)</span>
              </label>
              <input
                value={labelsText}
                onChange={(event) => setLabelsText(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={assignToMe}
                onChange={(event) => setAssignToMe(event.target.checked)}
                className="h-4 w-4"
              />
              Assign cho {prefill.defaults.assigneeName}
            </label>

            <p className="rounded bg-slate-50 p-3 text-xs text-slate-500">
              Description copy nguyên ADF từ {ideaKey}
              {prefill.defaults.descriptionAdf ? '' : ' — idea này description rỗng, ticket sẽ không có mô tả'}. Ảnh
              inline sẽ được tải từ {ideaKey} và đính kèm lại vào ticket mới, trong mô tả hiện dưới dạng link
              tới file đã copy (Jira không cho dùng chung media id giữa hai project nên không render inline được).
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Đang tạo...' : 'Tạo ticket PL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RoadmapPage() {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('lending');
  const [issues, setIssues] = useState<RoadmapIssue[]>([]);
  /** Số sprint đang chạy (PL) — Ready for delivery chỉ hiện khi target sprint >= số này + 1. */
  const [currentSprint, setCurrentSprint] = useState(0);
  const [loading, setLoading] = useState(false);
  /** Idea đang mở modal tạo ticket PL. */
  const [creatingPlFor, setCreatingPlFor] = useState<string | null>(null);
  /** PL vừa tạo trong phiên này — hiện ngay mà không cần reload cả trang. */
  const [freshPlKeys, setFreshPlKeys] = useState<Record<string, string>>({});
  /** JQL gập lại mặc định, bật khi cần đối chiếu. */
  const [jqlOpen, setJqlOpen] = useState(false);

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
      if (issueStatus(issue) === READY_FOR_DELIVERY) {
        const target = sprintNumberOf(issue.fields.customfield_10631?.value);
        // chưa biết sprint hiện tại thì giữ lại, để không nuốt mất dữ liệu
        if (currentSprint > 0 && target < currentSprint + 1) continue;
      }
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
  }, [issues, currentSprint]);

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

          // <br> thay vì <div>: Confluence gói mỗi block con thành <p> riêng -> giãn dòng.
          // Giữ tiêu đề + link trong cùng một paragraph của <li>.
          const linkedHtml = linkedWorkItemUrls.length
            ? linkedWorkItemUrls
                .map((url) => `<br /><a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`)
                .join('')
            : '<br />No linked work items';

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
    jiraAPI
      .searchIssues({
        jql: 'project = PL AND Sprint IN openSprints()',
        maxResults: 50,
        fields: ['summary'],
      })
      .then((res) => {
        const issuesData = ((res.data.data as { issues?: any[] })?.issues) || [];
        const counts = new Map<string, number>();
        for (const issue of issuesData) {
          for (const sprint of issue.fields?.normalizedSprints || []) {
            if ((sprint.state || '').toLowerCase() !== 'active') continue;
            counts.set(sprint.name, (counts.get(sprint.name) || 0) + 1);
          }
        }
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
        setCurrentSprint(sprintNumberOf(top?.[0]));
      })
      .catch(() => setCurrentSprint(0));
  }, []);

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
            fields: ['key', 'summary', 'status', 'issuelinks', 'customfield_10222', 'customfield_10631'],
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
    <div className="space-y-3">
      <Toaster position="top-right" />

      {creatingPlFor && (
        <CreatePlModal
          ideaKey={creatingPlFor}
          onClose={() => setCreatingPlFor(null)}
          onCreated={(ideaKey, plKey) => setFreshPlKeys((prev) => ({ ...prev, [ideaKey]: plKey }))}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {SEGMENTS.map((segment) => {
          const isActive = segment.key === activeSegment;

          return (
            <button
              key={segment.key}
              onClick={() => setActiveSegment(segment.key)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {segment.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleCopyTickets}
            disabled={loading || issues.length === 0}
            className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy ({issues.length})
          </button>
          <a
            href={activeSegmentMeta.boardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Board ↗
          </a>
          <button
            onClick={() => setJqlOpen((open) => !open)}
            className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            JQL {jqlOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {jqlOpen && (
        <pre className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-gray-600">
          {getSegmentJql(activeSegment)}
        </pre>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">Đang tải roadmap tickets...</div>
      ) : issues.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">Không tìm thấy ticket nào</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="w-[88px] border border-gray-200 px-2 py-1.5 font-semibold">Ticket</th>
                <th className="border border-gray-200 px-2 py-1.5 font-semibold">Summary</th>
                <th className="w-[300px] border border-gray-200 px-2 py-1.5 font-semibold">Linked work item</th>
              </tr>
            </thead>
            <tbody>
              {([...ROADMAP_ORDER, '__other__'] as const).flatMap((group) => {
                const sprintKeys = sortedSprintKeys(group);
                if (!sprintKeys.length) return [];
                const groupLabel = group === '__other__' ? 'Khác / Chưa set' : group;

                return sprintKeys.flatMap((sprintKey) => {
                  const sprintIssues = groupedIssues[group][sprintKey];

                  return [
                    <tr key={`${group}-${sprintKey}-head`}>
                      <td colSpan={3} className="border border-gray-200 bg-slate-50 px-2 py-1">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${roadmapBadgeClass(group)}`}>
                          {groupLabel}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {sprintKey} · {sprintIssues.length}
                        </span>
                      </td>
                    </tr>,
                    ...sprintIssues.map((issue) => {
                      const linkedWorkItemUrls = extractLinkedIssueUrls(issue.fields.issuelinks);
                      const freshKey = freshPlKeys[issue.key];

                      return (
                        <tr key={issue.id} className="align-top hover:bg-slate-50">
                          <td className="border border-gray-200 px-2 py-1.5">
                            <a
                              href={getIssueBrowseUrl(issue.key)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {issue.key}
                            </a>
                          </td>
                          <td className="border border-gray-200 px-2 py-1.5">
                            {issue.fields.summary || '-'}
                            {issueStatus(issue) === READY_FOR_DELIVERY && (
                              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                ready
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-200 px-2 py-1.5">
                            {linkedWorkItemUrls.length > 0 ? (
                              <div className="space-y-0.5">
                                {linkedWorkItemUrls.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block break-all text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    {url.split('/browse/')[1] || url}
                                  </a>
                                ))}
                              </div>
                            ) : freshKey ? (
                              <a
                                href={getIssueBrowseUrl(freshKey)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {freshKey}
                              </a>
                            ) : (
                              <button
                                onClick={() => setCreatingPlFor(issue.key)}
                                className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                + Tạo ticket PL
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }),
                  ];
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
