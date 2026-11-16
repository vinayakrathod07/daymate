import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Edit3,
} from 'lucide-react';
import { CalendarEvent, ExamItem, TaskItem, TimetableSlot, WeekDay } from '../types/daymate';
import { formatTime12h, toLocalDateString, uid } from '../utils/storage';

interface TimetableViewProps {
  timetable: TimetableSlot[];
  tasks: TaskItem[];
  exams: ExamItem[];
  calendarEvents: CalendarEvent[];
  onAddSlot: (slot: TimetableSlot) => void;
  onUpdateSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (id: string) => void;
  onAddEvent: (ev: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  tasks,
  exams,
  calendarEvents,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onAddEvent,
  onDeleteEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'timetable' | 'calendar'>('timetable');
  const [selectedDay, setSelectedDay] = useState<WeekDay | 'All'>('All');

  // Class Modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [day, setDay] = useState<WeekDay>('Mon');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');
  const [classType, setClassType] = useState<'Lecture' | 'Lab' | 'Tutorial'>('Lecture');
  const [slotError, setSlotError] = useState('');

  // Calendar Month State
  const [calCursor, setCalCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(toLocalDateString());
  const [eventType, setEventType] = useState<CalendarEvent['type']>('Event');
  const [eventError, setEventError] = useState('');

  const nextClassInfo = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay();
    if (jsDay === 0) return null;
    const todayCode = DAYS[jsDay - 1];
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaySlots = timetable
      .filter((s) => s.day === todayCode)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const current = todaySlots.find((s) => s.startTime <= nowHHMM && s.endTime > nowHHMM);
    if (current) return { mode: 'Ongoing now' as const, slot: current };
    const upcoming = todaySlots.find((s) => s.startTime > nowHHMM);
    if (upcoming) return { mode: 'Up next today' as const, slot: upcoming };
    return null;
  }, [timetable]);

