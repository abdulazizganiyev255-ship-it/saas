import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type {
  Course,
  TimetableSlot,
  StudyTask,
  StudyNote,
  TaskStatus,
  TaskPriority,
  TaskType,
  ClassType,
  WeekParity,
} from '../../types';
import {
  getCourses,
  addCourse,
  deleteCourse,
  getTimetable,
  addTimetableSlot,
  deleteTimetableSlot,
  getTasks,
  addTask,
  updateTaskStatus,
  deleteTask,
  getNotesForDate,
  toggleKonspektNote,
} from '../../services/study';
import {
  getTodayDateString,
  getWeekdayNumber,
  getWeekParity,
  formatDateDisplay,
  daysUntil,
} from '../../utils/format';
import { ProGate } from '../common/ProGate';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  MapPin,
  AlertCircle,
  Kanban,
  List,
  BookOpen,
  X,
  Check,
  Tag,
} from 'lucide-react';

export const StudyScreen: React.FC = () => {
  const { user, userProfile, language } = useAuth();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const currentWeekday = useMemo(() => getWeekdayNumber(todayStr), [todayStr]);
  const currentParity = useMemo(
    () => getWeekParity(todayStr, userProfile?.settings?.parityAnchorDate),
    [todayStr, userProfile?.settings?.parityAnchorDate]
  );

  const [activeTab, setActiveTab] = useState<'today' | 'tasks' | 'timetable' | 'courses'>('today');

  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);

  // Task view mode: board or list
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list'>('board');

  // Modals state
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('homework');
  const [taskDue, setTaskDue] = useState(todayStr);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskEstMin, setTaskEstMin] = useState(45);

  // New course form state
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTeacher, setNewCourseTeacher] = useState('');

  // New timetable slot form state
  const [slotWeekday, setSlotWeekday] = useState<number>(currentWeekday);
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotCourseId, setSlotCourseId] = useState('');
  const [slotType, setSlotType] = useState<ClassType>('lecture');
  const [slotParity, setSlotParity] = useState<WeekParity>('every');
  const [slotRoom, setSlotRoom] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCourses(user.uid).then((res) => {
      if (res) {
        setCourses(res);
        if (res.length > 0 && !taskCourseId) {
          setTaskCourseId(res[0].id);
          setSlotCourseId(res[0].id);
        }
      }
    });
    getTimetable(user.uid).then((res) => {
      if (res) setTimetable(res);
    });
    getTasks(user.uid).then((res) => {
      if (res) setTasks(res);
    });
    getNotesForDate(user.uid, todayStr).then((res) => {
      if (res) setNotes(res);
    });
  }, [user, todayStr]);

  // Today's classes matching weekday and parity
  const todayClasses = useMemo(() => {
    return timetable.filter((slot) => {
      const matchDay = slot.weekday === currentWeekday;
      const matchParity = slot.weekParity === 'every' || slot.weekParity === currentParity;
      return matchDay && matchParity;
    });
  }, [timetable, currentWeekday, currentParity]);

  // Konspekt status lookup
  const isKonspektDone = (courseId: string) => {
    return Boolean(notes.find((n) => n.courseId === courseId && n.konspektDone));
  };

  const handleToggleKonspekt = async (courseId: string) => {
    if (!user) return;
    const current = isKonspektDone(courseId);
    await toggleKonspektNote(user.uid, courseId, todayStr, current);
    const updated = await getNotesForDate(user.uid, todayStr);
    if (updated) setNotes([...updated]);
  };

  // Add Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!user || !taskTitle.trim()) return;

    setSubmitting(true);
    try {
      const newTask = await addTask(user.uid, {
        title: taskTitle.trim(),
        courseId: taskCourseId || undefined,
        type: taskType,
        due: taskDue,
        status: 'todo',
        priority: taskPriority,
        estMinutes: Number(taskEstMin) || 30,
        createdAt: new Date().toISOString(),
      });

      setTasks((prev) => [...prev, newTask]);
      setTaskTitle('');
      setShowAddTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!user) return;
    await updateTaskStatus(user.uid, taskId, newStatus);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    await deleteTask(user.uid, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Add Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!user || !newCourseName.trim()) return;

    setSubmitting(true);
    try {
      const newC = await addCourse(user.uid, {
        name: newCourseName.trim(),
        code: newCourseCode.trim(),
        lectureTeacher: newCourseTeacher.trim(),
        seminarTeacher: newCourseTeacher.trim(),
      });

      setCourses((prev) => [...prev, newC]);
      setNewCourseName('');
      setNewCourseCode('');
      setNewCourseTeacher('');
      setShowAddCourse(false);
    } catch (err) {
      console.error('Failed to create course:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!user) return;
    await deleteCourse(user.uid, id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  // Add Timetable Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!user || !slotCourseId) return;

    setSubmitting(true);
    try {
      const newS = await addTimetableSlot(user.uid, {
        weekday: Number(slotWeekday),
        startTime: slotTime,
        courseId: slotCourseId,
        type: slotType,
        weekParity: slotParity,
        room: slotRoom.trim(),
      });

      setTimetable((prev) => [...prev, newS]);
      setSlotRoom('');
      setShowAddSlot(false);
    } catch (err) {
      console.error('Failed to create slot:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!user) return;
    await deleteTimetableSlot(user.uid, id);
    setTimetable((prev) => prev.filter((s) => s.id !== id));
  };

  const getCourseName = (id?: string) => {
    if (!id) return '';
    return courses.find((c) => c.id === id)?.name || id;
  };

  const weekdaysList = [
    { num: 1, name: language === 'uz' ? 'Dushanba' : 'Monday' },
    { num: 2, name: language === 'uz' ? 'Seshanba' : 'Tuesday' },
    { num: 3, name: language === 'uz' ? 'Chorshanba' : 'Wednesday' },
    { num: 4, name: language === 'uz' ? 'Payshanba' : 'Thursday' },
    { num: 5, name: language === 'uz' ? 'Juma' : 'Friday' },
    { num: 6, name: language === 'uz' ? 'Shanba' : 'Saturday' },
    { num: 7, name: language === 'uz' ? 'Yakshanba' : 'Sunday' },
  ];

  return (
    <ProGate
      feature="study"
      featureTitle={t('studyTitle', language)}
      featureDesc={language === 'uz' ? 'Universitet dars jadvali, juft/toq hafta pariteti, konspektlar va topshiriqlar Pro tarifida ochiladi.' : 'Student timetable with numerator/denominator parity, assignments, and lecture notes tracker.'}
    >
      <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Header Banner & Week Parity Badge */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t('studyTitle', language)}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDateDisplay(todayStr, language)} · {weekdaysList.find((w) => w.num === currentWeekday)?.name}
            </p>
          </div>

          {/* Week Parity Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                currentParity === 'even'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{currentParity === 'even' ? t('evenWeekBadge', language) : t('oddWeekBadge', language)}</span>
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-5 flex items-center rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950 overflow-x-auto">
          {[
            { id: 'today', label: t('todayClassesHeading', language) },
            { id: 'tasks', label: t('tasksHeading', language) },
            { id: 'timetable', label: t('timetableHeading', language) },
            { id: 'courses', label: t('coursesHeading', language) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tap-target flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap text-center ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. TAB: TODAY'S CLASSES & KONSPEKT CHECK-IN */}
      {activeTab === 'today' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('todayClassesHeading', language)} ({todayClasses.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Parity: <strong className="text-blue-600 dark:text-blue-400 capitalize">{currentParity}</strong>
            </span>
          </div>

          {todayClasses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-slate-900">
              <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('noClassesToday', language)}
              </p>
            </div>
          ) : (
            todayClasses.map((cls) => {
              const done = isKonspektDone(cls.courseId);
              return (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[10px] px-2 py-0.5 uppercase">
                        {cls.type}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {cls.startTime}
                      </span>
                      {cls.room && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cls.room}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {getCourseName(cls.courseId)}
                    </h3>
                  </div>

                  {/* One-tap "Konspekt qilindi" Toggle */}
                  <button
                    onClick={() => handleToggleKonspekt(cls.courseId)}
                    className={`tap-target shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      done
                        ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {done ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>{t('konspektDoneBtn', language)}</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 text-slate-400" />
                        <span>{t('konspektPending', language)}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. TAB: ASSIGNMENTS & TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* View Switcher: Board vs List */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => setTaskViewMode('board')}
                className={`tap-target flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  taskViewMode === 'board'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>{t('boardView', language)}</span>
              </button>
              <button
                onClick={() => setTaskViewMode('list')}
                className={`tap-target flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  taskViewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>{t('listView', language)}</span>
              </button>
            </div>

            <button
              onClick={() => setShowAddTask(true)}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addTaskBtn', language)}</span>
            </button>
          </div>

          {/* Board View */}
          {taskViewMode === 'board' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['todo', 'doing', 'done'] as TaskStatus[]).map((colStatus) => {
                const colTasks = tasks.filter((t) => t.status === colStatus);
                const colLabels = {
                  todo: t('taskStatusTodo', language),
                  doing: t('taskStatusDoing', language),
                  done: t('taskStatusDone', language),
                };

                return (
                  <div
                    key={colStatus}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2.5 min-h-[160px]"
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {colLabels[colStatus]}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {colTasks.map((task) => {
                        const daysRemaining = daysUntil(task.due, todayStr);
                        const isDueSoon = daysRemaining <= 3 && task.status !== 'done';

                        return (
                          <div
                            key={task.id}
                            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {task.title}
                              </p>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="tap-target text-slate-300 hover:text-rose-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            {task.courseId && (
                              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                {getCourseName(task.courseId)}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                              {/* Due alert */}
                              <span
                                className={`font-bold flex items-center gap-0.5 ${
                                  isDueSoon
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {isDueSoon && <AlertCircle className="h-3 w-3" />}
                                <span>{task.due}</span>
                              </span>

                              {/* Quick Move Status Buttons */}
                              <div className="flex items-center gap-1">
                                {colStatus !== 'todo' && (
                                  <button
                                    onClick={() => handleStatusChange(task.id, 'todo')}
                                    className="tap-target px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                  >
                                    ←
                                  </button>
                                )}
                                {colStatus !== 'doing' && (
                                  <button
                                    onClick={() => handleStatusChange(task.id, 'doing')}
                                    className="tap-target px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  >
                                    doing
                                  </button>
                                )}
                                {colStatus !== 'done' && (
                                  <button
                                    onClick={() => handleStatusChange(task.id, 'done')}
                                    className="tap-target px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  >
                                    ✓
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Sorted by Due Date */
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {[...tasks]
                .sort((a, b) => a.due.localeCompare(b.due))
                .map((task) => {
                  const daysRemaining = daysUntil(task.due, todayStr);
                  const isDueSoon = daysRemaining <= 3 && task.status !== 'done';

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              task.priority === 'high'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {task.due}
                          </span>
                          {isDueSoon && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              <AlertCircle className="h-3 w-3" />
                              {t('dueSoonBadge', language)}
                            </span>
                          )}
                        </div>

                        <p className={`text-sm font-bold text-slate-900 dark:text-white ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleStatusChange(
                              task.id,
                              task.status === 'done' ? 'todo' : 'done'
                            )
                          }
                          className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold ${
                            task.status === 'done'
                              ? 'bg-emerald-500 text-white'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {task.status}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="tap-target text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB: WEEKLY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('timetableHeading', language)}
            </h2>
            <button
              onClick={() => setShowAddSlot(true)}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addSlotBtn', language)}</span>
            </button>
          </div>

          <div className="space-y-3">
            {weekdaysList.map((day) => {
              const daySlots = timetable.filter((s) => s.weekday === day.num);
              return (
                <div
                  key={day.num}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900"
                >
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                    <span>{day.name}</span>
                    <span className="text-[10px] text-slate-400">{daySlots.length} dars</span>
                  </h3>

                  {daySlots.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Darslar yo'q</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {slot.startTime}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                                {slot.type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({slot.weekParity})
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                              {getCourseName(slot.courseId)} {slot.room && `· ${slot.room}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="tap-target text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB: COURSES */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('coursesHeading', language)}
            </h2>
            <button
              onClick={() => setShowAddCourse(true)}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addCourseBtn', language)}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {courses.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Hali fanlar kiritilmagan.</p>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {course.name}
                      </span>
                      {course.code && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {course.code}
                        </span>
                      )}
                    </div>
                    {course.lectureTeacher && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {course.lectureTeacher}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="tap-target text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('addTaskBtn', language)}
              </h3>
              <button onClick={() => setShowAddTask(false)} className="tap-target text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('taskTitleLabel', language)}
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Lab 4 practical report"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('coursesHeading', language)}
                  </label>
                  <select
                    value={taskCourseId}
                    onChange={(e) => setTaskCourseId(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">(None)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('taskDueLabel', language)}
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('taskPriorityLabel', language)}
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="high">{t('priorityHigh', language)}</option>
                    <option value="medium">{t('priorityMedium', language)}</option>
                    <option value="low">{t('priorityLow', language)}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Vaqti (daq)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={taskEstMin}
                    onChange={(e) => setTaskEstMin(Number(e.target.value))}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="tap-target px-3 py-1.5 text-xs text-slate-500"
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="submit"
                  className="tap-target rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {t('saveChanges', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('addCourseBtn', language)}
              </h3>
              <button onClick={() => setShowAddCourse(false)} className="tap-target text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('courseNameLabel', language)}
                </label>
                <input
                  type="text"
                  required
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. Matematik Analiz"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('courseCodeLabel', language)}
                </label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="e.g. MATH201"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('teacherLabel', language)}
                </label>
                <input
                  type="text"
                  value={newCourseTeacher}
                  onChange={(e) => setNewCourseTeacher(e.target.value)}
                  placeholder="e.g. Prof. Karimov"
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="tap-target px-3 py-1.5 text-xs text-slate-500"
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="submit"
                  className="tap-target rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {t('saveChanges', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('addSlotBtn', language)}
              </h3>
              <button onClick={() => setShowAddSlot(false)} className="tap-target text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('weekdayLabel', language)}
                </label>
                <select
                  value={slotWeekday}
                  onChange={(e) => setSlotWeekday(Number(e.target.value))}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {weekdaysList.map((d) => (
                    <option key={d.num} value={d.num}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {t('coursesHeading', language)}
                </label>
                <select
                  required
                  value={slotCourseId}
                  onChange={(e) => setSlotCourseId(e.target.value)}
                  className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Tanlang...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('timeLabel', language)}
                  </label>
                  <input
                    type="time"
                    required
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Turi
                  </label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value as any)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="lecture">Lecture (Ma'ruza)</option>
                    <option value="seminar">Seminar (Amaliyot)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Paritet
                  </label>
                  <select
                    value={slotParity}
                    onChange={(e) => setSlotParity(e.target.value as any)}
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="every">{t('parityEvery', language)}</option>
                    <option value="even">{t('parityEven', language)}</option>
                    <option value="odd">{t('parityOdd', language)}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {t('roomLabel', language)}
                  </label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="304-xona"
                    className="tap-target w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="tap-target px-3 py-1.5 text-xs text-slate-500"
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="submit"
                  className="tap-target rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {t('saveChanges', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </ProGate>
  );
};
