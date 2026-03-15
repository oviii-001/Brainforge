import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ArrowUpCircle, MessageSquare, Bookmark, Clock } from 'lucide-react';
import { truncate, formatRelativeTime, formatCount } from '@/lib/utils';
import { CATEGORIES, IDEA_STATUSES } from '@/lib/constants';

function IdeaCard({ idea }) {
  const category = CATEGORIES.find((c) => c.slug === idea.category);
  const status = IDEA_STATUSES.find((s) => s.value === idea.status);
  const netVotes = (idea.upvotes || 0) - (idea.downvotes || 0);

  return (
    <Link to={`/ideas/${idea.id}`}>
      <Card hover className="h-full flex flex-col">
        <CardContent className="p-5 flex flex-col flex-1">
          {/* Header: category + status */}
          <div className="flex items-center justify-between mb-3">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            )}
            {status && idea.status !== 'published' && (
              <Badge className={status.color + ' text-xs'}>{status.label}</Badge>
            )}
          </div>

          {/* Title + Summary */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {idea.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 flex-1">
            {truncate(idea.summary, 150)}
          </p>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {idea.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-primary-600 dark:text-primary-400">
                  #{tag}
                </span>
              ))}
              {idea.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{idea.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* Author */}
            <div className="flex items-center gap-2">
              <Avatar
                src={idea.ownerPhotoURL}
                name={idea.ownerName}
                size="xs"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                {idea.ownerName}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {formatCount(netVotes)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {formatCount(idea.commentsCount || 0)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(idea.createdAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default IdeaCard;
