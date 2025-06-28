const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Service worker template
const swTemplate = `// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js');

// Initialize the Firebase app in the service worker
// This configuration is automatically generated from environment variables
const firebaseConfig = {
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
  databaseURL: "${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}",
  measurementId: "${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}"
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification?.title || '💖 Your person is thinking of you!';
  const notificationOptions = {
    body: payload.notification?.body || 'Someone just sent you love through CLOSE',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'close-ping',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200], // Custom vibration pattern
    sound: '/sounds/notification.mp3', // You can add a custom sound file
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type || 'ping',
      roomId: payload.data?.roomId || null,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '💕 Open CLOSE',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-72x72.png'
      }
    ],
    // Android specific options
    silent: false,
    renotify: true,
    sticky: false
  };

  // For Android, we can add additional notification enhancements
  if (payload.data?.type === 'ping') {
    notificationOptions.image = '/icons/icon-512x512.png';
    // Add hearts emoji to make it more expressive
    notificationOptions.body = \`💖 \${notificationOptions.body} 💖\`;
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open') {
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then(function(clientList) {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window/tab, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification, no action needed
    return;
  } else {
    // Default click action (no specific action button clicked)
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});
`;

// Write the generated service worker to public directory
const outputPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(outputPath, swTemplate);

console.log('✅ Firebase messaging service worker generated successfully!');
console.log('📝 Using environment variables from .env.local');
console.log('🔥 Firebase project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
