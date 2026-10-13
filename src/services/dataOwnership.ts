import { db } from './firebase';
import {
  collection,
  doc,
  documentId,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { PLANNED_COLLECTIONS } from '../config/constants';

const EXPORT_PAGE_SIZE = 300;

/**
 * Fetches every document in a subcollection, following the documentId() cursor
 * across pages so collections larger than one page are not silently truncated.
 */
async function fetchAllDocs(uid: string, subcol: string): Promise<{ id: string; data: any }[]> {
  const results: { id: string; data: any }[] = [];
  const colRef = collection(db, 'users', uid, subcol);
  let cursor: QueryDocumentSnapshot | null = null;

  while (true) {
    const q: Query<DocumentData> = cursor
      ? query(colRef, orderBy(documentId()), startAfter(cursor), limit(EXPORT_PAGE_SIZE))
      : query(colRef, orderBy(documentId()), limit(EXPORT_PAGE_SIZE));
    const snap = await getDocs(q);

    snap.forEach((d) => {
      results.push({ id: d.id, data: d.data() });
    });

    if (snap.size < EXPORT_PAGE_SIZE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }

  return results;
}

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

    // 2. Fetch all subcollections, paging through the full collection each time
    for (const subcol of PLANNED_COLLECTIONS) {
      const docs = await fetchAllDocs(uid, subcol);
      exportPayload.subcollections[subcol] = docs.map(({ id, data }) => ({ id, ...data }));
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
    // For each subcollection, repeatedly fetch and delete pages of up to 400
    // until the collection is empty, so collections larger than one page
    // are fully removed rather than silently left behind.
    for (const subcol of PLANNED_COLLECTIONS) {
      const colRef = collection(db, 'users', uid, subcol);
      while (true) {
        const q = query(colRef, limit(400));
        const snap = await getDocs(q);
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();

        if (snap.size < 400) break;
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
