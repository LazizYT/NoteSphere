import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  CheckSquare,
  Calendar as CalendarIcon,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Music,
  Film,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Pin,
  ExternalLink,
  Target,
  Sparkles,
  BarChart3,
  ListTodo,
} from 'lucide-react';
import { Task, Importance, Note, FinancialTransaction } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { formatCurrency } from '../config/translations';

export interface LocalTrackBridge {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'audio' | 'video' | 'image';
  duration?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  artist?: string;
  isFavorite?: boolean;
  album?: string;
}

export interface AgendaSidebarProps {
  activeTab?: string;
  tasks: Task[];
  onToggleTask?: (task: Task) => void;
  onAddTask?: (task: Task) => void;
  accentColor?: string;
  language?: 'ru' | 'en';
  onSelectDate?: (dateStr: string) => void;
  // Notes Tab integration
  notes?: Note[];
  onSelectNote?: (noteId: string) => void;
  onAddNote?: (note: any) => void;
  // Finance Tab integration
  transactions?: FinancialTransaction[];
  currency?: 'sum' | 'dollar' | 'krw' | 'rub';
  onAddTransaction?: (tx: FinancialTransaction) => void;
  // Media Tab integration
  mediaState?: {
    currentTrack: LocalTrackBridge | null;
    mediaTracks: LocalTrackBridge[];
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSkip: (direction: 'next' | 'prev') => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    volume: number;
    setVolume: (v: number) => void;
    isShuffle: boolean;
    toggleShuffle: () => void;
    isRepeat: boolean;
    toggleRepeat: () => void;
    activeVideoUrl?: string | null;
    onSelectTrack?: (index: number) => void;
  };
}

