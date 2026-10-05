import {
  db,
  handleFirestoreError,
  OperationType,
  serverTimestamp,
  Timestamp,
} from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { LanguageSession } from '../types';

import {
  getCachedItems,
  putCachedItem,
  putCachedItems,
  deleteCachedItem,
  getLastSyncMillis,
  setLastSyncMillis,
  getDocUpdatedAtMillis,
  purgeAllOldTombstones,
  runServerTimeMigration,
} from './deltaSync';

let languageCache: { [uid: string]: LanguageSession[] } = {};

export async function getLanguageSessions(uid: string, forceRefresh: boolean = false): Promise<LanguageSession[]> {
  if (!forceRefresh && languageCache[uid]) return languageCache[uid];

  const lastSyncMillis = await getLastSyncMillis(uid, 'language');
  const colRef = collection(db, 'users', uid, 'language');

  // Trigger non-blocking maintenance tasks in background
  purgeAllOldTombstones(uid).catch(() => {});
  runServerTimeMigration(uid).catch(() => {});

  if (!lastSyncMillis) {
    try {
      const q = query(colRef, orderBy('date', 'desc'), limit(60));
      const snap = await getDocs(q);
      const list: LanguageSession[] = [];
      let maxUpdatedAt = 0;

      snap.forEach((d) => {
        const raw = d.data() as any;
        const docMillis = getDocUpdatedAtMillis(raw);
        if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

        if (raw.deleted) return;
        const item: LanguageSession = {
          id: d.id,
          ...raw,
          updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
        };
        list.push(item);
      });

      await putCachedItems(uid, 'language', list);
      if (maxUpdatedAt > 0) {
        await setLastSyncMillis(uid, 'language', maxUpdatedAt);
      }
      languageCache[uid] = list;
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/language`);
    }
  } else {
    try {
      const queryStartMillis = Math.max(0, lastSyncMillis - 2 * 60 * 1000);
      const deltaQ = query(colRef, where('updatedAt', '>', Timestamp.fromMillis(queryStartMillis)));
      const deltaSnap = await getDocs(deltaQ);

      if (!deltaSnap.empty) {
        let maxUpdatedAt = lastSyncMillis;
        for (const d of deltaSnap.docs) {
          const raw = d.data() as any;
          const docMillis = getDocUpdatedAtMillis(raw);
          if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

          if (raw.deleted) {
            await deleteCachedItem(uid, 'language', d.id);
          } else {
            const item: LanguageSession = {
              id: d.id,
              ...raw,
              updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
            };
            // De-duplicate by document id
            await putCachedItem(uid, 'language', item);
          }
        }

        await setLastSyncMillis(uid, 'language', maxUpdatedAt, Date.now());
      } else {
        await setLastSyncMillis(uid, 'language', lastSyncMillis, Date.now());
      }
    } catch (err) {
      console.warn('Language delta sync error:', err);
    }

    const cached = await getCachedItems<LanguageSession>(uid, 'language');
    const sorted = cached
      .filter((s) => !s.deleted)
      .sort((a, b) => b.date.localeCompare(a.date));
    languageCache[uid] = sorted;
    return sorted;
  }
}

export async function saveLanguageSession(
  uid: string,
  session: Omit<LanguageSession, 'id'>
): Promise<LanguageSession> {
  const colRef = collection(db, 'users', uid, 'language');
  const newDocRef = doc(colRef);
  const realId = newDocRef.id;
  const nowIso = new Date().toISOString();

  const optimisticSession: LanguageSession = {
    id: realId,
    ...session,
    createdAt: session.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Immediate optimistic update to memory & local store
  await putCachedItem(uid, 'language', optimisticSession);
  if (languageCache[uid]) {
    languageCache[uid] = [optimisticSession, ...languageCache[uid].filter((s) => s.id !== realId)].sort(
      (a, b) => b.date.localeCompare(a.date)
    );
  }

  const payload = {
    ...session,
    createdAt: session.createdAt || nowIso,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking firestore write: DO NOT await setDoc
  setDoc(newDocRef, payload).catch(async (error) => {
    // Rollback
    await deleteCachedItem(uid, 'language', realId);
    if (languageCache[uid]) {
      languageCache[uid] = languageCache[uid].filter((s) => s.id !== realId);
    }
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/language`);
  });

  return optimisticSession;
}

export async function deleteLanguageSession(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'language', id);
  const cached = await getCachedItems<LanguageSession>(uid, 'language');
  const prev = cached.find((s) => s.id === id);

  await deleteCachedItem(uid, 'language', id);
  if (languageCache[uid]) {
    languageCache[uid] = languageCache[uid].filter((s) => s.id !== id);
  }

  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    try {
      await deleteDoc(docRef);
    } catch (hardErr) {
      if (prev) {
        await putCachedItem(uid, 'language', prev);
        if (languageCache[uid]) {
          languageCache[uid] = [prev, ...languageCache[uid]].sort((a, b) =>
            b.date.localeCompare(a.date)
          );
        }
      }
      handleFirestoreError(hardErr, OperationType.DELETE, `users/${uid}/language/${id}`);
    }
  }
}
