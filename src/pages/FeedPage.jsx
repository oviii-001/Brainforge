import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, getDocs, limit, startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import FeedCard from '@/features/feed/FeedCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Rss, Compass, Users, TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';

const FEED_PER_PAGE = 10;

function FeedPage() {
  const { user } = useAuth();
  const [feedType, setFeedType] = useState('trending'); // default to trending — always has content
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  const observerRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);

  // Fetch who the user follows
  useEffect(() => {
    if (!user) return;
    fetchFollowing();
  }, [user]);

  // Fetch feed when type changes or following list loads
  useEffect(() => {
    if (!user) return;
    if (feedType === 'following' && !followingLoaded) return;
    fetchFeed();
  }, [feedType, followingLoaded]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchFeed(true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading, loadingMore, lastDoc, feedType, followingIds]);

  const fetchFollowing = async () => {
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'following'));
      const ids = snap.docs.map((d) => d.id);
      setFollowingIds(ids);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setFollowingLoaded(true);
    }
  };

  const fetchFeed = useCallback(async (loadMore = false) => {
    if (loadMore) {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      let constraints = [];

      if (feedType === 'following') {
        if (followingIds.length === 0) {
          setIdeas([]);
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        const batchIds = followingIds.slice(0, 30);
        constraints = [
          where('ownerId', 'in', batchIds),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          limit(FEED_PER_PAGE),
        ];
      } else if (feedType === 'trending') {
        constraints = [
          where('status', '==', 'published'),
          orderBy('upvotes', 'desc'),
          limit(FEED_PER_PAGE),
        ];
      } else {
        constraints = [
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          limit(FEED_PER_PAGE),
        ];
      }

      if (loadMore && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, 'ideas'), ...constraints);
      const snap = await getDocs(q);
      const newIdeas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (loadMore) {
        setIdeas((prev) => [...prev, ...newIdeas]);
      } else {
        setIdeas(newIdeas);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === FEED_PER_PAGE);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, followingIds, followingLoaded, lastDoc, hasMore, loadingMore]);

  const handleTabChange = (type) => {
    if (type === feedType) return;
    setFeedType(type);
    setLastDoc(null);
    setHasMore(true);
  };

  const handleRefresh = () => {
    setLastDoc(null);
    setHasMore(true);
    fetchFeed();
  };

  const feedTabs = [
    { value: 'trending', label: 'Trending', icon: TrendingUp },
    { value: 'latest', label: 'Latest', icon: Sparkles },
    { value: 'following', label: 'Following', icon: Users },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar: tabs + refresh */}
      <div className="flex items-center justify-between mb-6">
        <motion.div
          className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          {feedTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors z-10',
                feedType === tab.value
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {feedType === tab.value && (
                <motion.div
                  className="absolute inset-0 bg-white dark:bg-gray-900 rounded-md shadow-sm"
                  layoutId="feed-tab-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Refresh feed"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </motion.button>
      </div>

      {/* Feed content */}
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        feedType === 'following' ? (
          <EmptyState
            icon={Users}
            title="Your feed is empty"
            description="Follow some users to see their ideas here, or discover what's trending right now."
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => handleTabChange('trending')}>
                  <TrendingUp className="h-4 w-4" /> View Trending
                </Button>
                <Link to="/explore">
                  <Button>
                    <Compass className="h-4 w-4" /> Explore Ideas
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={Rss}
            title="No ideas yet"
            description="Be the first to share an idea! The community is waiting."
            action={
              <Link to="/ideas/new">
                <Button>
                  <Sparkles className="h-4 w-4" /> Share Your Idea
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <>
          <motion.div
            className="space-y-5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            key={feedType}
          >
            {ideas.map((idea) => (
              <motion.div key={idea.id} variants={staggerItem}>
                <FeedCard idea={idea} />
              </motion.div>
            ))}
          </motion.div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreTriggerRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Spinner size="sm" />
                Loading more...
              </div>
            )}
            {!hasMore && ideas.length > 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You've reached the end
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FeedPage;
