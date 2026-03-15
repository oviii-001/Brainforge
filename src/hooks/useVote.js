import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/lib/notifications';
import { toast } from 'sonner';

/**
 * Hook for voting on ideas — supports upvote, downvote, switch, and remove.
 * Fetches the user's existing vote on mount.
 *
 * @param {string} ideaId - The Firestore idea document ID
 * @param {object} options - { ownerId, ownerName, ideaTitle }
 * @returns {{ userVote, netVotes, handleVote, voteLoading }}
 */
export function useVote(ideaId, { initialUpvotes = 0, initialDownvotes = 0, ownerId, ideaTitle } = {}) {
  const { user, userProfile } = useAuth();
  const [userVote, setUserVote] = useState(null); // 'up' | 'down' | null
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [voteLoading, setVoteLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Sync initial counts when props change (e.g. new idea loaded)
  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  // Fetch user's existing vote
  useEffect(() => {
    if (!user || !ideaId) { setFetched(true); return; }
    let cancelled = false;

    (async () => {
      try {
        const voteSnap = await getDoc(doc(db, 'ideas', ideaId, 'votes', user.uid));
        if (!cancelled && voteSnap.exists()) {
          setUserVote(voteSnap.data().type || null);
        }
      } catch (error) {
        console.error('Error fetching vote:', error);
      } finally {
        if (!cancelled) setFetched(true);
      }
    })();

    return () => { cancelled = true; };
  }, [user, ideaId]);

  const handleVote = useCallback(async (type) => {
    if (!user) {
      toast.error('Please log in to vote.');
      return;
    }
    if (ownerId && user.uid === ownerId) {
      toast.error('You cannot vote on your own idea.');
      return;
    }
    setVoteLoading(true);
    try {
      const voteRef = doc(db, 'ideas', ideaId, 'votes', user.uid);
      const ideaRef = doc(db, 'ideas', ideaId);

      if (userVote === type) {
        // Remove vote (toggle off)
        await deleteDoc(voteRef);
        await updateDoc(ideaRef, {
          [type === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
        });
        setUserVote(null);
        if (type === 'up') setUpvotes((v) => Math.max(0, v - 1));
        else setDownvotes((v) => Math.max(0, v - 1));
      } else {
        // New vote or switch
        const updates = {};
        if (userVote) {
          updates[userVote === 'up' ? 'upvotes' : 'downvotes'] = increment(-1);
          if (userVote === 'up') setUpvotes((v) => Math.max(0, v - 1));
          else setDownvotes((v) => Math.max(0, v - 1));
        }
        updates[type === 'up' ? 'upvotes' : 'downvotes'] = increment(1);
        if (type === 'up') setUpvotes((v) => v + 1);
        else setDownvotes((v) => v + 1);

        await setDoc(voteRef, { type, userId: user.uid, createdAt: serverTimestamp() });
        await updateDoc(ideaRef, updates);
        setUserVote(type);

        // Notify on upvote
        if (type === 'up' && ownerId && ownerId !== user.uid) {
          createNotification(ownerId, 'vote', {
            message: `${userProfile?.displayName || 'Someone'} upvoted your idea "${ideaTitle || 'Untitled'}".`,
            link: `/ideas/${ideaId}`,
          });
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote.');
    } finally {
      setVoteLoading(false);
    }
  }, [user, userProfile, ideaId, userVote, ownerId, ideaTitle]);

  return {
    userVote,
    upvotes,
    downvotes,
    netVotes: upvotes - downvotes,
    handleVote,
    voteLoading,
    voteFetched: fetched,
  };
}
