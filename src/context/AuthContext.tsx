import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { UserProfile, SUPER_ADMIN_EMAILS } from '../types';

export interface AuthContextType {
  user: User | { uid: string; email?: string; displayName?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  needsProfileSetup: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithCredentials: (
    identifier: string,
    password?: string
  ) => Promise<{ needsPasswordLink?: boolean; existingProfile?: UserProfile }>;
  linkExistingAccountPassword: (uid: string, newPassword: string) => Promise<void>;
  registerWithCredentials: (
    ign: string,
    freeFireUid: string,
    phone: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  saveInitialProfile: (ign: string, freeFireUid: string) => Promise<void>;
  updateProfileDetails: (ign: string, freeFireUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'firearena_auth_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { uid: string; email?: string; displayName?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);

  // Helper to check and initialize user profile in Firestore if new user via Google
  const checkAndInitializeUserProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      const isWhitelisted = SUPER_ADMIN_EMAILS.some(
        (email) => email.toLowerCase() === currentUser.email?.toLowerCase()
      );

      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          ign: currentUser.displayName ? currentUser.displayName.slice(0, 25) : '',
          freeFireUid: '',
          depositBalance: 0,
          winningsBalance: 0,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        setProfile(newProfile);

        if (!isWhitelisted && (!newProfile.ign || !newProfile.freeFireUid)) {
          setNeedsProfileSetup(true);
        } else {
          setNeedsProfileSetup(false);
        }
      } else {
        const data = userSnap.data() as UserProfile;
        setProfile(data);
        if (!isWhitelisted && (!data.ign || !data.freeFireUid)) {
          setNeedsProfileSetup(true);
        } else {
          setNeedsProfileSetup(false);
        }
      }
    } catch (error) {
      console.error('Error verifying/initializing user profile:', error);
    }
  };

  // Attach realtime listener to user document
  const attachProfileListener = (uid: string, isWhitelistedAdmin: boolean): (() => void) => {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          if (!isWhitelistedAdmin && (!data.ign || !data.freeFireUid)) {
            setNeedsProfileSetup(true);
          } else {
            setNeedsProfileSetup(false);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Profile realtime listener warning:', error);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Check if there is an active local credentials session
    const savedSessionRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    let hasLocalSession = false;

    if (savedSessionRaw) {
      try {
        const session = JSON.parse(savedSessionRaw);
        if (session && session.uid) {
          hasLocalSession = true;
          if (session.isAdmin) {
            const adminUser = {
              uid: session.uid,
              email: session.email || 'ubedmo650@gmail.com',
              displayName: 'Super Admin',
            };
            setUser(adminUser);
            setIsAdmin(true);
            setProfile({
              uid: session.uid,
              email: session.email || 'ubedmo650@gmail.com',
              ign: 'Command Operator',
              freeFireUid: '00000000',
              depositBalance: 99999,
              winningsBalance: 99999,
              isBanned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setLoading(false);
          } else {
            // Restore Gamer Session from Firestore
            const userRef = doc(db, 'users', session.uid);
            getDoc(userRef)
              .then((snap) => {
                if (snap.exists()) {
                  const data = snap.data() as UserProfile;
                  setUser({
                    uid: data.uid,
                    email: data.email,
                    displayName: data.ign,
                  });
                  setProfile(data);
                  unsubscribeProfile = attachProfileListener(data.uid, false);
                }
                setLoading(false);
              })
              .catch(() => {
                setLoading(false);
              });
          }
        }
      } catch {
        // ignore storage error
      }
    }

    // Handle mobile redirect sign-in resolution if returning from redirect
    getRedirectResult(auth)
      .then(async (credential) => {
        if (credential?.user) {
          await checkAndInitializeUserProfile(credential.user);
        }
      })
      .catch((err) => {
        console.warn('Google redirect result resolution check:', err);
      });

    // Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Clear local credentials session if signing in with Google
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ type: 'google', uid: currentUser.uid, email: currentUser.email })
        );

        setUser(currentUser);

        // Check admin whitelist status
        const isWhitelisted = SUPER_ADMIN_EMAILS.some(
          (email) => email.toLowerCase() === currentUser.email?.toLowerCase()
        );
        setIsAdmin(isWhitelisted);

        // Realtime listener for User Profile
        unsubscribeProfile = attachProfileListener(currentUser.uid, isWhitelisted);
      } else {
        // Only reset if there was NO local credentials session
        if (!hasLocalSession) {
          if (unsubscribeProfile) {
            unsubscribeProfile();
          }
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setNeedsProfileSetup(false);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // 1. Google Sign-In
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });

