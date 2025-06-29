import { NextResponse } from 'next/server';

// This API route sends push notifications
// In production, this would use Firebase Admin SDK server-side
export async function POST(request) {
  try {
    const { token, title, body, data } = await request.json();

    // Validate required fields
    if (!token) {
      console.error('❌ Token is required for notification');
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    console.log('📨 Notification request received:', {
      token: token.substring(0, 20) + '...',
      title: title || 'Your person just pinged you 💖',
      body: body || 'Someone is thinking of you!',
      data: data || {}
    });

    // Here you would typically use Firebase Admin SDK to send the notification
    // For now, we'll simulate a successful response and rely on client-side fallbacks
    
    /*
    // PRODUCTION CODE - Uncomment and configure for production use:
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
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent message:', response);
    */

    // For development/demo purposes, we simulate success
    // The actual notification will be handled by client-side fallbacks
    console.log('✅ Notification API called successfully (using demo mode)');

    // In demo mode, we'll use a different approach:
    // The client will show local notifications immediately
    // and the service worker will handle background notifications
    
    // For testing, we can also try to send a message to all connected clients
    // This simulates what a real push notification would do
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      note: 'Demo mode: Client-side notifications will be shown. Configure Firebase Admin SDK for real push notifications.',
      token: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
      shouldTriggerClientNotification: true // Signal to client to show notification
    });

  } catch (error) {
    console.error('💥 Error sending notification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
