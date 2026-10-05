import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-lifeos-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed default user profiles in Firestore bypass mode
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Free user profile
    await setDoc(doc(db, 'users/alice'), {
      uid: 'alice',
      displayName: 'Alice Free',
      email: 'alice@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      language: 'uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      plan: 'free',
      proUntil: null,
    });

    // Pro user profile (valid proUntil in future)
    await setDoc(doc(db, 'users/proUser'), {
      uid: 'proUser',
      displayName: 'Pro User',
      email: 'pro@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      language: 'uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      plan: 'pro',
      proUntil: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Expired Pro user profile
    await setDoc(doc(db, 'users/expiredUser'), {
      uid: 'expiredUser',
      displayName: 'Expired User',
      email: 'exp@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      language: 'uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      plan: 'pro',
      proUntil: Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000),
    });

    // User Bob
    await setDoc(doc(db, 'users/bob'), {
      uid: 'bob',
      displayName: 'Bob Free',
      email: 'bob@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      language: 'uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      plan: 'free',
      proUntil: null,
    });
  });
});

describe('Firestore Security Rules Unit Tests', () => {
  // Test 1: User A cannot read User B's documents
  it('1. User A cannot read User B\'s documents (isolation)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: Alice reads her own profile
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice')));

    // Rejection: Alice reads Bob's user profile or Bob's subcollection docs
    await assertFails(getDoc(doc(aliceDb, 'users/bob')));
    await assertFails(getDoc(doc(aliceDb, 'users/bob/days/2026-10-05')));
    await assertFails(getDoc(doc(aliceDb, 'users/bob/transactions/tx1')));
  });

  // Test 2: Unauthenticated reads/writes are denied
  it('2. Unauthenticated reads/writes are denied', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // Positive Control: Authenticated Alice reads her own profile
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice')));

    // Rejection: Unauthenticated reads or writes
    await assertFails(getDoc(doc(unauthDb, 'users/alice')));
    await assertFails(
      setDoc(doc(unauthDb, 'users/anon'), {
        uid: 'anon',
        displayName: 'Anon',
        email: 'anon@test.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        plan: 'free',
        proUntil: null,
      })
    );
    await assertFails(
      setDoc(doc(unauthDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );
  });

  // Test 3: Free user cannot write to Pro collections
  it('3. Free user cannot write to Pro collections', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: Free user Alice writes to a Free collection (days)
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection: Free user Alice tries to write to Pro collections
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/workouts/w1'), {
        date: '2026-10-05',
        split: 'Push',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/tasks/t1'), {
        title: 'Study math',
        status: 'todo',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/notes/n1'), {
        id: 'n1',
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/language/l1'), {
        date: '2026-10-05',
        minutes: 30,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/reviews/2026-W40'), {
        id: '2026-W40',
        weekKey: '2026-W40',
        updatedAt: serverTimestamp(),
      })
    );
  });

  // Test 4: Pro user with future proUntil CAN write; expired proUntil CANNOT write
  it('4. Pro (plan:pro, proUntil future) CAN write; expired proUntil CANNOT', async () => {
    const proDb = testEnv.authenticatedContext('proUser').firestore();
    const expiredDb = testEnv.authenticatedContext('expiredUser').firestore();

    // Positive Control: Active Pro user writes to Pro collection
    await assertSucceeds(
      setDoc(doc(proDb, 'users/proUser/workouts/w1'), {
        date: '2026-10-05',
        split: 'Push',
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection: Expired Pro user attempts the exact same write
    await assertFails(
      setDoc(doc(expiredDb, 'users/expiredUser/workouts/w1'), {
        date: '2026-10-05',
        split: 'Push',
        updatedAt: serverTimestamp(),
      })
    );
  });

  // Test 5: User cannot change plan to "pro" or edit proUntil on users/{uid}
  it('5. User cannot change plan to "pro" or edit proUntil on users/{uid}', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: Alice updates her allowed profile field (displayName)
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users/alice'), {
        displayName: 'Alice Renamed',
      })
    );

    // Rejection 1: Changing plan to 'pro' (breaking 1 field)
    await assertFails(
      updateDoc(doc(aliceDb, 'users/alice'), {
        plan: 'pro',
      })
    );

    // Rejection 2: Modifying proUntil (breaking 1 field)
    await assertFails(
      updateDoc(doc(aliceDb, 'users/alice'), {
        proUntil: Timestamp.fromMillis(Date.now() + 864000000),
      })
    );
  });

  // Test 6: Free user: goal_1..goal_3 writable; goal_4 and random ID denied
  it('6. Free user: goal_1..goal_3 writable; goal_4 and random ID denied', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    const validGoalPayload = {
      title: 'Learn English',
      target: 100,
      current: 10,
      status: 'active',
      updatedAt: serverTimestamp(),
    };

    // Positive Control: Valid free slot goal_1
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/goals/goal_1'), validGoalPayload));

    // Rejection 1: Exact same payload to goal_4 (breaking 1 field: ID)
    await assertFails(setDoc(doc(aliceDb, 'users/alice/goals/goal_4'), validGoalPayload));

    // Rejection 2: Exact same payload to random ID (breaking 1 field: ID)
    await assertFails(setDoc(doc(aliceDb, 'users/alice/goals/random_id_999'), validGoalPayload));
  });

  // Test 7: hasOnly: document with unknown field is rejected
  it('7. hasOnly: document with unknown field is rejected', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    const validDay = {
      date: '2026-10-05',
      updatedAt: serverTimestamp(),
    };

    // Positive Control: Allowed fields pass
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), validDay));

    // Rejection: Same valid payload plus ONE unknown field
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-06'), {
        ...validDay,
        date: '2026-10-06',
        unknownHackerField: 'unauthorized',
      })
    );
  });

  // Test 8: updatedAt with client time is REJECTED; serverTimestamp passes
  it('8. updatedAt with client time string is REJECTED; serverTimestamp passes', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    const validDay = {
      date: '2026-10-05',
      updatedAt: serverTimestamp(),
    };

    // Positive Control: serverTimestamp() passes
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), validDay));

    // Rejection: Same object but updatedAt changed to client ISO string (breaking 1 field)
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-06'), {
        date: '2026-10-06',
        updatedAt: new Date().toISOString(),
      })
    );
  });

  // Test 9: Soft-delete passes; Hard delete owner allowed for subcollections, other denied
  it('9. Soft-delete (deleted:true) passes; Hard delete owner allowed, other denied', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();

    // Seed doc via bypass
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: Timestamp.now(),
      });
    });

    // Positive Control 1: Soft-delete by owner succeeds
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection: Hard delete by Bob on Alice's doc fails
    await assertFails(deleteDoc(doc(bobDb, 'users/alice/days/2026-10-05')));

    // Positive Control 2: Hard delete by Alice on her own subcollection doc succeeds
    await assertSucceeds(deleteDoc(doc(aliceDb, 'users/alice/days/2026-10-05')));
  });

  // Test 10: Negative/oversized amountUZS, long text, incorrect types REJECTED
  it('10. Negative/oversized amountUZS, long text, incorrect types REJECTED', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    const validTx = {
      date: '2026-10-05',
      amountUZS: 50000,
      type: 'expense',
      updatedAt: serverTimestamp(),
    };

    // Positive Control: Valid transaction succeeds
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/transactions/tx_valid'), validTx));

    // Rejection 1: Negative amountUZS (breaking 1 field)
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/transactions/tx_neg'), {
        ...validTx,
        amountUZS: -50000,
      })
    );

    // Rejection 2: Oversized amountUZS > 10 billion (breaking 1 field)
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/transactions/tx_huge'), {
        ...validTx,
        amountUZS: 9999999999999,
      })
    );

    // Rejection 3: Overly long eveningReview > 2000 chars (breaking 1 field)
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        eveningReview: 'x'.repeat(2500),
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection 4: SleepHours string instead of number (breaking 1 field)
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        sleepHours: 'eight' as any,
        updatedAt: serverTimestamp(),
      })
    );
  });

  // Test 11: Creating new users/{uid}
  it('11. Creating new users/{uid}: plan:\'free\' passes, plan:\'pro\' denied, proUntil set denied', async () => {
    const charlieDb = testEnv.authenticatedContext('charlie').firestore();

    const baseProfile = {
      uid: 'charlie',
      displayName: 'Charlie Test',
      email: 'charlie@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      language: 'uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      plan: 'free',
      proUntil: null,
    };

    // Positive Control: plan: 'free' succeeds
    await assertSucceeds(setDoc(doc(charlieDb, 'users/charlie'), baseProfile));

    // Rejection 1: plan: 'pro' (breaking 1 field)
    await assertFails(
      setDoc(doc(charlieDb, 'users/charlie2'), {
        ...baseProfile,
        uid: 'charlie2',
        plan: 'pro',
      })
    );

    // Rejection 2: proUntil set to Timestamp (breaking 1 field)
    await assertFails(
      setDoc(doc(charlieDb, 'users/charlie3'), {
        ...baseProfile,
        uid: 'charlie3',
        proUntil: Timestamp.now(),
      })
    );
  });

  // Test 12: Writing to another user's document is denied
  it('12. Writing to another user\'s document is denied (Alice -> Bob)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: Alice writes to her own days
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection 1: Alice writes to Bob's days
    await assertFails(
      setDoc(doc(aliceDb, 'users/bob/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection 2: Alice writes to Bob's transactions
    await assertFails(
      setDoc(doc(aliceDb, 'users/bob/transactions/tx_12'), {
        date: '2026-10-05',
        amountUZS: 10000,
        type: 'expense',
        updatedAt: serverTimestamp(),
      })
    );
  });

  // Test 13: List queries
  it('13. List queries: Alice listing Bob\'s collection or root users collection denied, listing her own allowed', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: Alice lists her own days collection
    await assertSucceeds(getDocs(collection(aliceDb, 'users/alice/days')));

    // Rejection 1: Alice attempts getDocs on Bob's days
    await assertFails(getDocs(collection(aliceDb, 'users/bob/days')));

    // Rejection 2: Alice attempts getDocs on root users collection
    await assertFails(getDocs(collection(aliceDb, 'users')));
  });

  // Test 14: updatedAt with Timestamp.now() (client time) vs serverTimestamp()
  it('14. updatedAt: Timestamp.now() (client time) is denied, serverTimestamp() passes', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Positive Control: serverTimestamp() passes
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-05'), {
        date: '2026-10-05',
        updatedAt: serverTimestamp(),
      })
    );

    // Rejection: Exact same document with Timestamp.now() (client timestamp) fails
    await assertFails(
      setDoc(doc(aliceDb, 'users/alice/days/2026-10-06'), {
        date: '2026-10-06',
        updatedAt: Timestamp.now(),
      })
    );
  });

  // Test 15: Pro user can write valid payloads to all 7 Pro collections; Free user is denied
  it('15. Pro user can write valid payloads to all 7 Pro collections; exact same payloads denied for Free user', async () => {
    const proDb = testEnv.authenticatedContext('proUser').firestore();
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    const proPayloads = {
      workouts: { date: '2026-10-05', split: 'Push', durationMin: 45, updatedAt: serverTimestamp() },
      courses: { name: 'CS 101', code: 'CS101', updatedAt: serverTimestamp() },
      timetable: { weekday: 1, startTime: '09:00', type: 'lecture', weekParity: 'every', updatedAt: serverTimestamp() },
      tasks: { title: 'Homework 1', status: 'todo', updatedAt: serverTimestamp() },
      notes: { id: 'n15', date: '2026-10-05', topic: 'Pillars of OOP', updatedAt: serverTimestamp() },
      language: { date: '2026-10-05', language: 'en', minutes: 30, updatedAt: serverTimestamp() },
      reviews: { id: '2026-W40', weekKey: '2026-W40', whatWorked: 'Great focus', updatedAt: serverTimestamp() },
    };

    // 1. Workouts
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/workouts/w15'), proPayloads.workouts));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/workouts/w15'), proPayloads.workouts));

    // 2. Courses
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/courses/c15'), proPayloads.courses));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/courses/c15'), proPayloads.courses));

    // 3. Timetable
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/timetable/t15'), proPayloads.timetable));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/timetable/t15'), proPayloads.timetable));

    // 4. Tasks
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/tasks/tsk15'), proPayloads.tasks));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/tasks/tsk15'), proPayloads.tasks));

    // 5. Notes
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/notes/n15'), proPayloads.notes));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/notes/n15'), proPayloads.notes));

    // 6. Language
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/language/l15'), proPayloads.language));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/language/l15'), proPayloads.language));

    // 7. Reviews
    await assertSucceeds(setDoc(doc(proDb, 'users/proUser/reviews/2026-W40'), proPayloads.reviews));
    await assertFails(setDoc(doc(aliceDb, 'users/alice/reviews/2026-W40'), proPayloads.reviews));
  });

  // Test 16: hasOnly across all 11 collections
  it('16. hasOnly: unknown field is rejected across all 11 collections', async () => {
    const proDb = testEnv.authenticatedContext('proUser').firestore();

    const collectionsTestList: Array<{ col: string; docId: string; validPayload: any }> = [
      { col: 'days', docId: '2026-10-05', validPayload: { date: '2026-10-05', updatedAt: serverTimestamp() } },
      { col: 'transactions', docId: 'tx16', validPayload: { date: '2026-10-05', amountUZS: 10000, type: 'expense', updatedAt: serverTimestamp() } },
      { col: 'recurring', docId: 'rec16', validPayload: { title: 'Net', amountUZS: 100000, dayOfMonth: 5, updatedAt: serverTimestamp() } },
      { col: 'goals', docId: 'goal_1', validPayload: { title: 'Goal 1', target: 10, current: 1, status: 'active', updatedAt: serverTimestamp() } },
      { col: 'workouts', docId: 'w16', validPayload: { date: '2026-10-05', split: 'Push', updatedAt: serverTimestamp() } },
      { col: 'courses', docId: 'c16', validPayload: { name: 'Algorithms', updatedAt: serverTimestamp() } },
      { col: 'timetable', docId: 't16', validPayload: { weekday: 1, startTime: '09:00', type: 'lecture', weekParity: 'every', updatedAt: serverTimestamp() } },
      { col: 'tasks', docId: 'tsk16', validPayload: { title: 'Lab 1', status: 'todo', updatedAt: serverTimestamp() } },
      { col: 'notes', docId: 'n16', validPayload: { id: 'n16', date: '2026-10-05', updatedAt: serverTimestamp() } },
      { col: 'language', docId: 'l16', validPayload: { date: '2026-10-05', minutes: 20, updatedAt: serverTimestamp() } },
      { col: 'reviews', docId: '2026-W40', validPayload: { id: '2026-W40', weekKey: '2026-W40', updatedAt: serverTimestamp() } },
    ];

    for (const item of collectionsTestList) {
      const docRef = doc(proDb, `users/proUser/${item.col}/${item.docId}`);

      // Positive Control: Valid payload succeeds
      await assertSucceeds(setDoc(docRef, item.validPayload));

      // Rejection: Exact same payload plus 1 unknown field fails
      await assertFails(
        setDoc(doc(proDb, `users/proUser/${item.col}/${item.docId}_bad`), {
          ...item.validPayload,
          unknownHackerField: 'illegal_field_injection',
        })
      );
    }
  });

  // Test 17: Expired Pro user goals test
  it('17. Expired Pro user: goals with random ID denied, goal_1 allowed', async () => {
    const expiredDb = testEnv.authenticatedContext('expiredUser').firestore();

    const goalPayload = {
      title: 'Fitness Goal',
      target: 100,
      current: 20,
      status: 'active',
      updatedAt: serverTimestamp(),
    };

    // Positive Control: goal_1 is allowed for free / expired pro users
    await assertSucceeds(setDoc(doc(expiredDb, 'users/expiredUser/goals/goal_1'), goalPayload));

    // Rejection: Random goal ID is denied for expired Pro user
    await assertFails(setDoc(doc(expiredDb, 'users/expiredUser/goals/random_goal_999'), goalPayload));
  });

  // Test 18: Root user document deletion is strictly disallowed for everyone
  it('18. Root user document deletion is strictly disallowed for everyone (including owner)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // Rejection: Alice attempts to delete her own root document users/alice
    await assertFails(deleteDoc(doc(aliceDb, 'users/alice')));
  });
});
