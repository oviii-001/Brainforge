import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, getDocs,
  serverTimestamp, doc, getDoc,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ConversationList from '@/features/messaging/ConversationList';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { MessageCircle, ArrowRight, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

function MessagesPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Check for ?user= param to start a new conversation
  const targetUserId = searchParams.get('user');

  // Listen to conversations in real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const convos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConversations(convos);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to conversations:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Handle ?user= param — find or create conversation with target user
  useEffect(() => {
    if (!targetUserId || !user || loading) return;
    if (targetUserId === user.uid) {
      toast.error("You can't message yourself");
      navigate('/messages', { replace: true });
      return;
    }

    handleStartConversation(targetUserId);
  }, [targetUserId, user, loading]);

  const handleStartConversation = async (otherUserId) => {
    try {
      // Check if a conversation already exists
      const existing = conversations.find(
        (c) => c.participants.includes(otherUserId)
      );
      if (existing) {
        navigate(`/messages/${existing.id}`, { replace: true });
        return;
      }

      // Fetch the other user's profile
      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      if (!otherUserDoc.exists()) {
        toast.error('User not found');
        navigate('/messages', { replace: true });
        return;
      }
      const otherUserData = otherUserDoc.data();

      // Create new conversation
      const convRef = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, otherUserId],
        participantDetails: {
          [user.uid]: {
            displayName: userProfile?.displayName || 'User',
            photoURL: userProfile?.photoURL || null,
          },
          [otherUserId]: {
            displayName: otherUserData.displayName || 'User',
            photoURL: otherUserData.photoURL || null,
          },
        },
        lastMessage: null,
        lastMessageAt: serverTimestamp(),
        lastSenderId: null,
        readBy: {},
        createdAt: serverTimestamp(),
      });

      navigate(`/messages/${convRef.id}`, { replace: true });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const otherUserId = conv.participants.find((p) => p !== user.uid);
    const otherUser = conv.participantDetails?.[otherUserId] || {};
    return (otherUser.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Search conversations */}
      {conversations.length > 0 && (
        <motion.div
          className="relative mb-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.1 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Start a conversation by visiting someone's profile and clicking the Message button."
          action={
            <Link to="/explore">
              <Button>
                Explore Ideas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        />
      ) : filteredConversations.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No conversations found"
          description="Try a different search term."
        />
      ) : (
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.15 }}
        >
          <ConversationList
            conversations={filteredConversations}
            activeId={null}
            currentUserId={user.uid}
          />
        </motion.div>
      )}
    </div>
  );
}

export default MessagesPage;
