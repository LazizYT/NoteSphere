/**
 * NoteSphere OS — CommandCenter (Spotlight & AI Assistant)
 *
 * One unified command overlay for everything:
 * - Spotlight Quick Search across Notes, Tasks, and System Actions (@ or query)
 * - GTD Quick Capture (+ Note, + Task, !shortcut)
 * - Conversational Multi-turn AI Copilot with voice input and TTS speech synthesis
 * - Project Ecosystem Generation & Proactive Day Planner
 * - Customizable System Prompt (⚙️ Промпт ИИ) with localStorage persistence
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue, animate } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  CheckSquare,
  DollarSign,
  Zap,
  Mic,
  MicOff,
  X,
  Search,
  Settings,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  Globe,
  Hash,
  Send,
  Check,
  Sliders,
  Notebook,
  PanelLeft,
  PanelRight,
  Maximize2,
  GripHorizontal,
  Move,
  Headphones,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { isSpeechRecognitionSupported, startSpeechRecognition, stopSpeechRecognition } from '../utils/speechToText';
import {
  Note,
  Task,
  Category,
  FinancialTransaction,
  Habit,
  Goal,
  Project,
  DayScheduleItem,
  ProjectEcosystemPayload,
  PlanMyDayPayload,
  CopilotAction,
  CopilotMessage,
} from '../types';
import { DEFAULT_SYSTEM_PROMPT, AI_SYSTEM_PROMPT_PRESETS } from '../config/aiPromptConfig';
import { Language, t } from '../config/translations';

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  notes: Note[];
  tasks: Task[];
  projects?: Project[];
  categories: Category[];
  transactions: FinancialTransaction[];
  habits?: Habit[];
  goals?: Goal[];
  language?: Language;
  onExecuteAction: (action: CopilotAction) => { success: boolean; message?: string; targetId?: string };
  onApplyDaySchedule: (items: DayScheduleItem[]) => void;
  onSelectNote: (id: string) => void;
  onSwitchTab: (tab: string) => void;
  onAddNote?: (note: Note) => void;
  onAddTask?: (task: Task) => void;
  onOpenSettings?: () => void;
  onOpenWebClipper?: () => void;
  onOpenGlobalTags?: () => void;
  onExportDigitalGarden?: () => void;
  onOpenWebDAV?: () => void;
}


const ROTATING_PROMPTS = [
  'Что мне сегодня делать? (план дня)',
  'Создай проект Korea University',
  '@Заметка или поиск по названию...',
  'Покажи мои расходы за этот месяц',
  '!Купить билеты (быстрая задача)',
  'Создай проект Запуск приложения NoteSphere',
];

/**
 * Memoized Chat Message item to prevent re-rendering entire message list on keystrokes
 */
