import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
