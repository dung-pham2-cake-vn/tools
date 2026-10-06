import React, { useState, useEffect } from 'react';
import { supportAPI, jiraAPI } from '../utils/api';
import {
  workingDaysSince,
  buildRows,
  type SvkAttachment,
  type SvkComment,
  type SvkTicketDoc,
  type SvkRow,
} from '../utils/svk';
import AdfRenderer from '../components/AdfRenderer';

const priorityColor: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-600',
  Low: 'text-blue-500',
  Lowest: 'text-gray-400',
};

function workingDaysClass(days: number): string {
  if (days > 10) return 'text-red-600 font-semibold';
  if (days > 5) return 'text-orange-500 font-medium';
  return 'text-gray-600';
}

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

const cmdClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  if (!e.metaKey && !e.ctrlKey) e.preventDefault();
};

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
  skipped: number;
  queued: number;
  current: string[];
  aiAvailable: boolean;
  aiUnavailableReason: string;
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

// ── Công thức scan ───────────────────────────────────────────────────────────

interface ScanRecipe {
  svkJql: string;
  plJql: string;
  svkFields: string[];
  plFields: string[];
  steps: string[];
  urgencyRules: string[];
}

/** Lấy thẳng từ hằng số trong SvkService nên luôn khớp với code đang chạy. */
const ScanRecipePanel: React.FC = () => {
  const [recipe, setRecipe] = useState<ScanRecipe | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supportAPI
      .svkScanRecipe()
      .then((res) => setRecipe(res.data as ScanRecipe))
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Không tải được công thức scan'));
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-gray-900"
      >
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        Công thức scan
        <span className="font-normal text-xs text-gray-400">JQL và các bước đang chạy</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4 text-xs">
          {error && <p className="text-red-600">{error}</p>}
          {!recipe && !error && <div className="h-16 animate-pulse rounded bg-gray-50" />}
          {recipe && (
            <>
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">JQL lấy SVK</p>
                <pre className="whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-700">
                  {recipe.svkJql}
                </pre>
                <p className="mt-1 text-[11px] text-gray-400">Fields: {recipe.svkFields.join(', ')}</p>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">JQL nạp PL liên quan</p>
                <pre className="whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-700">
                  {recipe.plJql}
                </pre>
                <p className="mt-1 text-[11px] text-gray-400">Fields: {recipe.plFields.join(', ')}</p>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">Các bước</p>
                <ol className="list-decimal space-y-0.5 pl-5 text-gray-600">
                  {recipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">Quy tắc màu độ khẩn</p>
                <ul className="space-y-0.5 text-gray-600">
                  {recipe.urgencyRules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── File đính kèm ────────────────────────────────────────────────────────────

const ATTACHMENT_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Ảnh hiện thẳng, video có player, còn lại là link tải — tất cả đi qua proxy backend vì Jira cần auth. */
const AttachmentList: React.FC<{ items?: SvkAttachment[] }> = ({ items }) => {
  if (!items?.length) return <p className="text-sm text-gray-400">Không có file đính kèm</p>;

  return (
    <div className="space-y-3">
      {items.map((file) => {
        const url = `${ATTACHMENT_API}/support/attachment/${file.id}`;
        const type = (file.mimeType || '').toLowerCase();
        return (
          <div key={file.id}>
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {file.filename}
              </a>
              <span className="shrink-0">· {fileSize(file.size)}</span>
            </div>
            {type.startsWith('image/') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={file.filename} loading="lazy" className="max-h-80 rounded border border-gray-200" />
            )}
            {type.startsWith('video/') && (
              <video src={url} controls preload="metadata" className="max-h-80 w-full rounded border border-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Đổi loại ticket PL (Bug ↔ Task) ──────────────────────────────────────────

interface IssueTypeRef {
  id: string;
  name: string;
}

/** Chỉ mở cho cặp Bug ↔ Task; loại khác phải sửa thẳng trên Jira. */
const TYPE_PAIR: Record<string, string> = { bug: 'Task', task: 'Bug' };

/** Nút đổi loại gọn, đặt ngay trong phần chi tiết của từng PL ticket. */
const IssueTypeSwitch: React.FC<{ issueKey: string }> = ({ issueKey }) => {
  const [typeName, setTypeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    jiraAPI
      .searchIssues({ jql: `key = ${issueKey}`, maxResults: 1, fields: ['issuetype'] })
      .then((res) => {
        if (!alive) return;
        const found = (res.data.data as { issues?: any[] })?.issues?.[0];
        setTypeName(found?.fields?.issuetype?.name || '');
      })
      .catch((err: any) => alive && setError(err?.response?.data?.error || err?.message || 'Không đọc được loại ticket'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [issueKey]);

  const targetName = TYPE_PAIR[typeName.toLowerCase()];

  const switchType = async () => {
    if (!targetName) return;
    if (!window.confirm(`Đổi ${issueKey} từ "${typeName}" sang "${targetName}"?`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const typeRes = await jiraAPI.getProjectIssueTypes(issueKey.split('-')[0]);
      const target = ((typeRes.data.data as IssueTypeRef[]) || []).find((t) => t.name === targetName);
      if (!target) throw new Error(`Project không có issue type "${targetName}"`);
      await jiraAPI.setIssueType(issueKey, target.id);
      setMessage(`đã đổi ${typeName} → ${targetName}`);
      setTypeName(targetName);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Đổi loại thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <span className="text-xs text-gray-400">đang đọc loại ticket...</span>;

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-gray-500">
        Loại: <span className="font-medium text-gray-700">{typeName || '—'}</span>
      </span>
      {targetName ? (
        <button
          type="button"
          onClick={switchType}
          disabled={saving}
          className="rounded border border-gray-300 px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'đang đổi...' : `đổi sang ${targetName}`}
        </button>
      ) : (
        <span className="text-gray-400">(chỉ đổi được Bug ↔ Task)</span>
      )}
      {message && <span className="text-green-600">{message}</span>}
      {error && <span className="text-red-600">{error}</span>}
    </span>
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
/** Tiêu đề + nội dung SVK gom thành một khối dán được sang nơi khác. */
function buildTemplate(doc: SvkTicketDoc): string {
  const keys = doc.linkedPlKeys || [];
  const heading = `${keys.join(', ') || '(chưa có PL)'} x ${doc.key}`;
  const links = keys.map((key) => `${JIRA_BASE}/browse/${key}`).join('\n');
  const body = (doc.description || '').trim() || '(ticket không có nội dung)';
  return [heading, links, body].filter(Boolean).join('\n');
}

const CopyTemplateButton: React.FC<{ doc: SvkTicketDoc; className?: string }> = ({ doc, className }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(buildTemplate(doc));
      setState('copied');
    } catch {
      // clipboard bị chặn (http, quyền trình duyệt) — mở Detail rồi bôi đen copy tay
      setState('error');
    }
    setTimeout(() => setState('idle'), 1500);
  };

  return (
    <button
      onClick={copy}
      title="Copy template (PL x SVK + link + nội dung)"
      className={className || 'text-xs px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700'}
    >
      {state === 'copied' ? '✓ Copied' : state === 'error' ? '✗ Lỗi' : '⧉ Copy'}
    </button>
  );
};

const TemplateBlock: React.FC<{ doc: SvkTicketDoc }> = ({ doc }) => {
  const text = buildTemplate(doc);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CopyTemplateButton doc={doc} className="text-xs px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800" />
        <span className="text-[11px] text-gray-400">Dán thẳng sang Jira / chat</span>
      </div>
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap break-words text-gray-800 max-h-80 overflow-y-auto">
        {text}
      </pre>
    </div>
  );
};

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
          <Collapse title="📋 Template" defaultOpen>
            <TemplateBlock doc={doc} />
          </Collapse>

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

          <Collapse title={`📎 ${doc.key} — File đính kèm (${doc.attachments?.length || 0})`}>
            <AttachmentList items={doc.attachments} />
          </Collapse>

          {(doc.linkedPl || []).map((pl) => (
            <React.Fragment key={pl.key}>
              <div className="flex flex-wrap items-center gap-2 px-1 pt-2">
                <a
                  href={`${JIRA_BASE}/browse/${pl.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                >
                  {pl.key}
                </a>
                <IssueTypeSwitch issueKey={pl.key} />
              </div>
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
              <Collapse title={`📎 ${pl.key} — File đính kèm (${pl.attachments?.length || 0})`}>
                <AttachmentList items={pl.attachments} />
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

export interface SvkChatInfo {
  conversationId?: string;
  aiNote?: string;
  aiNoteAt?: string;
  aiNoteError?: string;
}

// dòng AI dưới note tay: câu trả lời cuối của hội thoại Chat AI gắn với SVK này
const AiChatLine: React.FC<{
  svkKey: string;
  chat?: SvkChatInfo;
  onOpened: (key: string, conversationId: string) => void;
}> = ({ svkKey, chat, onOpened }) => {
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href = chat?.conversationId ? `/ai-chat?c=${chat.conversationId}` : null;

  // chưa có hội thoại → tạo + hỏi lượt đầu rồi mới chuyển trang
  const openNew = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await supportAPI.openSvkChat(svkKey);
      onOpened(svkKey, res.data.conversationId);
      window.location.href = `/ai-chat?c=${res.data.conversationId}`;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi');
      setOpening(false);
    }
  };

  const link = href ? (
    <a href={href} className="text-purple-600 hover:underline whitespace-nowrap">💬 Chat tiếp</a>
  ) : (
    <button onClick={openNew} disabled={opening} className="text-purple-600 hover:underline whitespace-nowrap disabled:text-gray-400">
      {opening ? 'Đang hỏi AI...' : '💬 Hỏi AI'}
    </button>
  );

  return (
    <div className="mt-1 px-1.5 text-[11px] leading-4 border-t border-dashed border-purple-100 pt-1">
      {chat?.aiNote ? (
        <div
          onClick={() => setExpanded((v) => !v)}
          title={chat.aiNoteAt ? `AI · ${new Date(chat.aiNoteAt).toLocaleString('vi-VN')}` : 'AI'}
          className={`text-purple-900 whitespace-pre-wrap cursor-pointer ${expanded ? '' : 'line-clamp-3'}`}
        >
          🤖 {chat.aiNote}
        </div>
      ) : null}
      {chat?.aiNoteError && <div className="text-red-500 line-clamp-2" title={chat.aiNoteError}>⚠️ {chat.aiNoteError}</div>}
      {error && <div className="text-red-500">⚠️ {error}</div>}
      <div className="mt-0.5">{link}</div>
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
  const [chats, setChats] = useState<Record<string, SvkChatInfo>>({});

  const loadChats = () =>
    supportAPI.getSvkChats().then((res) => setChats(res.data || {})).catch(() => {});

  // notes reload with the tickets: a one-shot load that failed (backend restarting)
  // used to leave the column blank until a full page refresh
  const loadNotes = () =>
    supportAPI.getSvkNotes().then((res) => setNotes(res.data || {})).catch(() => {});

  const loadTickets = async () => {
    const res = await supportAPI.getSvkTickets();
    setRows(buildRows(res.data || []));
    void loadNotes();
    void loadChats();
  };

  const handleChatOpened = (key: string, conversationId: string) =>
    setChats((prev) => ({ ...prev, [key]: { ...prev[key], conversationId } }));

  useEffect(() => {
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

      <ScanRecipePanel />

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
        {aiJob && !aiJob.aiAvailable && (
          <span className="text-sm text-amber-700" title={aiJob.aiUnavailableReason}>
            🚫 AI không khả dụng — bỏ qua review
            {aiJob.skipped > 0 && ` (${aiJob.skipped} ticket)`}
            : {aiJob.aiUnavailableReason}
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
                  <th className="px-3 py-3 text-left w-[220px]">Note</th>
                  <th className="px-3 py-3 text-left w-[160px]">Ticket</th>
                  <th className="px-3 py-3 text-left w-[100px]">Ticket SVK</th>
                  <th className="px-3 py-3 text-left w-[100px]">PL Linked</th>
                  <th className="px-3 py-3 text-center w-[75px]">Ngày tuổi PL</th>
                  <th className="px-3 py-3 text-center w-[75px]">Ngày tuổi</th>
                  <th className="px-3 py-3 text-left w-[140px]">PL Assignee</th>
                  <th className="px-3 py-3 text-left w-[120px]">PL Sprint</th>
                  <th className="px-3 py-3 text-left w-[130px]">TT SVK</th>
                  <th className="px-3 py-3 text-left w-[140px]">TT PL</th>
                  <th className="px-3 py-3 text-center w-[150px]">Detail</th>
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
                      <td className="px-3 py-3 align-top">
                        <NoteCell
                          svkKey={doc.key}
                          value={notes[doc.key] || ''}
                          onChange={handleNoteChange}
                        />
                        <AiChatLine svkKey={doc.key} chat={chats[doc.key]} onOpened={handleChatOpened} />
                      </td>
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
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedKey(doc.key)}
                            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                          >
                            Detail
                          </button>
                          <CopyTemplateButton doc={doc} />
                        </div>
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
  const [chats, setChats] = useState<Record<string, SvkChatInfo>>({});

  const handleChatOpened = (key: string, conversationId: string) =>
    setChats((prev) => ({ ...prev, [key]: { ...prev[key], conversationId } }));

  useEffect(() => {
    supportAPI.getSvkNotes().then((res) => setNotes(res.data || {})).catch(() => {});
    supportAPI.getSvkChats().then((res) => setChats(res.data || {})).catch(() => {});
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
                  <th className="px-3 py-3 text-center w-[150px]">Detail</th>
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
                      <AiChatLine svkKey={doc.key} chat={chats[doc.key]} onOpened={handleChatOpened} />
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedKey(doc.key)}
                          className="text-xs px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                        >
                          Detail
                        </button>
                        <CopyTemplateButton doc={doc} />
                      </div>
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
type Tab = 'svk' | 'history';

const Support: React.FC = () => {
  const [tab, setTab] = useState<Tab>('svk');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Support Tickets</h1>

      {/* sub-menu */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['svk', 'SVK Tickets'], ['history', 'Lịch sử SVK']] as [Tab, string][]).map(([key, label]) => (
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

      {tab === 'svk' ? <SVKTicketsTab /> : <SvkHistoryTab />}
    </div>
  );
};

export default Support;
