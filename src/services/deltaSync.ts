/**
 * Life OS Delta Sync & Offline Storage
 * High-performance IndexedDB cache scoped strictly by UID with server-timestamp delta sync.
 */

import {
  db,
  auth,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
} from 'firebase/firestore';

const DB_VERSION = 1;

export type SyncStoreName =
  | 'days'
  | 'transactions'
  | 'recurring'
  | 'workouts'
  | 'courses'
  | 'timetable'
  | 'language'
  | 'tasks'
  | 'notes'
  | 'goals'
  | 'reviews'
  | 'syncMeta';

const idbInstances: { [dbName: string]: IDBDatabase } = {};

export function openLifeOSDb(uid: string): Promise<IDBDatabase> {
  const dbName = uid ? `lifeos_cache_${uid}` : 'lifeos_cache_anon';
  if (idbInstances[dbName]) {
    return Promise.resolve(idbInstances[dbName]);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest;
      const idb = target.result;

      const stores: { name: SyncStoreName; key: string }[] = [
        { name: 'days', key: 'date' },
        { name: 'transactions', key: 'id' },
        { name: 'recurring', key: 'id' },
        { name: 'workouts', key: 'id' },
        { name: 'courses', key: 'id' },
        { name: 'timetable', key: 'id' },
        { name: 'language', key: 'id' },
        { name: 'tasks', key: 'id' },
        { name: 'notes', key: 'id' },
        { name: 'goals', key: 'id' },
        { name: 'reviews', key: 'id' },
        { name: 'syncMeta', key: 'key' },
      ];

      for (const s of stores) {
        if (!idb.objectStoreNames.contains(s.name)) {
          idb.createObjectStore(s.name, { keyPath: s.key });
        }
      }
    };

    request.onsuccess = (event) => {
      const target = event.target as IDBOpenDBRequest;
      idbInstances[dbName] = target.result;
      resolve(target.result);
    };

    request.onerror = (event) => {
      const target = event.target as IDBOpenDBRequest;
      reject(target.error);
    };
  });
}

export const TWENTY_FIVE_DAYS_MS = 25 * 24 * 60 * 60 * 1000;

/**
 * Extract epoch milliseconds from any updatedAt value (Timestamp, serialized object, string, or number).
 * Returns Date.now() if updatedAt is null or pending serverTimestamp (never NaN or 0).
 */
export function getDocUpdatedAtMillis(data: any): number {
  if (!data || data.updatedAt === null || data.updatedAt === undefined) {
    return Date.now();
  }
  const u = data.updatedAt;
  if (typeof u?.toMillis === 'function') {
    const m = u.toMillis();
    return isNaN(m) || m <= 0 ? Date.now() : m;
  }
  if (typeof u?.seconds === 'number') {
    const m = u.seconds * 1000 + (u.nanoseconds || 0) / 1e6;
    return isNaN(m) || m <= 0 ? Date.now() : m;
  }
  if (typeof u === 'string') {
    const m = new Date(u).getTime();
    return isNaN(m) || m <= 0 ? Date.now() : m;
  }
  if (typeof u === 'number') {
    return isNaN(u) || u <= 0 ? Date.now() : u;
  }
  return Date.now();
}

/**
 * Clear a specific store's local IndexedDB cache
 */
export async function clearStoreCache(uid: string, storeName: SyncStoreName): Promise<void> {
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Error clearing store ${storeName} for user ${uid}:`, err);
  }
}

/**
 * Check if a lastSync timestamp is stale (older than 25 days)
 */
export function isSyncStale(lastSyncMillis: number | null): boolean {
  if (!lastSyncMillis) return true;
  return Date.now() - lastSyncMillis > TWENTY_FIVE_DAYS_MS;
}

/**
 * Get all cached items from a user's IndexedDB object store, filtering out soft-deleted items
 */
export async function getCachedItems<T>(
  uid: string,
  storeName: SyncStoreName
): Promise<T[]> {
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const raw = (req.result as T[]) || [];
        resolve(raw.filter((item) => !(item as any)?.deleted));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Error reading from ${storeName} for user ${uid}:`, err);
    return [];
  }
}

/**
 * Get a single cached item by key for a user
 */
export async function getCachedItem<T>(
  uid: string,
  storeName: SyncStoreName,
  key: string
): Promise<T | null> {
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const item = (req.result as T) || null;
        if (item && (item as any).deleted) {
          resolve(null);
        } else {
          resolve(item);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Error getting ${key} from ${storeName}:`, err);
    return null;
  }
}

/**
 * Put a single item into the user's cache
 */
export async function putCachedItem<T>(
  uid: string,
  storeName: SyncStoreName,
  item: T
): Promise<void> {
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Error putting item in ${storeName}:`, err);
  }
}

