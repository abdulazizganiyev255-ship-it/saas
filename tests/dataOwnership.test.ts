/**
 * Regression test for the pagination fix in src/services/dataOwnership.ts.
 *
 * fetchAllDocs() used to be capped at a single page (300 docs for export,
 * 400 for the now-removed delete path) — anything beyond that silently
 * never got read. This seeds 450 real documents (deliberately over the
 * 300-per-page EXPORT_PAGE_SIZE) through an authenticated, rules-
 * constrained write path (not a rules bypass), then asserts the REAL
 * exported fetchAllDocs() returns all 450, not just the first page.
 *
 * Runs against the real Firestore + Auth emulators (via
 * `firebase emulators:exec --only firestore,auth`, see package.json's
 * `test` script) through src/services/firebase.ts's own `db`/`auth`
 * exports — see the FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
 * gating there.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { auth, db } from '../src/services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { fetchAllDocs } from '../src/services/dataOwnership';

const DOC_COUNT = 450; // over EXPORT_PAGE_SIZE (300) — a single-page regression would return only 300

describe('dataOwnership pagination', () => {
  let uid: string;

  beforeAll(async () => {
    const cred = await signInAnonymously(auth);
    uid = cred.user.uid;

    // Seed through the real, authenticated, rules-constrained write path —
    // same schema transactions/{txId} expects (tests/rules.test.ts Test 10).
    // writeBatch caps at 500 ops; 450 fits in one batch.
    const batch = writeBatch(db);
    for (let i = 0; i < DOC_COUNT; i++) {
      const ref = doc(db, 'users', uid, 'transactions', `tx_${i.toString().padStart(4, '0')}`);
      batch.set(ref, {
        date: '2026-10-13',
        amountUZS: 1000,
        type: 'expense',
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }, 30_000);

  it('fetchAllDocs returns every document across multiple pages, not just the first page', async () => {
    const docs = await fetchAllDocs(uid, 'transactions');
    expect(docs).toHaveLength(DOC_COUNT);

    // Confirm no duplicates and no gaps — a cursor bug could return the
    // same page twice or skip one instead of just truncating.
    const ids = new Set(docs.map((d) => d.id));
    expect(ids.size).toBe(DOC_COUNT);
  });
});
