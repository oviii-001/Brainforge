import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, ModalContent } from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import FollowButton from '@/features/follows/FollowButton';
import { formatRelativeTime } from '@/lib/utils';

function FollowersList({ userId, type = 'followers', open, onOpenChange }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const subcollection = type === 'followers' ? 'followers' : 'following';
      const q = query(
        collection(db, 'users', userId, subcollection),
        orderBy('followedAt', 'desc')
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title={title} description={`${users.length} ${type === 'followers' ? 'people follow this user' : 'people this user follows'}`}>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto -mx-2 px-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <Link
                  to={`/profile/${u.userId || u.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar src={u.userPhotoURL} name={u.userName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.userName || 'Unknown User'}
                    </p>
                    {u.followedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(u.followedAt)}
                      </p>
                    )}
                  </div>
                </Link>
                {user && user.uid !== (u.userId || u.id) && (
                  <FollowButton
                    targetUserId={u.userId || u.id}
                    targetUserName={u.userName}
                    size="xs"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

export default FollowersList;