      try {
        const credential = await signInWithPopup(auth, googleProvider);
        if (credential.user) {
          await checkAndInitializeUserProfile(credential.user);
        }
      } catch (popupError: unknown) {
        const errorCode = (popupError as { code?: string })?.code;
        if (
          errorCode === 'auth/popup-blocked' ||
          errorCode === 'auth/operation-not-supported-in-this-environment'
        ) {
          console.warn('Popup blocked, falling back to signInWithRedirect:', popupError);
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupError;
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // 2. UID / Identifier + Password Login
  const loginWithCredentials = async (
    identifier: string,
    password?: string
  ): Promise<{ needsPasswordLink?: boolean; existingProfile?: UserProfile }> => {
    setLoading(true);
    const cleanId = identifier.trim();
    const cleanPass = (password || '').trim();

    if (!cleanId) {
      setLoading(false);
      throw new Error('Please enter your Free Fire UID or Email.');
    }

    // A. Check for Admin Login
    const isAdminIdentifier =
      cleanId.toLowerCase() === 'admin' ||
      SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === cleanId.toLowerCase());

    if (isAdminIdentifier) {
      // Master admin passwords allowed: admin123, firearena@admin, admin, admin2025
      const validAdminPasswords = ['admin123', 'admin', 'firearena@admin', 'admin2025', 'firearena123'];
      if (!cleanPass) {
        setLoading(false);
        throw new Error('Please enter the Admin password.');
      }

      if (!validAdminPasswords.includes(cleanPass)) {
        setLoading(false);
        throw new Error('Incorrect Admin password. Please verify your credentials.');
      }

      // Success: Log in as Super Admin
      const adminEmail = SUPER_ADMIN_EMAILS[0] || 'ubedmo650@gmail.com';
      const adminUser = {
        uid: 'admin_ubedmo650',
        email: adminEmail,
        displayName: 'Super Admin',
      };
      const adminProf: UserProfile = {
        uid: 'admin_ubedmo650',
        email: adminEmail,
        ign: 'Command Operator',
        freeFireUid: '00000000',
        depositBalance: 99999,
        winningsBalance: 99999,
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(adminUser);
      setProfile(adminProf);
      setIsAdmin(true);
      setNeedsProfileSetup(false);
      setLoading(false);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ type: 'credentials', uid: adminUser.uid, email: adminEmail, isAdmin: true })
      );
      return { needsPasswordLink: false };
    }

    // B. Search for Gamer in 'users' collection
    try {
      let matchedProfile: UserProfile | null = null;

      // 1. Check by freeFireUid
      const uidQuery = query(collection(db, 'users'), where('freeFireUid', '==', cleanId));
      const uidSnap = await getDocs(uidQuery);
      if (!uidSnap.empty) {
        matchedProfile = uidSnap.docs[0].data() as UserProfile;
      }

      // 2. Check by email if not found
      if (!matchedProfile && cleanId.includes('@')) {
        const emailQuery = query(collection(db, 'users'), where('email', '==', cleanId.toLowerCase()));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          matchedProfile = emailSnap.docs[0].data() as UserProfile;
        }
      }

      // 3. Fallback: Search all users if not found directly
      if (!matchedProfile) {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        for (const docSnap of allUsersSnap.docs) {
          const d = docSnap.data() as UserProfile;
          if (
            (d.freeFireUid && d.freeFireUid.trim() === cleanId) ||
            (d.email && d.email.toLowerCase().trim() === cleanId.toLowerCase()) ||
            (d.uid && d.uid.trim() === cleanId)
          ) {
            matchedProfile = d;
            break;
          }
        }
      }

      if (!matchedProfile) {
        setLoading(false);
        throw new Error(
          `No account found with Free Fire UID or Email "${cleanId}". Please register a new account on the Register tab.`
        );
      }

      // Check if account is banned
      if (matchedProfile.isBanned) {
        setLoading(false);
        throw new Error('This account has been suspended. Please contact platform support.');
      }

      // C. Existing User Migration Check:
      // If user doc exists but password is NOT set yet (e.g. came from Google sign-in previously)
      if (!matchedProfile.password || matchedProfile.password.trim() === '') {
        setLoading(false);
        return {
          needsPasswordLink: true,
          existingProfile: matchedProfile,
        };
      }

      // D. Verify Password
      if (!cleanPass) {
        setLoading(false);
        throw new Error('Please enter your account password.');
      }

      if (matchedProfile.password !== cleanPass) {
        setLoading(false);
        throw new Error('Incorrect password. Please verify and try again.');
      }

      // E. Log In Gamer
      const gamerUser = {
        uid: matchedProfile.uid,
        email: matchedProfile.email || `${matchedProfile.freeFireUid}@gamer.firearena`,
        displayName: matchedProfile.ign,
      };

