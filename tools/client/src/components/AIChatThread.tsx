import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Markdown from '@/components/Markdown';
import { aiChatAPI, jiraAPI, TICKET_NOTE_CHANGED_EVENT, type AIConversation } from '@/utils/api';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';
const TICKET_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export const CHAT_PRESETS: Array<{ key: string; label: string }> = [
  { key: 'analyze', label: 'Phân tích BRD' },
  { key: 'gaps', label: 'Tìm gap' },
  { key: 'acceptance', label: 'Acceptance criteria' },
  { key: 'risks', label: 'Rủi ro' },
];

const CHAT_PRESET_LABELS: Record<string, string> = Object.fromEntries(
  CHAT_PRESETS.map((preset) => [preset.key, preset.label])
);

interface TicketInfo {
  key: string;
  summary: string;
  type: string;
  status: string;
}

const toTicketInfo = (issue: any): TicketInfo => ({
  key: issue.key,
  summary: issue.fields?.summary || '',
  type: issue.fields?.issuetype?.name || '',
  status: issue.fields?.normalizedStatusName || issue.fields?.status?.name || '',
});

const searchTickets = async (jql: string, maxResults = 8): Promise<TicketInfo[]> => {
  const res = await jiraAPI.searchIssues({ jql, maxResults, fields: ['summary', 'status', 'issuetype'] });
  return ((res.data.data as { issues?: any[] })?.issues || []).map(toTicketInfo);
};

