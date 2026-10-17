import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

export default function AppLayout() {
  const isMobile = useIsMobile();
  // Open by default on desktop, closed by default on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  // When crossing the mobile breakpoint, snap to the sensible default for that screen size.
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900 font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}