import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc, getDoc, collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, serverTimestamp, limit, startAfter, getDocs,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MessageThread from '@/features/messaging/MessageThread';
import MessageInput from '@/features/messaging/MessageInput';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { fadeInUp, scaleIn } from '@/lib/animations';

const MESSAGES_PER_PAGE = 50;

function ConversationPage() {
  const { id: conversationId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const otherUserId = conversation?.participants?.find((p) => p !== user?.uid);
  const otherUser = conversation?.participantDetails?.[otherUserId] || {};

  // Fetch conversation metadata
  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchConversation = async () => {
      try {
        const convDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (!convDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const convData = { id: convDoc.id, ...convDoc.data() };

        // Verify user is a participant
        if (!convData.participants.includes(user.uid)) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setConversation(convData);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast.error('Failed to load conversation');
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, user]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!conversation) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);

      // Mark conversation as read by this user
      markAsRead();
    }, (error) => {
      console.error('Error listening to messages:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [conversation]);

  // Mark as read whenever messages update from the other user
  const markAsRead = async () => {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`readBy.${user.uid}`]: true,
      });
    } catch (error) {
      // Non-critical — silently ignore
      console.error('Error marking as read:', error);
    }
  };

  // Send a message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !conversation) return;

    try {
      // Add message to subcollection
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: user.uid,
        text: text.trim(),
        read: false,
        createdAt: serverTimestamp(),
      });

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.trim().length > 100 ? text.trim().slice(0, 100) + '...' : text.trim(),
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        // Reset readBy: sender has read, other hasn't
        readBy: {
          [user.uid]: true,
          [otherUserId]: false,
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error; // Re-throw so MessageInput can handle it
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Conversation not found or you don't have access.
          </p>
          <Link
            to="/messages"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-medium"
          >
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col"
        style={{ height: 'calc(100vh - 8rem)' }}
        initial={scaleIn.initial}
        animate={scaleIn.animate}
        transition={scaleIn.transition}
      >
        {/* Conversation header */}
        <motion.div
          className="flex items-center gap-3 px-4 py-3 border-b dark:border-gray-800 shrink-0"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.1 }}
        >
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <Link
            to={`/profile/${otherUserId}`}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Avatar src={otherUser.photoURL} name={otherUser.displayName} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {otherUser.displayName || 'Unknown User'}
              </p>
            </div>
          </Link>
        </motion.div>

        {/* Messages area */}
        <MessageThread
          messages={messages}
          currentUserId={user.uid}
          otherUser={otherUser}
        />

        {/* Input area */}
        <MessageInput onSend={handleSendMessage} />
      </motion.div>
    </div>
  );
}

export default ConversationPage;
