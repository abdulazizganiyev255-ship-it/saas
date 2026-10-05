import { db, serverTimestamp } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Language } from '../types';

export const TELEGRAM_RE = /^@[A-Za-z0-9_]{5,32}$/;
export const NAME_MAX = 60;

export interface WaitlistEntry {
  name: string;
  telegram: string;
  lang: Language;
}

export function validateTelegram(value: string): boolean {
  return TELEGRAM_RE.test(value.trim());
}

/**
 * Writes one waitlist entry. Document id is the lowercased username, so repeat
 * submissions overwrite instead of creating duplicates.
 * Rules (firestore.rules /waitlist): create/update only, no reads.
 */
export async function joinWaitlist(entry: WaitlistEntry): Promise<void> {
  const telegram = entry.telegram.trim();
  const ref = doc(db, 'waitlist', telegram.toLowerCase());
  const write = setDoc(ref, {
    name: entry.name.trim(),
    telegram,
    lang: entry.lang,
    createdAt: serverTimestamp(),
  });
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000));
  await Promise.race([write, timeout]);
}
