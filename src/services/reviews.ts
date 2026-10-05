import { db, handleFirestoreError, OperationType, serverTimestamp } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { WeeklyReview, HabitDefinition } from '../types';
import { getDaysRange, calculateDayScore } from './days';
import { getWorkouts } from './gym';
import { getLanguageSessions } from './language';
import { getTasks } from './study';
import { getMonthTransactions } from './budget';
import { addDays } from '../utils/format';
import type { WeekDaily, DayStatus } from '../utils/weekly';

let reviewsCache: { [key: string]: WeeklyReview } = {};

/**
 * Fetch a weekly review for a specific ISO week key (e.g. "2026-W41")
 */
export async function getWeeklyReview(uid: string, weekKey: string): Promise<WeeklyReview | null> {
  const cacheKey = `${uid}_${weekKey}`;
  if (reviewsCache[cacheKey]) {
    return reviewsCache[cacheKey];
  }

  const docRef = doc(db, 'users', uid, 'reviews', weekKey);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...(snap.data() as Omit<WeeklyReview, 'id'>) };
      reviewsCache[cacheKey] = data;
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}/reviews/${weekKey}`);
  }
}

/**
 * Save weekly review text fields or stats
 */
export async function saveWeeklyReview(
  uid: string,
  weekKey: string,
  data: Partial<Omit<WeeklyReview, 'id' | 'weekKey'>>
): Promise<WeeklyReview> {
  const cacheKey = `${uid}_${weekKey}`;
  const docRef = doc(db, 'users', uid, 'reviews', weekKey);

  const nowIso = new Date().toISOString();
  const existing = reviewsCache[cacheKey] || {
    id: weekKey,
    weekKey,
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    avgScore: 0,
    daysComplete: 0,
    totalSpend: 0,
    spendByCategory: {},
    workoutsCount: 0,
    languageMinutes: 0,
    tasksCompleted: 0,
    whatWorked: '',
    whatBlocked: '',
    nextTop3: '',
    updatedAt: nowIso,
  };

  const updated: WeeklyReview = {
    ...existing,
    ...data,
    id: weekKey,
    weekKey,
    updatedAt: nowIso,
  };

  // Immediate optimistic update to memory cache
  reviewsCache[cacheKey] = updated;

  const payload = {
    ...data,
    weekKey,
    updatedAt: serverTimestamp(),
  };

  // Non-blocking firestore write: DO NOT await setDoc
  setDoc(docRef, payload, { merge: true }).catch(async (error) => {
    // Rollback
    reviewsCache[cacheKey] = existing;
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/reviews/${weekKey}`);
  });

  return updated;
}


/**
 * Daily breakdown for a Monday-start week (days collection only, no other reads).
 * A day is "done" when at least one active habit is completed, "grace" when a freeze was used.
 */
export async function calculateWeekDaily(
  uid: string,
  monday: string,
  habits: HabitDefinition[]
): Promise<WeekDaily> {
  const daysMap = await getDaysRange(uid, monday, addDays(monday, 6));
  const dates: string[] = [];
  const scores: number[] = [];
  const status: DayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const dayDoc = daysMap[date];
    const res = dayDoc ? calculateDayScore(dayDoc, habits) : null;
    dates.push(date);
    scores.push(res ? res.score : 0);
    if (res && res.completedCount >= 1) status.push('done');
    else if (dayDoc?.isFreezeUsed) status.push('grace');
    else status.push('none');
  }
  return { dates, scores, status };
}

/**
 * Auto-calculate stats for a 7-day period (Mon - Sun)
 */
export async function calculateWeekStats(
  uid: string,
  startDate: string, // Mon YYYY-MM-DD
  endDate: string,   // Sun YYYY-MM-DD
  habits: HabitDefinition[]
): Promise<{
  avgScore: number;
  daysComplete: number;
  totalSpend: number;
  totalIncome: number;
  spendByCategory: { [cat: string]: number };
  workoutsCount: number;
  languageMinutes: number;
  tasksCompleted: number;
}> {
  // 1. Days stats (7 days)
  const daysMap = await getDaysRange(uid, startDate, endDate);
  let totalScore = 0;
  let completeDays = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = addDays(startDate, i);
    const dayDoc = daysMap[curDate];
    if (dayDoc) {
      const { score, isComplete } = calculateDayScore(dayDoc, habits);
      totalScore += score;
      if (isComplete || dayDoc.isFreezeUsed) {
        completeDays++;
      }
    }
  }
  const avgScore = Math.round(totalScore / 7);

  // 2. Workouts count
  const allWorkouts = await getWorkouts(uid);
  const workoutsInRange = (allWorkouts || []).filter(
    (w) => w.date >= startDate && w.date <= endDate
  );

  // 3. Language minutes
  const allLangSessions = await getLanguageSessions(uid);
  const langInRange = (allLangSessions || []).filter(
    (s) => s.date >= startDate && s.date <= endDate
  );
  const totalLangMin = langInRange.reduce((sum, s) => sum + s.minutes, 0);

  // 4. Tasks completed
  const allTasks = await getTasks(uid);
  const tasksCompleted = (allTasks || []).filter(
    (t) => t.status === 'done' && t.due >= startDate && t.due <= endDate
  ).length;

  // 5. Spend in range
  const [startY, startM] = startDate.split('-').map(Number);
  const [endY, endM] = endDate.split('-').map(Number);

  // Fetch month transactions for start month and end month if they differ
  const t1 = await getMonthTransactions(uid, startY, startM - 1);
  let combinedTx = [...(t1 || [])];
  if (startY !== endY || startM !== endM) {
    const t2 = await getMonthTransactions(uid, endY, endM - 1);
    combinedTx = [...combinedTx, ...(t2 || [])];
  }

  const txInRange = combinedTx.filter(
    (t) => t.date >= startDate && t.date <= endDate && t.type === 'expense'
  );

  let totalSpend = 0;
  const totalIncome = combinedTx
    .filter((t) => t.date >= startDate && t.date <= endDate && t.type === 'income')
    .reduce((sum, t) => sum + t.amountUZS, 0);
  const spendByCategory: { [cat: string]: number } = {};

  txInRange.forEach((t) => {
    totalSpend += t.amountUZS;
    spendByCategory[t.category] = (spendByCategory[t.category] || 0) + t.amountUZS;
  });

  return {
    avgScore,
    daysComplete: completeDays,
    totalSpend,
    totalIncome,
    spendByCategory,
    workoutsCount: workoutsInRange.length,
    languageMinutes: totalLangMin,
    tasksCompleted,
  };
}