/**
 * Batch put multiple items into the user's cache
 */
export async function putCachedItems<T>(
  uid: string,
  storeName: SyncStoreName,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Error putting multiple items in ${storeName}:`, err);
  }
}

/**
 * Delete a single item by key from the user's cache
 */
export async function deleteCachedItem(
  uid: string,
  storeName: SyncStoreName,
  key: string
): Promise<void> {
  try {
    const idb = await openLifeOSDb(uid);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Error deleting ${key} from ${storeName}:`, err);
  }
}

/**
 * Clear the cache of the specified user (on sign out or account deletion)
 * Never leaks data across different UIDs.
 */
export async function clearUserLocalCache(uid: string): Promise<void> {
  if (!uid) return;
  const dbName = `lifeos_cache_${uid}`;

  try {
    if (idbInstances[dbName]) {
      idbInstances[dbName].close();
      delete idbInstances[dbName];
    }

    if (typeof window !== 'undefined' && window.indexedDB) {
      window.indexedDB.deleteDatabase(dbName);
    }

    // Clean up all localStorage keys scoped by this uid
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(uid)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn(`Error clearing local cache for ${uid}:`, err);
  }
}

export interface SyncMeta {
  key: string;
  lastSyncMillis: number;
  lastCheckedAtMillis: number;
}

/**
 * Sync metadata helper: get lastSync epoch millis for a collection scoped by user.
 * Requirement 1 (STEP 6e): Ghost-document protection checks lastCheckedAtMillis (not lastSync).
 * If lastCheckedAtMillis > 25 days, forces full resync by clearing store cache and returning null.
 */
export async function getLastSyncMillis(uid: string, colName: string): Promise<number | null> {
  const meta = await getCachedItem<SyncMeta>(uid, 'syncMeta', colName);
  if (!meta) return null;

  const lastChecked = meta.lastCheckedAtMillis || meta.lastSyncMillis || 0;
  if (!lastChecked || Date.now() - lastChecked > TWENTY_FIVE_DAYS_MS) {
    await clearStoreCache(uid, colName as SyncStoreName);
    return null;
  }
  return meta.lastSyncMillis || null;
}

/**
 * Sync metadata helper: set lastSync and lastCheckedAt epoch millis for a collection scoped by user
 */
export async function setLastSyncMillis(
  uid: string,
  colName: string,
  lastSyncMillis: number,
  lastCheckedAtMillis: number = Date.now()
): Promise<void> {
  const existing = await getCachedItem<SyncMeta>(uid, 'syncMeta', colName);
  const updated: SyncMeta = {
    key: colName,
    lastSyncMillis: lastSyncMillis > 0 ? lastSyncMillis : (existing?.lastSyncMillis || 0),
    lastCheckedAtMillis,
  };
  await putCachedItem(uid, 'syncMeta', updated);
}

/**
 * TOMBSTONES PURGE:
 * Purges soft-deleted documents older than 30 days across all synced collections:
 * (days, transactions, recurring, workouts, language, tasks, notes)
 *
 * Rules:
 * - Runs at most once per day per device (tracked in localStorage scoped by uid)
 * - Runs ONLY for the signed-in user (verifies auth.currentUser.uid === uid)
 * - Executes in batched deletes (writeBatch up to 450 per commit)
 * - Logs failed-precondition missing index errors with console.error stating "index yo'q"
 */
export async function purgeAllOldTombstones(uid: string): Promise<void> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }

  // Run at most once per day per device
  const purgeKey = `lifeos_${uid}_last_tombstone_purge`;
  if (typeof window !== 'undefined' && window.localStorage) {
    const lastPurgeStr = localStorage.getItem(purgeKey);
    if (lastPurgeStr) {
      const lastPurgeTime = Number(lastPurgeStr);
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - lastPurgeTime < oneDayMs) {
        return; // Already purged within the last 24 hours
      }
    }
  }

  const collectionsToPurge = [
    'days',
    'transactions',
    'recurring',
    'workouts',
    'language',
    'tasks',
    'notes',
  ];

  const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    for (const colName of collectionsToPurge) {
      try {
        const colRef = collection(db, 'users', uid, colName);
        const q = query(
          colRef,
          where('deleted', '==', true),
          where('updatedAt', '<', thirtyDaysAgo)
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
          let batch = writeBatch(db);
          let count = 0;

          for (const docSnap of snap.docs) {
            batch.delete(docSnap.ref);
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        }
      } catch (colErr: any) {
        if (colErr?.code === 'failed-precondition' || colErr?.message?.includes('index')) {
          console.error(`Tombstone purge failed for ${colName}: index yo'q (composite index deleted ASC, updatedAt ASC missing)`, colErr);
        } else {
          console.error(`Tombstone purge error on ${colName}:`, colErr);
        }
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(purgeKey, Date.now().toString());
    }
  } catch (err: any) {
    if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
      console.error("Tombstone purge failed: index yo'q (composite index deleted ASC, updatedAt ASC missing)", err);
    } else {
      console.error('Tombstones purge error:', err);
    }
  }
}