/** Ô tìm ticket: gõ key (PL-123) hoặc từ khoá trong summary, mọi project. */
function TicketPicker({ exclude, onPick }: { exclude: string[]; onPick: (ticket: TicketInfo) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const upper = q.toUpperCase();
        const escaped = q.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const found = TICKET_KEY_RE.test(upper)
          ? await searchTickets(`key = ${upper}`, 1)
          : await searchTickets(`summary ~ "${escaped}*" ORDER BY updated DESC`);
        if (alive) setResults(found);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const pick = (ticket: TicketInfo) => {
    onPick(ticket);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const visible = results.filter((t) => !exclude.includes(t.key));

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && visible[0]) {
            event.preventDefault();
            pick(visible[0]);
          }
        }}
        placeholder="+ Đính kèm ticket (PL-123, PR-2057… hoặc từ khoá)"
        className="w-64 rounded border border-dashed border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-96 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
          {loading ? (
            <p className="px-3 py-2 text-xs text-gray-400">Đang tìm...</p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">Không thấy ticket nào</p>
          ) : (
            visible.map((ticket) => (
              <button
                key={ticket.key}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(ticket)}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50"
              >
                <span className="shrink-0 font-mono font-semibold text-blue-600">{ticket.key}</span>
                <span className="truncate text-gray-700">{ticket.summary}</span>
                <span className="ml-auto shrink-0 text-[10px] text-gray-400">{ticket.status}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface AIChatThreadProps {
  conversationId: string;
  /** báo cho danh sách bên ngoài khi tiêu đề / ticket / tin nhắn đổi */
  onChanged?: (conversation: AIConversation) => void;
  /** ticket không cho gỡ (vd đang mở từ panel của chính ticket đó) */
  lockedTicketKey?: string;
}

/** Một hội thoại: ticket đính kèm, preset, tin nhắn và ô gửi. */
const AIChatThread: React.FC<AIChatThreadProps> = ({ conversationId, onChanged, lockedTicketKey }) => {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [tickets, setTickets] = useState<Record<string, TicketInfo>>({});
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  /** Tin vừa gửi, hiện tạm cuối khung trong lúc chờ AI trả lời. */
  const [pending, setPending] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const apply = useCallback((next: AIConversation) => {
    setConversation(next);
    onChangedRef.current?.(next);
  }, []);

  useEffect(() => {
    let alive = true;
    setConversation(null);
    aiChatAPI
      .get(conversationId)
      .then((res) => alive && setConversation(res.data.data))
      .catch((error) => toast.error(error?.response?.data?.error || 'Không tải được hội thoại'));
    return () => {
      alive = false;
    };
  }, [conversationId]);

  // thông tin ticket đính kèm (summary/status) cho chip
  const ticketSig = (conversation?.ticketKeys || []).join(',');
  useEffect(() => {
    const missing = (conversation?.ticketKeys || []).filter((key) => !tickets[key]);
    if (!missing.length) return;
    searchTickets(`key IN (${missing.join(',')})`, missing.length)
      .then((found) => setTickets((prev) => ({ ...prev, ...Object.fromEntries(found.map((t) => [t.key, t])) })))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketSig]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation?.messages.length, sending, pending]);

  if (!conversation) return <p className="p-6 text-center text-sm text-gray-400">Đang tải hội thoại...</p>;

  const setTicketKeys = async (ticketKeys: string[]) => {
    try {
      const res = await aiChatAPI.update(conversation._id, { ticketKeys });
      apply(res.data.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không cập nhật được ticket');
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    const title = titleDraft.trim();
    if (title === conversation.title) return;
    try {
      const res = await aiChatAPI.update(conversation._id, { title });
      apply(res.data.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không đổi được tiêu đề');
    }
  };

  const send = async (body: { message?: string; preset?: string }) => {
    // hiện ngay tin của mình rồi mới gọi API — khỏi phải chờ AI trả lời mới thấy
    const echoed = body.preset ? CHAT_PRESET_LABELS[body.preset] || body.preset : String(body.message || '').trim();
    setPending(echoed);
    setDraft('');
    setSending(true);
    try {
      const res = await aiChatAPI.send(conversation._id, body);
      apply(res.data.data);
      // AI vừa ghi note hộ → báo overlay ticket tải lại note
      const reply: string = res.data.data.messages?.[res.data.data.messages.length - 1]?.content || '';
      const noted = Array.from(reply.matchAll(/📝 Đã ghi note vào ([A-Z][A-Z0-9]+-\d+)/g)).map((m) => m[1]);
      if (noted.length) {
        toast.success(`Đã ghi note vào ${noted.join(', ')}`);
        noted.forEach((key) => window.dispatchEvent(new CustomEvent(TICKET_NOTE_CHANGED_EVENT, { detail: key })));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'AI lỗi');
      // gửi hỏng thì trả chữ về ô nhập để không mất công gõ lại
      if (!body.preset) setDraft((current) => current || echoed);
    } finally {
      setPending('');
      setSending(false);
    }
  };

  const clear = async () => {
    if (!window.confirm('Xoá toàn bộ tin nhắn của hội thoại này?')) return;
    const res = await aiChatAPI.clear(conversation._id);
    apply(res.data.data);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-gray-200 px-4 py-3">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveTitle();
              if (event.key === 'Escape') setEditingTitle(false);
            }}
            className="w-full rounded border border-blue-400 px-2 py-1 text-sm font-semibold focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(conversation.title);
              setEditingTitle(true);
            }}
            title="Bấm để đổi tiêu đề"
            className="block max-w-full truncate text-left text-sm font-bold text-gray-900 hover:text-blue-700"
          >
            {conversation.title || 'Hội thoại mới'}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {conversation.ticketKeys.map((key) => {
            const info = tickets[key];
            return (
              <span
                key={key}
                title={info ? `${info.type} · ${info.status}\n${info.summary}` : key}
                className="inline-flex max-w-[260px] items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs"
              >
                <a
                  href={`${JIRA_BASE}/browse/${key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-mono font-semibold text-blue-700 hover:underline"
                >
                  {key}
                </a>
                {info && <span className="truncate text-gray-600">{info.summary}</span>}
                {key !== lockedTicketKey && (
                  <button
                    type="button"
                    onClick={() => setTicketKeys(conversation.ticketKeys.filter((k) => k !== key))}
                    title="Gỡ ticket khỏi hội thoại"
                    className="shrink-0 text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
          <TicketPicker
            exclude={conversation.ticketKeys}
            onPick={(ticket) => {
              setTickets((prev) => ({ ...prev, [ticket.key]: ticket }));
              setTicketKeys([...conversation.ticketKeys, ticket.key]);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CHAT_PRESETS.map((preset) => (
            <button
              key={preset.key}
              disabled={sending}
              onClick={() => send({ preset: preset.key })}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
          {conversation.messages.length > 0 && (
            <button onClick={clear} className="ml-auto rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
              Xoá tin nhắn
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.length === 0 && !pending ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Chưa có tin nhắn. Hỏi gì đó hoặc bấm một preset ở trên.
            {conversation.ticketKeys.length === 0 && ' Đính kèm ticket để AI đọc mô tả + BRD của ticket.'}
          </p>
        ) : (
          conversation.messages.map((message, index) => (
            message.role === 'user' ? (
              <div
                key={`${message.createdAt}-${index}`}
                className="ml-8 whitespace-pre-wrap rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900"
              >
                {message.content}
              </div>
            ) : (
              <div key={`${message.createdAt}-${index}`} className="mr-8 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <Markdown text={message.content} />
              </div>
            )
          ))
        )}
        {pending && (
          <div className="ml-8 whitespace-pre-wrap rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 opacity-70">
            {pending}
          </div>
        )}
        {sending && <p className="text-center text-xs text-gray-400">AI đang trả lời...</p>}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && draft.trim() && !sending) {
                send({ message: draft });
              }
            }}
            rows={2}
            placeholder="Hỏi về ticket/BRD, hoặc nhờ “note lại vào PL-123: …” (⌘/Ctrl + Enter để gửi)"
            className="flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => draft.trim() && send({ message: draft })}
            disabled={sending || !draft.trim()}
            className="rounded bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatThread;
