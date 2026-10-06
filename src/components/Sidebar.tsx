import { HIDDEN_TABS } from '../config/constants';
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
  Trophy,
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
    { id: 'leaderboard' as TabType, label: t('navLeaderboard', language), icon: Trophy },
  ].filter((item) => !HIDDEN_TABS.includes(item.id));

  return (
    <aside
      className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r transition-colors z-20"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--raised)',
        color: 'var(--text)',
      }}
    >
      {/* Brand logo & title */}
      <div
        className="flex h-16 items-center gap-3 px-6 border-b"
        style={{ borderColor: 'var(--raised)' }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-lg" style={{ color: 'var(--text)' }}>
            {APP_NAME}
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
                className="tap-target group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all"
                style={
                  isActive
                    ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                    : { color: 'var(--muted)' }
                }
              >
                <Icon
                  className="h-5 w-5 transition-transform group-hover:scale-110"
                  style={{ color: isActive ? 'var(--on-accent)' : 'var(--muted)' }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer controls & Settings */}
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--raised)' }}>
          <button
            onClick={() => onNavigate('settings')}
            className="tap-target flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all"
            style={
              currentTab === 'settings'
                ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                : { color: 'var(--muted)' }
            }
          >
            <SettingsIcon className="h-5 w-5" />
            <span>{t('navSettings', language)}</span>
          </button>

          {/* User badge */}
          {userProfile && (
            <div
              className="rounded-xl border p-3"
              style={{ backgroundColor: 'var(--raised)', borderColor: 'var(--raised)' }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold" style={{ color: 'var(--text)' }}>
                    {userProfile.displayName}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--muted)' }}>
                    {userProfile.email}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  title={t('signOut', language)}
                  className="tap-target flex h-8 w-8 items-center justify-center rounded-lg transition"
                  style={{ color: 'var(--danger)' }}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold">
                {isPro ? (
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <Crown className="h-3 w-3" />
                    <span>Life OS PRO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
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
