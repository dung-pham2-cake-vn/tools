import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { sprintManagementAPI } from '@/utils/api';
import { sprintPageLabel } from './SprintManagementAnalysis';
import type { LoadedPage } from './SprintManagementAnalysis';

interface NavChild {
  label: string;
  path: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Roadmap', path: '/roadmap', icon: '🗺️' },
  {
    label: 'Sprints',
    path: '/sprints',
    icon: '🏃',
    children: [
      { label: 'Sprint Alignment', path: '/sprints' },
      { label: 'Sprint Management', path: '/sprints/management' },
    ],
  },
  { label: 'Tasks', path: '/tasks', icon: '📋' },
  { label: 'Ticket tồn đọng', path: '/carryover', icon: '⏳' },
  {
    label: 'Jira',
    path: '/jira',
    icon: '🔗',
    children: [
      { label: 'Backlog', path: '/jira/backlog' },
      { label: 'PO Tickets', path: '/jira/po-tickets' },
    ],
  },
  { label: 'Support', path: '/support', icon: '🛠️' },
  { label: 'Settings', path: '/config', icon: '⚙️' },
];

const UTC7_MS = 7 * 60 * 60 * 1000;

function toUtc7DateStr(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + UTC7_MS).toISOString().slice(0, 10);
}

function getTodayUtc7(): string {
  return toUtc7DateStr(new Date().toISOString()) || '';
}

const Sidebar: React.FC = () => {
  const router = useRouter();
  const isUnder = (basePath: string) =>
    router.pathname === basePath || router.pathname.startsWith(`${basePath}/`);
  const [openPaths, setOpenPaths] = useState<Set<string>>(() => {
    const s = new Set<string>();
    navItems.forEach((it) => {
      if (it.children && isUnder(it.path)) s.add(it.path);
    });
    return s;
  });
  const toggleOpen = (p: string) =>
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  const [loadedSprintPages, setLoadedSprintPages] = useState<LoadedPage[]>([]);
  const [activeSprintNums, setActiveSprintNums] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadLoadedSprintPages = () => sprintManagementAPI.getLoadedPages()
      .then((res) => setLoadedSprintPages(res.data.data || []))
      .catch(() => setLoadedSprintPages([]));

    loadLoadedSprintPages();
    window.addEventListener('sprint-loaded-pages-changed', loadLoadedSprintPages);
    return () => window.removeEventListener('sprint-loaded-pages-changed', loadLoadedSprintPages);
  }, [router.asPath]);

  useEffect(() => {
    sprintManagementAPI.getActiveSprints()
      .then((res) => {
        const today = getTodayUtc7();
        const nums = new Set<number>();
        for (const s of (res.data.data || [])) {
          const start = toUtc7DateStr(s.startDate);
          const end = toUtc7DateStr(s.endDate);
          if (start && end && today >= start && today <= end) {
            const m = s.name?.match(/[Ss]print\s*(\d+)/);
            if (m) nums.add(parseInt(m[1], 10));
          }
        }
        setActiveSprintNums(nums);
      })
      .catch(() => {});
  }, []);

  const isActive = (path: string) => router.asPath === path;

  return (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen fixed left-0 top-0 p-6 shadow-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🛠️ Tools Manager</h1>
        <p className="text-sm text-blue-200 mt-1">v1.0.0</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            const isUnderItem = isUnder(item.path);
            const isOpen = openPaths.has(item.path);
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleOpen(item.path)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    isUnderItem
                      ? 'bg-white text-blue-900 font-semibold shadow-lg'
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-blue-600 pl-3">
                    {item.children.map((child) => (
                      <React.Fragment key={child.path}>
                        <Link
                          href={child.path}
                          className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive(child.path)
                              ? 'bg-white/20 text-white font-semibold'
                              : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                          }`}
                        >
                          {child.label}
                        </Link>
                        {child.path === '/sprints/management' && loadedSprintPages.length > 0 && (
                          <div className="ml-3 mt-1 space-y-1 border-l border-blue-600/70 pl-2">
                            {[...loadedSprintPages].sort((a, b) => {
                              const na = a.title.match(/[Ss]print\s*(\d+)/);
                              const nb = b.title.match(/[Ss]print\s*(\d+)/);
                              return (nb ? parseInt(nb[1], 10) : 0) - (na ? parseInt(na[1], 10) : 0);
                            }).map((page) => {
                              const path = `/sprints/management/${page.pageId}`;
                              const sprintNumMatch = page.title.match(/[Ss]print\s*(\d+)/);
                              const sprintNum = sprintNumMatch ? parseInt(sprintNumMatch[1], 10) : -1;
                              const isCurrent = sprintNum > 0 && activeSprintNums.has(sprintNum);
                              return (
                                <Link
                                  key={page.pageId}
                                  href={path}
                                  className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                                    isActive(path)
                                      ? 'bg-white/20 text-white font-semibold'
                                      : isCurrent
                                      ? 'text-white font-bold hover:bg-blue-700'
                                      : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                                  }`}
                                >
                                  {sprintPageLabel(page.title)}
                                  {isCurrent && <span className="ml-1 text-[10px] text-blue-300">●</span>}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? 'bg-white text-blue-900 font-semibold shadow-lg'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-blue-700 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-100">Connected to Backend</p>
          <p className="text-xs text-blue-300 mt-1">http://localhost:3000</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
