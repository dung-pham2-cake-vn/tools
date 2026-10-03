import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import AdfRenderer from '@/components/AdfRenderer';
import { JiraStatusPill, JiraTypeTag } from '@/components/JiraBadges';
import Markdown from '@/components/Markdown';
import {
  jiraAPI,
  ticketAIAPI,
  ticketNoteAPI,
  TICKET_NOTE_CHANGED_EVENT,
  type BrdDoc,
  type BrdLinkCandidate,
} from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';
/** Link ticket Jira: .../browse/PL-123 (bỏ qua query/hash). */
const BROWSE_RE = /atlassian\.net\/browse\/([A-Z][A-Z0-9]+-\d+)(?:[?#/]|$)/;
/** Đặt trên <a> để click luôn mở thẳng link, không mở overlay. */
export const DIRECT_LINK_ATTR = 'data-direct-link';

interface OverlayCtx {
  openTicket: (key: string) => void;
}

const TicketOverlayContext = createContext<OverlayCtx>({ openTicket: () => undefined });
export const useTicketOverlay = () => useContext(TicketOverlayContext);

interface IssueDetail {
  key: string;
  fields: any;
}

interface ChildIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  assignee: string;
}

const DETAIL_FIELDS = [
  'summary',
  'status',
  'issuetype',
  'assignee',
  'reporter',
  'priority',
  'fixVersions',
  'labels',
  'parent',
  'issuelinks',
  'description',
  'created',
  'updated',
  'duedate',
  'project',
];

const fmtDate = (value?: string) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="whitespace-nowrap text-xs text-gray-500">{label}</dt>
      <dd className="min-w-0 text-xs text-gray-800">{children}</dd>
    </>
  );
}

function TicketLink({ ticketKey, summary }: { ticketKey: string; summary?: string }) {
  return (
    <a
      href={`${JIRA_BASE}/browse/${ticketKey}`}
      target="_blank"
      rel="noopener noreferrer"
      title={summary}
      className="font-mono font-semibold text-blue-600 hover:underline"
    >
      {ticketKey}
    </a>
  );
}

/** Note riêng của ticket: xem dạng markdown, bấm để sửa, tự lưu khi rời ô / ⌘+Enter. */
function TicketNoteSection({ ticketKey }: { ticketKey: string }) {
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await ticketNoteAPI.get(ticketKey);
      setContent(res.data.data.content || '');
      setUpdatedAt(res.data.data.updatedAt || null);
    } finally {
      setLoaded(true);
    }
  }, [ticketKey]);

  useEffect(() => {
    load().catch(() => undefined);
    const onChanged = (event: Event) => {
      if ((event as CustomEvent).detail === ticketKey) load().catch(() => undefined);
    };
    window.addEventListener(TICKET_NOTE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(TICKET_NOTE_CHANGED_EVENT, onChanged);
  }, [ticketKey, load]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!editing || !el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [editing, draft]);

  const startEdit = () => {
    setDraft(content);
    setEditing(true);
  };

  const save = async () => {
    setEditing(false);
    if (draft === content) return;
    setSaving(true);
    try {
      const res = await ticketNoteAPI.save(ticketKey, draft);
      setContent(res.data.data.content || '');
      setUpdatedAt(res.data.data.updatedAt || null);
    } catch (err: any) {
      setDraft(draft);
      setEditing(true);
      window.alert(err?.response?.data?.error || 'Lưu note thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">📝 Note</h3>
        <span className="text-[10px] text-gray-400">
          {saving ? 'Đang lưu...' : updatedAt ? `lưu lúc ${fmtDate(updatedAt)}` : 'chỉ lưu trong tool, không ghi lên Jira'}
        </span>
        {!editing && content && (
          <button onClick={startEdit} className="ml-auto text-[11px] text-blue-600 hover:underline">
            ✏️ Sửa
          </button>
        )}
      </div>
      {!loaded ? (
        <p className="text-xs text-gray-400">Đang tải note...</p>
      ) : editing || !content ? (
        <textarea
          ref={textareaRef}
          autoFocus={editing}
          value={editing ? draft : ''}
          onFocus={() => !editing && startEdit()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) (event.target as HTMLTextAreaElement).blur();
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEditing(false);
            }
          }}
          rows={4}
          placeholder="Ghi chú cho ticket này... (hỗ trợ **đậm**, *nghiêng*, - gạch đầu dòng). Hoặc trong Chat AI nhờ: “note lại vào PL-123: …”"
          className="w-full resize-none rounded border border-amber-200 bg-amber-50/40 p-3 text-sm focus:border-amber-400 focus:outline-none"
        />
      ) : (
        <div
          onDoubleClick={startEdit}
          title="Bấm đúp để sửa"
          className="cursor-text rounded border border-amber-200 bg-amber-50/60 p-3 text-sm text-gray-800"
        >
          <Markdown text={content} />
        </div>
      )}
    </section>
  );
}