      setUser(gamerUser);
      setProfile(matchedProfile);
      setIsAdmin(false);
      setNeedsProfileSetup(false);
      setLoading(false);

      // Attach realtime Firestore listener
      attachProfileListener(matchedProfile.uid, false);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          type: 'credentials',
          uid: matchedProfile.uid,
          email: matchedProfile.email,
          freeFireUid: matchedProfile.freeFireUid,
          isAdmin: false,
        })
      );

      return { needsPasswordLink: false };
    } catch (err: unknown) {
      setLoading(false);
      throw err;
    }
  };

  // 3. Link Existing User Account with Password
  const linkExistingAccountPassword = async (uid: string, newPassword: string) => {
    setLoading(true);
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 4) {
      setLoading(false);
      throw new Error('Password must be at least 4 characters long.');
    }

    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        password: cleanPass,
        updatedAt: new Date().toISOString(),
      });

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('User record could not be found.');
      }

      const updatedProfile = userSnap.data() as UserProfile;
      const gamerUser = {
        uid: updatedProfile.uid,
        email: updatedProfile.email || `${updatedProfile.freeFireUid}@gamer.firearena`,
        displayName: updatedProfile.ign,
      };

      setUser(gamerUser);
      setProfile(updatedProfile);
      setIsAdmin(false);
      setNeedsProfileSetup(false);
      setLoading(false);

      attachProfileListener(updatedProfile.uid, false);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          type: 'credentials',
          uid: updatedProfile.uid,
          email: updatedProfile.email,
          freeFireUid: updatedProfile.freeFireUid,
          isAdmin: false,
        })
      );
    } catch (err: unknown) {
      setLoading(false);
      throw err;
    }
  };

  // 4. Register New User with UID & Password
  const registerWithCredentials = async (
    ign: string,
    freeFireUid: string,
    phone: string,
    password: string
  ) => {
    setLoading(true);
    const cleanIgn = ign.trim();
    const cleanUid = freeFireUid.trim();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    if (!cleanIgn || cleanIgn.length < 2) {
      setLoading(false);
      throw new Error('Please enter a valid In-Game Name (IGN) of at least 2 characters.');
    }

    if (!/^\d{8,11}$/.test(cleanUid)) {
      setLoading(false);
      throw new Error('Free Fire UID must be a numeric ID between 8 and 11 digits.');
    }

    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      setLoading(false);
      throw new Error('Mobile number must be a valid 10-digit number.');
    }

    if (cleanPass.length < 4) {
      setLoading(false);
      throw new Error('Password must be at least 4 characters long.');
    }

    try {
      // Check if Free Fire UID already exists
      const uidQuery = query(collection(db, 'users'), where('freeFireUid', '==', cleanUid));
      const uidSnap = await getDocs(uidQuery);
      if (!uidSnap.empty) {
        setLoading(false);
        throw new Error(
          `Free Fire UID ${cleanUid} is already registered! Please switch to the Login tab.`
        );
      }

      // Generate unique user UID
      const newUid = `ff_${cleanUid}_${Date.now().toString(36)}`;
      const newProfile: UserProfile = {
        uid: newUid,
        email: `${cleanUid}@gamer.firearena`,
        ign: cleanIgn,
        freeFireUid: cleanUid,
        phone: cleanPhone || '',
        password: cleanPass,
        depositBalance: 0,
        winningsBalance: 0,
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUid), newProfile);

      const gamerUser = {
        uid: newUid,
        email: newProfile.email,
        displayName: newProfile.ign,
      };

      setUser(gamerUser);
      setProfile(newProfile);
      setIsAdmin(false);
      setNeedsProfileSetup(false);
      setLoading(false);

      attachProfileListener(newUid, false);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          type: 'credentials',
          uid: newUid,
          email: newProfile.email,
          freeFireUid: cleanUid,
          isAdmin: false,
        })
      );
    } catch (err: unknown) {
      setLoading(false);
      throw err;
    }
  };

  // 5. Sign Out
  const logout = async () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      await signOut(auth);
      setProfile(null);
      setUser(null);
      setIsAdmin(false);
      setNeedsProfileSetup(false);
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

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          ign: cleanIgn,
          freeFireUid: cleanUid,
          updatedAt: new Date().toISOString(),
        });
        setProfile((prev) => (prev ? { ...prev, ign: cleanIgn, freeFireUid: cleanUid } : null));
      } else {
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
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      }
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
      setProfile((prev) => (prev ? { ...prev, ign: cleanIgn, freeFireUid: cleanUid } : null));
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
        loginWithCredentials,
        linkExistingAccountPassword,
        registerWithCredentials,
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
