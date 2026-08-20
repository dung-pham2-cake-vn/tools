import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { jiraAPI } from '@/utils/api';

const PROJECT_KEY = 'PL';
// Board lấy theo PL Lending, nhưng issue gồm cả PLO (cùng sprint). PLO xếp khối trên PL.
const ISSUE_PROJECTS = 'PL, PLO';
const ISSUE_PROJECT_LIST = ISSUE_PROJECTS.split(',').map((p) => p.trim()).filter(Boolean);
const projectOf = (key: string): string => key.split('-')[0];
const projectRank = (key: string): number => (projectOf(key) === 'PLO' ? 0 : 1);

// '' = không lọc, nên "chưa assignee" cần giá trị riêng.
const UNASSIGNED = '__unassigned__';
// Bulk fix version: '' = không đổi, nên "xoá hết version" cần giá trị riêng.
const CLEAR_VERSION = '__clear_version__';

// Rank là LexoRank (chuỗi) — so sánh chuỗi ra đúng thứ tự backlog Jira.
// Item không có rank xếp cuối.
const cmpRank = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
};
const PAGE_SIZE = 100;
// Board ưu tiên tên chứa "Lending" (giống board trong screenshot), fallback board đầu tiên.
const PREFERRED_BOARD_NAME = 'Lending';
const PARENT_BATCH = 50;

const ISSUE_FIELDS = [
  'summary',
  'assignee',
  'status',
  'priority',
  'issuetype',
  'fixVersions',
  'labels',
  'parent',
];

interface SprintDetail {
  id?: number;
  name: string;
  state?: string;
}

interface JiraIssueFields {
  summary?: string;
  normalizedAssigneeName?: string;
  normalizedStatusName?: string;
  normalizedPriorityName?: string;
  normalizedStoryPoints?: number;
  normalizedSprints?: SprintDetail[];
  normalizedFixVersionNames?: string[];
  normalizedRank?: string;
  labels?: string[];
  issuetype?: { name?: string; subtask?: boolean; iconUrl?: string };
  parent?: { key?: string; fields?: { summary?: string } };
}

interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields: JiraIssueFields;
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
}

interface Board {
  id: number;
  name: string;
}

interface ProjectVersion {
  id: string;
  name: string;
  released?: boolean;
  archived?: boolean;
}

// Version thuộc project nào cũng cần biết — PL-x không nhận được version của PLO.
interface VersionOption {
  value: string;
  project: string;
  id: string;
  name: string;
  released: boolean;
}

interface Transition {
  id: string;
  name: string;
  to?: { name?: string };
}

const NO_SPRINT = -1;
const DONE_RE = /(done|passed|released|ready4release|closed|resolved|will not|reject|invalid|cancel|bot to delete)/;

