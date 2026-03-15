import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import {
  ArrowBigUp, ArrowBigDown, MessageSquare, Bookmark, Share2,
  UserPlus, Link2, Copy, Check,
} from 'lucide-react';
import { truncate, formatRelativeTime, formatCount } from '@/lib/utils';
import { CATEGORIES, IDEA_STATUSES } from '@/lib/constants';
import FollowButton from '@/features/follows/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useVote } from '@/hooks/useVote';
import { useBookmark } from '@/hooks/useBookmark';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function FeedCard({ idea }) {
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

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef(null);

  const ideaUrl = `${window.location.origin}/ideas/${idea.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ideaUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => { setCopied(false); setShareOpen(false); }, 1200);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const shareOnX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(idea.title)}&url=${encodeURIComponent(ideaUrl)}`, '_blank');
    setShareOpen(false);
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ideaUrl)}`, '_blank');
    setShareOpen(false);
  };

  return (
    <Card className="flex flex-col overflow-hidden">
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
        <Link to={`/ideas/${idea.id}`} className="flex-1 group">
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {idea.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
            {truncate(idea.summary, 220)}
          </p>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {idea.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
              {idea.tags.length > 4 && (
                <span className="text-xs text-gray-400">+{idea.tags.length - 4}</span>
              )}
            </div>
          )}
        </Link>

        {/* Interactive action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          {/* Vote buttons */}
          <div className="flex items-center gap-0.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleVote('up')}
              disabled={voteLoading}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                userVote === 'up'
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label="Upvote"
            >
              <ArrowBigUp className={`h-5 w-5 ${userVote === 'up' ? 'fill-current' : ''}`} />
            </motion.button>

            <span className={`text-sm font-semibold min-w-[2ch] text-center tabular-nums ${
              netVotes > 0 ? 'text-primary-600 dark:text-primary-400' :
              netVotes < 0 ? 'text-red-500' :
              'text-gray-500 dark:text-gray-400'
            }`}>
              {formatCount(netVotes)}
            </span>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleVote('down')}
              disabled={voteLoading}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                userVote === 'down'
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label="Downvote"
            >
              <ArrowBigDown className={`h-5 w-5 ${userVote === 'down' ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {/* Comments link */}
          <Link
            to={`/ideas/${idea.id}#comments`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{formatCount(idea.commentsCount || 0)}</span>
          </Link>

          {/* Bookmark */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleBookmark}
            disabled={bookmarkLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </motion.button>

          {/* Share */}
          <div className="relative" ref={shareRef}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShareOpen(!shareOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </motion.button>

            {shareOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                <div className="absolute right-0 bottom-full mb-2 w-48 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-lg z-50 py-1 animate-fade-in">
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={shareOnX}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Share on X
                  </button>
                  <button
                    onClick={shareOnLinkedIn}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    Share on LinkedIn
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FeedCard;
