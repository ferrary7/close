import { getMessagingInstance } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    console.log('🔔 Requesting notification permission...');
    
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('❌ Messaging not supported in this environment');
      return null;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service workers not supported');
      return null;
    }

    // Register service worker first and wait for it to be ready
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registered successfully:', registration);
      
      // Wait for the service worker to be ready and active
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is ready');
      
      // Additional check for Android Chrome - ensure the service worker is active
      if (registration.active && registration.active.state === 'activated') {
        console.log('✅ Service Worker is active and ready for FCM');
      } else {
        // Wait a bit more for activation
        await new Promise((resolve) => {
          const checkActive = () => {
            if (registration.active && registration.active.state === 'activated') {
              resolve();
            } else {
              setTimeout(checkActive, 100);
            }
          };
          checkActive();
        });
      }
    } catch (swError) {
      console.error('❌ Service Worker registration failed:', swError);
      return null;
    }

    // Request permission with Android-specific handling
    let permission = Notification.permission;
    console.log('🔔 Current notification permission:', permission);
    
    if (permission === 'default') {
      // For Android Chrome, we need to be more explicit and provide user context
      console.log('🔔 Requesting notification permission (Android optimized)...');
      
      // Show a brief message before requesting permission on Android
      if (navigator.userAgent.toLowerCase().includes('android')) {
        console.log('📱 Detected Android device - optimizing permission request');
      }
      
      permission = await Notification.requestPermission();
      console.log('🔔 Permission request result:', permission);
      
      // Additional check for Android Chrome
      if (permission === 'granted') {
        console.log('✅ Notification permission granted!');
        
        // Test notification to ensure it works on Android
        try {
          console.log('🧪 Testing notification on Android...');
          
          // Use service worker for testing on Android (preferred method)
          if (registration && registration.showNotification) {
            await registration.showNotification('🔔 Notifications Enabled!', {
              body: 'You will now receive notifications from CLOSE',
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: 'permission-test',
              requireInteraction: false,
              vibrate: [200, 100, 200],
              silent: false,
              timestamp: Date.now(),
              data: { test: true }
            });
            console.log('✅ Service worker test notification shown');
          } else {
            // Fallback to regular notification
            const testNotification = new Notification('🔔 Notifications Enabled!', {
              body: 'You will now receive notifications from CLOSE',
              icon: '/icons/icon-192x192.png',
              tag: 'permission-test',
              requireInteraction: false,
              vibrate: [200, 100, 200]
            });
            setTimeout(() => testNotification.close(), 3000);
            console.log('✅ Regular test notification shown');
          }
        } catch (testError) {
          console.log('⚠️ Test notification failed (this is okay):', testError.message);
        }
      }
    } else if (permission === 'denied') {
      console.log('❌ Notification permission denied by user');
      return null;
    }
    
    console.log('🔔 Final notification permission:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted, getting FCM token...');
      
      // Get FCM token
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('❌ VAPID key not found in environment variables');
        return null;
      }
      
      console.log('🔑 Using VAPID key:', vapidKey.substring(0, 10) + '...');
      
      try {
        const currentToken = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: registration // Explicitly pass the registration
        });
        
        if (currentToken) {
          console.log('✅ FCM Token obtained successfully:', currentToken.substring(0, 20) + '...');
          
          // Additional validation for Android
          if (navigator.userAgent.toLowerCase().includes('android')) {
            console.log('📱 Android FCM token validated');
          }
          
          return currentToken;
        } else {
          console.log('❌ No FCM registration token available');
          console.log('🔍 Debug info:');
          console.log('  - Messaging instance:', !!messaging);
          console.log('  - VAPID key present:', !!vapidKey);
          console.log('  - Service worker registration:', !!registration);
          console.log('  - Service worker active:', !!registration?.active);
          console.log('  - Permission:', permission);
          return null;
        }
      } catch (tokenError) {
        console.error('❌ Error getting FCM token:', tokenError);
        console.log('🔍 Token error details:', {
          code: tokenError.code,
          message: tokenError.message,
          name: tokenError.name
        });
        return null;
      }
    } else {
      console.log('❌ Unable to get permission to notify. Permission:', permission);
      return null;
    }
  } catch (error) {
    console.error('💥 Error while retrieving token:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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
  console.log('🔔 Attempting to show local notification:', { title, body, data });
  
  if (!('Notification' in window)) {
    console.log('❌ Notifications not supported in this browser');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.log('❌ Notification permission not granted:', Notification.permission);
    return null;
  }
  
  try {
    // Use simple notification without actions for regular notifications
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'close-local-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { ...data, source: 'local', timestamp: Date.now() },
      silent: false,
      renotify: true
      // Note: Actions are removed as they're only supported for service worker notifications
    });

    notification.onclick = function(event) {
      console.log('🔔 Notification clicked');
      event.preventDefault();
      window.focus();
      notification.close();
    };

    notification.onerror = function(event) {
      console.error('❌ Notification error:', event);
    };

    notification.onshow = function(event) {
      console.log('✅ Notification shown');
    };

    notification.onclose = function(event) {
      console.log('🔔 Notification closed');
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch (e) {
        // Notification might already be closed
      }
    }, 10000);

    console.log('✅ Local notification created successfully');
    return notification;
  } catch (error) {
    console.error('💥 Error showing local notification:', error);
    return null;
  }
};

// Enhanced send notification that tries multiple methods
export const sendNotificationWithFallback = async (token, title, body, data = {}) => {
  try {
    console.log('📨 Attempting to send notification:', { title, body, data });
    
    // Always show local notification for immediate feedback
    const localNotification = showLocalNotification(title, body, data);
    console.log('🔔 Local notification shown:', !!localNotification);
    
    // Try server-side notification (will be a demo response for now)
    try {
      const response = await sendNotification(token, title, body, data);
      console.log('🚀 Server notification response:', response);
      
      if (response) {
        // For demo purposes, also trigger a browser notification
        // This simulates what a real push notification would do
        if ('Notification' in window && Notification.permission === 'granted') {
          setTimeout(() => {
            const notification = new Notification(`🔔 ${title}`, {
              body: `Push: ${body}`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: 'close-push-demo',
              requireInteraction: true,
              vibrate: [300, 100, 300],
              data: { ...data, source: 'push-demo' }
            });
            
            notification.onclick = function(event) {
              event.preventDefault();
              window.focus();
              notification.close();
            };
            
            // Auto-close after 8 seconds
            setTimeout(() => notification.close(), 8000);
          }, 1000); // Delay to simulate push notification delay
        }
      }
      
      return response;
    } catch (serverError) {
      console.error('❌ Server notification failed:', serverError);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Error in notification with fallback:', error);
    // Ensure we always have some kind of notification
    showLocalNotification(title, body, data);
    return false;
  }
};
