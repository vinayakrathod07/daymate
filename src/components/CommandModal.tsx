import React, { useMemo, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { DayMateState, NavSection } from '../types/daymate';

interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DayMateState;
  onNavigate: (section: NavSection) => void;
}

const SECTION_COMMANDS: Array<{ id: NavSection; label: string; hint: string }> = [
  { id: 'dashboard', label: 'Dashboard Overview', hint: 'KPIs, today classes, urgent tasks' },
  { id: 'tasks', label: 'Tasks & Assignments', hint: 'List, Kanban board, subtasks, CSV' },
  { id: 'timetable', label: 'Timetable & Calendar', hint: 'Mon–Sat classes & monthly deadlines' },
  { id: 'attendance', label: 'Attendance Tracker', hint: '75% safe-skip & recovery calculator' },
  { id: 'study', label: 'Study Studio', hint: 'Pomodoro timer, notes & flashcards' },
  { id: 'exams', label: 'Exam Planner', hint: 'Countdowns, syllabus & target marks' },
  { id: 'progress', label: 'Progress & SGPA Calculator', hint: 'Analytics & CBCS GPA calculator' },
  { id: 'campus', label: 'Campus Life', hint: 'Expenses, 7-day habits & bookmarks' },
  { id: 'settings', label: 'Settings & Project Report', hint: 'Profile, JSON backup & CSA3426 summary' },
];

export const CommandModal: React.FC<CommandModalProps> = ({ isOpen, onClose, state, onNavigate }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedSections = SECTION_COMMANDS.filter(
      (s) => !q || s.label.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q),
    );
    const matchedTasks = q
      ? state.tasks
          .filter((t) => `${t.title} ${t.subject}`.toLowerCase().includes(q))
          .slice(0, 4)
      : [];
    const matchedNotes = q
      ? state.notes
          .filter((n) => `${n.title} ${n.subject}`.toLowerCase().includes(q))
          .slice(0, 3)
      : [];
    const matchedExams = q
      ? state.exams
          .filter((e) => `${e.subjectCode} ${e.subjectName}`.toLowerCase().includes(q))
          .slice(0, 3)
      : [];
    return { matchedSections, matchedTasks, matchedNotes, matchedExams };
  }, [query, state]);

  if (!isOpen) return null;

  const jump = (section: NavSection) => {
    onNavigate(section);
    setQuery('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 sm:pt-24 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, notes, exams, or jump to module..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
          {results.matchedTasks.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[11px] font-medium text-zinc-400">Tasks</p>
              {results.matchedTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => jump('tasks')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.title}</span>
                  <span className="text-zinc-500 ml-3 shrink-0">{t.subject}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchedNotes.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[11px] font-medium text-zinc-400">Notes</p>
              {results.matchedNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => jump('study')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{n.title}</span>
                  <span className="text-zinc-500 ml-3 shrink-0">{n.subject}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchedExams.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[11px] font-medium text-zinc-400">Examinations</p>
              {results.matchedExams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => jump('exams')}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {ex.subjectCode} — {ex.subjectName}
                  </span>
                  <span className="text-zinc-500 font-mono ml-3 shrink-0">{ex.date}</span>
                </button>
              ))}
            </div>
          )}

          <div className="p-2">
            <p className="px-2 py-1 text-[11px] font-medium text-zinc-400">Workspace Modules</p>
            {results.matchedSections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => jump(sec.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{sec.label}</span>
                  <span className="ml-2 text-zinc-500">{sec.hint}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
