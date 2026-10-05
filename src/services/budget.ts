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
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { Transaction, RecurringTemplate } from '../types';
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

// In-memory cache for month transactions: key `${uid}_${yearMonth}`
const monthTransactionsCache: { [key: string]: Transaction[] } = {};

/**
 * Fetch transactions for a specific month (YYYY-MM) with IndexedDB Delta Sync:
 * - Delta sync queries by updatedAt > lastSync - 2 minutes
 * - Stores lastSync as the highest updatedAt seen from the server
 * - De-duplicates by document id
 */
export async function getMonthTransactions(
  uid: string,
  year: number,
  monthIndex: number,
  forceRefresh: boolean = false
): Promise<Transaction[]> {
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const cacheKey = `${uid}_${year}-${monthStr}`;

  if (!forceRefresh && monthTransactionsCache[cacheKey]) {
    return monthTransactionsCache[cacheKey];
  }

  const startDate = `${year}-${monthStr}-01`;
  let nextYear = year;
  let nextMonthIndex = monthIndex + 1;
  if (nextMonthIndex > 11) {
    nextYear = year + 1;
    nextMonthIndex = 0;
  }
  const nextMonthStart = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-01`;

  // Read local cache from IndexedDB first scoped by uid
  const allCached = await getCachedItems<Transaction>(uid, 'transactions');
  const localMonthTx = allCached.filter(
    (t) => !t.deleted && t.date >= startDate && t.date < nextMonthStart
  );

  const lastSyncMillis = await getLastSyncMillis(uid, 'transactions');
  const txCol = collection(db, 'users', uid, 'transactions');

  // Trigger non-blocking maintenance tasks in background
  purgeAllOldTombstones(uid).catch(() => {});
  runServerTimeMigration(uid).catch(() => {});

  if (!lastSyncMillis) {
    // Initial fetch
    try {
      const q = query(
        txCol,
        where('date', '>=', startDate),
        where('date', '<', nextMonthStart),
        orderBy('date', 'desc'),
        limit(300)
      );
      const snap = await getDocs(q);
      const list: Transaction[] = [];
      let maxUpdatedAt = 0;

      snap.forEach((d) => {
        const raw = d.data() as any;
        const docMillis = getDocUpdatedAtMillis(raw);
        if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

        if (raw.deleted) return;
        const item: Transaction = {
          id: d.id,
          ...raw,
          updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
        };
        list.push(item);
      });

      await putCachedItems(uid, 'transactions', list);
      if (maxUpdatedAt > 0) {
        await setLastSyncMillis(uid, 'transactions', maxUpdatedAt);
      }
      monthTransactionsCache[cacheKey] = list;
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/transactions`);
    }
  } else {
    // Returning session: Delta sync with Timestamp > lastSync minus 2 minutes
    try {
      const queryStartMillis = Math.max(0, lastSyncMillis - 2 * 60 * 1000);
      const deltaQ = query(txCol, where('updatedAt', '>', Timestamp.fromMillis(queryStartMillis)));
      const deltaSnap = await getDocs(deltaQ);

      if (!deltaSnap.empty) {
        let maxUpdatedAt = lastSyncMillis;
        for (const d of deltaSnap.docs) {
          const raw = d.data() as any;
          const docMillis = getDocUpdatedAtMillis(raw);
          if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

          if (raw.deleted) {
            await deleteCachedItem(uid, 'transactions', d.id);
          } else {
            const item: Transaction = {
              id: d.id,
              ...raw,
              updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
            };
            // De-duplicate by document id
            await putCachedItem(uid, 'transactions', item);
          }
        }

        await setLastSyncMillis(uid, 'transactions', maxUpdatedAt, Date.now());
      } else {
        await setLastSyncMillis(uid, 'transactions', lastSyncMillis, Date.now());
      }
    } catch (err) {
      console.warn('Transactions delta sync error, using local cache:', err);
    }

    // Return merged month transactions from IndexedDB
    const refreshed = await getCachedItems<Transaction>(uid, 'transactions');
    const filtered = refreshed
      .filter((t) => !t.deleted && t.date >= startDate && t.date < nextMonthStart)
      .sort((a, b) => b.date.localeCompare(a.date));
    monthTransactionsCache[cacheKey] = filtered;
    return filtered;
  }

  return localMonthTx;
}

/**
 * Invalidate cache for a specific date's month
 */
