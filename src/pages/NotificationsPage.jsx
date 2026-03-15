import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  collection, query, where, orderBy, getDocs, doc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import { cn, formatRelativeTime } from '@/lib/utils';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations';
import { toast } from 'sonner';
import {
  Bell, BellOff, Check, CheckCheck, MessageSquare, Users,
  ArrowUpCircle, Lightbulb, Trash2, UserPlus,
} from 'lucide-react';

const NOTIFICATION_ICONS = {
  comment: MessageSquare,
  collaboration: Users,
  vote: ArrowUpCircle,
  idea: Lightbulb,
  follow: UserPlus,
  default: Bell,
};

function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'notifications'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
        read: true,
      });
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unread = notifications.filter((n) => !n.read);
      unread.forEach((n) => {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read.');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        className="flex items-center gap-2 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            filter === 'all'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            filter === 'unread'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          Unread ({unreadCount})
        </button>
      </motion.div>

      {/* Notifications list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredNotifications.length > 0 ? (
        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredNotifications.map((notification) => {
            const IconComp = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
            return (
              <motion.div key={notification.id} variants={staggerItem}>
                <Card
                  className={cn(
                    'transition-colors',
                    !notification.read && 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20'
                  )}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn(
                      'flex items-center justify-center h-9 w-9 rounded-full shrink-0',
                      !notification.read ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    )}>
                      <IconComp className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {notification.link ? (
                        <Link
                          to={notification.link}
                          onClick={() => !notification.read && markAsRead(notification.id)}
                          className="text-sm text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {notification.message}
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={BellOff}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={filter === 'unread' ? 'You\'ve read all your notifications.' : 'Notifications about your ideas and collaborations will appear here.'}
        />
      )}
    </div>
  );
}

export default NotificationsPage;
