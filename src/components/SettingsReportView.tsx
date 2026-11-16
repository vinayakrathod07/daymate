import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Trash2, Printer, LogOut, Check } from 'lucide-react';
import { DayMateState, StudentProfile } from '../types/daymate';
import {
  STORAGE_KEY,
  downloadTextFile,
  exportTasksToCsv,
  getStorageByteUsage,
  toLocalDateString,
} from '../utils/storage';

interface SettingsReportViewProps {
  state: DayMateState;
  onUpdateProfile: (profile: StudentProfile) => void;
  onImportState: (imported: DayMateState) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
  onSignOut: () => void;
}

export const SettingsReportView: React.FC<SettingsReportViewProps> = ({
  state,
  onUpdateProfile,
  onImportState,
  onResetDemo,
  onClearAll,
  onSignOut,
}) => {
  const [form, setForm] = useState<StudentProfile>(state.profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<'reset' | 'clear' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const storageInfo = getStorageByteUsage();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(form);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportJson = () => {
    downloadTextFile(
      `student_daymate_backup_${toLocalDateString()}.json`,
      JSON.stringify(state, null, 2),
      'application/json',
    );
  };

  const handleExportTasksCsv = () => {
    downloadTextFile(
      `student_daymate_tasks_${toLocalDateString()}.csv`,
      exportTasksToCsv(state.tasks),
      'text/csv',
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as DayMateState;
        if (!parsed || !Array.isArray(parsed.tasks) || !parsed.profile) {
          setImportMessage('Invalid backup JSON format. Ensure it was exported from Student DayMate.');
          return;
        }
        onImportState(parsed);
        setForm(parsed.profile);
        setImportMessage('Backup restored successfully.');
      } catch {
        setImportMessage('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Settings, Storage &amp; Project Documentation
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Manage student profile, JSON/CSV backups, localStorage inspection, and CSA3426 project reference.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 self-start no-print"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>

      {/* Profile & Backup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Student Profile</h2>
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Saved to localStorage
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium mb-1">Student Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Roll Number / USN</label>
              <input
                type="text"
                value={form.rollNumber}
                onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Semester &amp; Section</label>
              <input
                type="text"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Faculty Guide</label>
              <input
                type="text"
                value={form.facultyMentor}
                onChange={(e) => setForm({ ...form, facultyMentor: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Academic Year</label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">College / University</label>
            <input
              type="text"
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
          >
            Save Profile
          </button>
        </form>

        <div className="lg:col-span-5 space-y-5">
          <section className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <h2 className="text-base font-bold">Browser Storage &amp; Backups</h2>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono tabular-nums">
              <p>Key: {STORAGE_KEY}</p>
              <p>
                Payload Size: {(storageInfo.usedBytes / 1024).toFixed(2)} KB ({storageInfo.keyCount} storage key)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>
              <button
                type="button"
                onClick={handleExportTasksCsv}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Tasks CSV</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 sm:col-span-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {importMessage && <p className="text-xs text-zinc-700 dark:text-zinc-300">{importMessage}</p>}

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2">
              {confirmAction === 'reset' ? (
                <div className="flex items-center gap-2 text-xs">
                  <span>Restore sample BCA data?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetDemo();
                      setConfirmAction(null);
                    }}
                    className="px-2.5 py-1 font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded"
                  >
                    Confirm
                  </button>
                  <button type="button" onClick={() => setConfirmAction(null)} className="underline">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction('reset')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample BCA Data</span>
                </button>
              )}

              {confirmAction === 'clear' ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-600">Erase all entries?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setConfirmAction(null);
                    }}
                    className="px-2.5 py-1 font-semibold bg-red-600 text-white rounded"
                  >
                    Confirm Erase
                  </button>
                  <button type="button" onClick={() => setConfirmAction(null)} className="underline">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction('clear')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Data</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Academic Mini-Project Documentation & Viva Reference */}
      <section className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-zinc-500">Academic Mini-Project Reference</p>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Student DayMate — CSA3426 Project Summary &amp; Viva Sheet
            </h2>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg no-print self-start"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-zinc-500">Student</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{state.profile.name}</p>
          </div>
          <div>
            <p className="text-zinc-500">Faculty Guide</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{state.profile.facultyMentor}</p>
          </div>
          <div>
            <p className="text-zinc-500">Course</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">CSA3426 – Frontend Using JavaScript</p>
          </div>
          <div>
            <p className="text-zinc-500">Institution</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{state.profile.college}</p>
          </div>
          <div>
            <p className="text-zinc-500">Academic Year</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{state.profile.academicYear}</p>
          </div>
          <div>
            <p className="text-zinc-500">Architecture</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Zero-Backend Client-Side localStorage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Core Mathematical Formulas Implemented
            </h3>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                <strong>Attendance %</strong> = (Attended Classes / Total Classes) × 100
              </li>
              <li>
                <strong>Safe-to-Skip Classes</strong> = floor((Attended / TargetRatio) − Total)
              </li>
              <li>
                <strong>Recovery Classes Needed</strong> = ceil((TargetRatio × Total − Attended) / (1 − TargetRatio))
              </li>
              <li>
                <strong>CBCS SGPA</strong> = Σ(Course Credits × Grade Point) / Σ(Course Credits)
              </li>
              <li>
                <strong>Cumulative CGPA</strong> = (Prior Credits × Prior CGPA + Current Earned Points) / Total Credits
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              9 Integrated Modules &amp; Validation Rules
            </h3>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>1. Local Auth &amp; Profile Registration (Email format &amp; 6-char password check)</li>
              <li>2. Academic Command Dashboard (KPIs, Today&apos;s Classes, Quick Task, Scratchpad)</li>
              <li>3. Task &amp; Assignment Manager (Blank-title rejection, Kanban + List, Subtasks, CSV)</li>
              <li>4. Weekly Timetable &amp; Unified Monthly Calendar (Start &lt; End time validation)</li>
              <li>5. 75% Attendance Tracker &amp; Interactive What-If Simulator</li>
              <li>6. Study Studio (Pomodoro Web Audio Timer, Markdown Notes, Active Recall Flashcards)</li>
              <li>7. Exam Planner (Countdown, Syllabus Checklist, End-Term Marks Predictor)</li>
              <li>8. Progress Analytics &amp; CBCS SGPA/CGPA Calculator</li>
              <li>9. Campus Life (Allowance Budget, 7-Day Habits, Resource Links) &amp; JSON Portability</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
