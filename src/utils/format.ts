import { DEFAULT_TIMEZONE } from '../config/constants';

/**
 * Format Uzbek So'm (UZS) with space separators, no decimals.
 * E.g. 1250000 -> "1 250 000"
 */
export function formatUZS(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '0';
  const rounded = Math.round(amount);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Parse numeric input with shortcut suffixes:
 * - "110k" or "110K" -> 110000
 * - "1.5m" or "1.5M" -> 1500000
 * - "250 000" -> 250000
 */
export function parseShortcutAmount(input: string): number | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/\s+/g, '');

  if (clean.endsWith('k')) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? null : Math.round(num * 1000);
  }

  if (clean.endsWith('m')) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? null : Math.round(num * 1000000);
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Get current date string (YYYY-MM-DD) in specified timezone (default: Asia/Tashkent)
 */
export function getTodayDateString(timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Add or subtract days to a YYYY-MM-DD date string
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Format date for display in Uzbek or English
 */
export function formatDateDisplay(dateStr: string, lang: 'uz' | 'en'): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const locale = lang === 'uz' ? 'uz-UZ' : 'en-US';
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    };
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Calculate ISO Week key (e.g. "2026-W40") for streak freeze enforcement (1 freeze per week)
 */
export function getISOWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get start and end date of a given month (YYYY-MM-DD)
 */
export function getMonthRange(year: number, monthIndex: number): { start: string; nextMonthStart: string } {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  let nextYear = year;
  let nextMonthIndex = monthIndex + 1;
  if (nextMonthIndex > 11) {
    nextYear = year + 1;
    nextMonthIndex = 0;
  }
  const nextMonthStart = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-01`;
  return { start, nextMonthStart };
}

/**
 * Get the Monday date string for any given YYYY-MM-DD
 */
export function getMondayOfDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = (date.getUTCDay() + 6) % 7; // 0 for Mon, 6 for Sun
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

/**
 * Week parity logic:
 * settings.parityAnchorDate is a Monday that is an EVEN week.
 * A date's week is even if the number of whole weeks between the anchor Monday
 * and that date's Monday is even, otherwise odd.
 */
export function getWeekParity(dateStr: string, anchorDateStr: string | null = '2026-09-07'): 'even' | 'odd' {
  const anchorMonday = getMondayOfDate(anchorDateStr || '2026-09-07');
  const targetMonday = getMondayOfDate(dateStr);

  const anchorTime = new Date(`${anchorMonday}T00:00:00Z`).getTime();
  const targetTime = new Date(`${targetMonday}T00:00:00Z`).getTime();

  const diffWeeks = Math.round((targetTime - anchorTime) / (7 * 24 * 60 * 60 * 1000));
  return Math.abs(diffWeeks) % 2 === 0 ? 'even' : 'odd';
}

/**
 * Get weekday number: 1 = Monday, ..., 7 = Sunday
 */
export function getWeekdayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Days between target date and today. Positive = in future, 0 = today, negative = overdue.
 */
export function daysUntil(targetDateStr: string, todayStr: string): number {
  const t1 = new Date(`${todayStr}T00:00:00Z`).getTime();
  const t2 = new Date(`${targetDateStr}T00:00:00Z`).getTime();
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

