import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Bookmark, Clock } from 'lucide-react';
import { truncate, formatRelativeTime, formatCount } from '@/lib/utils';
import { CATEGORIES, IDEA_STATUSES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useVote } from '@/hooks/useVote';
import { useBookmark } from '@/hooks/useBookmark';
import { motion } from 'framer-motion';

function IdeaCard({ idea }) {
  const { user } = useAuth();
  const category = CATEGORIES.find((c) => c.slug === idea.category);
  const status = IDEA_STATUSES.find((s) => s.value === idea.status);

  const { userVote, netVotes, handleVote, voteLoading } = useVote(idea.id, {
    initialUpvotes: idea.upvotes || 0,
    initialDownvotes: idea.downvotes || 0,
    ownerId: idea.ownerId,
    ideaTitle: idea.title,
  });

  const { isBookmarked, handleBookmark, bookmarkLoading } = useBookmark(idea.id, {
    ideaTitle: idea.title,
    ideaCategory: idea.category,
    ownerName: idea.ownerName,
  });

  return (
    <Card hover className="h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header: category + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            )}
            {status && idea.status !== 'published' && (
              <Badge className={status.color + ' text-xs'}>{status.label}</Badge>
            )}
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(idea.createdAt)}
          </span>
        </div>

        {/* Title + Summary — clickable */}
        <Link to={`/ideas/${idea.id}`} className="flex-1 group">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {idea.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 flex-1">
            {truncate(idea.summary, 150)}
          </p>
        </Link>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {idea.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {idea.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{idea.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: author + interactive actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          {/* Author */}
          <Link to={`/profile/${idea.ownerId}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar
              src={idea.ownerPhotoURL}
              name={idea.ownerName}
              size="xs"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
              {idea.ownerName}
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Vote */}
            <div className="flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); handleVote('up'); }}
                disabled={voteLoading}
                className={`p-1 rounded transition-colors ${
                  userVote === 'up'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label="Upvote"
              >
                <ArrowBigUp className={`h-4 w-4 ${userVote === 'up' ? 'fill-current' : ''}`} />
              </motion.button>
              <span className={`text-xs font-semibold tabular-nums ${
                netVotes > 0 ? 'text-primary-600 dark:text-primary-400' :
                netVotes < 0 ? 'text-red-500' :
                'text-gray-400'
              }`}>
                {formatCount(netVotes)}
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); handleVote('down'); }}
                disabled={voteLoading}
                className={`p-1 rounded transition-colors ${
                  userVote === 'down'
                    ? 'text-red-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label="Downvote"
              >
                <ArrowBigDown className={`h-4 w-4 ${userVote === 'down' ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            {/* Comments */}
            <Link
              to={`/ideas/${idea.id}#comments`}
              className="flex items-center gap-1 px-1.5 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{formatCount(idea.commentsCount || 0)}</span>
            </Link>

            {/* Bookmark */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.preventDefault(); handleBookmark(); }}
              disabled={bookmarkLoading}
              className={`p-1 rounded transition-colors ${
                isBookmarked
                  ? 'text-amber-500'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IdeaCard;
