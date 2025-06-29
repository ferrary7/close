import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Update user token in room
export const updateUserTokenInRoom = async (roomId, userId, token) => {
  try {
    if (!token || !roomId || !userId) {
      console.log('❌ Missing parameters for token update:', { roomId, userId, token: !!token });
      return false;
    }

    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      console.error('❌ Room not found for token update:', roomId);
      return false;
    }

    const roomData = roomSnap.data();
    console.log('🔄 Updating token for user in room:', {
      roomId,
      userId,
      currentMembers: roomData.members,
      currentTokens: roomData.memberTokens?.length || 0,
      newToken: token.substring(0, 20) + '...'
    });

    // Find user index
    const userIndex = roomData.members?.indexOf(userId);
    if (userIndex === -1) {
      console.error('❌ User not found in room members:', userId);
      return false;
    }

    // Update the memberTokens array
    const updatedTokens = [...(roomData.memberTokens || [])];
    
    // Ensure the array is the same length as members
    while (updatedTokens.length < roomData.members.length) {
      updatedTokens.push(null);
    }
    
    // Update the token for this user
    updatedTokens[userIndex] = token;

    await updateDoc(roomRef, {
      memberTokens: updatedTokens
    });

    console.log('✅ Token updated successfully in room:', {
      roomId,
      userId,
      tokenCount: updatedTokens.filter(t => t).length
    });

    return true;
  } catch (error) {
    console.error('💥 Error updating user token in room:', error);
    return false;
  }
};

// Get all partner tokens for notifications (excluding current user)
export const getPartnerTokens = (roomData, currentUserId) => {
  if (!roomData.memberTokens || !roomData.members) {
    return [];
  }

  const partnerTokens = [];
  roomData.members.forEach((memberId, index) => {
    if (memberId !== currentUserId && roomData.memberTokens[index]) {
      partnerTokens.push(roomData.memberTokens[index]);
    }
  });

  return partnerTokens;
};
