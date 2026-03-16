import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, deleteDoc, increment, serverTimestamp,
  collection, query, where, orderBy, getDocs, addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useVote } from '@/hooks/useVote';
import { useBookmark } from '@/hooks/useBookmark';
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
  Bookmark, BookmarkCheck, Share2, Edit, Trash2, Users,
  Eye, Calendar, Tag, Briefcase, Send, Reply,
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

  // Custom Hooks for interaction
  const { userVote, netVotes, upvotes, downvotes, handleVote, voteLoading } = useVote(id, {
    initialUpvotes: idea?.upvotes || 0,
    initialDownvotes: idea?.downvotes || 0,
    ownerId: idea?.ownerId,
    ideaTitle: idea?.title,
  });

  const { isBookmarked, handleBookmark, bookmarkLoading } = useBookmark(id, {
    ideaTitle: idea?.title,
    ideaCategory: idea?.category,
    ownerName: idea?.ownerName,
  });

  // Fetch idea data
  useEffect(() => {
    fetchIdea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        user ? fetchCollabRequest() : Promise.resolve(),
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

  const fetchCollabRequest = async () => {
    if (!user) return;
    try {
      const collabQ = query(
        collection(db, 'ideas', id, 'requests'),
        where('userId', '==', user.uid)
      );
      const collabSnap = await getDocs(collabQ);
      if (!collabSnap.empty) {
        setExistingRequest({ id: collabSnap.docs[0].id, ...collabSnap.docs[0].data() });
      }
    } catch (error) {
      console.error('Error fetching collab request:', error);
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
      default:
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

  // Separate top-level and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => comments.filter((c) => c.parentId === parentId);

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-6 w-24 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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

      {/* Header Area */}
      <motion.div className="mb-8" {...fadeInUp}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {category && (
            <Badge variant="secondary">{category.name}</Badge>
          )}
          {status && (
            <Badge className={status.color}>{status.label}</Badge>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          {idea.title}
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-4xl">
          {idea.summary}
        </p>

        {/* Meta Line */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(idea.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatCount(idea.viewsCount || 0)} views
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {formatCount(idea.commentsCount || 0)} comments
          </span>
        </div>
      </motion.div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Description & Comments */}
        <div className="lg:col-span-2">
          {/* Description */}
          <motion.div className="mb-10 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm" {...scrollReveal}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">About this idea</h2>
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base">
              {idea.description}
            </div>
          </motion.div>

          {/* Comments Section */}
          <motion.div className="mb-8" id="comments" {...scrollReveal}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Discussion ({idea.commentsCount || 0})
            </h2>

            {/* Comment form */}
            {user ? (
              <form onSubmit={(e) => handleSubmitComment(e)} className="mb-8">
                <div className="flex gap-3">
                  <Avatar src={userProfile?.photoURL || user.photoURL} name={userProfile?.displayName || user.displayName} size="sm" className="mt-1 shrink-0" />
                  <div className="flex-1">
                    <Textarea
                      placeholder="Share your thoughts or feedback..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="min-h-[100px]"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">{commentText.length}/{MAX_COMMENT_LENGTH}</span>
                      <Button type="submit" disabled={!commentText.trim()} loading={commentSubmitting}>
                        <Send className="h-4 w-4" /> Post Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <Card className="mb-8 bg-gray-50 dark:bg-gray-800/50 border-dashed border-2">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Join the conversation to share your thoughts.
                  </p>
                  <Button asChild>
                    <Link to="/login">Log in to comment</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Comments list */}
            {commentsLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
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
                className="space-y-6"
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
              <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No comments yet. Be the first to share your thoughts!
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Action Bar Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                {/* Voting Row */}
                <div className="flex items-center justify-between p-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700/50">
                  <motion.button
                    onClick={() => handleVote('up')}
                    disabled={voteLoading}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex-1 flex justify-center items-center gap-2 py-2.5 rounded-md transition-colors font-medium',
                      userVote === 'up'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <ArrowUpCircle className="h-5 w-5" />
                    <span>{formatCount(upvotes)}</span>
                  </motion.button>
                  
                  <div className="px-4 text-center">
                    <span className="text-xs text-gray-400 font-medium tracking-wide uppercase block mb-0.5">Net</span>
                    <span className="font-bold text-gray-900 dark:text-white text-lg leading-none">{netVotes}</span>
                  </div>

                  <motion.button
                    onClick={() => handleVote('down')}
                    disabled={voteLoading}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex-1 flex justify-center items-center gap-2 py-2.5 rounded-md transition-colors font-medium',
                      userVote === 'down'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <ArrowDownCircle className="h-5 w-5" />
                    <span>{formatCount(downvotes)}</span>
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Bookmark Button */}
                  <Button
                    variant={isBookmarked ? 'secondary' : 'outline'}
                    className="w-full"
                    onClick={handleBookmark}
                    disabled={bookmarkLoading}
                  >
                    {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    {isBookmarked ? 'Saved' : 'Save'}
                  </Button>

                  {/* Share Menu */}
                  <div className="relative">
                    <Button variant="outline" className="w-full" onClick={() => setShowShareMenu(!showShareMenu)}>
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
                </div>

                {/* Owner Actions */}
                {isOwner && (
                  <div className="pt-3 mt-1 border-t dark:border-gray-800 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => navigate(`/ideas/${id}/edit`)}>
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Author Card */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Creator</h3>
              <div className="flex items-center gap-4">
                <Avatar src={idea.ownerPhotoURL} name={idea.ownerName} size="lg" className="border-2 border-white dark:border-gray-800 shadow-sm" />
                <div className="min-w-0">
                  <Link to={`/profile/${idea.ownerId}`} className="text-base font-bold text-gray-900 dark:text-white hover:underline truncate block">
                    {idea.ownerName}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Idea Owner</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t dark:border-gray-800">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/profile/${idea.ownerId}`}>View Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Team ({team.length}/{idea.maxTeamSize || 5})
                </h3>
              </div>

              {team.length > 0 ? (
                <div className="space-y-3 mb-5">
                  {team.map((member) => (
                    <Link
                      key={member.id}
                      to={`/profile/${member.userId}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <Avatar src={member.userPhotoURL} name={member.userName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{member.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                  No team members yet.
                </p>
              )}

              {/* Collab Request Button Area */}
              {user && !isOwner && !isTeamMember && !existingRequest && (
                <Button className="w-full" onClick={() => setShowCollabModal(true)}>
                  Request to Join Team
                </Button>
              )}
              {existingRequest && (
                <div className="w-full text-center">
                  <Badge
                    variant={existingRequest.status === 'accepted' ? 'success' : existingRequest.status === 'rejected' ? 'destructive' : 'warning'}
                    className="w-full justify-center py-1.5 text-sm"
                  >
                    Request {existingRequest.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements (Tags & Skills) */}
          {(idea.tags?.length > 0 || idea.skillsNeeded?.length > 0) && (
            <Card>
              <CardContent className="p-5 space-y-6">
                {idea.skillsNeeded && idea.skillsNeeded.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Skills Needed
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.skillsNeeded.map((skill) => (
                        <Badge key={skill} variant="secondary" className="font-normal border dark:border-gray-700">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {idea.tags && idea.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {idea.tags.map((tag) => (
                        <Link
                          key={tag}
                          to={`/explore?search=${tag}`}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 hover:underline"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Collab Request Modal */}
      <Modal open={showCollabModal} onOpenChange={setShowCollabModal}>
        <ModalContent title="Join the Team" description={`Tell ${idea.ownerName} how you can contribute to this idea.`}>
          <form onSubmit={handleCollabRequest} className="space-y-4">
            <div>
              <Textarea
                placeholder="Describe your relevant skills, experience, and why you're interested..."
                value={collabMessage}
                onChange={(e) => setCollabMessage(e.target.value)}
                className="min-h-[150px]"
                maxLength={500}
              />
              <span className="text-xs text-gray-400 mt-1 block">{collabMessage.length}/500</span>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-800">
              <Button type="button" variant="ghost" onClick={() => setShowCollabModal(false)}>
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
        <ModalContent title="Delete Idea" description="This action is permanent and cannot be undone.">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 mb-6">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-300">
              <p className="font-semibold mb-1">Are you sure you want to delete &quot;{idea.title}&quot;?</p>
              <p className="opacity-90">All comments, votes, bookmarks, and collaboration requests will be permanently removed.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleteLoading} onClick={handleDeleteIdea}>
              Delete Idea
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
    <div className="group bg-white dark:bg-gray-900/50 rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex gap-3 sm:gap-4">
        <Link to={`/profile/${comment.userId}`} className="shrink-0 mt-1">
          <Avatar src={comment.userPhotoURL} name={comment.userName} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link to={`/profile/${comment.userId}`} className="text-sm font-bold text-gray-900 dark:text-white hover:underline">
              {comment.userName}
            </Link>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-[15px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {comment.text}
          </p>
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800/50">
            {user && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-xs font-medium text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1.5 transition-colors"
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
              >
                {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-xs font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={(e) => handleSubmitComment(e, comment.id)} 
              className="mt-4 flex gap-3 overflow-hidden"
            >
              <Avatar
                src={userProfile?.photoURL || user?.photoURL}
                name={userProfile?.displayName || user?.displayName}
                size="sm"
                className="mt-1 shrink-0"
              />
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/30 p-1 rounded-lg border dark:border-gray-700/50">
                <Textarea
                  placeholder={`Reply to ${comment.userName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[80px] text-sm border-0 bg-transparent focus-visible:ring-0 resize-none"
                  maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="flex justify-end gap-2 p-2 border-t dark:border-gray-700/50">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!replyText.trim()} loading={commentSubmitting}>
                    Post Reply
                  </Button>
                </div>
              </div>
            </motion.form>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 pl-4 sm:pl-6 border-l-[3px] border-gray-100 dark:border-gray-800 space-y-4"
            >
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-3 group/reply bg-gray-50 dark:bg-gray-800/30 p-3 sm:p-4 rounded-xl">
                  <Link to={`/profile/${reply.userId}`} className="shrink-0 mt-0.5">
                    <Avatar src={reply.userPhotoURL} name={reply.userName} size="sm" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${reply.userId}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:underline">
                          {reply.userName}
                        </Link>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                      {user && user.uid === reply.userId && (
                        <button
                          onClick={() => handleDeleteComment(reply.id)}
                          className="text-[11px] font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover/reply:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[14px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                      {reply.text}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IdeaDetailPage;
