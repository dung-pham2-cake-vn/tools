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
  { label: 'OpenAPI Spec', path: '/openapispec', icon: '📄' },
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

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
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
    <div
      className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen fixed left-0 top-0 shadow-xl flex flex-col transition-[width] duration-200 ${
        collapsed ? 'w-16 px-2 py-4' : 'w-64 p-6'
      }`}
    >
      <div className={`flex items-start ${collapsed ? 'flex-col gap-2' : 'justify-between gap-1'} mb-6`}>
        {collapsed ? (
          <span className="w-full text-center text-2xl" title="Tools Manager">🛠️</span>
        ) : (
          <div>
            <h1 className="whitespace-nowrap text-xl font-bold leading-tight">🛠️ Tools Manager</h1>
            <p className="text-sm text-blue-200 mt-1">v1.0.0</p>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={`rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors ${
            collapsed ? 'w-full py-1 text-center' : 'px-2 py-1'
          }`}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          if (item.children) {
            const isUnderItem = isUnder(item.path);
            const isOpen = openPaths.has(item.path);
            return (
              <div key={item.path}>
                <button
                  onClick={() => {
                    // collapsed rail has no room for children — open the rail first
                    if (collapsed) {
                      onToggle?.();
                      setOpenPaths((prev) => new Set(prev).add(item.path));
                      return;
                    }
                    toggleOpen(item.path);
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg transition-all ${
                    collapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
                  } ${
                    isUnderItem
                      ? 'bg-white text-blue-900 font-semibold shadow-lg'
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                    <span className="text-xl">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                  {!collapsed && <span className="text-xs">{isOpen ? '▾' : '▸'}</span>}
                </button>
                {isOpen && !collapsed && (
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
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-lg transition-all ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive(item.path)
                  ? 'bg-white text-blue-900 font-semibold shadow-lg'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`flex-shrink-0 ${collapsed ? 'mt-3' : 'mt-4'}`}>
        {collapsed ? (
          <div
            className="bg-blue-700 rounded-lg py-2 text-center text-xs"
            title="Connected to Backend — http://localhost:3000"
          >
            🟢
          </div>
        ) : (
          <div className="bg-blue-700 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-100">Connected to Backend</p>
            <p className="text-xs text-blue-300 mt-1">http://localhost:3000</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
