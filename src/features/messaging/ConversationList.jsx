import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function ConversationList({ conversations, activeId, currentUserId }) {
  if (conversations.length === 0) return null;

  return (
    <div className="space-y-1">
      {conversations.map((conv) => {
        const otherUserId = conv.participants.find((p) => p !== currentUserId);
        const otherUser = conv.participantDetails?.[otherUserId] || {};
        const isActive = conv.id === activeId;
        const isUnread = conv.lastSenderId && conv.lastSenderId !== currentUserId && !conv.readBy?.[currentUserId];

        return (
          <Link
            key={conv.id}
            to={`/messages/${conv.id}`}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            )}
          >
            <div className="relative shrink-0">
              <Avatar src={otherUser.photoURL} name={otherUser.displayName} size="sm" />
              {isUnread && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary-500 border-2 border-white dark:border-gray-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  'text-sm truncate',
                  isUnread
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'font-medium text-gray-700 dark:text-gray-300'
                )}>
                  {otherUser.displayName || 'Unknown User'}
                </p>
                {conv.lastMessageAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className={cn(
                  'text-xs truncate',
                  isUnread
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {conv.lastSenderId === currentUserId ? 'You: ' : ''}
                  {truncate(conv.lastMessage, 50)}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default ConversationList;
