import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageTransition from '@/components/common/PageTransition';
import ScrollToTop from '@/components/common/ScrollToTop';

const SIDEBAR_STORAGE_KEY = 'brainforge-sidebar-collapsed';

function AppLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <ScrollToTop />
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to content
      </a>

      <Navbar variant="app" />

      <div className="flex flex-1">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />

        {/* Main content area — offset by sidebar width on desktop */}
        <main
          id="main-content"
          className="flex-1 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out lg:ml-[240px] pb-[65px] lg:pb-0"
          style={{
            marginLeft: undefined, // managed by className
          }}
        >
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav />

      {/* Adjust margin-left dynamically for collapsed sidebar */}
      <style>{`
        @media (min-width: 1024px) {
          #main-content {
            margin-left: ${sidebarCollapsed ? '68px' : '240px'} !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;
