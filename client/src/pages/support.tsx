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

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  useEffect(() => {
    supportAPI
      .getTickets()
      .then((res) => setTickets(res.data))
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-600">
          {tickets.length} tickets
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
                <th className="px-4 py-3 text-center">Analyze</th>
              </tr>
            </thead>
            <tbody>
              {groupTickets(tickets).map(({ label, items }) => (
                <React.Fragment key={label}>
                  <tr
                    className="bg-gray-100 border-t-2 border-gray-300 cursor-pointer select-none hover:bg-gray-200"
                    onClick={() => toggleGroup(label)}
                  >
                    <td colSpan={10} className="px-4 py-2">
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
                      <td className="px-4 py-3 font-mono whitespace-nowrap text-gray-800">
                        {t.key}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'scan' | 'saved';

const Support: React.FC = () => {
  const [tab, setTab] = useState<Tab>('saved');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Support Tickets</h1>

      {/* sub-menu */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['saved', 'Saved Tickets'], ['scan', 'Scan']] as [Tab, string][]).map(([key, label]) => (
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

      {tab === 'scan' ? <ScanTab /> : <SavedTicketsTab />}
    </div>
  );
};

export default Support;
