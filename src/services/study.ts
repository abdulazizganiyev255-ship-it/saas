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
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import type {
  Course,
  TimetableSlot,
  StudyTask,
  StudyNote,
  TaskStatus,
} from '../types';

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

let coursesCache: { [uid: string]: Course[] } = {};
let timetableCache: { [uid: string]: TimetableSlot[] } = {};
let tasksCache: { [uid: string]: StudyTask[] } = {};
let notesCache: { [key: string]: StudyNote[] } = {};

/**
 * COURSES
 */
export async function getCourses(uid: string, forceRefresh: boolean = false): Promise<Course[]> {
  if (!forceRefresh && coursesCache[uid]) return coursesCache[uid];

  const colRef = collection(db, 'users', uid, 'courses');
  const q = query(colRef, limit(30));
  try {
    const snap = await getDocs(q);
    const list: Course[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.deleted) {
        list.push({ id: d.id, ...(data as Omit<Course, 'id'>) });
      }
    });
    coursesCache[uid] = list;
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/courses`);
  }
}

export async function addCourse(uid: string, course: Omit<Course, 'id'>): Promise<Course> {
  const colRef = collection(db, 'users', uid, 'courses');
  const nowIso = new Date().toISOString();
  const payload = {
    ...course,
    updatedAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(colRef, payload);
    const newCourse: Course = { id: docRef.id, ...course, updatedAt: nowIso };
    delete coursesCache[uid];
    return newCourse;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/courses`);
  }
}

export async function deleteCourse(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'courses', id);
  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    delete coursesCache[uid];
  } catch (error) {
    try {
      await deleteDoc(docRef);
      delete coursesCache[uid];
    } catch (hardErr) {
      handleFirestoreError(hardErr, OperationType.DELETE, `users/${uid}/courses/${id}`);
    }
  }
}

/**
 * TIMETABLE
 */
export async function getTimetable(uid: string, forceRefresh: boolean = false): Promise<TimetableSlot[]> {
  if (!forceRefresh && timetableCache[uid]) return timetableCache[uid];

  const colRef = collection(db, 'users', uid, 'timetable');
  const q = query(colRef, limit(50));
  try {
    const snap = await getDocs(q);
    const list: TimetableSlot[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.deleted) {
        list.push({ id: d.id, ...(data as Omit<TimetableSlot, 'id'>) });
      }
    });
    list.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    timetableCache[uid] = list;
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/timetable`);
  }
}

export async function addTimetableSlot(uid: string, slot: Omit<TimetableSlot, 'id'>): Promise<TimetableSlot> {
  const colRef = collection(db, 'users', uid, 'timetable');
  const nowIso = new Date().toISOString();
  const payload = {
    ...slot,
    updatedAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(colRef, payload);
    const newSlot: TimetableSlot = { id: docRef.id, ...slot, updatedAt: nowIso };
    delete timetableCache[uid];
    return newSlot;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/timetable`);
  }
}

export async function deleteTimetableSlot(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'timetable', id);
  try {
    await updateDoc(docRef, {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    delete timetableCache[uid];
  } catch (error) {
    try {
      await deleteDoc(docRef);
      delete timetableCache[uid];
    } catch (hardErr) {
      handleFirestoreError(hardErr, OperationType.DELETE, `users/${uid}/timetable/${id}`);
    }
  }
}

/**
 * TASKS (status: 'todo' | 'doing' | 'done') with Timestamp Delta Sync
 */
export async function getTasks(uid: string, forceRefresh: boolean = false): Promise<StudyTask[]> {
  if (!forceRefresh && tasksCache[uid]) return tasksCache[uid];

  const lastSyncMillis = await getLastSyncMillis(uid, 'tasks');
  const colRef = collection(db, 'users', uid, 'tasks');

  // Trigger non-blocking maintenance tasks in background
  purgeAllOldTombstones(uid).catch(() => {});
  runServerTimeMigration(uid).catch(() => {});

  if (!lastSyncMillis) {
    try {
      const q = query(colRef, orderBy('due', 'asc'), limit(100));
      const snap = await getDocs(q);
      const list: StudyTask[] = [];
      let maxUpdatedAt = 0;

      snap.forEach((d) => {
        const raw = d.data() as any;
        const docMillis = getDocUpdatedAtMillis(raw);
        if (docMillis > maxUpdatedAt) maxUpdatedAt = docMillis;

        if (raw.deleted) return;
        const item: StudyTask = {
          id: d.id,
          ...raw,
          updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
        };
        list.push(item);
      });

      await putCachedItems(uid, 'tasks', list);
      if (maxUpdatedAt > 0) {
        await setLastSyncMillis(uid, 'tasks', maxUpdatedAt);
      }
      tasksCache[uid] = list;
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/tasks`);
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
            await deleteCachedItem(uid, 'tasks', d.id);
          } else {
            const item: StudyTask = {
              id: d.id,
              ...raw,
              updatedAt: raw.updatedAt ? (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(docMillis).toISOString()) : new Date().toISOString(),
            };
            // De-duplicate by id
            await putCachedItem(uid, 'tasks', item);
          }
        }

        await setLastSyncMillis(uid, 'tasks', maxUpdatedAt, Date.now());
      } else {
        await setLastSyncMillis(uid, 'tasks', lastSyncMillis, Date.now());
      }
    } catch (err) {
      console.warn('Tasks delta sync error:', err);
    }
    const cached = await getCachedItems<StudyTask>(uid, 'tasks');
    const sorted = cached
      .filter((t) => !t.deleted)
      .sort((a, b) => a.due.localeCompare(b.due));
    tasksCache[uid] = sorted;
    return sorted;
  }
}

export async function addTask(uid: string, task: Omit<StudyTask, 'id'>): Promise<StudyTask> {
  const colRef = collection(db, 'users', uid, 'tasks');
  const newDocRef = doc(colRef);
  const realId = newDocRef.id;
  const nowIso = new Date().toISOString();

  const optimisticTask: StudyTask = {
    id: realId,
    ...task,
    createdAt: task.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Immediate optimistic update to memory & local store
  await putCachedItem(uid, 'tasks', optimisticTask);
  if (tasksCache[uid]) {
    tasksCache[uid] = [...tasksCache[uid], optimisticTask].sort((a, b) => a.due.localeCompare(b.due));
  }

  const payload = {
    ...task,
    createdAt: task.createdAt || nowIso,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking firestore write: DO NOT await setDoc
  setDoc(newDocRef, payload).catch(async (error) => {
    // Rollback
    await deleteCachedItem(uid, 'tasks', realId);
    if (tasksCache[uid]) {
      tasksCache[uid] = tasksCache[uid].filter((t) => t.id !== realId);
    }
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/tasks`);
  });

  return optimisticTask;
}

