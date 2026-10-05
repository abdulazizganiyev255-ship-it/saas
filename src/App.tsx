/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { LandingPage } from './components/LandingPage';
import { TodayScreen } from './components/today/TodayScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import type { TabType } from './types';
import { Loader2, AlertTriangle, X } from 'lucide-react';

// Code-split heavy modules for faster initial load
const HomeScreen = lazy(() => import('./components/home/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const BudgetScreen = lazy(() => import('./components/budget/BudgetScreen').then((m) => ({ default: m.BudgetScreen })));
const GymScreen = lazy(() => import('./components/gym/GymScreen').then((m) => ({ default: m.GymScreen })));
const StudyScreen = lazy(() => import('./components/study/StudyScreen').then((m) => ({ default: m.StudyScreen })));
const LanguageScreen = lazy(() => import('./components/language/LanguageScreen').then((m) => ({ default: m.LanguageScreen })));
const GoalsScreen = lazy(() => import('./components/goals/GoalsScreen').then((m) => ({ default: m.GoalsScreen })));
const WeeklyReviewScreen = lazy(() => import('./components/review/WeeklyReviewScreen').then((m) => ({ default: m.WeeklyReviewScreen })));
const LeaderboardScreen = lazy(() => import('./components/review/LeaderboardScreen').then((m) => ({ default: m.LeaderboardScreen })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || "Xatolik: Amal rad etildi.";
      setErrorToast(msg);
      const timer = setTimeout(() => setErrorToast(null), 5000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('lifeos:error-toast', handler);
    return () => window.removeEventListener('lifeos:error-toast', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Loading Life OS...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'home':
        return <HomeScreen onNavigate={setCurrentTab} />;
      case 'today':
        return <TodayScreen onNavigate={setCurrentTab} />;
      case 'budget':
        return <BudgetScreen onNavigate={setCurrentTab} />;
      case 'gym':
        return <GymScreen />;
      case 'study':
        return <StudyScreen />;
      case 'language':
        return <LanguageScreen />;
      case 'goals':
        return <GoalsScreen />;
      case 'review':
        return <WeeklyReviewScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayScreen onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Desktop Left Sidebar */}
      <Sidebar currentTab={currentTab} onNavigate={setCurrentTab} />

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header currentTab={currentTab} onNavigate={setCurrentTab} />

        {/* In-app PWA install notice */}
        <PWAInstallBanner />

        {/* View container */}
        <main className="flex-1 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            }
          >
            {renderActiveView()}
          </Suspense>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <BottomNav currentTab={currentTab} onNavigate={setCurrentTab} />

        {/* Offline connectivity toast */}
        <OfflineIndicator />

        {/* Error Toast for rejected writes & rule violations */}
        {errorToast && (
          <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm rounded-2xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 border border-rose-500 flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span className="flex-1 leading-snug">{errorToast}</span>
            <button
              onClick={() => setErrorToast(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
