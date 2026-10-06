import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AIChatThread from '@/components/AIChatThread';
import {
  aiChatAPI,
  ticketAIAPI,
  type AIConversation,
  type AIConversationSummary,
  type BrdDoc,
  type BrdLinkCandidate,
} from '@/utils/api';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface TicketAIPanelProps {
  ideaKey: string;
  summary: string;
  onClose: () => void;
}

const TicketAIPanel: React.FC<TicketAIPanelProps> = ({ ideaKey, summary, onClose }) => {
  const [tab, setTab] = useState<'brd' | 'chat'>('brd');
  /** hội thoại có đính kèm ticket này */
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  const [brds, setBrds] = useState<BrdDoc[]>([]);
  const [links, setLinks] = useState<BrdLinkCandidate[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksScannedAt, setLinksScannedAt] = useState<string | null>(null);
  /** url đang được Word mở + xuất PDF. */
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBrds = useCallback(async () => {
    const res = await ticketAIAPI.listBrd(ideaKey);
    setBrds(res.data.data || []);
  }, [ideaKey]);

  const loadConversations = useCallback(async () => {
    const res = await aiChatAPI.list(ideaKey);
    setConversations(res.data.data || []);
  }, [ideaKey]);

  useEffect(() => {
    loadConversations().catch(() => setConversations([]));
    loadBrds().catch(() => setBrds([]));
    // link đã quét lần trước được lưu theo ticket
    ticketAIAPI
      .getBrdLinks(ideaKey)
      .then((res) => {
        setLinks(res.data.data || []);
        setLinksScannedAt(res.data.scannedAt || null);
      })
      .catch(() => setLinks([]));
  }, [ideaKey, loadBrds, loadConversations]);

  const loadLinks = async () => {
    setLinksLoading(true);
    try {
      const res = await ticketAIAPI.getBrdLinks(ideaKey, true);
      setLinks(res.data.data || []);
      setLinksScannedAt(res.data.scannedAt || null);
      if ((res.data.data || []).length === 0) toast('Không thấy link nào trong ticket');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không quét được link');
    } finally {
      setLinksLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      const res = await aiChatAPI.create({ ticketKeys: [ideaKey] });
      await loadConversations();
      setOpenConversationId(res.data.data._id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không tạo được hội thoại');
    }
  };

  const handleConversationChanged = useCallback(
    (next: AIConversation) => {
      // gỡ ticket này khỏi hội thoại → hội thoại không còn thuộc ticket, quay về danh sách
      if (!next.ticketKeys.includes(ideaKey.toUpperCase())) setOpenConversationId(null);
      loadConversations().catch(() => undefined);
    },
    [ideaKey, loadConversations]
  );

  const handleUpload = async (file: File, sourceUrl?: string) => {
    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await ticketAIAPI.uploadBrd(ideaKey, { filename: file.name, contentBase64, sourceUrl });
      await loadBrds();
      toast.success(`Đã lưu ${file.name}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Lưu BRD thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleImportFromUrl = async (url: string) => {
    setImportingUrl(url);
    try {
      const res = await ticketAIAPI.importBrdFromUrl(ideaKey, url);
      await loadBrds();
      toast.success(`Đã lưu ${res.data.data?.filename || 'BRD'}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Word không mở được link');
    } finally {
      setImportingUrl(null);
    }
  };

  const handleDeleteBrd = async (brd: BrdDoc) => {
    try {
      await ticketAIAPI.deleteBrd(ideaKey, brd._id);
      await loadBrds();
      toast.success(`Đã xoá ${brd.filename}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Xoá thất bại');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{ideaKey}</h2>
            <p className="truncate text-sm text-gray-500">{summary}</p>
          </div>
          <button onClick={onClose} className="ml-3 text-2xl leading-none text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 px-4 pt-2">
          {(['brd', 'chat'] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                if (item === 'chat') setOpenConversationId(null);
              }}
              className={`rounded-t px-4 py-2 text-sm font-semibold ${
                tab === item ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item === 'chat' ? `Chat AI (${conversations.length})` : `BRD (${brds.length})`}
            </button>
          ))}
        </div>

        {tab === 'chat' ? (
          openConversationId ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-1.5 text-xs">
                <button onClick={() => setOpenConversationId(null)} className="text-gray-500 hover:text-blue-700">
                  ← Danh sách hội thoại
                </button>
                <Link href={`/ai-chat?c=${openConversationId}`} className="text-blue-600 hover:underline">
                  Mở ở trang Chat AI ↗
                </Link>
              </div>
              <div className="min-h-0 flex-1">
                <AIChatThread
                  key={openConversationId}
                  conversationId={openConversationId}
                  lockedTicketKey={ideaKey.toUpperCase()}
                  onChanged={handleConversationChanged}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Hội thoại có đính kèm {ideaKey}</h3>
                <button
                  onClick={startConversation}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  + Hội thoại mới
                </button>
              </div>
              {conversations.length === 0 ? (
                <p className="rounded bg-slate-50 p-3 text-sm text-gray-500">
                  Chưa có hội thoại nào đính kèm ticket này. Bấm &quot;+ Hội thoại mới&quot; — AI sẽ đọc mô tả ticket + BRD
                  {brds.length === 0 && ' (nhớ import BRD ở tab BRD trước)'}.
                </p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => setOpenConversationId(conversation._id)}
                    className="block w-full rounded border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40"
                  >
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-sm font-semibold text-gray-800">{conversation.title || 'Hội thoại mới'}</p>
                      <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                        {new Date(conversation.updatedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-blue-600">{conversation.ticketKeys.join(' · ')}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {conversation.lastMessage || 'Chưa có tin nhắn'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{conversation.messageCount} tin nhắn</p>
                  </button>
                ))
              )}
            </div>
          )
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">BRD đã lưu</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Đang xử lý...' : '+ Thêm file'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.md"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file);
                    event.target.value = '';
                  }}
                />
              </div>

              {brds.length === 0 ? (
                <p className="rounded bg-slate-50 p-3 text-sm text-gray-500">
                  Chưa có BRD. Bấm &quot;Mở bằng Word &amp; lưu&quot; ở link bên dưới, hoặc thêm file .docx/.pdf từ máy —
                  Word xuất PDF đúng layout, text trích ra làm context cho AI.
                </p>
              ) : (
                <ul className="space-y-2">
                  {brds.map((brd) => (
                    <li key={brd._id} className="rounded border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">{brd.filename}</p>
                          <p className="text-xs text-gray-500">
                            {formatSize(brd.pdfSize)} · {brd.text.length.toLocaleString()} ký tự ·{' '}
                            {new Date(brd.importedAt).toLocaleString('vi-VN')}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              brd.converter === 'word'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {brd.converter === 'word'
                              ? 'PDF từ Word (đúng layout)'
                              : brd.converter === 'pdf'
                              ? 'PDF gốc'
                              : 'PDF text-only'}
                          </span>
                          {brd.sourceUrl && (
                            <a
                              href={brd.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-xs text-blue-600 hover:text-blue-800"
                            >
                              {brd.sourceUrl}
                            </a>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <a
                            href={ticketAIAPI.brdPdfUrl(ideaKey, brd._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            PDF
                          </a>
                          <button
                            onClick={() => handleDeleteBrd(brd)}
                            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">
                  Link tìm thấy trong ticket
                  {linksScannedAt && (
                    <span className="ml-2 text-[11px] font-normal text-gray-400">
                      quét lúc {new Date(linksScannedAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </h3>
                <button
                  onClick={loadLinks}
                  disabled={linksLoading}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {linksLoading ? 'Đang quét...' : linksScannedAt ? 'Quét lại' : 'Quét link'}
                </button>
              </div>

              {links.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Bấm &quot;Quét link&quot; để tìm link BRD trong mô tả và comment của {ideaKey}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {links.map((link) => {
                    const imported = brds.find((brd) => brd.sourceUrl === link.url);
                    const isImporting = importingUrl === link.url;
                    return (
                    <li key={link.url} className="rounded border border-gray-200 p-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block break-all text-xs text-blue-600 hover:text-blue-800"
                      >
                        {link.url}
                      </a>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {link.likelyBrd ? '📄 nhiều khả năng là tài liệu' : 'link thường'} ·{' '}
                        {link.source === 'comment' ? `comment của ${link.author}` : 'mô tả ticket'}
                        {imported && (
                          <span className="ml-1 font-semibold text-emerald-600">
                            · ✅ đã lưu {new Date(imported.importedAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </p>
                      {link.likelyBrd && (
                        <button
                          onClick={() => handleImportFromUrl(link.url)}
                          disabled={Boolean(importingUrl)}
                          className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isImporting
                            ? 'Word đang mở & xuất PDF...'
                            : imported
                            ? '↻ Lấy lại bản mới bằng Word'
                            : '📄 Mở bằng Word & lưu'}
                        </button>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 rounded bg-amber-50 p-2 text-[11px] text-amber-800">
                &quot;Mở bằng Word &amp; lưu&quot; dùng Word trên máy chạy backend (đã đăng nhập Office) để mở link,
                xuất PDF rồi lưu theo ticket — mất khoảng 10–30 giây. Lần đầu macOS có thể hỏi quyền điều khiển Word: chọn
                Allow. Nếu Word không mở được, tải file về máy rồi bấm &quot;+ Thêm file&quot;.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketAIPanel;
