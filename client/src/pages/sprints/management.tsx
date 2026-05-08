import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { sprintManagementAPI } from '@/utils/api';
import { sprintPageLabel } from '@/components/SprintManagementAnalysis';
import type { LoadedPage } from '@/components/SprintManagementAnalysis';

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

export default function SprintManagementPage() {
  const [confluencePages, setConfluencePages] = useState<ConfluencePage[]>([]);
  const [loadedPages, setLoadedPages] = useState<LoadedPage[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPageIds, setLoadingPageIds] = useState<Set<string>>(new Set());
  const [contentModal, setContentModal] = useState<PageContentModal | null>(null);
  const [loadingModalId, setLoadingModalId] = useState<string | null>(null);

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
      toast.success('Load thành công');
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
      toast.error(`Load thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingPageIds((prev) => {
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
                      <button
                        onClick={() => handleLoadPage(page.id)}
                        disabled={isLoading}
                        className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? '⏳' : page.loaded ? '↺ Reload' : '↓ Load'}
                      </button>
                      {page.loaded && (
                        <button
                          onClick={() => handleOpenContent(page.id, page.title)}
                          disabled={loadingModalId === page.id}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {loadingModalId === page.id ? '⏳' : '🔍'}
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
