import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { Goal, GoalStatus } from '../../types';
import { getGoals, addGoal, updateGoal, deleteGoal } from '../../services/goals';
import { getTodayDateString, daysUntil } from '../../utils/format';
import { usePlan } from '../../hooks/usePlan';
import { UpgradeModal } from '../common/UpgradeModal';
import {
  Target,
  Plus,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  BarChart2,
  Crown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const GoalsScreen: React.FC = () => {
  const { user, userProfile, language } = useAuth();
  const { isPro, maxGoals } = usePlan();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New goal form state
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('Career');
  const [newTarget, setNewTarget] = useState('100');
  const [newCurrent, setNewCurrent] = useState('0');
  const [newUnit, setNewUnit] = useState('$');
  const [newDeadline, setNewDeadline] = useState('2026-12-31');

  // Inline editing of current value: { [goalId]: string }
  const [editingCurrent, setEditingCurrent] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (!user) return;
    getGoals(user.uid).then((res) => {
      if (res) setGoals(res);
    });
  }, [user]);

  // Horizontal bar chart data: progress percentage across goals
  const chartData = useMemo(() => {
    return goals.map((g) => {
      const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
      return {
        name: g.title.length > 16 ? g.title.slice(0, 16) + '...' : g.title,
        progress: pct,
        status: g.status,
      };
    });
  }, [goals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (!user || !newTitle.trim()) return;

    setCreating(true);
    try {
      const tgt = Number(newTarget) || 100;
      const cur = Number(newCurrent) || 0;

      const goal = await addGoal(
        user.uid,
        {
          title: newTitle.trim(),
          area: newArea.trim(),
          target: tgt,
          current: cur,
          unit: newUnit.trim(),
          deadline: newDeadline,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        isPro
      );

      setGoals((prev) => [...prev, goal]);
      setNewTitle('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCurrentValue = async (goalId: string) => {
    if (!user || editingCurrent[goalId] === undefined) return;
    const val = Number(editingCurrent[goalId]);
    if (isNaN(val)) return;

    const targetGoal = goals.find((g) => g.id === goalId);
    const newStatus: GoalStatus = targetGoal && val >= targetGoal.target ? 'done' : (targetGoal?.status || 'active');

    await updateGoal(user.uid, goalId, { current: val, status: newStatus });
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, current: val, status: newStatus } : g)));

    setEditingCurrent((prev) => {
      const copy = { ...prev };
      delete copy[goalId];
      return copy;
    });
  };

  const handleToggleStatus = async (goal: Goal) => {
    if (!user) return;
    let nextStatus: GoalStatus = 'active';
    if (goal.status === 'active') nextStatus = 'paused';
    else if (goal.status === 'paused') nextStatus = 'done';
    else if (goal.status === 'done') nextStatus = 'active';

    await updateGoal(user.uid, goal.id, { status: nextStatus });
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: nextStatus } : g)));
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    await deleteGoal(user.uid, id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
            <Target className="h-3.5 w-3.5" />
            <span>{t('goalsTitle', language)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {goals.filter((g) => g.status === 'active').length} {language === 'uz' ? 'faol maqsad' : 'active goals'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isPro && (
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 px-2.5 py-1 rounded-xl">
              Free: {goals.length}/3
            </span>
          )}
          <button
            onClick={() => {
              if (!isPro && goals.length >= 3) {
                setUpgradeModalOpen(true);
                return;
              }
              setShowAddModal(true);
            }}
            className="tap-target inline-flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addGoalBtn', language)}</span>
            {!isPro && goals.length >= 3 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
          </button>
        </div>
      </div>

      {/* 2. Horizontal Bar Chart of Progress Across Goals */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-purple-500" />
            <span>{t('progressOverview', language)}</span>
          </h3>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={90}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, language === 'uz' ? 'Progress' : 'Progress']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="progress" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status === 'done' ? '#10b981' : entry.status === 'paused' ? '#94a3b8' : '#a855f7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Cards Per Goal with Progress Bar and Inline Editing of Current */}
      <div className="space-y-3.5">
        {goals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-slate-900">
            <Target className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-40" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'uz'
                ? "Hali maqsadlar qo'shilmagan. Yuqoridagi tugma orqali boshlang!"
                : "No goals set yet. Tap 'New Goal' to begin!"}
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const daysLeft = daysUntil(goal.deadline, todayStr);
            const isEditing = editingCurrent[goal.id] !== undefined;

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase">
                        {goal.area}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `${daysLeft} ${t('daysLeftLabel', language)}` : 'Deadline o\'tdi'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {goal.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Badge & Toggle */}
                    <button
                      onClick={() => handleToggleStatus(goal)}
                      className={`tap-target px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                        goal.status === 'done'
                          ? 'bg-emerald-500 text-white'
                          : goal.status === 'paused'
                          ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {goal.status}
                    </button>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="tap-target text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            autoFocus
                            value={editingCurrent[goal.id]}
                            onChange={(e) =>
                              setEditingCurrent((prev) => ({ ...prev, [goal.id]: e.target.value }))
                            }
                            className="tap-target w-20 rounded-lg border border-purple-400 px-2 py-0.5 text-xs font-bold text-slate-900 dark:bg-slate-800 dark:text-white"
                          />
                          <button
                            onClick={() => handleSaveCurrentValue(goal.id)}
                            className="tap-target rounded bg-purple-600 p-1 text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingCurrent((prev) => ({ ...prev, [goal.id]: String(goal.current) }))
                          }
                          className="tap-target hover:underline flex items-center gap-1 text-purple-600 dark:text-purple-400"
                          title="Click to edit current progress"
                        >
                          <span>{goal.current}</span>
                          <Pencil className="h-3 w-3 opacity-60" />
                        </button>
                      )}
                      <span className="text-slate-400">/ {goal.target} {goal.unit}</span>
                    </div>

                    <span className="font-extrabold text-purple-600 dark:text-purple-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.status === 'done' ? 'bg-emerald-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('addGoalBtn', language)}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="tap-target text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('goalTitleLabel', language)}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. $10k MRR / 100kg Bench / Read 12 books"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('goalAreaLabel', language)}
                </label>
                <select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Career">Career (Karyera)</option>
                  <option value="Finance">Finance (Moliya)</option>
                  <option value="Study">Study (O'qish)</option>
                  <option value="Fitness">Fitness (Sport)</option>
                  <option value="Personal">Personal (Shaxsiy)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('currentLabel', language)}
                  </label>
                  <input
                    type="number"
                    value={newCurrent}
                    onChange={(e) => setNewCurrent(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('targetLabel', language)}
                  </label>
                  <input
                    type="number"
                    required
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('unitLabel', language)}
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="$, kg, kitob"
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('deadlineLabel', language)}
                </label>
                <input
                  type="date"
                  required
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="tap-target px-3 py-1.5 text-xs text-slate-500"
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="tap-target rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {creating ? t('saving', language) : t('saveChanges', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        feature={language === 'uz' ? 'Cheksiz Maqsadlar' : 'Unlimited Goals'}
      />
    </div>
  );
};