  const openAddSlot = (presetDay?: WeekDay) => {
    setEditingSlotId(null);
    setDay(presetDay || 'Mon');
    setStartTime('09:00');
    setEndTime('10:00');
    setSubjectCode('');
    setSubjectName('');
    setRoom('');
    setFaculty('');
    setClassType('Lecture');
    setSlotError('');
    setSlotModalOpen(true);
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id);
    setDay(slot.day);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setSubjectCode(slot.subjectCode);
    setSubjectName(slot.subjectName);
    setRoom(slot.room);
    setFaculty(slot.faculty);
    setClassType(slot.classType);
    setSlotError('');
    setSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim()) {
      setSlotError('Subject code and subject name are required.');
      return;
    }
    if (endTime <= startTime) {
      setSlotError('End time must be after start time.');
      return;
    }
    const payload: TimetableSlot = {
      id: editingSlotId || uid('tt'),
      day,
      startTime,
      endTime,
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      room: room.trim() || 'TBA',
      faculty: faculty.trim() || 'Department Faculty',
      classType,
    };
    if (editingSlotId) onUpdateSlot(payload);
    else onAddSlot(payload);
    setSlotModalOpen(false);
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setEventError('Event title cannot be empty.');
      return;
    }
    setEventError('');
    onAddEvent({
      id: uid('ev'),
      title: eventTitle.trim(),
      date: eventDate || toLocalDateString(),
      type: eventType,
    });
    setEventTitle('');
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < firstDayIndex; i += 1) cells.push({ dateStr: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d });
    }
    return cells;
  }, [calCursor]);

  const visibleDays = selectedDay === 'All' ? DAYS : [selectedDay];
  const todayStr = toLocalDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Timetable &amp; Academic Calendar
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Weekly Mon–Sat lecture schedule and unified monthly deadline calendar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('timetable')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'timetable'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Weekly Timetable
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Monthly Calendar
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={() => openAddSlot()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {activeTab === 'timetable' ? (
        <div className="space-y-6">
          {/* Live Next Class Banner */}
          {nextClassInfo && (
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {nextClassInfo.mode} ({nextClassInfo.slot.day})
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {nextClassInfo.slot.subjectCode} — {nextClassInfo.slot.subjectName}
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                {formatTime12h(nextClassInfo.slot.startTime)} – {formatTime12h(nextClassInfo.slot.endTime)} ·{' '}
                {nextClassInfo.slot.room} · {nextClassInfo.slot.faculty}
              </div>
            </div>
          )}

          {/* Day Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() => setSelectedDay('All')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                selectedDay === 'All'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              Full Week (Mon–Sat)
            </button>
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  selectedDay === d
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Weekly Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleDays.map((dayName) => {
              const daySlots = timetable
                .filter((s) => s.day === dayName)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <section
                  key={dayName}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col"
                >
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{dayName}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums text-zinc-500">
                        {daySlots.length} {daySlots.length === 1 ? 'session' : 'sessions'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddSlot(dayName)}
                        aria-label={`Add class on ${dayName}`}
                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 no-print"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {daySlots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400">
                      No classes scheduled.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {daySlots.map((slot) => (
                        <li key={slot.id} className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                              {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)} · {slot.classType}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {slot.subjectCode} · {slot.subjectName}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {slot.room} · {slot.faculty}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 no-print">
                            <button
                              type="button"
                              onClick={() => openEditSlot(slot)}
                              aria-label="Edit class slot"
                              className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSlot(slot.id)}
                              aria-label="Delete class slot"
                              className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        /* Monthly Academic Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {calCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1))}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  }}
                  className="px-2.5 py-1 text-xs font-medium border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1))}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 text-center text-xs font-medium text-zinc-500 py-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr) {
                  return <div key={`empty_${idx}`} className="min-h-[84px] bg-zinc-50/50 dark:bg-zinc-950/30" />;
                }
                const dayTasks = tasks.filter((t) => t.dueDate === cell.dateStr && !t.completed);
                const dayExams = exams.filter((e) => e.date === cell.dateStr);
                const dayEvents = calendarEvents.filter((ev) => ev.date === cell.dateStr);
                const isToday = cell.dateStr === todayStr;

                return (
                  <div
                    key={cell.dateStr}
                    className={`min-h-[84px] p-1.5 text-xs ${
                      isToday ? 'bg-zinc-100/70 dark:bg-zinc-800/50' : ''
                    }`}
                  >
                    <div
                      className={`font-mono tabular-nums text-[11px] mb-1 ${
                        isToday ? 'font-bold text-zinc-900 dark:text-white underline' : 'text-zinc-500'
                      }`}
                    >
                      {cell.dayNum}
                    </div>
                    <div className="space-y-1">
                      {dayExams.map((ex) => (
                        <div
                          key={ex.id}
                          className="px-1 py-0.5 text-[10px] font-medium bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded truncate"
                          title={`Exam: ${ex.subjectName}`}
                        >
                          Exam: {ex.subjectCode}
                        </div>
                      ))}
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="px-1 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="px-1 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded truncate"
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Academic Event */}
          <div className="lg:col-span-4 space-y-5">
            <form
              onSubmit={handleAddCalendarEvent}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3"
              noValidate
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Academic Event</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Event / Holiday Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Mini-Project Viva Voce"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as CalendarEvent['type'])}
                    className="w-full px-2.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Event">Event</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
              </div>
              {eventError && <p className="text-xs text-red-600 dark:text-red-400">{eventError}</p>}
              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
              >
                Add to Calendar
              </button>
            </form>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Custom Events</h3>
              </div>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {calendarEvents.length === 0 ? (
                  <li className="p-5 text-xs text-zinc-400 text-center">No custom events added.</li>
                ) : (
                  calendarEvents.map((ev) => (
                    <li key={ev.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ev.title}</p>
                        <p className="text-[11px] text-zinc-500 font-mono tabular-nums">
                          {ev.date} · {ev.type}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(ev.id)}
                        className="p-1 text-zinc-400 hover:text-red-600"
                        aria-label="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Timetable Class Modal */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold">{editingSlotId ? 'Edit Class Slot' : 'Add Timetable Class'}</h2>
              <button type="button" onClick={() => setSlotModalOpen(false)} aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSlot} className="p-5 space-y-3.5" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Day</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as WeekDay)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Class Type</label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value as 'Lecture' | 'Lab' | 'Tutorial')}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="CSA3426"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Frontend Using JavaScript"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Room / Lab</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Block C-204"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Faculty</label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="Ms. Rajitha Reddy"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              {slotError && <p className="text-xs text-red-600 dark:text-red-400">{slotError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
