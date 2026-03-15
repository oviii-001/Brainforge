import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '@/lib/notifications';

function FollowButton({ targetUserId, targetUserName, size = 'sm', className = '' }) {
  const { user, userProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Don't render if viewing own profile or not authenticated
  const isOwnProfile = user && user.uid === targetUserId;

  useEffect(() => {
    if (!user || isOwnProfile) {
      setCheckingStatus(false);
      return;
    }
    checkFollowStatus();
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    try {
      const followRef = doc(db, 'users', user.uid, 'following', targetUserId);
      const followSnap = await getDoc(followRef);
      setIsFollowing(followSnap.exists());
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow users.');
      return;
    }

    setLoading(true);
    try {
      const followingRef = doc(db, 'users', user.uid, 'following', targetUserId);
      const followerRef = doc(db, 'users', targetUserId, 'followers', user.uid);
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      if (isFollowing) {
        // Unfollow
        await deleteDoc(followingRef);
        await deleteDoc(followerRef);
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
        setIsFollowing(false);
        toast.success(`Unfollowed ${targetUserName}`);
      } else {
        // Follow
        const followData = {
          userId: targetUserId,
          userName: targetUserName,
          followedAt: serverTimestamp(),
        };
        const followerData = {
          userId: user.uid,
          userName: userProfile?.displayName || '',
          userPhotoURL: userProfile?.photoURL || '',
          followedAt: serverTimestamp(),
        };

        await setDoc(followingRef, followData);
        await setDoc(followerRef, followerData);
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        setIsFollowing(true);
        toast.success(`Following ${targetUserName}`);

        // Notify the target user
        createNotification(targetUserId, 'follow', {
          message: `${userProfile?.displayName || 'Someone'} started following you.`,
          link: `/profile/${user.uid}`,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isOwnProfile || !user) return null;
  if (checkingStatus) return null;

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      onClick={handleFollow}
      loading={loading}
      className={className}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-3.5 w-3.5" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </Button>
  );
}

export default FollowButton;
