import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import type { TabType } from '../types';
import {
  Wallet,
  Dumbbell,
  GraduationCap,
  Target,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface EmptyTabStateProps {
  tab: TabType;
  onNavigateToToday: () => void;
}

export const EmptyTabState: React.FC<EmptyTabStateProps> = ({ tab, onNavigateToToday }) => {
  const { language } = useAuth();

  const getModuleDetails = () => {
    switch (tab) {
      case 'budget':
        return {
          title: t('budgetModuleTitle', language),
          description: t('budgetModuleDesc', language),
          icon: Wallet,
          color: 'from-emerald-500 to-teal-600',
          step: 'Step 3',
          features: [
            'Daily Food Limit enforcement & alerts',
            'Transactions categorization (cash, card, peer)',
            'Recurring subscriptions management',
            'Monthly savings velocity charts',
          ],
        };
      case 'gym':
        return {
          title: t('gymModuleTitle', language),
          description: t('gymModuleDesc', language),
          icon: Dumbbell,
          color: 'from-orange-500 to-amber-600',
          step: 'Step 4',
          features: [
            'Push / Pull / Legs routine presets',
            'Set, Rep & Weight progression logs',
            'Rest timer with notifications',
            'Volume load charts & PR tracker',
          ],
        };
      case 'study':
        return {
          title: t('studyModuleTitle', language),
          description: t('studyModuleDesc', language),
          icon: GraduationCap,
          color: 'from-blue-500 to-indigo-600',
          step: 'Step 4',
          features: [
            'Numerator / Denominator week timetable parity',
            'Course list & assignment deadline radar',
            'Exam countdown timers',
            'Academic quick notes',
          ],
        };
      case 'goals':
        return {
          title: t('goalsModuleTitle', language),
          description: t('goalsModuleDesc', language),
          icon: Target,
          color: 'from-purple-500 to-pink-600',
          step: 'Step 5',
          features: [
            'Quarterly OKRs and milestone checklists',
            'Weekly Sunday reflection reviews',
            'Habit streak consistency score',
            'Year-end founder retrospectives',
          ],
        };
      default:
        return {
          title: t('comingSoonTitle', language),
          description: t('comingSoonDesc', language),
          icon: Sparkles,
          color: 'from-indigo-500 to-cyan-600',
          step: 'Step 2-5',
          features: [],
        };
    }
  };

  const details = getModuleDetails();
  const Icon = details.icon;

  return (
    <div className="mx-auto max-w-xl py-8 px-4 text-center">
      {/* Icon with gradient badge */}
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr shadow-2xl p-0.5">
        <div className={`flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-tr ${details.color} text-white`}>
          <Icon className="h-10 w-10 animate-bounce" />
        </div>
      </div>

      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 mb-4">
        <Clock className="h-3.5 w-3.5" />
        <span>{t('comingSoonTitle', language)}</span>
        <span className="text-indigo-400">·</span>
        <span>{details.step}</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {details.title}
      </h2>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {details.description}
      </p>

      {/* Features preview */}
      <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/60 p-5 text-left dark:border-slate-800/80 dark:bg-slate-900/60 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span>Planned Architecture:</span>
        </div>
        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {details.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action to go back to Today */}
      <div className="mt-8">
        <button
          onClick={onNavigateToToday}
          className="tap-target inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition"
        >
          <span>{t('backToToday', language)}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
