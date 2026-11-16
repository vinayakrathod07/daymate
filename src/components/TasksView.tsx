import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  CheckSquare,
  Square,
  Edit3,
  Download,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { TaskCategory, TaskItem, TaskPriority, TaskStatus } from '../types/daymate';
import { daysUntil, downloadTextFile, exportTasksToCsv, formatReadableDate, toLocalDateString, uid } from '../utils/storage';

interface TasksViewProps {
  tasks: TaskItem[];
  onAddTask: (task: TaskItem) => void;
  onUpdateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onClearCompleted,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('CSA3426 Frontend Using JS');
  const [formDueDate, setFormDueDate] = useState(toLocalDateString());
  const [formPriority, setFormPriority] = useState<TaskPriority>('Medium');
  const [formCategory, setFormCategory] = useState<TaskCategory>('Assignment');
  const [formMinutes, setFormMinutes] = useState(45);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter((t) => !t.completed && t.dueDate && daysUntil(t.dueDate) < 0).length;
    return { total, completed, pending, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pRank: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

    return [...tasks]
      .filter((t) => {
        if (statusFilter === 'pending' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (statusFilter === 'overdue' && (t.completed || !t.dueDate || daysUntil(t.dueDate) >= 0)) return false;
        if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
        if (q) {
          const hay = `${t.title} ${t.subject} ${t.category} ${t.notes || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return pRank[a.priority] - pRank[b.priority];
        if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
        return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
      });
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortBy]);

  const openNewModal = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormSubject('CSA3426 Frontend Using JS');
    setFormDueDate(toLocalDateString());
    setFormPriority('Medium');
    setFormCategory('Assignment');
    setFormMinutes(45);
    setFormNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormSubject(task.subject);
    setFormDueDate(task.dueDate);
    setFormPriority(task.priority);
    setFormCategory(task.category);
    setFormMinutes(task.estimatedMinutes);
    setFormNotes(task.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Task title is required and cannot be blank.');
      return;
    }
    if (!formSubject.trim()) {
      setFormError('Please specify a subject or course name.');
      return;
    }
    if (formMinutes <= 0 || Number.isNaN(formMinutes)) {
      setFormError('Estimated duration must be greater than 0 minutes.');
      return;
    }

    if (editingTaskId) {
      const existing = tasks.find((t) => t.id === editingTaskId);
      if (existing) {
        onUpdateTask({
          ...existing,
          title: formTitle.trim(),
          subject: formSubject.trim(),
          dueDate: formDueDate,
          priority: formPriority,
          category: formCategory,
          estimatedMinutes: Number(formMinutes),
          notes: formNotes.trim(),
        });
      }
    } else {
      onAddTask({
        id: uid('tsk'),
        title: formTitle.trim(),
        subject: formSubject.trim(),
        dueDate: formDueDate,
        priority: formPriority,
        category: formCategory,
        status: 'todo',
        completed: false,
        estimatedMinutes: Number(formMinutes),
        notes: formNotes.trim(),
        subtasks: [],
        createdAt: toLocalDateString(),
      });
    }
    setIsModalOpen(false);
  };

  const toggleCompletion = (task: TaskItem) => {
    const nextDone = !task.completed;
    onUpdateTask({
      ...task,
      completed: nextDone,
      status: nextDone ? 'done' : 'todo',
    });
  };

  const moveKanbanStatus = (task: TaskItem, status: TaskStatus) => {
    onUpdateTask({
      ...task,
      status,
      completed: status === 'done',
    });
  };

  const addSubtask = (task: TaskItem) => {
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;
    onUpdateTask({
      ...task,
      subtasks: [...task.subtasks, { id: uid('st'), title: trimmed, completed: false }],
    });
    setNewSubtaskText('');
  };

  const toggleSubtask = (task: TaskItem, subId: string) => {
    onUpdateTask({
      ...task,
      subtasks: task.subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s)),
    });
  };

  const handleExportCsv = () => {
    const csv = exportTasksToCsv(filteredTasks);
    downloadTextFile(`student_daymate_tasks_${toLocalDateString()}.csv`, csv, 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Tasks &amp; Assignments
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span>{counts.total} total</span>
            <span aria-hidden="true">·</span>
            <span>{counts.pending} pending</span>
            <span aria-hidden="true">·</span>
            <span>{counts.completed} completed</span>
            {counts.overdue > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-red-600 dark:text-red-400 font-medium">{counts.overdue} overdue</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          {counts.completed > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              Clear Completed
            </button>
          )}
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {(['all', 'pending', 'completed', 'overdue'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Kanban Board
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or subjects..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'All' | TaskPriority)}
            aria-label="Filter by priority"
            className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'created')}
            aria-label="Sort tasks"
            className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
          >
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Recently Added</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No matching tasks found</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Adjust your active filters or add a new academic assignment.
          </p>
          <button
            type="button"
            onClick={openNewModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Task</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const diff = task.dueDate ? daysUntil(task.dueDate) : 99;
              const completedSubs = task.subtasks.filter((s) => s.completed).length;

              return (
                <li key={task.id} className="transition-colors">
                  <div className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <button
                      type="button"
                      onClick={() => toggleCompletion(task)}
                      aria-label={`Toggle completion for ${task.title}`}
                      className="mt-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          task.completed
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{task.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            task.priority === 'High'
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : task.priority === 'Medium'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-zinc-500 dark:text-zinc-400'
                          }
                        >
                          {task.priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                        {task.subtasks.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {completedSubs}/{task.subtasks.length} steps
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          !task.completed && diff < 0
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {formatReadableDate(task.dueDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        aria-label="Toggle task details"
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(task)}
                        aria-label={`Edit ${task.title}`}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subtasks & Notes Drawer */}
                  {isExpanded && (
                    <div className="px-14 pb-4 pt-1 bg-zinc-50/70 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
                      {task.notes && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">{task.notes}</p>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Subtask Checklist</p>
                        {task.subtasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(task, sub.id)}
                              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              {sub.completed ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span
                              className={`text-xs ${
                                sub.completed
                                  ? 'line-through text-zinc-400'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {sub.title}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1 max-w-md">
                          <input
                            type="text"
                            value={newSubtaskText}
                            onChange={(e) => setNewSubtaskText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSubtask(task);
                              }
                            }}
                            placeholder="Add a checklist step..."
                            className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => addSubtask(task)}
                            className="px-2.5 py-1 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              { key: 'todo', label: 'To Do' },
              { key: 'in-progress', label: 'In Progress' },
              { key: 'done', label: 'Completed' },
            ] as const
          ).map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col"
              >
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{col.label}</h3>
                  <span className="text-xs font-mono tabular-nums text-zinc-500">{colTasks.length}</span>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {colTasks.length === 0 ? (
                    <p className="p-6 text-xs text-center text-zinc-400">No tasks in {col.label}</p>
                  ) : (
                    colTasks.map((task) => (
                      <div key={task.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {task.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                            aria-label="Edit task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {task.subject} · {task.priority} · {formatReadableDate(task.dueDate)}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <select
                            value={task.status}
                            onChange={(e) => moveKanbanStatus(task, e.target.value as TaskStatus)}
                            aria-label="Move task column"
                            className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md"
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingTaskId ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Prepare DBMS ER Diagram Submission"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Lab">Lab</option>
                    <option value="Project">Project</option>
                    <option value="Exam Prep">Exam Prep</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Est. Minutes
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={formMinutes}
                    onChange={(e) => setFormMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Submission details, rubric notes, or reference page..."
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {editingTaskId ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
