import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
import AIChatThread from '@/components/AIChatThread';
import { aiChatAPI, type AIConversation, type AIConversationSummary } from '@/utils/api';

const timeLabel = (value: string) => {
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/** Chat AI: danh sách hội thoại bên trái, hội thoại đang mở bên phải. ?c=<id> mở sẵn, ?ticket=<KEY> tạo mới kèm ticket. */
export default function AIChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const selectedId = typeof router.query.c === 'string' ? router.query.c : '';

  const select = useCallback(
    (id: string) => router.replace({ pathname: '/ai-chat', query: id ? { c: id } : {} }, undefined, { shallow: true }),
    [router]
  );

  const load = useCallback(async () => {
    try {
      const res = await aiChatAPI.list();
      setConversations(res.data.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không tải được danh sách hội thoại');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createNew = useCallback(
    async (ticketKeys: string[] = []) => {
      try {
        const res = await aiChatAPI.create({ ticketKeys });
        await load();
        select(res.data.data._id);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Không tạo được hội thoại');
      }
    },
    [load, select]
  );

  // mở từ chỗ khác với ?ticket=PL-123 → tạo hội thoại mới đính kèm ticket đó
  const ticketParamHandled = useRef(false);
  useEffect(() => {
    if (!router.isReady || typeof router.query.ticket !== 'string' || ticketParamHandled.current) return;
    ticketParamHandled.current = true;
    createNew([router.query.ticket.toUpperCase()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const handleChanged = useCallback((next: AIConversation) => {
    setConversations((prev) => {
      const rest = prev.filter((c) => c._id !== next._id);
      const last = next.messages[next.messages.length - 1];
      const summary: AIConversationSummary = {
        _id: next._id,
        title: next.title,
        ticketKeys: next.ticketKeys,
        messageCount: next.messages.length,
        lastMessage: last ? last.content.slice(0, 160) : '',
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
      };
      return [summary, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }, []);

  const remove = async (conversation: AIConversationSummary) => {
    if (!window.confirm(`Xoá hội thoại "${conversation.title || 'Hội thoại mới'}"?`)) return;
    try {
      await aiChatAPI.remove(conversation._id);
      setConversations((prev) => prev.filter((c) => c._id !== conversation._id));
      if (selectedId === conversation._id) select('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Xoá thất bại');
    }
  };

  const q = filter.trim().toLowerCase();
  const visible = q
    ? conversations.filter(
        (c) => c.title.toLowerCase().includes(q) || c.ticketKeys.some((key) => key.toLowerCase().includes(q))
      )
    : conversations;

  return (
    <div className="-m-8 flex h-screen">
      <Toaster position="top-right" />

      <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="space-y-2 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">💬 Chat AI</h1>
            <button
              onClick={() => createNew()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + Hội thoại mới
            </button>
          </div>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Lọc theo tiêu đề hoặc ticket..."
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-center text-xs text-gray-400">Đang tải...</p>
          ) : visible.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-400">
              {conversations.length ? 'Không có hội thoại khớp' : 'Chưa có hội thoại nào'}
            </p>
          ) : (
            visible.map((conversation) => {
              const active = conversation._id === selectedId;
              return (
                <div
                  key={conversation._id}
                  onClick={() => select(conversation._id)}
                  className={`group cursor-pointer border-b border-gray-100 px-4 py-2.5 ${
                    active ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <p className={`truncate text-sm ${active ? 'font-bold text-blue-800' : 'font-semibold text-gray-800'}`}>
                      {conversation.title || 'Hội thoại mới'}
                    </p>
                    <span className="ml-auto shrink-0 text-[10px] text-gray-400">{timeLabel(conversation.updatedAt)}</span>
                  </div>
                  {conversation.ticketKeys.length > 0 && (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-blue-600">{conversation.ticketKeys.join(' · ')}</p>
                  )}
                  <div className="mt-0.5 flex items-start gap-2">
                    <p className="line-clamp-1 flex-1 text-xs text-gray-500">
                      {conversation.lastMessage || `${conversation.messageCount} tin nhắn`}
                    </p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(conversation);
                      }}
                      title="Xoá hội thoại"
                      className="hidden shrink-0 text-xs text-gray-400 hover:text-red-500 group-hover:block"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 bg-white">
        {selectedId ? (
          <AIChatThread key={selectedId} conversationId={selectedId} onChanged={handleChanged} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <p>Chọn một hội thoại bên trái, hoặc tạo hội thoại mới.</p>
            <p className="text-xs">Đính kèm được mọi loại ticket: PR, PL, PLO, DOP, PKA… — AI đọc mô tả + BRD của ticket.</p>
          </div>
        )}
      </section>
    </div>
  );
}
