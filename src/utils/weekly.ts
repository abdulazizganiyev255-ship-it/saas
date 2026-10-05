import type { Language } from '../types';
import { MONTHS_SHORT } from '../i18n';
import { addDays } from './format';

export const XP_DAY_CAP = 100;
export const GRACE_DAYS_MAX = 2;

export type DayStatus = 'done' | 'grace' | 'none';

export interface WeekDaily {
  /** Seven Monday..Sunday dates (YYYY-MM-DD). */
  dates: string[];
  /** Raw day score 0-100 per day (share of active habits completed). */
  scores: number[];
  status: DayStatus[];
}

export interface WeekSummary {
  activeDays: number;
  graceDays: number;
  weeklyXP: number;
  /** 0-100. Grace days count as full active days, so using one never lowers the score. */
  consistency: number;
  /** Index (0-6) of the best day, or -1 when no XP was earned. */
  bestDayIndex: number;
  bestDayXP: number;
  dayXP: number[];
}

export function dayXP(score: number): number {
  return Math.max(0, Math.min(XP_DAY_CAP, Math.round(score)));
}

export function summarizeWeek(daily: WeekDaily): WeekSummary {
  const dayXPs = daily.scores.map(dayXP);
  const activeDays = daily.status.filter((s) => s === 'done').length;
  const graceDays = Math.min(GRACE_DAYS_MAX, daily.status.filter((s) => s === 'grace').length);
  const weeklyXP = dayXPs.reduce((a, b) => a + b, 0);
  const consistency = Math.round(((activeDays + graceDays) / 7) * 100);

  let bestDayIndex = -1;
  let bestDayXP = 0;
  dayXPs.forEach((xp, i) => {
    if (xp > bestDayXP) {
      bestDayXP = xp;
      bestDayIndex = i;
    }
  });

  return { activeDays, graceDays, weeklyXP, consistency, bestDayIndex, bestDayXP, dayXP: dayXPs };
}

/** "29-sen" style label for a YYYY-MM-DD date. */
export function formatDayMonth(dateStr: string, lang: Language): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d}-${MONTHS_SHORT[lang][m - 1]}`;
}

/** "29-sen – 5-okt" for a Monday date. Always Monday to Sunday. */
export function formatWeekRange(monday: string, lang: Language): string {
  return `${formatDayMonth(monday, lang)} – ${formatDayMonth(addDays(monday, 6), lang)}`;
}

/** ISO week number from a YYYY-MM-DD date. */
export function isoWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
