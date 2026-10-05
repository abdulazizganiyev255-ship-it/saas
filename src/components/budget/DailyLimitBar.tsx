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
  let statusColor = 'bg-token-accent';
  let badgeColor = 'text-token-accent bg-token-raised border-token-raised';
  let statusText = t('foodLimitStatusNormal', language);
  let Icon = CheckCircle;

  if (percentage >= 100) {
    statusColor = 'bg-token-danger';
    badgeColor = 'text-token-danger bg-token-raised border-token-raised';
    statusText = t('foodLimitStatusExceeded', language);
    Icon = AlertTriangle;
  } else if (percentage >= 80) {
    statusColor = 'bg-token-warning';
    badgeColor = 'text-token-warning bg-token-raised border-token-raised';
    statusText = t('foodLimitStatusWarning', language);
    Icon = AlertTriangle;
  }

  return (
    <div className="rounded-2xl border border-token-raised bg-token-card p-4 sm:p-5 shadow-sm transition-colors text-token-text">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-token-raised text-token-text">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-token-muted">
              {t('spentTodayFood', language)}
            </h3>
            <p className="text-base sm:text-lg font-black text-token-text leading-tight">
              {formatUZS(spentFoodToday)} <span className="text-xs font-normal text-token-muted">/ {formatUZS(limit)} {t('currencyUzs', language)}</span>
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeColor}`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{percentage}% · {statusText}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-token-raised">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${statusColor}`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
    </div>
  );
};