/** Tên file đoán từ URL SharePoint (?file=...) để hiện cho dễ nhận. */
function fileNameFromUrl(url: string): string {
  try {
    const fromQuery = new URL(url).searchParams.get('file');
    if (fromQuery) return decodeURIComponent(fromQuery);
  } catch {
    // url méo -> rơi xuống nhánh dưới
  }
  return url.length > 70 ? `${url.slice(0, 67)}...` : url;
}

/** BRD của ticket: link tìm thấy trong mô tả/comment, bản PDF đã tải, thời gian tải, tải lại. */
function TicketBrdSection({ ticketKey }: { ticketKey: string }) {
  const [links, setLinks] = useState<BrdLinkCandidate[]>([]);
  const [docs, setDocs] = useState<BrdDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  /** url đang tải về — khoá nút và hiện trạng thái. */
  const [busyUrl, setBusyUrl] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    async (scan = false) => {
      const [linkRes, docRes] = await Promise.all([
        ticketAIAPI.getBrdLinks(ticketKey, scan),
        ticketAIAPI.listBrd(ticketKey),
      ]);
      setLinks(linkRes.data.data?.links || linkRes.data.data || []);
      setDocs(docRes.data.data || []);
    },
    [ticketKey]
  );

  useEffect(() => {
    setLoaded(false);
    load()
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [load]);

  const rescan = async () => {
    setScanning(true);
    setError('');
    try {
      await load(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Quét link thất bại');
    } finally {
      setScanning(false);
    }
  };

  const download = async (url: string) => {
    setBusyUrl(url);
    setError('');
    try {
      await ticketAIAPI.importBrdFromUrl(ticketKey, url);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Tải BRD thất bại');
    } finally {
      setBusyUrl('');
    }
  };

  const docByUrl = new Map(docs.filter((doc) => doc.sourceUrl).map((doc) => [doc.sourceUrl, doc]));
  const brdLinks = links.filter((link) => link.likelyBrd);
  const orphanDocs = docs.filter((doc) => !doc.sourceUrl || !links.some((link) => link.url === doc.sourceUrl));

  if (loaded && brdLinks.length === 0 && orphanDocs.length === 0) {
    return (
      <section>
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">📄 BRD</h3>
          <button
            onClick={rescan}
            disabled={scanning}
            className="ml-auto text-[11px] text-blue-600 hover:underline disabled:opacity-50"
          >
            {scanning ? 'Đang quét...' : 'Quét lại link'}
          </button>
        </div>
        <p className="text-xs italic text-gray-400">Không thấy link BRD nào trong mô tả hoặc comment.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </section>
    );
  }

  const row = (url: string, doc: BrdDoc | undefined, key: string) => (
    <li key={key} className="px-2 py-1.5 text-xs">
      <div className="flex items-start gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          {...{ [DIRECT_LINK_ATTR]: '' }}
          title={url}
          className="min-w-0 flex-1 truncate text-blue-600 hover:underline"
        >
          {doc?.filename || fileNameFromUrl(url)}
        </a>
        {doc ? (
          <>
            <a
              href={ticketAIAPI.brdPdfUrl(ticketKey, doc._id)}
              target="_blank"
              rel="noopener noreferrer"
              {...{ [DIRECT_LINK_ATTR]: '' }}
              className="shrink-0 rounded border border-gray-300 px-1.5 py-0.5 font-semibold text-gray-700 hover:bg-gray-50"
            >
              PDF
            </a>
            <button
              onClick={() => download(url)}
              disabled={!!busyUrl}
              title="Tải lại từ SharePoint"
              className="shrink-0 rounded border border-blue-200 px-1.5 py-0.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {busyUrl === url ? 'Đang tải...' : 'Tải lại'}
            </button>
          </>
        ) : (
          <button
            onClick={() => download(url)}
            disabled={!!busyUrl}
            className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {busyUrl === url ? 'Đang tải...' : 'Tải PDF'}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-gray-400">
        {doc
          ? `tải lúc ${fmtDate(doc.importedAt)} · ${(doc.pdfSize / 1024).toFixed(0)} KB · ${doc.text.length.toLocaleString()} ký tự`
          : 'chưa tải — Word trên máy chạy backend sẽ mở link rồi xuất PDF'}
      </p>
    </li>
  );

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
          📄 BRD ({brdLinks.length + orphanDocs.length})
        </h3>
        <button
          onClick={rescan}
          disabled={scanning}
          className="ml-auto text-[11px] text-blue-600 hover:underline disabled:opacity-50"
        >
          {scanning ? 'Đang quét...' : 'Quét lại link'}
        </button>
      </div>
      {!loaded ? (
        <p className="text-xs text-gray-400">Đang tải BRD...</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded border border-gray-100">
          {brdLinks.map((link) => row(link.url, docByUrl.get(link.url), link.url))}
          {orphanDocs.map((doc) => row(doc.sourceUrl || '', doc, doc._id))}
        </ul>
      )}
      {busyUrl && (
        <p className="mt-1 text-[11px] text-amber-700">
          Word đang mở tài liệu và xuất PDF — mất khoảng 10–60 giây, đừng đóng cửa sổ Word.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}

function TicketPanel({
  ticketKey,
  canGoBack,
  onBack,
  onClose,
}: {
  ticketKey: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [children, setChildren] = useState<ChildIssue[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setIssue(null);
    setChildren([]);
    setError('');
    (async () => {
      try {
        const res = await jiraAPI.searchIssues({ jql: `key = ${ticketKey}`, maxResults: 1, fields: DETAIL_FIELDS });
        const found = (res.data.data as { issues?: IssueDetail[] })?.issues?.[0];
        if (!alive) return;
        if (!found) throw new Error(`Không tìm thấy ${ticketKey} (hoặc không có quyền xem)`);
        setIssue(found);
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.error || err?.message || 'Không tải được ticket');
        return;
      }
      // con trực tiếp: subtask + ticket con của Epic/Initiative
      try {
        const res = await jiraAPI.searchIssues({
          jql: `parent = ${ticketKey} ORDER BY created ASC`,
          maxResults: 100,
          fields: ['summary', 'status', 'issuetype', 'assignee'],
        });
        if (!alive) return;
        setChildren(
          ((res.data.data as { issues?: any[] })?.issues || []).map((it) => ({
            key: it.key,
            summary: it.fields?.summary || '',
            type: it.fields?.issuetype?.name || '',
            status: it.fields?.normalizedStatusName || it.fields?.status?.name || '',
            assignee: it.fields?.normalizedAssigneeName || '',
          }))
        );
      } catch {
        // không có con / JQL không hỗ trợ parent → bỏ qua
      }
    })();
    return () => {
      alive = false;
    };
  }, [ticketKey]);

  const f = issue?.fields || {};
  const links: Array<{ relation: string; key: string; summary: string; status: string }> = (f.issuelinks || [])
    .map((link: any) => {
      const other = link.outwardIssue || link.inwardIssue;
      if (!other) return null;
      return {
        relation: link.outwardIssue ? link.type?.outward : link.type?.inward,
        key: other.key,
        summary: other.fields?.summary || '',
        status: other.fields?.status?.name || '',
      };
    })
    .filter(Boolean);
  const sprints: Array<{ name: string; state?: string }> = f.normalizedSprints || [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-gray-200 px-5 py-4">
        {canGoBack && (
          <button onClick={onBack} title="Ticket trước" className="mt-0.5 text-lg leading-none text-gray-400 hover:text-gray-700">
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-gray-900">{ticketKey}</span>
            {f.issuetype?.name && <JiraTypeTag name={f.issuetype.name} />}
            {f.normalizedStatusName && <JiraStatusPill name={f.normalizedStatusName} />}
          </div>
          {f.summary && <p className="mt-1 text-sm font-semibold text-gray-800">{f.summary}</p>}
        </div>
        <button onClick={onClose} title="Đóng (Esc)" className="text-2xl leading-none text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-2">
        <a
          href={`${JIRA_BASE}/browse/${ticketKey}`}
          target="_blank"
          rel="noopener noreferrer"
          {...{ [DIRECT_LINK_ATTR]: '' }}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Mở trên Jira ↗
        </a>
        <Link
          href={`/ai-chat?ticket=${ticketKey}`}
          onClick={onClose}
          className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          💬 Chat AI với ticket này
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {error ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : !issue ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải {ticketKey}...</p>
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <Field label="Assignee">{f.normalizedAssigneeName || 'Unassigned'}</Field>
              <Field label="Reporter">{f.normalizedReporterName || '-'}</Field>
              {f.normalizedPriorityName && <Field label="Priority">{f.normalizedPriorityName}</Field>}
              {f.parent?.key && (
                <Field label="Parent">
                  <TicketLink ticketKey={f.parent.key} summary={f.parent.fields?.summary} />{' '}
                  <span className="text-gray-600">{f.parent.fields?.summary}</span>
                </Field>
              )}
              <Field label="Sprint">
                {sprints.length ? sprints.map((sp) => `${sp.name}${sp.state ? ` (${sp.state})` : ''}`).join(', ') : '-'}
              </Field>
              <Field label="Fix version">{(f.normalizedFixVersionNames || []).join(', ') || '-'}</Field>
              {f.normalizedStoryPoints > 0 && <Field label="Story point">{f.normalizedStoryPoints}</Field>}
              {(f.labels || []).length > 0 && (
                <Field label="Labels">
                  <span className="flex flex-wrap gap-1">
                    {f.labels.map((label: string) => (
                      <span key={label} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {label}
                      </span>
                    ))}
                  </span>
                </Field>
              )}
              {f.duedate && <Field label="Due date">{f.duedate}</Field>}
              <Field label="Created">{fmtDate(f.created)}</Field>
              <Field label="Updated">{fmtDate(f.updated)}</Field>
            </dl>

            <TicketNoteSection ticketKey={ticketKey} />

            <TicketBrdSection ticketKey={ticketKey} />

            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">Mô tả</h3>
              <div className="rounded border border-gray-100 bg-slate-50/60 p-3">
                {f.description ? (
                  <AdfRenderer adf={f.description} />
                ) : (
                  <p className="text-xs italic text-gray-400">Chưa có mô tả</p>
                )}
              </div>
            </section>

            {children.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Ticket con ({children.length})
                </h3>
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {children.map((child) => (
                    <li key={child.key} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                      <TicketLink ticketKey={child.key} summary={child.summary} />
                      <span className="min-w-0 flex-1 truncate text-gray-700" title={child.summary}>
                        {child.summary}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{child.assignee}</span>
                      <JiraStatusPill name={child.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {links.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Liên kết ({links.length})
                </h3>
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {links.map((link, idx) => (
                    <li key={`${link.key}-${idx}`} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                      <span className="w-24 shrink-0 truncate text-[10px] text-gray-400" title={link.relation}>
                        {link.relation}
                      </span>
                      <TicketLink ticketKey={link.key} summary={link.summary} />
                      <span className="min-w-0 flex-1 truncate text-gray-700" title={link.summary}>
                        {link.summary}
                      </span>
                      {link.status && <JiraStatusPill name={link.status} />}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Bấm vào link ticket Jira ở bất kỳ đâu trong tool → mở overlay bên phải.
 * ⌘/Ctrl/Shift + click (hoặc chuột giữa) → mở thẳng link như bình thường.
 */
export function TicketOverlayProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>([]);
  const current = stack[stack.length - 1];

  const openTicket = useCallback((key: string) => {
    const upper = key.toUpperCase();
    setStack((prev) => (prev[prev.length - 1] === upper ? prev : [...prev, upper]));
  }, []);
  const close = useCallback(() => setStack([]), []);

  useEffect(() => {
    // capture: chạy trước mọi stopPropagation của modal/panel bên dưới
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute(DIRECT_LINK_ATTR)) return;
      const match = anchor.href.match(BROWSE_RE);
      if (!match) return;
      event.preventDefault();
      openTicket(match[1]);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openTicket]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as HTMLElement)?.closest?.('textarea, input')) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  return (
    <TicketOverlayContext.Provider value={{ openTicket }}>
      {children}
      {current &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/20" onClick={close}>
            <div
              className="h-full w-full max-w-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <TicketPanel
                key={current}
                ticketKey={current}
                canGoBack={stack.length > 1}
                onBack={() => setStack((prev) => prev.slice(0, -1))}
                onClose={close}
              />
            </div>
          </div>,
          document.body
        )}
    </TicketOverlayContext.Provider>
  );
}
