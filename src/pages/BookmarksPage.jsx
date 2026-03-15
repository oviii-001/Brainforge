import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Bookmark, X, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, [user]);

  const fetchBookmarks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'bookmarks'));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending
      items.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      setBookmarks(items);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Failed to load bookmarks.');
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', bookmarkId));
      // Decrement bookmark count on idea
      await updateDoc(doc(db, 'ideas', bookmarkId), { bookmarksCount: increment(-1) }).catch(() => {});
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      toast.success('Bookmark removed.');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <motion.div
        className="mb-8"
        initial={fadeInUp.initial}
        animate={fadeInUp.animate}
        transition={fadeInUp.transition}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bookmarks
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Ideas you&apos;ve saved for later
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : bookmarks.length > 0 ? (
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence>
            {bookmarks.map((bookmark) => {
              const category = CATEGORIES.find((c) => c.slug === bookmark.ideaCategory);
              return (
                <motion.div
                  key={bookmark.id}
                  variants={staggerItem}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  layout
                >
                  <Card className="group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/ideas/${bookmark.id}`}
                          className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
                        >
                          {bookmark.ideaTitle}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {category && <Badge variant="secondary" className="text-[10px]">{category.name}</Badge>}
                          <span>by {bookmark.ownerName}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(bookmark.createdAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        className="shrink-0 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove bookmark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save ideas you find interesting and they'll appear here."
          action={
            <Link to="/explore">
              <Button variant="outline">Explore Ideas</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

export default BookmarksPage;
