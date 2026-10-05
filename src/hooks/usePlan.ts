import { useAuth } from '../contexts/AuthContext';
import type { UserPlan } from '../types';

export function usePlan() {
  const { userProfile } = useAuth();
  
  // Pro is active only if plan == "pro" AND proUntil is valid:
  // - missing (undefined) or null: lifetime Pro
  // - Firestore Timestamp: proUntil.toMillis() > now (or seconds/nanoseconds)
  // - any other type (string, number, boolean): treated strictly as expired!
  const isPro = Boolean(
    userProfile?.plan === 'pro' &&
    (
      userProfile.proUntil === null ||
      userProfile.proUntil === undefined ||
      (
        typeof (userProfile.proUntil as any)?.toMillis === 'function' &&
        (userProfile.proUntil as any).toMillis() > Date.now()
      ) ||
      (
        typeof (userProfile.proUntil as any)?.seconds === 'number' &&
        typeof (userProfile.proUntil as any)?.nanoseconds === 'number' &&
        ((userProfile.proUntil as any).seconds * 1000 + (userProfile.proUntil as any).nanoseconds / 1e6) > Date.now()
      )
    )
  );
  const plan: UserPlan = isPro ? 'pro' : 'free';
  const isFree = !isPro;

  return {
    plan,
    isPro,
    isFree,
    // Permissions
    canAccessFullHistory: isPro,
    canSeeFullYear: isPro,
    canAccessGym: isPro,
    canAccessStudy: isPro,
    canAccessLanguage: isPro,
    canAccessWeeklyReview: isPro,
    canExportCSV: isPro,
    maxGoals: isPro ? Infinity : 3,
  };
}
