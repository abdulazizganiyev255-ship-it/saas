import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithPopup,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
  getFirestore,
  setLogLevel,
  connectFirestoreEmulator,
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
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress internal Firestore offline/retry log noise in console
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST in the wrapped
// process's env automatically — this is never set in the real browser
// build (no `process` there at all, so this check is false by construction
// outside a Node test run) and lets tests/dataOwnership.test.ts exercise
// the real exported functions below against the local emulator instead of
// the production project. persistentLocalCache (IndexedDB) doesn't exist
// in Node, so it's skipped in that case too.
const emulatorHost = typeof process !== 'undefined' ? process.env?.FIRESTORE_EMULATOR_HOST : undefined;

// Initialize Firestore with offline persistence (multiple tab support) —
// or, under the emulator, with plain in-memory cache (no IndexedDB in Node).
export const db = emulatorHost
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(
      app,
      { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      firebaseConfig.firestoreDatabaseId
    );

if (emulatorHost) {
  const [host, portStr] = emulatorHost.split(':');
  connectFirestoreEmulator(db, host, Number(portStr));
}

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

// Same emulator-only gating as the Firestore connection above: only ever
// fires under `firebase emulators:exec`'s FIREBASE_AUTH_EMULATOR_HOST,
// never in the real browser build.
const authEmulatorHost = typeof process !== 'undefined' ? process.env?.FIREBASE_AUTH_EMULATOR_HOST : undefined;
if (authEmulatorHost) {
  // connectAuthEmulator takes a full URL (with scheme), unlike
  // connectFirestoreEmulator's separate host/port pair above.
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
}

// functions/src/deleteAccount.ts: the only way to actually delete a user's
// account (see its own comment for why — firestore.rules denies a client
// hard-delete of the root users/{uid} doc unconditionally, by design).
const functionsInstance = getFunctions(app, 'us-central1');
export const deleteUserAccountFn = httpsCallable<void, { success: true }>(functionsInstance, 'deleteUserAccount');

const functionsEmulatorHost = typeof process !== 'undefined' ? process.env?.FIREBASE_FUNCTIONS_EMULATOR_HOST : undefined;
if (functionsEmulatorHost) {
  const [fnHost, fnPortStr] = functionsEmulatorHost.split(':');
  connectFunctionsEmulator(functionsInstance, fnHost, Number(fnPortStr));
}

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
  // Full details (including PII like email/uid) stay in the console for debugging only.
  // The thrown Error carries just operation/path/message so callers never leak PII
  // if this error is ever surfaced to a user, logged remotely, or sent to analytics.
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify({ error: errMsg, operationType, path }));
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
