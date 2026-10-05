import {
  db,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  serverTimestamp,
  Timestamp,
} from './firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { DayDocument, HabitDefinition } from '../types';
import {
  getCachedItems,
  getCachedItem,
  putCachedItem,
  putCachedItems,
  deleteCachedItem,
  getLastSyncMillis,
  setLastSyncMillis,
  getDocUpdatedAtMillis,
  purgeAllOldTombstones,
  runServerTimeMigration,
} from './deltaSync';
import { addDays } from '../utils/format';

let daysCache: { [key: string]: DayDocument } = {};

export interface DayScoreResult {
  score: number;
  isComplete: boolean;
  completedCount: number;
  activeTotal: number;
  valueOf(): number;
}

/**
 * Shared score function:
 * Consistency across Today, Home, Weekly Review, and Heatmap.
 * Score = completed active habits / total active habits.
 * Tasks do not alter this score.
 */
export function calculateDayScore(
  dayOrHabitsDone: { [habitId: string]: boolean } | DayDocument | undefined,
  activeHabits: HabitDefinition[]
): DayScoreResult {
  const defaultRes: DayScoreResult = {
    score: 0,
    isComplete: false,
    completedCount: 0,
    activeTotal: activeHabits?.filter((h) => h.active).length || 0,
    valueOf: () => 0,
  };

  if (!activeHabits || activeHabits.length === 0) return defaultRes;
  if (!dayOrHabitsDone) return defaultRes;

  const habitsDoneMap: { [habitId: string]: boolean } =
    typeof dayOrHabitsDone === 'object' && 'habitsDone' in dayOrHabitsDone
      ? (dayOrHabitsDone as DayDocument).habitsDone || {}
      : (dayOrHabitsDone as { [habitId: string]: boolean }) || {};

  const active = activeHabits.filter((h) => h.active);
  if (active.length === 0) return defaultRes;

  const completedCount = active.filter((h) => habitsDoneMap[h.id] === true).length;
  const score = Math.round((completedCount / active.length) * 100);
  const isComplete = completedCount === active.length;

  return {
    score,
    isComplete,
    completedCount,
    activeTotal: active.length,
    valueOf: () => score,
  };
}

export function canApplyFreeze(..._args: any[]): boolean {
  return true;
}

/**
 * Subscribe to real-time updates ONLY on today's day document
 */
export function subscribeToDayDoc(
  uid: string,
  todayDateStr: string,
  onUpdate: (data: DayDocument | null) => void
): () => void {
  const dayDocRef = doc(db, 'users', uid, 'days', todayDateStr);

  return onSnapshot(
    dayDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data() as DayDocument;
        if (raw.deleted) {
          delete daysCache[`${uid}_${todayDateStr}`];
          deleteCachedItem(uid, 'days', todayDateStr).catch(() => {});
          onUpdate(null);
          return;
        }

        const data: DayDocument = {
          ...raw,
          date: raw.date || snapshot.id,
        };

        // If date was missing on read, backfill silently
        if (!raw.date) {
          setDoc(dayDocRef, { date: snapshot.id, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        }

        daysCache[`${uid}_${todayDateStr}`] = data;
        putCachedItem(uid, 'days', data).catch(() => {});
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      const errMsg = error?.message || String(error);
      if (!errMsg.includes('unavailable') && !errMsg.includes('offline') && !errMsg.includes('Could not reach Cloud Firestore backend')) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}/days/${todayDateStr}`);
      }
    }
  );
}

/**
 * Fetch a single day document.
 * Any day before today is treated as immutable from IndexedDB cache.
 */
export async function getDayDoc(
  uid: string,
  dateStr: string,
  todayStr?: string
): Promise<DayDocument | null> {
  const cacheKey = `${uid}_${dateStr}`;
  if (daysCache[cacheKey]) {
    return daysCache[cacheKey];
  }

  // Check persistent IndexedDB cache scoped by uid
  const localDay = await getCachedItem<DayDocument>(uid, 'days', dateStr);
  if (localDay) {
    daysCache[cacheKey] = localDay;
    if (todayStr && dateStr < todayStr) {
      return localDay;
    }
    return localDay;
  }

  const dayDocRef = doc(db, 'users', uid, 'days', dateStr);
  try {
    const snap = await getDoc(dayDocRef);
    if (snap.exists()) {
      const raw = snap.data() as DayDocument;
      if (raw.deleted) {
        return null;
      }

      const data: DayDocument = {
        ...raw,
        date: raw.date || snap.id,
      };

      // Backfill missing date
      if (!raw.date) {
        setDoc(dayDocRef, { date: snap.id, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }

      daysCache[cacheKey] = data;
      await putCachedItem(uid, 'days', data);
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}/days/${dateStr}`);
  }
}

