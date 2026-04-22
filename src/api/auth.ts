import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseSetup';
import { UserProfile } from '../types/schema';

export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      name,
      onboardingComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Securely write the profile directly to the users collection based on UID
    await setDoc(doc(db, 'users', user.uid), profile);
    return user;
  } catch (error) {
    console.error("Error registering user: ", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return await signOut(auth);
};
