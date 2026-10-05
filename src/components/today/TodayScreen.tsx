import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { DayDocument, HabitDefinition, TimetableSlot, Course, StudyNote, WorkoutSplit, TabType } from '../../types';
import {
  subscribeToDayDoc,
  getDayDoc,
  saveDayDoc,
  getDaysRange,
  calculateDayScore,
  calculateStreak,
  canApplyFreeze,
} from '../../services/days';
import { getTimetable, getCourses, getNotesForDate, toggleKonspektNote } from '../../services/study';
import { DEFAULT_WEEKLY_SPLIT } from '../../config/constants';
import {
  getTodayDateString,
  addDays,
  formatDateDisplay,
  getISOWeekKey,
  getWeekdayNumber,
  getWeekParity,
} from '../../utils/format';
import { ScoreRing } from './ScoreRing';
import { ActivityHeatmap } from './ActivityHeatmap';
import { usePlan } from '../../hooks/usePlan';
import {
  Flame,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Circle,
  MoonStar,
  Zap,
  UtensilsCrossed,
  BarChart3,
  Check,
  Clock,
  Sparkles,
  GraduationCap,
  Dumbbell,
  ArrowRight,
  Languages,
  Target,
  CalendarCheck,
} from 'lucide-react';

interface TodayScreenProps {
  onNavigate?: (tab: TabType) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onNavigate }) => {
  const { user, userProfile, language, updateUserSettings } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [currentDay, setCurrentDay] = useState<DayDocument>({
    date: todayStr,
    top3: ['', '', ''],
    habitsDone: {},
    sleepHours: userProfile?.settings?.sleepTargetHours ?? 7,
    energy: 4,
    meals: 3,
    eveningReview: '',
    updatedAt: new Date().toISOString(),
  });

  const [daysMap, setDaysMap] = useState<{ [date: string]: DayDocument }>({});
  const [showStats, setShowStats] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [freezeAppliedToast, setFreezeAppliedToast] = useState(false);

  // University classes & konspekt notes state for today
  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);

  const activeHabits: HabitDefinition[] = useMemo(() => {
    const list = userProfile?.settings?.habits || [];
    return list.filter((h) => h.active);
  }, [userProfile?.settings?.habits]);

  // Real-time listener for today or selected date
  useEffect(() => {
    if (!user) return;

    if (selectedDate === todayStr) {
      const unsub = subscribeToDayDoc(user.uid, todayStr, (docData) => {
        if (docData) {
          setCurrentDay(docData);
          setDaysMap((prev) => ({ ...prev, [todayStr]: docData }));
        } else {
          const freshDay: DayDocument = {
            date: todayStr,
            top3: ['', '', ''],
            habitsDone: {},
            sleepHours: userProfile?.settings?.sleepTargetHours ?? 7,
            energy: 4,
            meals: 3,
            eveningReview: '',
            updatedAt: new Date().toISOString(),
          };
          setCurrentDay(freshDay);
        }
      });
      return () => unsub();
    } else {
      let mounted = true;
      getDayDoc(user.uid, selectedDate).then((docData) => {
        if (!mounted) return;
        if (docData) {
          setCurrentDay(docData);
          setDaysMap((prev) => ({ ...prev, [selectedDate]: docData }));
        } else {
          setCurrentDay({
            date: selectedDate,
            top3: ['', '', ''],
            habitsDone: {},
            sleepHours: userProfile?.settings?.sleepTargetHours ?? 7,
            energy: 3,
            meals: 3,
            eveningReview: '',
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return () => {
        mounted = false;
      };
    }
  }, [user, selectedDate, todayStr, userProfile?.settings?.sleepTargetHours]);

  const { isPro } = usePlan();

  // Load last 30 days (Free) or 371 days (Pro) for streak & heatmap with Delta Sync
  useEffect(() => {
    if (!user) return;
    const daysBack = isPro ? 370 : 29;
    const startRange = addDays(todayStr, -daysBack);
    getDaysRange(user.uid, startRange, todayStr, isPro).then((map) => {
      if (map) {
        setDaysMap((prev) => ({ ...prev, ...map }));
      }
    });
  }, [user, todayStr, isPro]);

  // Load classes & notes for today
  useEffect(() => {
    if (!user) return;
    getCourses(user.uid).then((res) => { if (res) setCourses(res); });
    getTimetable(user.uid).then((res) => { if (res) setTimetable(res); });
    getNotesForDate(user.uid, selectedDate).then((res) => { if (res) setNotes(res); });
  }, [user, selectedDate]);

  // Calculate day score
  const { score, isComplete, completedCount, activeTotal } = calculateDayScore(
    currentDay,
    activeHabits
  );

  // Calculate streak
  const { streak } = calculateStreak(daysMap, todayStr, activeHabits);

  // Streak freeze calculation (1 per ISO week)
  const currentWeekKey = getISOWeekKey(selectedDate);
  const freezesUsed = userProfile?.settings?.streakFreezesUsed || [];
  const freezeAvailableForWeek = canApplyFreeze(selectedDate, freezesUsed);

  // Debounced auto-save for evening review (800ms)
  const reviewDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleReviewChange = (text: string) => {
    setCurrentDay((prev) => ({ ...prev, eveningReview: text }));
    setSaveStatus('saving');

    if (reviewDebounceTimer.current) {
      clearTimeout(reviewDebounceTimer.current);
    }

    reviewDebounceTimer.current = setTimeout(async () => {
      if (!user) return;
      await saveDayDoc(user.uid, selectedDate, { eveningReview: text });
      setSaveStatus('saved');
    }, 800);
  };

  // Optimistic Top 3 inputs change
  const handleTop3Change = async (index: number, value: string) => {
    const newTop3 = [...(currentDay.top3 || ['', '', ''])];
    newTop3[index] = value;
    setCurrentDay((prev) => ({ ...prev, top3: newTop3 }));

    if (!user) return;
    setSaveStatus('saving');
    await saveDayDoc(user.uid, selectedDate, { top3: newTop3 });
    setSaveStatus('saved');
  };

  // Optimistic Habit toggle
  const handleToggleHabit = async (habitId: string) => {
    const currentStatus = currentDay.habitsDone?.[habitId] || false;
    const updatedHabitsDone = {
      ...(currentDay.habitsDone || {}),
      [habitId]: !currentStatus,
    };

    const optimisticDay: DayDocument = {
      ...currentDay,
      habitsDone: updatedHabitsDone,
    };

    setCurrentDay(optimisticDay);
    setDaysMap((prev) => ({ ...prev, [selectedDate]: optimisticDay }));

    if (!user) return;
    setSaveStatus('saving');
    await saveDayDoc(user.uid, selectedDate, { habitsDone: updatedHabitsDone });
    setSaveStatus('saved');
  };

  // Metric updates (sleep, energy, meals)
  const handleMetricUpdate = async (field: 'sleepHours' | 'energy' | 'meals', val: number) => {
    const updatedDay: DayDocument = {
      ...currentDay,
      [field]: val,
    };
    setCurrentDay(updatedDay);
    setDaysMap((prev) => ({ ...prev, [selectedDate]: updatedDay }));

    if (!user) return;
    setSaveStatus('saving');
    await saveDayDoc(user.uid, selectedDate, { [field]: val });
    setSaveStatus('saved');
  };

  // Apply streak freeze
  const handleApplyFreeze = async () => {
    if (!user || !freezeAvailableForWeek) return;

    const updatedDay: DayDocument = {
      ...currentDay,
      isFreezeUsed: true,
    };
    setCurrentDay(updatedDay);
    setDaysMap((prev) => ({ ...prev, [selectedDate]: updatedDay }));

    await saveDayDoc(user.uid, selectedDate, { isFreezeUsed: true });

    const updatedFreezes = [...freezesUsed, currentWeekKey];
    await updateUserSettings({ streakFreezesUsed: updatedFreezes });

    setFreezeAppliedToast(true);
    setTimeout(() => setFreezeAppliedToast(false), 3000);
  };

  // Parity & today's classes
  const selectedWeekday = getWeekdayNumber(selectedDate);
  const selectedParity = getWeekParity(selectedDate, userProfile?.settings?.parityAnchorDate);

  const todayClasses = useMemo(() => {
    return timetable.filter((slot) => {
      const matchDay = slot.weekday === selectedWeekday;
      const matchParity = slot.weekParity === 'every' || slot.weekParity === selectedParity;
      return matchDay && matchParity;
    });
  }, [timetable, selectedWeekday, selectedParity]);

  const isKonspektDone = (courseId: string) => {
    return Boolean(notes.find((n) => n.courseId === courseId && n.konspektDone));
  };

  const handleToggleKonspekt = async (courseId: string) => {
    if (!user) return;
    const current = isKonspektDone(courseId);
    await toggleKonspektNote(user.uid, courseId, selectedDate, current);
    const updated = await getNotesForDate(user.uid, selectedDate);
    if (updated) setNotes([...updated]);
  };

  // Weekly split
  const weeklySplit = userProfile?.settings?.weeklySplit || DEFAULT_WEEKLY_SPLIT;
  const todayPlannedSplit: WorkoutSplit = (weeklySplit as any)[selectedWeekday] || 'Push';

  const isToday = selectedDate === todayStr;

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:py-7 space-y-5">
      {/* 1. Date Navigation & Status Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
            className="tap-target flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition"
            aria-label={t('prevDay', language)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {formatDateDisplay(selectedDate, language)}
            </span>
            <span className="text-[11px] text-slate-400">
              {isToday ? t('todayDate', language) : selectedDate}
            </span>
          </div>

          <button
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
            className="tap-target flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition"
            aria-label={t('nextDay', language)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="tap-target flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-indigo-500" />
              <span>{t('jumpToToday', language)}</span>
            </button>
          )}

          <button
            onClick={() => setShowStats((prev) => !prev)}
            className={`tap-target flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
              showStats
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{showStats ? t('hideStats', language) : t('viewStats', language)}</span>
          </button>
        </div>
      </div>

      {/* Activity Heatmap Drawer if open */}
      {showStats && (
        <ActivityHeatmap
          daysMap={daysMap}
          habits={activeHabits}
          todayStr={todayStr}
          canSeeFullYear={isPro}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setShowStats(false);
          }}
        />
      )}

      {/* Freeze applied toast notification */}
      {freezeAppliedToast && (
        <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs font-bold text-cyan-600 dark:text-cyan-400 animate-fade-in">
          <Snowflake className="h-4 w-4" />
          <span>{t('freezeAppliedSuccess', language)}</span>
        </div>
      )}

      {/* Sunday Weekly Review Highlighted Card */}
      {selectedWeekday === 7 && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 dark:border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {language === 'uz' ? 'Yakshanba Tahlili' : 'Sunday Retrospective'}
              </p>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'uz'
                  ? 'Haftani sarhisob qiling va rejalarni belgilang!'
                  : 'Time to complete your weekly reflection & review!'}
              </h3>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('review')}
              className="tap-target shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition"
            >
              <span>{language === 'uz' ? 'Tahlil' : 'Review'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Top Header Card: Streak + Score Ring + Status */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-950/40">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {streak}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('streakLabel', language)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isComplete
                    ? t('dayCompleteBadge', language)
                    : `${completedCount}/${activeTotal} ${language === 'uz' ? 'bajarildi' : 'completed'}`}
                </p>
              </div>
            </div>

            {/* Streak Freeze Badge & Trigger */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                  currentDay.isFreezeUsed
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300'
                    : freezeAvailableForWeek
                    ? 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-500'
                }`}
              >
                <Snowflake className="h-3 w-3 text-cyan-500" />
                <span>
                  {currentDay.isFreezeUsed
                    ? t('freezeUsedBadge', language)
                    : `${freezeAvailableForWeek ? '1' : '0'}/1 ${t('streakFreezeLabel', language)}`}
                </span>
              </div>

              {!isComplete && !currentDay.isFreezeUsed && freezeAvailableForWeek && (
                <button
                  onClick={handleApplyFreeze}
                  className="tap-target text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 underline underline-offset-2"
                >
                  {t('useFreezeBtn', language)}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={score} size={76} strokeWidth={7} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dayScoreLabel', language)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Top 3 Priorities */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>{t('top3Heading', language)}</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">1-3</span>
        </div>

        <div className="space-y-2.5">
          {[0, 1, 2].map((idx) => {
            const val = currentDay.top3?.[idx] || '';
            const placeholders = [
              t('top3Placeholder1', language),
              t('top3Placeholder2', language),
              t('top3Placeholder3', language),
            ];

            return (
              <div key={idx} className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-indigo-500">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleTop3Change(idx, e.target.value)}
                  placeholder={placeholders[idx]}
                  className="tap-target w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950 transition"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. One-Tap Habit Checklist (Optimistic UI, Instant Toggle) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('habitsHeading', language)}
          </h2>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {completedCount} / {activeTotal} ({score}%)
          </span>
        </div>

        {activeHabits.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            {t('noHabitsActive', language)}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeHabits.map((habit) => {
              const isChecked = currentDay.habitsDone?.[habit.id] || false;
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => handleToggleHabit(habit.id)}
                  className={`tap-target flex items-center justify-between rounded-xl p-3 text-left transition-all ${
                    isChecked
                      ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                      : 'bg-slate-50/70 border border-slate-200/70 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-sm font-semibold truncate pr-2 ${isChecked ? 'line-through text-emerald-700 dark:text-emerald-400' : ''}`}>
                    {habit.label}
                  </span>
                  {isChecked ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 dark:text-slate-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. INTEGRATED LINK: Today's Classes & Konspekt Tracker */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 sm:p-5 dark:border-blue-900/50 dark:bg-blue-950/20 transition-colors space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              {t('todayClassesShortcut', language)}
            </h3>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('study')}
              className="tap-target text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>Study</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {todayClasses.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('noClassesScheduledToday', language)}
          </p>
        ) : (
          <div className="space-y-2">
            {todayClasses.map((cls) => {
              const course = courses.find((c) => c.id === cls.courseId);
              const done = isKonspektDone(cls.courseId);

              return (
                <div
                  key={cls.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200/70 dark:bg-slate-900 dark:border-slate-800 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {course?.name || cls.courseId}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {cls.startTime} · {cls.room || cls.type}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleKonspekt(cls.courseId)}
                    className={`tap-target shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      done
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{done ? t('konspektDoneBtn', language) : t('konspektPending', language)}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. INTEGRATED LINK: Today's Workout & Language Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Workout shortcut */}
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/40 p-4 dark:border-orange-900/50 dark:bg-orange-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white shrink-0">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {t('todayWorkoutShortcut', language)}: <span className="text-orange-600 dark:text-orange-400">{todayPlannedSplit}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {selectedWeekday === 7 ? 'Recovery walk & mobility' : 'Gym session'}
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('gym')}
              className="tap-target shrink-0 text-xs font-bold text-orange-600 hover:underline flex items-center gap-0.5"
            >
              <span>Gym</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Language practice shortcut */}
        <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/40 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white shrink-0">
              <Languages className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {t('todayLanguageProgress', language)}
              </p>
              <p className="text-[11px] text-slate-400">
                Norma: {userProfile?.settings?.languageTargetMinutes ?? 45}m
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('language')}
              className="tap-target shrink-0 text-xs font-bold text-cyan-600 hover:underline flex items-center gap-0.5"
            >
              <span>Lang</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Goals shortcut */}
        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 dark:border-purple-900/50 dark:bg-purple-950/20 flex items-center justify-between sm:col-span-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {t('goalsTitle', language)}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'uz' ? 'Yillik & choraklik shaxsiy maqsadlar' : 'Quarterly & annual target progress'}
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('goals')}
              className="tap-target shrink-0 text-xs font-bold text-purple-600 hover:underline flex items-center gap-0.5"
            >
              <span>Goals</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 7. Health & Energy Metric Inputs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors space-y-4">
        {/* Sleep Hours Stepper / Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <MoonStar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t('sleepHoursLabel', language)}
              </p>
              <p className="text-[11px] text-slate-400">
                {userProfile?.settings?.sleepTargetHours ?? 7} {t('hoursUnit', language)} {language === 'uz' ? 'norma' : 'target'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[5, 6, 7, 8, 9].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleMetricUpdate('sleepHours', val)}
                className={`tap-target flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  currentDay.sleepHours === val
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {val}h
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Energy Level (1-5 Chips) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t('energyLevelLabel', language)}
              </p>
              <p className="text-[11px] text-slate-400">1 (pastroq) - 5 (yuqori)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleMetricUpdate('energy', lvl)}
                className={`tap-target flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  currentDay.energy === lvl
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Meals Count (0-3 Chips) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t('mealsCountLabel', language)}
              </p>
              <p className="text-[11px] text-slate-400">0 - 3 taom</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleMetricUpdate('meals', count)}
                className={`tap-target flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  currentDay.meals === count
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Evening Review with Autosave (Debounced 800ms) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('eveningReviewHeading', language)}
          </h2>

          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <Clock className="h-3 w-3 animate-spin text-indigo-500" />
                <span>{t('savingAuto', language)}</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span>{t('savedAuto', language)}</span>
              </>
            )}
          </div>
        </div>

        <textarea
          rows={3}
          value={currentDay.eveningReview || ''}
          onChange={(e) => handleReviewChange(e.target.value)}
          placeholder={t('eveningReviewPlaceholder', language)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950 transition resize-none"
        />
      </div>
    </div>
  );
};
