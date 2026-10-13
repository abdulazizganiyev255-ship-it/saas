import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { db } from './admin.js';

/**
 * Mirrors PLANNED_COLLECTIONS in src/config/constants.ts — kept as a
 * literal here since functions/ is a separate package and does not import
 * from the app's src/.
 */
const PLANNED_COLLECTIONS = [
  'days',
  'transactions',
  'recurring',
  'workouts',
  'courses',
  'timetable',
  'tasks',
  'notes',
  'language',
  'goals',
  'reviews',
];

/**
 * Deletes a user's account in full: every subcollection, the root
 * users/{uid} document, and the Firebase Auth user itself.
 *
 * This exists because firestore.rules denies `delete` on users/{userId}
 * unconditionally — `allow delete: if false;` — for EVERYONE, including
 * the owner (see tests/rules.test.ts Test 18). That is deliberate: a hard
 * delete of the root profile should never be something a client can do
 * directly. The client-side deletion that used to live in
 * src/services/dataOwnership.ts (deleteAllUserData) correctly deleted
 * every subcollection but then always failed on its own final
 * deleteDoc(userDocRef) call — meaning "Delete Account" never actually
 * finished: subcollections were wiped, the root profile (with the user's
 * email/displayName) was left behind, and firebaseDeleteUser() never even
 * ran since it came after the now-throwing call. The Firebase Auth
 * account was never removed either. This callable is the fix: only the
 * Admin SDK (which bypasses Firestore rules entirely, same pattern as
 * whopWebhook.ts) can finish the job, and a callable function gives it a
 * verified caller identity (request.auth.uid) without needing a webhook
 * signature.
 */
export const deleteUserAccount = onCall({ region: 'us-central1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to delete your account.');
  }

  try {
    for (const subcol of PLANNED_COLLECTIONS) {
      const colRef = db.collection('users').doc(uid).collection(subcol);
      // Same paginate-until-empty shape as the client-side fix in
      // src/services/dataOwnership.ts, so a collection over one batch
      // (400 docs) is still fully deleted, not just its first page.
      while (true) {
        const snap = await colRef.limit(400).get();
        if (snap.empty) break;

        const batch = db.batch();
        snap.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();

        if (snap.size < 400) break;
      }
    }

    await db.collection('users').doc(uid).delete();
  } catch (err) {
    logger.error('deleteUserAccount: failed deleting Firestore data', { uid, error: String(err) });
    throw new HttpsError('internal', 'Failed to delete your account data. Nothing was removed from your login — please try again or contact support.');
  }

  try {
    await getAdminAuth().deleteUser(uid);
  } catch (err) {
    // Firestore data is already gone at this point — this is a genuinely
    // inconsistent state (orphaned Auth user, no profile), loud on purpose.
    logger.error('deleteUserAccount: Firestore data deleted but Auth user deletion failed — orphaned Auth account', { uid, error: String(err) });
    throw new HttpsError('internal', 'Your data was deleted but we could not remove your login. Contact support — do not retry this action.');
  }

  return { success: true };
});
