import { NextResponse } from 'next/server';

// This is a placeholder API route for sending notifications
// In a production app, you would use Firebase Admin SDK here
export async function POST(request) {
  try {
    const { token, title, body, data } = await request.json();

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Here you would typically use Firebase Admin SDK to send the notification
    // For this demo, we'll simulate the notification and use Web Push API
    console.log('Notification request:', {
      token,
      title: title || 'Your person just pinged you 💖',
      body: body || 'Someone is thinking of you!',
      data: data || {}
    });

    // In a real implementation, you would use Firebase Admin SDK:
    /*
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    const message = {
      notification: {
        title: title || 'Your person just pinged you 💖',
        body: body || 'Someone is thinking of you!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      },
      data: {
        type: data?.type || 'ping',
        roomId: data?.roomId || '',
        url: data?.url || '/',
        click_action: data?.url || '/'
      },
      token: token,
      webpush: {
        fcmOptions: {
          link: data?.url || '/'
        },
        notification: {
          requireInteraction: true,
          vibrate: [200, 100, 200],
          actions: [
            {
              action: 'open',
              title: '💕 Open CLOSE'
            }
          ]
        }
      },
      android: {
        notification: {
          sound: 'default',
          clickAction: data?.url || '/',
          channelId: 'close_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    */

    // For demo purposes, we'll use a client-side notification fallback
    // In production, remove this and use the Firebase Admin SDK above
    try {
      // Try to show a local notification as fallback
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title || 'Your person just pinged you 💖', {
            body: body || 'Someone is thinking of you!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'close-ping',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: data
          });
        }
      }
    } catch (localNotificationError) {
      console.log('Local notification fallback failed:', localNotificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      note: 'Using demo implementation - in production, use Firebase Admin SDK'
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