const ChatMessageItem: React.FC<{ msg: CopilotMessage }> = React.memo(({ msg }) => {
  const formattedHtml = useMemo(() => {
    return msg.text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/\n/g, '<br/>');
  }, [msg.text]);

  return (
    <div
      className={`flex flex-col ${
        msg.sender === 'user' ? 'items-end' : 'items-start'
      } space-y-1`}
    >
      <div
        className={`max-w-[88%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
          msg.sender === 'user'
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-xs shadow-md'
            : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-xs'
        }`}
      >
        <div
          className="prose prose-invert prose-xs max-w-none break-words"
          dangerouslySetInnerHTML={{
            __html: formattedHtml,
          }}
        />
      </div>
      <span className="text-[9px] text-slate-500 font-mono px-1">
        {msg.timestamp}
      </span>
    </div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

/**
 * Isolated Chat Composer to eliminate keystroke lag
 */
interface ChatComposerProps {
  onSendMessage: (text: string) => void;
  onQuickCreateNote: (text: string) => void;
  onQuickCreateTask: (text: string) => void;
  isLoading: boolean;
  isListening: boolean;
  onToggleVoice: () => void;
  placeholder: string;
  language?: Language;
  onOpenWebClipper?: () => void;
  onOpenGlobalTags?: () => void;
  onClose: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const ChatComposer: React.FC<ChatComposerProps> = React.memo(function ChatComposer({
  onSendMessage,
  onQuickCreateNote,
  onQuickCreateTask,
  isLoading,
  isListening,
  onToggleVoice,
  placeholder,
  language = 'ru' as Language,
  onOpenWebClipper,
  onOpenGlobalTags,
  onClose,
  textareaRef,
}) {
  const [localText, setLocalText] = useState('');
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const targetRef = textareaRef || internalRef;

  return (
    <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-950 space-y-2.5">
      {/* Quick Actions Row */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              onQuickCreateNote(localText);
              setLocalText('');
            }}
            className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 hover:text-white border border-violet-500/20 font-semibold flex items-center gap-1 transition cursor-pointer"
            title={t(language, 'cmd_create_note_from_text')}
          >
            <Plus size={12} /> {t(language, 'cmd_quick_note')}
          </button>
          <button
            type="button"
            onClick={() => {
              onQuickCreateTask(localText);
              setLocalText('');
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/20 font-semibold flex items-center gap-1 transition cursor-pointer"
            title={t(language, 'cmd_create_task_from_text')}
          >
            <Plus size={12} /> {t(language, 'cmd_quick_task')}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenWebClipper && (
            <button
              type="button"
              onClick={onOpenWebClipper}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 flex items-center gap-1 transition cursor-pointer"
            >
              <Globe size={11} className="text-violet-400" /> {t(language, 'cmd_quick_clipper')}
            </button>
          )}
          {onOpenGlobalTags && (
            <button
              type="button"
              onClick={onOpenGlobalTags}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 flex items-center gap-1 transition cursor-pointer"
            >
              <Hash size={11} className="text-amber-400" /> {t(language, 'cmd_quick_tags')}
            </button>
          )}
        </div>
      </div>

      {/* Input Row */}
      <div className="relative flex items-center bg-slate-900/90 rounded-2xl border border-white/15 p-2 shadow-inner focus-within:border-violet-500/70 transition-all">
        <textarea
          ref={targetRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (localText.trim()) {
                onSendMessage(localText);
                setLocalText('');
              }
            }
          }}
          rows={2}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 resize-none outline-none px-2 py-1 font-sans custom-scrollbar leading-relaxed"
        />

        <div className="flex items-center gap-1.5 pl-2 shrink-0">
          <button
            type="button"
            onClick={onToggleVoice}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10'
            }`}
            title={isListening ? t(language, 'cmd_voice_listening') : t(language, 'cmd_voice_start')}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (localText.trim()) {
                onSendMessage(localText);
                setLocalText('');
              }
            }}
            disabled={!localText.trim() || isLoading}
            className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-violet-600/30"
          >
            <Send size={12} />
            <span>{isLoading ? '...' : t(language, 'cmd_send_btn')}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
        <span>{t(language, 'cmd_composer_hint')}</span>
        <span>Esc — {t(language, 'close').toLowerCase()}</span>
      </div>
    </div>
  );
});

ChatComposer.displayName = 'ChatComposer';

/**
 * Isolated System Prompt Modal to eliminate all typing lag
 */
interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  language?: Language;
  onSave: (newPrompt: string) => void;
  onReset: () => void;
}

const SystemPromptModal: React.FC<SystemPromptModalProps> = React.memo(
  function SystemPromptModal({ isOpen, onClose, currentPrompt, language = 'ru' as Language, onSave, onReset }) {
    const [localPrompt, setLocalPrompt] = useState(currentPrompt);

    useEffect(() => {
      if (isOpen) {
        setLocalPrompt(currentPrompt);
      }
    }, [isOpen, currentPrompt]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
        <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-violet-500/50 rounded-3xl shadow-2xl p-6 space-y-4 text-left font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <Sliders className="text-violet-400 w-5 h-5" />
              <span>{t(language, 'sys_prompt_title')}</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {t(language, 'sys_prompt_desc')}
          </p>

          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            rows={7}
            className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3.5 text-xs text-white font-mono leading-relaxed outline-none focus:border-violet-500"
            placeholder="Введите системную инструкцию..."
          />

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t(language, 'sys_prompt_presets')}
            </span>
            <div className="flex flex-wrap gap-2">
              {AI_SYSTEM_PROMPT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLocalPrompt(p.text)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-violet-600/30 text-slate-200 hover:text-white text-xs border border-white/10 transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                onReset();
                setLocalPrompt(DEFAULT_SYSTEM_PROMPT);
              }}
              className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              {t(language, 'sys_prompt_reset_default')}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                {t(language, 'cancel')}
              </button>
              <button
                type="button"
                onClick={() => onSave(localPrompt)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-violet-600/40"
              >
                {t(language, 'save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SystemPromptModal.displayName = 'SystemPromptModal';

export default function CommandCenter({
  isOpen,
  onClose,
  accentColor,
  notes,
  tasks,
  projects = [],
  categories,
  transactions,
  habits = [],
  goals = [],
  language = 'ru' as Language,
  onExecuteAction,
  onApplyDaySchedule,
  onSelectNote,
  onSwitchTab,
  onAddNote,
  onAddTask,
  onOpenSettings,
  onOpenWebClipper,
  onOpenGlobalTags,
  onExportDigitalGarden,
  onOpenWebDAV,
}: CommandCenterProps) {
  // Separate states for chat and search input to prevent cross-component lag
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Draggable positioning & side docking controls
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      x.set(0);
      y.set(0);
    }
  }, [isOpen]);

  const snapTo = (position: 'left' | 'center' | 'right') => {
    if (isMobile) return;
    const offset = Math.min(window.innerWidth * 0.35, 420);
    const targetX = position === 'left' ? -offset : position === 'right' ? offset : 0;
    animate(x, targetX, { type: 'spring', damping: 26, stiffness: 320 });
    animate(y, 0, { type: 'spring', damping: 26, stiffness: 320 });
    triggerHaptic('light');
  };

  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ns_ai_tts_enabled') === 'true';
  });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    const saved = localStorage.getItem('ns_ai_system_prompt');
    if (saved && (saved.includes('NEIRONA') || saved.includes('Нейрона'))) {
      localStorage.setItem('ns_ai_system_prompt', DEFAULT_SYSTEM_PROMPT);
      return DEFAULT_SYSTEM_PROMPT;
    }
    return saved || DEFAULT_SYSTEM_PROMPT;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active view mode: 'chat' (AI conversation) | 'search' (Spotlight matches)
  const [viewMode, setViewMode] = useState<'chat' | 'search'>('chat');

  // Multi-turn conversation messages
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    const saved = localStorage.getItem('ns_copilot_messages');
    const welcomeMsg = t(language, 'cmd_welcome_msg');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.id === 'msg-welcome' && (parsed[0]?.text?.includes('👋 Привет! Чем могу помочь') || parsed[0]?.text?.includes('Нейрона'))) {
            parsed[0].text = welcomeMsg;
          }
          return parsed;
        }
      } catch {}
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: welcomeMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [projectEcosystem, setProjectEcosystem] = useState<ProjectEcosystemPayload | null>(null);
  const [daySchedule, setDaySchedule] = useState<PlanMyDayPayload | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persist messages history
  useEffect(() => {
    try {
      localStorage.setItem('ns_copilot_messages', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Persist TTS preference
  useEffect(() => {
    localStorage.setItem('ns_ai_tts_enabled', String(isTtsEnabled));
  }, [isTtsEnabled]);

  // Rotate placeholder hints
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PROMPTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Auto focus input on open or viewMode change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (viewMode === 'chat') {
          chatTextareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      if (isListening) {
        stopSpeechRecognition();
        setIsListening(false);
      }
      setShowPromptModal(false);
      setToastMessage(null);
    }
  }, [isOpen, viewMode]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, viewMode, isOpen]);

  // Global Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showPromptModal) {
          setShowPromptModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPromptModal, onClose]);

  // Speech synthesis TTS helper
  const speakText = (text: string) => {
    if (!isTtsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/[#*`_\[\]]/g, '')
        .replace(/<[^>]*>/g, '')
        .slice(0, 300);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = language === 'en' ? 'en-US' : 'ru-RU';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS error:', e);
    }
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Clean search query representation
  const cleanSearchTerm = useMemo(() => {
    return searchQuery.trim().toLowerCase().replace(/^[@!]/, '').trim();
  }, [searchQuery]);

  // Spotlight fuzzy matching for Notes & Tasks (only reacts to searchQuery)
  const searchResults = useMemo(() => {
    if (!cleanSearchTerm) {
      return {
        notes: notes.slice(0, 4),
        tasks: tasks.filter((t) => !t.isCompleted).slice(0, 4),
      };
    }

    const matchedNotes = notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(cleanSearchTerm) ||
          (n.tags && n.tags.some((tag) => tag.toLowerCase().includes(cleanSearchTerm))) ||
          (n.content && n.content.slice(0, 300).toLowerCase().includes(cleanSearchTerm))
      )
      .slice(0, 6);

    const matchedTasks = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(cleanSearchTerm) ||
          (t.category || '').toLowerCase().includes(cleanSearchTerm)
      )
      .slice(0, 6);

    return { notes: matchedNotes, tasks: matchedTasks };
  }, [cleanSearchTerm, notes, tasks]);

  // Instant Quick Capture Handlers
  const handleQuickCreateNote = (customTitle?: string) => {
    const rawTitle = customTitle || (viewMode === 'chat' ? chatInput : searchQuery);
    const defaultNoteTitle = language === 'en' ? 'New Note' : 'Новая заметка';
    const title = rawTitle.replace(/^[!@]/, '').trim() || defaultNoteTitle;
    if (onAddNote) {
      const newNote: Note = {
        id: `note-cmd-${Date.now()}`,
        title,
        content: `<p>${title}</p>`,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categoryId: categories[0]?.id || 'cat-personal',
        tags: [t(language, 'desktop_tag')],
        importance: 'medium',
        color: accentColor,
        attachments: [],
        isProtected: false,
        versions: [],
        links: [],
        status: 'todo',
      };
      onAddNote(newNote);
      onSelectNote(newNote.id);
      onSwitchTab('notes');
      triggerHaptic('success');
      showToast(`${t(language, 'cmd_note_created')} «${title}»`);
      setTimeout(() => {
        setChatInput('');
        setSearchQuery('');
        onClose();
      }, 600);
    }
  };

  const handleQuickCreateTask = (customTitle?: string) => {
    const rawTitle = customTitle || (viewMode === 'chat' ? chatInput : searchQuery);
    const defaultTaskTitle = language === 'en' ? 'New Task' : 'Новая задача';
    const title = rawTitle.replace(/^[!@]/, '').trim() || defaultTaskTitle;
    if (onAddTask) {
      const isUrgent = title.toLowerCase().includes('срочно') || title.toLowerCase().includes('важно') || title.toLowerCase().includes('urgent');
      const newTask: Task = {
        id: `task-cmd-${Date.now()}`,
        title,
        isCompleted: false,
        priority: isUrgent ? 'high' : 'medium',
        category: t(language, 'work'),
        recurrence: 'none',
        progress: 0,
        eisenhower: isUrgent ? 'urgent-important' : 'not-urgent-important',
        subtasks: [],
      };
      onAddTask(newTask);
      onSwitchTab('tasks');
      triggerHaptic('success');
      showToast(`${t(language, 'cmd_task_added')} «${title}»`);
      setTimeout(() => {
        setChatInput('');
        setSearchQuery('');
        onClose();
      }, 600);
    }
  };

  // Run AI Copilot Command
  const handleRunCommand = async (customQuery?: string) => {
    const textToRun = (customQuery !== undefined ? customQuery : (viewMode === 'chat' ? chatInput : searchQuery)).trim();
    if (!textToRun || isLoading) return;

    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
    }

    // If starts with !, immediately create task
    if (textToRun.startsWith('!')) {
      handleQuickCreateTask(textToRun);
      return;
    }

    setIsLoading(true);
    triggerHaptic('light');
    setViewMode('chat');

    const userMsg: CopilotMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToRun,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSearchQuery('');

    // Context snapshot
    const appContext = {
      notesCount: notes.length,
      tasksCount: tasks.length,
      activeTasks: tasks.filter((t) => !t.isCompleted).map((t) => ({ id: t.id, title: t.title, priority: t.priority, category: t.category })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, deadline: p.deadline, targetGoal: p.targetGoal })),
      projectsCount: projects.length,
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      habitsCount: habits.length,
    };

    // Format conversation history for Gemini API
    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToRun,
          history: historyPayload,
          appContext,
          customSystemPrompt,
        }),
      });

      if (!res.ok) throw new Error('Server status ' + res.status);
      const data = await res.json();

      const replyText = data.reply || (language === 'en' ? 'Command processed.' : 'Команда обработана.');
      const actions: CopilotAction[] = Array.isArray(data.actions) ? data.actions : [];

      const assistantMsg: CopilotMessage = {
        id: 'msg-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Check for specialized V4 payloads
      for (const act of actions) {
        if (act.type === 'create_project_ecosystem') {
          setProjectEcosystem(act.payload);
        } else if (act.type === 'plan_my_day') {
          setDaySchedule(act.payload);
        }
      }

      speakText(replyText);
      triggerHaptic('success');
    } catch (e: any) {
      console.error('Command Center query error:', e);
      const errorMsg: CopilotMessage = {
        id: 'msg-err-' + Date.now(),
        sender: 'assistant',
        text: language === 'en'
          ? '⚠️ NoteSphere OS server connection error. Please try again or check your network.'
          : '⚠️ Ошибка связи с сервером NoteSphere OS. Попробуйте еще раз или проверьте подключение к сети.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice input toggle
  const handleVoiceInput = () => {
    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
      triggerHaptic('light');
      return;
    }

    const started = startSpeechRecognition({
      continuous: false,
      onResult: (transcript, isFinal) => {
        if (viewMode === 'chat') {
          setChatInput(transcript);
        } else {
          setSearchQuery(transcript);
        }
        if (isFinal) {
          stopSpeechRecognition();
          setIsListening(false);
          handleRunCommand(transcript);
        }
      },
      onError: () => {
        stopSpeechRecognition();
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
      lang: language === 'en' ? 'en-US' : 'ru-RU',
    });

    if (started) {
      setIsListening(true);
      triggerHaptic('medium');
    } else {
      alert(language === 'en' ? 'Voice input is not supported by your browser.' : 'Голосовой ввод не поддерживается браузером.');
    }
  };

  // Clear messages history
  const handleClearHistory = () => {
    if (confirm(t(language, 'cmd_clear_confirm'))) {
      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          text: t(language, 'cmd_history_cleared'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setProjectEcosystem(null);
      setDaySchedule(null);
      localStorage.removeItem('ns_copilot_messages');
      triggerHaptic('medium');
    }
  };

  // Save custom system prompt
  const handleSaveSystemPrompt = (newPrompt: string) => {
    setCustomSystemPrompt(newPrompt);
    localStorage.setItem('ns_ai_system_prompt', newPrompt);
    setShowPromptModal(false);
    showToast(t(language, 'cmd_prompt_saved'));
    triggerHaptic('success');
  };

  // Reset custom system prompt to default
  const handleResetSystemPrompt = () => {
    setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.setItem('ns_ai_system_prompt', DEFAULT_SYSTEM_PROMPT);
    showToast(t(language, 'cmd_prompt_reset'));
    triggerHaptic('light');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center p-0 sm:p-4 md:pt-14 pointer-events-auto">
        {/* Backdrop (semi-transparent, allowing background visibility) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 sm:bg-black/25 dark:bg-black/50 sm:dark:bg-black/35 backdrop-blur-[2px] transition-colors"
        />

        {/* Modal / Bottom Sheet Card */}
        <motion.div
          drag={isMobile ? 'y' : true}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={isMobile ? { top: 0, bottom: 0 } : undefined}
          dragElastic={isMobile ? { top: 0, bottom: 0.6 } : 0.06}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (isMobile && (info.offset.y > 90 || info.velocity.y > 300)) {
              triggerHaptic('medium');
              onClose();
            }
          }}
          style={isMobile ? {
            y,
            boxShadow: `0 -10px 40px -10px rgba(0,0,0,0.9), 0 0 40px -10px ${accentColor}30`,
          } : {
            x,
            y,
            boxShadow: `0 25px 70px -15px rgba(0,0,0,0.85), 0 0 50px -10px ${accentColor}40`,
          }}
          initial={isMobile ? { opacity: 0, y: 150 } : { opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={isMobile ? { opacity: 0, y: 150 } : { opacity: 0, y: -15, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full sm:max-w-3xl bg-slate-900/98 dark:bg-[#090d16]/98 border-t sm:border border-white/20 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/95 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[92vh] z-10 font-sans"
        >
          {/* Mobile Bottom-Sheet Pull Handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="sm:hidden pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="w-12 h-1.5 bg-white/25 rounded-full" />
          </div>

          {/* Header Bar (Draggable) */}
          <div
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button, input, textarea, a, select')) return;
              dragControls.start(e);
            }}
            className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] cursor-grab active:cursor-grabbing select-none"
            title={t(language, 'cmd_drag_tooltip')}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg relative shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #4338ca)`,
                  boxShadow: `0 0 16px ${accentColor}60`,
                }}
              >
                <Sparkles size={18} className="text-white animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  <span>NEXAR</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold uppercase tracking-wider border border-violet-500/30">
                    AI
                  </span>
                </h2>
              </div>
            </div>

            {/* Center Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setViewMode('chat');
                  setTimeout(() => chatTextareaRef.current?.focus(), 80);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'chat'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} className={viewMode === 'chat' ? 'text-amber-300 animate-pulse' : ''} />
                <span>{t(language, 'cmd_tab_chat')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('search');
                  setTimeout(() => inputRef.current?.focus(), 80);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'search'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search size={13} />
                <span>{t(language, 'cmd_tab_search')}</span>
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Custom System Prompt Trigger */}
              <button
                type="button"
                onClick={() => setShowPromptModal(true)}
                className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  customSystemPrompt.trim() && customSystemPrompt !== DEFAULT_SYSTEM_PROMPT
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={t(language, 'cmd_btn_prompt_title')}
              >
                <Settings size={15} />
                <span className="hidden sm:inline font-semibold">{t(language, 'cmd_btn_prompt')}</span>
              </button>

              {/* TTS Speech Synthesis Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isTtsEnabled;
                  setIsTtsEnabled(next);
                  if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                  triggerHaptic('light');
                }}
                className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                  isTtsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={isTtsEnabled ? t(language, 'cmd_tts_on_title') : t(language, 'cmd_tts_off_title')}
              >
                {isTtsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>

              {/* Clear History */}
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title={t(language, 'cmd_clear_history_title')}
              >
                <Trash2 size={15} />
              </button>

              {/* Quick Left / Center / Right Docking Buttons */}
              <div className="hidden sm:flex items-center gap-0.5 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => snapTo('left')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title={t(language, 'cmd_dock_left_tooltip')}
                >
                  <PanelLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => snapTo('center')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title={t(language, 'cmd_snap_center_title')}
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => snapTo('right')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title={t(language, 'cmd_dock_right_tooltip')}
                >
                  <PanelRight size={14} />
                </button>
              </div>

              {/* Drag Handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-grab active:cursor-grabbing"
                title={t(language, 'cmd_drag_tooltip')}
              >
                <GripHorizontal size={15} />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer ml-1"
                title={t(language, 'cmd_close_tooltip')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toast Notification Alert */}
          {toastMessage && (
            <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <Check size={14} /> <span>{toastMessage}</span>
            </div>
          )}

          {/* Spotlight Search Header Bar (Only in search mode) */}
          {viewMode === 'search' && (
            <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 space-y-3">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-violet-400 w-5 h-5 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchQuery.startsWith('!')) {
                        handleQuickCreateTask();
                      } else if (cleanSearchTerm && searchResults.notes.length === 0 && searchResults.tasks.length === 0) {
                        handleRunCommand();
                      } else if (searchQuery.startsWith('@') || searchResults.notes.length > 0) {
                        if (searchResults.notes[0]) {
                          onSelectNote(searchResults.notes[0].id);
                          onSwitchTab('notes');
                          onClose();
                        }
                      } else {
                        handleRunCommand();
                      }
                    }
                  }}
                  placeholder={t(language, 'cmd_search_placeholder')}
                  className="w-full bg-white/[0.04] border-2 border-violet-500/30 focus:border-violet-400 rounded-2xl pl-12 pr-28 py-3 text-white text-sm placeholder-slate-500 outline-none shadow-inner transition"
                />

                <div className="absolute right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        setViewMode('chat');
                        handleRunCommand(searchQuery);
                      }
                    }}
                    disabled={!searchQuery.trim() || isLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 shadow-lg shadow-violet-600/30 transition cursor-pointer"
                  >
                    <span>{t(language, 'cmd_ask_ai')}</span>
                    <Sparkles size={13} />
                  </button>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleQuickCreateNote()}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 hover:text-white border border-violet-500/20 font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={t(language, 'cmd_create_note_from_text')}
                >
                  <Plus size={12} /> {t(language, 'cmd_quick_note')}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickCreateTask()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/20 font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={t(language, 'cmd_create_task_from_text')}
                >
                  <Plus size={12} /> {t(language, 'cmd_quick_task')}
                </button>

                {onOpenWebClipper && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWebClipper();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Globe size={11} className="text-violet-400" /> {t(language, 'cmd_quick_clipper')}
                  </button>
                )}

                {onOpenGlobalTags && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGlobalTags();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Hash size={11} className="text-amber-400" /> {t(language, 'cmd_quick_tags')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Stage: Chat or Spotlight Search */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* 1. SPOTLIGHT SEARCH VIEW */}
            {viewMode === 'search' && (
              <div className="space-y-4">
                {/* Search query header */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-white/5">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Search size={13} className="text-indigo-400" />
                    {cleanSearchTerm ? `${t(language, 'cmd_results_for')} «${cleanSearchTerm}»:` : t(language, 'cmd_quick_access')}
                  </span>
                  {searchQuery.trim() && (
                    <button
                      onClick={() => handleRunCommand()}
                      className="text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {t(language, 'cmd_ask_ai_arrow')}
                    </button>
                  )}
                </div>

                {/* Instant Task Creation Suggestion */}
                {cleanSearchTerm && (
                  <div className="p-3 rounded-2xl bg-violet-950/30 border border-violet-500/25 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-violet-200">
                      <Zap size={14} className="text-amber-400 shrink-0" />
                      <span>{t(language, 'cmd_create_quick_task')} <b>«{cleanSearchTerm}»</b></span>
                    </div>
                    <button
                      onClick={() => handleQuickCreateTask()}
                      className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      {t(language, 'cmd_add_btn')}
                    </button>
                  </div>
                )}

                {/* Notes Match */}
                {searchResults.notes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t(language, 'cmd_notes_heading')} ({searchResults.notes.length})
                    </span>
                    <div className="space-y-1">
                      {searchResults.notes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => {
                            onSelectNote(note.id);
                            onSwitchTab('notes');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-violet-500/30 transition cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Notebook className="w-4 h-4 text-violet-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                              {note.title || (language === 'en' ? 'Untitled' : 'Без названия')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(note.updatedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks Match */}
                {searchResults.tasks.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t(language, 'cmd_tasks_heading')} ({searchResults.tasks.length})
                    </span>
                    <div className="space-y-1">
                      {searchResults.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            onSwitchTab('tasks');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                              {task.title}
                            </span>
                          </div>
                          {task.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                              {task.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick System Shortcuts */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t(language, 'cmd_shortcuts_heading')}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => {
                        onSwitchTab('media');
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-left flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <Headphones size={14} className="text-violet-400" />
                      <span>{t(language, 'cmd_media_shortcut')}</span>
                    </button>

                    <button
                      onClick={() => {
                        onSwitchTab('finance');
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-left flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <DollarSign size={14} className="text-emerald-400" />
                      <span>{t(language, 'cmd_finance_shortcut')}</span>
                    </button>

                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSettings();
                        }}
                        className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-left flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <Settings size={14} className="text-blue-400" />
                        <span>{t(language, 'cmd_settings_shortcut')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHAT & AI CONVERSATION VIEW */}
            {viewMode === 'chat' && (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <ChatMessageItem key={msg.id} msg={msg} />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 max-w-xs">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    <span className="text-xs text-slate-300 font-medium">{t(language, 'cmd_orchestrating')}</span>
                  </div>
                )}

                {/* Specialized Project Ecosystem Card */}
                {projectEcosystem && (
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-950/50 via-slate-900 to-indigo-950/50 border-2 border-violet-500/40 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{projectEcosystem.categoryIcon || '🚀'}</span>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            {language === 'en' ? 'Project' : 'Проект'}: {projectEcosystem.projectName}
                          </h4>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const res = onExecuteAction({
                            type: 'create_project_ecosystem',
                            payload: projectEcosystem,
                          });
                          if (res.success) onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/40 transition cursor-pointer"
                      >
                        <span>{t(language, 'cmd_deploy')}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                            <FileText size={12} /> {language === 'en' ? 'Hub Document' : 'Хаб-документ'}
                          </span>
                          <p className="font-semibold text-white">{projectEcosystem.hubNote.title}</p>
                        </div>
                        {projectEcosystem.budgetAllocation && (
                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <DollarSign size={12} /> {t(language, 'balance_metric')}
                            </span>
                            <p className="font-semibold text-emerald-300">
                              {projectEcosystem.budgetAllocation.plannedAmount.toLocaleString()} {language === 'en' ? 'RUB' : 'руб.'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare size={12} /> {t(language, 'tasks_metric')} ({projectEcosystem.tasks.length})
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                          {projectEcosystem.tasks.map((t, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-200 truncate">{t.title}</span>
                              <span className="text-[9px] px-1 rounded bg-violet-500/20 text-violet-300 uppercase font-bold shrink-0">
                                {t.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Day Planner Card */}
                {daySchedule && (
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-violet-950/50 border-2 border-indigo-500/40 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white">{t(language, 'cmd_day_plan')}</h4>
                          <span className="text-[10px] text-slate-400">{daySchedule.summary}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onApplyDaySchedule(daySchedule.items);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/40 transition cursor-pointer"
                      >
                        <span>{t(language, 'cmd_apply')}</span>
                        <CheckCircle2 size={13} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {daySchedule.items.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px]">
                              {item.time}
                            </span>
                            <span className="text-slate-200 font-medium">{item.taskTitle}</span>
                          </div>
                          {item.category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                              {item.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Pinned Bottom Chat Composer Bar (Only in chat mode, large & spacious, zero-lag) */}
          {viewMode === 'chat' && (
            <ChatComposer
              onSendMessage={(val) => handleRunCommand(val)}
              onQuickCreateNote={(val) => handleQuickCreateNote(val)}
              onQuickCreateTask={(val) => handleQuickCreateTask(val)}
              isLoading={isLoading}
              isListening={isListening}
              onToggleVoice={handleVoiceInput}
              placeholder={ROTATING_PROMPTS[placeholderIndex]}
              language={language}
              onOpenWebClipper={onOpenWebClipper}
              onOpenGlobalTags={onOpenGlobalTags}
              onClose={onClose}
              textareaRef={chatTextareaRef}
            />
          )}

          {/* Footer Shortcuts Info */}
          <div className="px-5 py-2.5 border-t border-white/10 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Enter</kbd> {t(language, 'cmd_enter_hint')}
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">!{language === 'en' ? 'text' : 'текст'}</kbd> {t(language, 'cmd_quick_task_hint')}
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Esc</kbd> {t(language, 'cmd_esc_hint')}
              </span>
            </div>
            <span className="font-mono text-slate-400">Ctrl+Space / Ctrl+K</span>
          </div>
        </motion.div>

        {/* System Prompt Customization Modal (High-Contrast, Fully Isolated, Zero Typing Lag) */}
        <SystemPromptModal
          isOpen={showPromptModal}
          onClose={() => setShowPromptModal(false)}
          currentPrompt={customSystemPrompt}
          language={language}
          onSave={handleSaveSystemPrompt}
          onReset={handleResetSystemPrompt}
        />
      </div>
    </AnimatePresence>
  );
}
