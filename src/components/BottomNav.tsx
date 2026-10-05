import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import type { TabType } from '../types';
import {
  CalendarDays,
  Wallet,
  Dumbbell,
  GraduationCap,
  Target,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  const { language } = useAuth();

  const navItems = [
    { id: 'today' as TabType, label: t('navToday', language), icon: CalendarDays },
    { id: 'budget' as TabType, label: t('navBudget', language), icon: Wallet },
    { id: 'gym' as TabType, label: t('navGym', language), icon: Dumbbell },
    { id: 'study' as TabType, label: t('navStudy', language), icon: GraduationCap },
    { id: 'goals' as TabType, label: t('navGoals', language), icon: Target },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-lg dark:border-slate-800/90 dark:bg-slate-950/95 transition-colors pb-safe"
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
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute top-1.5 h-1 w-6 rounded-full bg-indigo-600 dark:bg-indigo-400" />
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
