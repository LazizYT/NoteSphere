/**
 * NoteSphere OS — ProjectHub (Level 2 Dedicated Project Workspace)
 * Flagship unifying workspace connecting Tasks, Notes, Canvas, Files, Finance, Timeline, and AI.
 * Designed with Linear-like clarity, breathable layout, and 100% solid opaque dark surfaces.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  Notebook,
  Sparkles,
  Paperclip,
  DollarSign,
  Calendar,
  Bot,
  Plus,
  Target,
  Clock,
  Settings,
  MoreVertical,
  CheckCircle2,
  Circle,
  TrendingUp,
  AlertTriangle,
  Play,
  FileText,
  ExternalLink,
  Trash2,
  Edit2,
  Columns,
  List as ListIcon,
  ChevronRight,
  Send,
  Sparkle,
} from 'lucide-react';
import {
  Project,
  Task,
  Note,
  FinancialTransaction,
  ProjectMilestone,
  ProjectStatus,
  Importance,
} from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectHubProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenEditModal: (project: Project) => void;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  notes: Note[];
  onAddNote: (note: Note) => void;
  onSelectNote: (noteId: string) => void;
  transactions: FinancialTransaction[];
  onAddTransaction: (tx: FinancialTransaction) => void;
  currency?: string;
  accentColor?: string;
}

type ProjectSubTab =
  | 'overview'
  | 'tasks'
  | 'notes'
  | 'canvas'
  | 'files'
  | 'finance'
  | 'timeline'
  | 'ai';

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: string; color: string }[] = [
  { value: 'idea', label: '💡 Идея', icon: '💡', color: '#f59e0b' },
  { value: 'planning', label: '📝 Планирование', icon: '📝', color: '#3b82f6' },
  { value: 'in_progress', label: '🔨 В работе', icon: '🔨', color: '#6366f1' },
  { value: 'paused', label: '⏸ На паузе', icon: '⏸', color: '#64748b' },
  { value: 'launch', label: '🚀 Запуск', icon: '🚀', color: '#06b6d4' },
  { value: 'completed', label: '✅ Завершён', icon: '✅', color: '#10b981' },
];

export default function ProjectHub({
  project,
  onBack,
  onUpdateProject,
  onDeleteProject,
  onOpenEditModal,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  notes,
  onAddNote,
  onSelectNote,
  transactions,
  onAddTransaction,
  currency = 'rub',
  accentColor = '#8b5cf6',
}: ProjectHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<ProjectSubTab>('overview');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // Quick Task input state inside Tasks sub-tab
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Importance>('medium');
  const [tasksViewMode, setTasksViewMode] = useState<'list' | 'kanban'>('list');

  // Quick Expense state inside Finance sub-tab
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickExpenseComment, setQuickExpenseComment] = useState('');
  const [quickExpenseType, setQuickExpenseType] = useState<'expense' | 'income'>('expense');

  // AI Chat & quick actions state
  const [aiChatMessages, setAiChatMessages] = useState<
    { sender: 'user' | 'assistant'; text: string; time: string }[]
  >([]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  // Filter linked data for this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === project.id || t.category === project.name);
  }, [tasks, project.id, project.name]);

  const projectNotes = useMemo(() => {
    return notes.filter((n) => n.projectId === project.id || n.categoryId === project.id);
  }, [notes, project.id]);

  const projectTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.projectId === project.id);
  }, [transactions, project.id]);

  // Calculations
  const completedTasks = projectTasks.filter((t) => t.isCompleted);
  const totalTasks = projectTasks.length;
  const inProgressTasks = projectTasks.filter((t) => !t.isCompleted && (t.status === 'in_progress' || (t.progress > 0 && t.progress < 100)));
  const plannedTasks = projectTasks.filter((t) => !t.isCompleted && !inProgressTasks.includes(t));

  const progressPercent = totalTasks > 0
    ? Math.round((completedTasks.length / totalTasks) * 100)
    : (project.milestones && project.milestones.length > 0
        ? Math.round((project.milestones.filter((m) => m.isCompleted).length / project.milestones.length) * 100)
        : (project.status === 'completed' ? 100 : 0));

  // Finance calculations
  const totalExpenses = projectTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalIncome = projectTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const budgetLimit = project.budgetLimit || 0;
  const budgetSpentPercent = budgetLimit > 0 ? Math.min(100, Math.round((totalExpenses / budgetLimit) * 100)) : 0;

  // Milestone toggling
  const handleToggleMilestone = (milestoneId: string) => {
    const updatedMilestones = (project.milestones || []).map((m) =>
      m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
    );
    onUpdateProject({ ...project, milestones: updatedMilestones });
    triggerHaptic('light');
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) return;

    const newM: ProjectMilestone = {
      id: `m-${Date.now()}`,
      title: newMilestoneText.trim(),
      targetDate: newMilestoneDate || undefined,
      isCompleted: false,
    };

    onUpdateProject({
      ...project,
      milestones: [...(project.milestones || []), newM],
    });
    setNewMilestoneText('');
    setNewMilestoneDate('');
    setIsAddingMilestone(false);
    triggerHaptic('success');
  };

  // Quick Task Add
  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: quickTaskTitle.trim(),
      isCompleted: false,
      subtasks: [],
      priority: quickTaskPriority,
      category: project.name,
      recurrence: 'none',
      progress: 0,
      projectId: project.id,
      status: 'todo',
    };

    onAddTask(newTask);
    setQuickTaskTitle('');
    triggerHaptic('success');
  };

  // Quick Note Add
  const handleCreateProjectNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: `Заметка: ${project.name}`,
      content: `<p>Рабочие материалы по проекту <strong>${project.name}</strong>...</p>`,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-work',
      tags: [project.name.toLowerCase().replace(/\s+/g, '-')],
      importance: 'medium',
      color: project.color || accentColor,
      attachments: [],
      isProtected: false,
      versions: [],
      projectId: project.id,
    };

    onAddNote(newNote);
    onSelectNote(newNote.id);
    triggerHaptic('success');
  };

  // Quick Transaction Add
  const handleQuickAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(quickExpenseAmount);
    if (!amount || isNaN(amount)) return;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      type: quickExpenseType,
      amount,
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat-work',
      comment: quickExpenseComment.trim() || `Расход по проекту ${project.name}`,
      projectId: project.id,
    };

    onAddTransaction(newTx);
    setQuickExpenseAmount('');
    setQuickExpenseComment('');
    triggerHaptic('success');
  };

  // AI Prompt execution - Real AI backend integration with offline fallback
  const handleRunAiAction = async (actionText: string) => {
    const query = actionText.trim();
    if (!query) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: query, time: timeStr },
    ]);
    setAiThinking(true);
    triggerHaptic('light');

    try {
      const res = await fetch('/api/ai/project-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          project,
          tasks: projectTasks,
          transactions: projectTransactions,
          notes: projectNotes,
          history: aiChatMessages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }

      const data = await res.json();
      const reply = data.reply || 'Запрос по проекту обработан.';

      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Project AI fetch error, using local fallback:', err);
      let aiResponse = '';
      if (query.includes('Проанализировать') || query.includes('состояние')) {
        aiResponse = `📊 **Анализ проекта «${project.name}»**:\n\n• Общий прогресс: **${progressPercent}%** (${completedTasks.length} из ${totalTasks} задач выполнено).\n• Статус: **${STATUS_OPTIONS.find((s) => s.value === project.status)?.label || 'В работе'}**.\n• Дедлайн: **${project.deadline || 'Не задан'}**.\n• Финансы: израсходовано **${totalExpenses.toLocaleString()} ₽** из бюджета **${budgetLimit ? budgetLimit.toLocaleString() + ' ₽' : 'не ограничен'}**.\n\n💡 **Рекомендация NEXAR**: сосредоточьтесь на ключевых вехах и завершите задачи с наивысшим приоритетом.`;
      } else if (query.includes('просроченные') || query.includes('риски')) {
        aiResponse = `⚠️ **Аудит сроков и рисков**:\n\nВсего активных задач: ${totalTasks - completedTasks.length}.\nКритический путь: веха «${project.milestones?.[1]?.title || 'Ближайшая цель'}» требует повышенного внимания.\nЗадач с высоким приоритетом: ${projectTasks.filter((t) => !t.isCompleted && (t.priority === 'high' || t.priority === 'critical')).length}.\nБлокировок критического уровня не обнаружено.`;
      } else if (query.includes('Разбить цель') || query.includes('план')) {
        aiResponse = `🎯 **Предлагаемый пошаговый план для цели «${project.targetGoal || project.name}»**:\n\n1. Провести аудит архитектуры и зависимостей.\n2. Настроить рабочий процесс и контрольные точки.\n3. Реализовать основную бизнес-логику ключевого этапа.\n4. Провести интеграционное тестирование и собрать обратную связь.\n5. Подготовить документацию к релизу.`;
      } else if (query.includes('расходы') || query.includes('бюджет')) {
        aiResponse = `💰 **Финансовая сводка**:\n\nВсего операций: ${projectTransactions.length}.\nОбщие расходы: ${totalExpenses.toLocaleString()} ₽.\nДоходы: ${totalIncome.toLocaleString()} ₽.\nОстаток бюджета: ${budgetLimit ? (budgetLimit - totalExpenses).toLocaleString() + ' ₽' : 'Бюджет не задан'}. Расход в пределах нормы.`;
      } else {
        aiResponse = `💡 **NEXAR AI по проекту «${project.name}»**:\n\nЯ проанализировал ваш запрос «${query}». Рекомендую придерживаться плана вех и зафиксировать результаты в заметке проекта.`;
      }

      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: aiResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerHaptic('light');
    } finally {
      setAiThinking(false);
    }
  };

  const handleSendAiCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;
    const text = aiInputText.trim();
    setAiInputText('');
    handleRunAiAction(text);
  };

  const currentStatusObj = STATUS_OPTIONS.find((s) => s.value === project.status) || STATUS_OPTIONS[2];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#090b10] text-slate-900 dark:text-slate-200 select-none pb-12">
      {/* Top Navigation & Project Header */}
      <div className="bg-white dark:bg-[#0e1422] border-b border-slate-200 dark:border-[#1e2638] px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Back, Title, Status Selector, Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                onBack();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111622] hover:bg-slate-200 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Проекты</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">{project.icon || '📁'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {project.name}
                  </h1>
                </div>
                {project.targetGoal && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    🎯 {project.targetGoal}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Action buttons: Status Dropdown & Settings */}
          <div className="flex items-center gap-2 relative">
            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                style={{
                  backgroundColor: `${currentStatusObj.color}15`,
                  borderColor: `${currentStatusObj.color}40`,
                  color: currentStatusObj.color,
                }}
              >
                <span>{currentStatusObj.label}</span>
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 top-9 z-40 w-44 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl shadow-xl py-1 text-xs">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onUpdateProject({ ...project, status: opt.value });
                        setStatusDropdownOpen(false);
                        triggerHaptic('light');
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 transition ${
                        project.status === opt.value ? 'font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label.replace(/^[^\s]+\s/, '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit / Settings button */}
            <button
              onClick={() => onOpenEditModal(project)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111622] hover:bg-slate-200 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
              title="Настройки проекта"
            >
              <Settings size={15} />
            </button>

            {/* Delete button */}
            <button
              onClick={() => {
                if (confirm(`Удалить проект «${project.name}»? Все связанные данные останутся в разделах.`)) {
                  onDeleteProject(project.id);
                  onBack();
                }
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111622] hover:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-slate-200 dark:border-[#1e2638] text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
              title="Удалить проект"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Row 2: Linear Overall Progress Strip */}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{progressPercent}% выполнено</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{completedTasks.length} из {totalTasks} задач закрыто</span>
            </div>
            {project.deadline && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <Calendar size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span>Дедлайн: {project.deadline}</span>
              </div>
            )}
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#151c2c] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: project.color || accentColor,
              }}
            />
          </div>
        </div>

        {/* Row 3: Sub-Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
          {[
            { id: 'overview' as const, label: 'Обзор', icon: LayoutDashboard, badge: null },
            { id: 'tasks' as const, label: 'Задачи', icon: CheckSquare, badge: totalTasks },
            { id: 'notes' as const, label: 'Заметки', icon: Notebook, badge: projectNotes.length },
            { id: 'canvas' as const, label: 'Canvas', icon: Sparkles, badge: null },
            { id: 'files' as const, label: 'Файлы', icon: Paperclip, badge: null },
            { id: 'finance' as const, label: 'Финансы', icon: DollarSign, badge: projectTransactions.length > 0 ? projectTransactions.length : null },
            { id: 'timeline' as const, label: 'Timeline', icon: Calendar, badge: null },
            { id: 'ai' as const, label: 'AI Ассистент', icon: Bot, badge: 'NEXAR' },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                data-subtab={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id);
                  triggerHaptic('light');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <IconComponent size={14} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#151c2c] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Area for Active Sub-Tab */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ============================================================== */}
          {/* SUB-TAB 1: ОБЗОР (OVERVIEW) — Airy Linear/Bento Layout */}
          {/* ============================================================== */}
          {activeSubTab === 'overview' && (
            <motion.div
              key="subtab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* Top Bento Grid: Progress & Milestones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 📊 ПРОГРЕСС CARD */}
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-500 dark:text-indigo-400" />
                      <span>ПРОГРЕСС ПРОЕКТА</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                      {completedTasks.length} / {totalTasks} задач
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {progressPercent}%
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#151c2c] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: project.color || accentColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638] grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{completedTasks.length}</div>
                      <div className="text-slate-500 text-[10px]">Завершено</div>
                    </div>
                    <div>
                      <div className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{inProgressTasks.length}</div>
                      <div className="text-slate-500 text-[10px]">В работе</div>
                    </div>
                    <div>
                      <div className="text-slate-700 dark:text-slate-300 font-bold font-mono">{plannedTasks.length}</div>
                      <div className="text-slate-500 text-[10px]">В плане</div>
                    </div>
                  </div>
                </div>

                {/* 🎯 БЛИЖАЙШИЕ ЦЕЛИ (MILESTONES) CARD */}
                <div className="md:col-span-2 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={14} className="text-amber-400" />
                      <span>КЛЮЧЕВЫЕ ВЕХИ И ЦЕЛИ</span>
                    </span>
                    <button
                      onClick={() => setIsAddingMilestone((prev) => !prev)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Добавить веху</span>
                    </button>
                  </div>

                  {/* Inline Add Milestone Form */}
                  {isAddingMilestone && (
                    <form onSubmit={handleAddMilestone} className="p-3 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl space-y-2">
                      <input
                        type="text"
                        required
                        value={newMilestoneText}
                        onChange={(e) => setNewMilestoneText(e.target.value)}
                        placeholder="Название вехи (например: Релиз MVP, Запуск в продакшн)..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={newMilestoneDate}
                          onChange={(e) => setNewMilestoneDate(e.target.value)}
                          className="px-2.5 py-1 bg-white dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingMilestone(false)}
                            className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Milestones List */}
                  <div className="space-y-2 overflow-y-auto max-h-48 scrollbar-thin pr-1">
                    {(!project.milestones || project.milestones.length === 0) ? (
                      <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        У проекта пока нет ключевых вех. Нажмите «Добавить веху»!
                      </div>
                    ) : (
                      project.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          onClick={() => handleToggleMilestone(milestone.id)}
                          className="p-2.5 bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between gap-3 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {milestone.isCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            <span
                              className={`text-xs font-medium truncate ${
                                milestone.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {milestone.title}
                            </span>
                          </div>
                          {milestone.targetDate && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {milestone.targetDate}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Выполнено: {project.milestones?.filter((m) => m.isCompleted).length || 0} из {project.milestones?.length || 0}</span>
                    <span>{project.deadline ? `Финал: ${project.deadline}` : ''}</span>
                  </div>
                </div>
              </div>

              {/* 📅 TIMELINE ROADMAP PREVIEW */}
              {project.milestones && project.milestones.length > 0 && (
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-500 dark:text-indigo-400" />
                      <span>ДОРОЖНАЯ КАРТА ВЕХ (ROADMAP)</span>
                    </span>
                    <button
                      onClick={() => setActiveSubTab('timeline')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Полный Timeline</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Visual Roadmap Path */}
                  <div className="relative py-4 px-2">
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 dark:bg-[#1e2638] -translate-y-1/2 z-0" />
                    <div className="relative z-10 flex items-center justify-between gap-4 overflow-x-auto pb-2">
                      {project.milestones.map((m, idx) => (
                        <div key={m.id} className="flex flex-col items-center text-center shrink-0 min-w-[110px]">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                              m.isCompleted
                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-slate-100 dark:bg-[#111622] border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {m.isCompleted ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[11px] font-bold mt-2 truncate max-w-[120px] ${m.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                            {m.title}
                          </span>
                          {m.targetDate && (
                            <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                              {m.targetDate}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Lower Bento Grid: Recent Notes & Top Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 📝 ПОСЛЕДНИЕ ЗАМЕТКИ */}
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Notebook size={14} className="text-purple-500 dark:text-purple-400" />
                      <span>ЗАМЕТКИ ПРОЕКТА</span>
                    </span>
                    <button
                      onClick={handleCreateProjectNote}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Новая заметка</span>
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    {projectNotes.length === 0 ? (
                      <div className="h-32 border border-dashed border-slate-200 dark:border-[#1e2638] rounded-xl flex flex-col items-center justify-center text-center p-4 gap-2">
                        <Notebook size={20} className="text-slate-400 dark:text-slate-600" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Нет прикрепленных заметок</span>
                        <button
                          onClick={handleCreateProjectNote}
                          className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/20"
                        >
                          Создать заметку
                        </button>
                      </div>
                    ) : (
                      projectNotes.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => onSelectNote(n.id)}
                          className="p-3 bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between gap-3 cursor-pointer transition"
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{n.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {n.content.replace(/<[^>]*>?/gm, '').slice(0, 60)}...
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setActiveSubTab('notes')}
                    className="w-full py-2 bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Все заметки проекта ({projectNotes.length})</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* ✅ ЗАДАЧИ ПРОЕКТА */}
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-indigo-500 dark:text-indigo-400" />
                      <span>АКТИВНЫЕ ЗАДАЧИ</span>
                    </span>
                    <button
                      onClick={() => setActiveSubTab('tasks')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Управление задачами</span>
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    {projectTasks.length === 0 ? (
                      <div className="h-32 border border-dashed border-slate-200 dark:border-[#1e2638] rounded-xl flex flex-col items-center justify-center text-center p-4 gap-2">
                        <CheckSquare size={20} className="text-slate-400 dark:text-slate-600" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Нет задач по проекту</span>
                      </div>
                    ) : (
                      projectTasks.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            onUpdateTask({ ...t, isCompleted: !t.isCompleted });
                            triggerHaptic('light');
                          }}
                          className="p-3 bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between gap-3 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {t.isCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            <span
                              className={`text-xs font-medium truncate ${
                                t.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                          {t.priority && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                t.priority === 'critical'
                                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400'
                                  : t.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setActiveSubTab('tasks')}
                    className="w-full py-2 bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Все задачи проекта ({totalTasks})</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 2: ЗАДАЧИ (TASKS) */}
          {/* ============================================================== */}
          {activeSubTab === 'tasks' && (
            <motion.div
              key="subtab-tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              {/* Quick Add Task Bar */}
              <form
                onSubmit={handleQuickAddTask}
                className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] p-3 rounded-2xl flex flex-wrap items-center gap-2.5 shadow-sm"
              >
                <input
                  type="text"
                  required
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="Добавить новую задачу в проект..."
                  className="flex-1 min-w-[200px] px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as Importance)}
                  className="px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Добавить</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                {projectTasks.length === 0 ? (
                  <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                    В этом проекте пока нет задач. Добавьте первую задачу выше!
                  </div>
                ) : (
                  projectTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-400 dark:hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-3 transition shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => {
                            onUpdateTask({ ...t, isCompleted: !t.isCompleted });
                            triggerHaptic('light');
                          }}
                          className="cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {t.isCompleted ? (
                            <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Circle size={18} className="text-slate-400 dark:text-slate-500" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-medium truncate ${
                            t.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {t.dueDate && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{t.dueDate}</span>
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            t.priority === 'critical'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : t.priority === 'high'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                        <button
                          onClick={() => onDeleteTask(t.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Удалить задачу"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 3: ЗАМЕТКИ (NOTES) */}
          {/* ============================================================== */}
          {activeSubTab === 'notes' && (
            <motion.div
              key="subtab-notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Материалы и документы проекта ({projectNotes.length})
                </span>
                <button
                  onClick={handleCreateProjectNote}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Создать заметку</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectNotes.length === 0 ? (
                  <div className="md:col-span-2 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                    У этого проекта пока нет заметок. Нажмите «Создать заметку»!
                  </div>
                ) : (
                  projectNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-purple-400 dark:hover:border-slate-700 rounded-2xl p-4 space-y-2 cursor-pointer transition shadow-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                          {note.title}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {note.content.replace(/<[^>]*>?/gm, '').slice(0, 140)}...
                      </p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#111622] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1e2638]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 4: CANVAS (ХОЛСТ ПРОЕКТА) */}
          {/* ============================================================== */}
          {activeSubTab === 'canvas' && (
            <motion.div
              key="subtab-canvas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-6 text-center space-y-3 shadow-sm">
                <Sparkles size={32} className="text-indigo-500 dark:text-indigo-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Spatial Canvas проекта «{project.name}»</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Интерактивная доска для архитектурных схем, связей между модулями и майнд-мэппинга.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
                  <div className="p-3 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl">
                    <div className="text-xs font-bold text-slate-800 dark:text-white mb-1">Архитектура</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Схемы взаимодействия микросервисов и API</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl">
                    <div className="text-xs font-bold text-slate-800 dark:text-white mb-1">Связи сущностей</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Автоматическая визуализация [[Wikilinks]]</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl">
                    <div className="text-xs font-bold text-slate-800 dark:text-white mb-1">Roadmap узлов</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Связи между задачами и вехами релиза</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 5: ФАЙЛЫ & МЕДИА (FILES) */}
          {/* ============================================================== */}
          {activeSubTab === 'files' && (
            <motion.div
              key="subtab-files"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-6 text-center space-y-3 shadow-sm">
                <Paperclip size={32} className="text-indigo-500 dark:text-indigo-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Файлы и медиаматериалы проекта</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Скриншоты, техническая документация, видеозаписи демо и дизайн-макеты проекта.
                </p>
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => alert('Прикрепить файл: выберите файл с диска или укажите ссылку на облако.')}
                    className="px-4 py-2 bg-slate-100 dark:bg-[#111622] hover:bg-slate-200 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs font-bold text-slate-800 dark:text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} className="text-indigo-500 dark:text-indigo-400" />
                    <span>Загрузить вложение</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 6: ФИНАНСЫ (FINANCE) */}
          {/* ============================================================== */}
          {activeSubTab === 'finance' && (
            <motion.div
              key="subtab-finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-5"
            >
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Всего расходов</span>
                  <div className="text-2xl font-black text-rose-500 dark:text-rose-400 font-mono mt-1">
                    {totalExpenses.toLocaleString()} ₽
                  </div>
                </div>
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Всего доходов</span>
                  <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono mt-1">
                    {totalIncome.toLocaleString()} ₽
                  </div>
                </div>
                <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Лимит бюджета</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {budgetLimit ? `${budgetLimit.toLocaleString()} ₽` : 'Не ограничен'}
                  </div>
                  {budgetLimit > 0 && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Израсходовано {budgetSpentPercent}%
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Expense Logging Form */}
              <form
                onSubmit={handleQuickAddExpense}
                className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] p-3 rounded-2xl flex flex-wrap items-center gap-2.5 shadow-sm"
              >
                <select
                  value={quickExpenseType}
                  onChange={(e) => setQuickExpenseType(e.target.value as 'expense' | 'income')}
                  className="px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  value={quickExpenseAmount}
                  onChange={(e) => setQuickExpenseAmount(e.target.value)}
                  placeholder="Сумма (₽)..."
                  className="w-28 px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={quickExpenseComment}
                  onChange={(e) => setQuickExpenseComment(e.target.value)}
                  placeholder="Комментарий (сервер, API, подписка)..."
                  className="flex-1 min-w-[200px] px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Записать</span>
                </button>
              </form>

              {/* Transactions List */}
              <div className="space-y-2">
                {projectTransactions.length === 0 ? (
                  <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                    У этого проекта пока нет финансовых операций.
                  </div>
                ) : (
                  projectTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{tx.comment || 'Операция без описания'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{tx.date}</div>
                      </div>
                      <div
                        className={`font-mono font-bold ${
                          tx.type === 'expense' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString()} ₽
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 7: TIMELINE (ТАЙМЛАЙН ПРОЕКТА) */}
          {/* ============================================================== */}
          {activeSubTab === 'timeline' && (
            <motion.div
              key="subtab-timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Таймлайн вех и дедлайнов</h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {project.startDate || 'Старт'} → {project.deadline || 'Дедлайн'}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {(project.milestones || []).map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-bold">#{idx + 1}</span>
                        <div>
                          <div className={`text-xs font-bold ${m.isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                            {m.title}
                          </div>
                          {m.targetDate && (
                            <div className="text-[10px] text-slate-500 font-mono">Дедлайн вехи: {m.targetDate}</div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.isCompleted ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                        }`}
                      >
                        {m.isCompleted ? 'Завершено' : 'В графике'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 8: PROJECT AI ASSISTANT */}
          {/* ============================================================== */}
          {activeSubTab === 'ai' && (
            <motion.div
              key="subtab-ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-4"
            >
              {/* AI Diagnostic Summary Card */}
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      PROJECT AI • ДИАГНОСТИКА ПРОЕКТА
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiChatMessages.length > 0 && (
                      <button
                        onClick={() => {
                          setAiChatMessages([]);
                          triggerHaptic('light');
                        }}
                        className="text-[10px] font-semibold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition px-2 py-0.5 rounded cursor-pointer"
                        title="Очистить историю чата"
                      >
                        Очистить чат
                      </button>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 font-mono">
                      NEXAR ENGINE
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Текущее состояние:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{progressPercent}% готовности</span>
                  </div>
                  <div>
                    {completedTasks.length === totalTasks && totalTasks > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Все задачи проекта успешно закрыты! Готов к релизу.</span>
                    ) : (
                      <span>
                        Осталось завершить {totalTasks - completedTasks.length} задач. Ближайший фокус:{' '}
                        <strong>{projectTasks.find((t) => !t.isCompleted)?.title || 'Ключевые вехи'}</strong>.
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Quick Prompts Bar */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Проанализировать состояние проекта',
                    'Найти риски и просроченные задачи',
                    'Разбить цель на задачи',
                    'Сделать summary проекта',
                    'Оценить расходы и бюджет',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleRunAiAction(prompt)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkle size={11} className="text-indigo-500 dark:text-indigo-400" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive AI Chat Stream */}
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 flex flex-col h-80 shadow-sm">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {aiChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500 gap-2">
                      <Bot size={24} className="text-slate-300 dark:text-slate-600" />
                      <span>Задайте любой вопрос или нажмите быструю команду выше</span>
                    </div>
                  ) : (
                    aiChatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono px-1">
                          {msg.time}
                        </span>
                      </div>
                    ))
                  )}
                  {aiThinking && (
                    <div className="flex items-center gap-2 text-xs text-indigo-500 dark:text-indigo-400 italic">
                      <div className="w-3 h-3 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>NEXAR анализирует контекст проекта...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendAiCustom} className="pt-3 border-t border-slate-200 dark:border-[#1e2638] flex gap-2">
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Спросить AI о проекте (например: что блокирует релиз?)..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
