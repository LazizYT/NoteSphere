/**
 * NoteSphere OS — Web Clipper Modal
 * Captures any web page by URL, converts to clean Markdown, and saves into Notes.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Link2, X, Download, Loader2, Check, ExternalLink, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Note, Category } from '../types';

interface WebClipperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (note: Note) => void;
  categories: Category[];
  accentColor: string;
}

export default function WebClipperModal({
  isOpen,
  onClose,
  onAddNote,
  categories,
  accentColor,
}: WebClipperModalProps) {
  const [url, setUrl] = useState('');
  const [useAi, setUseAi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clippedData, setClippedData] = useState<{
    title: string;
    description: string;
    siteName?: string;
    richNoteHtml?: string;
    markdown: string;
    sourceUrl: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || 'cat-personal');

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setClippedData(null);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/web-clipper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), useAi }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить страницу');
      }

      setClippedData(data);
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Ошибка клиппинга веб-страницы');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotes = () => {
    if (!clippedData) return;

    const noteContent = clippedData.richNoteHtml || clippedData.markdown;

    const newNote: Note = {
      id: `note-clip-${Date.now()}`,
      title: clippedData.title || 'Веб-заметка',
      content: noteContent,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: selectedCategory,
      tags: ['веб-клип', clippedData.siteName ? clippedData.siteName.toLowerCase() : 'интернет'],
      importance: 'medium',
      color: accentColor,
      attachments: [
        {
          id: `attach-${Date.now()}`,
          name: clippedData.siteName || clippedData.title,
          type: 'link',
          url: clippedData.sourceUrl,
        },
      ],
      isProtected: false,
      versions: [],
      links: [],
      status: 'in_progress',
    };

    onAddNote(newNote);
    triggerHaptic('success');
    onClose();
    setUrl('');
    setClippedData(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 text-white font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base">NoteSphere Web Clipper</h3>
                <p className="text-xs text-slate-400">Сохранение статей и веб-страниц в заметки</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">URL-адрес страницы:</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetchUrl();
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-violet-500"
                />
              </div>
              <button
                onClick={handleFetchUrl}
                disabled={isLoading || !url.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Загрузить</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="rounded accent-violet-500"
                />
                <span className="flex items-center gap-1 text-[11px]">
                  <Sparkles size={12} className="text-amber-400" />
                  Обработать и структурировать через ИИ (Gemini)
                </span>
              </label>
              <span className="text-[10px] text-slate-400">Формат: Rich Card</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Preview Section */}
          {clippedData && (
            <div className="space-y-3 p-3.5 bg-slate-950/60 border border-white/5 rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-white">{clippedData.title}</h4>
                <a
                  href={clippedData.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white p-1"
                  title="Открыть источник"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              {clippedData.description && (
                <p className="text-xs text-slate-400 italic line-clamp-2">{clippedData.description}</p>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <label className="text-xs text-slate-400">Категория:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="py-1 px-2.5 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveToNotes}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Check size={14} /> Сохранить в Блокнот
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