// Màu status pill theo keyword trong tên status (không có statusCategory trong data đã normalize).
const statusPillClass = (status: string): string => {
  const s = status.toLowerCase();
  if (/(done|passed|released|ready4release|closed|resolved)/.test(s)) return 'bg-green-100 text-green-700';
  if (/(reject|will not|invalid|cancel)/.test(s)) return 'bg-red-100 text-red-700';
  if (/(test|review|qa)/.test(s)) return 'bg-purple-100 text-purple-700';
  if (/(coding|progress|develop|doing)/.test(s)) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

const priorityDot: Record<string, string> = {
  Highest: 'bg-red-600',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-sky-500',
  Lowest: 'bg-gray-400',
};

const getIssueBrowseUrl = (issue: JiraIssue): string => {
  if (issue.self) {
    const apiBaseUrl = issue.self.split('/rest/api/3/issue/')[0];
    return `${apiBaseUrl}/browse/${issue.key}`;
  }
  return `#${issue.key}`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';

const avatarColor = (name: string): string => {
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-indigo-500', 'bg-fuchsia-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
  return colors[Math.abs(hash)] || colors[0];
};

const formatSprintDates = (sprint: JiraSprint): string => {
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) : '');
  const start = fmt(sprint.startDate);
  const end = fmt(sprint.endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function BacklogPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  // Chỉ hiện subtask có fix version khác cha (story) — soát lệch version trước khi release.
  const [versionMismatchOnly, setVersionMismatchOnly] = useState(false);
  // false = giữ cha để thấy đường dẫn tới kết quả; true = chỉ ticket thực sự khớp filter
  const [onlyMatched, setOnlyMatched] = useState(false);

  const [collapsedSprints, setCollapsedSprints] = useState<Set<number>>(new Set());
  // Tree: track key node đang MỞ. Rỗng = tất cả thu gọn (mặc định).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Checkbox chọn ticket để tính tổng point riêng.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Ô tick gần nhất, làm mốc cho shift-tick. Chỉ có nghĩa trong cùng 1 sprint group.
  const anchorRef = useRef<{ group: number; key: string } | null>(null);

  // ── đổi hàng loạt ─────────────────────────────────────────────────────────
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkVersion, setBulkVersion] = useState('');
  const [users, setUsers] = useState<{ accountId: string; displayName: string }[]>([]);
  const [usersState, setUsersState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [projectVersions, setProjectVersions] = useState<Record<string, ProjectVersion[]>>({});
  const [versionsState, setVersionsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [bulkTransLoading, setBulkTransLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState(0);
  const [applyResults, setApplyResults] = useState<{ key: string; ok: boolean; msg: string }[] | null>(null);

  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<Record<string, Transition[]>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const fetchAllPages = async (jql: string): Promise<JiraIssue[]> => {
    const all: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    let isLast = false;
    do {
      const response = await jiraAPI.searchIssues({ jql, maxResults: PAGE_SIZE, fields: ISSUE_FIELDS, nextPageToken });
      const data = response.data.data as { issues?: JiraIssue[]; nextPageToken?: string; isLast?: boolean };
      const pageIssues = data.issues || [];
      all.push(...pageIssues);
      nextPageToken = data.nextPageToken;
      isLast = Boolean(data.isLast);
      if (pageIssues.length === 0) break;
    } while (!isLast && Boolean(nextPageToken));
    return all;
  };

  const loadAll = async () => {
    try {
      setLoading(true);

      const boardsRes = await jiraAPI.getBoards(PROJECT_KEY);
      const boards = (boardsRes.data.data || []) as Board[];
      if (boards.length === 0) throw new Error(`Không tìm thấy board scrum cho project ${PROJECT_KEY}`);
      const picked =
        boards.find((b) => b.name?.toLowerCase().includes(PREFERRED_BOARD_NAME.toLowerCase())) || boards[0];
      setBoard(picked);

      const [activeRes, futureRes] = await Promise.all([
        jiraAPI.getBoardSprints(picked.id, 'active'),
        jiraAPI.getBoardSprints(picked.id, 'future'),
      ]);
      const allSprints = [
        ...((activeRes.data.data || []) as JiraSprint[]),
        ...((futureRes.data.data || []) as JiraSprint[]),
      ];
      setSprints(allSprints);

      const sprintIds = allSprints.map((s) => s.id);
      const jql =
        sprintIds.length > 0
          ? `project IN (${ISSUE_PROJECTS}) AND sprint IN (${sprintIds.join(',')}) ORDER BY Rank ASC`
          : `project IN (${ISSUE_PROJECTS}) AND sprint IN openSprints() ORDER BY Rank ASC`;

      const map = new Map<string, JiraIssue>();
      const sprintIssues = await fetchAllPages(jql);
      sprintIssues.forEach((i) => map.set(i.key, i));

      // Đệ quy lấy con/cháu qua field parent (subtask thường không dính sprint JQL).
      let frontier = sprintIssues.map((i) => i.key);
      let depthGuard = 0;
      while (frontier.length > 0 && depthGuard < 8) {
        const next: string[] = [];
        for (const batch of chunk(frontier, PARENT_BATCH)) {
          const kids = await fetchAllPages(
            `project IN (${ISSUE_PROJECTS}) AND parent IN (${batch.join(',')}) ORDER BY Rank ASC`,
          );
          for (const k of kids) {
            if (!map.has(k.key)) {
              map.set(k.key, k);
              next.push(k.key);
            }
          }
        }
        frontier = next;
        depthGuard += 1;
      }

      setIssues(Array.from(map.values()));
      setLoaded(true);
      toast.success(`Board "${picked.name}": ${allSprints.length} sprint, ${map.size} work item (kèm subtask)`);
    } catch (error: any) {
      console.error('Error loading backlog:', error);
      toast.error(`Tải thất bại: ${error?.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keySet = useMemo(() => new Set(issues.map((i) => i.key)), [issues]);
  // Chỉ nhận link cha-con CÙNG project (PL↔PLO không lồng nhau — PLO chỉ xếp khối trên).
  const parentKeyOf = (issue: JiraIssue): string | undefined => {
    const pk = issue.fields.parent?.key;
    if (!pk || !keySet.has(pk) || projectOf(pk) !== projectOf(issue.key)) return undefined;
    return pk;
  };
  const childrenByParent = useMemo(() => {
    const m = new Map<string, JiraIssue[]>();
    for (const i of issues) {
      const pk = parentKeyOf(i);
      if (pk) {
        const list = m.get(pk) || [];
        list.push(i);
        m.set(pk, list);
      }
    }
    // Thứ tự mảng `issues` là thứ tự BFS (sprint trước, con tìm sau) nên không phải rank
    // toàn cục — sort lại để anh em cùng cha luôn đúng rank.
    m.forEach((list) => list.sort((a, b) => cmpRank(a.fields.normalizedRank || '', b.fields.normalizedRank || '')));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, keySet]);

  const isRoot = (i: JiraIssue) => !parentKeyOf(i);
  const parentByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of issues) {
      const pk = parentKeyOf(i);
      if (pk) m.set(i.key, pk);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, keySet]);

  // Subtask có fix version lệch cha. So sánh theo TẬP version (sort + join), không theo thứ tự.
  // Cha không có version mà con có (hoặc ngược lại) cũng tính là lệch.
  const versionKeyOf = (i?: JiraIssue): string =>
    [...(i?.fields.normalizedFixVersionNames || [])].sort().join(', ');
  const versionMismatch = useMemo(() => {
    const byKey = new Map(issues.map((i) => [i.key, i]));
    const m = new Map<string, { own: string; parent: string; parentKey: string }>();
    for (const i of issues) {
      if (!i.fields.issuetype?.subtask) continue;
      const pk = parentKeyOf(i);
      if (!pk) continue;
      const own = versionKeyOf(i);
      const parent = versionKeyOf(byKey.get(pk));
      if (own !== parent) m.set(i.key, { own, parent, parentKey: pk });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, keySet]);

  const typeOptions = useMemo(
    () => Array.from(new Set(issues.map((i) => i.fields.issuetype?.name || '').filter(Boolean))).sort(),
    [issues],
  );
  const labelOptions = useMemo(() => Array.from(new Set(issues.flatMap((i) => i.fields.labels || []))).sort(), [issues]);
  const versionOptions = useMemo(
    () => Array.from(new Set(issues.flatMap((i) => i.fields.normalizedFixVersionNames || []))).sort(),
    [issues],
  );
  const assigneeOptions = useMemo(
    () => Array.from(new Set(issues.map((i) => i.fields.normalizedAssigneeName || '').filter(Boolean))).sort(),
    [issues],
  );

  const filterActive = Boolean(
    search || typeFilter || labelFilter || versionFilter || assigneeFilter || openOnly || versionMismatchOnly,
  );
  // Không có filter thì "chỉ ticket khớp" vô nghĩa — mọi ticket đều khớp.
  const flatMode = onlyMatched && filterActive;
  const matches = (issue: JiraIssue): boolean => {
    const f = issue.fields;
    const q = search.trim().toLowerCase();
    if (q && !`${issue.key} ${f.summary || ''}`.toLowerCase().includes(q)) return false;
    if (typeFilter && f.issuetype?.name !== typeFilter) return false;
    if (labelFilter && !(f.labels || []).includes(labelFilter)) return false;
    if (versionFilter && !(f.normalizedFixVersionNames || []).includes(versionFilter)) return false;
    if (assigneeFilter) {
      const name = f.normalizedAssigneeName || '';
      if (assigneeFilter === UNASSIGNED ? name !== '' : name !== assigneeFilter) return false;
    }
    if (openOnly && DONE_RE.test((f.normalizedStatusName || '').toLowerCase())) return false;
    if (versionMismatchOnly && !versionMismatch.has(issue.key)) return false;
    return true;
  };
  // Node hiển thị nếu chính nó match, hoặc có con/cháu match (giữ path tới kết quả).
  const subtreeMatch = (issue: JiraIssue): boolean =>
    matches(issue) || (childrenByParent.get(issue.key) || []).some(subtreeMatch);

  // Leaf (không con) mới mang point gốc; parent = tổng point con (rollup lên epic).
  // Có filter: chỉ leaf match filter mới đóng góp point.
  const filterPass = (leaf: JiraIssue) => (filterActive ? matches(leaf) : true);

  const isSubtask = (node: JiraIssue) => Boolean(node.fields.issuetype?.subtask);
  const hasSprint = (node: JiraIssue, s: number) =>
    (node.fields.normalizedSprints || []).some((sp) => sp.id === s);

  // Node cấp story/epic/initiative "thuộc" sprint S nếu chính nó gắn S,
  // hoặc có con non-subtask (đệ quy) gắn S. Subtask không kéo cha vào sprint (nó thừa hưởng cha).
  const relevant = useMemo(() => {
    const cache = new Map<string, boolean>();
    const fn = (node: JiraIssue, s: number): boolean => {
      const ck = `${s}:${node.key}`;
      const cached = cache.get(ck);
      if (cached !== undefined) return cached;
      let v = hasSprint(node, s);
      if (!v) {
        const kids = childrenByParent.get(node.key) || [];
        v = kids.some((k) => (isSubtask(k) ? hasSprint(k, s) : fn(k, s)));
      }
      cache.set(ck, v);
      return v;
    };
    return fn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenByParent]);

  // Con hiển thị dưới sprint S: subtask luôn hiện (theo cha), non-subtask chỉ khi relevant(S).
  const visibleChildren = (node: JiraIssue, s: number): JiraIssue[] => {
    const kids = childrenByParent.get(node.key) || [];
    const shown = s === NO_SPRINT ? kids : kids.filter((c) => (isSubtask(c) ? true : relevant(c, s)));
    // Node có con thì xếp theo rank hiệu dụng (vị trí con đầu tiên), không phải rank của chính nó.
    return [...shown].sort((a, b) => cmpRank(effectiveRank(a, s), effectiveRank(b, s)));
  };

  // Rank hiệu dụng: node có con lấy rank nhỏ nhất trong cây con đang hiển thị —
  // tức cha nhảy xuống đúng chỗ của con đầu tiên. Không con thì dùng rank của chính nó.
  const effectiveRank = useMemo(() => {
    const cache = new Map<string, string>();
    const fn = (node: JiraIssue, s: number): string => {
      const ck = `${s}:${node.key}`;
      const cached = cache.get(ck);
      if (cached !== undefined) return cached;

      const own = node.fields.normalizedRank || '';
      const kids = childrenByParent.get(node.key) || [];
      const shown = s === NO_SPRINT ? kids : kids.filter((c) => (isSubtask(c) ? true : relevant(c, s)));

      let best = '';
      for (const c of shown) {
        const r = fn(c, s);
        if (r && (!best || r < best)) best = r;
      }
      const out = best || own;
      cache.set(ck, out);
      return out;
    };
    return fn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenByParent, relevant]);
  // Point trong cây đã prune theo sprint S (leaf mang SP, parent = tổng con hiển thị).
  const pointInSprint = (node: JiraIssue, s: number): number => {
    const kids = visibleChildren(node, s);
    if (kids.length === 0) return filterPass(node) ? node.fields.normalizedStoryPoints || 0 : 0;
    return kids.reduce((acc, c) => acc + pointInSprint(c, s), 0);
  };
  const flattenVisible = (node: JiraIssue, s: number): JiraIssue[] => [
    node,
    ...visibleChildren(node, s).flatMap((c) => flattenVisible(c, s)),
  ];

  // Tổng point của các ticket được tick (union subtree). Chỉ đếm leaf vừa match filter vừa trong scope checked.
  const selection = useMemo(() => {
    if (checked.size === 0) return null;
    const inScope = (key: string): boolean => {
      let cur: string | undefined = key;
      let guard = 0;
      while (cur && guard < 20) {
        if (checked.has(cur)) return true;
        cur = parentByKey.get(cur);
        guard += 1;
      }
      return false;
    };
    let sp = 0;
    let count = 0;
    for (const i of issues) {
      if ((childrenByParent.get(i.key) || []).length > 0) continue; // chỉ leaf
      if (!filterPass(i)) continue;
      if (!inScope(i.key)) continue;
      sp += i.fields.normalizedStoryPoints || 0;
      count += 1;
    }
    return { sp, count };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, issues, parentByKey, childrenByParent, filterActive, search, typeFilter, labelFilter, versionFilter, assigneeFilter, openOnly, versionMismatchOnly, versionMismatch]);

  // Root (epic/initiative/story không cha) xuất hiện dưới MỌI sprint S mà nó relevant.
  // Cùng 1 epic có thể nằm ở nhiều sprint, mỗi nơi chỉ show story gắn sprint đó.
  const rootsBySprint = useMemo(() => {
    const bySprint = new Map<number, JiraIssue[]>();
    sprints.forEach((s) => bySprint.set(s.id, []));
    bySprint.set(NO_SPRINT, []);
    for (const issue of issues) {
      if (!isRoot(issue)) continue;
      let placed = false;
      for (const s of sprints) {
        if (relevant(issue, s.id)) {
          bySprint.get(s.id)!.push(issue);
          placed = true;
        }
      }
      if (!placed) bySprint.get(NO_SPRINT)!.push(issue);
    }
    // PLO xếp trên PL, trong mỗi khối xếp theo rank hiệu dụng.
    bySprint.forEach((list, s) =>
      list.sort(
        (a, b) => projectRank(a.key) - projectRank(b.key) || cmpRank(effectiveRank(a, s), effectiveRank(b, s)),
      ),
    );
    return bySprint;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, sprints, relevant, effectiveRank, keySet]);

  const sprintStats = (roots: JiraIssue[], s: number) => {
    const all = roots.flatMap((r) => flattenVisible(r, s));
    const sp = roots.reduce((acc, r) => acc + pointInSprint(r, s), 0);
    return { count: all.length, sp };
  };

  const toggleSprint = (id: number) =>
    setCollapsedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleNode = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const expandAll = () => setExpanded(new Set(issues.map((i) => i.key)));
  const collapseAll = () => setExpanded(new Set());
  const toggleChecked = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const clearChecked = () => {
    setChecked(new Set());
    anchorRef.current = null;
  };

  // Shift-tick: quét từ ô mốc tới ô vừa bấm theo đúng thứ tự dòng đang hiển thị.
  // Mốc khác sprint group → coi như tick đơn (đặt mốc mới), tránh quét nhầm cả trang.
  const onBoxClick = (e: React.MouseEvent, key: string, group: number, order: string[]) => {
    const anchor = anchorRef.current;
    if (e.shiftKey && anchor && anchor.group === group && anchor.key !== key) {
      const a = order.indexOf(anchor.key);
      const b = order.indexOf(key);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const range = order.slice(lo, hi + 1);
        // Hướng theo ô vừa bấm: đang chưa tick → tick cả dải; đang tick → bỏ tick cả dải.
        const turnOn = !checked.has(key);
        setChecked((prev) => {
          const next = new Set(prev);
          range.forEach((k) => (turnOn ? next.add(k) : next.delete(k)));
          return next;
        });
        anchorRef.current = { group, key };
        return;
      }
    }
    toggleChecked(key);
    anchorRef.current = { group, key };
  };

  // Thứ tự key của các dòng THỰC SỰ render trong 1 group — phải khớp y hệt renderNode.
  const visibleRowKeys = (issue: JiraIssue, s: number, flat = false): string[] => {
    if (flat) return [issue.key];
    const kids = visibleChildren(issue, s).filter(subtreeMatch);
    const isExp = filterActive || expanded.has(issue.key);
    const out = [issue.key];
    if (isExp) for (const k of kids) out.push(...visibleRowKeys(k, s));
    return out;
  };

  const openStatusMenu = async (issue: JiraIssue) => {
    if (statusMenu === issue.key) {
      setStatusMenu(null);
      return;
    }
    setStatusMenu(issue.key);
    if (transitions[issue.key]) return;
    try {
      const res = await jiraAPI.getIssueTransitions(issue.key);
      setTransitions((prev) => ({ ...prev, [issue.key]: (res.data.data?.transitions || []) as Transition[] }));
    } catch (error: any) {
      toast.error(`Không tải được transition: ${error?.response?.data?.error || error.message}`);
    }
  };

  const applyTransition = async (issue: JiraIssue, targetStatus: string) => {
    setBusyKey(issue.key);
    setStatusMenu(null);
    try {
      await jiraAPI.transitionIssue(issue.key, targetStatus);
      setIssues((prev) =>
        prev.map((i) =>
          i.key === issue.key ? { ...i, fields: { ...i.fields, normalizedStatusName: targetStatus } } : i,
        ),
      );
      setTransitions((prev) => {
        const next = { ...prev };
        delete next[issue.key];
        return next;
      });
      toast.success(`${issue.key} → ${targetStatus}`);
    } catch (error: any) {
      toast.error(`Chuyển status lỗi: ${error?.response?.data?.error || error.message}`);
    } finally {
      setBusyKey(null);
    }
  };

  // ── đổi hàng loạt: dữ liệu cho dropdown ───────────────────────────────────
  const issueByKey = useMemo(() => new Map(issues.map((i) => [i.key, i])), [issues]);
  const checkedKeys = useMemo(
    () => Array.from(checked).filter((k) => issueByKey.has(k)),
    [checked, issueByKey],
  );

  const TRANS_FETCH_CAP = 80;

  // Chỉ tải khi thực sự có ticket được tick — tránh gọi API vô ích lúc mở trang.
  useEffect(() => {
    if (checkedKeys.length === 0 || usersState !== 'idle') return;
    setUsersState('loading');
    jiraAPI
      .getAssignableUsers(ISSUE_PROJECT_LIST)
      .then((res) => {
        setUsers((res.data.data || []) as { accountId: string; displayName: string }[]);
        setUsersState('ready');
      })
      .catch((error: any) => {
        setUsersState('error');
        toast.error(`Không tải được danh sách assignee: ${error?.response?.data?.error || error.message}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedKeys.length, usersState]);

  // Version của MỖI project riêng (PL-x không nhận version của PLO). Cũng chỉ tải khi có tick.
  useEffect(() => {
    if (checkedKeys.length === 0 || versionsState !== 'idle') return;
    setVersionsState('loading');
    Promise.all(
      ISSUE_PROJECT_LIST.map((p) =>
        jiraAPI
          .getProjectVersions(p)
          .then((res) => [p, (res.data.data || []) as ProjectVersion[]] as const)
          .catch(() => [p, [] as ProjectVersion[]] as const),
      ),
    )
      .then((pairs) => {
        setProjectVersions(Object.fromEntries(pairs));
        const empty = pairs.every(([, list]) => list.length === 0);
        setVersionsState(empty ? 'error' : 'ready');
        if (empty) toast.error('Không tải được danh sách fix version');
      })
      .catch(() => setVersionsState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedKeys.length, versionsState]);

  // Transition khả dụng khác nhau theo từng ticket → phải hỏi Jira từng cái.
  useEffect(() => {
    const missing = checkedKeys.filter((k) => !transitions[k]);
    if (missing.length === 0 || missing.length > TRANS_FETCH_CAP) return;
    let cancelled = false;
    setBulkTransLoading(true);
    (async () => {
      const CONCURRENCY = 6;
      let cursor = 0;
      const fetched: Record<string, Transition[]> = {};
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, missing.length) }, async () => {
          for (;;) {
            const idx = cursor++;
            if (idx >= missing.length || cancelled) return;
            const key = missing[idx];
            try {
              const res = await jiraAPI.getIssueTransitions(key);
              fetched[key] = (res.data.data?.transitions || []) as Transition[];
            } catch {
              fetched[key] = [];
            }
          }
        }),
      );
      if (cancelled) return;
      setTransitions((prev) => ({ ...prev, ...fetched }));
      setBulkTransLoading(false);
    })();
    return () => {
      cancelled = true;
      setBulkTransLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedKeys.join(',')]);

  const targetsOf = (key: string): string[] =>
    (transitions[key] || []).map((t) => t.to?.name || t.name).filter(Boolean);

  // Union các status đích + số ticket làm được, để thấy ngay cái nào phủ hết.
  const bulkStatusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const key of checkedKeys) {
      for (const name of new Set(targetsOf(key))) counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedKeys.join(','), transitions]);

  const transCapExceeded = checkedKeys.length > TRANS_FETCH_CAP;

  // Gộp version của mọi project, gắn nhãn project. Bỏ version đã archive.
  const bulkVersionOptions = useMemo((): VersionOption[] => {
    const out: VersionOption[] = [];
    for (const project of ISSUE_PROJECT_LIST) {
      for (const v of projectVersions[project] || []) {
        if (v.archived) continue;
        out.push({
          value: `${project}::${v.id}`,
          project,
          id: v.id,
          name: v.name,
          released: Boolean(v.released),
        });
      }
    }
    // Chưa release lên trên — đó là cái hay được gán.
    return out.sort(
      (a, b) => Number(a.released) - Number(b.released) || a.project.localeCompare(b.project) || a.name.localeCompare(b.name),
    );
  }, [projectVersions]);

  const pickedVersion = useMemo(
    () => (bulkVersion && bulkVersion !== CLEAR_VERSION ? bulkVersionOptions.find((v) => v.value === bulkVersion) : undefined),
    [bulkVersion, bulkVersionOptions],
  );
  // Số ticket thuộc đúng project của version đang chọn — hiện ngay để biết bao nhiêu cái bị skip.
  const versionEligible = useMemo(
    () => (pickedVersion ? checkedKeys.filter((k) => projectOf(k) === pickedVersion.project).length : 0),
    [pickedVersion, checkedKeys],
  );

  interface BulkRow {
    key: string;
    statusFrom: string;
    statusTo: string | null;
    statusSkip: boolean;
    assigneeFrom: string;
    assigneeTo: string | null;
    versionFrom: string;
    /** null = không đổi version; '' = xoá hết version. */
    versionTo: string | null;
    /** version thuộc project khác ticket → Jira reject, bỏ qua luôn cho khỏi lỗi. */
    versionSkip: boolean;
  }

  const bulkPlan = useMemo((): BulkRow[] => {
    const newAssignee =
      bulkAssignee === ''
        ? null
        : bulkAssignee === UNASSIGNED
          ? ''
          : users.find((u) => u.accountId === bulkAssignee)?.displayName || bulkAssignee;

    return checkedKeys.map((key) => {
      const f = issueByKey.get(key)!.fields;
      const statusFrom = f.normalizedStatusName || '';
      const wantStatus = bulkStatus && bulkStatus !== statusFrom;
      const canStatus = wantStatus && targetsOf(key).includes(bulkStatus);
      const versionFrom = (f.normalizedFixVersionNames || []).join(', ');
      // Set = ghi đè, ticket chỉ còn đúng version được chọn.
      const versionTo = bulkVersion === '' ? null : bulkVersion === CLEAR_VERSION ? '' : pickedVersion?.name ?? null;
      return {
        key,
        statusFrom,
        statusTo: wantStatus ? bulkStatus : null,
        statusSkip: Boolean(wantStatus) && !canStatus,
        assigneeFrom: f.normalizedAssigneeName || '',
        assigneeTo: newAssignee,
        versionFrom,
        versionTo,
        versionSkip: Boolean(pickedVersion) && projectOf(key) !== pickedVersion!.project,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedKeys.join(','), bulkStatus, bulkAssignee, bulkVersion, pickedVersion, transitions, users, issueByKey]);

  const changesVersion = (r: BulkRow) => r.versionTo !== null && !r.versionSkip && r.versionTo !== r.versionFrom;

  const bulkActionable = bulkPlan.filter(
    (r) =>
      (r.statusTo && !r.statusSkip) ||
      (r.assigneeTo !== null && r.assigneeTo !== r.assigneeFrom) ||
      changesVersion(r),
  );

  const applyBulk = async () => {
    setApplying(true);
    setApplyDone(0);
    const results: { key: string; ok: boolean; msg: string }[] = [];
    const touched = new Set<string>();

    const rows = bulkActionable;
    const CONCURRENCY = 3;
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
        for (;;) {
          const idx = cursor++;
          if (idx >= rows.length) return;
          const row = rows[idx];
          const parts: string[] = [];
          try {
            if (row.statusTo && !row.statusSkip) {
              await jiraAPI.transitionIssue(row.key, row.statusTo);
              parts.push(`status → ${row.statusTo}`);
            }
            if (row.assigneeTo !== null && row.assigneeTo !== row.assigneeFrom) {
              await jiraAPI.assignIssue(row.key, bulkAssignee === UNASSIGNED ? null : bulkAssignee);
              parts.push(`assignee → ${row.assigneeTo || 'Chưa assign'}`);
            }
            if (changesVersion(row)) {
              await jiraAPI.setIssueFixVersions(row.key, pickedVersion ? [pickedVersion.id] : []);
              parts.push(`fix version → ${row.versionTo || 'Không có'}`);
            }
            results.push({ key: row.key, ok: true, msg: parts.join(', ') });
            touched.add(row.key);
            setIssues((prev) =>
              prev.map((i) =>
                i.key === row.key
                  ? {
                      ...i,
                      fields: {
                        ...i.fields,
                        ...(row.statusTo && !row.statusSkip ? { normalizedStatusName: row.statusTo } : {}),
                        ...(row.assigneeTo !== null ? { normalizedAssigneeName: row.assigneeTo } : {}),
                        ...(changesVersion(row)
                          ? { normalizedFixVersionNames: row.versionTo ? [row.versionTo] : [] }
                          : {}),
                      },
                    }
                  : i,
              ),
            );
          } catch (error: any) {
            results.push({
              key: row.key,
              ok: false,
              msg: error?.response?.data?.error || error.message || 'lỗi',
            });
          } finally {
            setApplyDone((n) => n + 1);
          }
        }
      }),
    );

    // status đã đổi → transition cũ không còn đúng
    setTransitions((prev) => {
      const next = { ...prev };
      touched.forEach((k) => delete next[k]);
      return next;
    });

    setApplyResults(results.sort((a, b) => Number(a.ok) - Number(b.ok) || a.key.localeCompare(b.key)));
    setApplying(false);

    const failed = results.filter((r) => !r.ok).length;
    if (failed === 0) toast.success(`Đổi xong ${results.length} ticket`);
    else toast.error(`${results.length - failed} thành công, ${failed} lỗi`);
  };

  const closeBulk = () => {
    setConfirmOpen(false);
    if (applyResults) {
      setApplyResults(null);
      setBulkStatus('');
      setBulkAssignee('');
      setBulkVersion('');
      clearChecked();
    }
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setLabelFilter('');
    setVersionFilter('');
    setAssigneeFilter('');
    setOpenOnly(false);
    setVersionMismatchOnly(false);
  };
  const filterCount =
    [typeFilter, labelFilter, versionFilter, assigneeFilter].filter(Boolean).length +
    (openOnly ? 1 : 0) +
    (versionMismatchOnly ? 1 : 0);

  const orderedSprints = useMemo(() => {
    const rank = (s: JiraSprint) => (s.state === 'active' ? 0 : 1);
    return [...sprints].sort((a, b) => rank(a) - rank(b));
  }, [sprints]);

  const visibleIssueCount = useMemo(() => issues.filter(matches).length, [issues, search, typeFilter, labelFilter, versionFilter, assigneeFilter, openOnly, versionMismatchOnly, versionMismatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // flat = chế độ "chỉ ticket khớp": render 1 dòng phẳng, không cây, không con.
  // rowOrder = key của mọi dòng trong group này theo đúng thứ tự render, dùng cho shift-tick.
  const renderNode = (
    issue: JiraIssue,
    depth: number,
    s: number,
    flat = false,
    rowOrder: string[] = [],
  ): React.ReactNode[] => {
    const f = issue.fields;
    const status = f.normalizedStatusName || 'Unknown';
    const isDone = DONE_RE.test(status.toLowerCase());
    const kids = flat ? [] : visibleChildren(issue, s).filter(subtreeMatch);
    const hasKids = kids.length > 0;
    const isExp = filterActive || expanded.has(issue.key);
    const menuTransitions = transitions[issue.key] || [];
    const assignee = f.normalizedAssigneeName || '';
    const epic = f.labels?.[0];
    const version = f.normalizedFixVersionNames?.[0];
    const mismatch = versionMismatch.get(issue.key);

    // phẳng thì con bị ẩn nên rollup vô nghĩa — hiện SP của chính nó
    const rowPoint = flat ? f.normalizedStoryPoints || 0 : pointInSprint(issue, s);

    const rows: React.ReactNode[] = [
      <tr key={issue.id} className={`border-b border-gray-100 hover:bg-slate-50 ${checked.has(issue.key) ? 'bg-blue-50' : ''}`}>
        <td className="w-8 px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked.has(issue.key)}
            // Xử lý hết trong onClick vì cần e.shiftKey; onChange bắt buộc có cho controlled input.
            onChange={() => {}}
            onMouseDown={(e) => {
              // shift+click hay bôi đen text quanh checkbox
              if (e.shiftKey) e.preventDefault();
            }}
            onClick={(e) => onBoxClick(e, issue.key, s, rowOrder)}
            title="Shift+click để tick cả dải từ ô tick gần nhất"
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2">
          <div className="flex items-center" style={{ paddingLeft: depth * 22 }}>
            <button
              type="button"
              onClick={() => hasKids && toggleNode(issue.key)}
              className={`mr-1 w-4 text-gray-400 ${hasKids ? 'cursor-pointer hover:text-gray-700' : 'invisible'}`}
            >
              {isExp ? '▾' : '▸'}
            </button>
            {f.issuetype?.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.issuetype.iconUrl} alt={f.issuetype.name} className="mr-2 h-4 w-4" />
            ) : (
              <span className="mr-2" title={f.issuetype?.name}>{f.issuetype?.subtask ? '🔧' : '📄'}</span>
            )}
            <a
              href={getIssueBrowseUrl(issue)}
              target="_blank"
              rel="noreferrer"
              className={`font-semibold text-blue-600 hover:text-blue-800 ${isDone ? 'line-through opacity-70' : ''}`}
            >
              {issue.key}
            </a>
            {hasKids && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-500">
                {kids.length}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-gray-900">
          <span className={`line-clamp-1 ${isDone ? 'text-gray-400 line-through' : ''}`}>{f.summary || '-'}</span>
        </td>
        <td className="whitespace-nowrap px-2 py-2">
          {mismatch ? (
            // Lệch cha: tô đỏ + tooltip chỉ rõ cha đang để version nào.
            <span
              className="mr-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-medium uppercase text-rose-700 ring-1 ring-rose-300"
              title={`Lệch cha ${mismatch.parentKey}: cha "${mismatch.parent || 'không có'}" ≠ con "${mismatch.own || 'không có'}"`}
            >
              {mismatch.own || '⚠ trống'}
            </span>
          ) : (
            version && (
              <span className="mr-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase text-gray-600">
                {version}
              </span>
            )
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-2">
          {epic && (
            <span className="inline-block max-w-[160px] truncate rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-medium uppercase text-indigo-700">
              {epic}
            </span>
          )}
        </td>
        <td className="relative whitespace-nowrap px-2 py-2">
          <button
            type="button"
            disabled={busyKey === issue.key}
            onClick={() => openStatusMenu(issue)}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold uppercase ${statusPillClass(status)} disabled:opacity-50`}
          >
            {busyKey === issue.key ? '...' : status}
            <span className="text-[8px]">▼</span>
          </button>
          {statusMenu === issue.key && (
            <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {menuTransitions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">Đang tải transition...</div>
              ) : (
                menuTransitions.map((t) => {
                  const target = t.to?.name || t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTransition(issue, target)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-700 hover:bg-slate-100"
                    >
                      <span>{target}</span>
                      <span className="text-[10px] text-gray-400">{t.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </td>
        <td className="w-12 px-2 py-2 text-center">
          {rowPoint > 0 ? (
            <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
              {rowPoint}
            </span>
          ) : (
            <span className="text-gray-300">–</span>
          )}
        </td>
        <td className="w-8 px-2 py-2 text-center">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${priorityDot[f.normalizedPriorityName || ''] || 'bg-gray-300'}`}
            title={f.normalizedPriorityName}
          />
        </td>
        <td className="w-10 px-2 py-2 text-center">
          {/* group + peer-less tooltip: hiện ngay khi hover, không chờ delay như title */}
          <span className="group relative inline-block">
            {assignee ? (
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(assignee)}`}
              >
                {initials(assignee)}
              </span>
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                ?
              </span>
            )}
            <span className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
              {assignee || 'Chưa assign'}
            </span>
          </span>
        </td>
      </tr>,
    ];

    if (isExp && hasKids) {
      for (const kid of kids) rows.push(...renderNode(kid, depth + 1, s, false, rowOrder));
    }
    return rows;
  };

  const renderSprintGroup = (sprint: JiraSprint) => {
    const allRoots = rootsBySprint.get(sprint.id) || [];
    const roots = flatMode
      ? allRoots.flatMap((r) => flattenVisible(r, sprint.id)).filter(matches)
      : allRoots.filter(subtreeMatch);
    const stats = sprintStats(allRoots, sprint.id);
    const rowOrder = roots.flatMap((r) => visibleRowKeys(r, sprint.id, flatMode));
    const isCollapsed = collapsedSprints.has(sprint.id);
    const sprintKeys = allRoots.flatMap((r) => flattenVisible(r, sprint.id)).map((i) => i.key);
    const checkedInSprint = sprintKeys.filter((k) => checked.has(k)).length;
    const allChecked = sprintKeys.length > 0 && checkedInSprint === sprintKeys.length;
    const someChecked = checkedInSprint > 0 && !allChecked;
    const toggleSprintChecked = () => {
      anchorRef.current = null; // tick cả sprint thì mốc cũ vô nghĩa
      setChecked((prev) => {
        const next = new Set(prev);
        if (allChecked) sprintKeys.forEach((k) => next.delete(k));
        else sprintKeys.forEach((k) => next.add(k));
        return next;
      });
    };
    return (
      <div key={sprint.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleSprintChecked}
            onClick={(e) => e.stopPropagation()}
            title="Tick/bỏ tick toàn bộ ticket trong sprint"
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <button type="button" onClick={() => toggleSprint(sprint.id)} className="text-gray-500">
            {isCollapsed ? '▸' : '▾'}
          </button>
          <span className="font-bold text-gray-900">{sprint.name}</span>
          {sprint.state === 'active' && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">ACTIVE</span>
          )}
          <span className="text-xs text-gray-500">{formatSprintDates(sprint)}</span>
          <span className="text-xs text-gray-500">({stats.count} work items)</span>
          <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{stats.sp} SP</span>
        </div>
        {!isCollapsed && (
          <div className="overflow-x-auto">
            {roots.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Không có work item khớp filter</div>
            ) : (
              <table className="min-w-full text-sm">
                <tbody>{roots.flatMap((r) => renderNode(r, 0, sprint.id, flatMode, rowOrder))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  const noSprintAllRoots = rootsBySprint.get(NO_SPRINT) || [];
  const noSprintRoots = flatMode
    ? noSprintAllRoots.flatMap((r) => flattenVisible(r, NO_SPRINT)).filter(matches)
    : noSprintAllRoots.filter(subtreeMatch);
  const noSprintRowOrder = noSprintRoots.flatMap((r) => visibleRowKeys(r, NO_SPRINT, flatMode));

  const selectClass =
    'rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none';

  return (
    <div className="space-y-4" onClick={() => statusMenu && setStatusMenu(null)}>
      <Toaster position="top-right" />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Backlog</h1>
          <p className="mt-2 text-sm text-gray-600">
            Board {board ? <span className="font-semibold text-gray-800">{board.name}</span> : PROJECT_KEY} · project PL + PLO (PLO trên) · active + future sprint
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Mở hết
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Thu gọn hết
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? 'Đang tải...' : 'Reload'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search backlog"
          className="w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select className={selectClass} value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)}>
          <option value="">Version</option>
          {versionOptions.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Type</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className={selectClass} value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
          <option value="">Label</option>
          {labelOptions.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select className={selectClass} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">Assignee</option>
          <option value={UNASSIGNED}>— Chưa assignee —</option>
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpenOnly((v) => !v)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            openOnly ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          Ticket open
        </button>
        <button
          type="button"
          onClick={() => setVersionMismatchOnly((v) => !v)}
          title="Chỉ hiện subtask có fix version khác với story cha (kể cả subtask trống version)"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            versionMismatchOnly ? 'bg-rose-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          Lệch version cha
          {versionMismatch.size > 0 && (
            <span
              className={`ml-1.5 rounded-full px-1.5 text-[11px] font-bold ${
                versionMismatchOnly ? 'bg-white/25' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {versionMismatch.size}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOnlyMatched((v) => !v)}
          disabled={!filterActive}
          title={
            filterActive
              ? 'Bật: chỉ hiện ticket thực sự khớp filter, bỏ ticket cha'
              : 'Cần bật ít nhất 1 filter'
          }
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            onlyMatched && filterActive
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700'
          } ${filterActive ? '' : 'cursor-not-allowed opacity-40'}`}
        >
          Chỉ ticket khớp
        </button>
        {(filterCount > 0 || search) && (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-gray-500 hover:text-gray-800">
            Clear filters {filterCount > 0 && `(${filterCount})`}
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {filterActive ? `${visibleIssueCount} khớp / ` : ''}
          {issues.length} work items
        </span>
      </div>

      {selection && (
        <div
          className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-600 px-4 py-2.5 text-white shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-semibold">Đã chọn:</span>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-sm font-bold">{selection.sp} SP</span>
          <span className="text-sm text-blue-100">
            {selection.count} ticket{filterActive ? ' (đã lọc theo filter)' : ''} · {checked.size} ô tick
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-md border border-white/30 bg-white/15 px-2 py-1 text-sm text-white [&>option]:text-gray-900"
            >
              <option value="">
                {bulkTransLoading ? 'Đang tải status...' : 'Đổi status...'}
              </option>
              {transCapExceeded ? (
                <option value="" disabled>
                  Quá {TRANS_FETCH_CAP} ticket — bỏ tick bớt
                </option>
              ) : (
                bulkStatusOptions.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} ({o.n}/{checkedKeys.length})
                  </option>
                ))
              )}
            </select>

            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="max-w-[220px] rounded-md border border-white/30 bg-white/15 px-2 py-1 text-sm text-white [&>option]:text-gray-900"
            >
              <option value="">{usersState === 'loading' ? 'Đang tải người...' : 'Đổi assignee...'}</option>
              <option value={UNASSIGNED}>— Bỏ assign —</option>
              {users.map((u) => (
                <option key={u.accountId} value={u.accountId}>
                  {u.displayName}
                </option>
              ))}
            </select>

            <select
              value={bulkVersion}
              onChange={(e) => setBulkVersion(e.target.value)}
              className="max-w-[240px] rounded-md border border-white/30 bg-white/15 px-2 py-1 text-sm text-white [&>option]:text-gray-900"
            >
              <option value="">
                {versionsState === 'loading' ? 'Đang tải version...' : 'Đổi fix version...'}
              </option>
              <option value={CLEAR_VERSION}>— Xoá fix version —</option>
              {bulkVersionOptions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.project} · {v.name}
                  {v.released ? ' (released)' : ''}
                </option>
              ))}
            </select>
            {pickedVersion && (
              <span
                className="text-xs text-blue-100"
                title={`Chỉ ticket ${pickedVersion.project} nhận được version này, ticket project khác sẽ bỏ qua`}
              >
                {versionEligible}/{checkedKeys.length} ticket {pickedVersion.project}
              </span>
            )}

            <button
              type="button"
              disabled={bulkActionable.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="rounded-md bg-white px-3 py-1 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              OK{bulkActionable.length > 0 ? ` (${bulkActionable.length})` : ''}
            </button>
          </div>

          <button
            type="button"
            onClick={clearChecked}
            className="ml-auto rounded-md bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 bg-black/40" onClick={applying ? undefined : closeBulk} />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {applyResults ? 'Kết quả' : 'Xác nhận đổi hàng loạt'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {applyResults
                  ? `${applyResults.filter((r) => r.ok).length} thành công · ${applyResults.filter((r) => !r.ok).length} lỗi`
                  : `${bulkActionable.length} ticket sẽ đổi${
                      bulkPlan.length - bulkActionable.length > 0
                        ? ` · ${bulkPlan.length - bulkActionable.length} bỏ qua`
                        : ''
                    }`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <table className="min-w-full text-sm">
                <tbody>
                  {applyResults
                    ? applyResults.map((r) => (
                        <tr key={r.key} className="border-b border-gray-100">
                          <td className="py-1.5 pr-3 font-mono text-xs">{r.key}</td>
                          <td className="py-1.5 pr-2">{r.ok ? '✅' : '❌'}</td>
                          <td className={`py-1.5 text-xs ${r.ok ? 'text-gray-600' : 'text-red-600'}`}>{r.msg}</td>
                        </tr>
                      ))
                    : bulkPlan.map((r) => {
                        const changeStatus = r.statusTo && !r.statusSkip;
                        const changeAssignee = r.assigneeTo !== null && r.assigneeTo !== r.assigneeFrom;
                        const changeVersion = changesVersion(r);
                        const noop = !changeStatus && !changeAssignee && !changeVersion;
                        return (
                          <tr key={r.key} className={`border-b border-gray-100 ${noop ? 'opacity-40' : ''}`}>
                            <td className="py-1.5 pr-3 align-top font-mono text-xs">{r.key}</td>
                            <td className="py-1.5 text-xs">
                              {changeStatus && (
                                <div>
                                  <span className="text-gray-500">{r.statusFrom || '—'}</span>
                                  <span className="mx-1 text-gray-400">→</span>
                                  <span className="font-semibold text-gray-900">{r.statusTo}</span>
                                </div>
                              )}
                              {changeAssignee && (
                                <div>
                                  <span className="text-gray-500">{r.assigneeFrom || 'Chưa assign'}</span>
                                  <span className="mx-1 text-gray-400">→</span>
                                  <span className="font-semibold text-gray-900">
                                    {r.assigneeTo || 'Chưa assign'}
                                  </span>
                                </div>
                              )}
                              {changeVersion && (
                                <div>
                                  <span className="text-gray-500">{r.versionFrom || 'Không có'}</span>
                                  <span className="mx-1 text-gray-400">→</span>
                                  <span className="font-semibold text-gray-900">{r.versionTo || 'Không có'}</span>
                                </div>
                              )}
                              {r.statusSkip && (
                                <div className="text-amber-600">
                                  bỏ qua status: ticket không có transition sang “{bulkStatus}”
                                </div>
                              )}
                              {r.versionSkip && (
                                <div className="text-amber-600">
                                  bỏ qua version: “{pickedVersion?.name}” thuộc project {pickedVersion?.project}
                                </div>
                              )}
                              {noop && !r.statusSkip && !r.versionSkip && (
                                <div className="text-gray-500">không đổi gì</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 border-t bg-gray-50 px-5 py-3">
              {applying && (
                <span className="text-sm text-gray-600">
                  Đang đổi {applyDone}/{bulkActionable.length}...
                </span>
              )}
              <div className="ml-auto flex gap-2">
                {!applyResults && (
                  <button
                    type="button"
                    onClick={closeBulk}
                    disabled={applying}
                    className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyResults ? closeBulk : applyBulk}
                  disabled={applying}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Đang đổi...' : applyResults ? 'Đóng' : 'Xác nhận đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loaded && loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">Đang tải backlog...</div>
      ) : (
        <div className="space-y-4">
          {orderedSprints.map(renderSprintGroup)}
          {noSprintRoots.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-slate-50 px-4 py-3">
                <span className="font-bold text-gray-900">Backlog (không thuộc sprint đang load)</span>
                <span className="ml-2 text-xs text-gray-500">({noSprintRoots.length} work items)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    {noSprintRoots.flatMap((r) => renderNode(r, 0, NO_SPRINT, flatMode, noSprintRowOrder))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {loaded && sprints.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-sm">
              Không có active/future sprint cho board này.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