/**
 * Save day document: writes date, updatedAt (serverTimestamp), updates IndexedDB, and saves to Firestore.
 * On rejection: rolls back local cache and dispatches error toast.
 */
export async function saveDayDoc(
  uid: string,
  dateStr: string,
  updates: Partial<DayDocument>
): Promise<DayDocument> {
  const cacheKey = `${uid}_${dateStr}`;
  const existing = daysCache[cacheKey] || (await getCachedItem<DayDocument>(uid, 'days', dateStr)) || {
    date: dateStr,
    top3: ['', '', ''],
    habitsDone: {},
    sleepHours: 7,
    energy: 4,
    meals: 3,
    eveningReview: '',
    updatedAt: new Date().toISOString(),
  };

  const nowIso = new Date().toISOString();
  const merged: DayDocument = {
    ...existing,
    ...updates,
    date: dateStr,
    updatedAt: nowIso,
  };

  // Optimistic memory & local cache updates
  daysCache[cacheKey] = merged;
  await putCachedItem(uid, 'days', merged);

  const dayDocRef = doc(db, 'users', uid, 'days', dateStr);
  const firestorePayload = {
    ...updates,
    date: dateStr,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking write: DO NOT await setDoc so offline UI returns immediately
  setDoc(dayDocRef, firestorePayload, { merge: true }).catch(async (error) => {
    // Rollback local cache on rejection
    daysCache[cacheKey] = existing;
    await putCachedItem(uid, 'days', existing);
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/days/${dateStr}`);
  });

  return merged;
}

/**
 * Fetch days within a date range with DELTA SYNC and IndexedDB persistence:
 * - Free users: last 30 days
 * - Pro users: last 371 days (full 53 weeks)
 * - Returning sessions: reads only documents with updatedAt > lastSync - 2 minutes!
 * - De-duplicates by document id (date)
 * - Days before today are treated as immutable in local cache.
 */
export async function getDaysRange(
  uid: string,
  startDate: string,
  endDate: string,
  isPro: boolean = false
): Promise<{ [date: string]: DayDocument }> {
  const colRef = collection(db, 'users', uid, 'days');
  const lastSyncMillis = await getLastSyncMillis(uid, 'days');

  // Trigger non-blocking maintenance tasks in background
  purgeAllOldTombstones(uid).catch(() => {});
  runServerTimeMigration(uid, isPro).catch(() => {});

  // Read existing cached days from IndexedDB scoped by uid
  const cachedList = await getCachedItems<DayDocument>(uid, 'days');
  const daysMap: { [date: string]: DayDocument } = {};
  for (const d of cachedList) {
    if (d.date && !d.deleted) {
      daysMap[d.date] = d;
      daysCache[`${uid}_${d.date}`] = d;
    }
  }

  if (!lastSyncMillis) {
    // Initial fetch: fetch all days in range
    try {
      const q = query(
        colRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const newItems: DayDocument[] = [];
      let maxUpdatedAt = 0;

      snap.forEach((docSnap) => {
        const raw = docSnap.data() as DayDocument;
        const docMillis = getDocUpdatedAtMillis(raw);
        if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

        if (raw.deleted) return;

        const item: DayDocument = {
          ...raw,
          date: raw.date || docSnap.id,
        };

        // Backfill date if missing
        if (!raw.date) {
          setDoc(docSnap.ref, { date: docSnap.id, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        }

        // De-duplicate by document date
        daysMap[item.date] = item;
        daysCache[`${uid}_${item.date}`] = item;
        newItems.push(item);
      });

      await putCachedItems(uid, 'days', newItems);
      if (maxUpdatedAt > 0) {
        await setLastSyncMillis(uid, 'days', maxUpdatedAt);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/days`);
    }
  } else {
    // Returning session: Delta sync ONLY docs updated since lastSync minus 2 minutes
    try {
      const queryStartMillis = Math.max(0, lastSyncMillis - 2 * 60 * 1000);
      const deltaQ = query(colRef, where('updatedAt', '>', Timestamp.fromMillis(queryStartMillis)));
      const deltaSnap = await getDocs(deltaQ);

      if (!deltaSnap.empty) {
        const deltaItems: DayDocument[] = [];
        let maxUpdatedAt = lastSyncMillis;

        deltaSnap.forEach((docSnap) => {
          const raw = docSnap.data() as DayDocument;
          const docMillis = getDocUpdatedAtMillis(raw);
          if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

          if (raw.deleted) {
            delete daysMap[docSnap.id];
            delete daysCache[`${uid}_${docSnap.id}`];
            deleteCachedItem(uid, 'days', docSnap.id).catch(() => {});
          } else {
            const item: DayDocument = {
              ...raw,
              date: raw.date || docSnap.id,
            };
            // De-duplicate by date
            daysMap[item.date] = item;
            daysCache[`${uid}_${item.date}`] = item;
            deltaItems.push(item);
          }
        });

        if (deltaItems.length > 0) {
          await putCachedItems(uid, 'days', deltaItems);
        }
        await setLastSyncMillis(uid, 'days', maxUpdatedAt, Date.now());
      } else {
        await setLastSyncMillis(uid, 'days', lastSyncMillis, Date.now());
      }
    } catch (err) {
      console.warn('Days delta sync error, falling back to local cache:', err);
    }
  }

  return daysMap;
}

