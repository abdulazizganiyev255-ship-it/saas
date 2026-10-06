import { HIDDEN_TABS } from '../config/constants';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import type { TabType } from '../types';
import {
  CalendarDays,
  CalendarCheck,
  LayoutDashboard,
  Wallet,
  Dumbbell,
  GraduationCap,
  Target,
  Trophy,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  const { language } = useAuth();

  const navItems = [
    { id: 'home' as TabType, label: t('navHome', language), icon: LayoutDashboard },
    { id: 'today' as TabType, label: t('navToday', language), icon: CalendarDays },
    { id: 'budget' as TabType, label: t('navBudget', language), icon: Wallet },
    { id: 'gym' as TabType, label: t('navGym', language), icon: Dumbbell },
    { id: 'study' as TabType, label: t('navStudy', language), icon: GraduationCap },
    { id: 'review' as TabType, label: t('navReview', language), icon: CalendarCheck },
    { id: 'leaderboard' as TabType, label: t('navLeaderboard', language), icon: Trophy },
  ].filter((item) => !HIDDEN_TABS.includes(item.id));

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-token-raised bg-token-card backdrop-blur-lg transition-colors pb-safe"
    >
      <div className="flex h-16 w-full items-center justify-around px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`tap-target flex flex-1 flex-col items-center justify-center py-1 transition-all relative ${
                isActive
                  ? 'text-token-accent font-bold'
                  : 'text-token-muted'
              }`}
            >
              {isActive && (
                <span className="absolute top-1.5 h-1 w-6 rounded-full bg-token-accent" />
              )}
              <Icon
                className={`h-5 w-5 transition-transform ${
                  isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                }`}
              />
              <span className="mt-1 text-[10px] tracking-tight truncate max-w-[62px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
