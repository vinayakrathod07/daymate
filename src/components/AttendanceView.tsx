import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Minus, Calculator } from 'lucide-react';
import { SubjectAttendance } from '../types/daymate';
import { calculateAttendanceInsight, uid } from '../utils/storage';

interface AttendanceViewProps {
  subjects: SubjectAttendance[];
  onAddSubject: (subject: SubjectAttendance) => void;
  onUpdateSubject: (subject: SubjectAttendance) => void;
  onDeleteSubject: (id: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [attended, setAttended] = useState(0);
  const [total, setTotal] = useState(0);
  const [targetPercent, setTargetPercent] = useState(75);
  const [error, setError] = useState('');

  // What-If Simulator
  const [simSubjectId, setSimSubjectId] = useState<string>(subjects[0]?.id || '');
  const [simAttendNext, setSimAttendNext] = useState(3);
  const [simSkipNext, setSimSkipNext] = useState(0);

  const totalAttended = subjects.reduce((s, x) => s + x.attended, 0);
  const totalHeld = subjects.reduce((s, x) => s + x.total, 0);
  const aggregatePct = totalHeld > 0 ? ((totalAttended / totalHeld) * 100).toFixed(1) : '100.0';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Subject code and name are required.');
      return;
    }
    if (attended < 0 || total < 0 || attended > total) {
      setError('Attended classes cannot exceed total classes or be negative.');
      return;
    }
    setError('');
    onAddSubject({
      id: uid('att'),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      faculty: faculty.trim() || 'Faculty',
      attended: Number(attended),
      total: Number(total),
      targetPercent: Number(targetPercent) || 75,
    });
    setCode('');
    setName('');
    setFaculty('');
    setAttended(0);
    setTotal(0);
  };

  const markPresent = (sub: SubjectAttendance) => {
    onUpdateSubject({ ...sub, attended: sub.attended + 1, total: sub.total + 1 });
  };

  const markAbsent = (sub: SubjectAttendance) => {
    onUpdateSubject({ ...sub, total: sub.total + 1 });
  };

  const undoOne = (sub: SubjectAttendance, wasPresent: boolean) => {
    if (sub.total <= 0) return;
    if (wasPresent && sub.attended <= 0) return;
    onUpdateSubject({
      ...sub,
      attended: wasPresent ? Math.max(0, sub.attended - 1) : sub.attended,
      total: Math.max(0, sub.total - 1),
    });
  };

  const simSubject = subjects.find((s) => s.id === simSubjectId) || subjects[0];
  const simProjectedPct = simSubject
    ? (() => {
        const newAtt = simSubject.attended + simAttendNext;
        const newTot = simSubject.total + simAttendNext + simSkipNext;
        return newTot > 0 ? ((newAtt / newTot) * 100).toFixed(1) : '100.0';
      })()
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Attendance Tracker &amp; 75% Calculator
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Track attended sessions and calculate exact safe-skip margins or recovery requirements.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Aggregate Attendance</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {aggregatePct}%{' '}
            <span className="text-xs font-normal text-zinc-500">
              ({totalAttended}/{totalHeld})
            </span>
          </p>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {subjects.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-500">
          No subjects tracked yet. Add a subject below to start monitoring attendance.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub) => {
            const insight = calculateAttendanceInsight(sub);
            return (
              <div
                key={sub.id}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {sub.code} · {sub.faculty} · Target {sub.targetPercent}%
                    </p>
                    <h2 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {sub.name}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        insight.status === 'Shortage'
                          ? 'text-red-600 dark:text-red-400'
                          : insight.status === 'Borderline'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {insight.percentage}%
                    </span>
                    <div className="flex items-center justify-end gap-1 text-[11px] font-medium">
                      {insight.status === 'Shortage' ? (
                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span
                        className={
                          insight.status === 'Shortage'
                            ? 'text-red-600 dark:text-red-400'
                            : insight.status === 'Borderline'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {insight.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                    <span>
                      Attended: {sub.attended} / {sub.total}
                    </span>
                    <span>Absent: {sub.total - sub.attended}</span>
                  </div>
                </div>

                {/* Calculator Message */}
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {insight.message}
                </p>

                {/* Quick Controls */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markPresent(sub)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap"
                    >
                      + Present
                    </button>
                    <button
                      type="button"
                      onClick={() => markAbsent(sub)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
                    >
                      + Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => undoOne(sub, true)}
                      title="Decrement 1 attended class"
                      aria-label="Decrement attended class"
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={sub.targetPercent}
                      onChange={(e) => onUpdateSubject({ ...sub, targetPercent: Number(e.target.value) })}
                      aria-label="Target attendance percentage"
                      className="px-2 py-1 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md"
                    >
                      <option value={75}>75% target</option>
                      <option value={80}>80% target</option>
                      <option value={85}>85% target</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onDeleteSubject(sub.id)}
                      aria-label={`Delete ${sub.name}`}
                      className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Grid: What-If Simulator + Add New Subject */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {simSubject && (
          <section className="lg:col-span-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                What-If Attendance Simulator
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Select Subject
              </label>
              <select
                value={simSubject.id}
                onChange={(e) => setSimSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} ({s.attended}/{s.total})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Attend next</span>
                  <span className="font-mono font-semibold tabular-nums">{simAttendNext} classes</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={simAttendNext}
                  onChange={(e) => setSimAttendNext(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Skip next</span>
                  <span className="font-mono font-semibold tabular-nums">{simSkipNext} classes</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={simSkipNext}
                  onChange={(e) => setSimSkipNext(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Projected ratio: {simSubject.attended + simAttendNext} /{' '}
                {simSubject.total + simAttendNext + simSkipNext}
              </span>
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  Number(simProjectedPct) < simSubject.targetPercent
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {simProjectedPct}%
              </span>
            </div>
          </section>
        )}

        <form
          onSubmit={handleCreate}
          className="lg:col-span-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5"
          noValidate
        >
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add Subject to Track</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (CSA3426)"
              className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject Name"
              className="sm:col-span-2 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="Faculty Name"
              className="col-span-2 sm:col-span-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <div>
              <label className="block text-[11px] text-zinc-500 mb-0.5">Attended</label>
              <input
                type="number"
                min={0}
                value={attended}
                onChange={(e) => setAttended(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-0.5">Total Held</label>
              <input
                type="number"
                min={0}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-0.5">Target %</label>
              <input
                type="number"
                min={50}
                max={95}
                value={targetPercent}
                onChange={(e) => setTargetPercent(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </form>
      </div>
    </div>
  );
};
