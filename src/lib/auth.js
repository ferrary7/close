import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './firebase';

// Sign in anonymously
export const signInAnonymous = async () => {
  try {
    const result = await signInAnonymously(auth);
    console.log('Anonymous sign-in successful:', result.user.uid);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error during anonymous sign-in:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('Email sign-in successful:', result.user.uid);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error during email sign-in:', error);
    return { success: false, error: error.message };
  }
};

// Create account with email and password
export const createAccount = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Account creation successful:', result.user.uid);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error during account creation:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    console.log('Sign-out successful');
    return { success: true };
  } catch (error) {
    console.error('Error during sign-out:', error);
    return { success: false, error: error.message };
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};
