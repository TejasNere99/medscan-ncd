import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';

export const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return <div className="min-h-screen bg-stone-50 text-stone-900">
    <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen((open) => !open)} />
    <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
    <main className="min-h-[calc(100vh-68px)] overflow-x-hidden px-4 py-6 sm:px-6 lg:ml-[250px] lg:px-9 lg:py-8">
      <div className="page-shell"><Outlet /></div>
    </main>
  </div>;
};
