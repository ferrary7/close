import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebaseAdmin';

// This API route sends real push notifications using Firebase Admin SDK
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

    console.log('📨 Push notification request received:', {
      token: token.substring(0, 20) + '...',
      title: title || 'Your person just pinged you 💖',
      body: body || 'Someone is thinking of you!',
      data: data || {}
    });

    // Send real push notification using Firebase Admin SDK
    const result = await sendPushNotification(
      token,
      title || 'Your person just pinged you 💖',
      body || 'Someone is thinking of you!',
      data || {}
    );

    if (result.success) {
      console.log('✅ Push notification sent successfully:', result.messageId);
      return NextResponse.json({
        success: true,
        message: 'Push notification sent successfully',
        messageId: result.messageId,
        token: token.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Push notification failed:', result.error);
      
      // Return partial success - client will handle fallback
      return NextResponse.json({
        success: false,
        message: 'Push notification failed, using fallback',
        error: result.error,
        token: token.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
        shouldTriggerClientNotification: true // Signal client to show local notification
      }, { status: 206 }); // 206 = Partial Content (partial success)
    }

  } catch (error) {
    console.error('💥 Error sending push notification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send push notification',
        details: error.message,
        timestamp: new Date().toISOString(),
        shouldTriggerClientNotification: true // Signal client to show fallback notification
      },
      { status: 500 }
    );
  }
}
