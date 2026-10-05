import { db, handleFirestoreError, OperationType, serverTimestamp } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import type { Goal } from '../types';

let goalsCache: { [uid: string]: Goal[] } = {};

export async function getGoals(uid: string, forceRefresh: boolean = false): Promise<Goal[]> {
  if (!forceRefresh && goalsCache[uid]) return goalsCache[uid];

  const colRef = collection(db, 'users', uid, 'goals');
  const q = query(colRef, orderBy('deadline', 'asc'), limit(50));

  try {
    const snap = await getDocs(q);
    const list: Goal[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.deleted) {
        list.push({ id: d.id, ...(data as Omit<Goal, 'id'>) });
      }
    });
    goalsCache[uid] = list;
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/goals`);
  }
}

/**
 * Free-tier goal selection:
 * Picks first slot among ['goal_1', 'goal_2', 'goal_3'] that is empty or soft-deleted.
 * If all 3 slots are occupied by active goals, throws an error.
 */
export async function addGoal(
  uid: string,
  goal: Omit<Goal, 'id'>,
  isPro: boolean = false
): Promise<Goal> {
  const nowIso = new Date().toISOString();

  try {
    if (!isPro) {
      // Free users: check server state with getDoc(goal_N) for each slot ('goal_1', 'goal_2', 'goal_3')
      const slots = ['goal_1', 'goal_2', 'goal_3'];
      let freeSlot: string | null = null;

      for (const slotId of slots) {
        const slotRef = doc(db, 'users', uid, 'goals', slotId);
        try {
          const snap = await getDoc(slotRef);
          if (!snap.exists() || snap.data()?.deleted === true) {
            freeSlot = slotId;
            break;
          }
        } catch {
          // If offline / check fails, fallback to local cache check
          const cachedActive = (goalsCache[uid] || []).filter((g) => !g.deleted).map((g) => g.id);
          if (!cachedActive.includes(slotId)) {
            freeSlot = slotId;
            break;
          }
        }
      }

      if (!freeSlot) {
        throw new Error('Free plan allows at most 3 goals');
      }

      const docRef = doc(db, 'users', uid, 'goals', freeSlot);
      const newGoal: Goal = {
        id: freeSlot,
        ...goal,
        deleted: false,
        updatedAt: nowIso,
      };

      // Immediate optimistic memory cache update
      goalsCache[uid] = [...(goalsCache[uid] || []).filter((g) => g.id !== freeSlot), newGoal];

      const payload = {
        ...goal,
        deleted: false,
        updatedAt: serverTimestamp(),
      };

      // Non-blocking firestore write: DO NOT await setDoc
      setDoc(docRef, payload).catch(async (error) => {
        // Rollback
        if (goalsCache[uid]) {
          goalsCache[uid] = goalsCache[uid].filter((g) => g.id !== freeSlot);
        }
        handleFirestoreError(error, OperationType.CREATE, `users/${uid}/goals/${freeSlot}`);
      });

      return newGoal;
    } else {
      const docRef = doc(collection(db, 'users', uid, 'goals'));
      const realId = docRef.id;
      const newGoal: Goal = { id: realId, ...goal, deleted: false, updatedAt: nowIso };

      if (goalsCache[uid]) {
        goalsCache[uid] = [...goalsCache[uid], newGoal];
      } else {
        goalsCache[uid] = [newGoal];
      }

      const payload = {
        ...goal,
        deleted: false,
        updatedAt: serverTimestamp(),
      };

      // Non-blocking firestore write: DO NOT await setDoc
      setDoc(docRef, payload).catch(async (error) => {
        if (goalsCache[uid]) {
          goalsCache[uid] = goalsCache[uid].filter((g) => g.id !== realId);
        }
        handleFirestoreError(error, OperationType.CREATE, `users/${uid}/goals`);
      });

      return newGoal;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/goals`);
  }
}

export async function updateGoal(
  uid: string,
  id: string,
  updates: Partial<Omit<Goal, 'id'>>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'goals', id);
  const nowIso = new Date().toISOString();

  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    if (goalsCache[uid]) {
      goalsCache[uid] = goalsCache[uid].map((g) => (g.id === id ? { ...g, ...updates, updatedAt: nowIso } : g));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/goals/${id}`);
  }
}

export async function deleteGoal(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'goals', id);
  try {
    // Soft delete to propagate across devices
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    if (goalsCache[uid]) {
      goalsCache[uid] = goalsCache[uid].filter((g) => g.id !== id);
    }
  } catch (error) {
    // If soft-delete is blocked (e.g. expired Pro user on goal_4+), hard delete
    try {
      await deleteDoc(docRef);
      if (goalsCache[uid]) {
        goalsCache[uid] = goalsCache[uid].filter((g) => g.id !== id);
      }
    } catch (fallbackError) {
      handleFirestoreError(fallbackError, OperationType.DELETE, `users/${uid}/goals/${id}`);
    }
  }
}
