// pages/index.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { onAuthStateChange, signInAnonymous } from '@/lib/auth';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  updateRoomPhoto,
  updateRoomEmoji,
  sendPing,
  subscribeToRoom
} from '@/lib/roomUtils';
import { updateUserTokenInRoom } from '@/lib/tokenUtils';
import { listenForNotifications } from '@/lib/realtimeNotifications';
import {
  requestNotificationPermission,
  onMessageListener
} from '@/lib/notifications';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import RoomForm from '@/components/RoomForm';
import PhotoGallery from '@/components/PhotoGallery';
import EmojiSelector from '@/components/EmojiSelector';
import PingButton from '@/components/PingButton';
import LoadingScreen from '@/components/Loading';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { FiSettings, FiLogOut, FiShare, FiCopy } from 'react-icons/fi';

function HomeContent() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for room ID in URL on component mount
  useEffect(() => {
    const roomIdFromUrl = searchParams.get('room');
    if (roomIdFromUrl && !room && user) {
      // Store the room ID from URL but don't auto-join
      // The user will need to enter the password in the form
      console.log('🔗 Room ID found in URL:', roomIdFromUrl);
    }
  }, [searchParams, room, user]);

  useEffect(() => {
    let unsubscribeAuth;

    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing app...');
        unsubscribeAuth = onAuthStateChange(async (user) => {
          console.log('🔐 Auth state changed:', user ? `User: ${user.uid}` : 'No user');
          setUser(user);
          if (user) {
            const token = await requestNotificationPermission();
            setUserToken(token);
            onMessageListener().catch(console.error);
          }
          setIsLoading(false);
        });

        console.log('🚀 Attempting anonymous sign-in...');
        const currentUser = await signInAnonymous();
        console.log('🔑 Anonymous sign-in result:', currentUser);
        if (!currentUser.success) {
          console.error('❌ Failed to sign in anonymously:', currentUser.error);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('💥 Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Update user token in room when token or room changes
  useEffect(() => {
    if (userToken && room && user) {
      console.log('🔄 Updating user token in room:', room);
      updateUserTokenInRoom(room, user.uid, userToken);
    }
  }, [userToken, room, user]);

  useEffect(() => {
    let unsubscribeRoom;
    let unsubscribePhotos;
    let unsubscribeNotifications;

    if (room && user) {
      unsubscribeRoom = subscribeToRoom(room, (data) => {
        setRoomData(data);
        if (!data) {
          setRoom(null);
          setRoomData(null);
          setPhotos([]);
          toast.error('Room no longer exists');
        }
      });

      // Subscribe to photos in Realtime Database
      const photosRef = ref(realtimeDb, `rooms/${room}/photos`);
      unsubscribePhotos = onValue(photosRef, (snapshot) => {
        const photosData = snapshot.val();
        if (photosData) {
          const photosArray = Object.entries(photosData).map(([id, data]) => ({
            id,
            ...data
          }));
          // Sort by upload time, newest first
          photosArray.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
          setPhotos(photosArray);
        } else {
          setPhotos([]);
        }
      });

      // Listen for real-time notifications
      unsubscribeNotifications = listenForNotifications(room, user.uid, (notification) => {
        console.log('🔔 Received real-time notification:', notification.title);
        // Additional handling if needed
        toast.success('💖 New notification received!');
      });
    }

    return () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribePhotos) off(ref(realtimeDb, `rooms/${room}/photos`), 'value', unsubscribePhotos);
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [room, user]);

  // Cleanup when user closes browser/tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (room && user) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        const cleanupData = JSON.stringify({
          roomId: room,
          userId: user.uid,
          userToken: userToken
        });
        
        // This will be handled by a simple cleanup endpoint if we had one
        // For now, we'll rely on the existing leaveRoom function
        leaveRoom(room, user.uid, userToken).catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && room && user) {
        // User switched away from tab - optional cleanup
        // We can choose to be less aggressive here
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [room, user, userToken]);

  // Update page title when room data changes
  useEffect(() => {
    if (roomData?.name) {
      document.title = `${roomData.name} - CLOSE`;
    } else {
      document.title = 'CLOSE - Stay Connected';
    }
  }, [roomData]);

  // Real-time ping notification listener
  useEffect(() => {
    if (!roomData || !user) return;

    let lastPingCount = roomData.pingHistory?.length || 0;
    console.log('Setting up ping listener. Current ping count:', lastPingCount);

    const checkForNewPings = () => {
      if (roomData.pingHistory && roomData.pingHistory.length > lastPingCount) {
        const newPings = roomData.pingHistory.slice(lastPingCount);
        console.log('New pings detected:', newPings);
        
        newPings.forEach(ping => {
          console.log('Processing ping from:', ping.from, 'Current user:', user.uid);
          
          // Only show notification if ping is from someone else
          if (ping.from !== user.uid) {
            console.log('New ping received from partner! Showing notification...');
            
            // Show local notification immediately
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('💖 Your person is thinking of you!', {
                body: `Someone just sent you love through ${roomData.name}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'close-ping',
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
                data: {
                  type: 'ping',
                  roomId: room,
                  timestamp: Date.now()
                }
              });
              console.log('Native notification created');
            } else {
              console.log('Notification permission not granted or not supported');
            }
            
            // Also show toast notification
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
                        Your person just pinged you!
                      </p>
                      <p className="mt-1 text-sm text-orange-100">
                        Someone is thinking of you!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ), {
              duration: 5000,
              position: 'top-center',
            });
            console.log('Toast notification shown');
          } else {
            console.log('Ping is from current user, not showing notification');
          }
        });
        
        lastPingCount = roomData.pingHistory.length;
        console.log('Updated lastPingCount to:', lastPingCount);
      }
    };

    checkForNewPings();
  }, [roomData, user, room]);

  const handleCreateRoom = async (roomName, password) => {
    if (!user) return;
    setIsRoomLoading(true);
    try {
      const result = await createRoom(roomName, password, user.uid, userToken);
      if (result.success) {
        setRoom(result.roomId);
        setRoomData(result.roomData);
        
        // Update URL with room ID
        const newUrl = `${window.location.pathname}?room=${result.roomId}`;
        router.push(newUrl, { scroll: false });
        
        toast.success('Room created successfully! 🎉');
      } else {
        toast.error(result.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    } finally {
      setIsRoomLoading(false);
    }
  };

  const handleJoinRoom = async (roomId, password) => {
    if (!user) return;
    setIsRoomLoading(true);
    try {
      const result = await joinRoom(roomId, password, user.uid, userToken);
      if (result.success) {
        setRoom(result.roomId);
        setRoomData(result.roomData);
        
        // Update URL with room ID
        const newUrl = `${window.location.pathname}?room=${result.roomId}`;
        router.push(newUrl, { scroll: false });
        
        toast.success('Joined room successfully! 💖');
      } else {
        toast.error(result.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setIsRoomLoading(false);
    }
  };

  const handlePhotoUpdate = async (photoUrl) => {
    if (!room) return;
    const result = await updateRoomPhoto(room, photoUrl);
    if (!result.success) {
      toast.error(result.error || 'Failed to update photo');
    }
  };

  const handleEmojiUpdate = async (emoji) => {
    if (!room) return;
    const result = await updateRoomEmoji(room, emoji);
    if (!result.success) {
      toast.error(result.error || 'Failed to update emoji');
    }
  };

  const handlePing = async () => {
    if (!room || !user) return;
    
    try {
      const result = await sendPing(room, user.uid);
      if (!result.success) {
        toast.error(result.error || 'Failed to send ping');
      }
    } catch (error) {
      console.error('Error sending ping:', error);
      toast.error('Failed to send ping');
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !user) return;
    
    try {
      // Remove user from the room in the backend
      const result = await leaveRoom(room, user.uid, userToken);
      
      if (result.success) {
        setRoom(null);
        setRoomData(null);
        
        // Clear URL parameters
        router.push(window.location.pathname, { scroll: false });
        
        toast.success('Left room');
      } else {
        toast.error(result.error || 'Failed to leave room');
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const handleCopyRoomId = () => {
    if (room) {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${room}`;
      navigator.clipboard.writeText(roomUrl);
      toast.success('Room link copied to clipboard! 🔗');
    }
  };

  const handleShareRoom = async () => {
    if (room && roomData) {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${room}`;
      const shareData = {
        title: 'Join me on CLOSE',
        text: `Join our private space "${roomData.name}" on CLOSE`,
        url: roomUrl
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if (error.name !== 'AbortError') {
            handleCopyRoomId();
          }
        }
      } else {
        handleCopyRoomId();
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Connecting hearts..." />;
  }

  if (!user) {
    return <LoadingScreen message="Setting up your space..." />;
  }

  if (!room || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-32 right-16 w-20 h-20 bg-purple-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-20 w-24 h-24 bg-indigo-400/20 rounded-full blur-lg animate-pulse delay-2000"></div>
          <div className="absolute bottom-16 right-12 w-40 h-40 bg-pink-300/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
        
        <RoomForm
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isLoading={isRoomLoading}
          initialRoomId={searchParams.get('room')}
        />
        <Toaster />
      </div>
    );
  }

  const partnerCount = roomData.members?.length || 0;
  const isAlone = partnerCount < 2;
  const lastPing = roomData.pingHistory?.slice(-1)[0];
  
  // More descriptive status based on member count
  const getRoomStatus = () => {
    if (partnerCount === 0) {
      return { text: "Room error", color: "red", icon: "❌" };
    } else if (partnerCount === 1) {
      return { text: "Waiting for your person...", color: "orange", icon: "✨" };
    } else {
      return { text: "Connected", color: "green", icon: "💖" };
    }
  };

  const roomStatus = getRoomStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-16 w-20 h-20 bg-purple-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-indigo-400/20 rounded-full blur-lg animate-pulse delay-2000"></div>
        <div className="absolute bottom-16 right-12 w-40 h-40 bg-pink-300/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Mobile App Header with Notch */}
      <header className="relative z-10 safe-top">
        <div className="px-6 pt-4 pb-6">
          <div className="flex items-center justify-between">
            {/* App Title & Room Info */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💕</span>
              </div>
              <div>
                <h1 className="text-white text-lg font-bold tracking-wide">{roomData.name}</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    roomStatus.color === 'orange' ? 'bg-amber-400' : 
                    roomStatus.color === 'green' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}></div>
                  <p className="text-white/80 text-sm">{roomStatus.text}</p>
                </div>
              </div>
            </div>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-11 h-11 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <FiSettings size={18} className="text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="absolute top-24 right-6 z-50 glass-effect rounded-3xl p-2 min-w-[240px] slide-up-enter border border-white/20">
          <button 
            onClick={handleShareRoom} 
            className="w-full px-4 py-4 text-left hover:bg-white/10 rounded-2xl flex items-center space-x-3 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiShare size={18} className="text-white" />
            </div>
            <div>
              <span className="font-medium text-white">Share Room</span>
              <p className="text-xs text-white/70">Invite your person</p>
            </div>
          </button>
          <button 
            onClick={handleCopyRoomId} 
            className="w-full px-4 py-4 text-left hover:bg-white/10 rounded-2xl flex items-center space-x-3 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiCopy size={18} className="text-white" />
            </div>
            <div>
              <span className="font-medium text-white">Copy Link</span>
              <p className="text-xs text-white/70">Share the room URL</p>
            </div>
          </button>
          <div className="h-px bg-white/10 my-2"></div>
          <button 
            onClick={handleLeaveRoom} 
            className="w-full px-4 py-4 text-left hover:bg-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiLogOut size={18} className="text-red-400" />
            </div>
            <div>
              <span className="font-medium">Leave Room</span>
              <p className="text-xs text-red-300/70">End this session</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 safe-bottom">
        <div className="px-6 space-y-8 pb-8">
          
          {/* Waiting State */}
          {isAlone && (
            <div className="glass-effect rounded-3xl p-8 text-center slide-up-enter border border-white/20">
              <div className="text-6xl mb-6 animate-bounce">🌟</div>
              <h3 className="text-white text-xl font-bold mb-4">
                {partnerCount === 1 ? "You're here first!" : "Reconnecting..."}
              </h3>
              <p className="text-white/80 mb-6 leading-relaxed">
                {partnerCount === 1 ? 
                  "Share the magic link below with your person to start your shared journey together." :
                  "Getting your shared space ready..."
                }
              </p>
              {partnerCount === 1 && (
                <div className="space-y-4">
                  <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    <code className="font-mono text-sm break-all text-white/90 font-medium">
                      {`${window.location.origin}${window.location.pathname}?room=${room}`}
                    </code>
                  </div>
                  <button
                    onClick={handleCopyRoomId}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:scale-105 transition-transform active:scale-95 shadow-lg"
                  >
                    📋 Copy Magic Link
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Photo Gallery Section */}
          <div className="glass-effect rounded-3xl p-4 lg:p-6 slide-up-enter border border-white/20">
            <div className="text-center mb-4 lg:mb-6">
              <h2 className="text-white text-xl lg:text-2xl font-bold mb-2">Shared Gallery</h2>
              <p className="text-white/70 text-xs lg:text-sm">Photos disappear after 1 hour ✨</p>
            </div>
            <PhotoGallery
              roomId={room}
              photos={photos}
              onPhotosUpdate={() => {/* Photos update via realtime subscription */}}
              disabled={isAlone}
            />
          </div>

          {/* Interactive Section */}
          <div className="grid grid-cols-2 gap-4 slide-up-enter">
            {/* Mood Selector */}
            <div className="glass-effect rounded-3xl p-6 text-center border border-white/20">
              <h3 className="text-white font-semibold mb-4">Your Mood</h3>
              <EmojiSelector
                currentEmoji={roomData.currentEmoji}
                onEmojiSelect={handleEmojiUpdate}
                disabled={isAlone}
              />
            </div>
            
            {/* Ping Button */}
            <div className="glass-effect rounded-3xl p-6 text-center border border-white/20">
              <h3 className="text-white font-semibold mb-4">Send Love</h3>
              <PingButton
                onPing={handlePing}
                disabled={isAlone}
                lastPing={lastPing?.timestamp}
              />
            </div>
          </div>

          {/* Recent Activity */}
          {roomData.pingHistory && roomData.pingHistory.length > 0 && (
            <div className="glass-effect rounded-3xl p-6 slide-up-enter border border-white/20">
              <h3 className="text-white text-lg font-bold mb-6 flex items-center">
                <span className="text-2xl mr-3">💕</span>
                Recent Love Taps
              </h3>
              <div className="space-y-4">
                {roomData.pingHistory.slice(-3).reverse().map((ping, index) => (
                  <div key={ping.id || index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">💖</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        {ping.from === user.uid ? 'You' : 'Your person'} sent love
                      </p>
                      <p className="text-sm text-white/70 mt-1">
                        {ping.timestamp?.seconds
                          ? new Date(ping.timestamp.seconds * 1000).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : 'just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <PWAInstallPrompt />
      
      <Toaster />
    </div>
  );
}

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
        <p className="text-lg font-medium">Loading CLOSE...</p>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}