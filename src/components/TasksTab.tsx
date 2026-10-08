/**
 * NoteSphere OS — TasksTab
 * Primary view: List mode (Список дел) with detailed expandable task cards,
 * nested subtasks management, time blocking, expense attachments,
 * Kanban board with Eisenhower filter presets, and Long-term Goals.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { autoEisenhower } from '../utils/eisenhower';
import {
  Plus,
  Trash2,
  ListTodo,
  CheckSquare,
  Square,
  Target,
  AlertTriangle,
  Columns,
  Check,
  Play,
  GripVertical,
  DollarSign,
  FileText,
  Flame,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Trophy,
  Paperclip,
  Tag,
  Link,
  Folder,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { Task, Goal, Importance, Habit, Note } from '../types';
import { Language, t } from '../config/translations';
import { updateNoteChecklistContent } from '../utils/noteTasks';

interface TasksTabProps {
  tasks: Task[];
  goals: Goal[];
  habits?: Habit[];
  onAddTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (t: Task) => void;
  onAddGoal: (g: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoal: (g: Goal) => void;
  onAddTransaction?: (tx: any) => void;
  accentColor: string;
  notes?: Note[];
  onUpdateNote?: (n: Note) => void;
  language?: Language;
}

export default function TasksTab({
  tasks,
  goals,
  habits = [],
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onAddGoal,
  onDeleteGoal,
  onUpdateGoal,
  onAddTransaction,
  accentColor,
  notes = [],
  onUpdateNote,
  language = 'ru',
}: TasksTabProps) {
  // Navigation: 'list' is primary default view!
  const [tasksMode, setTasksMode] = useState<'list' | 'kanban' | 'goals'>('list');

  // Filter toolbar states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'next_week' | 'overdue' | 'no_date'>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Set of expanded task IDs for detailed viewing
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());

  const toggleTaskExpanded = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    triggerHaptic('light');
  };

  // Eisenhower filter preset inside Kanban
  const [eisenhowerPreset, setEisenhowerPreset] = useState<
    'all' | 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important'
  >('all');


  // Detailed new task form fields matching the mockup
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCreationType, setTaskCreationType] = useState<'task' | 'subtask' | 'goal'>('task');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('Работа');
  const [taskPriority, setTaskPriority] = useState<Importance>('medium');
  const [taskRecurrence, setTaskRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [taskDueDate, setTaskDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showCompletedArchive, setShowCompletedArchive] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  const [taskExpense, setTaskExpense] = useState('');
  const [taskExpenseCat, setTaskExpenseCat] = useState('Техника');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [taskReminder, setTaskReminder] = useState('15m');
  const [taskColor, setTaskColor] = useState('#6366f1');
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [attachedNoteId, setAttachedNoteId] = useState<string | null>(null);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const formattedDueDateLabel = useMemo(() => {
    if (!taskDueDate) return 'Выберите дату';
    const todayStr = new Date().toISOString().split('T')[0];
    if (taskDueDate === todayStr) {
      const d = new Date();
      const monthStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { month: 'short' });
      return `Сегодня, ${d.getDate()} ${monthStr}`;
    }
    const d = new Date(taskDueDate);
    const monthStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { month: 'short' });
    return `${d.getDate()} ${monthStr}`;
  }, [taskDueDate, language]);

  // New goal form fields
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalType, setGoalType] = useState<'short' | 'medium' | 'long'>('short');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalHabitIds, setGoalHabitIds] = useState<string[]>([]);

  // Draft subtask input per task ID
  const [draftSubtaskText, setDraftSubtaskText] = useState<Record<string, string>>({});

  // 30-Day Challenge Modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeActivity, setChallengeActivity] = useState('');
  const [challengeNoteId, setChallengeNoteId] = useState('');
  const [challengeStartDate, setChallengeStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Expanded subtask days state: taskId -> boolean (false = show 7 days, true = show all 30 days)
  const [expandedChallengeDays, setExpandedChallengeDays] = useState<Record<string, boolean>>({});

  // Expanded completed days state: taskId -> boolean (false = collapsed, true = expanded)
  const [expandedCompletedDays, setExpandedCompletedDays] = useState<Record<string, boolean>>({});

  const tr = (key: any, fallback: string) => (language ? t(language, key) : fallback);

  // Task Drag & Drop reorder state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const handleReorderTasks = (sourceId: string, targetId: string) => {
    const srcIndex = tasks.findIndex((t) => t.id === sourceId);
    const tgtIndex = tasks.findIndex((t) => t.id === targetId);
    if (srcIndex === -1 || tgtIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(srcIndex, 1);
    reordered.splice(tgtIndex, 0, moved);

    onUpdateTask(moved);
    triggerHaptic('success');
  };

  // 1. ADD NEW TASK
  const handleAddNewTask = () => {
    if (!taskTitle.trim()) return;

    if (taskCreationType === 'goal') {
      const newGoal: Goal = {
        id: `g-${Date.now()}`,
        name: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        type: 'short',
        targetDate: taskDueDate || new Date().toISOString().split('T')[0],
        progress: 0,
        tasks: [],
        habitIds: [],
      };
      onAddGoal(newGoal);
      triggerHaptic('success');
      setTaskTitle('');
      setTaskDescription('');
      return;
    }

    const parsedExpense = taskExpense ? parseFloat(taskExpense) : undefined;
    const isDone = taskStatus === 'completed';

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      isCompleted: isDone,
      status: taskStatus,
      color: taskColor,
      reminder: taskReminder !== 'none' ? taskReminder : undefined,
      tags: taskTags.length > 0 ? taskTags : undefined,
      attachedFile: attachedFile || undefined,
      fromNoteId: attachedNoteId || undefined,
      fromNoteTitle: attachedNoteId ? notes?.find((n) => n.id === attachedNoteId)?.title : undefined,
      taskType: taskCreationType,
      subtasks: [],
      dueDate: taskDueDate || undefined,
      dueTime: taskStartTime || undefined,
      priority: taskPriority,
      category: taskCategory,
      recurrence: taskRecurrence,
      progress: isDone ? 100 : 0,
      eisenhower: autoEisenhower(taskPriority, taskDueDate || undefined),
      expenseAmount: parsedExpense && !isNaN(parsedExpense) && parsedExpense > 0 ? parsedExpense : undefined,
      expenseCategory: parsedExpense ? taskExpenseCat : undefined,
      ...(taskStartTime && taskEndTime
        ? {
            timeBlock: {
              start: taskStartTime,
              end: taskEndTime,
            },
          }
        : {}),
    };

    onAddTask(newTask);
    triggerHaptic('success');
    setTaskTitle('');
    setTaskDescription('');
    setTaskStartTime('');
    setTaskEndTime('');
    setTaskExpense('');
    setTaskTags([]);
    setAttachedNoteId(null);
    setAttachedFile(null);
  };

  // Toggle task completion and auto-record expense if attached
  const handleToggleTaskCompletion = (task: Task) => {
    const nextCompleted = !task.isCompleted;

    onUpdateTask({
      ...task,
      isCompleted: nextCompleted,
      progress: nextCompleted ? 100 : task.subtasks.length > 0 ? task.progress : 0,
    });
    triggerHaptic('medium');

    if (nextCompleted && task.expenseAmount && onAddTransaction) {
      onAddTransaction({
        id: `tx-task-${Date.now()}`,
        type: 'expense',
        amount: task.expenseAmount,
        date: new Date().toISOString().split('T')[0],
        categoryId: task.expenseCategory || 'Техника',
        comment: `Списание по задаче: ${task.title}`,
      });
      triggerHaptic('success');
    }
  };

  // Add Subtask
  const handleAddSubTask = (taskId: string) => {
    const text = (draftSubtaskText[taskId] || '').trim();
    if (!text) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSubtasks = [...(task.subtasks || []), { id: `st-${Date.now()}`, title: text, isCompleted: false }];
    const completedCount = newSubtasks.filter((s) => s.isCompleted).length;
    const progress = Math.round((completedCount / newSubtasks.length) * 100);

    onUpdateTask({
      ...task,
      subtasks: newSubtasks,
      progress,
    });

    setDraftSubtaskText((prev) => ({ ...prev, [taskId]: '' }));
    triggerHaptic('light');
  };

  // Toggle Subtask (with automatic note checklist sync)
  const handleToggleSubTask = (task: Task, subtaskId: string) => {
    let toggledSubtask: { id: string; title: string; isCompleted: boolean } | undefined;

    const subtasks = (task.subtasks || []).map((st) => {
      if (st.id === subtaskId) {
        const nextCompleted = !st.isCompleted;
        toggledSubtask = { ...st, isCompleted: nextCompleted };
        return toggledSubtask;
      }
      return st;
    });

    const completedCount = subtasks.filter((s) => s.isCompleted).length;
    const progress = Math.round((completedCount / subtasks.length) * 100);

    onUpdateTask({
      ...task,
      subtasks,
      progress,
      isCompleted: progress === 100,
    });

    // If task has an associated note, sync the checkbox directly in the note
    if (toggledSubtask && task.fromNoteId && notes && onUpdateNote) {
      const targetNote = notes.find((n) => n.id === task.fromNoteId);
      if (targetNote) {
        const updatedNote = updateNoteChecklistContent(
          targetNote,
          toggledSubtask.title,
          toggledSubtask.isCompleted
        );
        onUpdateNote(updatedNote);
      }
    }

    triggerHaptic('light');
  };

  // Create 30-Day Challenge
  const handleCreate30DayChallenge = () => {
    const act = challengeActivity.trim();
    if (!act) return;

    const startDate = challengeStartDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(startDate);
    const isEn = language === 'en';

    const subtasks = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + (i - 1));
      const dateStr = d.toISOString().split('T')[0];
      subtasks.push({
        id: `c30-${Date.now()}-${i}`,
        title: `${isEn ? 'Day' : 'День'} ${i} (${dateStr}): ${act}`,
        isCompleted: false,
      });
    }

    const endD = new Date(baseDate);
    endD.setDate(baseDate.getDate() + 29);
    const endDateStr = endD.toISOString().split('T')[0];

    const targetNote = notes?.find((n) => n.id === challengeNoteId);

    // If attached to note, append markdown/HTML checklist inside note
    if (targetNote && onUpdateNote) {
      const headerTitle = isEn ? `🏆 30-Day Challenge: ${act}` : `🏆 30-дневный челлендж: ${act}`;
      const challengeBlock =
        `\n\n<!-- challenge-30-start -->\n` +
        `<div class="ns-challenge-30" style="margin-top: 16px; padding: 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(0,0,0,0.25);">\n` +
        `<h4>${headerTitle}</h4>\n` +
        subtasks.map((st) => `<p>- [ ] ${st.title}</p>`).join('\n') +
        `\n</div>\n<!-- challenge-30-end -->\n`;

      onUpdateNote({
        ...targetNote,
        content: (targetNote.content || '') + challengeBlock,
        updatedAt: new Date().toISOString(),
      });
    }

    const newChallengeTask: Task = {
      id: `task-c30-${Date.now()}`,
      title: `🏆 ${isEn ? '30 Days' : '30 дней'}: ${act}`,
      isCompleted: false,
      subtasks,
      dueDate: endDateStr,
      priority: 'high',
      category: targetNote?.categoryId || 'Здоровье',
      recurrence: 'daily',
      progress: 0,
      eisenhower: 'not-urgent-important',
      fromNoteId: targetNote?.id,
      fromNoteTitle: targetNote?.title || undefined,
      is30DayChallenge: true,
      challengeStartDate: startDate,
    };

    onAddTask(newChallengeTask);
    triggerHaptic('success');
    setShowChallengeModal(false);
    setChallengeActivity('');
    setChallengeNoteId('');
  };

  // Delete Subtask
  const handleDeleteSubTask = (task: Task, subtaskId: string) => {
    const subtasks = (task.subtasks || []).filter((st) => st.id !== subtaskId);
    const completedCount = subtasks.filter((s) => s.isCompleted).length;
    const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : task.isCompleted ? 100 : 0;

    onUpdateTask({
      ...task,
      subtasks,
      progress,
    });
    triggerHaptic('light');
  };

  // Add New Goal
  const handleAddNewGoal = () => {
    if (!goalName.trim()) return;

    const newGoal: Goal = {
      id: `g-${Date.now()}`,
      name: goalName.trim(),
      description: goalDesc || undefined,
      type: goalType,
      targetDate: goalTargetDate || new Date().toISOString().split('T')[0],
      progress: 0,
      tasks: [],
      habitIds: goalHabitIds,
    };

    onAddGoal(newGoal);
    setGoalName('');
    setGoalDesc('');
    setGoalTargetDate('');
    setGoalHabitIds([]);
    triggerHaptic('success');
  };

  const getPriorityBadgeClass = (prio: Importance) => {
    if (prio === 'critical') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (prio === 'high') return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    if (prio === 'medium') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-green-500/20 text-green-400 border border-green-500/30';
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weekEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toISOString().split('T')[0];
  }, []);
  const nextWeekEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (14 - d.getDay()));
    return d.toISOString().split('T')[0];
  }, []);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [tasks]);

  const taskMatchesFilters = (t: Task) => {
    // 1. Search Query
    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      const matchSubtasks = t.subtasks?.some((st) => st.title.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCat && !matchSubtasks) return false;
    }

    // 2. Category Filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) {
      return false;
    }

    // 3. Priority Filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
      return false;
    }

    // 4. Date Filter
    if (dateFilter === 'today') {
      if (!t.dueDate || t.dueDate !== todayStr) return false;
    } else if (dateFilter === 'week') {
      if (!t.dueDate || t.dueDate < todayStr || t.dueDate > weekEndStr) return false;
    } else if (dateFilter === 'next_week') {
      if (!t.dueDate || t.dueDate <= weekEndStr || t.dueDate > nextWeekEndStr) return false;
    } else if (dateFilter === 'overdue') {
      if (!t.dueDate || t.dueDate >= todayStr || t.isCompleted) return false;
    } else if (dateFilter === 'no_date') {
      if (t.dueDate) return false;
    }

    return true;
  };

  const filteredTasksList = useMemo(() => {
    return tasks.filter(taskMatchesFilters);
  }, [tasks, taskSearchQuery, categoryFilter, priorityFilter, dateFilter, todayStr, weekEndStr, nextWeekEndStr]);

  const activeTasks = filteredTasksList.filter((t) => !t.isCompleted);
  const completedTasks = filteredTasksList.filter((t) => t.isCompleted);

  const filteredKanbanTasks = tasks.filter((t) => {
    if (eisenhowerPreset === 'all') return true;
    return t.eisenhower === eisenhowerPreset;
  });

  const renderTaskCard = (task: Task) => {
    const isExpanded = expandedTaskIds.has(task.id);
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;

    return (
      <div key={task.id} className="relative rounded-2xl overflow-hidden group/task-swipe select-none">
        {/* Swipe cues revealed beneath the card */}
        {/* Right swipe indicator (Complete/Restore - Emerald) */}
        <div className="absolute inset-y-0 left-0 w-36 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-l-2xl flex items-center pl-4 gap-2 text-white font-bold text-xs shadow-inner">
          <Check size={18} className="animate-pulse" />
          <span>{task.isCompleted ? tr('task_swipe_restore', 'Вернуть') : tr('task_swipe_done', 'Выполнить')}</span>
        </div>

        {/* Left swipe indicator (Delete - Rose) */}
        <div className="absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-rose-600 to-rose-500 rounded-r-2xl flex items-center justify-end pr-4 gap-2 text-white font-bold text-xs shadow-inner">
          <span>{tr('task_swipe_delete', 'Удалить')}</span>
          <Trash2 size={18} className="animate-pulse" />
        </div>

        {/* Foreground draggable task card */}
        <motion.div
          layout
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.x > 75) {
              triggerHaptic('success');
              handleToggleTaskCompletion(task);
            } else if (info.offset.x < -75) {
              triggerHaptic('warning');
              onDeleteTask(task.id);
            }
          }}
          className="relative z-10 p-3.5 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl shadow-sm transition-colors space-y-3"
        >
        {/* Top Row: Checkbox, Title, Quick Badges, Expand Trigger */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => handleToggleTaskCompletion(task)}
              className="text-slate-400 hover:text-emerald-500 transition cursor-pointer mt-0.5 flex-shrink-0"
              title={task.isCompleted ? 'Отметить невыполненной' : 'Завершить задачу'}
            >
              {task.isCompleted ? (
                <CheckSquare className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div
                onClick={() => toggleTaskExpanded(task.id)}
                className="cursor-pointer group flex items-center justify-between"
              >
                <span
                  className={`font-semibold text-xs leading-snug truncate block ${
                    task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'
                  }`}
                >
                  {task.title}
                </span>
              </div>

              {/* Quick Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {task.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-mono">
                    {task.category}
                  </span>
                )}

                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </span>

                {task.is30DayChallenge && (
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold font-mono border border-amber-200 dark:border-transparent">
                    🏆 {tr('challenge_badge', '30-дневный челлендж')}
                  </span>
                )}

                {task.fromNoteTitle && (
                  <span className="text-[10px] bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono border border-violet-200 dark:border-transparent">
                    <FileText size={10} /> {task.fromNoteTitle}
                  </span>
                )}

                {task.expenseAmount && (
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-200 dark:border-transparent">
                    💰 {task.expenseAmount.toLocaleString('ru-RU')} сум
                  </span>
                )}

                {task.dueDate && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Calendar size={11} /> {task.dueDate}
                  </span>
                )}

                {(task.dueTime || task.timeBlock?.start) && (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono flex items-center gap-1 bg-cyan-50 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-transparent">
                    <Clock size={11} /> {task.dueTime || `${task.timeBlock?.start} – ${task.timeBlock?.end}`}
                  </span>
                )}

                {subtasks.length > 0 && (
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-200 dark:border-transparent">
                    {completedSubtasks}/{subtasks.length} ({task.progress}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: Expand Chevron & Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => toggleTaskExpanded(task.id, e)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title={isExpanded ? 'Свернуть детали' : 'Развернуть подзадачи и подробности'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Удалить задачу"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${task.progress || (task.isCompleted ? 100 : 0)}%`,
              backgroundColor: task.isCompleted ? '#10b981' : accentColor,
            }}
          />
        </div>

        {/* 🔽 EXPANDED DETAILS: Subtasks & Time Management */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3"
            >
              {/* Subtasks Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check size={12} className="text-violet-500 dark:text-violet-400" />
                  {task.is30DayChallenge
                    ? `Чеклист челленджа (${completedSubtasks}/${subtasks.length}):`
                    : `Чеклист подзадач (${completedSubtasks}/${subtasks.length}):`}
                </span>

                {subtasks.length > 0 && (
                  <>
                    {task.is30DayChallenge || subtasks.length >= 14 ? (
                      /* 🏆 30-DAY CHALLENGE SUBTASKS: First 7 days, toggle arrow, collapsible completed days */
                      (() => {
                        const activeDays = subtasks.filter((s) => !s.isCompleted);
                        const completedDays = subtasks.filter((s) => s.isCompleted);
                        const isAllExpanded = !!expandedChallengeDays[task.id];
                        const displayedActive = isAllExpanded ? activeDays : activeDays.slice(0, 7);
                        const isCompletedExpanded = !!expandedCompletedDays[task.id];

                        return (
                          <div className="space-y-2 pl-1">
                            {/* Active Days (First 7 or all if expanded) */}
                            {displayedActive.length > 0 ? (
                              <div className="space-y-1.5">
                                {displayedActive.map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-200 hover:border-violet-400 dark:hover:border-violet-500/30 transition"
                                  >
                                    <button
                                      onClick={() => handleToggleSubTask(task, st.id)}
                                      className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                                    >
                                      <Square size={16} className="text-violet-500 dark:text-violet-400 hover:text-violet-600 flex-shrink-0" />
                                      <span className="truncate font-medium">{st.title}</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubTask(task, st.id)}
                                      className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer text-xs"
                                      title="Удалить день"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/20 rounded-xl text-center text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                                <span>🎉 Все 30 дней успешно выполнены! Поздравляем!</span>
                              </div>
                            )}

                            {/* Arrow button for toggling all days vs 7 days */}
                            {activeDays.length > 7 && (
                              <button
                                onClick={() =>
                                  setExpandedChallengeDays((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-violet-50 dark:bg-violet-600/10 hover:bg-violet-100 dark:hover:bg-violet-600/20 border border-violet-200 dark:border-violet-500/20 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white transition cursor-pointer"
                              >
                                {isAllExpanded ? (
                                  <>
                                    <ChevronUp size={14} />
                                    <span>{tr('challenge_collapse_7', 'Свернуть до 7 дней')}</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={14} />
                                    <span>
                                      {tr('challenge_show_all', 'Показать все 30 дней')} ({activeDays.length - 7} {tr('challenge_remaining', 'осталось')})
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Collapsible Completed Days Section */}
                            {completedDays.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-1.5">
                                <button
                                  onClick={() =>
                                    setExpandedCompletedDays((prev) => ({
                                      ...prev,
                                      [task.id]: !prev[task.id],
                                    }))
                                  }
                                  className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                                >
                                  <span className="flex items-center gap-2">
                                    <CheckSquare size={14} className="text-emerald-500 dark:text-emerald-400" />
                                    <span>
                                      {tr('challenge_completed_days', 'Выполненные дни')} ({completedDays.length}/{subtasks.length})
                                    </span>
                                  </span>
                                  {isCompletedExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {isCompletedExpanded && (
                                  <div className="space-y-1.5 pl-2 pt-1">
                                    {completedDays.map((st) => (
                                      <div
                                        key={st.id}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400"
                                      >
                                        <button
                                          onClick={() => handleToggleSubTask(task, st.id)}
                                          className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                                          title="Кликните, чтобы вернуть день в активные"
                                        >
                                          <CheckSquare size={14} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                                          <span className="truncate line-through text-slate-400 dark:text-slate-500">{st.title}</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubTask(task, st.id)}
                                          className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer text-xs"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      /* STANDARD SUBTASKS */
                      <div className="space-y-1.5 pl-2">
                        {subtasks.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <button
                              onClick={() => handleToggleSubTask(task, st.id)}
                              className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                            >
                              {st.isCompleted ? (
                                <CheckSquare size={14} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Square size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              )}
                              <span className={`truncate ${st.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                                {st.title}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteSubTask(task, st.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Add Subtask Input (only for normal tasks) */}
                {!task.is30DayChallenge && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="text"
                      placeholder="+ Добавить подзадачу (Enter)..."
                      value={draftSubtaskText[task.id] || ''}
                      onChange={(e) =>
                        setDraftSubtaskText((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubTask(task.id);
                      }}
                      className="flex-1 py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={() => handleAddSubTask(task.id)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Добавить
                    </button>
                  </div>
                )}
              </div>

              {/* Quick details footer info */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Повтор: {task.recurrence === 'none' ? 'Без повтора' : task.recurrence}</span>
                {task.expenseAmount && (
                  <span className="text-amber-600 dark:text-amber-400">Связан с бюджетом: {task.expenseCategory || 'Техника'}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
    );
  };

  return (
    <div id="tasks-tab-wrapper" className="space-y-5 max-w-6xl mx-auto p-1 font-sans">
      {/* MODE NAVIGATION BAR: Список дел is #1 + 30-Day Challenge button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div id="tasks-mode-selector" className="flex bg-slate-100 dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] p-1.5 rounded-2xl gap-1.5 max-w-md shadow-sm">
          {[
            { id: 'list', label: 'Список дел', icon: ListTodo },
            { id: 'kanban', label: 'Канбан-Доска', icon: Columns },
            { id: 'goals', label: 'Цели', icon: Target },
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = tasksMode === item.id;
            return (
              <motion.button
                id={`tasks-tab-${item.id}`}
                key={item.id}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => {
                  setTasksMode(item.id as any);
                  triggerHaptic('light');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setShowChallengeModal(true);
            triggerHaptic('light');
          }}
          className="py-2 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1e2638] dark:hover:bg-[#252f44] border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white font-bold text-xs flex items-center gap-2 shadow-sm dark:shadow-md transition cursor-pointer active:scale-95"
        >
          <Trophy size={15} className="text-amber-500 dark:text-amber-400" />
          <span>{tr('challenge_30_btn', '🔥 30-дневный челлендж')}</span>
        </button>
      </div>

      {/* -------------------- TAB VIEW 1: EXPANDABLE DETAILED TASK LIST -------------------- */}
      {tasksMode === 'list' && (
        <div id="tasks-list-layout" className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
          {/* Creator Form matching Mockup (Left Column) */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-md h-fit">
              {/* Header with Creation Mode Switcher */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base flex items-center gap-2">
                  <span>Создать задачу</span>
                </h3>
                <div className="flex items-center bg-slate-100 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskCreationType('task');
                      triggerHaptic('light');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      taskCreationType === 'task'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {taskCreationType === 'task' && <Check size={12} className="text-indigo-500 dark:text-indigo-400" />}
                    <span>Задача</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskCreationType('subtask');
                      triggerHaptic('light');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      taskCreationType === 'subtask'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Подзадача</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskCreationType('goal');
                      triggerHaptic('light');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      taskCreationType === 'goal'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Цель</span>
                  </button>
                </div>
              </div>

              {/* Title input */}
              <input
                type="text"
                placeholder="Введите название задачи..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNewTask();
                }}
                className="w-full py-2.5 sm:py-3 px-3.5 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] focus:border-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none text-xs sm:text-sm font-sans transition shadow-inner"
              />

              {/* Metadata tags row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Pill */}
                <div
                  onClick={(e) => {
                    const inp = e.currentTarget.querySelector('input');
                    if (inp) {
                      try { (inp as any).showPicker?.(); } catch {}
                    }
                  }}
                  className="relative flex items-center bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded-xl gap-1.5 transition cursor-pointer"
                >
                  <Calendar size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  />
                  {taskDueDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskDueDate('');
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-0.5 cursor-pointer"
                      title="Очистить дату"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Time Pill */}
                <div
                  onClick={(e) => {
                    const inp = e.currentTarget.querySelector('input');
                    if (inp) {
                      try { (inp as any).showPicker?.(); } catch {}
                    }
                  }}
                  className="relative flex items-center bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded-xl gap-1.5 transition cursor-pointer"
                >
                  <Clock size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <input
                    type="time"
                    value={taskStartTime}
                    onChange={(e) => setTaskStartTime(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  />
                  {taskStartTime && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskStartTime('');
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-0.5 cursor-pointer"
                      title="Очистить время"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Priority Pill */}
                <div className="relative flex items-center bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] text-xs px-2.5 py-1.5 rounded-xl gap-1.5 transition">
                  <span className={`w-2 h-2 rounded-full ${taskPriority === 'critical' ? 'bg-red-500' : taskPriority === 'high' ? 'bg-orange-500' : taskPriority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Importance)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
                  >
                    <option value="low" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Низкий</option>
                    <option value="medium" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Средний</option>
                    <option value="high" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Высокий</option>
                    <option value="critical" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Срочный</option>
                  </select>
                </div>

                {/* Project Pill */}
                <div className="relative flex items-center bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] text-xs px-2.5 py-1.5 rounded-xl gap-1.5 transition">
                  <Folder size={13} className="text-slate-500 dark:text-slate-400" />
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
                  >
                    <option value="Работа" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Работа</option>
                    <option value="Учеба" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Учеба</option>
                    <option value="Дом" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Дом</option>
                    <option value="Финансы" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Финансы</option>
                    <option value="Здоровье" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Здоровье</option>
                    <option value="Личное" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Личное</option>
                  </select>
                </div>
              </div>

              {/* Description textarea */}
              <textarea
                rows={3}
                placeholder="Добавьте описание, заметки или ссылку..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] focus:border-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none text-xs leading-relaxed resize-none transition shadow-inner font-sans"
              />

              {/* Action pills row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const file = prompt('Укажите имя или ссылку на файл:', 'document.pdf');
                    if (file) setAttachedFile(file);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                    attachedFile
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1a2336] border-slate-200 dark:border-[#222e47] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Paperclip size={13} />
                  <span>{attachedFile ? attachedFile : 'Добавить файл'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTagInput((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                    taskTags.length > 0 || showTagInput
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1a2336] border-slate-200 dark:border-[#222e47] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Tag size={13} />
                  <span>{taskTags.length > 0 ? `${taskTags.length} тегов` : 'Добавить тег'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNotePicker((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                    attachedNoteId || showNotePicker
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-700 dark:text-violet-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1a2336] border-slate-200 dark:border-[#222e47] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Link size={13} />
                  <span>{attachedNoteId ? notes?.find(n => n.id === attachedNoteId)?.title || 'Заметка' : 'Связать с заметкой'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (taskTitle) {
                      setTaskDescription((prev) => (prev ? prev + '\n' : '') + `✨ AI План: разбить задачу на 3 ключевых этапа.`);
                      triggerHaptic('light');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600/10 to-pink-600/10 hover:from-violet-600/20 hover:to-pink-600/20 border border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles size={13} className="text-amber-500 dark:text-amber-300" />
                  <span>AI</span>
                </button>
              </div>

              {/* Inline tag input if opened */}
              {showTagInput && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Введите тег и нажмите Enter..."
                    value={tagInputValue}
                    onChange={(e) => setTagInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInputValue.trim()) {
                        e.preventDefault();
                        if (!taskTags.includes(tagInputValue.trim())) {
                          setTaskTags([...taskTags, tagInputValue.trim()]);
                        }
                        setTagInputValue('');
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs px-2.5 py-1.5 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tagInputValue.trim() && !taskTags.includes(tagInputValue.trim())) {
                        setTaskTags([...taskTags, tagInputValue.trim()]);
                        setTagInputValue('');
                      }
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Inline note selector if opened */}
              {showNotePicker && notes && notes.length > 0 && (
                <div className="p-2 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] rounded-xl max-h-32 overflow-y-auto space-y-1">
                  <div
                    onClick={() => { setAttachedNoteId(null); setShowNotePicker(false); }}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded cursor-pointer"
                  >
                    — Без привязки к заметке —
                  </div>
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { setAttachedNoteId(n.id); setShowNotePicker(false); }}
                      className={`text-xs px-2 py-1 rounded cursor-pointer transition ${attachedNoteId === n.id ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
                    >
                      📄 {n.title}
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible section divider */}
              <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638]">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen((p) => !p)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition py-1 cursor-pointer"
                >
                  <span>Дополнительные настройки</span>
                  {isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Collapsible 2-Column Advanced Settings */}
              {isAdvancedOpen && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Повторение</label>
                        <select
                          value={taskRecurrence}
                          onChange={(e) => setTaskRecurrence(e.target.value as any)}
                          className="w-full py-2 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="none">Без повторения</option>
                          <option value="daily">Каждый день</option>
                          <option value="weekly">Каждую неделю</option>
                          <option value="monthly">Каждый месяц</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Статус</label>
                        <select
                          value={taskStatus}
                          onChange={(e) => setTaskStatus(e.target.value as any)}
                          className="w-full py-2 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="todo">🔵 Не начата</option>
                          <option value="in_progress">🟡 В процессе</option>
                          <option value="completed">🟢 Завершена</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Напоминание</label>
                        <select
                          value={taskReminder}
                          onChange={(e) => setTaskReminder(e.target.value)}
                          className="w-full py-2 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="none">Без напоминания</option>
                          <option value="0m">В момент события</option>
                          <option value="15m">За 15 минут</option>
                          <option value="30m">За 30 минут</option>
                          <option value="1h">За 1 час</option>
                          <option value="1d">За 1 день</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Приоритет</label>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] p-1 rounded-xl">
                          {[
                            { id: 'low', label: 'Низкий' },
                            { id: 'medium', label: 'Средний' },
                            { id: 'high', label: 'Высокий' },
                            { id: 'critical', label: 'Срочный' },
                          ].map((p) => {
                            const isSelected = taskPriority === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTaskPriority(p.id as Importance)}
                                className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition text-center cursor-pointer whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-[#5865F2] text-white shadow-xs font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Цвет</label>
                        <div className="flex items-center gap-2 pt-0.5">
                          {[
                            '#6366f1',
                            '#3b82f6',
                            '#06b6d4',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#64748b',
                          ].map((hex) => {
                            const isSelected = taskColor === hex;
                            return (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => setTaskColor(hex)}
                                className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                                  isSelected ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: hex }}
                              >
                                {isSelected && <Check size={12} className="text-white drop-shadow" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Проект</label>
                        <select
                          value={taskCategory}
                          onChange={(e) => setTaskCategory(e.target.value)}
                          className="w-full py-2 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          {['Работа', 'Учеба', 'Дом', 'Финансы', 'Здоровье', 'Личное'].map((c) => (
                            <option key={c} value={c}>📁 {c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Buttons row at bottom */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#1e2638]">
                    <button
                      type="button"
                      onClick={() => {
                        setTaskTitle('');
                        setTaskDescription('');
                        setTaskExpense('');
                        triggerHaptic('light');
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1e2638] hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Отмена
                    </button>

                    <button
                      type="button"
                      onClick={handleAddNewTask}
                      className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Создать задачу</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Task Listing Panel with Expandable Cards (Right Column) */}
          <div className="xl:col-span-7 space-y-3 max-h-[740px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white text-sm pb-1 border-b border-slate-200 dark:border-white/10">
              <span className="flex items-center gap-2">
                <ListTodo size={16} className="text-violet-500 dark:text-violet-400" />
                <span>Задачи ({filteredTasksList.length}{filteredTasksList.length !== tasks.length ? ` из ${tasks.length}` : ''})</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Выполнено: {tasks.filter((t) => t.isCompleted).length} / {tasks.length}
              </span>
            </div>

            {/* Smart Filters and Search Toolbar */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3 space-y-2.5 shadow-xs">
              {/* Search + Category & Priority Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Поиск по задачам и подзадачам..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                  {taskSearchQuery && (
                    <button
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category selector */}
                {availableCategories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">📁 Все категории</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                {/* Priority selector */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">⚡ Все приоритеты</option>
                  <option value="critical">🔥 Критичный</option>
                  <option value="high">🟠 Высокий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="low">🟢 Обычный</option>
                </select>
              </div>

              {/* Date Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
                  <Calendar size={12} />
                  <span>Срок:</span>
                </span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'today', label: 'Сегодня' },
                  { id: 'week', label: 'На этой неделе' },
                  { id: 'next_week', label: 'След. неделя' },
                  { id: 'overdue', label: '⚠️ Просроченные' },
                  { id: 'no_date', label: 'Без даты' },
                ].map((df) => (
                  <button
                    key={df.id}
                    onClick={() => {
                      setDateFilter(df.id as any);
                      triggerHaptic('light');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      dateFilter === df.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#111622] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2638]'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}

                {(taskSearchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setTaskSearchQuery('');
                      setCategoryFilter('all');
                      setPriorityFilter('all');
                      setDateFilter('all');
                      triggerHaptic('light');
                    }}
                    className="ml-auto px-2 py-0.5 text-[10px] text-rose-500 hover:text-rose-400 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            {activeTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="bg-white dark:bg-[#0e1422] border border-dashed border-slate-300 dark:border-[#1e2638] rounded-2xl p-12 text-center text-slate-500 text-xs shadow-sm">
                {tasks.length > 0 ? 'Нет задач, подходящих под выбранные фильтры.' : 'Список пуст. Создайте первую подробную задачу слева!'}
              </div>
            ) : (
              <>
                {/* Active Tasks */}
                {activeTasks.map(renderTaskCard)}

                {/* Collapsible Completed Tasks Archive */}
                {completedTasks.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-[#1e2638] space-y-2.5">
                    <button
                      onClick={() => setShowCompletedArchive((p) => !p)}
                      className="flex items-center justify-between w-full py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer text-xs font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <CheckSquare size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <span>Архив выполненных задач ({completedTasks.length})</span>
                      </span>
                      {showCompletedArchive ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {showCompletedArchive && (
                      <div className="space-y-2.5">
                        {completedTasks.map(renderTaskCard)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------- TAB VIEW 2: KANBAN BOARD WITH EISENHOWER FILTER -------------------- */}
      {tasksMode === 'kanban' && (
        <div className="space-y-4">
          {/* Smart Eisenhower Matrix Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0e1422] p-3 rounded-2xl border border-slate-200 dark:border-[#1e2638] shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] px-2 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Матрица Эйзенхауэра:
              </span>
              {[
                { id: 'all', label: 'Все задачи' },
                { id: 'urgent-important', label: '🔥 Срочно & Важно' },
                { id: 'not-urgent-important', label: '📅 Важно, не срочно' },
                { id: 'urgent-not-important', label: '⚡ Срочно, не важно' },
                { id: 'not-urgent-not-important', label: '☕ Не срочно' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEisenhowerPreset(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    eisenhowerPreset === p.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500 font-mono px-2">
              Показано: {filteredKanbanTasks.length} из {tasks.length}
            </span>
          </div>

          {/* 3 Kanban Columns */}
          <div id="kanban-layout" className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
            {/* Column 1: To Do */}
            <div className="bg-slate-50/80 dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 space-y-3 flex flex-col min-h-[480px] shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2638]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">К выполнению</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                  {filteredKanbanTasks.filter((t) => !t.isCompleted && (t.progress || 0) < 50).length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {filteredKanbanTasks.filter((t) => !t.isCompleted && (t.progress || 0) < 50).length === 0 ? (
                  <div className="flex-1 h-44 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-[#1e2638] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <span className="text-xl mb-1">☕</span>
                    <span>Нет задач к выполнению</span>
                  </div>
                ) : (
                  filteredKanbanTasks
                    .filter((t) => !t.isCompleted && (t.progress || 0) < 50)
                    .map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        className="p-3.5 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-500/50 rounded-xl shadow-xs space-y-2.5 transition-all hover:translate-y-[-2px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-800 dark:text-white leading-snug">{t.title}</span>
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {t.fromNoteTitle && (
                            <span className="bg-slate-100 dark:bg-[#1e2638] text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded font-mono">
                              📝 {t.fromNoteTitle}
                            </span>
                          )}
                          {t.expenseAmount && (
                            <span className="bg-slate-100 dark:bg-[#1e2638] text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              💰 {t.expenseAmount.toLocaleString('ru-RU')} сум
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#1e2638]">
                          <button
                            onClick={() => onUpdateTask({ ...t, progress: 50 })}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            В процесс →
                          </button>
                          <button
                            onClick={() => handleToggleTaskCompletion(t)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                          >
                            Завершить ✓
                          </button>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-slate-50/80 dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 space-y-3 flex flex-col min-h-[480px] shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2638]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h4 className="font-bold text-xs uppercase text-blue-600 dark:text-blue-400">В процессе</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                  {filteredKanbanTasks.filter((t) => !t.isCompleted && (t.progress || 0) >= 50).length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {filteredKanbanTasks.filter((t) => !t.isCompleted && (t.progress || 0) >= 50).length === 0 ? (
                  <div className="flex-1 h-44 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-[#1e2638] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <span className="text-xl mb-1">⚡</span>
                    <span>Нет задач в процессе</span>
                  </div>
                ) : (
                  filteredKanbanTasks
                    .filter((t) => !t.isCompleted && (t.progress || 0) >= 50)
                    .map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        className="p-3.5 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-500/50 rounded-xl shadow-xs space-y-2.5 transition-all hover:translate-y-[-2px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-800 dark:text-white leading-snug">{t.title}</span>
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {t.fromNoteTitle && (
                            <span className="bg-slate-100 dark:bg-[#1e2638] text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded font-mono">
                              📝 {t.fromNoteTitle}
                            </span>
                          )}
                          {t.expenseAmount && (
                            <span className="bg-slate-100 dark:bg-[#1e2638] text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              💰 {t.expenseAmount.toLocaleString('ru-RU')} сум
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#1e2638]">
                          <button
                            onClick={() => onUpdateTask({ ...t, progress: 0 })}
                            className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline font-semibold cursor-pointer"
                          >
                            ← Назад
                          </button>
                          <button
                            onClick={() => handleToggleTaskCompletion(t)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                          >
                            Завершить ✓
                          </button>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </div>

            {/* Column 3: Completed */}
            <div className="bg-slate-50/80 dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 space-y-3 flex flex-col min-h-[480px] shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2638]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="font-bold text-xs uppercase text-emerald-600 dark:text-emerald-400">Завершено</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                  {filteredKanbanTasks.filter((t) => t.isCompleted).length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {filteredKanbanTasks.filter((t) => t.isCompleted).length === 0 ? (
                  <div className="flex-1 h-44 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-[#1e2638] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <span className="text-xl mb-1">🎯</span>
                    <span>Пока нет завершённых</span>
                  </div>
                ) : (
                  filteredKanbanTasks
                    .filter((t) => t.isCompleted)
                    .map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        className="p-3.5 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-400 line-through leading-snug">
                            {t.title}
                          </span>
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {t.expenseAmount && (
                          <span className="text-[10px] text-emerald-400 font-mono block">
                            ✓ Списано: {t.expenseAmount.toLocaleString('ru-RU')} сум
                          </span>
                        )}

                        <button
                          onClick={() => onUpdateTask({ ...t, isCompleted: false, progress: 50 })}
                          className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer block"
                        >
                          ↩ Вернуть в работу
                        </button>
                      </motion.div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB VIEW 3: GOALS -------------------- */}
      {tasksMode === 'goals' && (
        <div id="goals-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-md h-fit">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Поставить долгосрочную цель</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Название цели</label>
              <input
                type="text"
                placeholder="Например: Выучить TypeScript"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white rounded-xl focus:border-indigo-500 outline-none text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Срок достижения</label>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white text-xs rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <button
              onClick={handleAddNewGoal}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition active:scale-95 shadow-lg cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
            >
              + Зафиксировать цель
            </button>
          </div>

          <div className="lg:col-span-2 space-y-3 max-h-[680px] overflow-y-auto pr-1">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Ваши активные цели ({goals.length})</h3>
            {goals.length === 0 ? (
              <div className="bg-white dark:bg-[#0e1422]/90 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3 shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl shadow-inner">
                  🎯
                </div>
                <p className="font-semibold text-slate-800 dark:text-white text-sm">Нет активных целей</p>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Поставьте свою первую амбициозную цель слева, чтобы превратить мечты в структурированные вехи и синхронизировать ежедневные привычки.
                </p>
              </div>
            ) : (
              goals.map((goal) => {
                const progress = Math.min(100, Math.max(0, goal.progress || 0));
                const isDone = progress === 100;
                const updateProgress = (newVal: number) => {
                  const clamped = Math.min(100, Math.max(0, newVal));
                  onUpdateGoal({ ...goal, progress: clamped });
                  triggerHaptic(clamped === 100 ? 'success' : 'light');
                };

                return (
                  <div
                    key={goal.id}
                    className={`p-4 bg-white dark:bg-slate-900/90 border rounded-2xl shadow-sm dark:shadow-xl space-y-3.5 backdrop-blur-xl transition-all ${
                      isDone
                        ? 'border-emerald-500/40 bg-emerald-50/60 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900/90'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Top: Title, Type Pill, Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{goal.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/25">
                            {goal.type === 'short' ? 'Краткосрочная' : goal.type === 'medium' ? 'Среднесрочная' : 'Долгосрочная'}
                          </span>
                          {isDone && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1 animate-pulse">
                              <Check size={11} /> Достигнута!
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{goal.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                        title="Удалить цель"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Header: Percentage & Deadline */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Прогресс:</span>
                        <span className={`text-base font-black font-mono ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-300'}`}>
                          {progress}%
                        </span>
                      </div>
                      {goal.targetDate && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                          <Calendar size={12} className="text-amber-500 dark:text-amber-400" />
                          <span>Дедлайн: {goal.targetDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Visual Animated Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        className={`h-full rounded-full transition-colors ${
                          isDone
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/50'
                            : 'bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 shadow-md shadow-violet-500/30'
                        }`}
                      />
                    </div>

                    {/* Slider Control */}
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={progress}
                        onChange={(e) => updateProgress(Number(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                      />
                    </div>

                    {/* Step-by-Step Filling Buttons */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-white/5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateProgress(progress - 10)}
                          disabled={progress <= 0}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          title="Уменьшить на 10%"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => updateProgress(progress + 10)}
                          disabled={progress >= 100}
                          className="px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-600/20 hover:bg-violet-100 dark:hover:bg-violet-600/40 disabled:opacity-40 disabled:cursor-not-allowed border border-violet-200 dark:border-violet-500/30 text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white transition cursor-pointer"
                          title="Прибавить 10%"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() => updateProgress(progress + 25)}
                          disabled={progress >= 100}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition cursor-pointer"
                          title="Прибавить 25%"
                        >
                          +25%
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {progress > 0 && !isDone && (
                          <button
                            onClick={() => updateProgress(0)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-750 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
                          >
                            Сброс (0%)
                          </button>
                        )}
                        <button
                          onClick={() => updateProgress(100)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                              : 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/40 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white'
                          }`}
                        >
                          <Check size={12} />
                          <span>{isDone ? 'Выполнено' : '100% Завершить'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🏆 30-Day Challenge Creation Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  <Trophy size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    {tr('challenge_30_title', 'Создать 30-дневный челлендж')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tr('challenge_30_desc', '30-дневный подсчет с привязкой к заметке и умным трекингом по дням')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Activity / Goal input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                  <Target size={13} className="text-amber-500 dark:text-amber-400" />
                  <span>{tr('challenge_activity_label', 'Цель / Активность')}</span>
                </label>
                <input
                  type="text"
                  placeholder={tr('challenge_activity_placeholder', 'Например: Читать 30 страниц, Спорт, Кодинг...')}
                  value={challengeActivity}
                  onChange={(e) => setChallengeActivity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && challengeActivity.trim()) handleCreate30DayChallenge();
                  }}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:border-amber-500 outline-none text-xs"
                  autoFocus
                />
              </div>

              {/* Target Note Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                  <FileText size={13} className="text-violet-500 dark:text-violet-400" />
                  <span>{tr('challenge_note_label', 'Привязать к заметке')}</span>
                </label>
                <select
                  value={challengeNoteId}
                  onChange={(e) => setChallengeNoteId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:border-violet-500 outline-none text-xs"
                >
                  <option value="">{tr('challenge_note_none', '-- Без заметки (автономно) --')}</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      📝 {n.title || 'Без названия'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  В выбранной заметке появится интерактивный чеклист на 30 дней, синхронизированный с задачами.
                </p>
              </div>

              {/* Start Date input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-500 dark:text-blue-400" />
                  <span>{tr('challenge_start_date', 'Дата старта')}</span>
                </label>
                <input
                  type="date"
                  value={challengeStartDate}
                  onChange={(e) => setChallengeStartDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:border-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setShowChallengeModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                {tr('cancel', 'Отмена')}
              </button>
              <button
                disabled={!challengeActivity.trim()}
                onClick={handleCreate30DayChallenge}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trophy size={14} />
                <span>{tr('challenge_create_btn', 'Запустить 30 дней')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
