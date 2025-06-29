import { ref, push, onValue, off, serverTimestamp, get, update } from 'firebase/database';
import { realtimeDb } from './firebase';
import { showLocalNotification } from './notifications';

// Send real-time notification through Firebase Realtime Database
export const sendRealtimeNotification = async (roomId, targetUserId, title, body, data = {}) => {
  try {
    if (!roomId || !targetUserId) {
      console.error('❌ Missing roomId or targetUserId for realtime notification');
      return false;
    }

    console.log('📡 Sending realtime notification:', { roomId, targetUserId, title });

    // Create notification data
    const notificationData = {
      title,
      body,
      data: {
        ...data,
        timestamp: Date.now(),
        delivered: false
      },
      targetUserId,
      roomId,
      createdAt: serverTimestamp()
    };

    // Push to realtime database
    const notificationsRef = ref(realtimeDb, `notifications/${roomId}`);
    await push(notificationsRef, notificationData);

    console.log('✅ Realtime notification sent successfully');
    return true;
  } catch (error) {
    console.error('💥 Error sending realtime notification:', error);
    return false;
  }
};

// Listen for incoming notifications for a specific user in a room
export const listenForNotifications = (roomId, userId, onNotificationReceived) => {
  if (!roomId || !userId) {
    console.error('❌ Missing roomId or userId for notification listener');
    return () => {};
  }

  console.log('👂 Setting up notification listener for:', { roomId, userId });

  const notificationsRef = ref(realtimeDb, `notifications/${roomId}`);
  
  const handleNotification = (snapshot) => {
    if (!snapshot.exists()) return;

    const notifications = snapshot.val();
    
    // Find undelivered notifications for this user
    Object.entries(notifications).forEach(([key, notification]) => {
      if (
        notification.targetUserId === userId && 
        !notification.data?.delivered &&
        notification.createdAt // Only process recent notifications
      ) {
        console.log('🔔 New notification received:', notification.title);
        
        // Show the notification
        showLocalNotification(
          notification.title,
          notification.body,
          notification.data
        );
        
        // Call the callback if provided
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
        
        // Mark as delivered (optional - could update in database)
        console.log('✅ Notification delivered to user');
      }
    });
  };

  // Start listening
  onValue(notificationsRef, handleNotification);

  // Return cleanup function
  return () => {
    console.log('🔇 Cleaning up notification listener');
    off(notificationsRef, 'value', handleNotification);
  };
};

// Clean up old notifications (older than 1 hour)
export const cleanupOldNotifications = async (roomId) => {
  try {
    const notificationsRef = ref(realtimeDb, `notifications/${roomId}`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) return;
    
    const notifications = snapshot.val();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const updates = {};
    Object.entries(notifications).forEach(([key, notification]) => {
      if (notification.data?.timestamp < oneHourAgo) {
        updates[key] = null; // Delete old notification
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(notificationsRef, updates);
      console.log('🧹 Cleaned up old notifications:', Object.keys(updates).length);
    }
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};
