import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, deleteDoc, increment, serverTimestamp,
  collection, query, where, orderBy, getDocs, addDoc, setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal, ModalContent } from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowUpCircle, ArrowDownCircle, MessageSquare,
  Bookmark, BookmarkCheck, Share2, Edit, Trash2, Users, Clock,
  Eye, Calendar, Tag, Briefcase, Send, Reply, MoreHorizontal,
  ExternalLink, Copy, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { formatRelativeTime, formatDate, formatCount, cn } from '@/lib/utils';
import { CATEGORIES, IDEA_STATUSES, MAX_COMMENT_LENGTH } from '@/lib/constants';
import { createNotification } from '@/lib/notifications';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, scrollReveal } from '@/lib/animations';

function IdeaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Interaction states
  const [userVote, setUserVote] = useState(null); // 'up', 'down', or null
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Comment states
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});

  // Collab request
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabMessage, setCollabMessage] = useState('');
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  // Delete confirm
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Share
  const [showShareMenu, setShowShareMenu] = useState(false);

  const isOwner = user && idea?.ownerId === user.uid;
  const isTeamMember = team.some((m) => m.userId === user?.uid);

  // Fetch idea data
  useEffect(() => {
    fetchIdea();
  }, [id]);

  const fetchIdea = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'ideas', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        navigate('/404', { replace: true });
        return;
      }

      const ideaData = { id: docSnap.id, ...docSnap.data() };
      setIdea(ideaData);

      // Increment view count (fire and forget)
      if (user && user.uid !== ideaData.ownerId) {
        updateDoc(docRef, { viewsCount: increment(1) }).catch(() => {});
      }

      // Fetch team, comments, user interactions in parallel
      await Promise.all([
        fetchTeam(),
        fetchComments(),
        user ? fetchUserInteractions(ideaData) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error fetching idea:', error);
      toast.error('Failed to load idea.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const teamSnap = await getDocs(collection(db, 'ideas', id, 'team'));
      setTeam(teamSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const q = query(
        collection(db, 'ideas', id, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchUserInteractions = async (ideaData) => {
    try {
      // Check vote
      const voteRef = doc(db, 'ideas', id, 'votes', user.uid);
      const voteSnap = await getDoc(voteRef);
      if (voteSnap.exists()) {
        setUserVote(voteSnap.data().type);
      }

      // Check bookmark
      const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', id);
      const bookmarkSnap = await getDoc(bookmarkRef);
      setIsBookmarked(bookmarkSnap.exists());

      // Check collab request
      const collabQ = query(
        collection(db, 'ideas', id, 'requests'),
        where('userId', '==', user.uid)
      );
      const collabSnap = await getDocs(collabQ);
      if (!collabSnap.empty) {
        setExistingRequest({ id: collabSnap.docs[0].id, ...collabSnap.docs[0].data() });
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  // ---- VOTING ----
  const handleVote = async (type) => {
    if (!user) {
      toast.error('Please log in to vote.');
      return;
    }
    if (isOwner) {
      toast.error('You cannot vote on your own idea.');
      return;
    }
    setVoteLoading(true);
    try {
      const voteRef = doc(db, 'ideas', id, 'votes', user.uid);
      const ideaRef = doc(db, 'ideas', id);

      if (userVote === type) {
        // Remove vote
        await deleteDoc(voteRef);
        await updateDoc(ideaRef, {
          [type === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
        });
        setUserVote(null);
        setIdea((prev) => ({
          ...prev,
          [type === 'up' ? 'upvotes' : 'downvotes']: (prev[type === 'up' ? 'upvotes' : 'downvotes'] || 0) - 1,
        }));
      } else {
        // If switching vote
        const updates = {};
        if (userVote) {
          updates[userVote === 'up' ? 'upvotes' : 'downvotes'] = increment(-1);
        }
        updates[type === 'up' ? 'upvotes' : 'downvotes'] = increment(1);

        await setDoc(voteRef, { type, userId: user.uid, createdAt: serverTimestamp() });
        await updateDoc(ideaRef, updates);

        setIdea((prev) => {
          const newIdea = { ...prev };
          if (userVote) {
            newIdea[userVote === 'up' ? 'upvotes' : 'downvotes'] = (prev[userVote === 'up' ? 'upvotes' : 'downvotes'] || 0) - 1;
          }
          newIdea[type === 'up' ? 'upvotes' : 'downvotes'] = (prev[type === 'up' ? 'upvotes' : 'downvotes'] || 0) + 1;
          return newIdea;
        });
        setUserVote(type);

        // Notify idea owner about upvote (not downvote, and not yourself)
        if (type === 'up' && idea.ownerId && idea.ownerId !== user.uid) {
          createNotification(idea.ownerId, 'vote', {
            message: `${userProfile?.displayName || 'Someone'} upvoted your idea "${idea.title}".`,
            link: `/ideas/${id}`,
          });
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote.');
    } finally {
      setVoteLoading(false);
    }
  };

  // ---- BOOKMARKS ----
  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please log in to bookmark.');
      return;
    }
    setBookmarkLoading(true);
    try {
      const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', id);
      const ideaRef = doc(db, 'ideas', id);

      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        await updateDoc(ideaRef, { bookmarksCount: increment(-1) });
        setIsBookmarked(false);
        setIdea((prev) => ({ ...prev, bookmarksCount: (prev.bookmarksCount || 0) - 1 }));
        toast.success('Bookmark removed.');
      } else {
        await setDoc(bookmarkRef, {
          ideaId: id,
          ideaTitle: idea.title,
          ideaCategory: idea.category,
          ownerName: idea.ownerName,
          createdAt: serverTimestamp(),
        });
        await updateDoc(ideaRef, { bookmarksCount: increment(1) });
        setIsBookmarked(true);
        setIdea((prev) => ({ ...prev, bookmarksCount: (prev.bookmarksCount || 0) + 1 }));
        toast.success('Idea bookmarked!');
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark.');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ---- COMMENTS ----
  const handleSubmitComment = async (e, parentId = null) => {
    e.preventDefault();
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;
    if (!user) {
      toast.error('Please log in to comment.');
      return;
    }

    setCommentSubmitting(true);
    try {
      const commentData = {
        text: text.trim(),
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Anonymous',
        userPhotoURL: userProfile?.photoURL || user.photoURL || '',
        parentId: parentId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'ideas', id, 'comments'), commentData);
      await updateDoc(doc(db, 'ideas', id), { commentsCount: increment(1) });

      setIdea((prev) => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));

      // Notify the idea owner about the new comment (don't notify yourself)
      if (idea.ownerId && idea.ownerId !== user.uid) {
        createNotification(idea.ownerId, 'comment', {
          message: `${userProfile?.displayName || 'Someone'} commented on your idea "${idea.title}".`,
          link: `/ideas/${id}#comments`,
        });
      }

      if (parentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setCommentText('');
      }

      await fetchComments();
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, 'ideas', id, 'comments', commentId));
      await updateDoc(doc(db, 'ideas', id), { commentsCount: increment(-1) });
      setIdea((prev) => ({ ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) }));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted.');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment.');
    }
  };

  // ---- COLLABORATION REQUEST ----
  const handleCollabRequest = async (e) => {
    e.preventDefault();
    if (!collabMessage.trim()) return;
    setCollabSubmitting(true);
    try {
      await addDoc(collection(db, 'ideas', id, 'requests'), {
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Anonymous',
        userPhotoURL: userProfile?.photoURL || user.photoURL || '',
        userSkills: userProfile?.skills || [],
        message: collabMessage.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setExistingRequest({ status: 'pending' });
      setShowCollabModal(false);
      setCollabMessage('');
      toast.success('Collaboration request sent!');

      // Notify the idea owner about the collab request
      if (idea.ownerId && idea.ownerId !== user.uid) {
        createNotification(idea.ownerId, 'collaboration', {
          message: `${userProfile?.displayName || 'Someone'} requested to collaborate on "${idea.title}".`,
          link: `/dashboard`,
        });
      }
    } catch (error) {
      console.error('Error sending collab request:', error);
      toast.error('Failed to send request.');
    } finally {
      setCollabSubmitting(false);
    }
  };

  // ---- DELETE IDEA ----
  const handleDeleteIdea = async () => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'ideas', id));
      toast.success('Idea deleted successfully.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Failed to delete idea.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- SHARE ----
  const handleShare = (method) => {
    const url = window.location.href;
    const text = `Check out this idea: ${idea?.title}`;

    switch (method) {
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
    }
    setShowShareMenu(false);
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Helpers
  const category = CATEGORIES.find((c) => c.slug === idea?.category);
  const status = IDEA_STATUSES.find((s) => s.value === idea?.status);
  const netVotes = (idea?.upvotes || 0) - (idea?.downvotes || 0);

  // Separate top-level and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => comments.filter((c) => c.parentId === parentId);

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <Skeleton className="h-6 w-24 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Back button */}
      <motion.button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-6"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </motion.button>

      {/* Main Content */}
      <article>
        {/* Header */}
        <motion.div className="mb-6" {...fadeInUp}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {category && (
              <Badge variant="secondary">{category.name}</Badge>
            )}
            {status && (
              <Badge className={status.color}>{status.label}</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {idea.title}
          </h1>

          {/* Author & meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to={`/profile/${idea.ownerId}`}
              className="flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Avatar src={idea.ownerPhotoURL} name={idea.ownerName} size="sm" />
              <span className="font-medium">{idea.ownerName}</span>
            </Link>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(idea.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(idea.viewsCount || 0)} views
            </span>
          </div>
        </motion.div>

        {/* Action bar */}
        <motion.div
          className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b dark:border-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          {/* Votes */}
          <div className="flex items-center gap-1 rounded-lg border dark:border-gray-700 overflow-hidden">
            <motion.button
              onClick={() => handleVote('up')}
              disabled={voteLoading}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                userVote === 'up'
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'hover:bg-gray-50 text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <ArrowUpCircle className="h-4 w-4" />
              <span>{formatCount(idea.upvotes || 0)}</span>
            </motion.button>
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 px-2">{netVotes}</span>
            <motion.button
              onClick={() => handleVote('down')}
              disabled={voteLoading}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                userVote === 'down'
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : 'hover:bg-gray-50 text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <ArrowDownCircle className="h-4 w-4" />
              <span>{formatCount(idea.downvotes || 0)}</span>
            </motion.button>
          </div>

          {/* Bookmark */}
          <Button
            variant={isBookmarked ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleBookmark}
            disabled={bookmarkLoading}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {formatCount(idea.bookmarksCount || 0)}
          </Button>

          {/* Share */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowShareMenu(!showShareMenu)}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            {showShareMenu && (
              <div className="absolute top-full mt-1 right-0 z-10 w-48 rounded-lg border bg-white dark:bg-gray-900 shadow-lg py-1 animate-slide-down">
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" /> Copy Link
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4" /> Share on X
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4" /> Share on LinkedIn
                </button>
              </div>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => navigate(`/ideas/${id}/edit`)}>
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </motion.div>

        {/* Summary */}
        <motion.div
          className="mb-8"
          {...scrollReveal}
        >
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            {idea.summary}
          </p>
        </motion.div>

        {/* Description */}
        <motion.div
          className="mb-8"
          {...scrollReveal}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {idea.description}
          </div>
        </motion.div>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <motion.div className="mb-8" {...scrollReveal}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {idea.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/explore?search=${tag}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills Needed */}
        {idea.skillsNeeded && idea.skillsNeeded.length > 0 && (
          <motion.div className="mb-8" {...scrollReveal}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Skills Needed
            </h3>
            <div className="flex flex-wrap gap-2">
              {idea.skillsNeeded.map((skill) => (
                <Badge key={skill} variant="default">{skill}</Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Team Section */}
        <motion.div className="mb-8" {...scrollReveal}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4" /> Team ({team.length}/{idea.maxTeamSize || 5})
                </h3>
                {user && !isOwner && !isTeamMember && !existingRequest && (
                  <Button size="sm" onClick={() => setShowCollabModal(true)}>
                    Request to Join
                  </Button>
                )}
                {existingRequest && (
                  <Badge
                    variant={existingRequest.status === 'accepted' ? 'success' : existingRequest.status === 'rejected' ? 'destructive' : 'warning'}
                  >
                    Request {existingRequest.status}
                  </Badge>
                )}
              </div>

              {team.length > 0 ? (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {team.map((member) => (
                    <motion.div key={member.id} variants={staggerItem}>
                      <Link
                        to={`/profile/${member.userId}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <Avatar src={member.userPhotoURL} name={member.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
                        </div>
                        {member.skills && member.skills.length > 0 && (
                          <div className="hidden sm:flex gap-1">
                            {member.skills.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No team members yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Comments Section */}
        <motion.div className="mb-8" id="comments" {...scrollReveal}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Comments ({idea.commentsCount || 0})
          </h2>

          {/* Comment form */}
          {user ? (
            <form onSubmit={(e) => handleSubmitComment(e)} className="mb-6">
              <div className="flex gap-3">
                <Avatar src={userProfile?.photoURL || user.photoURL} name={userProfile?.displayName || user.displayName} size="sm" className="mt-1 shrink-0" />
                <div className="flex-1">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{commentText.length}/{MAX_COMMENT_LENGTH}</span>
                    <Button type="submit" size="sm" disabled={!commentText.trim()} loading={commentSubmitting}>
                      <Send className="h-3.5 w-3.5" /> Post
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <Card className="mb-6">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Log in</Link> to join the conversation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : topLevelComments.length > 0 ? (
            <motion.div
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {topLevelComments.map((comment) => {
                const replies = getReplies(comment.id);
                const showReplies = expandedReplies[comment.id];
                return (
                  <motion.div key={comment.id} variants={staggerItem}>
                    <CommentItem
                      comment={comment}
                      replies={replies}
                      showReplies={showReplies}
                      toggleReplies={toggleReplies}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      handleSubmitComment={handleSubmitComment}
                      handleDeleteComment={handleDeleteComment}
                      commentSubmitting={commentSubmitting}
                      user={user}
                      userProfile={userProfile}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </motion.div>
      </article>

      {/* Collab Request Modal */}
      <Modal open={showCollabModal} onOpenChange={setShowCollabModal}>
        <ModalContent title="Request to Collaborate" description="Tell the owner why you want to join this project.">
          <form onSubmit={handleCollabRequest} className="space-y-4">
            <div>
              <Textarea
                placeholder="Describe your skills and how you can contribute..."
                value={collabMessage}
                onChange={(e) => setCollabMessage(e.target.value)}
                className="min-h-[120px]"
                maxLength={500}
              />
              <span className="text-xs text-gray-400 mt-1 block">{collabMessage.length}/500</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCollabModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={collabSubmitting} disabled={!collabMessage.trim()}>
                Send Request
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ModalContent title="Delete Idea" description="This action cannot be undone.">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure you want to delete &quot;{idea.title}&quot;? All comments, votes, and collaboration requests will be permanently removed.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleteLoading} onClick={handleDeleteIdea}>
              Delete Permanently
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

// ---- Comment Item Component ----
function CommentItem({
  comment, replies, showReplies, toggleReplies, replyTo, setReplyTo,
  replyText, setReplyText, handleSubmitComment, handleDeleteComment,
  commentSubmitting, user, userProfile,
}) {
  const isAuthor = user && user.uid === comment.userId;

  return (
    <div className="group">
      <div className="flex gap-3">
        <Link to={`/profile/${comment.userId}`} className="shrink-0">
          <Avatar src={comment.userPhotoURL} name={comment.userName} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/profile/${comment.userId}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline">
              {comment.userName}
            </Link>
            <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {comment.text}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {user && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
              >
                <Reply className="h-3 w-3" /> Reply
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
              >
                {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <form onSubmit={(e) => handleSubmitComment(e, comment.id)} className="mt-3 flex gap-2">
              <Avatar
                src={userProfile?.photoURL || user?.photoURL}
                name={userProfile?.displayName || user?.displayName}
                size="xs"
                className="mt-1 shrink-0"
              />
              <div className="flex-1">
                <Textarea
                  placeholder={`Reply to ${comment.userName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] text-sm"
                  maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!replyText.trim()} loading={commentSubmitting}>
                    Reply
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 group/reply">
                  <Link to={`/profile/${reply.userId}`} className="shrink-0">
                    <Avatar src={reply.userPhotoURL} name={reply.userName} size="xs" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link to={`/profile/${reply.userId}`} className="text-xs font-medium text-gray-900 dark:text-white hover:underline">
                        {reply.userName}
                      </Link>
                      <span className="text-[10px] text-gray-400">{formatRelativeTime(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {reply.text}
                    </p>
                    {user && user.uid === reply.userId && (
                      <button
                        onClick={() => handleDeleteComment(reply.id)}
                        className="text-[10px] text-gray-400 hover:text-red-500 mt-1 opacity-0 group-hover/reply:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IdeaDetailPage;
