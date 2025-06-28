import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique room ID
export const generateRoomId = () => {
  return uuidv4();
};

// Hash password for security (simple hash - in production, use better hashing)
export const hashPassword = (password) => {
  return btoa(password); // Simple base64 encoding - use bcrypt in production
};

// Create a new room
export const createRoom = async (roomName, password, userId, userToken = null) => {
  try {
    const roomId = generateRoomId();
    const hashedPassword = hashPassword(password);

    const roomData = {
      id: roomId,
      name: roomName,
      password: hashedPassword,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      members: [userId],
      memberTokens: userToken ? [userToken] : [],
      currentPhoto: null,
      currentEmoji: '🧡',
      lastActivity: serverTimestamp(),
      pingHistory: []
    };

    await setDoc(doc(db, 'rooms', roomId), roomData);
    console.log('Room created successfully:', roomId);
    return { success: true, roomId, roomData };
  } catch (error) {
    console.error('Error creating room:', error);
    return { success: false, error: error.message };
  }
};

// Join an existing room
export const joinRoom = async (roomId, password, userId, userToken = null) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return { success: false, error: 'Room not found' };
    }

    const roomData = roomSnap.data();
    const hashedPassword = hashPassword(password);

    if (roomData.password !== hashedPassword) {
      return { success: false, error: 'Invalid password' };
    }

    if (roomData.members.includes(userId)) {
      return { success: true, roomId, roomData };
    }

    if (roomData.members.length >= 2) {
      return { success: false, error: 'Room is full' };
    }

    // Add user to room
    const updateData = {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    };

    if (userToken) {
      updateData.memberTokens = arrayUnion(userToken);
    }

    await updateDoc(roomRef, updateData);

    const updatedRoom = await getDoc(roomRef);
    return { success: true, roomId, roomData: updatedRoom.data() };
  } catch (error) {
    console.error('Error joining room:', error);
    return { success: false, error: error.message };
  }
};

// Update room photo
export const updateRoomPhoto = async (roomId, photoUrl) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      currentPhoto: photoUrl,
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating room photo:', error);
    return { success: false, error: error.message };
  }
};

// Update room emoji
export const updateRoomEmoji = async (roomId, emoji) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      currentEmoji: emoji,
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating room emoji:', error);
    return { success: false, error: error.message };
  }
};

// Send a ping with real push notifications
export const sendPing = async (roomId, fromUserId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return { success: false, error: 'Room not found' };
    }
    
    const roomData = roomSnap.data();
    const pingData = {
      from: fromUserId,
      timestamp: new Date(),
      id: uuidv4()
    };

    await updateDoc(roomRef, {
      pingHistory: arrayUnion(pingData),
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Send push notifications to other room members
    if (roomData.memberTokens && roomData.memberTokens.length > 0) {
      const senderIndex = roomData.members?.indexOf(fromUserId) || 0;
      const partnerTokens = roomData.memberTokens.filter((token, index) => 
        roomData.members[index] !== fromUserId
      );

      // Send notifications to partner devices
      for (const token of partnerTokens) {
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              title: '💖 Your person is thinking of you!',
              body: `Someone just sent you love through ${roomData.name}`,
              data: {
                type: 'ping',
                roomId: roomId,
                url: `/?room=${roomId}`,
                fromUser: fromUserId
              }
            }),
          });
          
          if (response.ok) {
            console.log('Push notification sent successfully');
          } else {
            console.error('Failed to send push notification');
          }
        } catch (error) {
          console.error('Error sending push notification:', error);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending ping:', error);
    return { success: false, error: error.message };
  }
};

// Listen to room changes
export const subscribeToRoom = (roomId, callback) => {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
};

// Clean old pings (keep only last 10)
export const cleanOldPings = async (roomId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (roomSnap.exists()) {
      const roomData = roomSnap.data();
      const pings = roomData.pingHistory || [];
      
      if (pings.length > 10) {
        const recentPings = pings.slice(-10);
        await updateDoc(roomRef, {
          pingHistory: recentPings
        });
      }
    }
  } catch (error) {
    console.error('Error cleaning old pings:', error);
  }
};

// Leave a room
export const leaveRoom = async (roomId, userId, userToken = null) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return { success: false, error: 'Room not found' };
    }

    const roomData = roomSnap.data();

    if (!roomData.members.includes(userId)) {
      return { success: false, error: 'User not in room' };
    }

    // Remove user from room
    const updateData = {
      members: arrayRemove(userId),
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    };

    // Also remove user token if provided
    if (userToken && roomData.memberTokens && roomData.memberTokens.includes(userToken)) {
      updateData.memberTokens = arrayRemove(userToken);
    }

    await updateDoc(roomRef, updateData);

    console.log(`User ${userId} left room ${roomId}`);
    return { success: true };
  } catch (error) {
    console.error('Error leaving room:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is currently in room
export const isUserInRoom = async (roomId, userId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return false;
    }

    const roomData = roomSnap.data();
    return roomData.members && roomData.members.includes(userId);
  } catch (error) {
    console.error('Error checking user in room:', error);
    return false;
  }
};

// Get current room member count
export const getRoomMemberCount = async (roomId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return 0;
    }

    const roomData = roomSnap.data();
    return roomData.members ? roomData.members.length : 0;
  } catch (error) {
    console.error('Error getting room member count:', error);
    return 0;
  }
};
