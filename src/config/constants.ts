import type { HabitDefinition, UserSettings, WeeklySplitPlan } from '../types';

export const APP_NAME = "Life OS";

export const DEFAULT_LANGUAGE: 'uz' | 'en' = 'uz';
export const DEFAULT_TIMEZONE = 'Asia/Tashkent';
export const DEFAULT_CURRENCY = 'UZS';

export const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'deepWork', label: 'Deep work', active: true },
  { id: 'uni', label: 'Universitet', active: true },
  { id: 'language', label: 'Til', active: true },
  { id: 'gym', label: 'Zal', active: true },
  { id: 'clipping', label: 'Clipping', active: true },
  { id: 'content', label: 'Content', active: true },
  { id: 'budgetLogged', label: 'Budget yozildi', active: true },
  { id: 'protein', label: 'Protein', active: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Food',
  'Transport',
  'Gym',
  'Education',
  'Subscriptions',
  'Phone and Internet',
  'Other',
];

export const DEFAULT_INCOME_CATEGORIES: string[] = [
  'Clipping',
  'Product sales',
  'Trading',
  'Other',
];

export const DEFAULT_WEEKLY_SPLIT: WeeklySplitPlan = {
  1: 'Push',
  2: 'Pull',
  3: 'Legs',
  4: 'Push',
  5: 'Pull',
  6: 'Legs',
  7: 'Recovery',
};

export const DEFAULT_PARITY_ANCHOR_DATE = '2026-09-07'; // A Monday anchor representing an EVEN week

export const DEFAULT_SETTINGS: UserSettings = {
  dailyFoodLimit: 110000,
  sleepTargetHours: 7,
  languageTargetMinutes: 45,
  parityAnchorDate: DEFAULT_PARITY_ANCHOR_DATE,
  habits: DEFAULT_HABITS,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  streakFreezesUsed: [],
  weeklySplit: DEFAULT_WEEKLY_SPLIT,
};

export const DEFAULT_EXERCISES_BY_SPLIT: { [key: string]: { name: string; sets: { reps: number; kg: number }[] }[] } = {
  Push: [
    { name: 'Bench Press', sets: [{ reps: 8, kg: 70 }, { reps: 8, kg: 70 }, { reps: 6, kg: 75 }] },
    { name: 'Incline Dumbbell Press', sets: [{ reps: 10, kg: 24 }, { reps: 10, kg: 24 }, { reps: 8, kg: 26 }] },
    { name: 'Overhead Shoulder Press', sets: [{ reps: 10, kg: 40 }, { reps: 8, kg: 45 }] },
    { name: 'Lateral Raise', sets: [{ reps: 15, kg: 10 }, { reps: 12, kg: 12 }] },
    { name: 'Triceps Rope Pushdown', sets: [{ reps: 12, kg: 25 }, { reps: 12, kg: 25 }] },
  ],
  Pull: [
    { name: 'Pull-ups', sets: [{ reps: 10, kg: 0 }, { reps: 8, kg: 5 }, { reps: 6, kg: 10 }] },
    { name: 'Barbell Bent-over Row', sets: [{ reps: 8, kg: 60 }, { reps: 8, kg: 65 }, { reps: 8, kg: 65 }] },
    { name: 'Lat Pulldown', sets: [{ reps: 10, kg: 55 }, { reps: 10, kg: 60 }] },
    { name: 'Face Pulls', sets: [{ reps: 15, kg: 20 }, { reps: 15, kg: 20 }] },
    { name: 'Incline Dumbbell Bicep Curl', sets: [{ reps: 10, kg: 14 }, { reps: 8, kg: 16 }] },
  ],
  Legs: [
    { name: 'Barbell Squat', sets: [{ reps: 8, kg: 80 }, { reps: 8, kg: 90 }, { reps: 6, kg: 100 }] },
    { name: 'Romanian Deadlift', sets: [{ reps: 10, kg: 70 }, { reps: 8, kg: 80 }] },
    { name: 'Leg Press', sets: [{ reps: 12, kg: 140 }, { reps: 10, kg: 160 }] },
    { name: 'Standing Calf Raise', sets: [{ reps: 15, kg: 50 }, { reps: 15, kg: 50 }] },
  ],
  Upper: [
    { name: 'Incline Bench Press', sets: [{ reps: 8, kg: 65 }, { reps: 8, kg: 65 }] },
    { name: 'Chest-Supported Row', sets: [{ reps: 10, kg: 30 }, { reps: 10, kg: 30 }] },
    { name: 'Dumbbell Shoulder Press', sets: [{ reps: 10, kg: 20 }, { reps: 8, kg: 22 }] },
    { name: 'Bicep & Tricep Superset', sets: [{ reps: 12, kg: 15 }, { reps: 12, kg: 15 }] },
  ],
  Lower: [
    { name: 'Deadlift', sets: [{ reps: 5, kg: 110 }, { reps: 5, kg: 120 }] },
    { name: 'Bulgarian Split Squat', sets: [{ reps: 10, kg: 16 }, { reps: 10, kg: 16 }] },
    { name: 'Hamstring Curl', sets: [{ reps: 12, kg: 45 }, { reps: 10, kg: 50 }] },
  ],
  Cardio: [
    { name: 'Treadmill Incline Walk', sets: [{ reps: 30, kg: 0 }] },
    { name: 'Rowing Machine Interval', sets: [{ reps: 10, kg: 0 }] },
  ],
  Recovery: [
    { name: 'Outdoor Walk (40 min)', sets: [{ reps: 40, kg: 0 }] },
    { name: 'Hip & Shoulder Mobility (15 min)', sets: [{ reps: 15, kg: 0 }] },
  ],
};

// TODO: Integrate payment provider checkout URL (e.g. Payme, Click, Stripe)
export const CHECKOUT_URL = "";

export interface PricingPlan {
  id: 'free' | 'pro' | 'lifetime';
  name: string;
  priceUSD: number;
  priceLabel: string;
  period: string;
  popular?: boolean;
}

export const PRICING_PLANS: { [key: string]: PricingPlan } = {
  free: {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    priceLabel: '$0',
    period: 'forever',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUSD: 3.99,
    priceLabel: '$3.99',
    period: 'month',
    popular: true,
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    priceUSD: 59.99,
    priceLabel: '$59.99',
    period: 'one-time',
  },
};

/**
 * Sections hidden from navigation and shortcuts for the first cohort.
 * The code stays in the repo; remove an id from this list to bring a section back.
 * XP and the consistency score come only from daily habits, never from these sections.
 */
export const HIDDEN_TABS: readonly string[] = ['gym', 'study', 'language'];

export const COHORT = {
  seats: 20,
  priceUSD: 15,
  priceLabel: '$15',
} as const;

/** Public contact link, e.g. 'https://t.me/your_username'. Leave empty to hide the "Aloqa" link. */
export const CONTACT_URL = 'https://t.me/abdulaziz0333';

export const PLANNED_COLLECTIONS = [
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
] as const;
