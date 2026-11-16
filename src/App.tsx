import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  UserCheck,
  BookOpen,
  GraduationCap,
  BarChart3,
  Wallet,
  Settings,
  Search,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createSeedState } from './data/seedData';
import { DayMateState, NavSection, StudentProfile } from './types/daymate';
import { loadState, saveState, toLocalDateString } from './utils/storage';
import {
  auth,
  loadWorkspaceFromCloud,
  saveWorkspaceToCloud,
  signOutFirebase,
} from './services/firebase';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { TimetableView } from './components/TimetableView';
import { AttendanceView } from './components/AttendanceView';
import { StudyStudioView } from './components/StudyStudioView';
import { ExamsView } from './components/ExamsView';
import { GradesProgressView } from './components/GradesProgressView';
import { CampusLifeView } from './components/CampusLifeView';
import { SettingsReportView } from './components/SettingsReportView';
import { CommandModal } from './components/CommandModal';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks & Assignments', icon: CheckSquare },
  { id: 'timetable', label: 'Timetable & Calendar', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance (75%)', icon: UserCheck },
  { id: 'study', label: 'Study Studio', icon: BookOpen },
  { id: 'exams', label: 'Exam Planner', icon: GraduationCap },
  { id: 'progress', label: 'Progress & SGPA', icon: BarChart3 },
  { id: 'campus', label: 'Campus Life', icon: Wallet },
  { id: 'settings', label: 'Settings & Report', icon: Settings },
];

