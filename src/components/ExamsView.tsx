import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, Calendar, MapPin, Calculator } from 'lucide-react';
import { ExamItem } from '../types/daymate';
import { daysUntil, formatReadableDate, toLocalDateString, uid } from '../utils/storage';

interface ExamsViewProps {
  exams: ExamItem[];
  onAddExam: (exam: ExamItem) => void;
  onUpdateExam: (exam: ExamItem) => void;
  onDeleteExam: (id: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
}) => {
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [examType, setExamType] = useState<ExamItem['examType']>('Mid-Term');
  const [date, setDate] = useState(toLocalDateString());
  const [time, setTime] = useState('09:30 AM');
  const [venue, setVenue] = useState('');
  const [maxMarks, setMaxMarks] = useState(50);
  const [error, setError] = useState('');
  const [newTopicText, setNewTopicText] = useState<Record<string, string>>({});

  // Target Marks Predictor
  const [internalScore, setInternalScore] = useState(21);
  const [internalMax, setInternalMax] = useState(25);
  const [externalMax, setExternalMax] = useState(75);
  const [targetTotalPct, setTargetTotalPct] = useState(80);

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date));

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim()) {
      setError('Subject code and name are required.');
      return;
    }
    setError('');
    onAddExam({
      id: uid('ex'),
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      examType,
      date,
      time: time.trim() || '09:30 AM',
      venue: venue.trim() || 'Main Exam Hall',
      maxMarks: Number(maxMarks) || 50,
      syllabus: [{ id: uid('sy'), title: 'Unit 1: Core Concepts & Revision', completed: false }],
    });
    setSubjectCode('');
    setSubjectName('');
    setVenue('');
  };

  const toggleTopic = (exam: ExamItem, topicId: string) => {
    onUpdateExam({
      ...exam,
      syllabus: exam.syllabus.map((t) => (t.id === topicId ? { ...t, completed: !t.completed } : t)),
    });
  };

  const addTopic = (exam: ExamItem) => {
    const text = (newTopicText[exam.id] || '').trim();
    if (!text) return;
    onUpdateExam({
      ...exam,
      syllabus: [...exam.syllabus, { id: uid('sy'), title: text, completed: false }],
    });
    setNewTopicText((prev) => ({ ...prev, [exam.id]: '' }));
  };

  const requiredTotal = ((internalMax + externalMax) * targetTotalPct) / 100;
  const neededExternal = Math.max(0, Math.ceil(requiredTotal - internalScore));

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Examination Planner &amp; Syllabus Tracker
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Live countdowns, venue details, and unit-by-unit syllabus readiness tracking.
        </p>
      </div>

      {/* Exam Cards */}
      {sortedExams.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-500">
          No examinations scheduled. Add an upcoming exam below.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sortedExams.map((ex) => {
            const diff = daysUntil(ex.date);
            const completedTopics = ex.syllabus.filter((t) => t.completed).length;
            const readiness = ex.syllabus.length > 0 ? Math.round((completedTopics / ex.syllabus.length) * 100) : 0;

            return (
              <section
                key={ex.id}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {ex.subjectCode} · {ex.examType} · Max {ex.maxMarks} marks
                    </p>
                    <h2 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {ex.subjectName}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatReadableDate(ex.date)} · {ex.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {ex.venue}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        diff < 0
                          ? 'text-zinc-400'
                          : diff <= 5
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {diff < 0 ? 'Done' : diff === 0 ? 'Today' : `${diff}d`}
                    </span>
                    <p className="text-[11px] text-zinc-500">remaining</p>
                  </div>
                </div>

                {/* Readiness Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Syllabus Readiness</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {readiness}% ({completedTopics}/{ex.syllabus.length})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                </div>

                {/* Syllabus Checklist */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {ex.syllabus.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(ex, topic.id)}
                      className="w-full flex items-center gap-2 text-left text-xs hover:text-zinc-900 dark:hover:text-white"
                    >
                      {topic.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                      <span
                        className={
                          topic.completed
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }
                      >
                        {topic.title}
                      </span>
                    </button>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newTopicText[ex.id] || ''}
                      onChange={(e) => setNewTopicText((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTopic(ex);
                        }
                      }}
                      placeholder="Add syllabus unit or topic..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => addTopic(ex)}
                      className="px-2.5 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExam(ex.id)}
                      aria-label="Delete exam"
                      className="p-1.5 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Bottom Row: Add Exam + Target Marks Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddExam}
          className="lg:col-span-7 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5"
          noValidate
        >
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Schedule New Examination</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="Code (CSA3426)"
              className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Subject Name"
              className="sm:col-span-2 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamItem['examType'])}
              className="px-2.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            >
              <option value="Mid-Term">Mid-Term</option>
              <option value="End-Term">End-Term</option>
              <option value="Lab Practical">Lab Practical</option>
              <option value="Internal Quiz">Internal Quiz</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-2 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="09:30 AM"
              className="px-2.5 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <input
              type="number"
              min={10}
              max={200}
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              placeholder="Max Marks"
              className="px-2.5 py-2 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
          </div>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Exam Venue / Room (e.g., Main Block Room 302)"
            className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam</span>
          </button>
        </form>

        <section className="lg:col-span-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              End-Term Target Marks Predictor
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Internal Scored</label>
              <input
                type="number"
                min={0}
                max={internalMax}
                value={internalScore}
                onChange={(e) => setInternalScore(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Internal Max</label>
              <input
                type="number"
                min={1}
                value={internalMax}
                onChange={(e) => setInternalMax(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">External Max</label>
              <input
                type="number"
                min={1}
                value={externalMax}
                onChange={(e) => setExternalMax(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Target Overall %</label>
              <input
                type="number"
                min={40}
                max={100}
                value={targetTotalPct}
                onChange={(e) => setTargetTotalPct(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Required in End-Term ({externalMax} max):
            </span>
            <span
              className={`text-lg font-bold font-mono tabular-nums ${
                neededExternal > externalMax
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {neededExternal > externalMax ? `${neededExternal} (Not reachable)` : `${neededExternal} / ${externalMax}`}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
