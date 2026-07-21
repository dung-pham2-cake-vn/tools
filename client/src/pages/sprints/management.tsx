import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { sprintManagementAPI } from '@/utils/api';
import { sprintPageLabel } from '@/components/SprintManagementAnalysis';
import type { CachedSprintTicket, LoadedPage } from '@/components/SprintManagementAnalysis';

interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  loaded: boolean;
  loadedAt: string | null;
}

interface PageContentModal {
  title: string;
  textContent: string;
}

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

function statusBadgeCls(status: string) {
  const s = status.toUpperCase().replace(/\s+/g, ' ').trim();
  if (['OPEN', 'DRAFT'].includes(s)) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (['IN CODING', 'IN PROGRESS', 'READY4TEST', 'IN TESTING', 'TEST FAILED'].includes(s)) return 'bg-blue-50 text-blue-800 border-blue-200';
  if (['PO/TM REVIEW', 'READY4RELEASE', 'RELEASED', 'WILL NOT DO', 'REQUEST BOT TO DELETE', 'DONE'].includes(s)) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

export default function SprintManagementPage() {
  const [confluencePages, setConfluencePages] = useState<ConfluencePage[]>([]);
  const [loadedPages, setLoadedPages] = useState<LoadedPage[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPageIds, setLoadingPageIds] = useState<Set<string>>(new Set());
  const [unlinkingPageIds, setUnlinkingPageIds] = useState<Set<string>>(new Set());
  const [contentModal, setContentModal] = useState<PageContentModal | null>(null);
  const [loadingModalId, setLoadingModalId] = useState<string | null>(null);

  // Ticket search
  const [searchQuery, setSearchQuery] = useState('');
  const [allTickets, setAllTickets] = useState<Record<string, CachedSprintTicket>>({});
  const [loadingTickets, setLoadingTickets] = useState(false);
  const searchFetched = useRef(false);

  const fetchAllTickets = useCallback(async () => {
    if (searchFetched.current) return;
    searchFetched.current = true;
    setLoadingTickets(true);
    try {
      const res = await sprintManagementAPI.getAllTickets();
      setAllTickets(res.data.data || {});
    } catch {
      // non-critical
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const searchResults: CachedSprintTicket[] = q.length < 2
    ? []
    : Object.values(allTickets).filter(
        (t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
      ).slice(0, 100);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const refreshLoadedPages = useCallback(async (): Promise<LoadedPage[]> => {
    try {
      const res = await sprintManagementAPI.getLoadedPages();
      const list: LoadedPage[] = res.data.data || [];
      setLoadedPages(list);
      window.dispatchEvent(new Event('sprint-loaded-pages-changed'));
      return list;
    } catch {
      setLoadedPages([]);
      return [];
    }
  }, []);

  const loadConfluenceChildren = useCallback(async () => {
    setLoadingList(true);
    try {
      const [pagesRes, loadedList] = await Promise.all([
        sprintManagementAPI.getConfluenceChildren(),
        refreshLoadedPages(),
      ]);
      const loadedIds = new Set(loadedList.map((p) => p.pageId));
      const pages: ConfluencePage[] = (pagesRes.data.data || []).map((p: ConfluencePage) => ({
        ...p,
        loaded: p.loaded || loadedIds.has(p.id),
      }));
      setConfluencePages(pages);
    } catch (err: any) {
      toast.error(`Không tải được danh sách: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingList(false);
    }
  }, [refreshLoadedPages]);

  useEffect(() => {
    loadConfluenceChildren();
  }, [loadConfluenceChildren]);

  const handleLoadPage = async (pageId: string) => {
    setLoadingPageIds((prev) => new Set(prev).add(pageId));
    try {
      await sprintManagementAPI.loadPage(pageId);
      toast.success('Đã link thành công');
      const newLoadedPages = await refreshLoadedPages();
      const loadedMap = new Map(newLoadedPages.map((p) => [p.pageId, p]));
      setConfluencePages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? { ...p, loaded: true, loadedAt: loadedMap.get(pageId)?.loadedAt || new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      toast.error(`Link thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingPageIds((prev) => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  };

  const handleUnlinkPage = async (pageId: string) => {
    setUnlinkingPageIds((prev) => new Set(prev).add(pageId));
    try {
      await sprintManagementAPI.unlinkPage(pageId);
      toast.success('Đã unlink');
      await refreshLoadedPages();
      setConfluencePages((prev) =>
        prev.map((p) => p.id === pageId ? { ...p, loaded: false, loadedAt: null } : p)
      );
    } catch (err: any) {
      toast.error(`Unlink thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setUnlinkingPageIds((prev) => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  };

  const handleOpenContent = async (pageId: string, title: string) => {
    setLoadingModalId(pageId);
    try {
      const res = await sprintManagementAPI.getPageContent(pageId);
      setContentModal({ title, textContent: res.data.data.textContent });
    } catch (err: any) {
      toast.error(`Không mở được: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingModalId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sprint Management</h1>
        <p className="mt-1 text-sm text-gray-500">Chọn Confluence page để load và mở từng Sprint đã load từ menu con.</p>
      </div>

      {/* Ticket search */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Tìm kiếm ticket đã load</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={fetchAllTickets}
            placeholder="Nhập ticket ID hoặc tên ticket (ít nhất 2 ký tự)..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
          {loadingTickets && (
            <p className="text-xs text-gray-400">Đang tải danh sách ticket...</p>
          )}
          {q.length >= 2 && !loadingTickets && (
            <div>
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Không tìm thấy ticket nào.</p>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket ID</th>
                          <th className="text-left px-3 py-2 font-semibold">Tên Ticket</th>
                          <th className="text-left px-3 py-2 font-semibold w-[100px]">Loại</th>
                          <th className="text-left px-3 py-2 font-semibold w-[140px]">Trạng thái</th>
                          <th className="text-left px-3 py-2 font-semibold w-[160px]">Assignee</th>
                          <th className="text-left px-3 py-2 font-semibold w-[50px]">SP</th>
                          <th className="text-left px-3 py-2 font-semibold w-[150px]">Fix Version</th>
                          <th className="text-left px-3 py-2 font-semibold w-[100px]">Parent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((t) => (
                          <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2">
                              <a
                                href={`${JIRA_BASE}/browse/${t.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold hover:underline"
                              >
                                {t.id}
                              </a>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">{t.name || '-'}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{t.type || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadgeCls(t.status || '')}`}>
                                {t.status || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-700">{t.assignee || 'Unassigned'}</td>
                            <td className="px-3 py-2 text-xs text-gray-500 text-center">{t.storyPoints || '-'}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{t.fixVersions?.join(', ') || '-'}</td>
                            <td className="px-3 py-2">
                              {t.parentId ? (
                                <a
                                  href={`${JIRA_BASE}/browse/${t.parentId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 font-mono text-xs hover:underline"
                                >
                                  {t.parentId}
                                </a>
                              ) : <span className="text-gray-400 text-xs">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {searchResults.length === 100 && (
                    <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">Hiển thị 100 kết quả đầu. Nhập thêm để thu hẹp.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Confluence Pages</h2>
          <button
            onClick={loadConfluenceChildren}
            disabled={loadingList}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <span className={loadingList ? 'animate-spin inline-block' : ''}>↻</span>
            Reload list
          </button>
        </div>

        <div className="px-6 py-4">
          {loadingList ? (
            <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : confluencePages.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Không có trang. Nhấn Reload list.</div>
          ) : (
            <div className="space-y-1.5">
              {confluencePages.map((page) => {
                const isLoading = loadingPageIds.has(page.id);
                return (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base flex-shrink-0">{page.loaded ? '✅' : '⬜'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{page.title}</p>
                      {page.loaded && page.loadedAt && (
                        <p className="text-xs text-gray-400">Loaded {formatDate(page.loadedAt)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {page.loaded ? (
                        <>
                          <button
                            onClick={() => handleLoadPage(page.id)}
                            disabled={isLoading}
                            title="Reload nội dung từ Confluence"
                            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            {isLoading ? '⏳' : '↺'}
                          </button>
                          <button
                            onClick={() => handleOpenContent(page.id, page.title)}
                            disabled={loadingModalId === page.id}
                            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            {loadingModalId === page.id ? '⏳' : '🔍'}
                          </button>
                          <button
                            onClick={() => handleUnlinkPage(page.id)}
                            disabled={unlinkingPageIds.has(page.id)}
                            className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {unlinkingPageIds.has(page.id) ? '⏳' : 'Unlink'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLoadPage(page.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? '⏳' : 'Link'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Pages đã load</h2>
        </div>

        <div className="px-6 py-4">
          {loadedPages.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Chưa có page nào được load.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {loadedPages.map((page) => (
                <Link
                  key={page.pageId}
                  href={`/sprints/management/${page.pageId}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <p className="font-semibold text-blue-700">{sprintPageLabel(page.title)}</p>
                  <p className="mt-1 text-xs text-gray-500 truncate">{page.title}</p>
                  <p className="mt-2 text-xs text-gray-400">Loaded {formatDate(page.loadedAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {contentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900 text-sm truncate pr-4">{contentModal.title}</h3>
              <button
                onClick={() => setContentModal(null)}
                className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">
                {contentModal.textContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
