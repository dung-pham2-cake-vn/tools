import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'tm-sidebar-collapsed';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  // read after mount so SSR markup and first client render match
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className="flex">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main
        className={`flex-1 p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen transition-[margin] duration-200 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
