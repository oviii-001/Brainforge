import { useEffect, useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

function MessageThread({ messages, currentUserId, otherUser }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="lg" className="mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {otherUser?.displayName || 'Unknown User'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Start a conversation by sending a message below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;

        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2 max-w-[80%]',
              isOwn ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            {!isOwn && (
              <Avatar
                src={otherUser?.photoURL}
                name={otherUser?.displayName}
                size="xs"
                className="shrink-0 mt-1"
              />
            )}
            <div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm',
                  isOwn
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                )}
              >
                {msg.text}
              </div>
              <p className={cn(
                'text-[10px] text-gray-400 mt-1',
                isOwn ? 'text-right' : ''
              )}>
                {formatRelativeTime(msg.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageThread;
