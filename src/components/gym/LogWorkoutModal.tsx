import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { Workout, WorkoutSplit, WorkoutExercise, ExerciseSet } from '../../types';
import { DEFAULT_EXERCISES_BY_SPLIT } from '../../config/constants';
import { getLastWorkoutOfSplit, calculateProgressiveOverload } from '../../services/gym';
import { getTodayDateString } from '../../utils/format';
import { X, Plus, Trash2, Check, TrendingUp, Sparkles, Dumbbell } from 'lucide-react';

interface LogWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: Omit<Workout, 'id'>) => Promise<void>;
  workoutsHistory: Workout[];
}

export const LogWorkoutModal: React.FC<LogWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  workoutsHistory,
}) => {
  const { userProfile, language } = useAuth();
  const [date, setDate] = useState<string>(getTodayDateString());
  const [split, setSplit] = useState<WorkoutSplit>('Push');
  const [durationMin, setDurationMin] = useState<number>(60);
  const [bodyWeightKg, setBodyWeightKg] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // When split changes or modal opens, prefill from last session of the same split
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateString(userProfile?.timezone));

      const lastWorkout = getLastWorkoutOfSplit(workoutsHistory, split);
      if (lastWorkout && lastWorkout.exercises.length > 0) {
        // Deep clone exercises from last session
        const cloned: WorkoutExercise[] = lastWorkout.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s) => ({ reps: s.reps, kg: s.kg })),
        }));
        setExercises(cloned);
        if (lastWorkout.bodyWeightKg) {
          setBodyWeightKg(String(lastWorkout.bodyWeightKg));
        }
      } else {
        // Fallback to default preset for this split
        const preset = DEFAULT_EXERCISES_BY_SPLIT[split] || [
          { name: 'Exercise 1', sets: [{ reps: 10, kg: 20 }] },
        ];
        const cloned: WorkoutExercise[] = preset.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s) => ({ reps: s.reps, kg: s.kg })),
        }));
        setExercises(cloned);
      }
    }
  }, [isOpen, split, workoutsHistory, userProfile?.timezone]);

  if (!isOpen) return null;

  const handleAddExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        name: '',
        sets: [{ reps: 10, kg: 20 }],
      },
    ]);
  };

  const handleRemoveExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExerciseNameChange = (idx: number, name: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[idx].name = name;
      return updated;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1] || { reps: 10, kg: 20 };
      updated[exIdx].sets.push({ reps: lastSet.reps, kg: lastSet.kg });
      return updated;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
      return updated;
    });
  };

  const handleSetChange = (exIdx: number, setIdx: number, field: 'reps' | 'kg', value: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIdx].sets[setIdx][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (exercises.length === 0) return;

    setSaving(true);
    try {
      const validExercises = exercises
        .filter((ex) => ex.name.trim().length > 0)
        .map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets.map((s) => ({ reps: Number(s.reps), kg: Number(s.kg) })),
        }));

      await onSave({
        date,
        split,
        exercises: validExercises,
        durationMin: Number(durationMin) || 60,
        bodyWeightKg: bodyWeightKg ? Number(bodyWeightKg) : undefined,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to log workout:', err);
    } finally {
      setSaving(false);
    }
  };

  const splits: WorkoutSplit[] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Cardio', 'Recovery'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('logWorkoutBtn', language)}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {split} Split · {date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Split Selection Chips */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              {t('splitLabel', language)}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {splits.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSplit(s)}
                  className={`tap-target px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    split === s
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 scale-102'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Duration & Bodyweight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('dateLabel', language)}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('durationMinLabel', language)}
              </label>
              <input
                type="number"
                min="10"
                max="240"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {t('bodyWeightLabel', language)}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 74.5"
                value={bodyWeightKg}
                onChange={(e) => setBodyWeightKg(e.target.value)}
                className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Exercises & Sets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('exercisesLabel', language)}
              </label>
              <button
                type="button"
                onClick={handleAddExercise}
                className="tap-target text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('addExerciseBtn', language)}</span>
              </button>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, exIdx) => {
                const overload = calculateProgressiveOverload(ex.name, ex.sets, workoutsHistory, date);

                return (
                  <div
                    key={exIdx}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => handleExerciseNameChange(exIdx, e.target.value)}
                        placeholder={t('exerciseNamePlaceholder', language)}
                        className="tap-target flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />

                      {/* Progressive Overload Badge */}
                      {overload.isOverload && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            {overload.weightDiff > 0 ? `+${overload.weightDiff}kg` : `+${overload.repsDiff} reps`}
                          </span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="tap-target text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Sets Rows */}
                    <div className="space-y-1.5">
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400 w-6">
                            #{setIdx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={set.reps}
                              onChange={(e) =>
                                handleSetChange(exIdx, setIdx, 'reps', Number(e.target.value))
                              }
                              className="tap-target w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-center text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="text-[10px] text-slate-400">reps</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="500"
                              value={set.kg}
                              onChange={(e) =>
                                handleSetChange(exIdx, setIdx, 'kg', Number(e.target.value))
                              }
                              className="tap-target w-18 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-center text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="text-[10px] text-slate-400">kg</span>
                          </div>

                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exIdx, setIdx)}
                              className="tap-target text-slate-300 hover:text-rose-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddSet(exIdx)}
                        className="tap-target text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1 pt-1"
                      >
                        + {t('addSetBtn', language)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Workout notes (pump, sleep, hydration)..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || exercises.length === 0}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-3.5 text-base font-bold text-white shadow-xl shadow-orange-600/30 hover:bg-orange-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Check className="h-5 w-5" />
              <span>{saving ? t('saving', language) : t('saveChanges', language)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
