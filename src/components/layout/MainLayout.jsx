import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageTransition from '@/components/common/PageTransition';
import ScrollToTop from '@/components/common/ScrollToTop';

function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <ScrollToTop />
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
