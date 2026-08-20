import React, { useState, useEffect } from 'react';
import { supportAPI } from '../utils/api';
import AdfRenderer from '../components/AdfRenderer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Comment {
  id: string;
  author: string;
  body: string;
  bodyAdf?: any;
  created: string;
  updated: string;
}

interface Ticket {
  _id: string;
  key: string;
  title: string;
  description: string;
  descriptionAdf?: any;
  type: string;
  status: string;
  assignee: string;
  priority: string;
  sprint: string;
  hyperlink: string;
  created: string;
  updated: string;
  comments: Comment[];
  linkedWorkItems: any[];
  analyzeNote: string;
  attachments: { id: string; filename: string; mimeType: string }[];
}

const LINK_CONDITION = `(issueLinkType = "causes" or (type = Bug and (labels not in (NON_PROD, auto_stage) or labels is empty)))`;

const JQL: Record<'Scan Un-closed' | 'Scan All', string> = {
  'Scan Un-closed': `[Step 1] project in (PL, PLO, DOP)\nAND created >= -365d\nAND ${LINK_CONDITION}\nAND type in (Task, Bug)\nAND status NOT IN (Invalid, "Test Passed", Done)\nORDER BY created DESC\n\n[Step 2] issue in (<tickets previously open in DB but missing from step 1>)\nORDER BY created DESC`,
  'Scan All': `project in (PL, PLO, DOP)\nAND created >= -365d\nAND ${LINK_CONDITION}\nAND type in (Task, Bug)\nORDER BY created DESC`,
};

const priorityColor: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-600',
  Low: 'text-blue-500',
  Lowest: 'text-gray-400',
};

function isWorking(status: string): boolean {
  const s = status.toLowerCase();
  return ['open', 'to do', 'todo', 'new', 'in progress', 'in development', 'in dev',
    'ready for test', 'ready4test', 'in testing', 'testing'].some((x) => s.includes(x));
}

function groupTickets(tickets: Ticket[]): { label: string; items: Ticket[] }[] {
  const byCreated = (a: Ticket, b: Ticket) =>
    new Date(b.created).getTime() - new Date(a.created).getTime();
  const working = tickets.filter((t) => isWorking(t.status)).sort(byCreated);
  const closedAll = tickets.filter((t) => !isWorking(t.status)).sort(byCreated);
  const closedPending = closedAll.filter((t) => !t.analyzeNote?.trim());
  const closedDone = closedAll.filter((t) => !!t.analyzeNote?.trim());
  return [
    { label: 'Working', items: working },
    { label: 'Closed — Not Analyzed', items: closedPending },
    { label: 'Closed — Analyzed', items: closedDone },
  ].filter((g) => g.items.length > 0);
}

function workingDaysSince(createdIso: string): number {
  if (!createdIso) return 0;
  const start = new Date(createdIso);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (start > today) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= today) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function workingDaysClass(days: number): string {
  if (days > 10) return 'text-red-600 font-semibold';
  if (days > 5) return 'text-orange-500 font-medium';
  return 'text-gray-600';
}

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

const cmdClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  if (!e.metaKey && !e.ctrlKey) e.preventDefault();
};

type Urgency = '🔴' | '🟢' | '🟡';

interface SvkComment {
  id: string;
  author: string;
  body: string;
  bodyAdf?: any;
  created: string;
  updated: string;
}

interface LinkedPl {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  sprint: string;
  created: string;
  description: string;
  descriptionAdf?: any;
  comments: SvkComment[];
}

interface SvkTicketDoc {
  _id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  created: string;
  updated: string;
  hyperlink: string;
  description: string;
  descriptionAdf?: any;
  comments: SvkComment[];
  linkedPlKeys: string[];
  linkedPl: LinkedPl[];
  aiResult: string;
  aiError: string;
  aiRunAt?: string;
  lastScanAt?: string;
}

interface SvkHistoryDoc extends SvkTicketDoc {
  firstLoadedAt?: string;
  lastLoadedAt?: string;
  loadCount?: number;
}

interface AiJobState {
  running: boolean;
  total: number;
  done: number;
  failed: number;
  queued: number;
  current: string[];
}

function commentsText(comments: SvkComment[]): string {
  return (comments || []).map((c) => c.body || '').join(' ');
}

