/**
 * NoteSphere OS — Universal Spotlight Modal (Ctrl+K / Cmd+K)
 * Unifies Command Palette + GTD Quick Capture + Web Clipper + Tags + Digital Garden + WebDAV Sync.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Notebook,
  CheckSquare,
  Music,
  DollarSign,
  Volume2,
  Sparkles,
  Settings,
  X,
  Plus,
  Moon,
  Zap,
  Clock,
  Radio,
  SlidersHorizontal,
  Lock,
  Globe,
  Hash,
  Download,
  Cloud,
  Send,
  Mic,
  MicOff,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { Note, Task, Reminder } from '../types';
import { ambientEngine } from '../utils/audioGenerator';
import { triggerHaptic } from '../utils/haptics';
import { isSpeechRecognitionSupported, startSpeechRecognition, stopSpeechRecognition } from '../utils/speechToText';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  tasks: Task[];
  mediaTracks: any[];
  onSelectNote: (note: Note) => void;
  onSelectTask: (task: Task) => void;
  onSelectTab: (tab: 'notes' | 'tasks' | 'finance' | 'widgets' | 'media' | 'dashboard') => void;
  onOpenSettings: () => void;
  onOpenNewNote: () => void;
  onOpenNewTask: () => void;
  onAddTask?: (task: Task) => void;
  onAddReminder?: (reminder: Reminder) => void;
  onOpenWebClipper?: () => void;
  onOpenGlobalTags?: () => void;
  onExportDigitalGarden?: () => void;
  onOpenWebDAV?: () => void;
  onOpenTelegram?: () => void;
  accentColor: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  notes,
  tasks,
  mediaTracks,
  onSelectNote,
  onSelectTask,
  onSelectTab,
  onOpenSettings,
  onOpenNewNote,
  onOpenNewTask,
  onAddTask,
  onAddReminder,
  onOpenWebClipper,
  onOpenGlobalTags,
  onExportDigitalGarden,
  onOpenWebDAV,
  onOpenTelegram,
  accentColor,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeSound, setActiveSound] = useState<string | null>(ambientEngine.getCurrentType());
  const [isListening, setIsListening] = useState(false);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      if (isListening) {
        stopSpeechRecognition();
        setIsListening(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleVoice = () => {
    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
      triggerHaptic('light');
    } else {
      const started = startSpeechRecognition({
        continuous: false,
        onResult: (transcript, isFinal) => {
          setQuery(transcript);
          triggerHaptic('light');
          if (isFinal) {
            stopSpeechRecognition();
            setIsListening(false);
          }
        },
        onError: () => {
          stopSpeechRecognition();
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      if (started) {
        setIsListening(true);
        triggerHaptic('medium');
      }
    }
  };

  const handleQuickCreateTask = (customTitle?: string) => {
    const titleToUse = customTitle || query.trim();
    if (!titleToUse) return;

    if (onAddTask) {
      const isUrgent = titleToUse.toLowerCase().includes('срочно') || titleToUse.toLowerCase().includes('важно');
      const newTask: Task = {
        id: `task-spot-${Date.now()}`,
        title: titleToUse.replace(/^!/, '').trim(),
        isCompleted: false,
        priority: isUrgent ? 'high' : 'medium',
        category: 'Личное',
        recurrence: 'none',
        progress: 0,
        eisenhower: isUrgent ? 'urgent-important' : 'not-urgent-important',
        subtasks: [],
      };
      onAddTask(newTask);
      triggerHaptic('success');
      setCreatedToast(`Задача "${newTask.title}" добавлена!`);
      setTimeout(() => {
        setCreatedToast(null);
        onClose();
      }, 900);
    }
  };

  if (!isOpen) return null;

  const lowerQuery = query.trim().toLowerCase();

  // Fuzzy match scoring
  const fuzzyScore = (source: string): number => {
    const s = (source || '').toLowerCase();
    if (!lowerQuery) return 0;
    if (s === lowerQuery) return 200;
    if (s.startsWith(lowerQuery)) return 100 + (s.length - lowerQuery.length) * -0.5;
    let score = 0;
    let qi = 0;
    for (let i = 0; i < s.length && qi < lowerQuery.length; i++) {
      if (s[i] === lowerQuery[qi]) {
        score += i === qi ? 3 : 1;
        qi++;
      }
      if (s[i] === ' ') score += 1;
    }
    return qi === lowerQuery.length ? score : 0;
  };

  // Filter notes
  const filteredNotes = lowerQuery
    ? notes
        .map((n) => ({
          n,
          s: Math.max(fuzzyScore(n.title), fuzzyScore(n.content), fuzzyScore((n.tags || []).join(' '))),
        }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 4)
        .map((x) => x.n)
    : notes.slice(0, 3);

  // Filter tasks
  const filteredTasks = lowerQuery
    ? tasks
        .map((t) => ({ t, s: Math.max(fuzzyScore(t.title), fuzzyScore(t.category || '')) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 4)
        .map((x) => x.t)
    : tasks.slice(0, 3);

  const toggleSound = (soundType: string) => {
    if (activeSound === soundType) {
      ambientEngine.stop();
      setActiveSound(null);
    } else {
      ambientEngine.play(soundType as any);
      setActiveSound(soundType);
    }
    triggerHaptic('light');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -15 }}
          className="bg-slate-900/95 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col font-sans"
        >
          {/* Spotlight Search Header */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск по заметкам, задачам или ввод команды (! для быстрой задачи)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (lowerQuery.startsWith('!') || (lowerQuery && filteredNotes.length === 0 && filteredTasks.length === 0)) {
                    handleQuickCreateTask();
                  }
                }
              }}
              className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
            />

            {/* Voice Dictation Button */}
            {isSpeechRecognitionSupported() && (
              <button
                onClick={handleToggleVoice}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Голосовой ввод"
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Tools Action Bar */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-slate-950/40 overflow-x-auto text-[11px] font-bold">
            {onOpenWebClipper && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWebClipper();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Globe size={12} className="text-violet-400" /> Web Clipper
              </button>
            )}

            {onOpenGlobalTags && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGlobalTags();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Hash size={12} className="text-amber-400" /> Все теги
              </button>
            )}

            {onExportDigitalGarden && (
              <button
                onClick={() => {
                  onClose();
                  onExportDigitalGarden();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Download size={12} className="text-emerald-400" /> Digital Garden HTML
              </button>
            )}

            {(onOpenTelegram || onOpenWebDAV) && (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenTelegram) onOpenTelegram();
                  else if (onOpenWebDAV) onOpenWebDAV();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Send size={12} className="text-sky-400" /> Telegram Cloud
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenNewNote();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Plus size={12} className="text-purple-400" /> Новая заметка
            </button>
          </div>

          {/* Toast alert */}
          {createdToast && (
            <div className="m-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check size={14} /> <span>{createdToast}</span>
            </div>
          )}

          {/* Quick Create Task Trigger */}
          {query.trim() && (
            <div className="px-4 py-2 bg-violet-950/30 border-b border-violet-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-violet-300">
                <Zap size={14} className="text-violet-400" />
                <span>Создать быструю задачу: <b>"{query.replace(/^!/, '').trim()}"</b></span>
              </div>
              <button
                onClick={() => handleQuickCreateTask()}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Enter ↵
              </button>
            </div>
          )}

          {/* Content Pane */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Ambient Soundscapes Bar */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2 flex items-center justify-between">
                <span>🎧 Звуковая атмосфера для концентрации</span>
                {activeSound && <span className="text-indigo-400 font-medium">Активен: {activeSound}</span>}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'rain', label: '🌧️ Дождь' },
                  { id: 'waves', label: '🌊 Прибой' },
                  { id: 'cosmic', label: '🌌 Космический Синт' },
                  { id: 'focus', label: '🧠 Фокус Дрон' },
                  { id: 'whitenoise', label: '📻 Белый шум' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSound(s.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      activeSound === s.id
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                {activeSound && (
                  <button
                    onClick={() => {
                      ambientEngine.stop();
                      setActiveSound(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs font-medium cursor-pointer"
                  >
                    Выключить
                  </button>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {filteredNotes.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  📝 Заметки ({filteredNotes.length})
                </span>
                <div className="space-y-1">
                  {filteredNotes.map((note, idx) => (
                    <div
                      key={`cp-note-${note.id || idx}-${idx}`}
                      onClick={() => {
                        onSelectTab('notes');
                        onSelectNote(note);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Notebook className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {note.title || 'Без названия'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {filteredTasks.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  ✅ Задачи ({filteredTasks.length})
                </span>
                <div className="space-y-1">
                  {filteredTasks.map((task, idx) => (
                    <div
                      key={`cp-task-${task.id || idx}-${idx}`}
                      onClick={() => {
                        onSelectTab('tasks');
                        onSelectTask(task);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {task.title}
                        </span>
                      </div>
                      {task.category && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {task.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts Info */}
          <div className="p-3 bg-slate-950/80 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Навигация: <b>↑ / ↓</b> • Выбрать: <b>Enter</b></span>
            <span>Быстрая задача: <b>!текст + Enter</b></span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
