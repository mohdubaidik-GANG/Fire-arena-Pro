import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, SUPER_ADMIN_EMAILS } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  needsProfileSetup: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveInitialProfile: (ign: string, freeFireUid: string) => Promise<void>;
  updateProfileDetails: (ign: string, freeFireUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check admin whitelist status
        const isWhitelisted = SUPER_ADMIN_EMAILS.some(
          (email) => email.toLowerCase() === currentUser.email?.toLowerCase()
        );
        setIsAdmin(isWhitelisted);

        // Fetch or listen to user profile
        const userRef = doc(db, 'users', currentUser.uid);

        try {
          // Check if admin document also exists in /admins
          if (!isWhitelisted) {
            try {
              const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
              if (adminDoc.exists()) {
                setIsAdmin(true);
              }
            } catch {
              // Ignore non-admin check error
            }
          }

          // Realtime listener for User Profile
          unsubscribeProfile = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setProfile(data);
                // If user doesn't have an IGN or Free Fire UID yet (exempt administrators)
                if (!isWhitelisted && (!data.ign || !data.freeFireUid)) {
                  setNeedsProfileSetup(true);
                } else {
                  setNeedsProfileSetup(false);
                }
              } else {
                // New user - profile not created in Firestore yet
                setProfile(null);
                if (!isWhitelisted) {
                  setNeedsProfileSetup(true);
                } else {
                  setNeedsProfileSetup(false);
                }
              }
              setLoading(false);
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
              setLoading(false);
            }
          );
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setLoading(false);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setNeedsProfileSetup(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  };

  const saveInitialProfile = async (ign: string, freeFireUid: string) => {
    if (!user) throw new Error('Not authenticated');

    const cleanIgn = ign.trim();
    const cleanUid = freeFireUid.trim();

    if (!cleanIgn || !cleanUid) {
      throw new Error('Please enter valid Free Fire IGN and UID');
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      ign: cleanIgn,
      freeFireUid: cleanUid,
      depositBalance: 0,
      winningsBalance: 0,
      isBanned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      setNeedsProfileSetup(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const updateProfileDetails = async (ign: string, freeFireUid: string) => {
    if (!user || !profile) throw new Error('Not authenticated');

    const cleanIgn = ign.trim();
    const cleanUid = freeFireUid.trim();

    if (!cleanIgn || !cleanUid) {
      throw new Error('Please enter valid Free Fire IGN and UID');
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ign: cleanIgn,
        freeFireUid: cleanUid,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const isSuperAdmin = Boolean(
    user?.email && SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === user.email?.toLowerCase())
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isSuperAdmin,
        needsProfileSetup,
        loginWithGoogle,
        logout,
        saveInitialProfile,
        updateProfileDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
