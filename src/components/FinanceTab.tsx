/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import {
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  AlertCircle,
  Percent,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  ShieldCheck,
  ChevronRight,
  Filter,
  Search,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { FinancialTransaction, FinancialBudget, FinancialGoal, Category } from '../types';
import { Language } from '../config/translations';

interface FinanceTabProps {
  transactions: FinancialTransaction[];
  budget: FinancialBudget;
  goals: FinancialGoal[];
  categories: Category[];
  onAddTransaction: (t: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateBudget: (b: FinancialBudget) => void;
  onAddFinancialGoal: (g: FinancialGoal) => void;
  onDeleteFinancialGoal: (id: string) => void;
  onUpdateFinancialGoal: (g: FinancialGoal) => void;
  accentColor: string;
  currency?: 'sum' | 'dollar' | 'krw';
  language?: Language;
}

export const FINANCE_CATEGORIES = [
  { id: 'f-food', name: 'Еда и продукты', icon: '🍔', color: '#10b981' },
  { id: 'f-transport', name: 'Транспорт и авто', icon: '🚗', color: '#3b82f6' },
  { id: 'f-edu', name: 'Обучение и курсы', icon: '🎓', color: '#8b5cf6' },
  { id: 'f-entertain', name: 'Развлечения и досуг', icon: '🎉', color: '#ec4899' },
  { id: 'f-sub', name: 'Подписки и софт', icon: '⚡', color: '#14b8a6' },
  { id: 'f-health', name: 'Здоровье и спорт', icon: '❤️', color: '#ef4444' },
  { id: 'f-home', name: 'Счета и дом', icon: '🏠', color: '#6366f1' },
  { id: 'f-clothes', name: 'Одежда и стиль', icon: '👕', color: '#f59e0b' },
  { id: 'f-misc', name: 'Прочее', icon: '📦', color: '#64748b' },
  // Income categories
  { id: 'f-salary', name: 'Зарплата', icon: '💼', color: '#22c55e' },
  { id: 'f-gift', name: 'Подарки и бонусы', icon: '🎁', color: '#eab308' },
  { id: 'f-invest', name: 'Инвестиции', icon: '📈', color: '#06b6d4' },
];

export default function FinanceTab({
  transactions,
  budget,
  goals,
  categories,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateBudget,
  onAddFinancialGoal,
  onDeleteFinancialGoal,
  onUpdateFinancialGoal,
  accentColor = '#6366f1',
  currency = 'sum',
  language = 'ru',
}: FinanceTabProps) {
  // Navigation Subtabs: 'overview' | 'goals' | 'analytics'
  const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'goals' | 'analytics'>('overview');

  // Filter category in transaction history
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Input fields for transaction creator
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState(FINANCE_CATEGORIES[0].id);
  const [txComment, setTxComment] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Input fields for savings goals
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate, setGoalDate] = useState(
    () => new Date(Date.now() + 3600000 * 24 * 90).toISOString().split('T')[0]
  );

  const formatMoney = (val: number) => {
    const formatted = Math.round(val).toLocaleString('ru-RU');
    if (currency === 'dollar') return `$ ${formatted}`;
    if (currency === 'krw') return `₩ ${formatted}`;
    return `${formatted} сум`;
  };

  const getCurrencySymbol = () => {
    if (currency === 'dollar') return '$';
    if (currency === 'krw') return '₩';
    return 'сум';
  };

  // Budget settings fields
  const [monthlyLimit, setMonthlyLimit] = useState(budget.monthlyLimit.toString());
  const [weeklyLimit, setWeeklyLimit] = useState(budget.weeklyLimit.toString());

  // Quick increment for transaction amount
  const handleQuickAddAmount = (addVal: number) => {
    const cur = parseFloat(txAmount) || 0;
    setTxAmount(String(cur + addVal));
    triggerHaptic('light');
  };

  // Handle adding transactions
  const handleAddTx = () => {
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      type: txType,
      amount: parsedAmount,
      date: txDate || new Date().toISOString().split('T')[0],
      categoryId: txCategory,
      comment: txComment.trim() || undefined,
    };

    onAddTransaction(newTx);
    triggerHaptic('success');
    setTxAmount('');
    setTxComment('');
  };

  // Handle adding goals
  const handleAddGoal = () => {
    const targetVal = parseFloat(goalTarget);
    const currVal = parseFloat(goalCurrent || '0');
    if (!goalName.trim() || isNaN(targetVal) || targetVal <= 0) return;

    const newGoal: FinancialGoal = {
      id: `fg-${Date.now()}`,
      name: goalName.trim(),
      targetAmount: targetVal,
      currentAmount: isNaN(currVal) ? 0 : currVal,
      targetDate: goalDate,
    };

    onAddFinancialGoal(newGoal);
    triggerHaptic('success');
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('0');
  };

  // Adjust goals money
  const handleAddSavingsMoney = (goalId: string, amountToAdd: number) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const updatedAmount = Math.max(0, Math.min(goal.targetAmount, goal.currentAmount + amountToAdd));
    onUpdateFinancialGoal({
      ...goal,
      currentAmount: updatedAmount,
    });
    triggerHaptic('medium');
  };

  // Save general budget rules
  const handleSaveBudgetLimits = () => {
    const mL = parseFloat(monthlyLimit);
    const wL = parseFloat(weeklyLimit);
    if (isNaN(mL) || isNaN(wL)) return;

    onUpdateBudget({
      ...budget,
      monthlyLimit: mL,
      weeklyLimit: wL,
    });
    triggerHaptic('success');
  };

  // Aggregated figures
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const currentBalance = totalIncome - totalExpense;
  const monthlyLimitVal = budget.monthlyLimit || 1;
  const budgetUsedPct = Math.min(100, Math.round((totalExpense / monthlyLimitVal) * 100));

  // Expenditures calculations grouped by categories
  const expenseByCategory = useMemo(() => {
    return FINANCE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
      const sum = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
        .reduce((s, t) => s + t.amount, 0);
      if (sum > 0) acc[cat.name] = sum;
      return acc;
    }, {});
  }, [transactions]);

  const getCategoryColor = (catName: string) => {
    const match = FINANCE_CATEGORIES.find((c) => c.name === catName);
    return match ? match.color : '#64748b';
  };

  // Filtered transactions for the history list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesCat = selectedCatFilter === 'all' || tx.categoryId === selectedCatFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchedCat = FINANCE_CATEGORIES.find((c) => c.id === tx.categoryId);
      const matchesSearch =
        !q ||
        (tx.comment && tx.comment.toLowerCase().includes(q)) ||
        (matchedCat && matchedCat.name.toLowerCase().includes(q)) ||
        tx.amount.toString().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [transactions, selectedCatFilter, searchQuery]);

  // Cashflow Trend SVG Spline Curve data points
  const trendPoints = useMemo(() => {
    // Generate 7 days or buckets
    const days: { label: string; expense: number; income: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('ru-RU', { weekday: 'short' });
      const exp = transactions
        .filter((t) => t.type === 'expense' && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      const inc = transactions
        .filter((t) => t.type === 'income' && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      days.push({ label: dayLabel, expense: exp, income: inc });
    }
    return days;
  }, [transactions]);

  return (
    <div id="finance-tab-wrapper" className="space-y-6 max-w-7xl mx-auto p-1 font-sans text-slate-800 dark:text-slate-100">
      {/* 🧭 Top Navigation Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setFinanceSubTab('overview');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              financeSubTab === 'overview'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Wallet size={15} />
            <span>Обзор и операции</span>
          </button>

          <button
            onClick={() => {
              setFinanceSubTab('goals');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              financeSubTab === 'goals'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Target size={15} />
            <span>Сбережения и цели</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
              {goals.length}
            </span>
          </button>

          <button
            onClick={() => {
              setFinanceSubTab('analytics');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              financeSubTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <PieChart size={15} />
            <span>Бюджет и аналитика</span>
          </button>
        </div>

        {/* Quick Balance Pill on the right */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl font-mono text-xs shadow-inner">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Чистый баланс:</span>
          <span
            className={`font-black text-sm tracking-tight ${
              currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(currentBalance)}
          </span>
        </div>
      </div>

      {/* 💳 SUBTAB 1: OVERVIEW & TRANSACTIONS */}
      {financeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Summary Cards Grid */}
          <div id="fin-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Balance Card (Flagship Solid Dark Card) */}
            <div className="relative overflow-hidden bg-white dark:bg-[#0e1422] border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between group hover:border-indigo-400/50 transition-all duration-300">
              <div className="flex items-center justify-between z-10">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Доступный баланс
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> +3.2%
                </span>
              </div>

              <div className="my-3 z-10">
                <p className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                  {formatMoney(currentBalance)}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Актуальный баланс всех счетов
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-10">
                <span>Валюта системы</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300 uppercase">{getCurrencySymbol()}</span>
              </div>
            </div>

            {/* 2. Income Card */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Доходы месяца
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="my-3">
                <p className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
                  +{formatMoney(totalIncome)}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Зарплата, бонусы, инвестиции
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Транзакций доходов</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {transactions.filter((t) => t.type === 'income').length}
                </span>
              </div>
            </div>

            {/* 3. Expense Card */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-rose-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" /> Расходы месяца
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>

              <div className="my-3">
                <p className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-none">
                  -{formatMoney(totalExpense)}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Все регулярные и разовые траты
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Транзакций расходов</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {transactions.filter((t) => t.type === 'expense').length}
                </span>
              </div>
            </div>

            {/* 4. Monthly Budget Progress Card */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Лимит бюджета
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    budgetUsedPct > 90
                      ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                  }`}
                >
                  {budgetUsedPct}% потрачено
                </span>
              </div>

              <div className="my-2.5 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-800 dark:text-slate-300 font-semibold">{formatMoney(totalExpense)}</span>
                  <span className="text-slate-500 dark:text-slate-500">из {formatMoney(budget.monthlyLimit)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${budgetUsedPct}%`,
                      backgroundColor: budgetUsedPct > 100 ? '#ef4444' : budgetUsedPct > 80 ? '#f59e0b' : '#6366f1',
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Остаток бюджета:</span>
                <span
                  className={`font-mono font-bold ${
                    budget.monthlyLimit - totalExpense < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {formatMoney(Math.max(0, budget.monthlyLimit - totalExpense))}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Cashflow Wave Chart & Analytics Banner */}
          <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span>Динамика денежного потока (Cashflow)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Анализ ежедневных трат и поступлений за последнюю неделю
                </p>
              </div>

              {/* Category filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedCatFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCatFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  Все категории
                </button>
                {FINANCE_CATEGORIES.slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCatFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      selectedCatFilter === cat.id
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700'
                        : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing SVG Wave Chart */}
            <div className="w-full h-44 relative flex flex-col justify-end">
              <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 140">
                <defs>
                  <linearGradient id="financeWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="incomeWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal lines */}
                <line x1="0" y1="35" x2="700" y2="35" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="700" y2="70" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeDasharray="3 3" />
                <line x1="0" y1="105" x2="700" y2="105" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeDasharray="3 3" />

                {/* Area Fill Curve */}
                <path
                  d="M 0,105 C 100,75 160,115 250,55 C 350,20 420,90 520,40 C 600,60 650,25 700,45 L 700,140 L 0,140 Z"
                  fill="url(#financeWaveGrad)"
                />

                {/* Main Stroke Line */}
                <path
                  d="M 0,105 C 100,75 160,115 250,55 C 350,20 420,90 520,40 C 600,60 650,25 700,45"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="3"
                />

                {/* Secondary Income Wave */}
                <path
                  d="M 0,120 C 120,110 200,90 320,60 C 440,30 520,70 700,20"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Data Points */}
                <circle cx="250" cy="55" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                <circle cx="520" cy="40" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                <circle cx="700" cy="45" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
              </svg>

              {/* Day Labels along bottom */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                {trendPoints.map((tp, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="capitalize">{tp.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2-Column Section: Transaction Maker (1 col) & History (2 cols) */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 1. Transaction Maker Card */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Новая операция
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">1 клик</span>
              </div>

              {/* Expense / Income Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  id="tx-type-expense-btn"
                  onClick={() => {
                    setTxType('expense');
                    setTxCategory(FINANCE_CATEGORIES[0].id);
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txType === 'expense'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingDown size={14} /> Расход
                </button>
                <button
                  id="tx-type-income-btn"
                  onClick={() => {
                    setTxType('income');
                    setTxCategory('f-salary');
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txType === 'income'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingUp size={14} /> Доход
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Сумма ({getCurrencySymbol()})
                </label>
                <div className="relative">
                  <input
                    id="tx-amount-input"
                    type="number"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full py-2.5 pl-3 pr-12 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-base font-mono font-bold rounded-xl focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-400 dark:placeholder-slate-600"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-slate-400">
                    {getCurrencySymbol()}
                  </span>
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-1.5 pt-1">
                  {[10000, 50000, 100000, 500000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleQuickAddAmount(val)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                    >
                      +{val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Категория
                </label>
                <select
                  id="tx-category-select"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-medium cursor-pointer"
                >
                  {FINANCE_CATEGORIES.filter((c) => {
                    if (txType === 'income') {
                      return ['f-salary', 'f-gift', 'f-invest', 'f-misc'].includes(c.id);
                    } else {
                      return !['f-salary', 'f-gift', 'f-invest'].includes(c.id);
                    }
                  }).map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Комментарий
                </label>
                <input
                  id="tx-comment-input"
                  type="text"
                  placeholder="Например, Обед в кафе или Подписка..."
                  value={txComment}
                  onChange={(e) => setTxComment(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500 text-xs placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Дата операции
                </label>
                <input
                  id="tx-date-input"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>

              {/* Submit Button */}
              <button
                id="tx-add-btn"
                onClick={handleAddTx}
                className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 mt-2"
                style={{ backgroundColor: accentColor }}
              >
                <Plus size={16} />
                <span>Сохранить операцию</span>
              </button>
            </div>

            {/* 2. Transaction History Table Card (2 cols) */}
            <div
              id="fin-history-card"
              className="lg:col-span-2 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col min-h-[480px] max-h-[640px]"
            >
              {/* Header with Search & Count */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">История финансовых транзакций</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {filteredTransactions.length}
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Поиск по чекам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
                  <Wallet className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Операций не найдено</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Добавьте первую транзакцию через форму слева или измените фильтр категории.
                  </p>
                </div>
              ) : (
                <div id="tx-scroller" className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredTransactions
                    .slice()
                    .reverse()
                    .map((tx) => {
                      const matchedCat = FINANCE_CATEGORIES.find((c) => c.id === tx.categoryId);
                      const isIncome = tx.type === 'income';

                      return (
                        <div
                          id={`tx-item-card-${tx.id}`}
                          key={tx.id}
                          className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-xl transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm"
                              style={{ backgroundColor: `${matchedCat?.color || '#6366f1'}20`, border: `1px solid ${matchedCat?.color || '#6366f1'}40` }}
                            >
                              <span>{matchedCat?.icon || (isIncome ? '💰' : '💳')}</span>
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block leading-snug">
                                {tx.comment || matchedCat?.name || 'Операция'}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                <span>{tx.date}</span>
                                <span>•</span>
                                <span style={{ color: matchedCat?.color || '#94a3b8' }}>
                                  {matchedCat?.name || 'Категория'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`font-mono font-black text-sm ${
                                isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
                            </span>

                            <button
                              id={`delete-tx-${tx.id}`}
                              onClick={() => {
                                onDeleteTransaction(tx.id);
                                triggerHaptic('medium');
                              }}
                              className="p-1.5 opacity-60 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                              title="Удалить транзакцию"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎯 SUBTAB 2: SAVINGS GOALS (КОПИЛКА) */}
      {financeSubTab === 'goals' && (
        <div
          id="fin-goals-row"
          className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl"
        >
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <span>Финансовые цели и сбережения (Копилка)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Отслеживайте накопления на крупные покупки, путешествия или финансовую подушку
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              {goals.filter((g) => g.currentAmount >= g.targetAmount).length} из {goals.length} достигнуто
            </span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* 1. Creator Form */}
            <div className="space-y-3.5 border-r border-slate-200 dark:border-slate-800/80 pr-0 md:pr-6">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-500 dark:text-emerald-400" /> Новая цель
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Название цели</label>
                  <input
                    id="goal-name-input"
                    type="text"
                    placeholder="Например, MacBook Pro M3"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Целевая сумма ({getCurrencySymbol()})
                  </label>
                  <input
                    id="goal-target-input"
                    type="number"
                    placeholder="15000000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Стартовый взнос ({getCurrencySymbol()})
                  </label>
                  <input
                    id="goal-curr-input"
                    type="number"
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Планируемый срок</label>
                  <input
                    id="goal-date-input"
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                id="add-fin-goal-btn"
                onClick={handleAddGoal}
                className="w-full py-2.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-emerald-500/25 cursor-pointer transition active:scale-95 bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-1.5"
              >
                <Target size={14} /> Создать цель
              </button>
            </div>

            {/* 2. Goals Visualizer List */}
            <div className="md:col-span-3 space-y-4">
              {goals.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center">
                  <Target className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 animate-pulse" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Целей пока нет</p>
                  <p className="text-slate-500 mt-1">Запланируйте первую крупную покупку в форме слева!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {goals.map((goal) => {
                    const pct = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
                    const isCompleted = goal.currentAmount >= goal.targetAmount;

                    return (
                      <div
                        id={`fin-goal-card-${goal.id}`}
                        key={goal.id}
                        className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-sm dark:shadow-xl ${
                          isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-400/20 dark:ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight block">
                              {goal.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                              Срок: {new Date(goal.targetDate).toLocaleDateString('ru-RU')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isCompleted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                                Готово 🎉
                              </span>
                            )}
                            <button
                              id={`del-fin-goal-${goal.id}`}
                              onClick={() => {
                                onDeleteFinancialGoal(goal.id);
                                triggerHaptic('medium');
                              }}
                              className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg p-1 transition cursor-pointer"
                              title="Удалить цель"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar & Amount */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono font-bold">
                            <span className="text-slate-800 dark:text-slate-200">{formatMoney(goal.currentAmount)}</span>
                            <span className="text-slate-500 dark:text-slate-400">из {formatMoney(goal.targetAmount)}</span>
                            <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isCompleted ? '#10b981' : accentColor,
                              }}
                            />
                          </div>
                        </div>

                        {/* Quick action buttons to increment goal cash */}
                        {!isCompleted ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                            <span className="text-slate-500 text-[9px] uppercase font-bold mr-1">
                              Пополнить:
                            </span>
                            <button
                              id={`add-1k-goal-${goal.id}`}
                              onClick={() => handleAddSavingsMoney(goal.id, 10000)}
                              className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition font-mono"
                            >
                              +10k
                            </button>
                            <button
                              id={`add-5k-goal-${goal.id}`}
                              onClick={() => handleAddSavingsMoney(goal.id, 50000)}
                              className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition font-mono"
                            >
                              +50k
                            </button>
                            <button
                              id={`add-10k-goal-${goal.id}`}
                              onClick={() => handleAddSavingsMoney(goal.id, 200000)}
                              className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition font-mono"
                            >
                              +200k
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            <span>Цель полностью собрана! Отличный результат!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📈 SUBTAB 3: BUDGET & ANALYTICS */}
      {financeSubTab === 'analytics' && (
        <div id="finance-middle-row" className="grid lg:grid-cols-2 gap-6">
          {/* Categorical Spends Breakdown */}
          <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Распределение расходов по категориям
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Всего: {formatMoney(totalExpense)}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {Object.keys(expenseByCategory).length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-12">
                  Нет расходов для построения диаграммы
                </p>
              ) : (
                <div id="fin-bars" className="space-y-3.5 pt-1">
                  {Object.entries(expenseByCategory).map(([catName, rawAmount]) => {
                    const amountVal = Number(rawAmount) || 0;
                    const percentage = totalExpense > 0 ? (amountVal / totalExpense) * 100 : 0;
                    const catColor = getCategoryColor(catName);

                    return (
                      <div id={`fin-bar-${catName}`} key={catName} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: catColor }}
                            />
                            {catName}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-mono">
                            {formatMoney(amountVal)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div
                            id={`fin-bar-fill-${catName}`}
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              backgroundColor: catColor,
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Budget Limit Configurator & Warnings */}
          <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Настройка лимитов расходов
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Контроль трат</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Задайте ежемесячный и еженедельный предел для предотвращения дефицита
              </p>
            </div>

            <div className="space-y-3.5 my-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Лимит на месяц ({getCurrencySymbol()})
                </label>
                <input
                  id="monthly-budget-input"
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm font-mono bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Лимит на неделю ({getCurrencySymbol()})
                </label>
                <input
                  id="weekly-budget-input"
                  type="number"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm font-mono bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                id="save-limits-btn"
                onClick={handleSaveBudgetLimits}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/25 cursor-pointer mt-1"
              >
                Сохранить настройки лимитов
              </button>
            </div>

            {/* Visual Limit Tracker & Overspend Banner */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-700 dark:text-slate-300">
                  Использовано {formatMoney(totalExpense)} / {formatMoney(budget.monthlyLimit)}
                </span>
                <span
                  className={totalExpense > budget.monthlyLimit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}
                >
                  {((totalExpense / Math.max(1, budget.monthlyLimit)) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (totalExpense / Math.max(1, budget.monthlyLimit)) * 100)}%`,
                    backgroundColor: totalExpense > budget.monthlyLimit ? '#ef4444' : accentColor,
                  }}
                />
              </div>

              {totalExpense > budget.monthlyLimit && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Внимание: Лимит превышен на {formatMoney(totalExpense - budget.monthlyLimit)}!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
