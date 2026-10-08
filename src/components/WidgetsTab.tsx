import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Layers, 
  FileText, 
  Trash, 
  Plus, 
  Activity, 
  Check, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  X,
  Grid,
  Monitor,
  Calendar as CalendarIcon,
  Play,
  Pause,
  GripVertical,
  BarChart3,
  Target,
  DollarSign,
  TrendingUp,
  Sparkles,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Flame,
  Folder,
  Compass,
  BrainCircuit,
  ArrowRight,
  Search,
  Mic,
  Send,
  Share2,
  Tag,
  Kanban,
  Table as TableIcon,
  List as ListIcon,
  Circle,
  HelpCircle,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { formatCurrency, Language, t } from '../config/translations';
import { Habit, Task, Note, FinancialTransaction } from '../types';
import HabitTracker from './HabitTracker';
import TimeTrackingWidget from './TimeTrackingWidget';

interface WidgetsTabProps {
  accentColor: string;
  notes: any[];
  tasks: any[];
  transactions: any[];
  habits?: Habit[];
  currency?: 'sum' | 'dollar' | 'krw' | 'rub';
  language?: Language;
  onAddNote: (note: any) => void;
  onAddTask: (task: any) => void;
  onUpdateTask?: (task: any) => void;
  onDeleteTask?: (id: string) => void;
  onAddHabit?: (habit: Habit) => void;
  onToggleHabit?: (id: string, dateStr: string) => void;
  onDeleteHabit?: (id: string) => void;
  onOpenCommandCenter?: () => void;
}

