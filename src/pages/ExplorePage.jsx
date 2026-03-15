import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IdeaCard from '@/features/ideas/IdeaCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Search, Filter, X, Lightbulb } from 'lucide-react';
import { CATEGORIES, SORT_OPTIONS, IDEAS_PER_PAGE } from '@/lib/constants';
import { cn } from '@/lib/utils';

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const activeCategory = searchParams.get('category') || '';
  const activeSort = searchParams.get('sort') || 'latest';

  useEffect(() => {
    fetchIdeas();
  }, [activeCategory, activeSort]);

  const fetchIdeas = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setIdeas([]);
    }

    try {
      let constraints = [where('status', '==', 'published')];

      if (activeCategory) {
        constraints.push(where('category', '==', activeCategory));
      }

      // Sorting
      switch (activeSort) {
        case 'trending':
          constraints.push(orderBy('upvotes', 'desc'));
          break;
        case 'most_upvoted':
          constraints.push(orderBy('upvotes', 'desc'));
          break;
        case 'most_discussed':
          constraints.push(orderBy('commentsCount', 'desc'));
          break;
        default:
          constraints.push(orderBy('createdAt', 'desc'));
      }

      constraints.push(limit(IDEAS_PER_PAGE));

      if (loadMore && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, 'ideas'), ...constraints);
      const snapshot = await getDocs(q);

      const newIdeas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Client-side search filter
      let filtered = newIdeas;
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        filtered = newIdeas.filter(
          (idea) =>
            idea.title?.toLowerCase().includes(lower) ||
            idea.summary?.toLowerCase().includes(lower) ||
            idea.tags?.some((t) => t.toLowerCase().includes(lower))
        );
      }

      if (loadMore) {
        setIdeas((prev) => [...prev, ...filtered]);
      } else {
        setIdeas(filtered);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === IDEAS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = activeCategory || searchQuery;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Explore Ideas
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Discover innovative ideas and find your next project to collaborate on
        </p>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchIdeas();
          }}
          className="flex-1 relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search ideas by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={activeSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category filters */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl border bg-gray-50 dark:bg-gray-900/50 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => updateFilter('category', '')}>
              <Badge
                variant={!activeCategory ? 'default' : 'outline'}
                className="cursor-pointer"
              >
                All
              </Badge>
            </button>
            {CATEGORIES.map((cat) => (
              <button key={cat.slug} onClick={() => updateFilter('category', cat.slug)}>
                <Badge
                  variant={activeCategory === cat.slug ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {cat.name}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {activeCategory && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {CATEGORIES.find((c) => c.slug === activeCategory)?.name}
              <button onClick={() => updateFilter('category', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: {searchQuery}
              <button onClick={() => updateFilter('search', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Ideas grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : ideas.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <Button
                variant="outline"
                onClick={() => fetchIdeas(true)}
                loading={loadingMore}
              >
                Load More Ideas
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Lightbulb}
          title="No ideas found"
          description={hasActiveFilters ? 'Try adjusting your filters or search query.' : 'Be the first to share an idea!'}
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            ) : null
          }
        />
      )}
    </div>
  );
}

export default ExplorePage;