export default function App() {
  const [state, setState] = useState<DayMateState>(() => loadState(createSeedState()));
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Firebase Auth tracking
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const skipNextCloudSyncRef = useRef(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        try {
          setCloudSyncStatus('syncing');
          const cloudData = await loadWorkspaceFromCloud(user, loadState(createSeedState()));
          if (cloudData) {
            skipNextCloudSyncRef.current = true;
            setState(cloudData);
          } else {
            // Seed initial cloud workspace for first-time Google user
            const seed = createSeedState();
            const initialForUser: DayMateState = {
              ...seed,
              isAuthenticated: true,
              profile: {
                ...seed.profile,
                id: user.uid,
                name: user.displayName || seed.profile.name,
                email: user.email || seed.profile.email,
                photoURL: user.photoURL || undefined,
                authProvider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
              },
            };
            skipNextCloudSyncRef.current = true;
            setState(initialForUser);
            await saveWorkspaceToCloud(user, initialForUser);
          }
          setCloudSyncStatus('synced');
        } catch {
          setCloudSyncStatus('error');
        }
      }
    });
    return () => unsub();
  }, []);

  // Persist every state mutation to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Debounced auto-sync to Firestore whenever authenticated via Firebase
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !state.isAuthenticated) return undefined;
    if (skipNextCloudSyncRef.current) {
      skipNextCloudSyncRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        setCloudSyncStatus('syncing');
        await saveWorkspaceToCloud(firebaseUser, state);
        setCloudSyncStatus('synced');
      } catch {
        setCloudSyncStatus('error');
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [state, firebaseUser]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  // Global Cmd/Ctrl + K search shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleFirebaseAuthSuccess = useCallback(
    async (user: User, extraProfile?: Partial<StudentProfile>) => {
      setFirebaseUser(user);
      if (user.emailVerified) {
        try {
          setCloudSyncStatus('syncing');
          const cloudData = await loadWorkspaceFromCloud(user, state);
          if (cloudData) {
            skipNextCloudSyncRef.current = true;
            setState(cloudData);
            setCloudSyncStatus('synced');
            return;
          }
        } catch {
          setCloudSyncStatus('error');
        }
      }
      const base = createSeedState();
      const nextState: DayMateState = {
        ...base,
        isAuthenticated: true,
        profile: {
          ...base.profile,
          ...extraProfile,
          id: user.uid,
          name: extraProfile?.name || user.displayName || base.profile.name,
          email: extraProfile?.email || user.email || base.profile.email,
          photoURL: user.photoURL || undefined,
          authProvider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
        },
      };
      setState(nextState);
      if (user.emailVerified) {
        try {
          await saveWorkspaceToCloud(user, nextState);
          setCloudSyncStatus('synced');
        } catch {
          setCloudSyncStatus('error');
        }
      }
    },
    [state],
  );

  const handleSignOut = async () => {
    try {
      if (firebaseUser) {
        await signOutFirebase();
      }
    } catch {
      // Ignore Firebase signout errors
    }
    setFirebaseUser(null);
    setCloudSyncStatus('idle');
    setState((prev) => ({ ...prev, isAuthenticated: false }));
  };

  if (!state.isAuthenticated) {
    return (
      <AuthScreen
        accounts={state.accounts}
        onLocalLogin={(profile) =>
          setState((prev) => ({
            ...prev,
            profile,
            isAuthenticated: true,
          }))
        }
        onLocalRegister={(newProfile) =>
          setState((prev) => ({
            ...prev,
            profile: newProfile,
            accounts: [...prev.accounts, newProfile],
            isAuthenticated: true,
          }))
        }
        onFirebaseAuthSuccess={handleFirebaseAuthSuccess}
      />
    );
  }

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeSection) || NAV_ITEMS[0];
  const pendingCount = state.tasks.filter((t) => !t.completed).length;

  const initials = state.profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const handleNavigate = (sec: NavSection) => {
    setActiveSection(sec);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap"
          >
            Student DayMate
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 text-zinc-500 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Primary Workspace">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'tasks' && pendingCount > 0 && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Student Identity Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
          >
            {state.profile.photoURL ? (
              <img
                src={state.profile.photoURL}
                alt={state.profile.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">
                {initials || 'ST'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {state.profile.name}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                {firebaseUser?.email || state.profile.rollNumber}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 sm:px-8 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              <span className="hidden sm:inline">Student DayMate</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Search</span>
              <span className="hidden md:inline font-mono text-[10px] text-zinc-400">Ctrl K</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }))
              }
              aria-label={`Switch to ${state.theme === 'light' ? 'dark' : 'light'} theme`}
              className="p-2 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {state.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1280px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              state={state}
              onNavigate={handleNavigate}
              onAddTask={(task) => setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }))}
              onToggleTask={(taskId) =>
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.map((t) =>
                    t.id === taskId
                      ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' }
                      : t,
                  ),
                }))
              }
              onToggleHabitToday={(habitId) => {
                const todayStr = toLocalDateString();
                setState((prev) => ({
                  ...prev,
                  habits: prev.habits.map((h) => {
                    if (h.id !== habitId) return h;
                    const exists = h.completedDates.includes(todayStr);
                    return {
                      ...h,
                      completedDates: exists
                        ? h.completedDates.filter((d) => d !== todayStr)
                        : [...h.completedDates, todayStr],
                    };
                  }),
                }));
              }}
              onUpdateScratchpad={(text) => setState((prev) => ({ ...prev, scratchpad: text }))}
            />
          )}

          {activeSection === 'tasks' && (
            <TasksView
              tasks={state.tasks}
              milestones={state.milestones}
              onAddTask={(task) => setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }))}
              onUpdateTask={(updated) =>
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
                }))
              }
              onDeleteTask={(id) =>
                setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
              }
              onClearCompleted={() =>
                setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => !t.completed) }))
              }
              onAddMilestone={(ms) =>
                setState((prev) => ({ ...prev, milestones: [...prev.milestones, ms] }))
              }
              onToggleMilestone={(id) =>
                setState((prev) => ({
                  ...prev,
                  milestones: prev.milestones.map((m) =>
                    m.id === id ? { ...m, completed: !m.completed } : m,
                  ),
                }))
              }
              onDeleteMilestone={(id) =>
                setState((prev) => ({
                  ...prev,
                  milestones: prev.milestones.filter((m) => m.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'timetable' && (
            <TimetableView
              timetable={state.timetable}
              tasks={state.tasks}
              exams={state.exams}
              calendarEvents={state.calendarEvents}
              onAddSlot={(slot) => setState((prev) => ({ ...prev, timetable: [...prev.timetable, slot] }))}
              onUpdateSlot={(updated) =>
                setState((prev) => ({
                  ...prev,
                  timetable: prev.timetable.map((s) => (s.id === updated.id ? updated : s)),
                }))
              }
              onDeleteSlot={(id) =>
                setState((prev) => ({ ...prev, timetable: prev.timetable.filter((s) => s.id !== id) }))
              }
              onAddEvent={(ev) =>
                setState((prev) => ({ ...prev, calendarEvents: [...prev.calendarEvents, ev] }))
              }
              onDeleteEvent={(id) =>
                setState((prev) => ({
                  ...prev,
                  calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'attendance' && (
            <AttendanceView
              subjects={state.attendance}
              onAddSubject={(sub) =>
                setState((prev) => ({ ...prev, attendance: [...prev.attendance, sub] }))
              }
              onUpdateSubject={(updated) =>
                setState((prev) => ({
                  ...prev,
                  attendance: prev.attendance.map((s) => (s.id === updated.id ? updated : s)),
                }))
              }
              onDeleteSubject={(id) =>
                setState((prev) => ({
                  ...prev,
                  attendance: prev.attendance.filter((s) => s.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'study' && (
            <StudyStudioView
              notes={state.notes}
              flashcards={state.flashcards}
              sessions={state.studySessions}
              vivaQuestions={state.vivaQuestions}
              onAddNote={(note) => setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }))}
              onUpdateNote={(updated) =>
                setState((prev) => ({
                  ...prev,
                  notes: prev.notes.map((n) => (n.id === updated.id ? updated : n)),
                }))
              }
              onDeleteNote={(id) =>
                setState((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }))
              }
              onAddFlashcard={(card) =>
                setState((prev) => ({ ...prev, flashcards: [...prev.flashcards, card] }))
              }
              onUpdateFlashcard={(updated) =>
                setState((prev) => ({
                  ...prev,
                  flashcards: prev.flashcards.map((c) => (c.id === updated.id ? updated : c)),
                }))
              }
              onDeleteFlashcard={(id) =>
                setState((prev) => ({
                  ...prev,
                  flashcards: prev.flashcards.filter((c) => c.id !== id),
                }))
              }
              onLogSession={(session) =>
                setState((prev) => ({ ...prev, studySessions: [...prev.studySessions, session] }))
              }
              onAddViva={(q) =>
                setState((prev) => ({ ...prev, vivaQuestions: [...prev.vivaQuestions, q] }))
              }
              onToggleVivaConfident={(id) =>
                setState((prev) => ({
                  ...prev,
                  vivaQuestions: prev.vivaQuestions.map((v) =>
                    v.id === id ? { ...v, confident: !v.confident } : v,
                  ),
                }))
              }
              onDeleteViva={(id) =>
                setState((prev) => ({
                  ...prev,
                  vivaQuestions: prev.vivaQuestions.filter((v) => v.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'exams' && (
            <ExamsView
              exams={state.exams}
              onAddExam={(exam) => setState((prev) => ({ ...prev, exams: [...prev.exams, exam] }))}
              onUpdateExam={(updated) =>
                setState((prev) => ({
                  ...prev,
                  exams: prev.exams.map((ex) => (ex.id === updated.id ? updated : ex)),
                }))
              }
              onDeleteExam={(id) =>
                setState((prev) => ({ ...prev, exams: prev.exams.filter((ex) => ex.id !== id) }))
              }
            />
          )}

          {activeSection === 'progress' && (
            <GradesProgressView
              state={state}
              onAddGpaCourse={(course) =>
                setState((prev) => ({ ...prev, gpaCourses: [...prev.gpaCourses, course] }))
              }
              onUpdateGpaCourse={(updated) =>
                setState((prev) => ({
                  ...prev,
                  gpaCourses: prev.gpaCourses.map((c) => (c.id === updated.id ? updated : c)),
                }))
              }
              onDeleteGpaCourse={(id) =>
                setState((prev) => ({
                  ...prev,
                  gpaCourses: prev.gpaCourses.filter((c) => c.id !== id),
                }))
              }
              onUpdatePrevGpa={(credits, cgpa) =>
                setState((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, previousCredits: credits, previousCgpa: cgpa },
                }))
              }
              onAddAssessment={(item) =>
                setState((prev) => ({ ...prev, assessments: [...prev.assessments, item] }))
              }
              onUpdateAssessment={(updated) =>
                setState((prev) => ({
                  ...prev,
                  assessments: prev.assessments.map((a) => (a.id === updated.id ? updated : a)),
                }))
              }
              onDeleteAssessment={(id) =>
                setState((prev) => ({
                  ...prev,
                  assessments: prev.assessments.filter((a) => a.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'campus' && (
            <CampusLifeView
              state={state}
              onAddExpense={(exp) =>
                setState((prev) => ({ ...prev, expenses: [exp, ...prev.expenses] }))
              }
              onDeleteExpense={(id) =>
                setState((prev) => ({
                  ...prev,
                  expenses: prev.expenses.filter((e) => e.id !== id),
                }))
              }
              onUpdateBudget={(amount) =>
                setState((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, monthlyBudget: amount },
                }))
              }
              onAddHabit={(habit) =>
                setState((prev) => ({ ...prev, habits: [...prev.habits, habit] }))
              }
              onToggleHabitDate={(habitId, dateStr) =>
                setState((prev) => ({
                  ...prev,
                  habits: prev.habits.map((h) => {
                    if (h.id !== habitId) return h;
                    const exists = h.completedDates.includes(dateStr);
                    return {
                      ...h,
                      completedDates: exists
                        ? h.completedDates.filter((d) => d !== dateStr)
                        : [...h.completedDates, dateStr],
                    };
                  }),
                }))
              }
              onDeleteHabit={(id) =>
                setState((prev) => ({
                  ...prev,
                  habits: prev.habits.filter((h) => h.id !== id),
                }))
              }
              onAddBookmark={(bm) =>
                setState((prev) => ({ ...prev, bookmarks: [...prev.bookmarks, bm] }))
              }
              onDeleteBookmark={(id) =>
                setState((prev) => ({
                  ...prev,
                  bookmarks: prev.bookmarks.filter((b) => b.id !== id),
                }))
              }
              onAddTimeBlock={(tb) =>
                setState((prev) => ({ ...prev, timeBlocks: [...prev.timeBlocks, tb] }))
              }
              onDeleteTimeBlock={(id) =>
                setState((prev) => ({
                  ...prev,
                  timeBlocks: prev.timeBlocks.filter((t) => t.id !== id),
                }))
              }
              onAddContact={(c) =>
                setState((prev) => ({ ...prev, contacts: [...prev.contacts, c] }))
              }
              onDeleteContact={(id) =>
                setState((prev) => ({
                  ...prev,
                  contacts: prev.contacts.filter((c) => c.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'settings' && (
            <SettingsReportView
              state={state}
              cloudUserEmail={firebaseUser?.email || null}
              cloudSyncStatus={cloudSyncStatus}
              onManualCloudSync={async () => {
                if (!firebaseUser) return;
                try {
                  setCloudSyncStatus('syncing');
                  await saveWorkspaceToCloud(firebaseUser, state);
                  setCloudSyncStatus('synced');
                } catch {
                  setCloudSyncStatus('error');
                }
              }}
              onUpdateProfile={(profile) =>
                setState((prev) => ({
                  ...prev,
                  profile,
                  accounts: prev.accounts.map((a) => (a.id === profile.id ? profile : a)),
                }))
              }
              onImportState={(imported) =>
                setState((prev) => ({ ...prev, ...imported, isAuthenticated: true }))
              }
              onResetDemo={() => setState({ ...createSeedState(), isAuthenticated: true })}
              onClearAll={() =>
                setState((prev) => ({
                  ...prev,
                  scratchpad: '',
                  tasks: [],
                  timetable: [],
                  calendarEvents: [],
                  attendance: [],
                  notes: [],
                  flashcards: [],
                  studySessions: [],
                  exams: [],
                  gpaCourses: [],
                  habits: [],
                  expenses: [],
                  bookmarks: [],
                  assessments: [],
                  vivaQuestions: [],
                  contacts: [],
                  milestones: [],
                  timeBlocks: [],
                }))
              }
              onSignOut={handleSignOut}
            />
          )}
        </main>
      </div>

      <CommandModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        state={state}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
