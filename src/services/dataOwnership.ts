import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  limit,
  query,
} from 'firebase/firestore';
import { PLANNED_COLLECTIONS } from '../config/constants';

/**
 * Full export of user data as a single JSON file using paginated reads
 */
export async function exportAllUserData(uid: string): Promise<void> {
  const exportPayload: { [key: string]: any } = {
    exportedAt: new Date().toISOString(),
    uid,
    profile: null,
    subcollections: {} as { [key: string]: any[] },
  };

  try {
    // 1. Fetch user root profile
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      exportPayload.profile = userSnap.data();
    }

    // 2. Fetch all subcollections in paginated chunks
    for (const subcol of PLANNED_COLLECTIONS) {
      exportPayload.subcollections[subcol] = [];
      const colRef = collection(db, 'users', uid, subcol);
      const q = query(colRef, limit(300));
      const snap = await getDocs(q);

      snap.forEach((d) => {
        exportPayload.subcollections[subcol].push({
          id: d.id,
          ...d.data(),
        });
      });
    }

    // 3. Trigger JSON file download in browser
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export user data:', err);
    throw err;
  }
}

/**
 * Remove all user subcollections using batched deletes and remove user document
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  try {
    // For each subcollection, fetch docs and delete in batches of up to 400
    for (const subcol of PLANNED_COLLECTIONS) {
      const colRef = collection(db, 'users', uid, subcol);
      const q = query(colRef, limit(400));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    }

    // Delete user root document
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.error('Failed to delete all user data:', err);
    throw err;
  }
}
