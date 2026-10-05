import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t, tf, WEEKDAYS_SHORT, WEEKDAYS_FULL } from '../../i18n';
import type { HabitDefinition, TabType } from '../../types';
import {
  getWeeklyReview,
  saveWeeklyReview,
  calculateWeekStats,
  calculateWeekDaily,
} from '../../services/reviews';
import { getTodayDateString, getISOWeekKey, getMondayOfDate, addDays, formatUZS } from '../../utils/format';
import {
  summarizeWeek,
  formatWeekRange,
  isoWeekNumber,
  GRACE_DAYS_MAX,
  XP_DAY_CAP,
  type WeekDaily,
} from '../../utils/weekly';
import { MOCK_LEADERBOARD_MEMBERS } from '../../config/mockLeaderboard';
import { ProGate } from '../common/ProGate';
import { Modal } from '../common/Modal';
import { ScoreRing } from './ScoreRing';
import { ShareCard, downloadShareCardPng } from './ShareCard';
import { Check, ChevronLeft, ChevronRight, Share2, ShieldCheck, Trophy } from 'lucide-react';

const GOAL_MAX = 80;
const CAT_BG = ['bg-token-cat-1', 'bg-token-cat-2', 'bg-token-cat-3', 'bg-token-cat-4'];

interface BudgetStats {
  totalSpend: number;
  totalIncome: number;
  spendByCategory: { [cat: string]: number };
  tasksCompleted: number;
}

const EMPTY_STATS: BudgetStats = { totalSpend: 0, totalIncome: 0, spendByCategory: {}, tasksCompleted: 0 };

interface WeeklyReviewProps {
  onNavigate?: (tab: TabType) => void;
}

