/**
 * NoteSphere OS - Habit Tracker Component (Compact Ultra-Sleek Edition)
 * Compact horizontal tracker strip placed at the top of the dashboard.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Flame, Plus, Trash2, X } from 'lucide-react';
import { Habit } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { Language, t } from '../config/translations';

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (habit: Habit) => void;
  onToggleHabit: (id: string, dateStr: string) => void;
  onDeleteHabit: (id: string) => void;
  accentColor: string;
  language?: Language;
}

export default function HabitTracker({
  habits,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
  accentColor,
  language = 'ru',
}: HabitTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#8b5cf6');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const habit: Habit = {
      id: `habit-${Date.now()}`,
      title: newTitle.trim(),
      category: language === 'en' ? 'Habit' : 'Привычка',
      icon: 'Zap',
      color: newColor,
      completedDates: [],
      createdAt: new Date().toISOString(),
      streak: 0,
    };

    onAddHabit(habit);
    setNewTitle('');
    setShowAddForm(false);
    triggerHaptic('success');
  };

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: d.toISOString().split('T')[0] === todayStr,
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 shadow-md font-sans text-slate-800 dark:text-slate-100 space-y-2">
      {/* Mini Header Strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs">🔥</span>
          <h3 className="font-bold text-xs text-slate-800 dark:text-white">{t(language, 'habits_title')}</h3>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {habits.filter((h) => h.completedDates.includes(todayStr)).length}/{habits.length} {language === 'en' ? 'done' : 'выполнено'}
          </span>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer hover:opacity-90 active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="w-2.5 h-2.5" />
          <span>{t(language, 'add_habit_btn')}</span>
        </button>
      </div>

      {/* Mini Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="p-2 bg-slate-50 dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 text-xs overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t(language, 'new_habit_placeholder')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-xs outline-none focus:border-violet-500"
              />
              <div className="flex items-center gap-1 shrink-0">
                {['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                      newColor === c ? 'scale-125 border-slate-600 dark:border-white' : 'border-transparent opacity-60'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-[10px] cursor-pointer"
              >
                {t(language, 'cancel_btn')}
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg text-white text-[10px] font-bold cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                ОК
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Compact Habit Items */}
      {habits.length === 0 ? (
        <div className="text-center py-1 text-slate-400 dark:text-slate-500 text-[10px]">
          {language === 'en' ? 'No habits yet. Click "+ Add" to create one!' : 'Нет привычек. Нажмите «+ Добавить» для создания первой!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
          {habits.map((habit) => {
            const isCompletedToday = habit.completedDates.includes(todayStr);

            return (
              <div
                key={habit.id}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-950/90 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-xl flex items-center justify-between gap-1.5 transition-all"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <button
                    onClick={() => {
                      onToggleHabit(habit.id, todayStr);
                      triggerHaptic('success');
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      isCompletedToday
                        ? 'text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    style={{ backgroundColor: isCompletedToday ? habit.color : undefined }}
                    title={isCompletedToday ? 'Отмечено' : 'Отметить на сегодня'}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>

                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-[11px] text-slate-800 dark:text-white truncate block leading-tight">
                      {habit.title}
                    </span>
                    {habit.streak > 0 && (
                      <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold flex items-center gap-0.5 leading-none">
                        <Flame className="w-2.5 h-2.5 fill-amber-500 dark:fill-amber-400" />
                        <span>{habit.streak}д</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 7-day Mini Check Dots */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {last7Days.map((day) => {
                    const done = habit.completedDates.includes(day.dateStr);
                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => {
                          onToggleHabit(habit.id, day.dateStr);
                          triggerHaptic('light');
                        }}
                        title={`${day.dayName} (${day.dateStr})`}
                        className={`w-3.5 h-3.5 rounded text-[7px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                          done
                            ? 'text-white'
                            : day.isToday
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                            : 'bg-slate-100 dark:bg-slate-900/80 text-slate-400 dark:text-slate-600'
                        }`}
                        style={{ backgroundColor: done ? habit.color : undefined }}
                      >
                        {day.dayName[0].toUpperCase()}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      onDeleteHabit(habit.id);
                      triggerHaptic('light');
                    }}
                    className="p-0.5 text-slate-400 hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
