import { getMessagingInstance } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered successfully:', registration);
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'your-vapid-key'
      });
      
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      
      // Show toast notification for foreground messages
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
          max-w-md w-full bg-gradient-to-r from-pink-400 to-orange-400 
          shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-2xl">💖</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {payload.notification?.title || 'Your person just pinged you!'}
                </p>
                <p className="mt-1 text-sm text-orange-100">
                  {payload.notification?.body || 'Someone is thinking of you!'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-orange-300">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:text-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Close
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-center',
      });
      
      resolve(payload);
    });
  });
};

// Send notification to specific token (this would typically be done on your backend)
export const sendNotification = async (token, title, body, data = {}) => {
  try {
    // This is a placeholder - in a real app, you'd call your backend API
    // which would use the Firebase Admin SDK to send notifications
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title,
        body,
        data
      }),
    });
    
    if (response.ok) {
      console.log('Notification sent successfully');
      return true;
    } else {
      console.error('Failed to send notification');
      return false;
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

// Helper function to show local notifications (for immediate feedback)
export const showLocalNotification = (title, body, data = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'close-local',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data,
        actions: [
          {
            action: 'open',
            title: '💕 Open CLOSE'
          }
        ]
      });

      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing local notification:', error);
      return null;
    }
  }
  return null;
};

// Enhanced send notification that tries multiple methods
export const sendNotificationWithFallback = async (token, title, body, data = {}) => {
  try {
    // Try server-side notification first
    const response = await sendNotification(token, title, body, data);
    
    // If server notification fails or for immediate feedback, show local notification
    if (!response || window.location.hostname === 'localhost') {
      showLocalNotification(title, body, data);
    }
    
    return response;
  } catch (error) {
    console.error('Error in notification with fallback:', error);
    // Fallback to local notification
    showLocalNotification(title, body, data);
    return false;
  }
};