export function invalidateMonthCache(uid: string, dateStr: string) {
  const [y, m] = dateStr.split('-');
  delete monthTransactionsCache[`${uid}_${y}-${m}`];
}

/**
 * Add a new transaction with optimistic cache update, rollback on rejection, and serverTimestamp
 */
export async function addTransaction(
  uid: string,
  data: Omit<Transaction, 'id'>
): Promise<Transaction> {
  const txCol = collection(db, 'users', uid, 'transactions');
  const newDocRef = doc(txCol);
  const realId = newDocRef.id;
  const nowIso = new Date().toISOString();

  const optimisticTx: Transaction = {
    id: realId,
    ...data,
    createdAt: data.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Immediate optimistic cache update
  await putCachedItem(uid, 'transactions', optimisticTx);
  invalidateMonthCache(uid, data.date);

  const payload = {
    ...data,
    createdAt: data.createdAt || nowIso,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking firestore write: DO NOT await setDoc
  setDoc(newDocRef, payload).catch(async (error) => {
    // Rollback optimistic transaction on rejection
    await deleteCachedItem(uid, 'transactions', realId);
    invalidateMonthCache(uid, data.date);
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/transactions`);
  });

  return optimisticTx;
}

/**
 * Update an existing transaction with rollback on rejection and serverTimestamp
 */
export async function updateTransaction(
  uid: string,
  txId: string,
  updates: Partial<Omit<Transaction, 'id'>>,
  originalDate: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'transactions', txId);
  const nowIso = new Date().toISOString();

  const existingList = await getCachedItems<Transaction>(uid, 'transactions');
  const prevTx = existingList.find((t) => t.id === txId);

  if (prevTx) {
    await putCachedItem(uid, 'transactions', { ...prevTx, ...updates, updatedAt: nowIso });
    invalidateMonthCache(uid, originalDate);
    if (updates.date && updates.date !== originalDate) {
      invalidateMonthCache(uid, updates.date);
    }
  }

  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    // Rollback
    if (prevTx) {
      await putCachedItem(uid, 'transactions', prevTx);
      invalidateMonthCache(uid, originalDate);
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/transactions/${txId}`);
  }
}

/**
 * Delete a transaction: soft delete (deleted: true, updatedAt: serverTimestamp) to propagate across devices
 */
export async function deleteTransaction(
  uid: string,
  txId: string,
  dateStr: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'transactions', txId);
  const existingList = await getCachedItems<Transaction>(uid, 'transactions');
  const prevTx = existingList.find((t) => t.id === txId);

  // Optimistic local deletion
  await deleteCachedItem(uid, 'transactions', txId);
  invalidateMonthCache(uid, dateStr);

  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Rollback if rejected
    if (prevTx) {
      await putCachedItem(uid, 'transactions', prevTx);
      invalidateMonthCache(uid, dateStr);
    }
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/transactions/${txId}`);
  }
}

/**
 * Recurring templates
 */
let recurringCache: { [uid: string]: RecurringTemplate[] } = {};

export async function getRecurringTemplates(
  uid: string,
  forceRefresh: boolean = false
): Promise<RecurringTemplate[]> {
  if (!forceRefresh && recurringCache[uid]) {
    return recurringCache[uid];
  }

  const colRef = collection(db, 'users', uid, 'recurring');
  const q = query(colRef, limit(50));
  try {
    const snap = await getDocs(q);
    const list: RecurringTemplate[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.deleted) {
        list.push({ id: d.id, ...(data as Omit<RecurringTemplate, 'id'>) });
      }
    });
    recurringCache[uid] = list;
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/recurring`);
  }
}

export async function addRecurringTemplate(
  uid: string,
  data: Omit<RecurringTemplate, 'id'>
): Promise<RecurringTemplate> {
  const colRef = collection(db, 'users', uid, 'recurring');
  const nowIso = new Date().toISOString();
  const payload = {
    ...data,
    createdAt: data.createdAt || nowIso,
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(colRef, payload);
    const newTemplate: RecurringTemplate = {
      id: docRef.id,
      ...data,
      createdAt: payload.createdAt,
      updatedAt: nowIso,
    };
    delete recurringCache[uid];
    return newTemplate;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/recurring`);
  }
}

export async function deleteRecurringTemplate(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'recurring', id);
  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    delete recurringCache[uid];
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/recurring/${id}`);
  }
}
