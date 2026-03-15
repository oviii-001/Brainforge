import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Create a notification for a target user.
 *
 * @param {string} targetUserId - The user who will receive the notification
 * @param {string} type - Notification type: 'comment' | 'collaboration' | 'vote' | 'idea' | 'follow'
 * @param {object} data - { message: string, link?: string }
 */
export async function createNotification(targetUserId, type, data) {
  // Never notify yourself
  if (!targetUserId || !type || !data?.message) return;

  try {
    await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
      type,
      message: data.message,
      link: data.link || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Notification creation should never block the primary action
    console.error('Error creating notification:', error);
  }
}
