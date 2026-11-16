import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Bell,
} from 'lucide-react';
import {
  DayMateState,
  NavSection,
  TaskCategory,
  TaskItem,
  TaskPriority,
  WeekDay,
} from '../types/daymate';
import {
  calculateAttendanceInsight,
  calculateHabitStreak,
  daysUntil,
  formatReadableDate,
  formatTime12h,
  toLocalDateString,
  uid,
} from '../utils/storage';

interface DashboardViewProps {
  state: DayMateState;
  onNavigate: (section: NavSection) => void;
  onAddTask: (task: TaskItem) => void;
  onToggleTask: (taskId: string) => void;
  onToggleHabitToday: (habitId: string) => void;
  onUpdateScratchpad: (text: string) => void;
}

const WEEK_DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigate,
  onAddTask,
  onToggleTask,
  onToggleHabitToday,
  onUpdateScratchpad,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSubject, setQuickSubject] = useState('CSA3426 Frontend Using JS');
  const [quickDueDate, setQuickDueDate] = useState(toLocalDateString());
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('Medium');
  const [quickError, setQuickError] = useState('');
  const [reminderNotice, setReminderNotice] = useState('');

  const todayStr = toLocalDateString();
  const jsDay = new Date().getDay();
  const activeWeekday: WeekDay = jsDay >= 1 && jsDay <= 6 ? WEEK_DAYS[jsDay - 1] : 'Mon';
  const isSunday = jsDay === 0;

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = state.tasks.filter((t) => !t.completed && t.dueDate && daysUntil(t.dueDate) < 0);
  const dueTodayTasks = state.tasks.filter((t) => !t.completed && t.dueDate === todayStr);

  const totalAttended = state.attendance.reduce((sum, s) => sum + s.attended, 0);
  const totalClasses = state.attendance.reduce((sum, s) => sum + s.total, 0);
  const overallAttendancePct = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : '100.0';

  const lowAttendanceSubjects = state.attendance
    .map((s) => ({ subject: s, insight: calculateAttendanceInsight(s) }))
    .filter((item) => item.insight.percentage < item.subject.targetPercent);

  const todayClasses = state.timetable
    .filter((slot) => slot.day === activeWeekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingExams = [...state.exams]
    .filter((ex) => daysUntil(ex.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0];

  const weeklyFocusMinutes = state.studySessions
    .filter((s) => Date.now() - new Date(s.completedAt).getTime() <= 7 * 86400000)
    .reduce((acc, s) => acc + s.minutes, 0);

  const urgentTasks = [...state.tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const pOrder: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };
      if (a.dueDate !== b.dueDate) return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
      return pOrder[a.priority] - pOrder[b.priority];
    })
    .slice(0, 5);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setQuickError('Task title cannot be blank.');
      return;
    }
    setQuickError('');
    onAddTask({
      id: uid('tsk'),
      title: trimmed,
      subject: quickSubject.trim() || 'General',
      dueDate: quickDueDate || todayStr,
      priority: quickPriority,
      category: 'Assignment' as TaskCategory,
      status: 'todo',
      completed: false,
      estimatedMinutes: 30,
      subtasks: [],
      createdAt: todayStr,
    });
    setQuickTitle('');
  };

  const handleSendBrowserReminder = async () => {
    if (!('Notification' in window)) {
      setReminderNotice(
        `Summary: ${dueTodayTasks.length} due today, ${overdueTasks.length} overdue, ${lowAttendanceSubjects.length} attendance alerts.`,
      );
      return;
    }
    const perm =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    const msg = `${dueTodayTasks.length} task(s) due today · ${overdueTasks.length} overdue · ${
      nextExam ? `Next exam in ${daysUntil(nextExam.date)}d` : 'No upcoming exams'
    }`;
    if (perm === 'granted') {
      new Notification('Student DayMate Reminder', { body: msg });
      setReminderNotice('Browser reminder dispatched.');
    } else {
      setReminderNotice(`In-app reminder: ${msg}`);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Editorial Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {state.profile.semester} · {state.profile.college}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            {greeting}, {state.profile.name.split(' ')[0]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleSendBrowserReminder}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Trigger Due-Today Reminder</span>
          </button>
        </div>
      </div>

      {reminderNotice && (
        <div className="px-4 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300">
          {reminderNotice}
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="text-left p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Pending Tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {pendingTasks}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              of {totalTasks} total
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {overdueTasks.length > 0 ? (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {overdueTasks.length} overdue deadline{overdueTasks.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span>{completedTasks} completed this cycle</span>
            )}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="text-left p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Overall Attendance</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {overallAttendancePct}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {totalAttended}/{totalClasses} classes
            </span>
          </div>
          <p className="mt-2 text-xs">
            {lowAttendanceSubjects.length > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {lowAttendanceSubjects.length} subject{lowAttendanceSubjects.length > 1 ? 's' : ''} below 75%
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                All subjects meet target
              </span>
            )}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('exams')}
          className="text-left p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Next Examination</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {nextExam ? `${daysUntil(nextExam.date)}d` : '—'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {nextExam ? nextExam.subjectCode : 'None scheduled'}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 truncate">
            {nextExam ? `${nextExam.subjectName} · ${nextExam.examType}` : 'Add an exam in Exam Planner'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('study')}
          className="text-left p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>7-Day Focus Time</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {(weeklyFocusMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {weeklyFocusMinutes} min
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {state.notes.length} notes · {state.vivaQuestions.length} viva Q&amp;As
          </p>
        </button>
      </div>

      {/* Quick Capture Task Strip */}
      <form
        onSubmit={handleQuickSubmit}
        className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
        noValidate
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Add Task</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {state.profile.authProvider === 'google' ? 'Syncs with Google Cloud & localStorage' : 'Saves to localStorage'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => {
              setQuickTitle(e.target.value);
              if (quickError) setQuickError('');
            }}
            placeholder="e.g., Complete JavaScript DOM lab assignment..."
            className="md:col-span-5 px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
          />
          <input
            type="text"
            value={quickSubject}
            onChange={(e) => setQuickSubject(e.target.value)}
            placeholder="Subject"
            className="md:col-span-3 px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
          />
          <input
            type="date"
            value={quickDueDate}
            onChange={(e) => setQuickDueDate(e.target.value)}
            className="md:col-span-2 px-3 py-2 text-sm font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
          />
          <div className="md:col-span-2 flex gap-2">
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              aria-label="Priority"
              className="w-full px-2.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
        {quickError && (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {quickError}
          </p>
        )}
      </form>

      {/* Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Priority Deadlines
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                View all tasks
              </button>
            </div>
            {urgentTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                All tasks are complete. Add a new assignment above to stay ahead.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {urgentTasks.map((task) => {
                  const diff = task.dueDate ? daysUntil(task.dueDate) : 99;
                  return (
                    <li
                      key={task.id}
                      className="px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                        aria-label={`Mark ${task.title} complete`}
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{task.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'High'
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : task.priority === 'Medium'
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : 'text-zinc-500 dark:text-zinc-400'
                            }
                          >
                            {task.priority} Priority
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            diff < 0
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : diff === 0
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {diff < 0
                            ? `${Math.abs(diff)}d overdue`
                            : diff === 0
                              ? 'Due today'
                              : formatReadableDate(task.dueDate)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {isSunday ? "Monday's Upcoming Classes" : `Today's Classes (${activeWeekday})`}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Full timetable
              </button>
            </div>
            {todayClasses.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No classes scheduled for {activeWeekday}.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {todayClasses.map((slot) => (
                  <li key={slot.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-28 shrink-0 font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatTime12h(slot.startTime)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {slot.subjectCode} — {slot.subjectName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {slot.faculty} · {slot.room} · {slot.classType}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Today's Time-Block Preview */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Daily Study Time-Blocks
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('campus')}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Edit schedule
              </button>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {[...state.timeBlocks]
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .slice(0, 4)
                .map((blk) => (
                  <li key={blk.id} className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <span className="font-mono tabular-nums text-zinc-500">
                      {formatTime12h(blk.startTime)} – {formatTime12h(blk.endTime)}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                      {blk.title}
                    </span>
                    <span className="text-zinc-500">{blk.category}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Attendance Status
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Manage
              </button>
            </div>
            <div className="space-y-3">
              {state.attendance.map((sub) => {
                const insight = calculateAttendanceInsight(sub);
                return (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {sub.code} · {sub.name}
                      </span>
                      <span className="font-mono tabular-nums shrink-0 flex items-center gap-1.5">
                        {insight.status === 'Shortage' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span
                          className={
                            insight.status === 'Shortage'
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : insight.status === 'Borderline'
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-zinc-900 dark:text-zinc-100 font-semibold'
                          }
                        >
                          {insight.percentage}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          insight.status === 'Shortage'
                            ? 'bg-red-600 dark:bg-red-500'
                            : insight.status === 'Borderline'
                              ? 'bg-amber-500'
                              : 'bg-zinc-900 dark:bg-zinc-100'
                        }`}
                        style={{ width: `${Math.min(100, insight.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Today&apos;s Habits
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('campus')}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                All habits
              </button>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {state.habits.map((habit) => {
                const doneToday = habit.completedDates.includes(todayStr);
                const streak = calculateHabitStreak(habit.completedDates);
                return (
                  <li key={habit.id} className="py-2.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleHabitToday(habit.id)}
                      className="flex items-center gap-2.5 text-left min-w-0"
                    >
                      {doneToday ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm truncate ${
                          doneToday
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </button>
                    <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                      {streak}d streak
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Quick Scratchpad
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Auto-saved</span>
            </div>
            <textarea
              value={state.scratchpad}
              onChange={(e) => onUpdateScratchpad(e.target.value)}
              rows={5}
              placeholder="Jot down formulas, reminders, or lecture ideas..."
              className="w-full p-3 text-xs font-mono leading-relaxed bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200 resize-y"
            />
          </section>
        </div>
      </div>
    </div>
  );
};
