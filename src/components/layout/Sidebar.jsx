import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Compass,
  Rss,
  MessageCircle,
  Bell,
  Bookmark,
  Settings,
  Plus,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  { to: '/feed', label: 'Feed', icon: Rss, auth: true },
  { to: '/explore', label: 'Explore', icon: Compass, auth: false },
  { to: '/messages', label: 'Messages', icon: MessageCircle, auth: true, badge: 'messages' },
  { to: '/notifications', label: 'Notifications', icon: Bell, auth: true, badge: 'notifications' },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark, auth: true },
];

function Sidebar({ collapsed, onToggleCollapse }) {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.auth || user);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed top-16 left-0 bottom-0 z-30 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col py-4 px-3 gap-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const active = isActive(item.to);
          const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary-600 dark:bg-primary-400"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <item.icon className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />

              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Badge */}
              {badgeCount > 0 && (
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full text-[10px] font-bold text-white',
                    item.badge === 'messages' ? 'bg-primary-600' : 'bg-red-500',
                    collapsed
                      ? 'absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1'
                      : 'ml-auto h-5 min-w-[20px] px-1.5'
                  )}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* New Idea CTA */}
        {user && (
          <Link
            to="/ideas/new"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'New Idea' : undefined}
          >
            <Plus className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />
            {!collapsed && <span>New Idea</span>}
          </Link>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-4 px-3 space-y-1">
        {/* Admin link */}
        {user && userProfile?.role === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive('/admin')
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Admin Panel' : undefined}
          >
            <Shield className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}

        {/* Settings */}
        {user && (
          <Link
            to="/settings"
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive('/settings')
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors',
            collapsed && 'justify-center px-0'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-[18px] w-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