export default function WidgetsTab({
  accentColor,
  notes,
  tasks,
  transactions,
  habits = [],
  currency = 'rub',
  language = 'ru',
  onAddNote,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
  onOpenCommandCenter,
}: WidgetsTabProps) {

  // 1. ACTIVE DASHBOARD STYLE ('notion' by default | 'classic')
  const [dashboardStyle, setDashboardStyle] = useState<'notion' | 'classic'>(() => {
    const saved = localStorage.getItem('ns_home_active_style');
    if (saved === 'classic') return 'classic';
    return 'notion';
  });

  const handleSelectStyle = (style: 'notion' | 'classic') => {
    setDashboardStyle(style);
    localStorage.setItem('ns_home_active_style', style);
    triggerHaptic('light');
  };

  // 2. NOTION DATABASE TAB SWITCHER ('tasks' | 'knowledge' | 'projects' | 'finance')
  const [dbTab, setDbTab] = useState<'tasks' | 'knowledge' | 'projects' | 'finance'>('tasks');
  const [dbViewMode, setDbViewMode] = useState<'kanban' | 'table'>('kanban');

  // 3. SCRATCHPAD (QUICK NOTE)
  const [scratchpadText, setScratchpadText] = useState(() => {
    return localStorage.getItem('ns_home_scratchpad') || '';
  });
  useEffect(() => {
    localStorage.setItem('ns_home_scratchpad', scratchpadText);
  }, [scratchpadText]);

  const handleSaveScratchpadToNotes = () => {
    if (!scratchpadText.trim()) return;
    const now = new Date().toISOString();
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Быстрая мысль с Главной',
      content: `<p>${scratchpadText.replace(/\n/g, '<br/>')}</p>`,
      isFavorite: false,
      isPinned: true,
      categoryId: 'cat-personal',
      tags: ['Главная', 'Идея'],
      importance: 'medium',
      color: '#6366f1',
      attachments: [],
      isProtected: false,
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    onAddNote(newNote);
    setScratchpadText('');
    triggerHaptic('success');
  };

  // 4. METRICS CALCULATION
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.isCompleted).length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalIncomes = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const balance = totalIncomes - totalExpenses;

  // 5. KANBAN SECTIONS (Connected to real tasks)
  const kanbanTodo = useMemo(() => tasks.filter((t: any) => !t.isCompleted && t.status !== 'in_progress'), [tasks]);
  const kanbanInProgress = useMemo(() => tasks.filter((t: any) => !t.isCompleted && (t.status === 'in_progress' || t.priority === 'urgent' || t.priority === 'high')), [tasks]);
  const kanbanDone = useMemo(() => tasks.filter((t: any) => t.isCompleted), [tasks]);

  const handleToggleTaskStatus = (task: any) => {
    if (onUpdateTask) {
      onUpdateTask({
        ...task,
        isCompleted: !task.isCompleted,
        status: !task.isCompleted ? 'done' : 'todo',
      });
      triggerHaptic('light');
    }
  };

  const handleQuickAddTask = (col: 'todo' | 'progress' | 'done') => {
    const title = prompt(language === 'en' ? 'Task title:' : 'Название новой задачи:');
    if (!title || !title.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      isCompleted: col === 'done',
      status: col === 'done' ? 'completed' : col === 'progress' ? 'in_progress' : 'todo',
      priority: col === 'progress' ? 'high' : 'medium',
      subtasks: [],
      category: 'work',
      recurrence: 'none',
      progress: col === 'done' ? 100 : 0,
      tags: ['Главная'],
    };
    onAddTask(newTask);
    triggerHaptic('success');
  };

  // 6. HABIT STREAK METRICS
  const todayStr = new Date().toISOString().split('T')[0];
  const completedHabitsCount = habits.filter(h => h.completedDates && h.completedDates.includes(todayStr)).length;
  const habitPercent = habits.length > 0 ? Math.round((completedHabitsCount / habits.length) * 100) : 0;

  // 7. CLASSIC WINDOWS WIDGETS STATES (Preserved for compatibility)
  const [activeWidgets, setActiveWidgets] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('ns_win_active_widgets');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { stats: true, clock: true, sticky: true, focus: true };
  });

  const toggleWidget = (id: string) => {
    setActiveWidgets(prev => ({ ...prev, [id]: !prev[id] }));
    triggerHaptic('light');
  };

  const [widgetOrder, setWidgetOrder] = useState<string[]>(['stats', 'clock', 'sticky', 'focus']);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, { width?: 1 | 2; height?: 'compact' | 'normal' | 'tall' }>>({
    stats: { width: 2, height: 'compact' },
    clock: { width: 1, height: 'normal' },
    sticky: { width: 1, height: 'normal' },
    focus: { width: 1, height: 'normal' },
  });

  const moveWidget = (id: string, dir: 'up' | 'down') => {
    setWidgetOrder(prev => {
      const next = [...prev];
      const idx = next.indexOf(id);
      if (idx === -1) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  // Live Clock
  const [nowDate, setNowDate] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateFormatted = nowDate.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div id="notesphere-home-dashboard" className="h-full flex flex-col space-y-4 pr-1 relative select-none">
      
      {/* 🎛️ TOP STYLE CONTROLLER BAR (Unified across entire OS) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d131f] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs shadow-md shadow-indigo-500/20">
            ✦
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
              {language === 'en' ? 'Personal Dashboard' : 'Главный Дашборд'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {language === 'en' ? 'Choose your workspace view' : 'Стиль рабочего пространства'}
            </p>
          </div>
        </div>

        {/* Style Switcher Pills: Notion Hub & Widgets */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#090d16] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleSelectStyle('notion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              dashboardStyle === 'notion'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌟</span>
            <span>Notion Hub</span>
          </button>

          <button
            onClick={() => handleSelectStyle('classic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              dashboardStyle === 'classic'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🎛️</span>
            <span>{language === 'en' ? 'Widgets' : 'Виджеты'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 1. NOTION ULTRA WORKSPACE OS (Flagship Dashboard) */}
      {/* ========================================================================= */}
      {dashboardStyle === 'notion' && (
        <div className="space-y-4">
          
          {/* Morning Greeting & AI Briefing Hero Banner */}
          <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    {language === 'en' ? 'Good morning, Laziz' : 'Доброе утро, Лазиз'} 🌅
                  </h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-500/30 capitalize">
                    {dateFormatted}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                  {language === 'en' ? 'Today:' : 'На сегодня:'}{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totalTasks} {language === 'en' ? 'tasks' : 'задач'}</span>,{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{notes.length} {language === 'en' ? 'notes' : 'заметок'}</span>.{' '}
                  {language === 'en' ? 'Completion rate:' : 'Прогресс задач:'}{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{taskProgressPercent}%</span>.{' '}
                  {language === 'en' ? 'Key focus: release NoteSphere OS.' : 'Главный фокус — запуск NoteSphere OS.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenCommandCenter && (
                  <button
                    onClick={onOpenCommandCenter}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Plan day with NEXAR' : 'Спланировать день с NEXAR'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Database Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0f1626] p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setDbTab('tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dbTab === 'tasks'
                    ? 'bg-indigo-600/20 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>⚡</span>
                <span>{language === 'en' ? 'Daily Tasks' : 'Задачи дня'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 font-mono text-indigo-700 dark:text-indigo-200">
                  {totalTasks}
                </span>
              </button>

              <button
                onClick={() => setDbTab('knowledge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dbTab === 'knowledge'
                    ? 'bg-indigo-600/20 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📚</span>
                <span>{language === 'en' ? 'Knowledge Base' : 'База знаний'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {notes.length}
                </span>
              </button>

              <button
                onClick={() => setDbTab('projects')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dbTab === 'projects'
                    ? 'bg-indigo-600/20 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🎯</span>
                <span>{language === 'en' ? 'Projects' : 'Проекты'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">6</span>
              </button>

              <button
                onClick={() => setDbTab('finance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dbTab === 'finance'
                    ? 'bg-indigo-600/20 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>💎</span>
                <span>{language === 'en' ? 'Finance Flow' : 'Финансы'}</span>
              </button>
            </div>

            {/* View Mode Switcher (Kanban / Table) */}
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-300 dark:border-slate-800">
              <button
                onClick={() => setDbViewMode('kanban')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                  dbViewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Kanban className="w-3 h-3" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setDbViewMode('table')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                  dbViewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Таблица</span>
              </button>
            </div>
          </div>

          {/* Embedded Live Kanban Board */}
          {dbTab === 'tasks' && dbViewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* Column 1: В планах */}
              <div className="bg-slate-50 dark:bg-[#0e1422]/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {language === 'en' ? 'To Do' : 'В планах'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        {kanbanTodo.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleQuickAddTask('todo')}
                      className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-bold p-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {kanbanTodo.slice(0, 5).map((t: any) => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTaskStatus(t)}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#131b2e]/80 border border-slate-200 dark:border-slate-700/40 hover:border-indigo-500/50 shadow-xs transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                            {t.project || 'NoteSphere'}
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                            {t.priority === 'urgent' ? 'Срочно' : t.priority === 'high' ? 'Высокий' : 'Обычный'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition line-clamp-2">
                          {t.title}
                        </h4>
                      </div>
                    ))}
                    {kanbanTodo.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">Нет задач в планах</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleQuickAddTask('todo')}
                  className="w-full mt-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Add Task' : 'Добавить задачу'}</span>
                </button>
              </div>

              {/* Column 2: В работе */}
              <div className="bg-indigo-50/40 dark:bg-[#0e1422]/90 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-indigo-200 dark:border-indigo-500/20">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {language === 'en' ? 'In Progress' : 'В работе'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-mono">
                        {kanbanInProgress.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleQuickAddTask('progress')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold p-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {kanbanInProgress.slice(0, 5).map((t: any) => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTaskStatus(t)}
                        className="p-2.5 rounded-xl bg-white dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/40 hover:border-indigo-400 shadow-xs transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 font-semibold">
                            Активно
                          </span>
                          <span className="text-[10px] text-rose-500 dark:text-rose-400 font-mono font-bold">Фокус</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition line-clamp-2">
                          {t.title}
                        </h4>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    ))}
                    {kanbanInProgress.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">Нет активных задач</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleQuickAddTask('progress')}
                  className="w-full mt-3 py-1.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Add in progress' : 'Добавить в работу'}</span>
                </button>
              </div>

              {/* Column 3: Готово */}
              <div className="bg-slate-50 dark:bg-[#0e1422]/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {language === 'en' ? 'Done' : 'Готово'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                        {kanbanDone.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleQuickAddTask('done')}
                      className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-bold p-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {kanbanDone.slice(0, 5).map((t: any) => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTaskStatus(t)}
                        className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-500/40 transition cursor-pointer group line-through shadow-xs"
                      >
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition">
                          {t.title}
                        </span>
                      </div>
                    ))}
                    {kanbanDone.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">Пока нет завершённых задач</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleQuickAddTask('done')}
                  className="w-full mt-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Add completed' : 'Добавить выполненную'}</span>
                </button>
              </div>

            </div>
          )}

          {/* Table View of Tasks */}
          {dbTab === 'tasks' && dbViewMode === 'table' && (
            <div className="bg-white dark:bg-[#0e1422]/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-mono border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Статус</th>
                    <th className="p-3">Название задачи</th>
                    <th className="p-3">Приоритет</th>
                    <th className="p-3">Проект</th>
                    <th className="p-3">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {tasks.slice(0, 8).map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer ${
                            t.isCompleted ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {t.isCompleted && <Check className="w-2.5 h-2.5" />}
                        </button>
                      </td>
                      <td className={`p-3 font-medium ${t.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                        {t.title}
                      </td>
                      <td className="p-3 font-mono text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full ${t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                          {t.priority || 'medium'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {t.project || 'NoteSphere'}
                      </td>
                      <td className="p-3">
                        {onDeleteTask && (
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Knowledge Base Tab Highlight */}
          {dbTab === 'knowledge' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {notes.slice(0, 6).map((n: any) => (
                <div key={n.id} className="p-3.5 rounded-2xl bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 shadow-sm transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                      {n.tags?.[0] || 'Заметка'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{n.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: (n.content || '').replace(/<[^>]*>?/gm, ' ') }} />
                </div>
              ))}
            </div>
          )}

          {/* Projects Tab Highlight */}
          {dbTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { title: 'NoteSphere OS v2.0', progress: 75, color: '#6366f1', tasksCount: 8 },
                { title: 'Медиатека & Аудиосистема', progress: 65, color: '#a855f7', tasksCount: 5 },
                { title: 'Telegram Cloud Sync', progress: 100, color: '#10b981', tasksCount: 4 },
                { title: 'Мобильное приложение Android', progress: 40, color: '#06b6d4', tasksCount: 7 },
              ].map((proj, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">{proj.title}</h4>
                    <span className="text-xs font-mono font-bold" style={{ color: proj.color }}>{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${proj.progress}%`, backgroundColor: proj.color }}></div>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{proj.tasksCount} активных задач привязано</span>
                </div>
              ))}
            </div>
          )}

          {/* Finance Tab Highlight */}
          {dbTab === 'finance' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Денежный поток за месяц</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Баланс: {formatCurrency(balance, currency)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Доходы</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncomes, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Расходы</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Транзакций</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{transactions.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Productivity Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            
            {/* Bento 1: Фокус 1-3-5 */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="text-indigo-600 dark:text-indigo-400">🎯</span> Фокус 1-3-5
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Rule</span>
                </div>
                <div className="space-y-2 mt-2">
                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded accent-indigo-600" />
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">1. Запуск редизайна NoteSphere</span>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-0.5 rounded accent-indigo-600" />
                    <span>2. Синхронизация привычек</span>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded accent-indigo-600" />
                    <span>3. Проверить медиатеку</span>
                  </label>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Прогресс: 2 из 3</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">66%</span>
              </div>
            </div>

            {/* Bento 2: Трекер Привычек */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="text-amber-500 dark:text-amber-400">🔥</span> Привычки
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">{habitPercent}% сегодня</span>
                </div>
                <div className="space-y-2 mt-2 text-xs">
                  {habits.slice(0, 3).map((h) => {
                    const isChecked = !!(h.completedDates && h.completedDates.includes(todayStr));
                    return (
                      <div key={h.id} className="flex items-center justify-between">
                        <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{h.title}</span>
                        <button
                          onClick={() => onToggleHabit && onToggleHabit(h.id, todayStr)}
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] cursor-pointer transition ${
                            isChecked ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {isChecked && '✓'}
                        </button>
                      </div>
                    );
                  })}
                  {habits.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">Добавьте привычки в трекере</p>
                  )}
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Стрик: 14 дней</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Активен</span>
              </div>
            </div>

            {/* Bento 3: Quick Scratchpad */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="text-cyan-600 dark:text-cyan-400">📝</span> Быстрая мысль
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Scratchpad</span>
                </div>
                <textarea
                  value={scratchpadText}
                  onChange={(e) => setScratchpadText(e.target.value)}
                  placeholder="Запиши мысль на лету..."
                  className="w-full h-16 bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none border-none pt-1"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Автосохранение</span>
                <button
                  onClick={handleSaveScratchpadToNotes}
                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition cursor-pointer"
                >
                  В заметку →
                </button>
              </div>
            </div>

            {/* Bento 4: Финансовый Радар */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400">💎</span> Баланс & Радар
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">+12%</span>
                </div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-base font-black text-slate-800 dark:text-white">{formatCurrency(balance, currency)}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Расход: {formatCurrency(totalExpenses, currency)}</span>
                </div>
                {/* SVG Radar */}
                <div className="h-12 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 50">
                    <polygon points="50,5 90,45 10,45" fill="none" stroke="#94a3b8" strokeWidth="1" />
                    <polygon points="50,15 80,42 25,42" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" strokeWidth="1.5" />
                    <circle cx="50" cy="15" r="2.5" fill="#a855f7" />
                    <circle cx="80" cy="42" r="2.5" fill="#06b6d4" />
                    <circle cx="25" cy="42" r="2.5" fill="#10b981" />
                  </svg>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-400 text-center">Кафе · Код · Транспорт</p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎛️ 4. CLASSIC WINDOWS DESKTOP WIDGETS */}
      {/* ========================================================================= */}
      {dashboardStyle === 'classic' && (
        <div className="space-y-4">
          
          {/* Classic Habit Tracker */}
          {onAddHabit && onToggleHabit && onDeleteHabit && (
            <HabitTracker
              habits={habits}
              onAddHabit={onAddHabit}
              onToggleHabit={onToggleHabit}
              onDeleteHabit={onDeleteHabit}
              accentColor={accentColor}
              language={language}
            />
          )}

          {/* Windows Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Stats Widget */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800 col-span-1 md:col-span-2 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                  {t(language, 'widget_analytics')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">{t(language, 'synced')}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">{t(language, 'notes_metric')}</span>
                  <span className="text-base font-black text-slate-800 dark:text-white">{notes.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">{t(language, 'tasks_metric')}</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{completedTasks}/{totalTasks}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">{t(language, 'balance_metric')}</span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-300 mt-1 block">{formatCurrency(balance, currency)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">{t(language, 'progress_metric')}</span>
                  <span className="text-base font-black text-violet-600 dark:text-violet-400">{taskProgressPercent}%</span>
                </div>
              </div>
            </div>

            {/* Time Tracking Widget */}
            <div className="col-span-1 md:col-span-2 p-4 rounded-2xl bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <TimeTrackingWidget accentColor={accentColor} language={language} />
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
