// Firebase Admin SDK configuration for server-side notifications
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp = null;

// Initialize Firebase Admin SDK
export const initializeFirebaseAdmin = () => {
  if (!adminApp && getApps().length === 0) {
    try {
      // Check if we have the required environment variables
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.warn('⚠️ Firebase Admin SDK credentials not found. Push notifications will use fallback mode.');
        return null;
      }

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
      return adminApp;
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
      return null;
    }
  }
  
  return adminApp || getApps()[0];
};

// Send push notification using Firebase Admin SDK
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    const app = initializeFirebaseAdmin();
    if (!app) {
      console.log('⚠️ Firebase Admin SDK not available, skipping server push notification');
      return { success: false, error: 'Admin SDK not configured' };
    }

    const messaging = getMessaging(app);

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        // Convert all data values to strings (FCM requirement)
        type: String(data.type || 'ping'),
        roomId: String(data.roomId || ''),
        url: String(data.url || '/'),
        timestamp: String(Date.now()),
        fromUser: String(data.fromUser || ''),
        source: 'fcm-admin'
      },
      token,
      webpush: {
        fcmOptions: {
          link: data.url || '/',
        },
        headers: {
          TTL: '300', // 5 minutes TTL
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          tag: 'close-ping-' + Date.now(),
          renotify: true,
          silent: false,
          timestamp: Date.now(),
          actions: [
            {
              action: 'open',
              title: '💕 Open CLOSE',
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        }
      },
      android: {
        notification: {
          icon: '/icons/icon-192x192.png',
          channelId: 'close_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: false,
          vibrateTimings: ['200ms', '100ms', '200ms', '100ms', '200ms'],
          notificationPriority: 'PRIORITY_HIGH',
          visibility: 'PUBLIC',
          sticky: false,
          localOnly: false,
          clickAction: data.url || '/',
          tag: 'close-ping'
        },
        priority: 'high',
        ttl: 3600000, // 1 hour
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      }
    };

    // Add image for ping notifications
    if (data.type === 'ping') {
      message.webpush.notification.image = '/icons/icon-512x512.png';
      if (message.android && message.android.notification) {
        message.android.notification.imageUrl = '/icons/icon-512x512.png';
      }
    }

    console.log('📤 [Admin] Sending FCM push notification:', {
      token: token.substring(0, 20) + '...',
      title,
      body
    });

    const response = await messaging.send(message);
    console.log('✅ [Admin] FCM push notification sent successfully:', response);

    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ [Admin] FCM push notification failed:', error);
    
    // Detailed error logging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    
    return { success: false, error: error.message || 'Failed to send push notification' };
  }
};

// Send notification to multiple tokens
export const sendMulticastPushNotification = async (tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    const app = initializeFirebaseAdmin();
    if (!app) {
      console.log('⚠️ Firebase Admin SDK not available, skipping multicast push notification');
      return { success: false, error: 'Admin SDK not configured' };
    }

    const messaging = getMessaging(app);

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type: String(data.type || 'ping'),
        roomId: String(data.roomId || ''),
        url: String(data.url || '/'),
        timestamp: String(Date.now()),
        fromUser: String(data.fromUser || ''),
        source: 'fcm-admin-multi'
      },
      tokens,
      webpush: {
        fcmOptions: {
          link: data.url || '/',
        },
        headers: {
          TTL: '300',
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          tag: 'close-ping-' + Date.now(),
          renotify: true,
          silent: false
        }
      },
      android: {
        notification: {
          icon: '/icons/icon-192x192.png',
          channelId: 'close_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          notificationPriority: 'PRIORITY_HIGH',
          visibility: 'PUBLIC',
          clickAction: data.url || '/'
        },
        priority: 'high',
        ttl: 3600000
      }
    };

    console.log('📤 [Admin] Sending multicast FCM push notification to', tokens.length, 'tokens');

    const response = await messaging.sendMulticast(message);
    
    console.log('✅ [Admin] Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });

    if (response.failureCount > 0) {
      console.log('⚠️ [Admin] Some notifications failed:', response.responses);
    }

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('❌ [Admin] Multicast FCM push notification failed:', error);
    return { success: false, error: error.message || 'Failed to send multicast notification' };
  }
};
