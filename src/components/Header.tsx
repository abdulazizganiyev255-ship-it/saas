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
    <header
      className="sticky top-0 z-30 w-full border-b backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--raised)',
        color: 'var(--text)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Brand & Today Date */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate('home')}
            className="flex md:hidden items-center gap-2 cursor-pointer active:scale-95 transition"
            title={t('navHome', language)}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-base" style={{ color: 'var(--text)' }}>
              {APP_NAME}
            </span>
          </div>

          <div
            className="hidden sm:flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--raised)',
              borderColor: 'var(--raised)',
              color: 'var(--text)',
            }}
          >
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            <span className="capitalize">{getFormattedDate()}</span>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span style={{ color: 'var(--muted)' }}>{getGreeting()}</span>
          </div>
        </div>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <div
            className="flex items-center rounded-lg border p-0.5"
            style={{ backgroundColor: 'var(--raised)', borderColor: 'var(--raised)' }}
          >
            <button
              onClick={() => setLanguage('uz')}
              aria-label="Uzbek language"
              className="tap-target px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
              style={
                language === 'uz'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--muted)' }
              }
            >
              UZ
            </button>
            <button
              onClick={() => setLanguage('en')}
              aria-label="English language"
              className="tap-target px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
              style={
                language === 'en'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--muted)' }
              }
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="tap-target flex h-10 w-10 items-center justify-center rounded-xl border transition"
            style={{
              backgroundColor: 'var(--raised)',
              borderColor: 'var(--raised)',
              color: 'var(--text)',
            }}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" style={{ color: 'var(--warning)' }} />
            ) : (
              <Moon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            )}
          </button>

          {/* User Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="User menu"
              className="tap-target flex items-center gap-2 rounded-xl p-1 transition"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-9 w-9 rounded-xl object-cover ring-2"
                  style={{ boxShadow: '0 0 0 2px var(--accent)' }}
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-sm"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <ChevronDown className="hidden sm:block h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border p-2 shadow-xl transition-all"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--raised)',
                  color: 'var(--text)',
                }}
              >
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--raised)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {t('signedInAs', language)}
                  </p>
                  <p className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>
                    {user?.displayName || userProfile?.displayName}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                    {user?.email || userProfile?.email}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    {isPro ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border"
                        style={{
                          backgroundColor: 'var(--raised)',
                          borderColor: 'var(--accent)',
                          color: 'var(--accent)',
                        }}
                      >
                        <Crown className="h-3 w-3" />
                        <span>Life OS PRO</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border"
                        style={{
                          backgroundColor: 'var(--raised)',
                          borderColor: 'var(--raised)',
                          color: 'var(--muted)',
                        }}
                      >
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
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                    style={{ color: 'var(--text)' }}
                  >
                    <LayoutDashboard className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    {t('navHome', language)}
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('review');
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                    style={{ color: 'var(--text)' }}
                  >
                    <CalendarCheck className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                    {t('navReview', language)}
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                    style={{ color: 'var(--text)' }}
                  >
                    <SettingsIcon className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                    {t('navSettings', language)}
                  </button>

                  <button
                    onClick={() => {
                      signOut();
                      setDropdownOpen(false);
                    }}
                    className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition"
                    style={{ color: 'var(--danger)' }}
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
