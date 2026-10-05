import React from 'react';
import type { DayDocument, HabitDefinition } from '../../types';
import { calculateDayScore } from '../../services/days';
import { addDays, formatDateDisplay } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { Lock, Sparkles } from 'lucide-react';
import { UpgradeModal } from '../common/UpgradeModal';

interface ActivityHeatmapProps {
  daysMap: { [date: string]: DayDocument };
  habits: HabitDefinition[];
  todayStr: string;
  canSeeFullYear?: boolean;
  onSelectDate: (date: string) => void;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  daysMap,
  habits,
  todayStr,
  canSeeFullYear = false,
  onSelectDate,
}) => {
  const { language } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);

  // If canSeeFullYear: 53 weeks x 7 days = 371 days
  // If free user: last 30 days
  const totalDays = canSeeFullYear ? 371 : 30;

  // Generate array of date strings ending at today
  const dates: string[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    dates.push(addDays(todayStr, -i));
  }

  const getColorClass = (score: number, hasData: boolean, isFreeze: boolean) => {
    if (isFreeze) return 'bg-token-cat-2';
    if (!hasData || score === 0) return 'bg-token-raised';
    if (score < 40) return 'bg-token-cat-1 opacity-50';
    if (score < 70) return 'bg-token-cat-1 opacity-80';
    return 'bg-token-accent';
  };

  return (
    <div className="rounded-2xl border border-token-raised bg-token-card p-4 sm:p-5 shadow-sm transition-colors text-token-text">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-token-text flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-token-cat-4-text" />
            <span>{t('statsSectionTitle', language)}</span>
          </h3>
          <p className="text-xs text-token-muted">
            {t('statsSectionSubtitle', language)}
          </p>
        </div>

        {!canSeeFullYear && (
          <button
            onClick={() => setModalOpen(true)}
            className="tap-target inline-flex items-center gap-1 rounded-lg bg-token-raised border border-token-warning px-2.5 py-1 text-[11px] font-semibold text-token-warning self-start sm:self-auto hover:opacity-80 transition cursor-pointer"
          >
            <Lock className="h-3 w-3" />
            <span>{t('fullYearLocked', language)}</span>
          </button>
        )}
      </div>

      {/* Grid container with horizontal scroll support */}
      <div className="overflow-x-auto pb-2">
        <div
          className={`grid gap-1.5 ${
            canSeeFullYear
              ? 'grid-flow-col grid-rows-7 auto-cols-max min-w-[700px]'
              : 'grid-cols-6 sm:grid-cols-10 gap-2 max-w-full'
          }`}
        >
          {dates.map((dateStr) => {
            const day = daysMap[dateStr];
            const { score } = calculateDayScore(day, habits);
            const isToday = dateStr === todayStr;
            const isFreeze = Boolean(day?.isFreezeUsed);
            const colorClass = getColorClass(score, Boolean(day), isFreeze);

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                title={`${formatDateDisplay(dateStr, language)}: ${isFreeze ? 'Frozen' : `${score}%`}`}
                className={`tap-target flex flex-col items-center justify-center rounded-md p-1 transition-all ${
                  canSeeFullYear ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-11 w-full min-w-[38px]'
                } ${colorClass} ${
                  isToday ? 'ring-2 ring-token-accent ring-offset-1' : ''
                }`}
              >
                {!canSeeFullYear && (
                  <span className="text-[10px] font-bold text-token-text pointer-events-none">
                    {dateStr.slice(8)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-token-muted pt-2 border-t border-token-raised">
        <span>0%</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-token-raised" />
          <span className="h-3 w-3 rounded-xs bg-token-cat-1 opacity-50" />
          <span className="h-3 w-3 rounded-xs bg-token-cat-1 opacity-80" />
          <span className="h-3 w-3 rounded-xs bg-token-accent" />
          <span className="h-3 w-3 rounded-xs bg-token-cat-2" title="Streak Freeze" />
        </div>
        <span>100% (70%+ = {language === 'uz' ? 'Bajarildi' : 'Done'})</span>
      </div>

      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        feature={language === 'uz' ? '365 kunlik heatmap & yillik tahlil' : 'Full Year Activity Heatmap'}
      />
    </div>
  );
};
