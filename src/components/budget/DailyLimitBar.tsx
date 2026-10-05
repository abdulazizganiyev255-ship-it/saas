import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { formatUZS } from '../../utils/format';
import { Utensils, AlertTriangle, CheckCircle } from 'lucide-react';

interface DailyLimitBarProps {
  spentFoodToday: number;
}

export const DailyLimitBar: React.FC<DailyLimitBarProps> = ({ spentFoodToday }) => {
  const { userProfile, language } = useAuth();
  const limit = userProfile?.settings?.dailyFoodLimit ?? 110000;

  const percentage = limit > 0 ? Math.round((spentFoodToday / limit) * 100) : 0;
  const clampedWidth = Math.min(100, percentage);

  // Status colors: green under 80%, amber 80-100%, red over 100%
  let statusColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
  let statusText = t('foodLimitStatusNormal', language);
  let Icon = CheckCircle;

  if (percentage >= 100) {
    statusColor = 'bg-rose-500';
    badgeColor = 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800';
    statusText = t('foodLimitStatusExceeded', language);
    Icon = AlertTriangle;
  } else if (percentage >= 80) {
    statusColor = 'bg-amber-500';
    badgeColor = 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
    statusText = t('foodLimitStatusWarning', language);
    Icon = AlertTriangle;
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('spentTodayFood', language)}
            </h3>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {formatUZS(spentFoodToday)} <span className="text-xs font-normal text-slate-400">/ {formatUZS(limit)} {t('currencyUzs', language)}</span>
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeColor}`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{percentage}% · {statusText}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${statusColor}`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
    </div>
  );
};
