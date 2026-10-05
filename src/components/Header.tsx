import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../i18n';
import { APP_NAME } from '../config/constants';
import type { TabType } from '../types';
import {
  Moon,
  Sun,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Crown,
  LayoutDashboard,
  CalendarCheck,
} from 'lucide-react';

interface HeaderProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { user, userProfile, language, setLanguage, signOut } = useAuth();
  const isPro = userProfile?.plan === 'pro';
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format today's date in Tashkent timezone
  const getFormattedDate = () => {
    try {
      const now = new Date();
      const locale = language === 'uz' ? 'uz-UZ' : 'en-US';
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Tashkent',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat(locale, options).format(now);
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning', language);
    if (hour < 18) return t('greetingAfternoon', language);
    return t('greetingEvening', language);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Brand & Today Date */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate('home')}
            className="flex md:hidden items-center gap-2 cursor-pointer active:scale-95 transition"
            title={t('navHome', language)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
              {APP_NAME}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/70 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="capitalize">{getFormattedDate()}</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-slate-500 dark:text-slate-400">{getGreeting()}</span>
          </div>
        </div>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setLanguage('uz')}
              aria-label="Uzbek language"
              className={`tap-target px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'uz'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => setLanguage('en')}
              aria-label="English language"
              className={`tap-target px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'en'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="tap-target flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
          </button>

          {/* User Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="User menu"
              className="tap-target flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('signedInAs', language)}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {user?.displayName || userProfile?.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || userProfile?.email}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    {isPro ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                        <Crown className="h-3 w-3" />
                        <span>Life OS PRO</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        <ShieldCheck className="h-3 w-3" />
                        <span>{t('planFree', language)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      onNavigate('home');
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                    {t('navHome', language)}
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('review');
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <CalendarCheck className="h-4 w-4 text-amber-500" />
                    {t('navReview', language)}
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <SettingsIcon className="h-4 w-4 text-slate-400" />
                    {t('navSettings', language)}
                  </button>

                  <button
                    onClick={() => {
                      signOut();
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('signOut', language)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