const ALLOWED_KEYS_MAP: { [col: string]: string[] } = {
  days: ['date', 'top3', 'habitsDone', 'sleepHours', 'energy', 'meals', 'eveningReview', 'updatedAt', 'isFreezeUsed', 'deleted'],
  transactions: ['date', 'amountUZS', 'amountUSD', 'type', 'category', 'paymentMethod', 'note', 'recurringTemplateId', 'createdAt', 'updatedAt', 'isRecurring', 'deleted'],
  recurring: ['title', 'amountUZS', 'type', 'category', 'paymentMethod', 'dayOfMonth', 'active', 'createdAt', 'updatedAt', 'deleted'],
  goals: ['title', 'area', 'target', 'current', 'unit', 'deadline', 'status', 'createdAt', 'updatedAt', 'deleted'],
  workouts: ['date', 'split', 'durationMin', 'bodyWeightKg', 'exercises', 'notes', 'createdAt', 'updatedAt', 'deleted'],
  courses: ['name', 'code', 'lectureTeacher', 'seminarTeacher', 'professor', 'credits', 'color', 'createdAt', 'updatedAt', 'deleted'],
  timetable: ['weekday', 'startTime', 'endTime', 'courseId', 'type', 'weekParity', 'room', 'createdAt', 'updatedAt', 'deleted'],
  tasks: ['title', 'courseId', 'type', 'due', 'status', 'priority', 'estMinutes', 'createdAt', 'updatedAt', 'deleted'],
  notes: ['id', 'courseId', 'date', 'topic', 'konspektDone', 'createdAt', 'updatedAt', 'deleted'],
  language: ['date', 'language', 'minutes', 'newWords', 'skills', 'notes', 'targetMinutes', 'targetLanguage', 'createdAt', 'updatedAt', 'deleted'],
  reviews: ['id', 'weekKey', 'startDate', 'endDate', 'avgScore', 'daysComplete', 'totalSpend', 'spendByCategory', 'workoutsCount', 'languageMinutes', 'tasksCompleted', 'whatWorked', 'whatBlocked', 'nextTop3', 'stats', 'createdAt', 'updatedAt', 'deleted'],
};

/**
 * ONE-TIME MIGRATION:
 * Converts existing string updatedAt values to Firestore Timestamps for the signed-in user.
 * Requirement 2 (STEP 6e): Markers saved per collection (lifeos_${uid}_migrated_${colName}).
 * Non-Pro users skip Pro-gated collections WITHOUT setting a marker.
 * Strips fields not in hasOnly (e.g. 'id') before writing.
 */
export async function runServerTimeMigration(uid: string, isPro: boolean = false): Promise<void> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return;

  const proGatedCollections = ['recurring', 'workouts', 'courses', 'timetable', 'language', 'tasks', 'notes', 'reviews'];

  const allCollections = [
    'days',
    'transactions',
    'recurring',
    'workouts',
    'courses',
    'timetable',
    'language',
    'tasks',
    'notes',
    'goals',
    'reviews',
  ];

  try {
    for (const colName of allCollections) {
      if (!isPro && proGatedCollections.includes(colName)) {
        // Skip Pro-gated collections for non-Pro users WITHOUT setting marker
        continue;
      }

      const colMigKey = `lifeos_${uid}_migrated_${colName}`;
      if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem(colMigKey) === 'true') {
        continue;
      }

      try {
        const colRef = collection(db, 'users', uid, colName);
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          let batch = writeBatch(db);
          let count = 0;
          const allowedKeys = ALLOWED_KEYS_MAP[colName] || [];

          for (const docSnap of snap.docs) {
            const raw = docSnap.data();
            if (raw) {
              let needsUpdate = typeof raw.updatedAt === 'string';
              const cleanData: any = {};

              // Strip forbidden keys not in hasOnly
              for (const key of Object.keys(raw)) {
                if (allowedKeys.includes(key)) {
                  cleanData[key] = raw[key];
                } else {
                  needsUpdate = true;
                }
              }

              if (needsUpdate) {
                cleanData.updatedAt = serverTimestamp();
                batch.set(docSnap.ref, cleanData);
                count++;
                if (count >= 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  count = 0;
                }
              }
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        }

        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(colMigKey, 'true');
        }
      } catch (colErr) {
        console.warn(`Server time migration notice on ${colName}:`, colErr);
      }
    }
  } catch (err) {
    console.warn('Server time migration completed or skipped:', err);
  }
}