export const WeeklyReviewContent: React.FC<WeeklyReviewProps> = ({ onNavigate }) => {
  const { user, userProfile, language } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const currentMonday = useMemo(() => getMondayOfDate(todayStr), [todayStr]);

  const [monday, setMonday] = useState<string>(currentMonday);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<WeekDaily | null>(null);
  const [prevDaily, setPrevDaily] = useState<WeekDaily | null>(null);
  const [stats, setStats] = useState<BudgetStats>(EMPTY_STATS);
  const [goal, setGoal] = useState('');
  const [goalSaved, setGoalSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<SVGSVGElement>(null);

  const weekKey = useMemo(() => getISOWeekKey(monday), [monday]);
  const activeHabits: HabitDefinition[] = useMemo(
    () => (userProfile?.settings?.habits || []).filter((h) => h.active),
    [userProfile?.settings?.habits]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      calculateWeekDaily(user.uid, monday, activeHabits),
      calculateWeekDaily(user.uid, addDays(monday, -7), activeHabits),
      calculateWeekStats(user.uid, monday, addDays(monday, 6), activeHabits),
      getWeeklyReview(user.uid, weekKey),
    ])
      .then(([d, pd, s, review]) => {
        if (cancelled) return;
        setDaily(d);
        setPrevDaily(pd);
        setStats({
          totalSpend: s.totalSpend,
          totalIncome: s.totalIncome,
          spendByCategory: s.spendByCategory,
          tasksCompleted: s.tasksCompleted,
        });
        const saved = review?.nextTop3;
        setGoal(Array.isArray(saved) ? String(saved[0] ?? '') : typeof saved === 'string' ? saved : '');
      })
      .catch(() => {
        if (cancelled) return;
        setDaily(null);
        setStats(EMPTY_STATS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, monday, weekKey, activeHabits]);

  const summary = useMemo(() => (daily ? summarizeWeek(daily) : null), [daily]);
  const prevSummary = useMemo(() => (prevDaily ? summarizeWeek(prevDaily) : null), [prevDaily]);
  const delta = summary && prevSummary ? summary.consistency - prevSummary.consistency : 0;
  const weekNumber = isoWeekNumber(monday);
  const isCurrentWeek = monday >= currentMonday;

  // Budget breakdown: top 3 categories + "Other"
  const budget = useMemo(() => {
    const entries = Object.entries(stats.spendByCategory).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 3);
    const rest = entries.slice(3).reduce((s, [, v]) => s + v, 0);
    const rows = top.map(([name, value]) => ({ name, value }));
    if (rest > 0) rows.push({ name: t('wrOther', language), value: rest });
    return { rows, left: stats.totalIncome - stats.totalSpend };
  }, [stats, language]);

  // TODO(Group 6): replace with real leaderboard data. Mock rank is for the share card layout only.
  const me = MOCK_LEADERBOARD_MEMBERS.find((m) => m.isMe);
  const myRank = useMemo(() => {
    const sorted = [...MOCK_LEADERBOARD_MEMBERS].sort((a, b) => b.weeklyXP - a.weeklyXP);
    const idx = sorted.findIndex((m) => m.isMe);
    return idx === -1 ? null : idx + 1;
  }, []);

  const handleSaveGoal = () => {
    if (!user || !daily) return;
    const text = goal.trim().slice(0, GOAL_MAX);
    saveWeeklyReview(user.uid, weekKey, {
      startDate: monday,
      endDate: addDays(monday, 6),
      nextTop3: text,
    });
    setGoal(text);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2500);
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await downloadShareCardPng(cardRef.current, `life-os-week-${weekNumber}.png`);
    } catch {
      window.dispatchEvent(new CustomEvent('lifeos:error-toast', { detail: { message: t('shareFailed', language) } }));
    } finally {
      setExporting(false);
    }
  };

  const days = daily?.dates ?? [];
  const wins: string[] = [];
  if (summary && daily) {
    if (summary.bestDayIndex >= 0) {
      wins.push(`${t('wrWinBest', language)}: ${WEEKDAYS_FULL[language][summary.bestDayIndex]} (${summary.bestDayXP} XP)`);
    }
    if (stats.tasksCompleted > 0) wins.push(tf('wrWinTasks', language, { n: stats.tasksCompleted }));
    if (summary.activeDays > 0) wins.push(tf('wrWinActive', language, { n: summary.activeDays }));
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5 pb-28 sm:py-7">
      {/* Week switcher */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonday((m) => addDays(m, -7))}
          aria-label={t('wrPrevWeek', language)}
          className="tap-target flex items-center justify-center rounded-xl text-token-text"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black text-token-text">{t('wrTitle', language)}</h1>
          <p className="text-sm text-token-muted">{formatWeekRange(monday, language)}</p>
        </div>
        <button
          type="button"
          onClick={() => setMonday((m) => addDays(m, 7))}
          disabled={isCurrentWeek}
          aria-label={t('wrNextWeek', language)}
          className="tap-target flex items-center justify-center rounded-xl text-token-text disabled:text-token-faint"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {loading || !summary || !daily ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-44 animate-pulse rounded-2xl bg-token-raised" />
          <div className="h-28 animate-pulse rounded-2xl bg-token-raised" />
          <div className="h-28 animate-pulse rounded-2xl bg-token-raised" />
        </div>
      ) : (
        <>
          {/* Consistency */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-sm font-bold text-token-muted">{t('wrScore', language)}</h2>
            <div className="mt-3 flex items-center gap-4">
              <ScoreRing score={summary.consistency} label={t('wrScore', language)} />
              <dl className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-token-muted">{t('wrActiveDays', language)}</dt>
                  <dd className="font-bold text-token-text">{summary.activeDays} / 7</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-token-muted">{t('wrGraceDays', language)}</dt>
                  <dd className="font-bold text-token-text">{summary.graceDays} / {GRACE_DAYS_MAX}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-token-muted">{t('wrTasksDone', language)}</dt>
                  <dd className="font-bold text-token-text">{stats.tasksCompleted}</dd>
                </div>
              </dl>
            </div>
            <p className="mt-3 inline-flex rounded-full bg-token-raised px-3 py-1 text-xs font-semibold text-token-cat-1-text">
              {delta > 0 ? '+' : ''}{delta} {t('wrVsLast', language)}
            </p>
          </section>

          {/* 7-day view */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-sm font-bold text-token-muted">{t('wrWeekView', language)}</h2>
            <ul className="mt-3 grid grid-cols-7 gap-1 text-center">
              {days.map((date, i) => {
                const status = daily.status[i];
                const isToday = date === todayStr;
                const base = 'mx-auto flex h-9 w-9 items-center justify-center rounded-full';
                const cls =
                  status === 'done'
                    ? `${base} bg-token-accent text-token-on-accent`
                    : status === 'grace'
                      ? `${base} border-2 border-dashed border-token-accent text-token-accent`
                      : `${base} bg-token-raised`;
                return (
                  <li key={date} className="space-y-1.5">
                    <span className="block text-xs text-token-muted">{WEEKDAYS_SHORT[language][i]}</span>
                    <span className={`${cls} ${isToday ? 'ring-2 ring-token-accent ring-offset-2 ring-offset-token-card' : ''}`}>
                      {status === 'done' && <Check className="h-4 w-4" />}
                      {status === 'grace' && <ShieldCheck className="h-4 w-4" />}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-token-muted">
              <span>{t('wrLegendDone', language)}</span>
              <span>{t('wrLegendGrace', language)}</span>
              <span>{t('wrLegendToday', language)}</span>
            </div>
          </section>

          {/* XP */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-token-muted">{t('wrWeeklyXP', language)}</h2>
              <p className="text-sm font-bold text-token-text">
                {summary.weeklyXP} / {XP_DAY_CAP * 7} XP
              </p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-token-raised">
              <div
                className="h-full rounded-full bg-token-accent"
                style={{ width: `${(summary.weeklyXP / (XP_DAY_CAP * 7)) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-token-muted">{t('wrXPNote', language)}</p>
          </section>

          {/* Budget */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-sm font-bold text-token-muted">{t('wrBudget', language)}</h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { l: t('wrIncome', language), v: stats.totalIncome, cls: 'text-token-text' },
                { l: t('wrExpense', language), v: stats.totalSpend, cls: 'text-token-text' },
                { l: t('wrLeft', language), v: budget.left, cls: budget.left < 0 ? 'text-token-danger' : 'text-token-cat-1-text' },
              ].map((c) => (
                <div key={c.l} className="rounded-xl bg-token-raised px-1 py-3">
                  <dt className="text-xs text-token-muted">{c.l}</dt>
                  <dd className={`mt-1 text-sm font-black ${c.cls}`}>{formatUZS(c.v)}</dd>
                </div>
              ))}
            </dl>
            {budget.rows.length === 0 ? (
              <p className="mt-3 text-xs text-token-muted">{t('wrNoBudget', language)}</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-token-raised">
                  {budget.rows.map((r, i) => (
                    <div
                      key={r.name}
                      className={CAT_BG[i]}
                      style={{ width: `${(r.value / stats.totalSpend) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {budget.rows.map((r, i) => (
                    <li key={r.name} className="flex items-center gap-2 text-sm">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CAT_BG[i]}`} />
                      <span className="flex-1 truncate text-token-muted">{r.name}</span>
                      <span className="font-semibold text-token-text">{formatUZS(r.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Wins */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-sm font-bold text-token-muted">{t('wrWins', language)}</h2>
            {wins.length === 0 ? (
              <p className="mt-3 text-sm text-token-muted">{t('wrNoWins', language)}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {wins.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-token-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-token-accent" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Next goal */}
          <section className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-sm font-bold text-token-muted">{t('wrNextGoal', language)}</h2>
            <label htmlFor="weekly-goal" className="mt-3 block text-sm font-semibold text-token-text">
              {t('wrGoalLabel', language)}
            </label>
            <input
              id="weekly-goal"
              type="text"
              value={goal}
              maxLength={GOAL_MAX}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('wrGoalPlaceholder', language)}
              className="tap-target mt-2 w-full rounded-xl border border-token-raised bg-token-raised px-3 py-2 text-sm text-token-text placeholder:text-token-muted placeholder:opacity-100 focus:border-token-accent focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-token-muted">{goal.length} / {GOAL_MAX}</p>
            <button
              type="button"
              onClick={handleSaveGoal}
              disabled={goal.trim().length === 0}
              className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-token-accent px-4 py-3 text-sm font-bold text-token-on-accent disabled:opacity-50"
            >
              {goalSaved ? <Check className="h-4 w-4" /> : null}
              {goalSaved ? t('wrGoalSaved', language) : t('wrGoalSave', language)}
            </button>
          </section>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-token-accent px-4 py-3 text-sm font-bold text-token-on-accent"
            >
              <Share2 className="h-4 w-4" />
              {t('shareResultBtn', language)}
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-token-accent bg-token-card px-4 py-3 text-sm font-bold text-token-accent"
              >
                <Trophy className="h-4 w-4" />
                {t('wrViewRank', language)}
              </button>
            )}
          </div>

          <Modal isOpen={shareOpen} onClose={() => setShareOpen(false)} title={t('shareResultBtn', language)}>
            <div className="space-y-3">
              <div className="mx-auto max-w-xs overflow-hidden rounded-xl">
                <ShareCard
                  ref={cardRef}
                  lang={language}
                  weekNumber={weekNumber}
                  score={summary.consistency}
                  activeDays={summary.activeDays}
                  weeklyXP={summary.weeklyXP}
                  rank={myRank}
                  nickname={me?.nickname ?? ''}
                  teamName={me?.teamName ?? ''}
                />
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-token-accent px-4 py-3 text-sm font-bold text-token-on-accent disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                {t('wrSaveImage', language)}
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export const WeeklyReviewScreen: React.FC<WeeklyReviewProps> = ({ onNavigate }) => {
  const { language } = useAuth();
  return (
    <ProGate
      feature="weeklyReview"
      featureTitle={language === 'uz' ? 'Haftalik Sharh & Tahlil' : 'Weekly Review & Analytics'}
      featureDesc={
        language === 'uz'
          ? "Haftalik izchillik balli, XP, byudjet va keyingi hafta maqsadi Pro tarifida mavjud."
          : 'Weekly consistency score, XP, budget and next-week goal are available on Pro.'
      }
    >
      <WeeklyReviewContent onNavigate={onNavigate} />
    </ProGate>
  );
};
