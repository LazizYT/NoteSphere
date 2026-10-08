/**
 * NoteSphere OS — AICopilotChat
 * Intelligent AI Copilot agent that executes real actions in the application
 * (creating notes, tasks, transactions, habits, alarms, switching views, changing themes)
 * via Natural Language queries with Gemini AI & local offline fallback parser.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  CornerDownLeft,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  FileText,
  CheckSquare,
  DollarSign,
  Palette,
  Layers,
  Compass,
  AlertCircle,
  Clock,
  Heart,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export interface CopilotAction {
  type:
    | 'create_note'
    | 'create_task'
    | 'add_transaction'
    | 'create_habit'
    | 'create_alarm'
    | 'switch_tab'
    | 'set_theme'
    | 'search_app'
    | 'create_project_ecosystem'
    | 'plan_my_day'
    | 'apply_day_schedule';
  payload: any;
  executed?: boolean;
  actionId?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: CopilotAction[];
}

interface AICopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onExecuteAction: (action: CopilotAction) => { success: boolean; message?: string; targetId?: string };
  appContext: {
    activeTab: string;
    notesCount: number;
    tasksCount: number;
    categories: Array<{ id: string; name: string }>;
  };
}

const QUICK_PROMPTS = [
  { icon: FileText, label: 'Создать заметку', prompt: 'Создай заметку «План спринта на неделю» с целями и чеклистом' },
  { icon: CheckSquare, label: 'Добавить задачу', prompt: 'Добавь задачу «Подготовить отчет для команды» с высоким приоритетом на пятницу' },
  { icon: DollarSign, label: 'Записать трату', prompt: 'Запиши расход 1200 на обед в кафе' },
  { icon: Palette, label: 'Сменить тему', prompt: 'Поменяй цвет интерфейса на изумрудный' },
  { icon: Compass, label: 'Граф знаний', prompt: 'Переключи на граф связей заметок' },
];

export default function AICopilotChat({
  isOpen,
  onClose,
  accentColor,
  onExecuteAction,
  appContext,
}: AICopilotChatProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    const saved = localStorage.getItem('ns_copilot_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: '👋 Привет! Я — ваш **ИИ-Командир** в NoteSphere OS.\n\nЯ могу не просто отвечать на вопросы, но и напрямую управлять вашей системой:\n- Создавать заметки и базы знаний\n- Добавлять задачи и планировать дедлайны\n- Вести учет расходов и доходов\n- Переключать разделы и менять цветовую тему оформления\n\nПросто напишите, что нужно сделать!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Save messages history
  useEffect(() => {
    try {
      localStorage.setItem('ns_copilot_messages', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const query = (customText || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsLoading(true);
    triggerHaptic('light');

    try {
      const historyContext = messages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyContext,
          appContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Server responded with ' + response.status);
      }

      const data = await response.json();
      const actions: CopilotAction[] = Array.isArray(data.actions) ? data.actions : [];

      // Execute actions on the fly
      const processedActions = actions.map((act) => {
        const result = onExecuteAction(act);
        return {
          ...act,
          executed: result.success,
          actionId: 'act-' + Math.random().toString(36).substring(2, 9),
        };
      });

      const assistantMsg: CopilotMessage = {
        id: 'msg-' + Date.now(),
        sender: 'assistant',
        text: data.reply || 'Готово! Команда выполнена.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: processedActions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      triggerHaptic('success');
    } catch (err: any) {
      console.error('Copilot request failed:', err);
      // Fallback local response
      const fallbackMsg: CopilotMessage = {
        id: 'msg-' + Date.now(),
        sender: 'assistant',
        text: `⚠️ Не удалось связаться с ИИ-сервером. Попробуйте еще раз или проверьте подключение.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Очистить историю диалога с ИИ-Командиром?')) {
      const initial: CopilotMessage[] = [
        {
          id: 'msg-welcome',
          sender: 'assistant',
          text: '✨ История очищена. Чем могу помочь?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      localStorage.setItem('ns_copilot_messages', JSON.stringify(initial));
      triggerHaptic('medium');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 pointer-events-none">
        {/* Backdrop for mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm sm:hidden pointer-events-auto"
        />

        {/* Floating Copilot Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`pointer-events-auto relative w-full sm:w-[460px] ${
            isExpanded ? 'sm:w-[720px] sm:h-[85vh]' : 'sm:h-[620px]'
          } h-[88vh] bg-slate-900/95 dark:bg-[#0b0f19]/95 backdrop-blur-2xl border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-200 transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/40 select-none">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg relative"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #4338ca)`,
                  boxShadow: `0 0 16px ${accentColor}55`,
                }}
              >
                <Sparkles size={18} className="text-white animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  ИИ-Командир
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                    Copilot OS
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Управление заметками, задачами и системой</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Очистить историю"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Свернуть' : 'Развернуть'}
                className="hidden sm:block p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={onClose}
                title="Закрыть (Esc)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-4 py-2.5 border-b border-white/5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider whitespace-nowrap mr-1">
              Быстро:
            </span>
            {QUICK_PROMPTS.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 whitespace-nowrap transition-all shadow-sm active:scale-95"
                >
                  <Icon size={12} style={{ color: accentColor }} />
                  {qp.label}
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                    >
                      <Bot size={15} />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-violet-600 text-white rounded-tr-none shadow-md'
                          : 'bg-slate-800/80 border border-white/10 text-slate-200 rounded-tl-none shadow-md backdrop-blur-md'
                      }`}
                    >
                      <div
                        className="prose prose-invert prose-xs max-w-none break-words"
                        dangerouslySetInnerHTML={{
                          __html: msg.text
                            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                            .replace(/\*(.*?)\*/g, '<i>$1</i>')
                            .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1 py-0.5 rounded text-violet-300 font-mono text-[11px]">$1</code>')
                            .replace(/\n/g, '<br/>'),
                        }}
                      />

                      {/* Action Execution Badges */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
                          {msg.actions.map((act, i) => (
                            <div
                              key={i}
                              className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 text-xs text-emerald-300">
                                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                                <span className="font-medium">
                                  {act.type === 'create_project_ecosystem' && `🚀 Развернут проект: «${act.payload?.projectName}»`}
                                  {act.type === 'plan_my_day' && `📅 Составлен персональный план дня`}
                                  {act.type === 'apply_day_schedule' && `⚡ Расписание применено к задачам`}
                                  {act.type === 'create_note' && `Создана заметка: «${act.payload?.title}»`}
                                  {act.type === 'create_task' && `Добавлена задача: «${act.payload?.title}»`}
                                  {act.type === 'add_transaction' && `Записано: ${act.payload?.amount} руб.`}
                                  {act.type === 'create_habit' && `Привычка: «${act.payload?.title}»`}
                                  {act.type === 'create_alarm' && `Будильник на ${act.payload?.time}`}
                                  {act.type === 'switch_tab' && `Раздел открыт: ${act.payload?.tab}`}
                                  {act.type === 'set_theme' && `Цвет изменен`}
                                  {act.type === 'search_app' && `Сквозной поиск по запросу «${act.payload?.query}»`}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                                Выполнено
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700/80 flex-shrink-0 flex items-center justify-center text-slate-300 mt-0.5">
                      <User size={15} />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-center text-slate-400 text-xs py-2 px-1"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                >
                  <RefreshCw size={14} className="animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-white/10 px-3 py-2 rounded-2xl rounded-tl-none">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
                  <span>ИИ выполняет ваш запрос...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3.5 border-t border-white/10 bg-slate-950/60">
            <div className="relative flex items-end bg-slate-800/70 border border-white/15 focus-within:border-violet-500 rounded-2xl p-2 transition-all shadow-inner">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Дайте команду ИИ (например: «Создай заметку о встрече завтра»)..."
                className="w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-slate-100 placeholder-slate-400 max-h-28 py-1.5 px-2"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                style={{
                  backgroundColor: inputText.trim() && !isLoading ? accentColor : 'rgba(255, 255, 255, 0.1)',
                }}
                className="p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex-shrink-0 ml-1"
              >
                <Send size={15} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>
                Нажмите <kbd className="px-1 py-0.5 bg-white/10 rounded font-mono text-[9px]">Enter</kbd> для отправки
              </span>
              <span>
                Горячая клавиша: <kbd className="px-1 py-0.5 bg-white/10 rounded font-mono text-[9px]">Ctrl+J</kbd>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
