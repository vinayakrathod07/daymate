import React, { useMemo, useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { BookmarkItem, DayMateState, ExpenseItem, HabitItem } from '../types/daymate';
import { addDays, calculateHabitStreak, formatReadableDate, toLocalDateString, uid } from '../utils/storage';

interface CampusLifeViewProps {
  state: DayMateState;
  onAddExpense: (exp: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateBudget: (amount: number) => void;
  onAddHabit: (habit: HabitItem) => void;
  onToggleHabitDate: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (id: string) => void;
  onAddBookmark: (bm: BookmarkItem) => void;
  onDeleteBookmark: (id: string) => void;
}

export const CampusLifeView: React.FC<CampusLifeViewProps> = ({
  state,
  onAddExpense,
  onDeleteExpense,
  onUpdateBudget,
  onAddHabit,
  onToggleHabitDate,
  onDeleteHabit,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  const [subTab, setSubTab] = useState<'expenses' | 'habits' | 'bookmarks'>('expenses');

  // Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseItem['category']>('Canteen');
  const [expDate, setExpDate] = useState(toLocalDateString());
  const [expError, setExpError] = useState('');

  // Habit form
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState<HabitItem['category']>('Study');
  const [habitError, setHabitError] = useState('');

  // Bookmark form
  const [bmTitle, setBmTitle] = useState('');
  const [bmUrl, setBmUrl] = useState('');
  const [bmSubject, setBmSubject] = useState('CSA3426 Frontend Using JS');
  const [bmDesc, setBmDesc] = useState('');
  const [bmError, setBmError] = useState('');

  const totalSpent = useMemo(() => state.expenses.reduce((s, e) => s + e.amount, 0), [state.expenses]);
  const remainingBudget = state.profile.monthlyBudget - totalSpent;
  const budgetUsedPct =
    state.profile.monthlyBudget > 0 ? Math.min(100, Math.round((totalSpent / state.profile.monthlyBudget) * 100)) : 0;

  const last7Days = useMemo(() => {
    return [-6, -5, -4, -3, -2, -1, 0].map((offset) => {
      const dStr = addDays(offset);
      const label = new Date(`${dStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
      return { dateStr: dStr, label };
    });
  }, []);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!expTitle.trim()) {
      setExpError('Expense description is required.');
      return;
    }
    if (!amt || amt <= 0) {
      setExpError('Enter a valid positive amount.');
      return;
    }
    setExpError('');
    onAddExpense({
      id: uid('exp'),
      title: expTitle.trim(),
      amount: amt,
      category: expCategory,
      date: expDate || toLocalDateString(),
    });
    setExpTitle('');
    setExpAmount('');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      setHabitError('Habit name cannot be blank.');
      return;
    }
    setHabitError('');
    onAddHabit({
      id: uid('hab'),
      name: habitName.trim(),
      category: habitCategory,
      completedDates: [],
    });
    setHabitName('');
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmTitle.trim() || !bmUrl.trim()) {
      setBmError('Title and URL are required.');
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(bmUrl.trim()) ? bmUrl.trim() : `https://${bmUrl.trim()}`;
    setBmError('');
    onAddBookmark({
      id: uid('bm'),
      title: bmTitle.trim(),
      url: normalizedUrl,
      subject: bmSubject.trim() || 'General',
      description: bmDesc.trim(),
    });
    setBmTitle('');
    setBmUrl('');
    setBmDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Campus Life &amp; Daily Tools
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Student allowance tracker, 7-day habit streaks, and quick academic resource bookmarks.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start">
          {(
            [
              { id: 'expenses', label: 'Expense Tracker' },
              { id: 'habits', label: 'Daily Habits' },
              { id: 'bookmarks', label: 'Resource Links' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                subTab === t.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* EXPENSE TRACKER */}
      {subTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Total Spent This Cycle</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                    ₹{totalSpent.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Remaining Allowance</p>
                  <p
                    className={`text-xl font-bold font-mono tabular-nums ${
                      remainingBudget < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    ₹{remainingBudget.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${remainingBudget < 0 ? 'bg-red-600' : 'bg-zinc-900 dark:bg-zinc-100'}`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Monthly Allowance Budget (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={state.profile.monthlyBudget}
                  onChange={(e) => onUpdateBudget(Number(e.target.value))}
                  aria-label="Monthly budget"
                  className="w-28 px-2.5 py-1 text-right font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-sm font-bold">Recent Student Expenses</h2>
              </div>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {state.expenses.length === 0 ? (
                  <li className="p-8 text-center text-xs text-zinc-400">No expenses logged yet.</li>
                ) : (
                  [...state.expenses]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((exp) => (
                      <li key={exp.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {exp.title}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {exp.category} · {formatReadableDate(exp.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono font-semibold tabular-nums">
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp.id)}
                            aria-label="Delete expense"
                            className="text-zinc-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>

          <form
            onSubmit={handleAddExpense}
            className="lg:col-span-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5 self-start"
            noValidate
          >
            <h2 className="text-base font-bold">Log Expense</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <input
                type="text"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="e.g., Lab Record Printouts"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="120"
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseItem['category'])}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              >
                <option value="Canteen">Canteen</option>
                <option value="Books & Print">Books &amp; Print</option>
                <option value="Transport">Transport</option>
                <option value="Hostel & Rent">Hostel &amp; Rent</option>
                <option value="Tech & Subscriptions">Tech &amp; Subscriptions</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {expError && <p className="text-xs text-red-600 dark:text-red-400">{expError}</p>}
            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
            >
              Add Expense
            </button>
          </form>
        </div>
      )}

      {/* HABIT TRACKER */}
      {subTab === 'habits' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <th className="py-3 px-5 font-medium">Daily Habit</th>
                  {last7Days.map((d) => (
                    <th key={d.dateStr} className="py-3 px-3 font-medium text-center">
                      <div>{d.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400">{d.dateStr.slice(5)}</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 font-medium text-right">Streak</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {state.habits.map((habit) => (
                  <tr key={habit.id}>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{habit.name}</p>
                      <p className="text-[11px] text-zinc-500">{habit.category}</p>
                    </td>
                    {last7Days.map((d) => {
                      const done = habit.completedDates.includes(d.dateStr);
                      return (
                        <td key={d.dateStr} className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleHabitDate(habit.id, d.dateStr)}
                            aria-label={`Toggle ${habit.name} on ${d.dateStr}`}
                            className="inline-flex items-center justify-center p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            {done ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {calculateHabitStreak(habit.completedDates)}d
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteHabit(habit.id)}
                        className="text-zinc-400 hover:text-red-600"
                        aria-label="Delete habit"
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
            onSubmit={handleAddHabit}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-wrap items-center gap-3"
            noValidate
          >
            <input
              type="text"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="New daily student habit (e.g., 30 min JavaScript practice)..."
              className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            />
            <select
              value={habitCategory}
              onChange={(e) => setHabitCategory(e.target.value as HabitItem['category'])}
              className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            >
              <option value="Study">Study</option>
              <option value="Coding">Coding</option>
              <option value="Health">Health</option>
              <option value="Wellness">Wellness</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Habit</span>
            </button>
            {habitError && <span className="text-xs text-red-600 dark:text-red-400 w-full">{habitError}</span>}
          </form>
        </div>
      )}

      {/* BOOKMARKS */}
      {subTab === 'bookmarks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 self-start">
            {state.bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between gap-3"
              >
                <div>
                  <p className="text-[11px] font-medium text-zinc-500">{bm.subject}</p>
                  <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{bm.title}</h3>
                  {bm.description && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{bm.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    <span>Open Resource</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDeleteBookmark(bm.id)}
                    aria-label="Delete bookmark"
                    className="text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddBookmark}
            className="lg:col-span-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3.5 self-start"
            noValidate
          >
            <h2 className="text-base font-bold">Save Academic Resource Link</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Resource Title</label>
              <input
                type="text"
                value={bmTitle}
                onChange={(e) => setBmTitle(e.target.value)}
                placeholder="e.g., W3Schools JavaScript Tutorial"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">URL</label>
              <input
                type="url"
                value={bmUrl}
                onChange={(e) => setBmUrl(e.target.value)}
                placeholder="https://developer.mozilla.org"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Subject</label>
              <input
                type="text"
                value={bmSubject}
                onChange={(e) => setBmSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Short Note</label>
              <input
                type="text"
                value={bmDesc}
                onChange={(e) => setBmDesc(e.target.value)}
                placeholder="Optional description..."
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            {bmError && <p className="text-xs text-red-600 dark:text-red-400">{bmError}</p>}
            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
            >
              Save Link
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
