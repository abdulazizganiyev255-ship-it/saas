export type Language = 'uz' | 'en';
export type Theme = 'dark' | 'light';

export interface HabitDefinition {
  id: string;
  label: string;
  active: boolean;
}

export type WorkoutSplit = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Cardio' | 'Recovery';

export interface WeeklySplitPlan {
  1: WorkoutSplit; // Mon
  2: WorkoutSplit; // Tue
  3: WorkoutSplit; // Wed
  4: WorkoutSplit; // Thu
  5: WorkoutSplit; // Fri
  6: WorkoutSplit; // Sat
  7: WorkoutSplit; // Sun
}

export interface UserSettings {
  dailyFoodLimit: number;
  sleepTargetHours: number;
  languageTargetMinutes: number;
  parityAnchorDate: string | null;
  habits: HabitDefinition[];
  expenseCategories: string[];
  incomeCategories: string[];
  streakFreezesUsed?: string[];
  weeklySplit?: WeeklySplitPlan;
}

export type UserPlan = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
  language: Language;
  timezone: string;
  currency: string;
  plan: UserPlan;
  proUntil?: string | null;
  settings: UserSettings;
}

export interface DayDocument {
  date: string; // YYYY-MM-DD
  top3: string[];
  habitsDone: { [habitId: string]: boolean };
  sleepHours: number;
  energy: number; // 1-5
  meals: number; // 0-3
  eveningReview: string;
  updatedAt: string;
  isFreezeUsed?: boolean;
  deleted?: boolean;
}

export type TransactionType = 'income' | 'expense' | 'savings';
export type PaymentMethod = 'cash' | 'card' | 'click_payme' | 'other';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amountUZS: number;
  amountUSD?: number;
  paymentMethod: PaymentMethod;
  note?: string;
  recurringTemplateId?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  category: string;
  amountUZS: number;
  dayOfMonth: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

// GYM
export interface ExerciseSet {
  reps: number;
  kg: number;
}

export interface WorkoutExercise {
  name: string;
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  date: string;
  split: WorkoutSplit;
  exercises: WorkoutExercise[];
  durationMin: number;
  bodyWeightKg?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

// STUDY
export interface Course {
  id: string;
  name: string;
  code: string;
  lectureTeacher?: string;
  seminarTeacher?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export type ClassType = 'lecture' | 'seminar';
export type WeekParity = 'every' | 'even' | 'odd';

export interface TimetableSlot {
  id: string;
  weekday: number; // 1 = Mon ... 7 = Sun
  startTime: string; // HH:mm
  courseId: string;
  type: ClassType;
  weekParity: WeekParity;
  room: string;
  updatedAt?: string;
  deleted?: boolean;
}

export type TaskType = 'practical' | 'homework' | 'exam' | 'project' | 'reading';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface StudyTask {
  id: string;
  title: string;
  courseId?: string;
  type: TaskType;
  due: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  estMinutes: number;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface StudyNote {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  topic?: string;
  konspektDone: boolean;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

// LANGUAGE
export type LanguageSkill = 'vocab' | 'listening' | 'speaking' | 'reading' | 'grammar';

export interface LanguageSession {
  id: string;
  date: string;
  language: string; // 'ru' | 'en' | other
  minutes: number;
  newWords: number;
  skills: LanguageSkill[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

// GOALS
export type GoalStatus = 'active' | 'done' | 'paused';

export interface Goal {
  id: string;
  title: string;
  area: string;
  target: number;
  current: number;
  unit: string;
  deadline: string; // YYYY-MM-DD
  status: GoalStatus;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

// WEEKLY REVIEW
export interface WeeklyReview {
  id: string; // ISO week key e.g. 2026-W41
  weekKey: string;
  startDate: string; // Monday YYYY-MM-DD
  endDate: string; // Sunday YYYY-MM-DD
  avgScore: number;
  daysComplete: number;
  totalSpend: number;
  spendByCategory: { [category: string]: number };
  workoutsCount: number;
  languageMinutes: number;
  tasksCompleted: number;
  whatWorked: string;
  whatBlocked: string;
  nextTop3: string;
  updatedAt: string;
  deleted?: boolean;
}

export type TabType = 'home' | 'today' | 'budget' | 'gym' | 'study' | 'language' | 'goals' | 'review' | 'leaderboard' | 'settings';
