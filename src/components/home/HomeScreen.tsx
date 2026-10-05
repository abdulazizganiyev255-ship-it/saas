import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { TabType, DayDocument, Workout, StudyTask, LanguageSession, Transaction, HabitDefinition } from '../../types';
import { getDaysRange, calculateDayScore, calculateStreak } from '../../services/days';
import { getMonthTransactions } from '../../services/budget';
import { getWorkouts } from '../../services/gym';
import { getLanguageSessions } from '../../services/language';
import { getTasks } from '../../services/study';
import {
  getTodayDateString,
  getMondayOfDate,
  addDays,
  formatUZS,
  daysUntil,
  getWeekdayNumber,
} from '../../utils/format';
import {
  Flame,
  CheckCircle2,
  Wallet,
  Dumbbell,
  Languages,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  Scale,
  Sparkles,
  ArrowRight,
  Target,
  BarChart2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface HomeScreenProps {
  onNavigate: (tab: TabType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user, userProfile, language } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);

  const [daysMap, setDaysMap] = useState<{ [date: string]: DayDocument }>({});
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [languageSessions, setLanguageSessions] = useState<LanguageSession[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const activeHabits: HabitDefinition[] = useMemo(() => {
    return (userProfile?.settings?.habits || []).filter((h) => h.active);
  }, [userProfile?.settings?.habits]);

  // Load data reusing cached queries
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const start30 = addDays(todayStr, -30);
    const currentDate = new Date();

    Promise.all([
      getDaysRange(user.uid, start30, todayStr),
      getWorkouts(user.uid),
      getMonthTransactions(user.uid, currentDate.getFullYear(), currentDate.getMonth()),
      getLanguageSessions(user.uid),
      getTasks(user.uid),
    ]).then(([dMap, wList, txList, langList, tList]) => {
      if (dMap) setDaysMap(dMap);
      if (wList) setWorkouts(wList);
      if (txList) setTransactions(txList);
      if (langList) setLanguageSessions(langList);
      if (tList) setTasks(tList);
      setLoading(false);
    });
  }, [user, todayStr]);

  // 1. KPI: Today's score & streak
  const todayDoc = daysMap[todayStr];
  const { score: todayScore, isComplete: isTodayComplete } = useMemo(() => {
    if (!todayDoc) return { score: 0, isComplete: false };
    return calculateDayScore(todayDoc, activeHabits);
  }, [todayDoc, activeHabits]);

  const { streak: currentStreak } = useMemo(() => {
    return calculateStreak(daysMap, todayStr, activeHabits);
  }, [daysMap, todayStr, activeHabits]);

  // 2. KPI: Today's spend vs daily food limit
  const dailyFoodLimit = userProfile?.settings?.dailyFoodLimit ?? 110000;
  const todaySpend = useMemo(() => {
    return transactions
      .filter((t) => t.date === todayStr && t.type === 'expense' && t.category === 'Food')
      .reduce((sum, t) => sum + t.amountUZS, 0);
  }, [transactions, todayStr]);

  // 3. KPI: Workouts this week (of 6)
  const thisMonday = getMondayOfDate(todayStr);
  const thisSunday = addDays(thisMonday, 6);
  const workoutsThisWeek = useMemo(() => {
    return workouts.filter((w) => w.date >= thisMonday && w.date <= thisSunday).length;
  }, [workouts, thisMonday, thisSunday]);

  // 4. KPI: Language minutes today vs target
  const languageTargetMin = userProfile?.settings?.languageTargetMinutes ?? 45;
  const languageMinutesToday = useMemo(() => {
    return languageSessions
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + s.minutes, 0);
  }, [languageSessions, todayStr]);

  // 5. KPI: Nearest task deadline
  const nearestTask = useMemo(() => {
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    if (pendingTasks.length === 0) return null;
    return [...pendingTasks].sort((a, b) => a.due.localeCompare(b.due))[0];
  }, [tasks]);

  const daysToNearestTask = nearestTask ? daysUntil(nearestTask.due, todayStr) : null;

  // Chart 1: 14-day score column chart
  const scoreChartData = useMemo(() => {
    const list: { date: string; fullDate: string; score: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(todayStr, -i);
      const doc = daysMap[d];
      const s = doc ? calculateDayScore(doc, activeHabits).score : 0;
      list.push({
        date: d.slice(5),
        fullDate: d,
        score: s,
      });
    }
    return list;
  }, [daysMap, todayStr, activeHabits]);

  // Chart 2: 30-day spend column chart with limit line
  const spendChartData = useMemo(() => {
    const list: { date: string; spend: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(todayStr, -i);
      const daySpend = transactions
        .filter((t) => t.date === d && t.type === 'expense' && t.category === 'Food')
        .reduce((sum, t) => sum + t.amountUZS, 0);
      list.push({
        date: d.slice(5),
        spend: daySpend,
      });
    }
    return list;
  }, [transactions, todayStr]);

  // Chart 3: Body weight line chart
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

  const isSunday = getWeekdayNumber(todayStr) === 7;

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:py-7 space-y-6 pb-24">
      {/* 1. Sunday Review Banner */}
      {isSunday && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 dark:border-amber-500/30 flex items-center justify-between gap-3">
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
                  ? 'Bugun haftani sarhisob qilish va tahlil yozish kuni!'
                  : 'Time for your weekly retrospective & KPI review!'}
              </h3>
            </div>
          </div>
          <button
            onClick={() => onNavigate('review')}
            className="tap-target shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
          >
            <span>{language === 'uz' ? 'Tahlilni ochish' : 'Open Review'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Life OS Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {language === 'uz' ? 'Boshqaruv Paneli' : 'Life Dashboard'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'uz'
                ? 'Kuningiz va hayotingizning barcha asosiy ko\'rsatkichlari bir joyda.'
                : 'All your critical daily, weekly, and health signals at a glance.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('today')}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700"
            >
              <span>{t('navToday', language)}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 6 KPI TILES */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {/* KPI 1: Today's Score */}
        <div
          onClick={() => onNavigate('today')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-indigo-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('dayScoreLabel', language)}
            </span>
            <CheckCircle2 className={`h-4 w-4 ${isTodayComplete ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {todayScore}%
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {isTodayComplete ? '✓ Complete' : 'target 70%'}
            </span>
          </div>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">
            {language === 'uz' ? 'Bugungi odatlar' : 'Habit progress'} →
          </p>
        </div>

        {/* KPI 2: Current Streak */}
        <div
          onClick={() => onNavigate('today')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-amber-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('streakLabel', language)}
            </span>
            <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {currentStreak}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {language === 'uz' ? 'kun' : 'days'}
            </span>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate">
            {currentStreak > 0 ? (language === 'uz' ? 'Intizom yuqori!' : 'Streak on fire!') : (language === 'uz' ? 'Bugun boshlang' : 'Start today')} →
          </p>
        </div>

        {/* KPI 3: Today's Spend vs Daily Limit */}
        <div
          onClick={() => onNavigate('budget')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-emerald-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'uz' ? 'Kunlik Ovqat' : 'Daily Food Spend'}
            </span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white truncate">
            {formatUZS(todaySpend)}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            Limit: {formatUZS(dailyFoodLimit)} UZS ({Math.round((todaySpend / (dailyFoodLimit || 1)) * 100)}%)
          </p>
        </div>

        {/* KPI 4: Workouts this week (of 6) */}
        <div
          onClick={() => onNavigate('gym')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-orange-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('workoutsThisWeek', language)}
            </span>
            <Dumbbell className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {workoutsThisWeek}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 6 target</span>
          </div>
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold truncate">
            {language === 'uz' ? 'Zal jurnali' : 'Workout logs'} →
          </p>
        </div>

        {/* KPI 5: Language minutes today vs target */}
        <div
          onClick={() => onNavigate('language')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-cyan-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('languageTitle', language)}
            </span>
            <Languages className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {languageMinutesToday}
            </span>
            <span className="text-xs font-bold text-slate-400">/ {languageTargetMin} min</span>
          </div>
          <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold truncate">
            {languageMinutesToday >= languageTargetMin
              ? (language === 'uz' ? '✓ Norma bajarildi' : '✓ Target hit')
              : (language === 'uz' ? `${languageTargetMin - languageMinutesToday}m qoldi` : `${languageTargetMin - languageMinutesToday}m left`)} →
          </p>
        </div>

        {/* KPI 6: Nearest task deadline */}
        <div
          onClick={() => onNavigate('study')}
          className="tap-target cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 hover:border-blue-500/50 transition-all space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'uz' ? 'Yaqin Topshiriq' : 'Nearest Deadline'}
            </span>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </div>
          {nearestTask ? (
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {nearestTask.title}
              </p>
              <p className={`text-[10px] font-bold flex items-center gap-1 ${
                daysToNearestTask !== null && daysToNearestTask <= 3
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-400'
              }`}>
                {daysToNearestTask !== null && daysToNearestTask <= 3 && <AlertCircle className="h-3 w-3" />}
                <span>
                  {daysToNearestTask !== null && daysToNearestTask <= 0
                    ? (language === 'uz' ? 'Bugun!' : 'Today!')
                    : (language === 'uz' ? `${daysToNearestTask} kun qoldi` : `${daysToNearestTask}d left`)}
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'uz' ? 'Barchasi bajarildi' : 'All caught up'}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {language === 'uz' ? 'Hammasi joyida' : 'No urgent tasks'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. THREE CHARTS */}
      <div className="space-y-6">
        {/* Chart 1: 14-day score column chart */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                <span>{language === 'uz' ? '14 Kunlik Odatlar Balli Grafigi' : '14-Day Score Trend'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'uz' ? 'Muntazamlik va kunlik intizom foizi' : 'Consistency and daily habit score'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-500">
              70% = {language === 'uz' ? 'Bajarildi' : 'Complete'}
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, language === 'uz' ? 'Ball' : 'Score']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {scoreChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.score >= 70 ? '#10b981' : entry.score > 0 ? '#6366f1' : '#cbd5e1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 30-day spend column chart with limit line */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span>{language === 'uz' ? '30 Kunlik Ovqat Xarajati & Limiti' : '30-Day Food Spend vs Limit'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'uz' ? `Kunlik limit chizig'i: ${formatUZS(dailyFoodLimit)} UZS` : `Daily limit line: ${formatUZS(dailyFoodLimit)} UZS`}
              </p>
            </div>
            <span className="text-[10px] font-bold text-rose-500">
              Limit: {formatUZS(dailyFoodLimit)} UZS
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${formatUZS(Number(val))} UZS`, language === 'uz' ? 'Xarajat' : 'Spend']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={dailyFoodLimit} stroke="#f43f5e" strokeDasharray="3 3" />
                <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
                  {spendChartData.map((entry, index) => (
                    <Cell
                      key={`spend-${index}`}
                      fill={entry.spend > dailyFoodLimit ? '#f43f5e' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Body weight line chart */}
        {bodyWeightChartData.length > 0 && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-orange-500" />
                <span>{t('bodyWeightChartTitle', language)}</span>
              </h3>
              <span className="text-xs font-black text-slate-900 dark:text-white">
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
      </div>

      {/* 5. Navigation Hub Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('today')}
          className="tap-target flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <CheckCircle2 className="h-6 w-6 text-indigo-600 mb-1" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">{t('navToday', language)}</span>
        </button>

        <button
          onClick={() => onNavigate('budget')}
          className="tap-target flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <Wallet className="h-6 w-6 text-emerald-600 mb-1" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">{t('navBudget', language)}</span>
        </button>

        <button
          onClick={() => onNavigate('gym')}
          className="tap-target flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <Dumbbell className="h-6 w-6 text-orange-600 mb-1" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">{t('navGym', language)}</span>
        </button>

        <button
          onClick={() => onNavigate('study')}
          className="tap-target flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <GraduationCap className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">{t('navStudy', language)}</span>
        </button>
      </div>
    </div>
  );
};
