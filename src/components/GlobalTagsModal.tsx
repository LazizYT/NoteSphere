/**
 * NoteSphere OS — Global Tags Explorer Modal
 * Scans all notes and tasks for #tags and provides 1-click cross-system filtering.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, X, Search, FileText, CheckSquare, Layers } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Note, Task } from '../types';

interface GlobalTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  tasks: Task[];
  onSelectTag: (tag: string) => void;
  accentColor: string;
}

export default function GlobalTagsModal({
  isOpen,
  onClose,
  notes,
  tasks,
  onSelectTag,
  accentColor,
}: GlobalTagsModalProps) {
  // Aggregate tags and count occurrences
  const tagsStats = useMemo(() => {
    const counts: Record<string, { total: number; notes: number; tasks: number }> = {};

    notes.forEach((n) => {
      (n.tags || []).forEach((t) => {
        const clean = t.replace(/^#/, '').toLowerCase().trim();
        if (!clean) return;
        if (!counts[clean]) counts[clean] = { total: 0, notes: 0, tasks: 0 };
        counts[clean].total += 1;
        counts[clean].notes += 1;
      });

      // Extract inline #hashtags from note content
      const content = n.content || '';
      const inlineMatches = content.match(/#([\p{L}\p{N}_-]+)/gu) || [];
      inlineMatches.forEach((m) => {
        const clean = m.replace(/^#/, '').toLowerCase().trim();
        if (!clean || clean.length < 2) return;
        if (!counts[clean]) counts[clean] = { total: 0, notes: 0, tasks: 0 };
        counts[clean].total += 1;
        counts[clean].notes += 1;
      });
    });

    tasks.forEach((t) => {
      if (t.category) {
        const clean = t.category.toLowerCase().trim();
        if (!counts[clean]) counts[clean] = { total: 0, notes: 0, tasks: 0 };
        counts[clean].total += 1;
        counts[clean].tasks += 1;
      }
    });

    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [notes, tasks]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-white font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                <Hash size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base">Глобальные теги системы</h3>
                <p className="text-xs text-slate-400">Сквозной навигатор по всем меткам и проектам</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tags Cloud / Grid */}
          <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
            {tagsStats.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Тегов пока нет. Добавьте тег `#работа` в заметку или категорию задачи!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagsStats.map(([tag, stat]) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onSelectTag(tag);
                      triggerHaptic('light');
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-violet-500/50 hover:bg-violet-600/10 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <span className="font-bold text-violet-400">#{tag}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-slate-500 font-mono">
                      {stat.total}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Всего уникальных тегов: {tagsStats.length}</span>
            <span>Кликните по тегу для фильтрации</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