/**
 * Calculate user streaks based on cached day records
 */
export async function calculateStreaks(
  uid: string,
  todayStr: string
): Promise<{ currentStreak: number; bestStreak: number; streak: number }> {
  const daysMap = await getDaysRange(uid, addDays(todayStr, -90), todayStr);
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Check today first
  const todayDoc = daysMap[todayStr];
  let checkDate = todayStr;

  if (todayDoc && Object.values(todayDoc.habitsDone || {}).some(Boolean)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  } else {
    checkDate = addDays(checkDate, -1);
  }

  // Count backwards
  while (true) {
    const d = daysMap[checkDate];
    if (d && (Object.values(d.habitsDone || {}).some(Boolean) || d.isFreezeUsed)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  // Calculate best streak in the range
  const sortedDates = Object.keys(daysMap).sort();
  for (const date of sortedDates) {
    const d = daysMap[date];
    if (d && (Object.values(d.habitsDone || {}).some(Boolean) || d.isFreezeUsed)) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    streak: currentStreak,
  };
}

export function calculateStreak(
  daysMap: { [date: string]: DayDocument },
  todayStr: string,
  _activeHabits?: HabitDefinition[]
): { streak: number; currentStreak: number; bestStreak: number } {
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  const todayDoc = daysMap[todayStr];
  let checkDate = todayStr;

  if (todayDoc && Object.values(todayDoc.habitsDone || {}).some(Boolean)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  } else {
    checkDate = addDays(checkDate, -1);
  }

  while (true) {
    const d = daysMap[checkDate];
    if (d && (Object.values(d.habitsDone || {}).some(Boolean) || d.isFreezeUsed)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  const sortedDates = Object.keys(daysMap).sort();
  for (const date of sortedDates) {
    const d = daysMap[date];
    if (d && (Object.values(d.habitsDone || {}).some(Boolean) || d.isFreezeUsed)) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return {
    streak: currentStreak,
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}
