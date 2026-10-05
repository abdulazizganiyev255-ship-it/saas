import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import type { TabType } from '../types';
import {
  Utensils,
  MoonStar,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Flame,
  Settings as SettingsIcon,
  Layers,
  Sliders,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TodayViewProps {
  onNavigate: (tab: TabType) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onNavigate }) => {
  const { userProfile, language } = useAuth();

  const settings = userProfile?.settings || {
    dailyFoodLimit: 110000,
    sleepTargetHours: 7,
    languageTargetMinutes: 45,
    parityAnchorDate: null,
  };

  // Recharts visualization data normalized for comparison
  const targetsChartData = [
    {
      name: language === 'uz' ? 'Ovqat (ming)' : 'Food (k UZS)',
      value: Math.round(settings.dailyFoodLimit / 1000),
      rawLabel: `${settings.dailyFoodLimit.toLocaleString()} ${t('currencyUzs', language)}`,
      color: '#10b981',
    },
    {
      name: language === 'uz' ? 'Uyqu (soat)' : 'Sleep (hrs)',
      value: settings.sleepTargetHours * 10,
      rawLabel: `${settings.sleepTargetHours} ${t('hoursUnit', language)}`,
      color: '#6366f1',
    },
    {
      name: language === 'uz' ? 'Til (daq)' : 'Lang (min)',
      value: settings.languageTargetMinutes,
      rawLabel: `${settings.languageTargetMinutes} ${t('minutesUnit', language)}`,
      color: '#06b6d4',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md mb-4 border border-white/10">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>{t('step1Badge', language)}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'uz'
              ? `Xush kelibsiz, ${userProfile?.displayName || 'Foydalanuvchi'}!`
              : `Welcome back, ${userProfile?.displayName || 'User'}!`}
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            {language === 'uz'
              ? "Life OS 1-bosqich tizim qobig'i to'liq tayyor. Quyida sizning boshlang'ich shaxsiy ko'rsatkichlaringiz keltirilgan."
              : 'Life OS Step 1 system shell is active. Below are your configured daily baseline parameters.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('settings')}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/25 transition"
            >
              <Sliders className="h-4 w-4" />
              <span>{t('navSettings', language)}</span>
            </button>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 rounded-xl px-3 py-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>{t('planFree', language)}</span>
            </div>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Target Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Food limit */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dailyFoodLimitLabel', language)}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {settings.dailyFoodLimit.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-slate-500">
              {t('currencyUzs', language)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Kunlik xarajat limiti' : 'Daily cap'}
          </p>
        </div>

        {/* Card 2: Sleep Target */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('sleepTargetLabel', language)}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <MoonStar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {settings.sleepTargetHours}
            <span className="ml-1 text-xs font-normal text-slate-500">
              {t('hoursUnit', language)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Kechasi sog\'lom uyqu' : 'Restorative target'}
          </p>
        </div>

        {/* Card 3: Language Target */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('languageTargetLabel', language)}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {settings.languageTargetMinutes}
            <span className="ml-1 text-xs font-normal text-slate-500">
              {t('minutesUnit', language)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Kunlik mashq normasi' : 'Daily focus'}
          </p>
        </div>
      </div>

      {/* Recharts Target Overview Chart */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('todayOverview', language)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'uz'
                ? "Shaxsiy maqsad parametrlari nisbiy ko'rinishi"
                : 'Configured baseline targets at a glance'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="tap-target text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>{t('navSettings', language)}</span>
          </button>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={targetsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(_val: any, _name: any, item: any) => [
                  item.payload.rawLabel,
                  language === 'uz' ? 'Qiymat' : 'Value',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {targetsChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Step 1 Roadmap & Next Steps Preview */}
      <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-5 sm:p-6 dark:border-indigo-900/60 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
          <Layers className="h-4 w-4" />
          <span>{t('nextStepRoadmap', language)}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {language === 'uz'
            ? "Keyingi 2-bosqichda 'Bugun' bo'limi to'liq interaktiv bo'ladi: kunlik reja, odatlar check-inlari va Firestore `days` subkolleksiyasiga real-vaqt sinxronizatsiyasi qo'shiladi."
            : "In Step 2, the 'Today' tab transforms into a real-time daily operational hub: day planner, habit check-ins, and caching via the `days` subcollection."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {['Budget (Step 3)', 'Gym (Step 4)', 'Study (Step 4)', 'Goals (Step 5)'].map(
            (label, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-2xs"
              >
                <ArrowRight className="h-3 w-3 text-indigo-500" />
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
};