function calcSvkUrgency(doc: SvkTicketDoc, workingDays: number): Urgency {
  const title = (doc.summary || '').toLowerCase();
  const allText = [commentsText(doc.comments), ...(doc.linkedPl || []).map((pl) => commentsText(pl.comments))].join(' ');

  const reducedPriority = /giảm.*ưu tiên|không.*khẩn|không.*gấp|low priority|hạ.*ưu tiên/i.test(allText);
  const hasMerge = /đã merge|has been merged|merged|hotfix.*deploy|đã deploy|deploy.*done/i.test(allText);
  const hasVerify = /đã verify|verified|verify.*xong|confirm.*fix|đã confirm/i.test(allText);
  if (hasMerge && !hasVerify) return '🟢';

  if (!reducedPriority) {
    if (workingDays >= 5) return '🔴';
    if (/gấp|urgent|ảnh hưởng nhiều|nhiều kh\b|nhiều khách|dpd.*tăng|tăng.*dpd|cần xử lý gấp/i.test(title)) return '🔴';
  }

  return '🟡';
}

function checkIsRecurrence(linkedPl: LinkedPl[]): boolean {
  if (!linkedPl || linkedPl.length < 2) return false;
  const CLOSED_TERMS = ['done', 'invalid', 'test passed', 'closed', 'cancelled'];
  const isClosed = (pl: LinkedPl) => CLOSED_TERMS.some((t) => (pl.status || '').toLowerCase().includes(t));
  return linkedPl.some(isClosed) && linkedPl.some((pl) => !isClosed(pl));
}

interface SvkRow {
  doc: SvkTicketDoc;
  workingDays: number;
  plWorkingDays: number;
  urgency: Urgency;
  isRecurrence: boolean;
}

function buildRows(docs: SvkTicketDoc[]): SvkRow[] {
  return docs
    .map((doc) => {
      const workingDays = workingDaysSince(doc.created);
      const plWorkingDays = (doc.linkedPl || []).reduce(
        (max, pl) => Math.max(max, workingDaysSince(pl.created)),
        0
      );
      return {
        doc,
        workingDays,
        plWorkingDays,
        urgency: calcSvkUrgency(doc, workingDays),
        isRecurrence: checkIsRecurrence(doc.linkedPl),
      };
    })
    .sort((a, b) => b.plWorkingDays - a.plWorkingDays || b.workingDays - a.workingDays);
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (['done', 'closed', 'resolved', 'test passed'].some((x) => s.includes(x)))
    return 'bg-green-100 text-green-800';
  if (['in progress', 'in development'].some((x) => s.includes(x)))
    return 'bg-blue-100 text-blue-800';
  if (['review', 'code review'].some((x) => s.includes(x)))
    return 'bg-purple-100 text-purple-800';
  if (['ready for test', 'in testing', 'testing', 'ready4test'].some((x) => s.includes(x)))
    return 'bg-yellow-100 text-yellow-800';
  if (['invalid', "won't fix", 'rejected', 'cancelled'].some((x) => s.includes(x)))
    return 'bg-red-100 text-red-800';
  if (['blocked'].some((x) => s.includes(x)))
    return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-600';
}

interface ScanResult {
  message: string;
  total: number;
  open: number;
  recentlyClosed: number;
}