export async function updateTaskStatus(uid: string, taskId: string, status: TaskStatus): Promise<void> {
  const docRef = doc(db, 'users', uid, 'tasks', taskId);
  const nowIso = new Date().toISOString();

  const cached = await getCachedItems<StudyTask>(uid, 'tasks');
  const prev = cached.find((t) => t.id === taskId);

  if (prev) {
    await putCachedItem(uid, 'tasks', { ...prev, status, updatedAt: nowIso });
    if (tasksCache[uid]) {
      tasksCache[uid] = tasksCache[uid].map((t) => (t.id === taskId ? { ...t, status, updatedAt: nowIso } : t));
    }
  }

  const payload = {
    status,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    // Rollback
    if (prev) {
      await putCachedItem(uid, 'tasks', prev);
      if (tasksCache[uid]) {
        tasksCache[uid] = tasksCache[uid].map((t) => (t.id === taskId ? prev : t));
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/tasks/${taskId}`);
  }
}

export async function deleteTask(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'tasks', id);
  const cached = await getCachedItems<StudyTask>(uid, 'tasks');
  const prev = cached.find((t) => t.id === id);

  await deleteCachedItem(uid, 'tasks', id);
  delete tasksCache[uid];

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
        await putCachedItem(uid, 'tasks', prev);
      }
      handleFirestoreError(hardErr, OperationType.DELETE, `users/${uid}/tasks/${id}`);
    }
  }
}

/**
 * NOTES (KONSPEKT TRACKER)
 */
export async function getNotesForDate(uid: string, dateStr: string): Promise<StudyNote[]> {
  const cacheKey = `${uid}_${dateStr}`;
  if (notesCache[cacheKey]) return notesCache[cacheKey];

  const colRef = collection(db, 'users', uid, 'notes');
  const q = query(colRef, where('date', '==', dateStr), limit(20));

  try {
    const snap = await getDocs(q);
    const list: StudyNote[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.deleted) {
        list.push({ id: d.id, ...(data as Omit<StudyNote, 'id'>) });
      }
    });
    notesCache[cacheKey] = list;
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/notes`);
  }
}

export async function toggleKonspektNote(
  uid: string,
  courseId: string,
  dateStr: string,
  currentStatus: boolean,
  topic: string = ''
): Promise<boolean> {
  const cacheKey = `${uid}_${dateStr}`;
  const noteId = `${dateStr}_${courseId}`;
  const docRef = doc(db, 'users', uid, 'notes', noteId);
  const nowIso = new Date().toISOString();

  const newStatus = !currentStatus;
  const optimisticNote: StudyNote = {
    id: noteId,
    courseId,
    date: dateStr,
    topic,
    konspektDone: newStatus,
    updatedAt: nowIso,
  };

  const prevList = notesCache[cacheKey] ? [...notesCache[cacheKey]] : [];

  // Optimistic update
  await putCachedItem(uid, 'notes', optimisticNote);
  if (!notesCache[cacheKey]) notesCache[cacheKey] = [];
  const idx = notesCache[cacheKey].findIndex((n) => n.courseId === courseId);
  if (idx >= 0) {
    notesCache[cacheKey][idx] = optimisticNote;
  } else {
    notesCache[cacheKey].push(optimisticNote);
  }

  try {
    await setDoc(docRef, {
      ...optimisticNote,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return newStatus;
  } catch (error) {
    // Rollback
    notesCache[cacheKey] = prevList;
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/notes/${noteId}`);
  }
}
