import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
import { SprintManagementAnalysis } from '@/components/SprintManagementAnalysis';
import type { LoadedPage } from '@/components/SprintManagementAnalysis';
import { sprintManagementAPI } from '@/utils/api';
import { sprintPageSlug } from '@/utils/sprintPages';

/**
 * URL dạng /sprints/management/sprint-197. Vẫn nhận pageId Confluence cũ (link/bookmark
 * cũ) và tự đổi sang slug cho dễ đọc.
 */
export default function SprintCheckDetailPage() {
  const router = useRouter();
  const param = typeof router.query.pageId === 'string' ? router.query.pageId : '';
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    if (!param) return;
    setLoading(true);
    try {
      const res = await sprintManagementAPI.getLoadedPages();
      const pages: LoadedPage[] = res.data.data || [];
      const found =
        pages.find((p) => sprintPageSlug(p.title) === param) || pages.find((p) => p.pageId === param) || null;
      setPage(found);
      if (found && found.pageId === param) {
        router.replace(`/sprints/management/${sprintPageSlug(found.title)}`, undefined, { shallow: true });
      }
    } catch (err: any) {
      toast.error(`Không tải được page: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

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
          <h1 className="text-xl font-bold text-gray-900">Không tìm thấy sprint</h1>
          <p className="mt-2 text-sm text-gray-500">Sprint này chưa được load hoặc đã bị gỡ khỏi danh sách.</p>
          <Link
            href="/sprints/management"
            className="inline-flex mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Quay lại Sprint check
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <SprintManagementAnalysis page={page} />
    </>
  );
}
