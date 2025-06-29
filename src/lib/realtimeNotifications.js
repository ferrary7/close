import { ref, push, onValue, off, serverTimestamp, get, update } from 'firebase/database';
import { realtimeDb } from './firebase';
import { showLocalNotification } from './notifications';

// Android-optimized notification function
const showAndroidOptimizedNotification = (title, body, data = {}) => {
  console.log('📱 Showing Android-optimized notification:', { title, body });
  
  // Check if we have permission
  if (Notification.permission !== 'granted') {
    console.log('❌ Notification permission not granted');
    return;
  }
  
  // For Android Chrome, we need to ensure the notification shows properly
  try {
    // First try with service worker registration (best for Android)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'close-realtime-' + Date.now(),
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: {
            ...data,
            source: 'realtime',
            timestamp: Date.now()
          },
          actions: [
            {
              action: 'open',
              title: '💕 Open CLOSE'
            }
          ],
          // Android-specific optimizations
          silent: false,
          renotify: true,
          sticky: false
        });
        console.log('✅ Service worker notification shown');
      }).catch(error => {
        console.log('⚠️ Service worker notification failed, falling back to regular notification');
        // Fallback to regular notification
        showLocalNotification(title, body, data);
      });
    } else {
      // Fallback for browsers without service worker support
      showLocalNotification(title, body, data);
    }
  } catch (error) {
    console.error('💥 Error showing Android notification:', error);
    // Ultimate fallback
    showLocalNotification(title, body, data);
  }
};

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
        
        // Show notification with Android-optimized settings
        showAndroidOptimizedNotification(
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
