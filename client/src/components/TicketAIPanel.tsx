import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ticketAIAPI,
  type BrdDoc,
  type BrdLinkCandidate,
  type TicketChatMessage,
} from '@/utils/api';

const PRESETS: Array<{ key: string; label: string }> = [
  { key: 'analyze', label: 'Phân tích BRD' },
  { key: 'gaps', label: 'Tìm gap' },
  { key: 'acceptance', label: 'Acceptance criteria' },
  { key: 'risks', label: 'Rủi ro' },
];

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
  const [tab, setTab] = useState<'chat' | 'brd'>('chat');
  const [messages, setMessages] = useState<TicketChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [brds, setBrds] = useState<BrdDoc[]>([]);
  const [links, setLinks] = useState<BrdLinkCandidate[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadBrds = useCallback(async () => {
    const res = await ticketAIAPI.listBrd(ideaKey);
    setBrds(res.data.data || []);
  }, [ideaKey]);

  useEffect(() => {
    ticketAIAPI
      .getChat(ideaKey)
      .then((res) => setMessages(res.data.data || []))
      .catch(() => setMessages([]));
    loadBrds().catch(() => setBrds([]));
  }, [ideaKey, loadBrds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, tab]);

  const loadLinks = async () => {
    setLinksLoading(true);
    try {
      const res = await ticketAIAPI.getBrdLinks(ideaKey);
      setLinks(res.data.data || []);
      if ((res.data.data || []).length === 0) toast('Không thấy link nào trong ticket');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Không quét được link');
    } finally {
      setLinksLoading(false);
    }
  };

  const send = async (body: { message?: string; preset?: string }) => {
    setSending(true);
    try {
      const res = await ticketAIAPI.sendChat(ideaKey, body);
      setMessages(res.data.data || []);
      setDraft('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'AI lỗi');
    } finally {
      setSending(false);
    }
  };

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

  const handleDeleteBrd = async (brd: BrdDoc) => {
    try {
      await ticketAIAPI.deleteBrd(ideaKey, brd._id);
      await loadBrds();
      toast.success(`Đã xoá ${brd.filename}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Xoá thất bại');
    }
  };

  const handleReset = async () => {
    await ticketAIAPI.resetChat(ideaKey);
    setMessages([]);
    toast.success('Đã xoá lịch sử chat');
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
          {(['chat', 'brd'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-t px-4 py-2 text-sm font-semibold ${
                tab === item ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item === 'chat' ? 'Chat AI' : `BRD (${brds.length})`}
            </button>
          ))}
        </div>

        {tab === 'chat' ? (
          <>
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  disabled={sending}
                  onClick={() => send({ preset: preset.key })}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="ml-auto rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Xoá lịch sử
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Chưa có hội thoại. Hỏi gì đó hoặc bấm một preset ở trên.
                  {brds.length === 0 && ' Nhớ import BRD ở tab bên cạnh để AI có dữ liệu.'}
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'ml-8 bg-blue-50 text-blue-900'
                        : 'mr-8 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
              {sending && <p className="text-center text-xs text-gray-400">AI đang trả lời...</p>}
            </div>

            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && draft.trim()) {
                      send({ message: draft });
                    }
                  }}
                  rows={2}
                  placeholder="Hỏi về ticket hoặc BRD... (⌘/Ctrl + Enter để gửi)"
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
          </>
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
                  Chưa có BRD. Tải file .docx/.pdf về máy rồi thêm vào đây — file .docx được Word chuyển sang PDF đúng
                  layout, text trích ra làm context cho AI.
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
                <h3 className="text-sm font-bold text-gray-700">Link tìm thấy trong ticket</h3>
                <button
                  onClick={loadLinks}
                  disabled={linksLoading}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {linksLoading ? 'Đang quét...' : 'Quét link'}
                </button>
              </div>

              {links.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Bấm &quot;Quét link&quot; để tìm link BRD trong mô tả và comment của {ideaKey}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {links.map((link) => (
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
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 rounded bg-amber-50 p-2 text-[11px] text-amber-800">
                File trên SharePoint/OneDrive cần đăng nhập nên tool không tải thẳng được. Mở link, tải về máy, rồi bấm
                &quot;+ Thêm file&quot;.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketAIPanel;
