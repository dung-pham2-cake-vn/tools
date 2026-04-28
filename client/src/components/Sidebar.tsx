import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Sidebar: React.FC = () => {
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  const navItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Tasks', path: '/tasks', icon: '📋' },
    { label: 'Sprints', path: '/sprints', icon: '🏃' },
    { label: 'Roadmap', path: '/roadmap', icon: '🗺️' },
    { label: 'Jira', path: '/jira', icon: '🔗' },
    { label: 'Support', path: '/support', icon: '🛠️' },
    { label: 'Settings', path: '/config', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen fixed left-0 top-0 p-6 shadow-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🛠️ Tools Manager</h1>
        <p className="text-sm text-blue-200 mt-1">v1.0.0</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
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
        ))}
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
