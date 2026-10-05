import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { LanguageSession, LanguageSkill } from '../../types';
import { getLanguageSessions, saveLanguageSession, deleteLanguageSession } from '../../services/language';
import { getTodayDateString, getMondayOfDate, addDays, formatDateDisplay } from '../../utils/format';
import { ProGate } from '../common/ProGate';
import {
  Languages,
  Plus,
  BookOpen,
  Headphones,
  Mic,
  FileText,
  Bookmark,
  Check,
  Trash2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const LanguageScreen: React.FC = () => {
  const { user, userProfile, language: uiLang } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);

  const [sessions, setSessions] = useState<LanguageSession[]>([]);

  // Quick log form state
  const [targetLang, setTargetLang] = useState<'en' | 'ru' | 'other'>('en');
  const [minutes, setMinutes] = useState<number>(30);
  const [newWords, setNewWords] = useState<number>(10);
  const [selectedSkills, setSelectedSkills] = useState<LanguageSkill[]>(['vocab', 'listening']);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!user) return;
    getLanguageSessions(user.uid).then((res) => {
      if (res) setSessions(res);
    });
  }, [user]);

  const targetMinutes = userProfile?.settings?.languageTargetMinutes ?? 45;

  // Calculate weekly total (Mon - Sun) vs weekly target (7 * daily target)
  const thisMonday = getMondayOfDate(todayStr);
  const thisSunday = addDays(thisMonday, 6);

  const weeklySessions = useMemo(() => {
    return sessions.filter((s) => s.date >= thisMonday && s.date <= thisSunday);
  }, [sessions, thisMonday, thisSunday]);

  const weeklyTotalMinutes = useMemo(() => {
    return weeklySessions.reduce((sum, s) => sum + s.minutes, 0);
  }, [weeklySessions]);

  const weeklyTargetMinutes = targetMinutes * 7;
  const weeklyProgress = Math.min(100, Math.round((weeklyTotalMinutes / weeklyTargetMinutes) * 100));

  // Chart data: last 14 days stacked by language (en, ru, other)
  const chartData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      dates.push(addDays(todayStr, -i));
    }

    return dates.map((dateStr) => {
      const daySessions = sessions.filter((s) => s.date === dateStr);
      let enMin = 0;
      let ruMin = 0;
      let otherMin = 0;

      daySessions.forEach((s) => {
        if (s.language === 'en') enMin += s.minutes;
        else if (s.language === 'ru') ruMin += s.minutes;
        else otherMin += s.minutes;
      });

      return {
        date: dateStr.slice(5),
        en: enMin,
        ru: ruMin,
        other: otherMin,
        total: enMin + ruMin + otherMin,
      };
    });
  }, [sessions, todayStr]);

  const handleToggleSkill = (skill: LanguageSkill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!user || minutes <= 0) return;

    setSaving(true);
    try {
      const newSession = await saveLanguageSession(user.uid, {
        date: todayStr,
        language: targetLang,
        minutes: Number(minutes),
        newWords: Number(newWords) || 0,
        skills: selectedSkills,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });

      setSessions((prev) => [newSession, ...prev]);
      setNotes('');
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      console.error('Failed to log language session:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    await deleteLanguageSession(user.uid, id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const allSkills: { id: LanguageSkill; label: string; icon: any }[] = [
    { id: 'vocab', label: t('vocabSkill', uiLang), icon: Bookmark },
    { id: 'listening', label: t('listeningSkill', uiLang), icon: Headphones },
    { id: 'speaking', label: t('speakingSkill', uiLang), icon: Mic },
    { id: 'reading', label: t('readingSkill', uiLang), icon: BookOpen },
    { id: 'grammar', label: t('grammarSkill', uiLang), icon: FileText },
  ];

  return (
    <ProGate
      feature="language"
      featureTitle={t('languageTitle', uiLang)}
      featureDesc={uiLang === 'uz' ? 'Xorijiy tillarni o\'rganish, kunlik daqiqalar va yangi so\'zlar jurnali Pro tarifida ochiladi.' : 'Foreign language practice logging, skills tracking, and daily target graphs.'}
    >
      <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
              <Languages className="h-3.5 w-3.5" />
              <span>{t('languageTitle', uiLang)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {weeklyTotalMinutes} min {uiLang === 'uz' ? "o'rganildi" : 'practiced'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('weeklyLanguageTotal', uiLang)}: <strong>{weeklyTotalMinutes}</strong> / {weeklyTargetMinutes} min
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {weeklyProgress}%
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {uiLang === 'uz' ? 'Haftalik progress' : 'Weekly Goal'}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${weeklyProgress}%` }}
          />
        </div>
      </div>

      {/* 2. Column Chart: Minutes per Day Stacked by Language */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {uiLang === 'uz' ? "Kunlik daqiqalar (Oxirgi 14 kun)" : "Daily Minutes (Last 14 days)"}
          </h3>
          <span className="text-[10px] text-cyan-500 font-bold">
            {t('languageTargetLine', uiLang)}: {targetMinutes}m
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(val: any, name: any) => [`${val} min`, name.toUpperCase()]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={targetMinutes}
                stroke="#06b6d4"
                strokeDasharray="4 4"
                label={{ value: `${targetMinutes}m`, fill: '#06b6d4', fontSize: 10, position: 'top' }}
              />
              <Bar dataKey="en" stackId="a" fill="#06b6d4" name="English" />
              <Bar dataKey="ru" stackId="a" fill="#3b82f6" name="Russian" />
              <Bar dataKey="other" stackId="a" fill="#8b5cf6" name="Other" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Quick Log Form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span>{t('quickLogLanguage', uiLang)}</span>
        </h3>

        {savedNotice && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-2.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <Check className="h-4 w-4" />
            <span>{t('languageSessionLogged', uiLang)}</span>
          </div>
        )}

        <form onSubmit={handleQuickLog} className="space-y-3.5">
          {/* Language selector chips */}
          <div className="flex gap-2">
            {[
              { id: 'en', label: 'English 🇬🇧' },
              { id: 'ru', label: 'Русский 🇷🇺' },
              { id: 'other', label: 'Boshqa / Other' },
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setTargetLang(l.id as any)}
                className={`tap-target px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  targetLang === l.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Minutes & Words */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('minutesPracticed', uiLang)}
              </label>
              <input
                type="number"
                min="5"
                max="300"
                step="5"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('wordsLearned', uiLang)}
              </label>
              <input
                type="number"
                min="0"
                value={newWords}
                onChange={(e) => setNewWords(Number(e.target.value))}
                className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Skills Chips */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              {t('skillsTrained', uiLang)}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map((sk) => {
                const isSelected = selectedSkills.includes(sk.id);
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => handleToggleSkill(sk.id)}
                    className={`tap-target inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>{sk.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Duolingo + podcast on tech founders..."
              className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-600/30 hover:bg-cyan-700 disabled:opacity-50 transition cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? t('saving', uiLang) : t('quickLogLanguage', uiLang)}</span>
          </button>
        </form>
      </div>

      {/* 4. Recent Sessions List */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
          <Layers className="h-4 w-4" />
          <span>{uiLang === 'uz' ? 'Oxirgi mashg\'ulotlar' : 'Recent Sessions'}</span>
        </h3>

        <div className="space-y-2.5">
          {sessions.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-400">
                    {session.language}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {session.minutes} min
                  </span>
                  {session.newWords > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                      +{session.newWords} words
                    </span>
                  )}
                  <span className="text-xs text-slate-400">· {session.date}</span>
                </div>
                {session.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {session.notes}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleDeleteSession(session.id)}
                className="tap-target text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    </ProGate>
  );
};
