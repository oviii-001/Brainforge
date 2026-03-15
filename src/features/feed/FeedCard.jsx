import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ArrowUpCircle, MessageSquare, Clock, UserPlus } from 'lucide-react';
import { truncate, formatRelativeTime, formatCount } from '@/lib/utils';
import { CATEGORIES, IDEA_STATUSES } from '@/lib/constants';
import FollowButton from '@/features/follows/FollowButton';
import { useAuth } from '@/contexts/AuthContext';

function FeedCard({ idea }) {
  const { user } = useAuth();
  const category = CATEGORIES.find((c) => c.slug === idea.category);
  const status = IDEA_STATUSES.find((s) => s.value === idea.status);
  const netVotes = (idea.upvotes || 0) - (idea.downvotes || 0);

  return (
    <Card hover className="flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Author row with follow button */}
        <div className="flex items-center justify-between mb-3">
          <Link
            to={`/profile/${idea.ownerId}`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <Avatar
              src={idea.ownerPhotoURL}
              name={idea.ownerName}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {idea.ownerName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(idea.createdAt)}
              </p>
            </div>
          </Link>
          {user && user.uid !== idea.ownerId && (
            <FollowButton
              targetUserId={idea.ownerId}
              targetUserName={idea.ownerName}
              size="xs"
            />
          )}
        </div>

        {/* Idea content — clickable */}
        <Link to={`/ideas/${idea.id}`} className="flex-1">
          {/* Category + status badges */}
          <div className="flex items-center gap-2 mb-2">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            )}
            {status && idea.status !== 'published' && (
              <Badge className={status.color + ' text-xs'}>{status.label}</Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-2">
            {idea.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">
            {truncate(idea.summary, 200)}
          </p>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {idea.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs text-primary-600 dark:text-primary-400">
                  #{tag}
                </span>
              ))}
              {idea.tags.length > 4 && (
                <span className="text-xs text-gray-400">+{idea.tags.length - 4}</span>
              )}
            </div>
          )}
        </Link>

        {/* Stats footer */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <ArrowUpCircle className="h-3.5 w-3.5" />
            {formatCount(netVotes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {formatCount(idea.commentsCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" />
            {formatCount(idea.collaboratorsCount || 0)} collabs
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default FeedCard;
