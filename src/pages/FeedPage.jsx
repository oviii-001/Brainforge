import { useState, useEffect } from 'react';
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
import { Rss, Compass, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEED_PER_PAGE = 12;

function FeedPage() {
  const { user } = useAuth();
  const [feedType, setFeedType] = useState('following'); // 'following' | 'trending' | 'latest'
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);

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

  const fetchFeed = async (loadMore = false) => {
    if (!loadMore) setLoading(true);
    try {
      let constraints = [];

      if (feedType === 'following') {
        if (followingIds.length === 0) {
          setIdeas([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
        // Firestore 'in' operator supports max 30 values
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
        // latest
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
    }
  };

  const handleTabChange = (type) => {
    if (type === feedType) return;
    setFeedType(type);
    setLastDoc(null);
    setHasMore(true);
  };

  const feedTabs = [
    { value: 'following', label: 'Following', icon: Users },
    { value: 'trending', label: 'Trending', icon: TrendingUp },
    { value: 'latest', label: 'Latest', icon: Rss },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Your Feed
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Stay updated with ideas from people you follow
        </p>
      </div>

      {/* Feed type tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {feedTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              feedType === tab.value
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        feedType === 'following' ? (
          <EmptyState
            icon={Users}
            title="Your feed is empty"
            description="Follow some users to see their ideas in your feed, or explore what's trending."
            action={
              <div className="flex gap-3">
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
            title="No ideas found"
            description="There are no ideas to show right now."
          />
        )
      ) : (
        <>
          <div className="space-y-6">
            {ideas.map((idea) => (
              <FeedCard key={idea.id} idea={idea} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => fetchFeed(true)}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FeedPage;
