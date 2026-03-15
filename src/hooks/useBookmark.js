import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook for bookmarking ideas. Fetches user's bookmark state on mount.
 *
 * @param {string} ideaId - The Firestore idea document ID
 * @param {object} options - { ideaTitle, ideaCategory, ownerName }
 * @returns {{ isBookmarked, handleBookmark, bookmarkLoading }}
 */
export function useBookmark(ideaId, { ideaTitle, ideaCategory, ownerName } = {}) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Fetch user's bookmark state
  useEffect(() => {
    if (!user || !ideaId) { setFetched(true); return; }
    let cancelled = false;

    (async () => {
      try {
        const bookmarkSnap = await getDoc(doc(db, 'users', user.uid, 'bookmarks', ideaId));
        if (!cancelled) setIsBookmarked(bookmarkSnap.exists());
      } catch (error) {
        console.error('Error fetching bookmark:', error);
      } finally {
        if (!cancelled) setFetched(true);
      }
    })();

    return () => { cancelled = true; };
  }, [user, ideaId]);

  const handleBookmark = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to bookmark.');
      return;
    }
    setBookmarkLoading(true);
    try {
      const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', ideaId);
      const ideaRef = doc(db, 'ideas', ideaId);

      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        await updateDoc(ideaRef, { bookmarksCount: increment(-1) });
        setIsBookmarked(false);
        toast.success('Bookmark removed.');
      } else {
        await setDoc(bookmarkRef, {
          ideaId,
          ideaTitle: ideaTitle || '',
          ideaCategory: ideaCategory || '',
          ownerName: ownerName || '',
          createdAt: serverTimestamp(),
        });
        await updateDoc(ideaRef, { bookmarksCount: increment(1) });
        setIsBookmarked(true);
        toast.success('Idea bookmarked!');
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark.');
    } finally {
      setBookmarkLoading(false);
    }
  }, [user, ideaId, isBookmarked, ideaTitle, ideaCategory, ownerName]);

  return {
    isBookmarked,
    handleBookmark,
    bookmarkLoading,
    bookmarkFetched: fetched,
  };
}
