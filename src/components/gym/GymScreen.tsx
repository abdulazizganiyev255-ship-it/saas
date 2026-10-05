import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { Workout, WorkoutSplit } from '../../types';
import { DEFAULT_WEEKLY_SPLIT } from '../../config/constants';
import { getWorkouts, saveWorkout, deleteWorkout, calculateProgressiveOverload } from '../../services/gym';
import { getTodayDateString, getWeekdayNumber, formatDateDisplay, getMondayOfDate, addDays } from '../../utils/format';
import { LogWorkoutModal } from './LogWorkoutModal';
import { Modal } from '../common/Modal';
import { ProGate } from '../common/ProGate';
import {
  Dumbbell,
  Plus,
  Flame,
  TrendingUp,
  Calendar,
  Trash2,
  Scale,
  Sparkles,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const GymScreen: React.FC = () => {
  const { user, userProfile, language } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getWorkouts(user.uid).then((res) => {
      if (res) setWorkouts(res);
    });
  }, [user]);

  // Today's planned split according to weekly schedule
  const todayWeekday = getWeekdayNumber(todayStr); // 1 = Mon ... 7 = Sun
  const weeklySplit = userProfile?.settings?.weeklySplit || DEFAULT_WEEKLY_SPLIT;
  const todayPlannedSplit: WorkoutSplit = (weeklySplit as any)[todayWeekday] || 'Push';

  // Calculate workouts completed this week (Mon - Sun) vs target 6
  const thisMondayStr = getMondayOfDate(todayStr);
  const thisSundayStr = addDays(thisMondayStr, 6);

  const workoutsThisWeek = useMemo(() => {
    return workouts.filter((w) => w.date >= thisMondayStr && w.date <= thisSundayStr);
  }, [workouts, thisMondayStr, thisSundayStr]);

  const targetWorkouts = 6;
  const workoutsCount = workoutsThisWeek.length;
  const progressPercent = Math.min(100, Math.round((workoutsCount / targetWorkouts) * 100));

  // Body weight trend chart data
  const bodyWeightChartData = useMemo(() => {
    return workouts
      .filter((w) => w.bodyWeightKg && w.bodyWeightKg > 0)
      .slice(0, 15)
      .reverse()
      .map((w) => ({
        date: w.date.slice(5),
        weight: w.bodyWeightKg,
      }));
  }, [workouts]);

  const handleSaveWorkout = async (data: Omit<Workout, 'id'>) => {
    if (!user) return;
    const newW = await saveWorkout(user.uid, data);
    setWorkouts((prev) => [newW, ...prev.filter((w) => w.id !== newW.id)]);
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!user) return;
    await deleteWorkout(user.uid, id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setDeleteTargetId(null);
  };

  return (
    <ProGate
      feature="gym"
      featureTitle={t('gymTitle', language)}
      featureDesc={language === 'uz' ? 'Zal mashg\'ulotlari jurnali, og\'irliklar va progressiv yuklama Pro tarifida ochiladi.' : 'Gym workout logs, exercises, and progressive overload tracking.'}
    >
      <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Header Banner & Target of 6 */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{t('gymTitle', language)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {todayPlannedSplit} Day
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'uz' ? "Bugungi rejalashtirilgan split:" : "Today's planned routine:"} <strong className="text-orange-600 dark:text-orange-400">{todayPlannedSplit}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Target 6 workouts / week progress */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {workoutsCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ {targetWorkouts}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('workoutsThisWeek', language)}
              </p>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="tap-target inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-700 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{t('logWorkoutBtn', language)}</span>
            </button>
          </div>
        </div>

        {/* Weekly workout progress bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Body Weight Line Chart */}
      {bodyWeightChartData.length > 1 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-orange-500" />
              <span>{t('bodyWeightChartTitle', language)}</span>
            </h3>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {bodyWeightChartData[bodyWeightChartData.length - 1].weight} kg
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyWeightChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kg`, language === 'uz' ? 'Vazn' : 'Weight']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ea580c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Logged Workouts History with Progressive Overload Badges */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
          <Layers className="h-4 w-4" />
          <span>{language === 'uz' ? 'Oxirgi Mashg\'ulotlar' : 'Recent Workouts'}</span>
        </h3>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-slate-900">
            <Dumbbell className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'uz'
                ? "Hali mashg'ulotlar yozilmagan. Yuqoridagi tugma orqali boshlang!"
                : "No workouts logged yet. Tap 'Log Workout' to start!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-orange-600 text-white font-extrabold text-xs px-2.5 py-1">
                      {w.split}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatDateDisplay(w.date, language)}
                    </span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {w.durationMin}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {w.bodyWeightKg && (
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {w.bodyWeightKg} kg
                      </span>
                    )}
                    <button
                      onClick={() => setDeleteTargetId(w.id)}
                      className="tap-target text-slate-400 hover:text-rose-600 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Exercises list with progressive overload badges */}
                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {w.exercises.map((ex, i) => {
                    const overload = calculateProgressiveOverload(ex.name, ex.sets, workouts, w.date);
                    return (
                      <div key={i} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{ex.name}</span>
                            {overload.isOverload && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px]">
                                <TrendingUp className="h-2.5 w-2.5" />
                                {overload.weightDiff > 0 ? `+${overload.weightDiff}kg` : `+${overload.repsDiff} reps`}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ex.sets.map((s, si) => `${s.reps} × ${s.kg}kg`).join(' · ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {w.notes && (
                  <p className="mt-2 text-xs italic text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-xl">
                    "{w.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Workout Modal */}
      <LogWorkoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveWorkout}
        workoutsHistory={workouts}
      />
    </div>
      <Modal isOpen={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title={t('deleteWorkoutConfirm', language)}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDeleteTargetId(null)}
            className="tap-target flex-1 rounded-xl bg-token-raised px-4 py-2 text-sm font-bold text-token-text"
          >
            {language === 'uz' ? 'Bekor qilish' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => deleteTargetId && handleDeleteWorkout(deleteTargetId)}
            className="tap-target flex-1 rounded-xl bg-token-danger px-4 py-2 text-sm font-bold text-token-on-accent"
          >
            {language === 'uz' ? "O'chirish" : 'Delete'}
          </button>
        </div>
      </Modal>
    </ProGate>
  );
};
