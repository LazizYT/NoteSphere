/**
 * NoteSphere OS — Quick Capture (GTD Inbox).
 * Мгновенный ввод естественным языком: работает через /api/ai/inbox (Gemini),
 * при его отсутствии — примитивный оффлайн-разбор.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ClipboardList, Bell, X, Loader2, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Task, Reminder } from '../types';

interface ParsedCapture {
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
  needTask: boolean;
  needReminder: boolean;
  reminderTime: string | null;
  parsed?: boolean;
}

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onAddReminder: (reminder: Reminder) => void;
  accentColor: string;
}

const CATS = [
  { id: 'personal', label: 'Личное' },
  { id: 'work', label: 'Работа' },
  { id: 'study', label: 'Учёба' },
  { id: 'health', label: 'Здоровье' },
  { id: 'finance', label: 'Финансы' },
];

export default function QuickCapture({
  isOpen,
  onClose,
  onAddTask,
  onAddReminder,
  accentColor,
}: QuickCaptureProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedCapture | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setParsed(null);
      setSaved(false);
      setTimeout(() => {
        const el = document.getElementById('qc-input') as HTMLTextAreaElement | null;
        el?.focus();
      }, 80);
    }
  }, [isOpen]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const today = new Date();
      let due: string | null = null;
      if (data.dueDate) {
        due = data.dueDate;
      } else if (data.dueOffsetDays != null && data.dueOffsetDays >= 0) {
        today.setDate(today.getDate() + data.dueOffsetDays);
        due = today.toISOString().split('T')[0];
      }
      setParsed({
        title: data.title || text.trim(),
        category: data.category || 'personal',
        priority: data.priority || 'medium',
        dueDate: due || null,
        needTask: data.needTask !== false,
        needReminder: !!(data.needReminder || (data.reminderTime && data.reminderTime !== 'null')),
        reminderTime: data.reminderTime === 'null' || !data.reminderTime ? null : data.reminderTime,
        parsed: !!data.parsed,
      });
    } catch (e) {
      setParsed({ title: text.trim(), category: 'personal', priority: 'medium', dueDate: null, needTask: true, needReminder: false, reminderTime: null, parsed: false });
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const nowISO = new Date().toISOString();

  const commit = () => {
    if (!parsed) return;
    if (parsed.needTask) {
      const task: Task = {
        id: `task-${Date.now()}`,
        title: parsed.title,
        isCompleted: false,
        subtasks: [],
        dueDate: parsed.dueDate || undefined,
        dueTime: parsed.reminderTime || undefined,
        priority: parsed.priority,
        category: CATS.find(c => c.id === parsed.category)?.label || 'Личное',
        recurrence: 'none',
        progress: 0,
        eisenhower: parsed.priority === 'critical' || parsed.priority === 'high' ? 'urgent-important' : 'not-urgent-important',
      };
      onAddTask(task);
    }
    if (parsed.needReminder) {
      const reminder: Reminder = {
        id: `rem-${Date.now()}`,
        title: parsed.title,
        date: parsed.dueDate || todayStr,
        time: parsed.reminderTime || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        recurrence: 'none',
        isTriggered: false,
      };
      onAddReminder(reminder);
    }
    triggerHaptic('success');
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-24 px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: -24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -18, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-5 font-sans"
            style={{ boxShadow: `0 20px 60px -20px ${accentColor}50` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white font-display">Быстрый захват</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Введите задачу, встречу или заметку естественным языком, например:
              <button
                onClick={() => setText('Позвонить врачу завтра в 10:00')}
                className="ml-1 text-indigo-400 hover:underline"
              >
                «Позвонить врачу завтра в 10:00»
              </button>
            </p>

            <div className="flex gap-2">
              <textarea
                id="qc-input"
                value={text}
                onChange={(e) => { setText(e.target.value); setParsed(null); }}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleParse(); if (e.key === 'Escape') onClose(); }}
                rows={2}
                placeholder="Быстрый текст..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 custom-scrollbar resize-none"
                style={{ focusColor: accentColor }}
              />
              <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                className="px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 transition disabled:opacity-40"
                style={{ backgroundColor: accentColor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span className="hidden sm:inline">Разобрать</span>
              </button>
            </div>

            {parsed && !saved && (
              <div className="mt-4 p-3 bg-slate-950/60 border border-slate-700/60 rounded-xl space-y-2.5 animate-fade-in">
                {!parsed.parsed && (
                  <p className="text-[10px] text-amber-400/80">Оффлайн-разбор (без AI). Уточните при необходимости.</p>
                )}
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Задача / событие</span>
                  <input
                    value={parsed.title}
                    onChange={(e) => setParsed({ ...parsed, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <label className="text-slate-400">Категория
                    <select
                      value={parsed.category}
                      onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    >
                      {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="text-slate-400">Приоритет
                    <select
                      value={parsed.priority}
                      onChange={(e) => setParsed({ ...parsed, priority: e.target.value as any })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    >
                      {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="text-slate-400">Срок (дата)
                    <input
                      type="date"
                      value={parsed.dueDate || ''}
                      onChange={(e) => setParsed({ ...parsed, dueDate: e.target.value || null })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    />
                  </label>
                  <label className="text-slate-400">Напоминание (время)
                    <input
                      type="time"
                      value={parsed.reminderTime || ''}
                      onChange={(e) => setParsed({ ...parsed, reminderTime: e.target.value || null, needReminder: !!e.target.value })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-[10px]">
                    <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={parsed.needTask} onChange={(e) => setParsed({ ...parsed, needTask: e.target.checked })} className="accent-indigo-500" />
                      Задача
                    </label>
                    <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={parsed.needReminder} onChange={(e) => setParsed({ ...parsed, needReminder: e.target.checked })} className="accent-red-500" />
                      Напоминание
                    </label>
                  </div>
                  <button
                    onClick={commit}
                    className="px-3.5 py-1.5 rounded-xl text-white text-[11px] font-bold transition active:scale-95 shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    Добавить
                  </button>
                </div>
              </div>
            )}

            {saved && (
              <div className="mt-3 py-3 text-center text-sm text-emerald-400 font-semibold animate-scale-in">✓ Добавлено</div>
            )}

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />Ctrl+Shift+K</span>
              <span className="flex items-center gap-1"><Bell className="w-3 h-3" />Esc — закрыть</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}