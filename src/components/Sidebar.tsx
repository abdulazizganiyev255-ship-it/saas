import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import { APP_NAME } from '../config/constants';
import type { TabType } from '../types';
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Dumbbell,
  GraduationCap,
  Target,
  Languages,
  CalendarCheck,
  Settings as SettingsIcon,
  Sparkles,
  LogOut,
  ShieldCheck,
  Crown,
} from 'lucide-react';

interface SidebarProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate }) => {
  const { userProfile, language, signOut } = useAuth();
  const isPro = userProfile?.plan === 'pro';

  const navItems = [
    { id: 'home' as TabType, label: t('navHome', language), icon: LayoutDashboard },
    { id: 'today' as TabType, label: t('navToday', language), icon: CalendarDays },
    { id: 'budget' as TabType, label: t('navBudget', language), icon: Wallet },
    { id: 'gym' as TabType, label: t('navGym', language), icon: Dumbbell },
    { id: 'study' as TabType, label: t('navStudy', language), icon: GraduationCap },
    { id: 'language' as TabType, label: t('navLanguage', language), icon: Languages },
    { id: 'goals' as TabType, label: t('navGoals', language), icon: Target },
    { id: 'review' as TabType, label: t('navReview', language), icon: CalendarCheck },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950 transition-colors z-20">
      {/* Brand logo & title */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md shadow-indigo-500/25">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-lg">
            {APP_NAME}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
            {t('step1Badge', language)}
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-1 flex-col justify-between p-4 overflow-y-auto">
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`tap-target group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer controls & Settings */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => onNavigate('settings')}
            className={`tap-target flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>{t('navSettings', language)}</span>
          </button>

          {/* User badge */}
          {userProfile && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {userProfile.displayName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {userProfile.email}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  title={t('signOut', language)}
                  className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold">
                {isPro ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Crown className="h-3 w-3" />
                    <span>Life OS PRO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{t('planFree', language)}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
