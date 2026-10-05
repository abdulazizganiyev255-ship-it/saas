import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence (multiple tab support)
export const db = initializeFirestore(
  app,
  { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
  firebaseConfig.firestoreDatabaseId
);

export async function clearFirestorePersistence(): Promise<void> {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.warn('Error clearing Firestore IndexedDB persistence:', err);
  }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermissionDenied = errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions');
  const isInvalidArgument = errMsg.includes('invalid-argument') || errMsg.includes('Invalid argument');
  const isOfflineUnavailable = errMsg.includes('unavailable') || errMsg.includes('offline') || errMsg.includes('Could not reach Cloud Firestore backend');

  if (typeof window !== 'undefined' && !isOfflineUnavailable) {
    let toastMessage = "Xatolik: Amal muvaffaqiyatsiz yakunlandi.";
    if (isPermissionDenied) {
      toastMessage = "Amal rad etildi: Ruxsat berilmadi yoki limitdan oshdi.";
    } else if (isInvalidArgument) {
      toastMessage = "Amal rad etildi: Kiritilgan ma'lumot formati noto'g'ri.";
    }

    window.dispatchEvent(
      new CustomEvent('lifeos:error-toast', {
        detail: {
          message: toastMessage,
        },
      })
    );
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  signInWithPopup,
  firebaseSignOut,
  firebaseDeleteUser,
  reauthenticateWithPopup,
  type User,
  type DocumentSnapshot,
};
