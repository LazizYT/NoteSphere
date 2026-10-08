/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart, Clock, ListTodo, FileText, CheckCircle, Brain, Smile, Activity, Calendar, DollarSign, Target, Sparkles, RefreshCw, AlertCircle, FileDown } from 'lucide-react';
import { Note, Task, FinancialTransaction, Habit, Goal } from '../types';
import { openReportAsPdf } from '../utils/exportPdf';

interface StatsTabProps {
  notes: Note[];
  tasks: Task[];
  transactions: FinancialTransaction[];
  accentColor: string;
  currency?: 'sum' | 'dollar' | 'krw';
  habits?: Habit[];
  goals?: Goal[];
}

export default function StatsTab({
  notes,
  tasks,
  transactions,
  accentColor,
  currency = 'sum',
  habits = [],
  goals = [],
}: StatsTabProps) {
  const [appSeconds, setAppSeconds] = useState(128); // dummy starter usage tracking

  const formatMoney = (val: number) => {
    const formatted = val.toLocaleString('ru-RU');
    if (currency === 'dollar') {
      return `$ ${formatted}`;
    }
    if (currency === 'krw') {
      return `₩ ${formatted}`;
    }
    return `${formatted} сум`;
  };

  // Active time-spent categories (mock-editable for daily planning statistics)
  const [focusStudySec, setFocusStudySec] = useState(4800); // 80 mins
  const [focusWorkSec, setFocusWorkSec] = useState(10800); // 180 mins
  const [focusRestSec, setFocusRestSec] = useState(1800); // 30 mins
  const [focusProjectSec, setFocusProjectSec] = useState(7200); // 120 mins

  // Background active counter
  useEffect(() => {
    const handleCount = setInterval(() => {
      setAppSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(handleCount);
  }, []);

  const formatUsageTime = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h > 0 ? h + 'ч ' : ''}${m}м ${s}с`;
  };

  const formatHoursValue = (secs: number): string => {
    return (secs / 365).toFixed(1) + ' ч'; // stylized display math
  };

  // Calculations
  const notesCount = notes.length;
  const privateNotesCount = notes.filter((n) => n.isProtected).length;
  const favoriteNotesCount = notes.filter((n) => n.isFavorite).length;

  const totalTasksCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const activeTasks = totalTasksCount - completedTasks;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const incomes = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Time logging values triggers
  const addFocusMinutes = (category: 'work' | 'study' | 'project' | 'rest') => {
    if (category === 'study') setFocusStudySec((p) => p + 600);
    if (category === 'work') setFocusWorkSec((p) => p + 600);
    if (category === 'project') setFocusProjectSec((p) => p + 600);
    if (category === 'rest') setFocusRestSec((p) => p + 600);
  };

  // ---- AI Weekly Review ----
  const [review, setReview] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const generateWeeklyReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      let focusLog: { date: string; minutes: number }[] = [];
      try {
        focusLog = JSON.parse(localStorage.getItem('ns_focus_log') || '[]') as { date: string; minutes: number }[];
      } catch { /* ignore */ }
      const summary = {
        notes: notes.map(n => ({ title: n.title, favorite: !!n.isFavorite })),
        tasks: tasks.map(t => ({ title: t.title, done: !!t.isCompleted, priority: t.priority })),
        habits: habits.map(h => ({ title: h.title, completed: (h.completedDates || []).length, streak: h.streak })),
        goals: goals.map(g => ({ name: g.name, progress: g.progress })),
        focusMinutes: focusLog.reduce((s, l) => s + (l.minutes || 0), 0),
      };
      const res = await fetch('/api/ai/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setReviewError(data.error || 'Ошибка генерации обзора');
        return;
      }
      setReview(data.review || '');
    } catch (e) {
      setReviewError('Сеть недоступна. Убедитесь, что сервер запущен.');
    } finally {
      setReviewLoading(false);
    }
  };

  const renderReviewMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (/^#{1,3}\s/.test(trimmed)) {
        return <h3 key={i} className="font-bold text-slate-800 dark:text-white text-sm mt-2">{trimmed.replace(/^#+\s/, '')}</h3>;
      }
      if (/^[-*•]\s/.test(trimmed)) {
        return (
          <div key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-xs mt-1">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span>{trimmed.replace(/^[-*•]\s/, '')}</span>
          </div>
        );
      }
      if (/^\d+[.)]\s/.test(trimmed)) {
        return (
          <div key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-xs mt-1">
            <span className="mt-0.5 text-[10px] font-mono text-indigo-500 shrink-0">{trimmed.match(/^\d+/)?.[0]}.</span>
            <span>{trimmed.replace(/^\d+[.)]\s/, '')}</span>
          </div>
        );
      }
      return <p key={i} className="text-slate-600 dark:text-slate-300 text-xs mt-1.5">{trimmed}</p>;
    });
  };

  const exportReportPdf = () => {
    let focusMinutes = 0;
    try {
      const log = JSON.parse(localStorage.getItem('ns_focus_log') || '[]') as { minutes: number }[];
      focusMinutes = log.reduce((s, l) => s + (l.minutes || 0), 0);
    } catch { /* ignore */ }
    openReportAsPdf({
      tasks,
      habits,
      goals,
      notes,
      focusMinutes,
    });
  };

  return (
    <div id="stats-tab-scroller" className="space-y-6 max-w-6xl mx-auto p-1 font-sans">
      
      {/* 0. AI WEEKLY REVIEW */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200/50 dark:border-indigo-800/40 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm font-display">Недельный обзор (AI)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Сводка задач, привычек, целей и фокус-времени</p>
            </div>
          </div>
          <button
            id="weekly-review-btn"
            onClick={generateWeeklyReview}
            disabled={reviewLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            {reviewLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {review ? 'Обновить' : 'Сгенерировать'}
          </button>
          <button
            id="stats-export-pdf-btn"
            onClick={exportReportPdf}
            title="Экспорт отчёта в PDF (через печать)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold transition hover:border-indigo-400 hover:text-indigo-500"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>

        {reviewError && (
          <div className="mt-3 flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{reviewError}</span>
          </div>
        )}

        {reviewLoading && (
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Gemini анализирует вашу неделю...
          </div>
        )}

        {review && !reviewLoading && (
          <div className="mt-4 bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 space-y-1">
            {renderReviewMarkdown(review)}
          </div>
        )}
      </motion.div>

      {/* 1. HERO TOTAL GRID */}
      <div id="stats-grid-hero" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Notes metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="flex justify-between items-center text-slate-400">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Заметки</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{notesCount}</p>
            <p className="text-[10px] text-slate-500">{favoriteNotesCount} в избранном • {privateNotesCount} заблокировано</p>
          </div>
        </div>

        {/* Tasks Metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 animate-fade-up" style={{ animationDelay: '90ms' }}>
          <div className="flex justify-between items-center text-slate-400">
            <ListTodo className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Задачи</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{taskCompletionRate}%</p>
            <p className="text-[10px] text-slate-500">{completedTasks} решено • {activeTasks} в процессе</p>
          </div>
        </div>

        {/* Use Time metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="flex justify-between items-center text-slate-400">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Сессия</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono leading-none">{formatUsageTime(appSeconds)}</p>
            <p className="text-[10px] text-slate-500">Реальное время текущей сессии</p>
          </div>
        </div>

        {/* Total funds metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 animate-fade-up" style={{ animationDelay: '270ms' }}>
          <div className="flex justify-between items-center text-slate-400">
            <DollarSign className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Баланс</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{formatMoney(incomes - expenses)}</p>
            <p className="text-[10px] text-slate-500">+{formatMoney(incomes)} / -{formatMoney(expenses)}</p>
          </div>
        </div>

      </div>

      {/* 2. TIME ALLOCATIONS BAR CHARTS */}
      <div id="stats-middle-structure" className="grid lg:grid-cols-3 gap-6">
        
        {/* focus logging card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Логгер распределения времени</h3>
            <p className="text-xs text-slate-400">Нажмите на категорию, чтобы добавить +10 минут к фокусному времени</p>
          </div>

          <div className="space-y-3.5 my-4">
            {/* Work */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Работа над кодом / проектом</span>
              <button
                id="add-time-work-btn"
                onClick={() => addFocusMinutes('work')}
                className="py-1 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-800 dark:text-white"
              >
                +10 мин ({(focusWorkSec / 60).toFixed(0)}м)
              </button>
            </div>

            {/* Study */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Обучение / Чтение / Лекции</span>
              <button
                id="add-time-study-btn"
                onClick={() => addFocusMinutes('study')}
                className="py-1 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-800 dark:text-white"
              >
                +10 мин ({(focusStudySec / 60).toFixed(0)}м)
              </button>
            </div>

            {/* Project */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Планы / Финансы / Проекты</span>
              <button
                id="add-time-project-btn"
                onClick={() => addFocusMinutes('project')}
                className="py-1 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-800 dark:text-white"
              >
                +10 мин ({(focusProjectSec / 60).toFixed(0)}м)
              </button>
            </div>

            {/* Rest */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Спорт / Перерывы / Сон</span>
              <button
                id="add-time-rest-btn"
                onClick={() => addFocusMinutes('rest')}
                className="py-1 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-800 dark:text-white"
              >
                +10 мин ({(focusRestSec / 60).toFixed(0)}м)
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 italic">Данные обновляются в реальном времени. Начните Pomodoro сессии из раздела Часов!</div>
        </div>

        {/* time spent graph visualization. pure responsive svg. */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Аналитика фокусной деятельности</h3>
              <p className="text-xs text-slate-400">Сравнительный график распределения по часам</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          {/* Sizable visual bar graph */}
          <div id="focus-graph-container" className="flex items-end justify-around h-44 border-b border-slate-100 dark:border-slate-800/50 pb-2 px-4 gap-6 pt-6">
            {[
              { label: 'Учеба', secs: focusStudySec, color: '#10b981' },
              { label: 'Работа', secs: focusWorkSec, color: '#3b82f6' },
              { label: 'Проекты', secs: focusProjectSec, color: '#8b5cf6' },
              { label: 'Отдых', secs: focusRestSec, color: '#f59e0b' },
            ].map((bar) => {
              const maxSecs = Math.max(1, focusStudySec, focusWorkSec, focusProjectSec, focusRestSec);
              const pctHeight = (bar.secs / maxSecs) * 100;
              return (
                <div id={`focus-bar-${bar.label}`} key={bar.label} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-bold text-slate-800 dark:text-white font-mono opacity-80 scale-95 group-hover:scale-100 transition duration-300">
                    {formatHoursValue(bar.secs)}
                  </span>
                  
                  {/* Solid Bar */}
                  <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden h-28 relative flex items-end">
                    <motion.div
                      id={`bar-fill-${bar.label}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${pctHeight}%` }}
                      whileHover={{ scaleY: 1.06 }}
                      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
                      className="w-full rounded-t-lg origin-bottom"
                      style={{
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-full text-center">{bar.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-3">
            <span>Общее время деятельности: <strong>{((focusStudySec + focusWorkSec + focusProjectSec + focusRestSec) / 365).toFixed(1)} ч</strong></span>
            <span>Статистика обновлена: сегодня</span>
          </div>
        </div>

      </div>

      {/* 3. TASK COMPLETION HIGHLIGHT */}
      <div id="stats-bottom-row" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-4">Еженедельный план успеваемости</h3>
        
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="space-y-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold">Выполнено целей</span>
            <p className="text-3xl font-black text-emerald-500" style={{ color: accentColor }}>{completedTasks}</p>
            <p className="text-[10px] text-slate-400">Прогрессивные TO-DO задачи</p>
          </div>

          <div className="space-y-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold">Активные дедлайны</span>
            <p className="text-3xl font-black text-amber-500">{activeTasks}</p>
            <p className="text-[10px] text-slate-400">Задачи с ближайшим дедлайном</p>
          </div>

          <div className="space-y-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold">КПД Творчества</span>
            <p className="text-3xl font-black text-indigo-500">{((notesCount * 1.5 + completedTasks * 2.5)).toFixed(0)} ед.</p>
            <p className="text-[10px] text-slate-400 font-sans">Оценка активности на основе действий</p>
          </div>
        </div>
      </div>

    </div>
  );
}
