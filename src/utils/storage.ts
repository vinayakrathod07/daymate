import { DayMateState, GradeLetter, GpaCourse, SubjectAttendance, TaskItem } from '../types/daymate';

export const STORAGE_KEY = 'student_daymate_state_v1';

export const GRADE_POINTS: Record<GradeLetter, number> = {
  O: 10,
  'A+': 9,
  A: 8,
  'B+': 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(days: number, base: Date = new Date()): string {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return toLocalDateString(next);
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return 'No date';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export interface AttendanceInsight {
  percentage: number;
  status: 'Safe' | 'Borderline' | 'Shortage';
  canSkip: number;
  mustAttend: number;
  message: string;
}

export function calculateAttendanceInsight(subject: SubjectAttendance): AttendanceInsight {
  const { attended, total, targetPercent } = subject;
  const target = Math.max(1, Math.min(99, targetPercent || 75)) / 100;
  if (total <= 0) {
    return {
      percentage: 100,
      status: 'Safe',
      canSkip: 0,
      mustAttend: 0,
      message: 'No classes recorded yet.',
    };
  }

  const pct = (attended / total) * 100;

  if (pct >= target * 100) {
    // Max classes k that can be skipped while (attended / (total + k)) >= target
    const canSkip = Math.max(0, Math.floor(attended / target - total));
    const status = pct >= target * 100 + 5 ? 'Safe' : 'Borderline';
    return {
      percentage: Number(pct.toFixed(1)),
      status,
      canSkip,
      mustAttend: 0,
      message:
        canSkip > 0
          ? `Safe to skip up to ${canSkip} class${canSkip === 1 ? '' : 'es'} and stay at or above ${targetPercent}%.`
          : `Right on the ${targetPercent}% threshold. Attend the next class to build a buffer.`,
    };
  }

  // Min consecutive classes y needed so (attended + y) / (total + y) >= target
  // attended + y >= target * total + target * y => y * (1 - target) >= target * total - attended
  const mustAttend = Math.max(1, Math.ceil((target * total - attended) / (1 - target)));
  return {
    percentage: Number(pct.toFixed(1)),
    status: 'Shortage',
    canSkip: 0,
    mustAttend,
    message: `Attend the next ${mustAttend} class${mustAttend === 1 ? '' : 'es'} consecutively to recover ${targetPercent}%.`,
  };
}

export function calculateSGPA(courses: GpaCourse[]): { sgpa: number; totalCredits: number; earnedPoints: number } {
  const valid = courses.filter((c) => c.credits > 0);
  const totalCredits = valid.reduce((acc, c) => acc + c.credits, 0);
  const earnedPoints = valid.reduce((acc, c) => acc + c.credits * GRADE_POINTS[c.grade], 0);
  const sgpa = totalCredits > 0 ? Number((earnedPoints / totalCredits).toFixed(2)) : 0;
  return { sgpa, totalCredits, earnedPoints };
}

export function calculateCGPA(
  previousCgpa: number,
  previousCredits: number,
  currentCourses: GpaCourse[],
): number {
  const { totalCredits, earnedPoints } = calculateSGPA(currentCourses);
  const combinedCredits = Math.max(0, previousCredits) + totalCredits;
  if (combinedCredits <= 0) return 0;
  const totalPoints = Math.max(0, previousCredits) * Math.max(0, previousCgpa) + earnedPoints;
  return Number((totalPoints / combinedCredits).toFixed(2));
}

export function loadState(fallback: DayMateState): DayMateState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DayMateState>;
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...(parsed.profile || {}) },
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : fallback.accounts,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fallback.tasks,
      timetable: Array.isArray(parsed.timetable) ? parsed.timetable : fallback.timetable,
      calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : fallback.calendarEvents,
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : fallback.attendance,
      notes: Array.isArray(parsed.notes) ? parsed.notes : fallback.notes,
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : fallback.flashcards,
      studySessions: Array.isArray(parsed.studySessions) ? parsed.studySessions : fallback.studySessions,
      exams: Array.isArray(parsed.exams) ? parsed.exams : fallback.exams,
      gpaCourses: Array.isArray(parsed.gpaCourses) ? parsed.gpaCourses : fallback.gpaCourses,
      habits: Array.isArray(parsed.habits) ? parsed.habits : fallback.habits,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : fallback.expenses,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : fallback.bookmarks,
    };
  } catch {
    return fallback;
  }
}

export function saveState(state: DayMateState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getStorageByteUsage(): { usedBytes: number; keyCount: number } {
  let usedBytes = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || '';
    const v = localStorage.getItem(k) || '';
    usedBytes += (k.length + v.length) * 2;
  }
  return { usedBytes, keyCount: localStorage.length };
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTasksToCsv(tasks: TaskItem[]): string {
  const headers = ['Title', 'Subject', 'Category', 'Priority', 'Status', 'Due Date', 'Est. Minutes', 'Completed'];
  const escape = (val: string | number | boolean) => `"${String(val).replace(/"/g, '""')}"`;
  const rows = tasks.map((t) =>
    [t.title, t.subject, t.category, t.priority, t.status, t.dueDate, t.estimatedMinutes, t.completed ? 'Yes' : 'No']
      .map(escape)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function calculateHabitStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const set = new Set(completedDates);
  let streak = 0;
  const cursor = new Date();
  const todayStr = toLocalDateString(cursor);
  if (!set.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(toLocalDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