// ── Scan tab ──────────────────────────────────────────────────────────────────
const ScanTab: React.FC = () => {
  const [mode, setMode] = useState<'Scan Un-closed' | 'Scan All'>('Scan Un-closed');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const response = await supportAPI.scan(mode);
      setScanResult(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scan Mode</label>
          <div className="flex gap-3">
            {(['Scan Un-closed', 'Scan All'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="text-blue-600"
                />
                <span className="text-sm">{m}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>

        {scanResult && (
          <div className="text-sm text-green-600 font-medium flex gap-3">
            <span>✓ {scanResult.message}</span>
            <span>Total: {scanResult.total}</span>
            {mode === 'Scan Un-closed' && (
              <>
                <span>Open: {scanResult.open}</span>
                <span>Recently closed: {scanResult.recentlyClosed}</span>
              </>
            )}
          </div>
        )}
        {error && <span className="text-sm text-red-600 font-medium">✗ {error}</span>}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <p className="text-xs font-medium text-gray-500 uppercase mb-1">JQL ({mode})</p>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{JQL[mode]}</pre>
      </div>
    </>
  );
};

// ── Detail panel (slide-in from right) ───────────────────────────────────────
const TicketDetail: React.FC<{
  ticket: Ticket;
  onClose: () => void;
  onAnalyzeSaved: (id: string, note: string) => void;
  onReloaded: (updated: Ticket) => void;
}> = ({ ticket, onClose, onAnalyzeSaved, onReloaded }) => {
  const [note, setNote] = useState(ticket.analyzeNote || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await supportAPI.saveAnalyzeNote(ticket._id, note);
      onAnalyzeSaved(ticket._id, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      const res = await supportAPI.reloadTicket(ticket._id);
      onReloaded(res.data);
    } finally {
      setReloading(false);
    }
  };

  const handleAIAnalyze = async () => {
    setAnalyzing(true);
    setAiError(null);
    try {
      const res = await supportAPI.aiAnalyze(ticket._id);
      setNote(res.data.analysis);
    } catch (err: any) {
      setAiError(err?.response?.data?.message || err?.message || 'AI failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* header */}
        <div className="px-6 py-4 border-b flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <a
                href={ticket.hyperlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:underline shrink-0"
              >
                {ticket.key}
              </a>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className={`text-xs font-medium ${priorityColor[ticket.priority] || ''}`}>
                {ticket.priority}
              </span>
            </div>
            <h2 className="font-semibold text-gray-900 leading-snug">{ticket.title}</h2>
            <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
              {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
              {ticket.sprint && <span>Sprint: {ticket.sprint}</span>}
              {ticket.type && <span>Type: {ticket.type}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReload}
              disabled={reloading}
              title="Reload from Jira"
              className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-gray-600 whitespace-nowrap"
            >
              {reloading ? '↻ ...' : '↻ Reload'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* analyze note */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Analyze Note</p>
              <button
                onClick={handleAIAnalyze}
                disabled={analyzing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <>⏳ Analyzing...</>
                ) : (
                  <>✦ AI Analyze</>
                )}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500 mb-2">✗ {aiError}</p>}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={20}
              placeholder={`Symptoms: \nRoot cause: \nResolution: \nPrevention: `}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
            </div>
          </div>

          {/* description */}
          {(ticket.descriptionAdf || ticket.description) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</p>
              <AdfRenderer adf={ticket.descriptionAdf} fallback={ticket.description} />
            </div>
          )}

          {/* image attachments */}
          {ticket.attachments?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Images ({ticket.attachments.length})
              </p>
              <div className="space-y-2">
                {ticket.attachments.map((a) => (
                  <div key={a.id}>
                    <p className="text-xs text-gray-400 mb-1">{a.filename}</p>
                    <img
                      src={`${API_BASE}/support/attachment/${a.id}`}
                      alt={a.filename}
                      className="max-w-full rounded border border-gray-200"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* linked work items */}
          {ticket.linkedWorkItems?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Linked Work Items ({ticket.linkedWorkItems.length})
              </p>
              <ul className="space-y-1">
                {ticket.linkedWorkItems.map((link: any, i: number) => {
                  const linked = link.inwardIssue || link.outwardIssue;
                  const linkedUrl = linked?.key
                    ? ticket.hyperlink.replace(/\/browse\/.*$/, `/browse/${linked.key}`)
                    : null;
                  return (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-400 text-xs mt-0.5 shrink-0">{link.type}</span>
                      {linked ? (
                        <span>
                          {linkedUrl ? (
                            <a
                              href={linkedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-blue-600 hover:underline"
                            >
                              {linked.key}
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-blue-600">{linked.key}</span>
                          )}
                          {linked.summary && <span className="text-gray-600"> — {linked.summary}</span>}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* comments */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Comments ({ticket.comments?.length || 0})
            </p>
            {!ticket.comments?.length ? (
              <p className="text-sm text-gray-400">No comments</p>
            ) : (
              <ul className="space-y-4">
                {ticket.comments.map((c) => (
                  <li key={c.id} className="border-l-2 border-gray-200 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.author}</span>
                      <span className="text-xs text-gray-400">
                        {c.created ? new Date(c.created).toLocaleString() : ''}
                      </span>
                    </div>
                    <AdfRenderer adf={c.bodyAdf} fallback={c.body} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Saved Tickets tab ─────────────────────────────────────────────────────────
const SavedTicketsTab: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['Closed — Analyzed']));
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const loadTickets = () =>
    supportAPI
      .getTickets()
      .then((res) => setTickets(res.data))
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));

  useEffect(() => { loadTickets(); }, []);

  const handleQuickScan = async () => {
    setScanning(true);
    setScanMsg(null);
    setScanError(null);
    try {
      const res = await supportAPI.scan('Scan Un-closed');
      setScanMsg(`✓ ${res.data.message} — Total: ${res.data.total}, Open: ${res.data.open}, Recently closed: ${res.data.recentlyClosed}`);
      const ticketsRes = await supportAPI.getTickets();
      setTickets(ticketsRes.data);
    } catch (err: any) {
      setScanError(err?.response?.data?.message || err?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleAnalyzeSaved = (id: string, note: string) => {
    setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, analyzeNote: note } : t)));
    setSelected((prev) => (prev?._id === id ? { ...prev, analyzeNote: note } : prev));
  };

  const handleReloaded = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setSelected(updated);
  };

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!tickets.length) return <p className="text-sm text-gray-500">No saved tickets. Run a scan first.</p>;

  return (
    <>
      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onAnalyzeSaved={handleAnalyzeSaved}
          onReloaded={handleReloaded}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">{tickets.length} tickets</span>
          <div className="flex items-center gap-3 flex-wrap">
            {scanMsg && <span className="text-xs text-green-600">{scanMsg}</span>}
            {scanError && <span className="text-xs text-red-600">✗ {scanError}</span>}
            <button
              onClick={handleQuickScan}
              disabled={scanning}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : '↻ Scan Un-closed'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Key</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Assignee</th>
                <th className="px-4 py-3 text-left">Sprint</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-center">Days WD</th>
                <th className="px-4 py-3 text-center">Analyze</th>
              </tr>
            </thead>
            <tbody>
              {groupTickets(tickets).map(({ label, items }) => {
                const isWorkingGroup = label === 'Working';
                return (
                  <React.Fragment key={label}>
                    <tr
                      className="bg-gray-100 border-t-2 border-gray-300 cursor-pointer select-none hover:bg-gray-200"
                      onClick={() => toggleGroup(label)}
                    >
                      <td colSpan={11} className="px-4 py-2">
                        <span className="text-xs mr-2 text-gray-500">
                          {collapsed.has(label) ? '▶' : '▼'}
                        </span>
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          {label}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{items.length} tickets</span>
                      </td>
                    </tr>
                    {!collapsed.has(label) && items.map((t) => (
                      <tr key={t._id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          <a href={t.hyperlink} target="_blank" rel="noopener noreferrer" onClick={cmdClick} className="text-blue-600 hover:underline cursor-default">
                            {t.key}
                          </a>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <button
                            onClick={() => setSelected(t)}
                            className="text-left text-gray-900 hover:text-blue-600 hover:underline truncate block max-w-xs"
                          >
                            {t.title}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{t.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${priorityColor[t.priority] || ''}`}>
                          {t.priority}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{t.assignee || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{t.sprint || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {t.created ? new Date(t.created).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {t.updated ? new Date(t.updated).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                          {isWorkingGroup && t.created ? (
                            <span className={workingDaysClass(workingDaysSince(t.created))}>
                              {workingDaysSince(t.created)}d
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.analyzeNote?.trim() ? (
                            <span title={t.analyzeNote} className="text-green-500 text-base">✓</span>
                          ) : (
                            <span className="text-gray-300 text-base">○</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ── SVK Tickets tab ──────────────────────────────────────────────────────────
// collapsible section — every section starts closed
const Collapse: React.FC<{
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-xs text-gray-400 w-3 shrink-0">{open ? '▾' : '▸'}</span>
        <span className="text-xs font-semibold text-gray-700 flex-1">{title}</span>
      </button>
      {open && <div className="px-3 py-3 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// minimal markdown renderer for AI output — headings, bold, bullets, numbered lists
const MarkdownLite: React.FC<{ text: string }> = ({ text }) => {
  const inline = (s: string): React.ReactNode =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i} className="bg-gray-100 px-1 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
      return part;
    });

  const lines = (text || '').split('\n');
  return (
    <div className="text-sm text-gray-800 space-y-1">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-2" />;

        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          return (
            <p key={i} className={level <= 2 ? 'font-bold text-gray-900 mt-3' : 'font-semibold text-gray-800 mt-2'}>
              {inline(heading[2])}
            </p>
          );
        }

        const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: bullet[1].length * 6 }}>
              <span className="text-gray-400 shrink-0">•</span>
              <span>{inline(bullet[2])}</span>
            </div>
          );
        }

        const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: numbered[1].length * 6 }}>
              <span className="text-gray-400 shrink-0">{numbered[2]}.</span>
              <span>{inline(numbered[3])}</span>
            </div>
          );
        }

        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
};

const CommentList: React.FC<{ comments: SvkComment[] }> = ({ comments }) => {
  if (!comments?.length) return <p className="text-sm text-gray-400">Không có comment</p>;
  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="border-l-2 border-gray-200 pl-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">{c.author || '—'}</span>
            <span className="text-xs text-gray-400">
              {c.created ? new Date(c.created).toLocaleString() : ''}
            </span>
          </div>
          <AdfRenderer adf={c.bodyAdf} fallback={c.body} />
        </li>
      ))}
    </ul>
  );
};

// ── SVK detail panel (slide-in from right) ───────────────────────────────────
const SvkDetailPanel: React.FC<{
  row: SvkRow;
  onClose: () => void;
  onAiUpdated: (key: string, aiResult: string) => void;
  /** history rows may point at a ticket no longer in the live collection — AI can't re-run there */
  allowAiRerun?: boolean;
}> = ({ row, onClose, onAiUpdated, allowAiRerun = true }) => {
  const { doc } = row;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRerun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await supportAPI.svkAiRunOne(doc.key);
      onAiUpdated(doc.key, res.data.analysis);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'AI failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg">{row.urgency}</span>
              <a
                href={doc.hyperlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:underline"
              >
                {doc.key}
              </a>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge(doc.status)}`}>
                {doc.status}
              </span>
              {doc.priority && (
                <span className={`text-xs font-medium ${priorityColor[doc.priority] || ''}`}>{doc.priority}</span>
              )}
              {row.isRecurrence && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                  ♻ Tái phát
                </span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 leading-snug">{doc.summary}</h2>
            <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
              <span>Ngày tuổi: {row.workingDays}d</span>
              {doc.linkedPlKeys?.length > 0 && <span>PL: {doc.linkedPlKeys.join(', ')}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <Collapse title={`${doc.key} — Nội dung`}>
            {doc.descriptionAdf || doc.description ? (
              <AdfRenderer adf={doc.descriptionAdf} fallback={doc.description} />
            ) : (
              <p className="text-sm text-gray-400">Không có nội dung</p>
            )}
          </Collapse>

          <Collapse title={`${doc.key} — Comment (${doc.comments?.length || 0})`}>
            <CommentList comments={doc.comments} />
          </Collapse>

          {(doc.linkedPl || []).map((pl) => (
            <React.Fragment key={pl.key}>
              <Collapse
                title={
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono">{pl.key}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadge(pl.status)}`}>{pl.status}</span>
                    <span className="font-normal text-gray-500 truncate">— Nội dung</span>
                  </span>
                }
              >
                <p className="text-xs text-gray-500 mb-2">
                  {pl.summary} · {pl.assignee || 'chưa gán'} · {pl.sprint || '—'}
                </p>
                {pl.descriptionAdf || pl.description ? (
                  <AdfRenderer adf={pl.descriptionAdf} fallback={pl.description} />
                ) : (
                  <p className="text-sm text-gray-400">Không có nội dung</p>
                )}
              </Collapse>
              <Collapse title={`${pl.key} — Comment (${pl.comments?.length || 0})`}>
                <CommentList comments={pl.comments} />
              </Collapse>
            </React.Fragment>
          ))}

          <Collapse
            title={
              <span className="flex items-center gap-2">
                <span className="text-violet-700">✦ AI Đánh giá</span>
                {doc.aiResult ? (
                  <span className="text-[10px] font-normal text-gray-400">
                    {doc.aiRunAt ? new Date(doc.aiRunAt).toLocaleString() : ''}
                  </span>
                ) : doc.aiError ? (
                  <span className="text-[10px] font-normal text-red-500">lỗi</span>
                ) : (
                  <span className="text-[10px] font-normal text-gray-400">chưa chạy</span>
                )}
              </span>
            }
          >
            {allowAiRerun && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleRerun}
                  disabled={running}
                  className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                >
                  {running ? '⏳ Đang chạy...' : doc.aiResult ? '↻ Chạy lại AI' : '✦ Chạy AI'}
                </button>
                {error && <span className="text-xs text-red-600">✗ {error}</span>}
              </div>
            )}
            {doc.aiResult ? (
              <MarkdownLite text={doc.aiResult} />
            ) : doc.aiError ? (
              <p className="text-sm text-red-600">✗ {doc.aiError}</p>
            ) : (
              <p className="text-sm text-gray-400">Chưa có kết quả AI cho ticket này.</p>
            )}
          </Collapse>
        </div>
      </div>
    </div>
  );
};

// inline note cell — click to edit, debounced auto-save per SVK key
const NoteCell: React.FC<{
  svkKey: string;
  value: string;
  onChange: (key: string, note: string) => void;
}> = ({ svkKey, value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // pick up external changes (rescan) while not editing
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const save = async (next: string) => {
    setState('saving');
    try {
      await supportAPI.saveSvkNote(svkKey, next);
      onChange(svkKey, next);
      setState('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setState('idle'), 1500);
    } catch {
      setState('error');
    }
  };

  const handleChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 700);
  };

  const handleBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    setEditing(false);
    if (draft !== value) save(draft);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        title="Bấm để sửa"
        className="min-h-[28px] text-xs whitespace-pre-wrap cursor-text rounded px-1.5 py-1 hover:bg-yellow-50 border border-transparent hover:border-yellow-200"
      >
        {draft?.trim() ? (
          <span className="text-gray-700">{draft}</span>
        ) : (
          <span className="text-gray-300">+ note</span>
        )}
      </div>
    );
  }

  return (
    <div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (timer.current) clearTimeout(timer.current);
            setDraft(value);
            setEditing(false);
            return;
          }
          // Enter = lưu + out focus, Shift+Enter = xuống dòng
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        rows={3}
        className="w-full text-xs border border-blue-300 rounded px-1.5 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <div className="h-3 text-[10px] leading-3">
        {state === 'saving' && <span className="text-gray-400">Đang lưu...</span>}
        {state === 'saved' && <span className="text-green-600">✓ Đã lưu</span>}
        {state === 'error' && <span className="text-red-600">✗ Lỗi lưu</span>}
      </div>
    </div>
  );
};

const SVKTicketsTab: React.FC = () => {
  const [rows, setRows] = useState<SvkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [aiJob, setAiJob] = useState<AiJobState | null>(null);

  const loadTickets = async () => {
    const res = await supportAPI.getSvkTickets();
    setRows(buildRows(res.data || []));
  };

  useEffect(() => {
    supportAPI.getSvkNotes().then((res) => setNotes(res.data || {})).catch(() => {});
    Promise.all([
      loadTickets().catch((err) => setScanError(err?.message || 'Load failed')),
      supportAPI.svkAiStatus().then((res) => setAiJob(res.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI is queued per ticket during the scan, so poll while scanning too and pull
  // in rows + results as they land instead of waiting for the scan to finish
  useEffect(() => {
    if (!aiJob?.running && !scanning) return;
    const timer = setInterval(async () => {
      try {
        const res = await supportAPI.svkAiStatus();
        const next: AiJobState = res.data;
        const progressed = next.done + next.failed !== (aiJob ? aiJob.done + aiJob.failed : 0);
        setAiJob(next);
        if (progressed || scanning || !next.running) {
          await loadTickets();
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiJob?.running, aiJob?.done, aiJob?.failed, scanning]);

  const handleNoteChange = (key: string, note: string) =>
    setNotes((prev) => ({ ...prev, [key]: note }));

  const handleAiUpdated = (key: string, aiResult: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.doc.key === key
          ? { ...r, doc: { ...r.doc, aiResult, aiError: '', aiRunAt: new Date().toISOString() } }
          : r
      )
    );

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanStep('Đang tải SVK + PL ticket, nội dung và comment từ Jira...');
    try {
      const res = await supportAPI.scanSvk();
      await loadTickets();
      setAiJob(res.data.aiJob || null);
    } catch (err: any) {
      setScanError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Scan failed');
    } finally {
      setScanning(false);
      setScanStep(null);
    }
  };

  const handleRunAllAi = async () => {
    try {
      const res = await supportAPI.svkAiRunAll();
      setAiJob(res.data);
    } catch (err: any) {
      setScanError(err?.response?.data?.message || err?.message || 'AI job failed');
    }
  };

  const selected = rows.find((r) => r.doc.key === selectedKey) || null;

  const redCount = rows.filter((r) => r.urgency === '🔴').length;
  const yellowCount = rows.filter((r) => r.urgency === '🟡').length;
  const greenCount = rows.filter((r) => r.urgency === '🟢').length;
  const pendingAi = rows.filter((r) => !r.doc.aiResult && !r.doc.aiError).length;

  return (
    <>
      {selected && (
        <SvkDetailPanel
          row={selected}
          onClose={() => setSelectedKey(null)}
          onAiUpdated={handleAiUpdated}
        />
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
        >
          {scanning ? 'Scanning...' : '↻ Scan Un-closed'}
        </button>
        {pendingAi > 0 && !aiJob?.running && (
          <button
            onClick={handleRunAllAi}
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 font-medium text-sm"
          >
            ✦ Chạy AI ({pendingAi} ticket)
          </button>
        )}
        {scanning && scanStep && <span className="text-sm text-blue-600">{scanStep}</span>}
        {!scanning && !loading && (
          <span className="text-sm text-green-600 font-medium">
            ✓ {rows.length} tickets — 🔴 {redCount} · 🟡 {yellowCount} · 🟢 {greenCount}
          </span>
        )}
        {aiJob?.running && (
          <span className="text-sm text-violet-600">
            ✦ AI đang chạy: {aiJob.done + aiJob.failed}/{aiJob.total}
            {aiJob.failed > 0 && ` (${aiJob.failed} lỗi)`}
            {aiJob.queued > 0 && ` · ${aiJob.queued} chờ`}
            {aiJob.current.length > 0 && ` — ${aiJob.current.join(', ')}`}
          </span>
        )}
        {scanError && <span className="text-sm text-red-600">✗ {scanError}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có dữ liệu. Bấm Scan Un-closed để tải.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-3 text-center w-[60px]">Độ khẩn</th>
                  <th className="px-3 py-3 text-left w-[160px]">Ticket</th>
                  <th className="px-3 py-3 text-left w-[100px]">Ticket SVK</th>
                  <th className="px-3 py-3 text-left w-[100px]">PL Linked</th>
                  <th className="px-3 py-3 text-center w-[75px]">Ngày tuổi PL</th>
                  <th className="px-3 py-3 text-center w-[75px]">Ngày tuổi</th>
                  <th className="px-3 py-3 text-left w-[140px]">PL Assignee</th>
                  <th className="px-3 py-3 text-left w-[120px]">PL Sprint</th>
                  <th className="px-3 py-3 text-left w-[130px]">TT SVK</th>
                  <th className="px-3 py-3 text-left w-[140px]">TT PL</th>
                  <th className="px-3 py-3 text-left w-[220px]">Note</th>
                  <th className="px-3 py-3 text-center w-[90px]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { doc } = row;
                  const plKeys = doc.linkedPlKeys || [];
                  const findPl = (key: string) => (doc.linkedPl || []).find((p) => p.key === key);
                  return (
                    <tr key={doc.key} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                      <td className="px-3 py-3 text-center text-lg">{row.urgency}</td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-700">{doc.key}</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => (
                              <span key={key} className="block text-gray-700">{doc.key} x {key}</span>
                            ))}
                          </div>
                        )}
                        {row.isRecurrence && (
                          <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium font-sans">
                            ♻ Tái phát
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                        <a href={doc.hyperlink} target="_blank" rel="noopener noreferrer" onClick={cmdClick} className="text-blue-600 hover:underline cursor-default">
                          {doc.key}
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => (
                              <a key={key} href={`${JIRA_BASE}/browse/${key}`} target="_blank" rel="noopener noreferrer" onClick={cmdClick} className="block font-mono text-xs text-blue-600 hover:underline cursor-default">
                                {key}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => {
                              const pl = findPl(key);
                              const d = pl ? workingDaysSince(pl.created) : 0;
                              return <span key={key} className={`block ${workingDaysClass(d)}`}>{pl ? `${d}d` : '—'}</span>;
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">
                        <span className={workingDaysClass(row.workingDays)}>{row.workingDays}d</span>
                      </td>
                      <td className="px-3 py-3">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => (
                              <span key={key} className="block text-xs text-gray-700">{findPl(key)?.assignee || '—'}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => (
                              <span key={key} className="block text-xs text-gray-500">{findPl(key)?.sprint || '—'}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {plKeys.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {plKeys.map((key) => {
                              const pl = findPl(key);
                              return pl ? (
                                <span key={key} className={`block px-1.5 py-0.5 rounded text-xs font-medium w-fit ${statusBadge(pl.status)}`}>
                                  {pl.status}
                                </span>
                              ) : (
                                <span key={key} className="block text-xs text-gray-400">—</span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <NoteCell
                          svkKey={doc.key}
                          value={notes[doc.key] || ''}
                          onChange={handleNoteChange}
                        />
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedKey(doc.key)}
                          className="text-xs px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        >
                          Detail
                        </button>
                        <div className="mt-1 text-[10px] leading-3">
                          {doc.aiResult ? (
                            <span className="text-violet-600" title="Đã có kết quả AI">✦ AI</span>
                          ) : doc.aiError ? (
                            <span className="text-red-500" title={doc.aiError}>✗ AI</span>
                          ) : (
                            <span className="text-gray-300">✦ AI</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

// ── SVK History tab ──────────────────────────────────────────────────────────
// Every SVK ticket ever loaded, kept even after it drops out of the scan JQL.
// A re-load overwrites the stored snapshot, so this is always "last known state".
const SvkHistoryTab: React.FC = () => {
  const [docs, setDocs] = useState<SvkHistoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'lastLoadedAt' | 'firstLoadedAt' | 'created'>('lastLoadedAt');

  useEffect(() => {
    supportAPI.getSvkNotes().then((res) => setNotes(res.data || {})).catch(() => {});
    supportAPI
      .getSvkHistory()
      .then((res) => setDocs(res.data || []))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Load failed'))
      .finally(() => setLoading(false));
  }, []);

  const handleNoteChange = (key: string, note: string) =>
    setNotes((prev) => ({ ...prev, [key]: note }));

  const q = query.trim().toLowerCase();
  const filtered = docs.filter((d) =>
    !q ||
    d.key.toLowerCase().includes(q) ||
    (d.summary || '').toLowerCase().includes(q) ||
    (d.linkedPlKeys || []).some((k) => k.toLowerCase().includes(q))
  );

  const ts = (v?: string) => (v ? new Date(v).getTime() : 0);
  const sorted = [...filtered].sort((a, b) =>
    sort === 'created' ? ts(b.created) - ts(a.created) : ts(b[sort]) - ts(a[sort])
  );

  const selectedDoc = sorted.find((d) => d.key === selectedKey) || null;
  const selectedRow: SvkRow | null = selectedDoc ? buildRows([selectedDoc])[0] : null;

  const fmt = (v?: string) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

  return (
    <>
      {selectedRow && (
        <SvkDetailPanel
          row={selectedRow}
          onClose={() => setSelectedKey(null)}
          onAiUpdated={() => {}}
          allowAiRerun={false}
        />
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo SVK key, tiêu đề, PL key..."
          className="text-sm border border-gray-300 rounded px-3 py-1.5 w-72 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5"
        >
          <option value="lastLoadedAt">Sắp xếp: Load gần nhất</option>
          <option value="firstLoadedAt">Sắp xếp: Load đầu tiên</option>
          <option value="created">Sắp xếp: Ngày tạo ticket</option>
        </select>
        {!loading && (
          <span className="text-sm text-gray-600">
            {sorted.length}/{docs.length} ticket đã lưu
          </span>
        )}
        {error && <span className="text-sm text-red-600">✗ {error}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500">
          Chưa có lịch sử. Mỗi lần Scan ở tab SVK Tickets sẽ lưu ticket vào đây.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-3 text-left w-[100px]">Ticket SVK</th>
                  <th className="px-3 py-3 text-left">Tiêu đề</th>
                  <th className="px-3 py-3 text-left w-[110px]">PL Linked</th>
                  <th className="px-3 py-3 text-left w-[130px]">TT SVK</th>
                  <th className="px-3 py-3 text-left w-[150px]">Ngày tạo</th>
                  <th className="px-3 py-3 text-left w-[150px]">Load đầu tiên</th>
                  <th className="px-3 py-3 text-left w-[150px]">Load gần nhất</th>
                  <th className="px-3 py-3 text-center w-[70px]">Số lần</th>
                  <th className="px-3 py-3 text-left w-[220px]">Note</th>
                  <th className="px-3 py-3 text-center w-[90px]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc) => (
                  <tr key={doc.key} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                      <a href={doc.hyperlink} target="_blank" rel="noopener noreferrer" onClick={cmdClick} className="text-blue-600 hover:underline cursor-default">
                        {doc.key}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">{doc.summary || '—'}</td>
                    <td className="px-3 py-3">
                      {(doc.linkedPlKeys || []).length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="space-y-1">
                          {doc.linkedPlKeys.map((key) => (
                            <a key={key} href={`${JIRA_BASE}/browse/${key}`} target="_blank" rel="noopener noreferrer" onClick={cmdClick} className="block font-mono text-xs text-blue-600 hover:underline cursor-default">
                              {key}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(doc.status)}`}>
                        {doc.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(doc.created)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(doc.firstLoadedAt)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(doc.lastLoadedAt)}</td>
                    <td className="px-3 py-3 text-center text-xs text-gray-700">{doc.loadCount ?? 0}</td>
                    <td className="px-3 py-3 align-top">
                      <NoteCell svkKey={doc.key} value={notes[doc.key] || ''} onChange={handleNoteChange} />
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedKey(doc.key)}
                        className="text-xs px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                      >
                        Detail
                      </button>
                      <div className="mt-1 text-[10px] leading-3">
                        {doc.aiResult ? (
                          <span className="text-violet-600" title="Đã có kết quả AI">✦ AI</span>
                        ) : doc.aiError ? (
                          <span className="text-red-500" title={doc.aiError}>✗ AI</span>
                        ) : (
                          <span className="text-gray-300">✦ AI</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'svk' | 'history' | 'pl' | 'scan';

const Support: React.FC = () => {
  const [tab, setTab] = useState<Tab>('svk');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Support Tickets</h1>

      {/* sub-menu */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['svk', 'SVK Tickets'], ['history', 'Lịch sử SVK'], ['pl', 'PL Tickets'], ['scan', 'Scan']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'svk' ? (
        <SVKTicketsTab />
      ) : tab === 'history' ? (
        <SvkHistoryTab />
      ) : tab === 'scan' ? (
        <ScanTab />
      ) : (
        <SavedTicketsTab />
      )}
    </div>
  );
};

export default Support;
