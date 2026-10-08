/**
 * NoteSphere OS — AI Diff Review Modal («Было / Стало»)
 * Allows user to review AI-suggested edits before applying them to a note.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, ArrowRight, Eye, Columns } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { t, Language } from '../config/translations';

interface AiDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  suggestedText: string;
  onAccept: (newText: string) => void;
  accentColor: string;
  language?: Language;
}

export default function AiDiffModal({
  isOpen,
  onClose,
  originalText,
  suggestedText,
  onAccept,
  accentColor,
  language = 'ru',
}: AiDiffModalProps) {
  const [activeTab, setActiveTab] = useState<'split' | 'original' | 'suggested'>('split');

  if (!isOpen) return null;

  const handleConfirmAccept = () => {
    triggerHaptic('success');
    onAccept(suggestedText);
    onClose();
  };

  const handleConfirmReject = () => {
    triggerHaptic('light');
    onClose();
  };

  // Helper to strip HTML for text comparison if needed
  const cleanOriginal = originalText || '';
  const cleanSuggested = suggestedText || '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                }}
              >
                <Sparkles size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>{t(language, 'ai_diff_title')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                    Было / Стало
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{t(language, 'ai_diff_subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Tab Switcher */}
              <div className="flex sm:hidden bg-slate-800 p-1 rounded-xl text-[11px]">
                <button
                  onClick={() => setActiveTab('original')}
                  className={`px-2 py-1 rounded-lg font-semibold ${
                    activeTab === 'original' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Было
                </button>
                <button
                  onClick={() => setActiveTab('suggested')}
                  className={`px-2 py-1 rounded-lg font-semibold ${
                    activeTab === 'suggested' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Стало
                </button>
              </div>

              <button
                onClick={handleConfirmReject}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Закрыть без сохранения"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Comparison Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 custom-scrollbar">
            {/* Left Column: Original ("Было") */}
            <div
              className={`flex flex-col bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 overflow-hidden ${
                activeTab === 'suggested' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {t(language, 'ai_diff_original')}
                </span>
                <span className="text-[10px] text-slate-500">Текущая версия</span>
              </div>
              <div
                className="flex-1 overflow-y-auto rich-text-content text-xs text-slate-300 leading-relaxed font-sans select-text custom-scrollbar prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: cleanOriginal || '<p class="text-slate-600">Пустая заметка</p>' }}
              />
            </div>

            {/* Right Column: Suggested ("Стало") */}
            <div
              className={`flex flex-col bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 space-y-2 overflow-hidden shadow-lg shadow-emerald-500/5 ${
                activeTab === 'original' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t(language, 'ai_diff_suggested')}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">Правки Gemini</span>
              </div>
              <div
                className="flex-1 overflow-y-auto rich-text-content text-xs text-white leading-relaxed font-sans select-text custom-scrollbar prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: cleanSuggested }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-950/60">
            <button
              onClick={handleConfirmReject}
              className="py-2.5 px-4 rounded-xl border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X size={15} />
              <span>{t(language, 'ai_diff_reject')}</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                [Ctrl+Enter] принять
              </span>
              <button
                onClick={handleConfirmAccept}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <Check size={16} />
                <span>{t(language, 'ai_diff_accept')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