const MOTIVATIONAL_QUOTES = [
  { text: 'Дисциплина — это свобода.', author: 'Аристотель' },
  { text: 'Успех — это сумма маленьких усилий, повторяемых изо дня в день.', author: 'Роберт Кольер' },
  { text: 'Сделай сегодня то, о чем другие подумают завтра.', author: 'Уинстон Черчилль' },
  { text: 'Фокус — это умение сказать «нет» сотне хороших идей.', author: 'Стив Джобс' },
  { text: 'Каждый день — это чистый лист вашей новой истории.', author: 'NoteSphere' },
];

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function AgendaSidebar({
  activeTab = 'widgets',
  tasks,
  onToggleTask,
  onAddTask,
  accentColor = '#5865F2',
  language = 'ru',
  onSelectDate,
  notes = [],
  onSelectNote,
  onAddNote,
  transactions = [],
  currency = 'rub',
  onAddTransaction,
  mediaState,
}: AgendaSidebarProps) {
  // 1. Live Clock (Permanently Fixed at Top across ALL tabs)
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = useMemo(() => {
    const locale = language === 'en' ? 'en-US' : 'ru-RU';
    const day = now.getDate();
    const month = now.toLocaleDateString(locale, { month: 'short' });
    const weekday = now.toLocaleDateString(locale, { weekday: 'short' });
    return `${day} ${month}, ${weekday}`;
  }, [now, language]);

  const timeLabel = useMemo(() => {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [now]);

  // 2. Mini Calendar State (Main/Widgets tab)
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const todayDateStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const selectedDayNumber = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      return parseInt(parts[2], 10);
    } catch {
      return now.getDate();
    }
  }, [selectedDateStr, now]);

  const selectedDateLabel = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const locale = language === 'en' ? 'en-US' : 'ru-RU';
      return dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr, language]);

  // Quick Task Add Input in Date section
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  // Scratchpad for Notes Tab
  const [sidebarScratchpad, setSidebarScratchpad] = useState(() => {
    return localStorage.getItem('ns_sidebar_scratchpad') || '';
  });
  useEffect(() => {
    localStorage.setItem('ns_sidebar_scratchpad', sidebarScratchpad);
  }, [sidebarScratchpad]);

  // Daily Quote
  const quote = useMemo(() => {
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, [now]);

  // Calendar Month Label
  const currentMonthYearLabel = useMemo(() => {
    const locale = language === 'en' ? 'en-US' : 'ru-RU';
    const month = calendarDate.toLocaleDateString(locale, { month: 'long' });
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalized} ${calendarDate.getFullYear()}`;
  }, [calendarDate, language]);

  // Month Grid Calculation
  const monthGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: {
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dateStr: string;
      hasTasks: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        dateStr: '',
        hasTasks: false,
      });
    }

    // Current month days
    const today = new Date();
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let d = 1; d <= totalDays; d++) {
      const isToday = isThisMonth && today.getDate() === d;
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const cellDateStr = `${year}-${mStr}-${dStr}`;
      const isSelected = cellDateStr === selectedDateStr;

      const hasTasks = tasks.some((t) => t.dueDate && t.dueDate.startsWith(cellDateStr));

      cells.push({
        day: d,
        isCurrentMonth: true,
        isToday,
        isSelected,
        dateStr: cellDateStr,
        hasTasks,
      });
    }

    // Next month padding
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length > 0 ? 42 - cells.length : 0);
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        day: n,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        dateStr: '',
        hasTasks: false,
      });
    }

    return cells;
  }, [calendarDate, selectedDateStr, tasks]);

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    triggerHaptic('light');
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    triggerHaptic('light');
  };

  // Filter tasks specifically for the SELECTED date in calendar
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate.startsWith(selectedDateStr);
    });
  }, [tasks, selectedDateStr]);

  // First 3 tasks for the selected date (Strict user requirement)
  const firstThreeTasks = useMemo(() => {
    if (selectedDateTasks.length > 0) {
      return selectedDateTasks.slice(0, 3);
    }
    // Fallback active tasks if selected day is today and empty
    if (selectedDateStr === todayDateStr) {
      const active = tasks.filter((t) => !t.isCompleted).slice(0, 3);
      if (active.length > 0) return active;
    }
    return [];
  }, [selectedDateTasks, selectedDateStr, todayDateStr, tasks]);

  // Weekly Progress Metrics
  const weekStats = useMemo(() => {
    const completedCount = tasks.filter((t) => t.isCompleted).length;
    const totalCount = Math.max(tasks.length, 10);
    const progressPercent = Math.min(Math.round((completedCount / totalCount) * 100), 100);

    const currentDayIdx = (now.getDay() + 6) % 7;
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return {
      completedCount: completedCount || 7,
      totalCount: totalCount || 10,
      percent: progressPercent || 70,
      currentDayIdx,
      weekDays,
    };
  }, [tasks, now]);

  // Task Priority Helpers
  const getPriorityBadge = (prio?: Importance) => {
    switch (prio) {
      case 'critical':
      case 'high':
        return { label: 'Высокий', color: '#ec4899', dotClass: 'bg-pink-500' };
      case 'medium':
        return { label: 'Средний', color: '#f59e0b', dotClass: 'bg-amber-400' };
      case 'low':
      default:
        return { label: 'Низкий', color: '#10b981', dotClass: 'bg-emerald-400' };
    }
  };

  // Handler for Quick Add Task (targeted to selected date)
  const handleQuickAdd = () => {
    if (!quickTitle.trim() || !onAddTask) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: quickTitle.trim(),
      isCompleted: false,
      dueDate: selectedDateStr,
      priority: 'medium',
      category: 'Работа',
      recurrence: 'none',
      progress: 0,
      subtasks: [],
      tags: ['Главная'],
    };
    onAddTask(newTask);
    setQuickTitle('');
    setIsQuickAdding(false);
    triggerHaptic('success');
  };

  // Scratchpad note creation
  const handleSaveScratchpad = () => {
    if (!sidebarScratchpad.trim() || !onAddNote) return;
    const newNote = {
      id: `note-${Date.now()}`,
      title: 'Быстрая мысль из сайдбара',
      content: `<p>${sidebarScratchpad.replace(/\n/g, '<br/>')}</p>`,
      isFavorite: false,
      isPinned: true,
      categoryId: 'cat-personal',
      tags: ['Сайдбар', 'Идея'],
      importance: 'medium',
      color: accentColor,
      attachments: [],
      isProtected: false,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onAddNote(newNote);
    setSidebarScratchpad('');
    triggerHaptic('success');
  };

  // Finance Metrics Calculation
  const totalIncomes = useMemo(() => {
    return transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const financeBalance = totalIncomes - totalExpenses;

  return (
    <aside
      id="notesphere-agenda-sidebar"
      className="hidden xl:flex w-80 2xl:w-88 flex-col gap-3.5 p-4 border-l border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#090b10] select-none text-slate-800 dark:text-slate-200 overflow-y-auto h-full max-h-full shrink-0"
    >
      {/* ========================================================================= */}
      {/* 1. FIXED TOP CLOCK & DATE (ALWAYS VISIBLE AND IDENTICAL ACROSS ALL TABS)  */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between gap-2 pt-1 pb-1 border-b border-slate-200 dark:border-[#1e2638]">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-wide">{dateLabel}</span>
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">{timeLabel}</span>
        </div>
        <div className="text-right max-w-[130px]">
          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400 font-medium">
            Маленькие шаги приводят к большим целям.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB-SPECIFIC DYNAMIC CONTENT                                           */}
      {/* ========================================================================= */}

      {/* --- A. MAIN / WIDGETS TAB (Calendar + First 3 tasks for selected date) --- */}
      {(activeTab === 'widgets' || activeTab === 'dashboard') && (
        <div className="space-y-3">
          {/* Mini Calendar Card */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentMonthYearLabel}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition cursor-pointer"
                  title="Предыдущий месяц"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition cursor-pointer"
                  title="Следующий месяц"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Пн</span>
              <span>Вт</span>
              <span>Ср</span>
              <span>Чт</span>
              <span>Пт</span>
              <span>Сб</span>
              <span>Вс</span>
            </div>

            {/* Month Day Cells */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium">
              {monthGrid.map((cell, idx) => {
                const isSelected = cell.isSelected;
                const isToday = cell.isToday;

                return (
                  <div
                    key={`day-cell-${idx}`}
                    onClick={() => {
                      if (cell.isCurrentMonth && cell.dateStr) {
                        setSelectedDateStr(cell.dateStr);
                        triggerHaptic('light');
                        if (onSelectDate) onSelectDate(cell.dateStr);
                      }
                    }}
                    className={`relative w-7 h-7 mx-auto rounded-full flex items-center justify-center transition cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'text-slate-400 dark:text-slate-600'
                        : isSelected
                        ? 'text-white font-bold shadow-md shadow-indigo-600/30'
                        : isToday
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={
                      cell.isCurrentMonth && isSelected
                        ? { backgroundColor: accentColor }
                        : undefined
                    }
                  >
                    {cell.day}
                    {cell.hasTasks && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* First 3 Tasks for the Selected Calendar Day */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                  {selectedDateStr === todayDateStr
                    ? (language === 'en' ? 'Today’s Tasks' : 'Задачи на сегодня')
                    : (language === 'en' ? `Tasks for ${selectedDateLabel}` : `Задачи на ${selectedDateLabel}`)}
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedDateTasks.length}{' '}
                  {language === 'en' ? 'tasks total (first 3)' : 'задач всего (первые 3)'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsQuickAdding((prev) => !prev);
                  triggerHaptic('light');
                }}
                className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-white/5 hover:bg-slate-300/60 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center border border-slate-300 dark:border-white/5 transition cursor-pointer"
                title={`Добавить задачу на ${selectedDateLabel}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Input Drawer */}
            <AnimatePresence>
              {isQuickAdding && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-2 pt-1"
                >
                  <input
                    type="text"
                    placeholder={`Задача на ${selectedDateLabel}...`}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                      if (e.key === 'Escape') setIsQuickAdding(false);
                    }}
                    autoFocus
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0d111a] border border-slate-300 dark:border-[#1f293d] text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setIsQuickAdding(false)}
                      className="px-2 py-1 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleQuickAdd}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      Добавить
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tasks List */}
            {firstThreeTasks.length === 0 ? (
              <div className="py-4 text-center space-y-1.5 bg-slate-100/70 dark:bg-[#0d111a]/40 rounded-xl border border-dashed border-slate-300 dark:border-[#1f293d]">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'No tasks scheduled' : 'Нет задач на этот день'}
                </p>
                <button
                  onClick={() => setIsQuickAdding(true)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {language === 'en' ? 'Plan task for this day' : 'Запланировать задачу'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {firstThreeTasks.map((t) => {
                  const prio = getPriorityBadge(t.priority);
                  const isDone = t.isCompleted;

                  return (
                    <div
                      key={t.id}
                      className="group flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#0d111a] hover:bg-slate-100/80 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Custom Checkbox */}
                      <button
                        onClick={() => {
                          if (onToggleTask) {
                            onToggleTask({ ...t, isCompleted: !t.isCompleted });
                          }
                          triggerHaptic('light');
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
                          isDone
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-transparent hover:border-slate-400'
                        }`}
                        style={isDone ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-medium leading-snug truncate transition ${
                            isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {t.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${prio.dotClass}`} />
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{prio.label}</span>
                        </div>
                      </div>

                      {/* Time Badge */}
                      <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 mt-0.5">
                        {t.timeBlock?.start || t.dueTime || '12:00'}
                      </span>
                    </div>
                  );
                })}

                {selectedDateTasks.length > 3 && (
                  <p className="text-[10px] text-center text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                    + еще {selectedDateTasks.length - 3} задач на этот день
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Weekly Progress Card */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-white">Прогресс недели</span>
              <span className="font-bold font-mono text-slate-500 dark:text-slate-400">
                {weekStats.completedCount}/{weekStats.totalCount}
              </span>
            </div>

            {/* Smooth Progress Bar */}
            <div className="h-2 w-full bg-slate-200 dark:bg-[#0d111a] rounded-full overflow-hidden border border-slate-300 dark:border-[#1f293d]/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weekStats.percent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{
                  background: `linear-gradient(90deg, ${accentColor}, #818cf8)`,
                }}
              />
            </div>

            {/* Day Streak Circles */}
            <div className="flex items-center justify-between pt-1">
              {weekStats.weekDays.map((day, idx) => {
                const isDone = idx <= weekStats.currentDayIdx;
                const isToday = idx === weekStats.currentDayIdx;

                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                        isDone
                          ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-100 dark:bg-[#0d111a] border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                      style={isDone ? { borderColor: `${accentColor}80`, color: accentColor } : undefined}
                    >
                      {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                    </div>
                    <span
                      className={`text-[9px] font-medium ${
                        isToday ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- B. TASKS TAB SIDEBAR (Eisenhower Matrix + Upcoming Deadlines) --- */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {/* Eisenhower Analytics */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                Матрица Эйзенхауэра
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Фокус</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">Срочно</span>
                <span className="text-base font-black text-rose-700 dark:text-rose-300">
                  {tasks.filter((t) => t.priority === 'critical' || t.priority === 'high').length}
                </span>
                <span className="text-[9px] text-rose-500 dark:text-rose-400/80 block mt-0.5">В приоритете</span>
              </div>

              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">Важно</span>
                <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                  {tasks.filter((t) => t.priority === 'medium').length}
                </span>
                <span className="text-[9px] text-indigo-500 dark:text-indigo-400/80 block mt-0.5">Стратегия</span>
              </div>

              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">Готово</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {tasks.filter((t) => t.isCompleted).length}
                </span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400/80 block mt-0.5">Завершено</span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638]">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Всего</span>
                <span className="text-base font-black text-slate-800 dark:text-white">{tasks.length}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">В плане</span>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Ближайшие дедлайны
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Сроки</span>
            </div>

            <div className="space-y-1.5">
              {tasks
                .filter((t) => !t.isCompleted && t.dueDate)
                .slice(0, 3)
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-xl bg-white dark:bg-[#0d111a] border border-slate-200 dark:border-[#1f293d] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-slate-800 dark:text-slate-200 font-medium truncate">{t.title}</p>
                      <span className="text-[10px] text-slate-500">{t.dueDate}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Скоро
                    </span>
                  </div>
                ))}
              {tasks.filter((t) => !t.isCompleted && t.dueDate).length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">Все дедлайны закрыты! 🎉</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- C. NOTES TAB SIDEBAR (Scratchpad + Recent Notes + Knowledge Metrics) --- */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {/* Quick Scratchpad */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Быстрая мысль (Scratchpad)
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Auto-save</span>
            </div>
            <textarea
              value={sidebarScratchpad}
              onChange={(e) => setSidebarScratchpad(e.target.value)}
              placeholder="Запишите идею на лету..."
              className="w-full h-20 bg-white dark:bg-[#0d111a] p-2 rounded-xl border border-slate-200 dark:border-[#1f293d] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none focus:border-indigo-500 transition"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveScratchpad}
                disabled={!sidebarScratchpad.trim()}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                style={{ backgroundColor: accentColor }}
              >
                <span>В заметку →</span>
              </button>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                Недавние заметки
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{notes?.length || 0} всего</span>
            </div>

            <div className="space-y-1.5">
              {notes?.slice(0, 4).map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote && onSelectNote(note.id)}
                  className="p-2 rounded-xl bg-white dark:bg-[#0d111a] hover:bg-slate-100/80 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] flex items-center justify-between text-xs transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-slate-800 dark:text-slate-200 font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-white">
                      {note.title || 'Без названия'}
                    </p>
                    <span className="text-[9px] text-slate-500">
                      {note.updatedAt?.slice(0, 10) || 'Сегодня'}
                    </span>
                  </div>
                  {note.isPinned && <Pin className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- D. FINANCE TAB SIDEBAR (Radar + Balance + Budget meter) --- */}
      {activeTab === 'finance' && (
        <div className="space-y-3">
          {/* Balance & Flow */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Баланс & Радар
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">+14%</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Текущий остаток</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                {formatCurrency(financeBalance, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Доход
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white mt-1 block">
                  {formatCurrency(totalIncomes, currency)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Расход
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white mt-1 block">
                  {formatCurrency(totalExpenses, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Budget Limit Meter */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-white">Лимит на месяц</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">68%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-[#0d111a] rounded-full overflow-hidden border border-slate-300 dark:border-[#1f293d]/50">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full w-[68%]" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">Осталось 32% лимита до конца месяца</p>
          </div>
        </div>
      )}

      {/* --- E. MEDIA TAB SIDEBAR (Now Playing Cockpit + Mini Video Player Screen + Queue) --- */}
      {/* --- E. MEDIA TAB SIDEBAR (Media Overview & Stats - no duplicate player buttons) --- */}
      {activeTab === 'media' && (
        <div className="space-y-3">
          {/* Media Tab Quick Navigator & Stats */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                {language === 'en' ? 'Media Studio' : 'Студия медиа'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono">
                {mediaState?.isPlaying ? 'PLAYING' : 'READY'}
              </span>
            </div>

            {/* Album Cover / Active Artwork */}
            <div className="relative w-full aspect-video rounded-xl bg-slate-100 dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] flex items-center justify-center overflow-hidden">
              {mediaState?.currentTrack?.coverUrl || mediaState?.currentTrack?.thumbnailUrl ? (
                <img
                  src={mediaState.currentTrack.coverUrl || mediaState.currentTrack.thumbnailUrl}
                  alt="Track Artwork"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div
                    className={`w-14 h-14 rounded-full border-2 border-indigo-500/40 bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg ${
                      mediaState?.isPlaying ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '6s' }}
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                      ♪
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                {mediaState?.currentTrack?.name || (language === 'en' ? 'No track playing' : 'Трек не выбран')}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {mediaState?.currentTrack?.artist || mediaState?.currentTrack?.album || (language === 'en' ? 'Controls in main view' : 'Управление в основном окне')}
              </p>
            </div>
          </div>


          {/* Mini Video Player Screen */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                {language === 'en' ? 'Mini Video Player' : 'Мини-видеоплеер'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">1080p Screen</span>
            </div>

            <div className="w-full aspect-video rounded-xl bg-slate-900 dark:bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
              {mediaState?.activeVideoUrl || (mediaState?.currentTrack?.type === 'video' && mediaState.currentTrack.url) ? (
                <video
                  src={mediaState.activeVideoUrl || mediaState.currentTrack?.url}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#0a0f1d] to-[#06080e]">
                  {/* Visualizer sound waves */}
                  <div className="flex items-end justify-center gap-1 h-10 mb-2">
                    <span className={`w-1 bg-cyan-400 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-8' : 'h-2'}`} />
                    <span className={`w-1 bg-indigo-500 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-10' : 'h-3'}`} />
                    <span className={`w-1 bg-purple-500 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-6' : 'h-2'}`} />
                    <span className={`w-1 bg-cyan-400 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-9' : 'h-4'}`} />
                    <span className={`w-1 bg-indigo-400 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-7' : 'h-2'}`} />
                    <span className={`w-1 bg-purple-400 rounded-full ${mediaState?.isPlaying ? 'animate-pulse h-8' : 'h-3'}`} />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {language === 'en' ? 'Video display / Soundwave monitor' : 'Видеоряд / Визуализатор звука'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Queue List (Up Next) */}
          {mediaState?.mediaTracks && mediaState.mediaTracks.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2 shadow-md">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800/80">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span>Очередь треков</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {mediaState.mediaTracks.length} треков
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {mediaState.mediaTracks.slice(0, 4).map((tr, idx) => (
                  <div
                    key={tr.id || idx}
                    onClick={() => mediaState.onSelectTrack && mediaState.onSelectTrack(idx)}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-[#0d111a] hover:bg-slate-100/80 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] transition cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {tr.coverUrl || tr.thumbnailUrl ? (
                        <img
                          src={tr.coverUrl || tr.thumbnailUrl}
                          alt=""
                          className="w-6 h-6 rounded-md object-cover shrink-0 border border-slate-200 dark:border-white/10"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </div>
                      )}
                      <span className="text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-white font-medium">{tr.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{tr.duration || '03:30'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- F. PROJECTS TAB SIDEBAR (Project AI & Ecosystem Highlights) --- */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          {/* Project AI Diagnostic Card */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>PROJECT AI</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono">
                NEXAR
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs space-y-1.5 text-slate-700 dark:text-slate-300 shadow-xs">
              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Target size={13} className="text-amber-500 dark:text-amber-400" />
                <span>Экосистема проектов</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Связующий слой между задачами, заметками, финансами и холстом для достижения результатов.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                СВОДКА СИСТЕМЫ
              </span>
              <div className="p-2.5 bg-white dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between text-xs shadow-xs">
                <span className="text-slate-500 dark:text-slate-400">Активных задач:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {tasks.filter((t) => !t.isCompleted).length}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#0d111a] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between text-xs shadow-xs">
                <span className="text-slate-500 dark:text-slate-400">Заметок в базе:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {notes?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Active Tasks list */}
          <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Задачи в фокусе</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {tasks.filter((t) => !t.isCompleted).slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTask && onToggleTask(task)}
                  className="p-2 bg-white dark:bg-[#0d111a] hover:bg-slate-100/80 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between gap-2 cursor-pointer transition text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                      {task.isCompleted && <Check size={10} className="text-emerald-500" />}
                    </div>
                    <span className="truncate text-slate-700 dark:text-slate-300">{task.title}</span>
                  </div>
                  {task.priority && (
                    <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {task.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INSPIRATIONAL QUOTE CARD (Consistent across all tabs at bottom)        */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3 text-xs space-y-1 shadow-sm mt-auto">
        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-serif text-sm">
          <span>❝</span>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium italic leading-snug">
            {quote.text}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right font-semibold">
          — {quote.author}
        </p>
      </div>
    </aside>
  );
}
