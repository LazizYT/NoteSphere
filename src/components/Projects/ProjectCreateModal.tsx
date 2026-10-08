/**
 * NoteSphere OS — ProjectCreateModal
 * Clean, lightweight creation and editing modal for Projects.
 * Fields: Name, Description, Icon (emoji), Color palette, Status, Start Date, Deadline, Target Goal, Budget.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, Target, Calendar, DollarSign, Folder } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  initialProject?: Project | null;
  accentColor?: string;
}

const EMOJI_PRESETS = ['🟣', '🤖', '🚀', '🔵', '🟢', '💻', '🎓', '⚡', '🎨', '📦', '🎯', '🔥', '⭐', '🧩', '🏗️', '💡'];

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#64748b', // Slate
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: string }[] = [
  { value: 'idea', label: '💡 Идея', icon: '💡' },
  { value: 'planning', label: '📝 Планирование', icon: '📝' },
  { value: 'in_progress', label: '🔨 В работе', icon: '🔨' },
  { value: 'paused', label: '⏸ На паузе', icon: '⏸' },
  { value: 'launch', label: '🚀 Запуск', icon: '🚀' },
  { value: 'completed', label: '✅ Завершён', icon: '✅' },
];

export default function ProjectCreateModal({
  isOpen,
  onClose,
  onSubmit,
  initialProject,
  accentColor = '#8b5cf6',
}: ProjectCreateModalProps) {
  const isEditing = !!initialProject;

  const [name, setName] = useState(initialProject?.name || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [icon, setIcon] = useState(initialProject?.icon || '🟣');
  const [color, setColor] = useState(initialProject?.color || '#8b5cf6');
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status || 'planning');
  const [startDate, setStartDate] = useState(initialProject?.startDate || new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState(initialProject?.deadline || '');
  const [targetGoal, setTargetGoal] = useState(initialProject?.targetGoal || '');
  const [budgetLimit, setBudgetLimit] = useState(initialProject?.budgetLimit ? String(initialProject.budgetLimit) : '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const projectData: Project = {
      id: initialProject?.id || `proj-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      status,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      targetGoal: targetGoal.trim() || undefined,
      budgetLimit: budgetLimit ? parseFloat(budgetLimit) : undefined,
      milestones: initialProject?.milestones || [],
      createdAt: initialProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: initialProject?.archived || false,
    };

    onSubmit(projectData);
    triggerHaptic('success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#1e2638] bg-slate-50 dark:bg-[#090b10]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                {isEditing ? 'Настройки проекта' : 'Создать проект'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Единое рабочее пространство для задач, заметок, финансов и AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Name & Icon Row */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Название проекта *
            </label>
            <div className="flex gap-2">
              <div className="relative group">
                <button
                  type="button"
                  className="w-11 h-10 rounded-xl bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] flex items-center justify-center text-xl hover:border-slate-400 dark:hover:border-slate-600 transition"
                  title="Выбрать иконку"
                >
                  {icon}
                </button>
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Minecraft Bot, NoteSphere Mobile..."
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Icon Selector Bar */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Быстрый выбор иконки
            </label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setIcon(emoji);
                    triggerHaptic('light');
                  }}
                  className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition cursor-pointer ${
                    icon === emoji
                      ? 'bg-indigo-600/20 border border-indigo-500 scale-110'
                      : 'hover:bg-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Цветовая метка
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    triggerHaptic('light');
                  }}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-indigo-500/50' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={13} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Описание
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко опишите суть проекта, задачи или область..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Target Goal */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Target size={13} className="text-amber-500" />
              <span>Главная цель проекта</span>
            </label>
            <input
              type="text"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="Что конкретно должно быть получено в итоге?"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Status & Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0e1422] text-slate-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={12} className="text-indigo-500" />
                <span>Дата начала</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={12} className="text-rose-500" />
                <span>Дедлайн</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Budget Limit (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign size={12} className="text-emerald-500" />
              <span>Планируемый бюджет (₽, опционально)</span>
            </label>
            <input
              type="number"
              min="0"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="Например: 50000"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#1e2638]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
              style={{ backgroundColor: color }}
            >
              <span>{isEditing ? 'Сохранить' : 'Создать проект'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
