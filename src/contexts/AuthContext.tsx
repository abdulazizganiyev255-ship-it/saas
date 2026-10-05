import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  firebaseDeleteUser,
  reauthenticateWithPopup,
  clearFirestorePersistence,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  type User,
} from '../services/firebase';
import type { UserProfile, UserSettings, Language } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TIMEZONE, DEFAULT_CURRENCY } from '../config/constants';
import { exportAllUserData, deleteAllUserData } from '../services/dataOwnership';
import { clearUserLocalCache } from '../services/deltaSync';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutAndClearCache: () => Promise<void>;
  updateUserSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  exportData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<Language>(() => {
    const uid = auth.currentUser?.uid || 'anon';
    const saved = localStorage.getItem(`lifeos_${uid}_lang`);
    return saved === 'en' ? 'en' : 'uz'; // Uzbek default
  });

  // In-memory cache for user profile to prevent redundant reads
  const profileCache = useRef<{ [uid: string]: UserProfile }>({});

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setUserProfile(null);
        profileCache.current = {};
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setLoading(false);
        return;
      }

      // Check if a different UID was previously logged in on this device
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastUid = localStorage.getItem('lifeos_last_uid');
        if (lastUid && lastUid !== currentUser.uid) {
          await clearUserLocalCache(lastUid);
        }
        localStorage.setItem('lifeos_last_uid', currentUser.uid);
      }

      const userDocRef = doc(db, 'users', currentUser.uid);

      try {
        // One-time check / creation
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Life OS User',
            email: currentUser.email || '',
            createdAt: new Date().toISOString(),
            language: 'uz',
            timezone: DEFAULT_TIMEZONE,
            currency: DEFAULT_CURRENCY,
            plan: 'free',
            settings: { ...DEFAULT_SETTINGS },
          };

          await setDoc(userDocRef, newProfile);
          profileCache.current[currentUser.uid] = newProfile;
          setUserProfile(newProfile);
          setLanguageState(newProfile.language);
          localStorage.setItem(`lifeos_${currentUser.uid}_lang`, newProfile.language);
        } else {
          const rawData = snap.data() as UserProfile;
          const mergedSettings: UserSettings = {
            ...DEFAULT_SETTINGS,
            ...rawData.settings,
            habits: rawData.settings?.habits?.length ? rawData.settings.habits : DEFAULT_SETTINGS.habits,
            expenseCategories: rawData.settings?.expenseCategories?.length ? rawData.settings.expenseCategories : DEFAULT_SETTINGS.expenseCategories,
            incomeCategories: rawData.settings?.incomeCategories?.length ? rawData.settings.incomeCategories : DEFAULT_SETTINGS.incomeCategories,
          };
          const data: UserProfile = {
            ...rawData,
            settings: mergedSettings,
          };

          // If habits were missing, silently seed to Firestore
          if (!rawData.settings?.habits?.length) {
            updateDoc(userDocRef, { settings: mergedSettings }).catch(() => {});
          }

          profileCache.current[currentUser.uid] = data;
          setUserProfile(data);
          if (data.language) {
            setLanguageState(data.language);
            localStorage.setItem(`lifeos_${currentUser.uid}_lang`, data.language);
          }
        }

        // Attach listener for real-time sync of user doc
        unsubscribeDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const raw = docSnap.data() as UserProfile;
              const mergedSettings: UserSettings = {
                ...DEFAULT_SETTINGS,
                ...raw.settings,
                habits: raw.settings?.habits?.length ? raw.settings.habits : DEFAULT_SETTINGS.habits,
                expenseCategories: raw.settings?.expenseCategories?.length ? raw.settings.expenseCategories : DEFAULT_SETTINGS.expenseCategories,
                incomeCategories: raw.settings?.incomeCategories?.length ? raw.settings.incomeCategories : DEFAULT_SETTINGS.incomeCategories,
              };
              const updatedData: UserProfile = {
                ...raw,
                settings: mergedSettings,
              };
              profileCache.current[currentUser.uid] = updatedData;
              setUserProfile(updatedData);
              if (updatedData.language) {
                setLanguageState(updatedData.language);
                localStorage.setItem(`lifeos_${currentUser.uid}_lang`, updatedData.language);
              }
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      // Normal sign-out retains user's local cache on this device
      profileCache.current = {};
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const signOutAndClearCache = async () => {
    try {
      if (user) {
        await clearUserLocalCache(user.uid);
      }
      profileCache.current = {};
      await clearFirestorePersistence();
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Sign-out and clear cache error:', err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lifeos:error-toast', {
            detail: {
              message: 'Boshqa oynalarni yoping va qayta urining',
            },
          })
        );
      }
    }
  };

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    const uid = user?.uid || 'anon';
    localStorage.setItem(`lifeos_${uid}_lang`, newLang);

    if (user && userProfile) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { language: newLang });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user || !userProfile) return;

    const mergedSettings: UserSettings = {
      ...userProfile.settings,
      ...newSettings,
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        settings: mergedSettings,
      });
      setUserProfile((prev) => (prev ? { ...prev, settings: mergedSettings } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;

    try {
      // 1. Delete all user subcollections and root user document in batches
      await deleteAllUserData(uid);

      // 2. Delete user account from Firebase Authentication (handle requires-recent-login)
      try {
        await firebaseDeleteUser(user);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(user, googleProvider);
          await firebaseDeleteUser(user);
        } else {
          throw authErr;
        }
      }

      // 3. Clear all local caches for this user
      await clearUserLocalCache(uid);
      localStorage.clear();
      sessionStorage.clear();

      setUser(null);
      setUserProfile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const exportData = async () => {
    if (!user) return;
    try {
      await exportAllUserData(user.uid);
    } catch (err) {
      console.error('Data export error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        language,
        setLanguage,
        signInWithGoogle,
        signOut,
        signOutAndClearCache,
        updateUserSettings,
        deleteAccount,
        exportData,
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
