import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

// Must match the "database" id in ../../firebase.json — this project does not
// use the "(default)" Firestore database.
const FIRESTORE_DATABASE_ID = 'ai-studio-lifeos-2c79514f-17fa-4c1d-8f43-a948c8c377d2';

/**
 * Admin SDK Firestore handle. Writes through this client bypass
 * firestore.rules entirely — that is the whole point: the webhook is the
 * only writer allowed to touch the Whop-managed user fields (plan,
 * proUntil, whopMembershipId, whopCustomerId, paymentStatus, planSource,
 * planUpdatedAt). The client-side rules deny those fields outright.
 */
export const db = getFirestore(FIRESTORE_DATABASE_ID);
