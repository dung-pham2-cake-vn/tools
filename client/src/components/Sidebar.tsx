import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
  { label: 'Jira', path: '/jira', icon: '🔗' },
  { label: 'Support', path: '/support', icon: '🛠️' },
  { label: 'Settings', path: '/config', icon: '⚙️' },
];

const Sidebar: React.FC = () => {
  const router = useRouter();
  const isUnderSprints = router.pathname.startsWith('/sprints');
  const [sprintsOpen, setSprintsOpen] = useState(isUnderSprints);

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen fixed left-0 top-0 p-6 shadow-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🛠️ Tools Manager</h1>
        <p className="text-sm text-blue-200 mt-1">v1.0.0</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => setSprintsOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    isUnderSprints
                      ? 'bg-white text-blue-900 font-semibold shadow-lg'
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-xs">{sprintsOpen ? '▾' : '▸'}</span>
                </button>
                {sprintsOpen && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-blue-600 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive(child.path)
                            ? 'bg-white/20 text-white font-semibold'
                            : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
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
