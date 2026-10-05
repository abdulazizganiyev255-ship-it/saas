import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../i18n';
import type { HabitDefinition, RecurringTemplate, WeeklySplitPlan, WorkoutSplit } from '../types';
import { formatUZS, getWeekParity, getMondayOfDate } from '../utils/format';
import { DEFAULT_WEEKLY_SPLIT, DEFAULT_PARITY_ANCHOR_DATE } from '../config/constants';
import {
  getRecurringTemplates,
  addRecurringTemplate,
  deleteRecurringTemplate,
} from '../services/budget';
import {
  Globe,
  Palette,
  Moon,
  Sun,
  Utensils,
  MoonStar,
  BookOpen,
  Download,
  LogOut,
  Trash2,
  Check,
  AlertTriangle,
  ShieldCheck,
  X,
  Plus,
  Repeat,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  ListTodo,
  Tag,
  Calendar,
  Dumbbell,
  Crown,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    userProfile,
    language,
    setLanguage,
    updateUserSettings,
    signOut,
    signOutAndClearCache,
    deleteAccount,
    exportData,
  } = useAuth();
  const { theme, setTheme } = useTheme();

  // Local form state
  const [dailyFoodLimit, setDailyFoodLimit] = useState<number>(110000);
  const [sleepTargetHours, setSleepTargetHours] = useState<number>(7);
  const [languageTargetMinutes, setLanguageTargetMinutes] = useState<number>(45);
  const [parityAnchorDate, setParityAnchorDate] = useState<string>(DEFAULT_PARITY_ANCHOR_DATE);
  const [weeklySplit, setWeeklySplit] = useState<WeeklySplitPlan>(DEFAULT_WEEKLY_SPLIT);

  // Habits management state
  const [habits, setHabits] = useState<HabitDefinition[]>([]);
  const [newHabitName, setNewHabitName] = useState<string>('');

  // Categories management state
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [newExpenseCat, setNewExpenseCat] = useState<string>('');
  const [newIncomeCat, setNewIncomeCat] = useState<string>('');

  // Recurring templates state
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecCategory, setNewRecCategory] = useState('Food');
  const [newRecAmount, setNewRecAmount] = useState('100000');
  const [newRecDay, setNewRecDay] = useState('1');
  const [showAddRecurring, setShowAddRecurring] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportSuccessNotice, setExportSuccessNotice] = useState(false);

  useEffect(() => {
    if (userProfile?.settings) {
      setDailyFoodLimit(userProfile.settings.dailyFoodLimit ?? 110000);
      setSleepTargetHours(userProfile.settings.sleepTargetHours ?? 7);
      setLanguageTargetMinutes(userProfile.settings.languageTargetMinutes ?? 45);
      setParityAnchorDate(userProfile.settings.parityAnchorDate ?? DEFAULT_PARITY_ANCHOR_DATE);
      setWeeklySplit(userProfile.settings.weeklySplit ?? DEFAULT_WEEKLY_SPLIT);
      setHabits(userProfile.settings.habits || []);
      setExpenseCategories(userProfile.settings.expenseCategories || []);
      setIncomeCategories(userProfile.settings.incomeCategories || []);
    }
  }, [userProfile]);

  useEffect(() => {
    if (user) {
      getRecurringTemplates(user.uid).then((res) => {
        if (res) setRecurringTemplates(res);
      });
    }
  }, [user]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateUserSettings({
        dailyFoodLimit: Number(dailyFoodLimit),
        sleepTargetHours: Number(sleepTargetHours),
        languageTargetMinutes: Number(languageTargetMinutes),
        parityAnchorDate,
        weeklySplit,
        habits,
        expenseCategories,
        incomeCategories,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Habits helpers
  const handleToggleHabitActive = (id: string) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, active: !h.active } : h));
    setHabits(updated);
    updateUserSettings({ habits: updated });
  };

  const handleRenameHabit = (id: string, newLabel: string) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, label: newLabel } : h));
    setHabits(updated);
    updateUserSettings({ habits: updated });
  };

  const handleMoveHabit = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= habits.length) return;
    const updated = [...habits];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setHabits(updated);
    updateUserSettings({ habits: updated });
  };

  const handleDeleteHabit = (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    setHabits(updated);
    updateUserSettings({ habits: updated });
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const newId = newHabitName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4);
    const updated = [...habits, { id: newId, label: newHabitName.trim(), active: true }];
    setHabits(updated);
    setNewHabitName('');
    updateUserSettings({ habits: updated });
  };

  // Categories helpers
  const handleAddExpenseCategory = () => {
    if (!newExpenseCat.trim() || expenseCategories.includes(newExpenseCat.trim())) return;
    const updated = [...expenseCategories, newExpenseCat.trim()];
    setExpenseCategories(updated);
    setNewExpenseCat('');
    updateUserSettings({ expenseCategories: updated });
  };

  const handleDeleteExpenseCategory = (cat: string) => {
    const updated = expenseCategories.filter((c) => c !== cat);
    setExpenseCategories(updated);
    updateUserSettings({ expenseCategories: updated });
  };

  const handleAddIncomeCategory = () => {
    if (!newIncomeCat.trim() || incomeCategories.includes(newIncomeCat.trim())) return;
    const updated = [...incomeCategories, newIncomeCat.trim()];
    setIncomeCategories(updated);
    setNewIncomeCat('');
    updateUserSettings({ incomeCategories: updated });
  };

  const handleDeleteIncomeCategory = (cat: string) => {
    const updated = incomeCategories.filter((c) => c !== cat);
    setIncomeCategories(updated);
    updateUserSettings({ incomeCategories: updated });
  };

  // Recurring Templates helpers
  const handleCreateRecurringTemplate = async () => {
    if (!user || !newRecTitle.trim()) return;
    const amt = parseInt(newRecAmount, 10);
    const day = parseInt(newRecDay, 10);
    if (isNaN(amt) || isNaN(day) || day < 1 || day > 31) return;

    const tpl = await addRecurringTemplate(user.uid, {
      title: newRecTitle.trim(),
      category: newRecCategory,
      amountUZS: amt,
      dayOfMonth: day,
      createdAt: new Date().toISOString(),
    });

    setRecurringTemplates((prev) => [...prev, tpl]);
    setNewRecTitle('');
    setShowAddRecurring(false);
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!user) return;
    await deleteRecurringTemplate(user.uid, id);
    setRecurringTemplates((prev) => prev.filter((r) => r.id !== id));
  };

  const handleExport = () => {
    exportData();
    setExportSuccessNotice(true);
    setTimeout(() => setExportSuccessNotice(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('settingsTitle', language)}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('settingsSubtitle', language)}
        </p>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          <span>{t('changesSaved', language)}</span>
        </div>
      )}

      {/* Export notification */}
      {exportSuccessNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          <Download className="h-4 w-4" />
          <span>{t('exportSuccess', language)}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Appearance & Localization */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Preferences
          </h2>

          <div className="space-y-5">
            {/* Language Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('languageSetting', language)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O'zbekcha / English
                  </p>
                </div>
              </div>

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setLanguage('uz')}
                  className={`tap-target px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    language === 'uz'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  O'zbekcha
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`tap-target px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    language === 'en'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Theme Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('themeSetting', language)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {theme === 'dark' ? t('themeDark', language) : t('themeLight', language)}
                  </p>
                </div>
              </div>

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`tap-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-800 dark:text-amber-400'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>{t('themeDark', language)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`tap-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    theme === 'light'
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>{t('themeLight', language)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Daily Targets & Limits */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            {t('targetsHeading', language)}
          </h2>

          <div className="space-y-4">
            {/* Daily Food Limit */}
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Utensils className="h-4 w-4 text-emerald-500" />
                <label htmlFor="foodLimit" className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('dailyFoodLimitLabel', language)}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t('dailyFoodLimitDesc', language)}
              </p>
              <div className="relative">
                <input
                  id="foodLimit"
                  type="number"
                  min="0"
                  step="5000"
                  value={dailyFoodLimit}
                  onChange={(e) => setDailyFoodLimit(Number(e.target.value))}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {t('currencyUzs', language)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sleep Target Hours */}
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 mb-1.5">
                <MoonStar className="h-4 w-4 text-indigo-500" />
                <label htmlFor="sleepTarget" className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('sleepTargetLabel', language)}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t('sleepTargetDesc', language)}
              </p>
              <div className="relative">
                <input
                  id="sleepTarget"
                  type="number"
                  min="4"
                  max="14"
                  step="0.5"
                  value={sleepTargetHours}
                  onChange={(e) => setSleepTargetHours(Number(e.target.value))}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {t('hoursUnit', language)}
                  </span>
                </div>
              </div>
            </div>

            {/* Language Target Minutes */}
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-4 w-4 text-cyan-500" />
                <label htmlFor="langTarget" className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('languageTargetLabel', language)}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t('languageTargetDesc', language)}
              </p>
              <div className="relative">
                <input
                  id="langTarget"
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  value={languageTargetMinutes}
                  onChange={(e) => setLanguageTargetMinutes(Number(e.target.value))}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {t('minutesUnit', language)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Weekly Split Planner (Gym) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              <span>{t('weeklySplitPlannerHeading', language)}</span>
            </h2>
            <button
              type="button"
              onClick={() => setWeeklySplit(DEFAULT_WEEKLY_SPLIT)}
              className="tap-target text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              {language === 'uz' ? 'Standart reja' : 'Reset to default'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {language === 'uz'
              ? 'Hafta kunlari bo\'yicha mashg\'ulot turlarini belgilang (Push, Pull, Legs, Recovery...)'
              : 'Configure your weekly workout split schedule (Push, Pull, Legs, Recovery...)'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { day: 1, label: t('monSplit', language), def: 'Push' },
              { day: 2, label: t('tueSplit', language), def: 'Pull' },
              { day: 3, label: t('wedSplit', language), def: 'Legs' },
              { day: 4, label: t('thuSplit', language), def: 'Push' },
              { day: 5, label: t('friSplit', language), def: 'Pull' },
              { day: 6, label: t('satSplit', language), def: 'Legs' },
              { day: 7, label: t('sunSplit', language), def: 'Recovery' },
            ].map(({ day, label, def }) => {
              const currentSplit = (weeklySplit as any)?.[day] || def;
              const splits: WorkoutSplit[] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Cardio', 'Recovery'];

              return (
                <div
                  key={day}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {label}
                  </span>
                  <select
                    value={currentSplit}
                    onChange={(e) => {
                      const next = { ...weeklySplit, [day]: e.target.value as WorkoutSplit };
                      setWeeklySplit(next);
                    }}
                    className="tap-target rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {splits.map((s) => (
                      <option key={s} value={s}>
                        {s} {s === 'Recovery' && day === 7 ? '(Walk + Mobility)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: University Week Parity Anchor */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('parityAnchorDateLabel', language)}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            {language === 'uz'
              ? 'Paritet mantig\'i: Anchor sana - bu JUFT (Even) hafta deb hisoblanadigan Dushanba kuni. Har qanday sana uchun haftalar farqi juft bo\'lsa juft hafta, toq bo\'lsa toq hafta bo\'ladi.'
              : 'Week parity logic: Anchor date is a Monday that represents an EVEN week. A date is even if the number of whole weeks from anchor Monday is even, otherwise odd.'}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="date"
              value={parityAnchorDate || DEFAULT_PARITY_ANCHOR_DATE}
              onChange={(e) => setParityAnchorDate(e.target.value)}
              className="tap-target rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-400">
              {language === 'uz' ? 'Anchor Dushanbasi:' : 'Anchor Monday:'}{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">
                {getMondayOfDate(parityAnchorDate || DEFAULT_PARITY_ANCHOR_DATE)}
              </strong>
            </span>
          </div>
        </div>

        {/* Section 3: Habits Management (Add, Rename, Reorder, Deactivate) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ListTodo className="h-4 w-4 text-indigo-500" />
              <span>{t('habitsManagerHeading', language)}</span>
            </h2>
            <span className="text-xs text-slate-400 font-bold">
              {habits.filter((h) => h.active).length} / {habits.length} {language === 'uz' ? 'faol' : 'active'}
            </span>
          </div>

          {/* Add Habit input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder={t('habitNamePlaceholder', language)}
              className="tap-target flex-1 rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddHabit}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addHabitBtn', language)}</span>
            </button>
          </div>

          {/* Habits List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
            {habits.map((habit, idx) => (
              <div
                key={habit.id}
                className="flex items-center justify-between py-2 gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleHabitActive(habit.id)}
                    className="tap-target text-slate-400 hover:text-indigo-600"
                    title={habit.active ? t('habitActive', language) : t('habitInactive', language)}
                  >
                    {habit.active ? (
                      <ToggleRight className="h-6 w-6 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-400" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={habit.label}
                    onChange={(e) => handleRenameHabit(habit.id, e.target.value)}
                    className={`text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none flex-1 truncate ${
                      !habit.active ? 'opacity-50 line-through' : ''
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveHabit(idx, 'up')}
                    disabled={idx === 0}
                    className="tap-target flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveHabit(idx, 'down')}
                    disabled={idx === habits.length - 1}
                    className="tap-target flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="tap-target flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Budget Categories Manager */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-emerald-500" />
            <span>{t('categoriesManagerHeading', language)}</span>
          </h2>

          {/* Expense Categories */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              {t('expenseCategoriesLabel', language)}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {expenseCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span>{cat}</span>
                  {expenseCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExpenseCategory(cat)}
                      className="tap-target text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExpenseCat}
                onChange={(e) => setNewExpenseCat(e.target.value)}
                placeholder={t('categoryNamePlaceholder', language)}
                className="tap-target flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddExpenseCategory}
                className="tap-target rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                +
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Income Categories */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              {t('incomeCategoriesLabel', language)}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {incomeCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span>{cat}</span>
                  {incomeCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteIncomeCategory(cat)}
                      className="tap-target text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIncomeCat}
                onChange={(e) => setNewIncomeCat(e.target.value)}
                placeholder={t('categoryNamePlaceholder', language)}
                className="tap-target flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddIncomeCategory}
                className="tap-target rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Recurring Templates Manager */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Repeat className="h-4 w-4 text-indigo-500" />
              <span>{t('recurringTemplatesHeading', language)}</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddRecurring((prev) => !prev)}
              className="tap-target text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              + {t('addRecurringTemplate', language)}
            </button>
          </div>

          {showAddRecurring && (
            <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('recurringTitleLabel', language)}
                </label>
                <input
                  type="text"
                  value={newRecTitle}
                  onChange={(e) => setNewRecTitle(e.target.value)}
                  placeholder="e.g. Wi-Fi, Gym, Dormitory"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('categoryLabel', language)}
                  </label>
                  <select
                    value={newRecCategory}
                    onChange={(e) => setNewRecCategory(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('amountLabel', language)} (UZS)
                  </label>
                  <input
                    type="number"
                    value={newRecAmount}
                    onChange={(e) => setNewRecAmount(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('recurringDayOfMonth', language)}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newRecDay}
                    onChange={(e) => setNewRecDay(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddRecurring(false)}
                  className="tap-target px-3 py-1.5 text-xs text-slate-500"
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="button"
                  onClick={handleCreateRecurringTemplate}
                  className="tap-target rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  {t('saveChanges', language)}
                </button>
              </div>
            </div>
          )}

          {recurringTemplates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {language === 'uz' ? 'Hozircha shablonlar mavjud emas.' : 'No templates configured yet.'}
            </p>
          ) : (
            <div className="space-y-2">
              {recurringTemplates.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 dark:border-slate-800"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {r.category} · {formatUZS(r.amountUZS)} UZS · {r.dayOfMonth}-kun
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecurring(r.id)}
                    className="tap-target text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button for form */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="tap-target flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? t('saving', language) : t('saveChanges', language)}
          </button>
        </div>

        {/* Section 6: Account & Security */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            {t('accountSection', language)}
          </h2>

          <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {userProfile?.displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userProfile?.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {userProfile?.plan === 'pro' ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    <Crown className="h-3.5 w-3.5" />
                    <span>Life OS PRO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t('planFree', language)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExport}
              className="tap-target flex w-full items-center justify-center sm:justify-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4 text-indigo-500" />
              <span>{t('exportDataBtn', language)}</span>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="tap-target flex w-full items-center justify-center sm:justify-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <LogOut className="h-4 w-4 text-amber-500" />
              <span>{t('signOut', language)}</span>
            </button>

            <button
              type="button"
              onClick={signOutAndClearCache}
              className="tap-target flex w-full items-center justify-center sm:justify-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100/60 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40 transition"
            >
              <Trash2 className="h-4 w-4 text-amber-500" />
              <span>{language === 'en' ? 'Sign out and clear device data' : "Chiqish va qurilmadagi ma'lumotni o'chirish"}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="tap-target flex w-full items-center justify-center sm:justify-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
              <span>{t('deleteAccountBtn', language)}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/50 dark:bg-slate-900 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-base">
                  {t('deleteModalTitle', language)}
                </h3>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('deleteModalText', language)}
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="tap-target w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                {t('cancel', language)}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="tap-target w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 shadow-md shadow-rose-600/30 transition"
              >
                {deleting ? (
                  <span>{t('deleting', language)}</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>{t('confirmDelete', language)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
