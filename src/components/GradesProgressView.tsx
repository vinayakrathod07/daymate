import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DayMateState, GradeLetter, GpaCourse } from '../types/daymate';
import { GRADE_POINTS, calculateCGPA, calculateSGPA, uid } from '../utils/storage';

interface GradesProgressViewProps {
  state: DayMateState;
  onAddGpaCourse: (course: GpaCourse) => void;
  onUpdateGpaCourse: (course: GpaCourse) => void;
  onDeleteGpaCourse: (id: string) => void;
  onUpdatePrevGpa: (credits: number, cgpa: number) => void;
}

const GRADES: GradeLetter[] = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'];

export const GradesProgressView: React.FC<GradesProgressViewProps> = ({
  state,
  onAddGpaCourse,
  onUpdateGpaCourse,
  onDeleteGpaCourse,
  onUpdatePrevGpa,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(4);
  const [grade, setGrade] = useState<GradeLetter>('A+');
  const [error, setError] = useState('');

  const { sgpa, totalCredits, earnedPoints } = useMemo(
    () => calculateSGPA(state.gpaCourses),
    [state.gpaCourses],
  );
  const projectedCgpa = useMemo(
    () => calculateCGPA(state.profile.previousCgpa, state.profile.previousCredits, state.gpaCourses),
    [state.profile.previousCgpa, state.profile.previousCredits, state.gpaCourses],
  );

  // Subject Task Completion Analytics
  const subjectStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    state.tasks.forEach((t) => {
      const entry = map.get(t.subject) || { total: 0, done: 0 };
      entry.total += 1;
      if (t.completed) entry.done += 1;
      map.set(t.subject, entry);
    });
    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      ...data,
      pct: Math.round((data.done / data.total) * 100),
    }));
  }, [state.tasks]);

  // Study Time by Subject
  const studyBySubject = useMemo(() => {
    const map = new Map<string, number>();
    state.studySessions.forEach((s) => {
      map.set(s.subject, (map.get(s.subject) || 0) + s.minutes);
    });
    const maxMins = Math.max(1, ...Array.from(map.values()));
    return Array.from(map.entries()).map(([subject, minutes]) => ({
      subject,
      minutes,
      widthPct: Math.round((minutes / maxMins) * 100),
    }));
  }, [state.studySessions]);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Course code and name are required.');
      return;
    }
    if (credits <= 0 || credits > 10) {
      setError('Credits must be between 1 and 10.');
      return;
    }
    setError('');
    onAddGpaCourse({
      id: uid('gpa'),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      credits: Number(credits),
      grade,
    });
    setCode('');
    setName('');
  };

  const overallTaskDone = state.tasks.filter((t) => t.completed).length;
  const overallTaskPct =
    state.tasks.length > 0 ? Math.round((overallTaskDone / state.tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Progress Analytics &amp; SGPA / CGPA Calculator
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Visualize subject task completion, study time logs, and CBCS 10-point semester GPA projections.
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-xs font-medium text-zinc-500">Projected Semester SGPA</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {sgpa.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
            {earnedPoints} grade points / {totalCredits} credits
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-xs font-medium text-zinc-500">Projected Cumulative CGPA</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {projectedCgpa.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
            Includes {state.profile.previousCredits} prior credits @ {state.profile.previousCgpa.toFixed(2)}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-xs font-medium text-zinc-500">Assignment Completion Rate</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {overallTaskPct}%
          </p>
          <p className="mt-1 text-xs text-zinc-500 font-mono tabular-nums">
            {overallTaskDone} of {state.tasks.length} tasks finished
          </p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Task Completion by Subject
          </h2>
          {subjectStats.length === 0 ? (
            <p className="text-xs text-zinc-400">No tasks recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {subjectStats.map((item) => (
                <div key={item.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {item.subject}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-500">
                      {item.done}/{item.total} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Logged Focus Study Hours
          </h2>
          {studyBySubject.length === 0 ? (
            <p className="text-xs text-zinc-400">Use the Pomodoro Focus Timer in Study Studio to log hours.</p>
          ) : (
            <div className="space-y-3">
              {studyBySubject.map((item) => (
                <div key={item.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {item.subject}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-500">
                      {item.minutes} min ({(item.minutes / 60).toFixed(1)}h)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                      style={{ width: `${item.widthPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SGPA & CGPA Interactive Table */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              CBCS SGPA &amp; CGPA Course Table
            </h2>
            <p className="text-xs text-zinc-500">10-Point Scale (O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0)</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-zinc-500">Prior Credits:</span>
              <input
                type="number"
                min={0}
                value={state.profile.previousCredits}
                onChange={(e) => onUpdatePrevGpa(Number(e.target.value), state.profile.previousCgpa)}
                className="w-16 px-2 py-1 font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-zinc-500">Prior CGPA:</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={state.profile.previousCgpa}
                onChange={(e) => onUpdatePrevGpa(state.profile.previousCredits, Number(e.target.value))}
                className="w-16 px-2 py-1 font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <th className="py-3 px-5 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Course Name</th>
                <th className="py-3 px-4 font-medium text-right">Credits</th>
                <th className="py-3 px-4 font-medium">Expected Grade</th>
                <th className="py-3 px-4 font-medium text-right">Grade Points</th>
                <th className="py-3 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {state.gpaCourses.map((course) => (
                <tr key={course.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-5 font-mono font-medium">{course.code}</td>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">{course.name}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={course.credits}
                      onChange={(e) => onUpdateGpaCourse({ ...course, credits: Number(e.target.value) })}
                      aria-label={`Credits for ${course.name}`}
                      className="w-14 px-2 py-1 text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={course.grade}
                      onChange={(e) => onUpdateGpaCourse({ ...course, grade: e.target.value as GradeLetter })}
                      aria-label={`Grade for ${course.name}`}
                      className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded font-mono"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g} ({GRADE_POINTS[g]})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {course.credits * GRADE_POINTS[course.grade]}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteGpaCourse(course.id)}
                      aria-label={`Remove ${course.name}`}
                      className="p-1 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={handleAddCourse}
          className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 flex flex-wrap items-center gap-2.5"
          noValidate
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (CSA3501)"
            className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course Name"
            className="flex-1 min-w-[180px] px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            className="w-20 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeLetter)}
            className="px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
          {error && <span className="text-xs text-red-600 dark:text-red-400 w-full">{error}</span>}
        </form>
      </section>
    </div>
  );
};
