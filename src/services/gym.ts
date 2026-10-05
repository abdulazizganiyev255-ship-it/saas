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
import type { Workout, WorkoutSplit } from '../types';

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

let workoutsCache: { [uid: string]: Workout[] } = {};

/**
 * Fetch workouts with IndexedDB Delta Sync:
 * - Server timestamp delta sync with Timestamp > lastSync - 2 minutes
 * - Highest updatedAt stored as lastSync
 * - De-duplicates by workout id
 */
export async function getWorkouts(uid: string, forceRefresh: boolean = false): Promise<Workout[]> {
  if (!forceRefresh && workoutsCache[uid]) return workoutsCache[uid];

  const lastSyncMillis = await getLastSyncMillis(uid, 'workouts');
  const colRef = collection(db, 'users', uid, 'workouts');

  // Trigger non-blocking maintenance tasks in background
  purgeAllOldTombstones(uid).catch(() => {});
  runServerTimeMigration(uid).catch(() => {});

  if (!lastSyncMillis) {
    // Initial fetch
    try {
      const q = query(colRef, orderBy('date', 'desc'), limit(60));
      const snap = await getDocs(q);
      const list: Workout[] = [];
      let maxUpdatedAt = 0;

      snap.forEach((d) => {
        const raw = d.data() as any;
        const docMillis = getDocUpdatedAtMillis(raw);
        if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

        if (raw.deleted) return;
        const item: Workout = {
          id: d.id,
          ...raw,
          updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
        };
        list.push(item);
      });

      await putCachedItems(uid, 'workouts', list);
      if (maxUpdatedAt > 0) {
        await setLastSyncMillis(uid, 'workouts', maxUpdatedAt);
      }
      workoutsCache[uid] = list;
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/workouts`);
    }
  } else {
    // Returning session: delta sync only workouts with updatedAt > lastSync minus 2 minutes
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
            await deleteCachedItem(uid, 'workouts', d.id);
          } else {
            const item: Workout = {
              id: d.id,
              ...raw,
              updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
            };
            // De-duplicate by document id
            await putCachedItem(uid, 'workouts', item);
          }
        }

        await setLastSyncMillis(uid, 'workouts', maxUpdatedAt, Date.now());
      } else {
        await setLastSyncMillis(uid, 'workouts', lastSyncMillis, Date.now());
      }
    } catch (err) {
      console.warn('Workouts delta sync error, using local cache:', err);
    }

    const refreshed = await getCachedItems<Workout>(uid, 'workouts');
    const sorted = refreshed
      .filter((w) => !w.deleted)
      .sort((a, b) => b.date.localeCompare(a.date));
    workoutsCache[uid] = sorted;
    return sorted;
  }
}

/**
 * Save workout to Firestore with serverTimestamp and rollback on error
 */
export async function saveWorkout(uid: string, workout: Omit<Workout, 'id'>): Promise<Workout> {
  const colRef = collection(db, 'users', uid, 'workouts');
  const newDocRef = doc(colRef);
  const realId = newDocRef.id;
  const nowIso = new Date().toISOString();

  const optimisticWorkout: Workout = {
    id: realId,
    ...workout,
    createdAt: workout.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Immediate optimistic update to memory & local store
  await putCachedItem(uid, 'workouts', optimisticWorkout);
  if (workoutsCache[uid]) {
    workoutsCache[uid] = [optimisticWorkout, ...workoutsCache[uid].filter((w) => w.id !== realId)].sort(
      (a, b) => b.date.localeCompare(a.date)
    );
  }

  const payload = {
    ...workout,
    createdAt: workout.createdAt || nowIso,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking firestore write: DO NOT await setDoc
  setDoc(newDocRef, payload).catch(async (error) => {
    // Rollback on rejection
    await deleteCachedItem(uid, 'workouts', realId);
    if (workoutsCache[uid]) {
      workoutsCache[uid] = workoutsCache[uid].filter((w) => w.id !== realId);
    }
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/workouts`);
  });

  return optimisticWorkout;
}

/**
 * Delete a workout: soft delete (deleted: true, updatedAt: serverTimestamp) to propagate across devices
 */
export async function deleteWorkout(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'workouts', id);
  const existingList = await getCachedItems<Workout>(uid, 'workouts');
  const prevWorkout = existingList.find((w) => w.id === id);

  await deleteCachedItem(uid, 'workouts', id);
  if (workoutsCache[uid]) {
    workoutsCache[uid] = workoutsCache[uid].filter((w) => w.id !== id);
  }

  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // If updateDoc is rejected (e.g. Pro subscription expired), hard delete is allowed!
    try {
      await deleteDoc(docRef);
    } catch (hardErr) {
      if (prevWorkout) {
        await putCachedItem(uid, 'workouts', prevWorkout);
        if (workoutsCache[uid]) {
          workoutsCache[uid] = [prevWorkout, ...workoutsCache[uid]].sort((a, b) =>
            b.date.localeCompare(a.date)
          );
        }
      }
      handleFirestoreError(hardErr, OperationType.DELETE, `users/${uid}/workouts/${id}`);
    }
  }
}

/**
 * Find the most recent workout of the specified split to prefill exercises
 */
export function getLastWorkoutOfSplit(workouts: Workout[], split: WorkoutSplit): Workout | null {
  return workouts.find((w) => w.split === split && !w.deleted) || null;
}

export interface OverloadResult {
  isOverload: boolean;
  weightDiff: number;
  repsDiff: number;
}

export function calculateProgressiveOverload(
  exerciseName: string,
  currentSets: { reps: number; kg: number }[],
  workouts: Workout[],
  beforeDate?: string
): OverloadResult {
  if (!currentSets || currentSets.length === 0) {
    return { isOverload: false, weightDiff: 0, repsDiff: 0 };
  }

  // Find previous workout that had this exercise before specified date
  const pastWorkouts = workouts
    .filter((w) => !w.deleted && (beforeDate ? w.date < beforeDate : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  let prevExercise = null;
  for (const w of pastWorkouts) {
    const ex = w.exercises?.find(
      (e) => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );
    if (ex && ex.sets?.length > 0) {
      prevExercise = ex;
      break;
    }
  }

  if (!prevExercise) {
    return { isOverload: false, weightDiff: 0, repsDiff: 0 };
  }

  const currentMaxKg = Math.max(...currentSets.map((s) => s.kg || 0));
  const prevMaxKg = Math.max(...prevExercise.sets.map((s) => s.kg || 0));

  const currentTotalReps = currentSets.reduce((sum, s) => sum + (s.reps || 0), 0);
  const prevTotalReps = prevExercise.sets.reduce((sum, s) => sum + (s.reps || 0), 0);

  const weightDiff = currentMaxKg - prevMaxKg;
  const repsDiff = currentTotalReps - prevTotalReps;

  const isOverload = weightDiff > 0 || (weightDiff === 0 && repsDiff > 0);

  return {
    isOverload,
    weightDiff: Math.max(0, weightDiff),
    repsDiff: Math.max(0, repsDiff),
  };
}
