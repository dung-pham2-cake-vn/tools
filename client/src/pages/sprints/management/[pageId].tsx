import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
import { SprintManagementAnalysis, sprintPageLabel } from '@/components/SprintManagementAnalysis';
import type { LoadedPage } from '@/components/SprintManagementAnalysis';
import { sprintManagementAPI } from '@/utils/api';

export default function SprintManagementDetailPage() {
  const router = useRouter();
  const pageId = typeof router.query.pageId === 'string' ? router.query.pageId : '';
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const res = await sprintManagementAPI.getLoadedPages();
      const pages: LoadedPage[] = res.data.data || [];
      setPage(pages.find((p) => p.pageId === pageId) || null);
    } catch (err: any) {
      toast.error(`Không tải được page: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading) {
    return (
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 py-10 text-center text-gray-400 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-4">
        <Toaster position="top-right" />
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-6 py-8">
          <h1 className="text-xl font-bold text-gray-900">Không tìm thấy Sprint page</h1>
          <p className="mt-2 text-sm text-gray-500">Page này chưa được load hoặc đã bị xoá khỏi danh sách loaded pages.</p>
          <Link
            href="/sprints/management"
            className="inline-flex mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Quay lại Sprint Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{sprintPageLabel(page.title)}</h1>
          <p className="mt-1 text-sm text-gray-500">{page.title}</p>
        </div>
        <Link
          href="/sprints/management"
          className="flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
        >
          Sprint Management
        </Link>
      </div>

      <SprintManagementAnalysis page={page} />
    </div>
  );
}
