import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Pin,
  Search,
  RotateCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Flashcard, StudyNote, StudySession } from '../types/daymate';
import { toLocalDateString, uid } from '../utils/storage';

interface StudyStudioViewProps {
  notes: StudyNote[];
  flashcards: Flashcard[];
  sessions: StudySession[];
  onAddNote: (note: StudyNote) => void;
  onUpdateNote: (note: StudyNote) => void;
  onDeleteNote: (id: string) => void;
  onAddFlashcard: (card: Flashcard) => void;
  onUpdateFlashcard: (card: Flashcard) => void;
  onDeleteFlashcard: (id: string) => void;
  onLogSession: (session: StudySession) => void;
}

type StudioTab = 'pomodoro' | 'notes' | 'flashcards';

function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context errors when blocked
  }
}

export const StudyStudioView: React.FC<StudyStudioViewProps> = ({
  notes,
  flashcards,
  sessions,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddFlashcard,
  onUpdateFlashcard,
  onDeleteFlashcard,
  onLogSession,
}) => {
  const [tab, setTab] = useState<StudioTab>('pomodoro');

  // --- Pomodoro State ---
  const [timerMode, setTimerMode] = useState<'Focus' | 'Short Break' | 'Long Break'>('Focus');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerSubject, setTimerSubject] = useState('CSA3426 Frontend Using JS');
  const endTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return undefined;
    endTimestampRef.current = Date.now() + secondsLeft * 1000;
    const interval = window.setInterval(() => {
      if (!endTimestampRef.current) return;
      const remaining = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setIsRunning(false);
        playCompletionChime();
        onLogSession({
          id: uid('ss'),
          subject: timerSubject.trim() || 'General Study',
          minutes: customMinutes,
          mode: timerMode,
          completedAt: new Date().toISOString(),
        });
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [isRunning, customMinutes, timerMode, timerSubject, onLogSession]);

  const selectPreset = (mode: 'Focus' | 'Short Break' | 'Long Break', mins: number) => {
    setIsRunning(false);
    setTimerMode(mode);
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const formattedClock = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  // --- Notes State ---
  const [noteSearch, setNoteSearch] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [notePreview, setNotePreview] = useState(false);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return [...notes]
      .filter((n) => !q || `${n.title} ${n.subject} ${n.content}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, noteSearch]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null;

  const createNewNote = () => {
    const fresh: StudyNote = {
      id: uid('note'),
      title: 'Untitled Study Note',
      subject: 'CSA3426 Frontend Using JS',
      content: '# Key Concepts\nWrite your summary points here...',
      pinned: false,
      updatedAt: toLocalDateString(),
    };
    onAddNote(fresh);
    setActiveNoteId(fresh.id);
    setNotePreview(false);
  };

  // --- Flashcards State ---
  const [cardSubjectFilter, setCardSubjectFilter] = useState('All');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newCardSubject, setNewCardSubject] = useState('CSA3426 Frontend Using JS');
  const [cardError, setCardError] = useState('');

  const cardSubjects = useMemo(() => {
    return ['All', ...Array.from(new Set(flashcards.map((c) => c.subject)))];
  }, [flashcards]);

  const activeDeck = useMemo(() => {
    return flashcards.filter((c) => cardSubjectFilter === 'All' || c.subject === cardSubjectFilter);
  }, [flashcards, cardSubjectFilter]);

  const currentCard = activeDeck[cardIndex % Math.max(1, activeDeck.length)] || null;

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) {
      setCardError('Both question (front) and answer (back) are required.');
      return;
    }
    setCardError('');
    onAddFlashcard({
      id: uid('fc'),
      subject: newCardSubject.trim() || 'General',
      front: newFront.trim(),
      back: newBack.trim(),
      mastered: false,
      reviewCount: 0,
    });
    setNewFront('');
    setNewBack('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Study Studio
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pomodoro focus timer, subject notes repository, and active recall flashcards.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start">
          {(
            [
              { id: 'pomodoro', label: 'Focus Timer' },
              { id: 'notes', label: `Notes (${notes.length})` },
              { id: 'flashcards', label: `Flashcards (${flashcards.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: POMODORO FOCUS TIMER */}
      {tab === 'pomodoro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => selectPreset('Focus', 25)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  timerMode === 'Focus' ? 'bg-white dark:bg-zinc-900 shadow-xs' : 'text-zinc-500'
                }`}
              >
                Focus (25m)
              </button>
              <button
                type="button"
                onClick={() => selectPreset('Short Break', 5)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  timerMode === 'Short Break' ? 'bg-white dark:bg-zinc-900 shadow-xs' : 'text-zinc-500'
                }`}
              >
                Short Break (5m)
              </button>
              <button
                type="button"
                onClick={() => selectPreset('Long Break', 15)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  timerMode === 'Long Break' ? 'bg-white dark:bg-zinc-900 shadow-xs' : 'text-zinc-500'
                }`}
              >
                Long Break (15m)
              </button>
            </div>

            <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
              {formattedClock}
            </div>

            <div className="w-full max-w-sm space-y-3">
              <input
                type="text"
                value={timerSubject}
                onChange={(e) => setTimerSubject(e.target.value)}
                placeholder="What subject are you studying?"
                className="w-full px-3.5 py-2 text-xs text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRunning((r) => !r)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isRunning ? 'Pause' : 'Start Session'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset(timerMode, customMinutes)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  onLogSession({
                    id: uid('ss'),
                    subject: timerSubject.trim() || 'General Study',
                    minutes: customMinutes,
                    mode: timerMode,
                    completedAt: new Date().toISOString(),
                  })
                }
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
              >
                Log {customMinutes}m manually to study history
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Completed Study Log</h2>
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {sessions.reduce((s, x) => s + x.minutes, 0)} min total
              </span>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[380px] overflow-y-auto">
              {sessions.length === 0 ? (
                <li className="p-8 text-center text-xs text-zinc-400">
                  Complete a focus timer session to record study hours.
                </li>
              ) : (
                [...sessions].reverse().map((s) => (
                  <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {s.subject}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {s.mode} · {new Date(s.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {s.minutes}m
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: NOTES VAULT */}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Saved Notes</h2>
                <button
                  type="button"
                  onClick={createNewNote}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Note</span>
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                />
              </div>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[480px] overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <li className="p-6 text-center text-xs text-zinc-400">No notes match your search.</li>
              ) : (
                filteredNotes.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setActiveNoteId(n.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        activeNote?.id === n.id
                          ? 'bg-zinc-100 dark:bg-zinc-800'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {n.title || 'Untitled'}
                        </p>
                        {n.pinned && <Pin className="w-3 h-3 text-zinc-600 dark:text-zinc-300 shrink-0" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
                        {n.subject} · {n.updatedAt}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            {activeNote ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) =>
                        onUpdateNote({ ...activeNote, title: e.target.value, updatedAt: toLocalDateString() })
                      }
                      className="w-full text-lg font-bold bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
                    />
                    <input
                      type="text"
                      value={activeNote.subject}
                      onChange={(e) =>
                        onUpdateNote({ ...activeNote, subject: e.target.value, updatedAt: toLocalDateString() })
                      }
                      placeholder="Subject tag"
                      className="w-full text-xs text-zinc-500 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setNotePreview((p) => !p)}
                      className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    >
                      {notePreview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNote({ ...activeNote, pinned: !activeNote.pinned })}
                      className={`p-1.5 border rounded-lg ${
                        activeNote.pinned
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-500'
                      }`}
                      aria-label="Pin note"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(activeNote.id)}
                      className="p-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-red-600 rounded-lg"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {notePreview ? (
                  <div className="min-h-[300px] space-y-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                    {activeNote.content.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) {
                        return (
                          <h3 key={i} className="text-base font-bold text-zinc-900 dark:text-white pt-2">
                            {line.slice(2)}
                          </h3>
                        );
                      }
                      if (line.startsWith('## ')) {
                        return (
                          <h4 key={i} className="text-sm font-semibold text-zinc-900 dark:text-white pt-1">
                            {line.slice(3)}
                          </h4>
                        );
                      }
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                ) : (
                  <textarea
                    value={activeNote.content}
                    onChange={(e) =>
                      onUpdateNote({ ...activeNote, content: e.target.value, updatedAt: toLocalDateString() })
                    }
                    rows={14}
                    className="w-full p-3.5 text-sm font-mono leading-relaxed bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500 font-mono tabular-nums">
                  <span>
                    {activeNote.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0} words ·{' '}
                    {activeNote.content.length} chars
                  </span>
                  <span>Last updated {activeNote.updatedAt}</span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-zinc-400">
                Select a note on the left or create a new study note.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE RECALL FLASHCARDS */}
      {tab === 'flashcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {cardSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setCardSubjectFilter(sub);
                      setCardIndex(0);
                      setIsFlipped(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                      cardSubjectFilter === sub
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {activeDeck.filter((c) => c.mastered).length}/{activeDeck.length} mastered
              </span>
            </div>

            {currentCard ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {currentCard.subject} · Card {(cardIndex % activeDeck.length) + 1} of {activeDeck.length}
                  </span>
                  <span className="font-mono tabular-nums">
                    {currentCard.mastered ? 'Mastered' : 'Reviewing'} · {currentCard.reviewCount} reviews
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped((f) => !f)}
                  className="w-full min-h-[190px] p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center transition-colors hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  <span className="text-[11px] font-medium text-zinc-400 mb-2">
                    {isFlipped ? 'Answer (Click to show question)' : 'Question (Click to reveal answer)'}
                  </span>
                  <p className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 max-w-lg leading-relaxed">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFlashcard({
                          ...currentCard,
                          mastered: true,
                          reviewCount: currentCard.reviewCount + 1,
                        });
                        setCardIndex((i) => i + 1);
                        setIsFlipped(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Got It (Mastered)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFlashcard({
                          ...currentCard,
                          mastered: false,
                          reviewCount: currentCard.reviewCount + 1,
                        });
                        setCardIndex((i) => i + 1);
                        setIsFlipped(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Review Again</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteFlashcard(currentCard.id)}
                    className="text-xs text-zinc-400 hover:text-red-600"
                  >
                    Delete Card
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                No flashcards in this subject deck. Add one on the right.
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddCard}
            className="lg:col-span-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5 self-start"
            noValidate
          >
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create Flashcard</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Subject</label>
              <input
                type="text"
                value={newCardSubject}
                onChange={(e) => setNewCardSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Question (Front)</label>
              <textarea
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={2}
                placeholder="e.g., What is event bubbling in JavaScript?"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Answer (Back)</label>
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={3}
                placeholder="e.g., Events triggered on a child element propagate upward to ancestor elements."
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            {cardError && <p className="text-xs text-red-600 dark:text-red-400">{cardError}</p>}
            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
            >
              Add Flashcard
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
