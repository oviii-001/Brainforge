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

  // UI states
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
    <div className="mx-auto max-w-[1024px] xl:max-w-[1100px] w-full px-4 sm:px-6 py-6 lg:py-8">
      {/* Back button */}
      <motion.button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft className="h-4 w-4" /> Back to explore
      </motion.button>

      {/* Main Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center">
        
        {/* Left Column: Post Feed */}
        <div className="flex-1 w-full min-w-0 max-w-full lg:max-w-[650px] space-y-4 lg:space-y-6">
          {/* Main Idea Post Card */}
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${idea.ownerId}`}>
                    <Avatar src={idea.ownerPhotoURL} name={idea.ownerName} size="sm" />
                  </Link>
                  <div className="flex flex-col">
                    <Link to={`/profile/${idea.ownerId}`} className="font-semibold text-gray-900 dark:text-white hover:underline text-sm">
                      {idea.ownerName}
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(idea.createdAt)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatCount(idea.viewsCount || 0)} views</span>
                    </div>
                  </div>
                </div>
                {/* Badges */}
                <div className="flex items-center gap-1.5">
                  {category && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none">
                      {category.name}
                    </Badge>
                  )}
                  {status && (
                    <Badge className={cn("px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md border-none", status.color)}>
                      {status.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="mb-4 mt-2">
                <h1 className="text-[18px] sm:text-[20px] font-bold text-gray-900 dark:text-gray-100 mb-2.5 leading-snug">
                  {idea.title}
                </h1>
                
                {idea.summary && (
                  <p className="text-[14px] text-gray-700 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-[#242526] p-3 rounded-xl border border-gray-100 dark:border-gray-800/60 leading-relaxed font-medium">
                    {idea.summary}
                  </p>
                )}
                {/* Description with Read More */}
                <div className="relative">
                  <div className={cn(
                    "text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed",
                    !isDescriptionExpanded && "line-clamp-[10]"
                  )}>
                    {idea.description}
                  </div>
                  {!isDescriptionExpanded && idea.description?.length > 400 && (
                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent dark:from-gray-900 pointer-events-none"></div>
                  )}
                </div>
                {idea.description?.length > 400 && (
                  <button 
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-1.5 text-[14px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:underline transition-colors"
                  >
                    {isDescriptionExpanded ? 'See less' : 'See more'}
                  </button>
                )}
              </div>

              {/* Requirements & Tags */}
              {(idea.tags?.length > 0 || idea.skillsNeeded?.length > 0) && (
                <div className="mt-4 mb-2 flex flex-col gap-2 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800/50">
                  {idea.skillsNeeded && idea.skillsNeeded.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> Skills:
                      </span>
                      {idea.skillsNeeded.map((skill) => (
                        <Badge key={skill} variant="outline" className="px-1.5 py-0 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-medium rounded-md text-[10px] sm:text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs mt-1">
                      <span className="font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" /> Tags:
                      </span>
                      {idea.tags.map((tag) => (
                        <Link key={tag} to={`/explore?search=${tag}`} className="font-medium text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded-md">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Horizontal Action Bar */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-full border border-gray-200/50 dark:border-gray-700/50 p-0.5">
                    <button onClick={() => handleVote('up')} disabled={voteLoading} className={cn("p-1 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 transition-colors font-medium text-xs sm:text-sm", userVote === 'up' ? "text-primary-700 bg-primary-100 dark:text-primary-400 dark:bg-primary-900/40" : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700")}>
                      <ArrowUpCircle className="h-4 w-4" />
                      <span>{formatCount(upvotes)}</span>
                    </button>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-0.5 sm:mx-1"></div>
                    <button onClick={() => handleVote('down')} disabled={voteLoading} className={cn("p-1 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 transition-colors font-medium text-xs sm:text-sm", userVote === 'down' ? "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/40" : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700")}>
                      <ArrowDownCircle className="h-4 w-4" />
                      <span>{formatCount(downvotes)}</span>
                    </button>
                    {(userVote === 'up' || userVote === 'down') && (
                      <>
                        <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-0.5 sm:mx-1"></div>
                        <span className="px-1.5 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">Net: {netVotes}</span>
                      </>
                    )}
                  </div>
                  
                  <Button variant="ghost" size="sm" className="rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 px-2 sm:px-3" onClick={() => document.getElementById('comment-input')?.focus()}>
                    <MessageSquare className="h-4 w-4 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    <span className="text-xs sm:text-sm font-medium">{idea.commentsCount || 0} <span className="hidden sm:inline">Comments</span></span>
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className={cn("rounded-full h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800", isBookmarked ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20" : "text-gray-600 dark:text-gray-400")} onClick={handleBookmark} disabled={bookmarkLoading}>
                    {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>

                  <div className="relative">
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setShowShareMenu(!showShareMenu)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {showShareMenu && (
                      <div className="absolute bottom-full right-0 mb-2 z-50 w-44 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl py-1 animate-in fade-in zoom-in-95">
                        <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <Copy className="h-3.5 w-3.5 text-gray-400" /> Copy Link
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-0.5"></div>
                        <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5 text-blue-400" /> Share on X
                        </button>
                        <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5 text-primary-600" /> LinkedIn
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Sidebar */}
        <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 space-y-4 lg:space-y-6">
          
          {/* Owner Actions */}
          {isOwner && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1.5 shadow-sm">
              <button 
                onClick={() => navigate(`/ideas/${id}/edit`)}
                className="flex flex-1 justify-center items-center gap-1.5 p-2 rounded-lg text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all"
                title="Edit Idea"
              >
                <Edit className="h-4 w-4 shrink-0" />
                <span>Edit</span>
              </button>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="flex flex-1 justify-center items-center gap-1.5 p-2 rounded-lg text-[13px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                title="Delete Idea"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Team Section */}
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Team Members
                </h3>
                <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {team.length}/{idea.maxTeamSize || 5}
                </span>
              </div>

              {team.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {team.map((member) => (
                    <Link
                      key={member.id}
                      to={`/profile/${member.userId}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                    >
                      <Avatar src={member.userPhotoURL} name={member.userName} size="sm" className="h-7 w-7" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate leading-tight">
                          {member.userName}
                        </p>
                        <p className="text-[10px] font-medium text-gray-400 capitalize leading-tight">{member.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 px-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 mb-3">
                  <p className="text-[11px] text-gray-500 font-medium">No team members yet.</p>
                </div>
              )}

              {/* Collab Request Button Area */}
              {user && !isOwner && !isTeamMember && !existingRequest && (
                <Button className="w-full rounded-lg h-8 text-[13px] font-semibold" onClick={() => setShowCollabModal(true)}>
                  Request to Join
                </Button>
              )}
              {existingRequest && (
                <div className={cn(
                  "flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold border",
                  existingRequest.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 
                  existingRequest.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 
                  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                )}>
                  {existingRequest.status === 'accepted' ? 'Request Accepted' : 
                   existingRequest.status === 'rejected' ? 'Request Declined' : 
                   'Request Pending'}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Comments Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-120px)] overflow-hidden" id="comments">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900 flex justify-between items-center z-10">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Discussion <span className="text-gray-500 font-medium text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">{idea.commentsCount || 0}</span>
              </h2>
            </div>
            
            {/* Comments list (Scrollable) */}
            <div className="p-3 overflow-y-auto flex-1 min-h-[min(300px,50vh)] space-y-4">
              {commentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-10 w-full rounded-2xl rounded-tl-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topLevelComments.length > 0 ? (
                <div className="space-y-4 pb-2">
                  {topLevelComments.map((comment) => {
                    const replies = getReplies(comment.id);
                    const showReplies = expandedReplies[comment.id];
                    return (
                      <CommentItem
                        key={comment.id}
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
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            {/* Comment form (Sticky Footer) */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              {user ? (
                <form onSubmit={(e) => handleSubmitComment(e)} className="flex gap-2.5">
                  <Avatar src={userProfile?.photoURL || user.photoURL} name={userProfile?.displayName || user.displayName} size="sm" className="shrink-0 h-8 w-8 mt-0.5" />
                  <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800/40 rounded-[20px] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus-within:border-gray-300 dark:focus-within:border-gray-500 transition-all p-1 shadow-sm">
                      <Textarea
                        id="comment-input"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        maxLength={MAX_COMMENT_LENGTH}
                        className="min-h-[36px] border-0 focus-visible:ring-0 shadow-none bg-transparent resize-y text-[13px] py-1.5 px-3 m-0"
                      />
                      {(commentText.length > 0 || commentSubmitting) && (
                        <div className="flex items-center justify-between px-3 pb-1 pt-0.5 fadeIn animate-in fade-in zoom-in-95 duration-200">
                          <span className="text-[10px] text-gray-400 font-medium">{commentText.length}/{MAX_COMMENT_LENGTH}</span>
                          <Button type="submit" size="sm" disabled={!commentText.trim()} loading={commentSubmitting} className="rounded-full h-7 px-3 text-[11px] font-bold shadow-sm">
                            <Send className="h-3 w-3 mr-1" /> Post
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-center">
                  <p className="text-[12px] text-gray-500 mb-2">Log in to share your thoughts.</p>
                  <Button asChild size="sm" className="rounded-full h-8 text-[12px] w-full">
                    <Link to="/login">Log In</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
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
    <div className="group flex gap-2.5 sm:gap-3 relative">
      <Link to={`/profile/${comment.userId}`} className="shrink-0 mt-0.5 z-10">
        <Avatar src={comment.userPhotoURL} name={comment.userName} size="sm" className="h-9 w-9 border-2 border-white dark:border-gray-900 shadow-sm" />
      </Link>
      
      <div className="flex-1 min-w-0 pb-1">
        <div className="bg-gray-100 dark:bg-gray-800/60 rounded-2xl rounded-tl-sm px-4 py-3 inline-block max-w-full">
          <Link to={`/profile/${comment.userId}`} className="text-[14px] font-bold text-gray-900 dark:text-white hover:underline block mb-0.5">
            {comment.userName}
          </Link>
          <p className="text-[14px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
            {comment.text}
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-1.5 px-2">
          <span className="text-[11px] text-gray-500 font-medium">{formatRelativeTime(comment.createdAt)}</span>
          {user && (
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="text-[12px] font-bold text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Reply
            </button>
          )}
          {isAuthor && (
            <button
              onClick={() => handleDeleteComment(comment.id)}
              className="text-[12px] font-bold text-gray-400 hover:text-red-500 dark:hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply input */}
        {replyTo === comment.id && (
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={(e) => handleSubmitComment(e, comment.id)} 
            className="mt-3 flex gap-2.5 overflow-hidden ml-1"
          >
            <Avatar
              src={userProfile?.photoURL || user?.photoURL}
              name={userProfile?.displayName || user?.displayName}
              size="sm"
              className="shrink-0 h-7 w-7 mt-1 border border-white dark:border-gray-800"
            />
            <div className="flex-1 bg-gray-50 dark:bg-gray-800/40 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700/50 p-1">
              <Textarea
                placeholder={`Reply to ${comment.userName}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[50px] text-[13px] border-0 bg-transparent focus-visible:ring-0 resize-none py-2 px-3 shadow-none focus-within:shadow-none"
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div className="flex justify-end gap-1.5 p-1 pt-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)} className="h-6 px-2.5 text-[11px] rounded-full text-gray-500 font-medium">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!replyText.trim()} loading={commentSubmitting} className="h-6 px-3 text-[11px] rounded-full font-bold">
                  Post
                </Button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2.5">
            {!showReplies ? (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:underline flex items-center gap-2 mb-2 ml-2 transition-colors"
              >
                <Reply className="h-3.5 w-3.5 rotate-180 text-gray-400" />
                View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3.5 relative mt-3"
              >
                <div className="absolute top-0 bottom-4 left-[-26px] sm:left-[-30px] border-l-2 border-gray-100 dark:border-gray-800 rounded-bl-xl w-4"></div>
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 flex items-center gap-1.5 mb-3 ml-2 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide replies
                </button>
                {replies.map((reply) => (
                  <div key={reply.id} className="group flex gap-2.5 ml-1 relative">
                    {/* curved corner pointing from main line to reply avatar */}
                    <div className="absolute top-4 left-[-31px] sm:left-[-35px] border-b-2 border-l-2 border-gray-100 dark:border-gray-800 rounded-bl-xl w-6 h-6"></div>
                    <Link to={`/profile/${reply.userId}`} className="shrink-0 mt-0.5 z-10">
                      <Avatar src={reply.userPhotoURL} name={reply.userName} size="sm" className="h-7 w-7 border-2 border-white dark:border-gray-900 shadow-sm" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 dark:bg-gray-800/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 inline-block max-w-full">
                        <Link to={`/profile/${reply.userId}`} className="text-[13px] font-bold text-gray-900 dark:text-white hover:underline block mb-0.5">
                          {reply.userName}
                        </Link>
                        <p className="text-[13px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                          {reply.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 px-2">
                        <span className="text-[10px] text-gray-500 font-medium">{formatRelativeTime(reply.createdAt)}</span>
                        {user && user.uid === reply.userId && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IdeaDetailPage;
