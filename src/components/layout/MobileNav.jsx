import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Rss,
  MessageCircle,
  MoreHorizontal,
  Bell,
  Bookmark,
  Settings,
  Plus,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const TAB_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, auth: true },
  { to: '/feed', label: 'Feed', icon: Rss, auth: true },
  { to: '/explore', label: 'Explore', icon: Compass, auth: false },
  { to: '/messages', label: 'Messages', icon: MessageCircle, auth: true, badge: 'messages' },
];

const MORE_ITEMS = [
  { to: '/notifications', label: 'Notifications', icon: Bell, auth: true, badge: 'notifications' },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark, auth: true },
  { to: '/ideas/new', label: 'New Idea', icon: Plus, auth: true },
  { to: '/settings', label: 'Settings', icon: Settings, auth: true },
  { to: '/admin', label: 'Admin Panel', icon: Shield, admin: true },
];

function MobileNav() {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Close "more" menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Listen for unread message count
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.lastSenderId && data.lastSenderId !== user.uid && !data.readBy?.[user.uid]) {
          count++;
        }
      });
      setUnreadMessages(count);
    }, () => {});

    return () => unsub();
  }, [user]);

  // Listen for unread notifications count
  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadNotifications(snap.size);
    }, () => {});

    return () => unsub();
  }, [user]);

  const isActive = (path) => {
    if (path === '/messages') return location.pathname.startsWith('/messages');
    return location.pathname === path;
  };

  const getBadgeCount = (badgeType) => {
    if (badgeType === 'messages') return unreadMessages;
    if (badgeType === 'notifications') return unreadNotifications;
    return 0;
  };

  const visibleTabs = TAB_ITEMS.filter((item) => !item.auth || user);
  const visibleMoreItems = MORE_ITEMS.filter((item) => {
    if (item.admin) return user && userProfile?.role === 'admin';
    if (item.auth) return !!user;
    return true;
  });

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed bottom-[65px] left-3 right-3 z-50 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-2 lg:hidden"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {visibleMoreItems.map((item) => {
                const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.to)
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {badgeCount > 0 && (
                      <span className={cn(
                        'ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold text-white',
                        item.badge === 'notifications' ? 'bg-red-500' : 'bg-primary-600'
                      )}>
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-around h-[65px] px-2">
          {visibleTabs.map((item) => {
            const active = isActive(item.to);
            const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary-600 text-[9px] font-bold text-white">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="mobile-tab-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary-600 dark:bg-primary-400"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* More button */}
          {user && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors',
                moreOpen
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {moreOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <MoreHorizontal className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default MobileNav;
