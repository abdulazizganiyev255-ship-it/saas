import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { WeeklyReview, HabitDefinition } from '../../types';
import {
  getWeeklyReview,
  saveWeeklyReview,
  calculateWeekStats,
} from '../../services/reviews';
import {
  getTodayDateString,
  getISOWeekKey,
  getMondayOfDate,
  addDays,
  formatDateDisplay,
  formatUZS,
  getWeekdayNumber,
} from '../../utils/format';
import { ProGate } from '../common/ProGate';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Wallet,
  Dumbbell,
  Languages,
  GraduationCap,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  Calendar,
} from 'lucide-react';

export const WeeklyReviewContent: React.FC = () => {
  const { user, userProfile, language } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const currentWeekKey = useMemo(() => getISOWeekKey(todayStr), [todayStr]);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(currentWeekKey);
  const [selectedMonday, setSelectedMonday] = useState<string>(getMondayOfDate(todayStr));
  const selectedSunday = useMemo(() => addDays(selectedMonday, 6), [selectedMonday]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Review text inputs
  const [whatWorked, setWhatWorked] = useState('');
  const [whatBlocked, setWhatBlocked] = useState('');
  const [nextTop3, setNextTop3] = useState('');

  // Auto-calculated stats
  const [stats, setStats] = useState({
    avgScore: 0,
    daysComplete: 0,
    totalSpend: 0,
    spendByCategory: {} as { [cat: string]: number },
    workoutsCount: 0,
    languageMinutes: 0,
    tasksCompleted: 0,
  });

  const activeHabits: HabitDefinition[] = useMemo(() => {
    return (userProfile?.settings?.habits || []).filter((h) => h.active);
  }, [userProfile?.settings?.habits]);

  // Is today Sunday?
  const isSunday = getWeekdayNumber(todayStr) === 7;

  // Load review & stats when selectedWeekKey changes
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const mon = getMondayOfDate(selectedMonday);
    const sun = addDays(mon, 6);

    Promise.all([
      getWeeklyReview(user.uid, selectedWeekKey),
      calculateWeekStats(user.uid, mon, sun, activeHabits),
    ]).then(([savedReview, calculatedStats]) => {
      if (savedReview) {
        setWhatWorked(savedReview.whatWorked || '');
        setWhatBlocked(savedReview.whatBlocked || '');
        setNextTop3(savedReview.nextTop3 || '');
        setStats({
          avgScore: savedReview.avgScore || calculatedStats.avgScore,
          daysComplete: savedReview.daysComplete || calculatedStats.daysComplete,
          totalSpend: savedReview.totalSpend || calculatedStats.totalSpend,
          spendByCategory: savedReview.spendByCategory || calculatedStats.spendByCategory,
          workoutsCount: savedReview.workoutsCount || calculatedStats.workoutsCount,
          languageMinutes: savedReview.languageMinutes || calculatedStats.languageMinutes,
          tasksCompleted: savedReview.tasksCompleted || calculatedStats.tasksCompleted,
        });
      } else {
        setWhatWorked('');
        setWhatBlocked('');
        setNextTop3('');
        setStats(calculatedStats);
      }
      setLoading(false);
    });
  }, [user, selectedWeekKey, selectedMonday, activeHabits]);

  const handlePrevWeek = () => {
    const prevMon = addDays(selectedMonday, -7);
    setSelectedMonday(prevMon);
    setSelectedWeekKey(getISOWeekKey(prevMon));
  };

  const handleNextWeek = () => {
    const nextMon = addDays(selectedMonday, 7);
    setSelectedMonday(nextMon);
    setSelectedWeekKey(getISOWeekKey(nextMon));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!user) return;

    setSaving(true);
    try {
      await saveWeeklyReview(user.uid, selectedWeekKey, {
        startDate: selectedMonday,
        endDate: selectedSunday,
        avgScore: stats.avgScore,
        daysComplete: stats.daysComplete,
        totalSpend: stats.totalSpend,
        spendByCategory: stats.spendByCategory,
        workoutsCount: stats.workoutsCount,
        languageMinutes: stats.languageMinutes,
        tasksCompleted: stats.tasksCompleted,
        whatWorked,
        whatBlocked,
        nextTop3,
      });

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (err) {
      console.error('Failed to save weekly review:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Sunday prompt card if today is Sunday */}
      {isSunday && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 dark:border-amber-500/30 flex items-center justify-between gap-3 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {language === 'uz' ? 'Yakshanba Tahlili' : 'Sunday Retrospective'}
              </p>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'uz'
                  ? 'Bugun yakshanba! Haftani sarhisob qilish va kelgusi hafta rejalarini belgilash vaqti.'
                  : 'It is Sunday! Reflect on your week and set up targets for next week.'}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* 2. Week Navigation Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="tap-target flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center sm:text-left">
              <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                {selectedWeekKey}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {formatDateDisplay(selectedMonday, language)} — {formatDateDisplay(selectedSunday, language)}
              </h1>
            </div>
            <button
              onClick={handleNextWeek}
              className="tap-target flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {savedToast && (
            <span className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              <span>{t('savedAuto', language)}</span>
            </span>
          )}
        </div>

        {/* 3. Auto-calculated 7-day stats grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Average Score */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{t('avgScoreLabel', language)}</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {stats.avgScore}%
            </p>
            <p className="text-[10px] text-slate-400">
              {stats.daysComplete}/7 {language === 'uz' ? 'kun to\'liq' : 'days completed'}
            </p>
          </div>

          {/* Workouts Count */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{t('workoutsThisWeek', language)}</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {stats.workoutsCount} <span className="text-xs text-slate-400 font-bold">/ 6</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {language === 'uz' ? 'Zal mashg\'ulotlari' : 'Gym sessions'}
            </p>
          </div>

          {/* Language Minutes */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
              <Languages className="h-3.5 w-3.5" />
              <span>{t('languageTitle', language)}</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {stats.languageMinutes} <span className="text-xs text-slate-400 font-bold">min</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {language === 'uz' ? 'Haftalik jami' : 'Total practiced'}
            </p>
          </div>

          {/* Total Spend */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Wallet className="h-3.5 w-3.5" />
              <span>{t('weeklyTotalSpend', language)}</span>
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white truncate">
              {formatUZS(stats.totalSpend)}
            </p>
            <p className="text-[10px] text-slate-400">UZS</p>
          </div>

          {/* Tasks Completed */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{t('tasksCompletedLabel', language)}</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {stats.tasksCompleted} {language === 'uz' ? 'topshiriq' : 'tasks'}
            </p>
            <p className="text-[10px] text-slate-400">
              {language === 'uz' ? 'Universitet & amaliy ishlar' : 'University & homework'}
            </p>
          </div>
        </div>

        {/* Spend by category breakdown */}
        {Object.keys(stats.spendByCategory).length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {language === 'uz' ? 'Haftalik xarajatlar turlari:' : 'Expenses by category:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.spendByCategory).map(([cat, amt]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span className="font-bold">{cat}:</span>
                  <span>{formatUZS(amt)} UZS</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Three Text Fields: whatWorked, whatBlocked, nextTop3 */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* What Worked */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{t('whatWorkedLabel', language)}</span>
          </label>
          <p className="text-xs text-slate-400 mb-2.5">
            {language === 'uz'
              ? 'Ushbu haftada nimalar yaxshi samara berdi? Qaysi g\'alabalar va intizomli lahzalar sizni xursand qildi?'
              : 'What went well this week? Which habits, wins, or breakthroughs helped you make progress?'}
          </p>
          <textarea
            rows={3}
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder={language === 'uz' ? 'Masalan: Dushanbadan ertalabki 3 soat deep work odatiga qat\'iy rioya qildim...' : 'e.g. Consistently hit morning deep work sessions...'}
            className="tap-target w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-none"
          />
        </div>

        {/* What Blocked */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <span>{t('whatBlockedLabel', language)}</span>
          </label>
          <p className="text-xs text-slate-400 mb-2.5">
            {language === 'uz'
              ? 'Nimalar rejaga xalal berdi? Chalg\'ituvchi omillar yoki kechiktirishlar nima bilan bog\'liq edi?'
              : 'What blocked or distracted you? What friction held you back?'}
          </p>
          <textarea
            rows={3}
            value={whatBlocked}
            onChange={(e) => setWhatBlocked(e.target.value)}
            placeholder={language === 'uz' ? 'Masalan: Payshanba kuni kech uxlab, juma tongida energiya 2/5 bo\'ldi...' : 'e.g. Stayed up too late on Thursday which drained energy on Friday...'}
            className="tap-target w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-none"
          />
        </div>

        {/* Next Top 3 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>{t('nextTop3Label', language)}</span>
          </label>
          <p className="text-xs text-slate-400 mb-2.5">
            {language === 'uz'
              ? 'Kelgusi hafta uchun 3 ta asosiy yo\'nalish yoki katta maqsad nima?'
              : 'What are the top 3 highest-leverage priorities for next week?'}
          </p>
          <textarea
            rows={3}
            value={nextTop3}
            onChange={(e) => setNextTop3(e.target.value)}
            placeholder={language === 'uz' ? '1. Universitet imtihoniga tayyorgarlik\n2. 5 ta mahsulot prototipini sotish\n3. 4 kun zalga chiqish' : '1. Ship feature release\n2. Prepare university midterm\n3. 5 gym sessions'}
            className="tap-target w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-none font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? t('saving', language) : t('saveReviewBtn', language)}</span>
        </button>
      </form>
    </div>
  );
};

export const WeeklyReviewScreen: React.FC = () => {
  const { language } = useAuth();

  return (
    <ProGate
      feature="weeklyReview"
      featureTitle={language === 'uz' ? 'Haftalik Sharh & Tahlil' : 'Weekly Review & Analytics'}
      featureDesc={
        language === 'uz'
          ? 'Haftalik sarhisob, 7 kunlik avtomatik ko\'rsatkichlar (o\'rtacha ball, xarajatlar, zal, til) va 3 ta asosiy xulosa maydoni Pro tarifida mavjud.'
          : 'Weekly retro with auto-calculated 7-day KPIs (average score, expenses, workouts, language) and reflection logs.'
      }
    >
      <WeeklyReviewContent />
    </ProGate>
  );
};
