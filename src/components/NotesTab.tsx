/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { Note, Category, Importance, Attachment } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Pin,
  Bookmark,
  Sparkles,
  Mic,
  Link2,
  FileText,
  Image,
  Volume2,
  Info,
  ChevronRight,
  Lock,
  CheckSquare,
  AlignLeft,
  ShieldCheck,
  Undo,
  Eye,
  RotateCcw,
  AlertTriangle,
  Play,
  Pause,
  GripVertical,
  Copy,
  Network,
  LayoutGrid,
  Calendar as CalendarIcon,
  Table as TableIcon,
  HelpCircle,
  CheckCircle,
  Flame,
  Code,
  CornerDownRight,
  ArrowRight,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { Language } from '../config/translations';
import AiDiffModal from './AiDiffModal';

const SphereDatabase = React.lazy(() => import('./SphereDatabase'));

interface NotesTabProps {
  notes: Note[];
  categories: Category[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  onAddNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (note: Note) => void;
  onRestoreFromTrash?: (id: string) => void;
  deletedNotes?: Note[];
  accentColor: string;
  language?: Language;
}

const IMPORTANCE_BADGES: Record<Importance, { label: string; colorClass: string }> = {
  low: { label: 'Низкий', colorClass: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
  medium: { label: 'Средний', colorClass: 'bg-yellow-105 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' },
  high: { label: 'Высокий', colorClass: 'bg-orange-105 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' },
  critical: { label: 'Критический', colorClass: 'bg-red-101 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

export const NOTE_THEMES: { id: NonNullable<Note['theme']>; label: string; icon: string; desc: string }[] = [
  { id: 'default', label: 'Стандарт', icon: '💎', desc: 'Классическая темная тема' },
  { id: 'oled', label: 'OLED Black', icon: '🌑', desc: 'Истинно глубокий черный' },
  { id: 'sepia', label: 'Sepia Бумага', icon: '📜', desc: 'Теплый крафт, книжный шрифт' },
  { id: 'grid', label: 'Сетка Blueprint', icon: '📐', desc: 'Инженерная сетка' },
  { id: 'dots', label: 'Точки Bullet', icon: '⚪', desc: 'Точечный блокнот' },
  { id: 'glass', label: 'Frosted Glass', icon: '✨', desc: 'Акриловый градиент' },
];

export const getNoteThemeConfig = (theme?: Note['theme']) => {
  switch (theme) {
    case 'oled':
      return {
        cardClass: 'bg-black text-neutral-100 border-neutral-800 shadow-md',
        editorClass: 'bg-black text-neutral-100 border-neutral-800 shadow-2xl',
        editorHeaderClass: 'bg-neutral-950/90 border-neutral-800/80 text-neutral-200',
        contentClass: 'prose-invert font-sans !text-neutral-100',
        style: { backgroundColor: '#000000', color: '#f5f5f5' } as React.CSSProperties,
      };
    case 'sepia':
      return {
        cardClass: 'bg-[#fbf4e8] dark:bg-[#201812] text-[#3c2f24] dark:text-[#eedec5] border-[#e6d7be] dark:border-[#382b20]',
        editorClass: 'bg-[#fbf4e8] dark:bg-[#1f1711] text-[#382b20] dark:text-[#f3e5d0] border-[#d8c3a5] dark:border-[#3e2d21] shadow-xl',
        editorHeaderClass: 'bg-[#f3e7d3] dark:bg-[#281e16] border-[#d8c3a5] dark:border-[#3e2d21] text-[#382b20] dark:text-[#eedec5]',
        contentClass: 'font-serif text-[#2e2319] dark:text-[#eedec5]',
        style: {} as React.CSSProperties,
      };
    case 'grid':
      return {
        cardClass: 'bg-[#f0f7ff] dark:bg-[#0a111e] text-slate-900 dark:text-blue-100 border-blue-200 dark:border-blue-500/30',
        editorClass: 'bg-[#f4f9ff] dark:bg-[#080d19] text-slate-900 dark:text-blue-100 border-blue-200 dark:border-blue-500/30 shadow-2xl shadow-blue-500/10 dark:shadow-blue-950/40',
        editorHeaderClass: 'bg-[#e5f1ff] dark:bg-[#0a111e]/90 border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200',
        contentClass: 'font-mono text-slate-900 dark:text-blue-100',
        style: {
          backgroundImage:
            'linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        } as React.CSSProperties,
      };
    case 'dots':
      return {
        cardClass: 'bg-[#fafafa] dark:bg-[#0e131f] text-slate-900 dark:text-violet-100 border-violet-200 dark:border-violet-500/25',
        editorClass: 'bg-[#fcfcfc] dark:bg-[#0d121e] text-slate-900 dark:text-slate-100 border-violet-200 dark:border-violet-500/30 shadow-2xl shadow-violet-500/10 dark:shadow-violet-950/30',
        editorHeaderClass: 'bg-[#f5f3ff] dark:bg-[#111728] border-violet-200 dark:border-violet-500/20 text-violet-900 dark:text-violet-200',
        contentClass: 'font-sans text-slate-900 dark:text-slate-100',
        style: {
          backgroundImage: 'radial-gradient(rgba(139, 92, 246, 0.28) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        } as React.CSSProperties,
      };
    case 'glass':
      return {
        cardClass: 'bg-gradient-to-br from-violet-100/70 via-white/80 to-cyan-100/70 dark:from-violet-950/40 dark:via-slate-900/60 dark:to-cyan-950/40 text-slate-900 dark:text-white border-white/60 dark:border-white/15 backdrop-blur-xl',
        editorClass: 'bg-gradient-to-br from-violet-50/90 via-white/95 to-cyan-50/90 dark:from-violet-950/80 dark:via-slate-900/90 dark:to-cyan-950/80 text-slate-900 dark:text-white border-slate-200 dark:border-white/20 backdrop-blur-2xl shadow-2xl',
        editorHeaderClass: 'bg-white/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white backdrop-blur-md',
        contentClass: 'font-sans text-slate-900 dark:text-white',
        style: {} as React.CSSProperties,
      };
    default:
      return {
        cardClass: 'bg-white dark:bg-[#0e1422]/90 border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-[#121826] text-slate-800 dark:text-slate-100 shadow-sm rounded-2xl',
        editorClass: 'bg-white dark:bg-[#0e1422]/90 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 shadow-2xl rounded-2xl',
        editorHeaderClass: 'bg-slate-50 dark:bg-[#0b0f19]/90 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-200',
        contentClass: 'font-sans text-slate-800 dark:text-slate-100',
        style: {} as React.CSSProperties,
      };
  }
};

export default function NotesTab({
  notes,
  categories,
  activeNoteId,
  setActiveNoteId,
  onAddNote,
  onDeleteNote,
  onUpdateNote,
  onRestoreFromTrash,
  deletedNotes = [],
  accentColor,
  language = 'ru',
}: NotesTabProps) {
  // Navigation view mode: 'editor' | 'database'
  const [notesViewMode, setNotesViewMode] = useState<'editor' | 'database'>('editor');

  // Navigation sub-tabs inside notes: 'active' | 'trash'
  const [notesSubTab, setNotesSubTab] = useState<'active' | 'trash'>('active');

  // Search and quick filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Active note editor values
  const currentNote = notes.find((n) => n.id === activeNoteId);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState('cat-personal');
  const [editorImportance, setEditorImportance] = useState<Importance>('low');
  const [editorTags, setEditorTags] = useState('');
  const [editorColor, setEditorColor] = useState('#8b5cf6');
  const [editorIsProtected, setEditorIsProtected] = useState(false);
  const [editorTheme, setEditorTheme] = useState<Note['theme']>('default');

  // Font size and family settings for note editor
  const [noteFontSize, setNoteFontSize] = useState<string>(() => {
    return localStorage.getItem('ns_note_font_size') || '15px';
  });
  const [noteFontFamily, setNoteFontFamily] = useState<string>(() => {
    return localStorage.getItem('ns_note_font_family') || 'sans';
  });

  useEffect(() => {
    localStorage.setItem('ns_note_font_size', noteFontSize);
  }, [noteFontSize]);

  useEffect(() => {
    localStorage.setItem('ns_note_font_family', noteFontFamily);
  }, [noteFontFamily]);

  // Slash commands and Wikilinks menus
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showWikilinkPicker, setShowWikilinkPicker] = useState(false);
  const [wikilinkSearch, setWikilinkSearch] = useState('');

  // Attachment inputs
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Speech Recognition and Voice Recorder
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Vim Mode
  const [isVimMode, setIsVimMode] = useState<boolean>(() => {
    return localStorage.getItem('ns_vim_mode') === 'true';
  });
  const [vimStatus, setVimStatus] = useState<'NORMAL' | 'INSERT'>('NORMAL');

  // AI states
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSummaryResult, setAiSummaryResult] = useState('');
  const [aiTasksResult, setAiTasksResult] = useState<string[]>([]);
  const [aiProofreadExplanation, setAiProofreadExplanation] = useState('');

  // Settle editor input contents when active note shifts
  useEffect(() => {
    if (currentNote) {
      setEditorTitle(currentNote.title || '');
      setEditorContent(currentNote.content || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = currentNote.content || '';
      }
      setEditorCategory(currentNote.categoryId);
      setEditorImportance(currentNote.importance || 'medium');
      setEditorTags((currentNote.tags || []).join(', '));
      setEditorColor(currentNote.color || '#3b82f6');
      setEditorIsProtected(currentNote.isProtected || false);
      setEditorTheme(currentNote.theme || 'default');

      // Look for audio attachments
      const audioAttach = (currentNote.attachments || []).find((at) => at.type === 'audio');
      setAudioBlobUrl(audioAttach ? audioAttach.url : null);

      // Clear previous helper values
      setAiSummaryResult('');
      setAiTasksResult([]);
      setAiProofreadExplanation('');
      setAiError('');
      setShowSlashMenu(false);
      setShowWikilinkPicker(false);
    } else {
      setEditorTitle('');
      setEditorContent('');
      setEditorTheme('default');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [activeNoteId]);

  // AUTOSAVE TRIGGER: Ticks every time user edits fields
  const syncAutosave = (updatedFields: Partial<Note>) => {
    if (!currentNote) return;
    const nextNode: Note = {
      ...currentNote,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    onUpdateNote(nextNode);
  };

  // Helper adding styles to contentEditable text
  const applyTextstyle = (styleCmd: string, param: string = '') => {
    document.execCommand(styleCmd, false, param);
    const el = editorRef.current || document.getElementById('rich-editable-area');
    if (el) {
      const html = el.innerHTML;
      setEditorContent(html);
      syncAutosave({ content: html });
    }
  };

  // Insert custom HTML block into editor
  const insertCustomHtmlBlock = (htmlBlock: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, htmlBlock);
      const html = editorRef.current.innerHTML;
      setEditorContent(html);
      syncAutosave({ content: html });
    }
    setShowSlashMenu(false);
    setShowWikilinkPicker(false);
    triggerHaptic('success');
  };

  // AI Diff Review Modal State («Было / Стало»)
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState('');
  const [diffSuggested, setDiffSuggested] = useState('');

  const handleAcceptAiDiff = (newText: string) => {
    setEditorContent(newText);
    if (editorRef.current) {
      editorRef.current.innerHTML = newText;
    }
    syncAutosave({ content: newText });
    setAiProofreadExplanation('');
    triggerHaptic('success');
  };

  // Handle smart pasting of URLs into compact link chips
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain')?.trim();
    if (!text) return;

    // Detect if pasted text is a web URL
    const urlRegex = /^https?:\/\/[^\s]+$/i;
    if (urlRegex.test(text)) {
      e.preventDefault();
      try {
        const parsedUrl = new URL(text);
        const domain = parsedUrl.hostname.replace(/^www\./i, '');
        // Insert stylish, compact interactive link chip
        const chipHtml = `<a href="${text}" target="_blank" rel="noopener noreferrer" class="ns-smart-link" title="${text}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;margin:0 2px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);border-radius:12px;color:#38bdf8;text-decoration:none;font-size:12px;font-weight:600;vertical-align:middle;"><span>🌐</span><span>${domain}</span></a>&nbsp;`;
        document.execCommand('insertHTML', false, chipHtml);
        const updated = e.currentTarget.innerHTML;
        setEditorContent(updated);
        syncAutosave({ content: updated });
        triggerHaptic('light');
        return;
      } catch {
        // Fallback to normal paste
      }
    }
  };

  // ContentEditable input handler
  const handleEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setEditorContent(html);
    syncAutosave({ content: html });

    // Check for [[ wikilink trigger or / slash trigger
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const textBefore = sel.anchorNode.textContent?.slice(0, sel.anchorOffset) || '';
      if (textBefore.endsWith('[[')) {
        setShowWikilinkPicker(true);
        setWikilinkSearch('');
        triggerHaptic('light');
      } else if (textBefore.endsWith('/')) {
        setShowSlashMenu(true);
        triggerHaptic('light');
      }
    }
  };

  // ContentEditable click handler: handle clicks on [[Wikilinks]] and Smart Links
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Click on Smart Link Chips or web links
    const smartLink = target.closest('a.ns-smart-link, a[href]') as HTMLAnchorElement | null;
    if (smartLink) {
      const href = smartLink.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        e.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
        triggerHaptic('light');
        return;
      }
    }

    const linkEl = target.closest('.wikilink') as HTMLElement | null;
    if (linkEl) {
      const noteId = linkEl.getAttribute('data-note-id');
      const noteTitle = linkEl.getAttribute('data-note-title') || linkEl.textContent?.replace(/[\[\]]/g, '').trim();

      if (noteId) {
        setActiveNoteId(noteId);
        triggerHaptic('selection');
      } else if (noteTitle) {
        const found = notes.find((n) => n.title.toLowerCase() === noteTitle.toLowerCase());
        if (found) {
          setActiveNoteId(found.id);
          triggerHaptic('selection');
        } else {
          // Create note on the fly
          const fresh: Note = {
            id: `note-${Date.now()}`,
            title: noteTitle,
            content: `<p>Создано по двусторонней ссылке из <b>${currentNote?.title || 'заметки'}</b>.</p>`,
            isFavorite: false,
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            categoryId: 'cat-personal',
            tags: ['wikilink'],
            importance: 'medium',
            color: accentColor,
            attachments: [],
            isProtected: false,
            versions: [],
          };
          onAddNote(fresh);
          setActiveNoteId(fresh.id);
          triggerHaptic('success');
        }
      }
    }
  };

  // Insert Wikilink to target note
  const handleInsertWikilink = (targetNote: Note) => {
    const linkHtml = `<span class="wikilink" data-note-id="${targetNote.id}" data-note-title="${targetNote.title}" contenteditable="false">[[${targetNote.title}]]</span>&nbsp;`;
    insertCustomHtmlBlock(linkHtml);
  };

  // Backlinks & Unlinked mentions calculations
  const { backlinks, unlinkedMentions, allConnectedNotes } = useMemo(() => {
    if (!currentNote) return { backlinks: [], unlinkedMentions: [], allConnectedNotes: [] };
    const curTitle = currentNote.title.trim().toLowerCase();
    const curId = currentNote.id;

    const backs: Note[] = [];
    const unlinked: Note[] = [];

    notes.forEach((n) => {
      if (n.id === curId) return;
      const contentLower = (n.content || '').toLowerCase();
      const explicitMatch =
        contentLower.includes(`[[${curTitle}]]`) ||
        contentLower.includes(`data-note-id="${curId}"`) ||
        (n.links || []).some((l) => l.toLowerCase() === curTitle || l === curId);

      if (explicitMatch) {
        backs.push(n);
      } else if (curTitle.length > 2 && contentLower.includes(curTitle)) {
        unlinked.push(n);
      }
    });

    // Outgoing wikilinks from current note
    const outgoing: Note[] = [];
    const directLinks = currentNote.links || [];
    const extractedMatches = (currentNote.content || '').matchAll(/\[\[(.*?)\]\]/g);
    const allOutgoingTitles = new Set(directLinks.map(t => t.toLowerCase().trim()));
    for (const m of extractedMatches) {
      if (m[1]) allOutgoingTitles.add(m[1].toLowerCase().trim());
    }

    notes.forEach((n) => {
      if (n.id !== curId && (allOutgoingTitles.has(n.title.toLowerCase().trim()) || allOutgoingTitles.has(n.id))) {
        outgoing.push(n);
      }
    });

    const connectedMap = new Map<string, Note>();
    backs.forEach(n => connectedMap.set(n.id, n));
    outgoing.forEach(n => connectedMap.set(n.id, n));

    return {
      backlinks: backs,
      unlinkedMentions: unlinked,
      outgoingNotes: outgoing,
      allConnectedNotes: Array.from(connectedMap.values()),
    };
  }, [currentNote, notes]);

  // 1. ADD NEW BLANK NOTE QUICKACTION
  const handleCreateNewBlankNote = () => {
    const fresh: Note = {
      id: `note-${Date.now()}`,
      title: 'Новая заметка',
      content: '<p>Начните вводить текст...</p>',
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: selectedCategory !== 'all' ? selectedCategory : 'cat-personal',
      tags: [],
      importance: 'low',
      color: accentColor,
      attachments: [],
      isProtected: false,
      versions: [],
    };
    onAddNote(fresh);
    setActiveNoteId(fresh.id);
    setNotesViewMode('editor');
    triggerHaptic('success');
  };

  // 1b. DAILY NOTES (Дневник дня в 1 клик)
  const handleOpenDailyNote = () => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const todayFormatted = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const expectedTitle = `Дневник · ${todayFormatted}`;

    const existingDaily = notes.find((n) => n.dailyDate === todayDateStr || n.title === expectedTitle);
    if (existingDaily) {
      setActiveNoteId(existingDaily.id);
      setNotesViewMode('editor');
      triggerHaptic('selection');
      return;
    }

    // Create today's daily note
    const dailyTemplateHtml = `
      <div class="ns-callout ns-callout-info">
        <div>📅</div>
        <div><b>Фокус дня:</b> Запишите здесь главное намерение и стратегическую задачу на сегодня.</div>
      </div>
      <h2>🎯 Топ-3 приоритета на сегодня</h2>
      <ul>
        <li>[ ] <b>Приоритет 1:</b> </li>
        <li>[ ] <b>Приоритет 2:</b> </li>
        <li>[ ] <b>Приоритет 3:</b> </li>
      </ul>
      <h2>💡 Мысли, инсайты и заметки</h2>
      <p></p>
      <details class="ns-toggle">
        <summary>📋 Чеклист ежедневных ритуалов</summary>
        <div class="ns-toggle-body">
          <ul>
            <li>[ ] Утренняя разминка / спорт</li>
            <li>[ ] Проверка почты и фокус-блок 1</li>
            <li>[ ] Прогулка на свежем воздухе</li>
            <li>[ ] Чтение 20 страниц</li>
          </ul>
        </div>
      </details>
      <h2>🧘 Вечерняя рефлексия</h2>
      <p>Что сегодня получилось лучше всего? Что можно улучшить завтра?</p>
    `;

    const freshDaily: Note = {
      id: `daily-${todayDateStr}`,
      title: expectedTitle,
      content: dailyTemplateHtml,
      isFavorite: true,
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-personal',
      tags: ['дневник', 'daily'],
      importance: 'high',
      color: '#3b82f6',
      attachments: [],
      isProtected: false,
      versions: [],
      dailyDate: todayDateStr,
    };

    onAddNote(freshDaily);
    setActiveNoteId(freshDaily.id);
    setNotesViewMode('editor');
    triggerHaptic('success');
  };

  // NOTE TEMPLATES
  const NOTE_TEMPLATES = [
    {
      id: 'tpl-daily',
      label: 'Ежедневник',
      icon: '📅',
      title: 'Дневник · ' + new Date().toLocaleDateString('ru-RU'),
      content: '<h2>План дня</h2><ul><li><b>Топ-3 приоритета:</b></li><li></li><li></li></ul><h3>Встречи</h3><p></p><h3>Мысли</h3><p></p>',
      categoryId: 'cat-work',
      tags: ['ежедневник'],
    },
    {
      id: 'tpl-meeting',
      label: 'Заметки встречи',
      icon: '🤝',
      title: 'Встреча · ' + new Date().toLocaleDateString('ru-RU'),
      content: '<h2>Участники</h2><ul><li></li></ul><h2>Повестка</h2><ol><li></li><li></li></ol><h2>Решения</h2><ul><li></li></ul><h2>Следующие шаги</h2><p></p>',
      categoryId: 'cat-work',
      tags: ['встреча'],
    },
    {
      id: 'tpl-idea',
      label: 'Идея',
      icon: '💡',
      title: 'Идея · ' + new Date().toLocaleDateString('ru-RU'),
      content: '<h2>Суть идеи</h2><p></p><h3>Зачем это нужно?</h3><p></p><h3>Как реализовать</h3><ol><li></li><li></li><li></li></ol>',
      categoryId: 'cat-personal',
      tags: ['идея'],
    },
    {
      id: 'tpl-project',
      label: 'Проект',
      icon: '🚀',
      title: 'Проект · новый',
      content: '<h2>Цель проекта</h2><p></p><h2>Задачи</h2><ul><li>[ ] Задача 1</li><li>[ ] Задача 2</li></ul><h2>Ресурсы</h2><p></p><h2>Дедлайны</h2><p></p>',
      categoryId: 'cat-work',
      tags: ['проект'],
    },
  ];

  const [noteTemplatesOpen, setNoteTemplatesOpen] = useState(false);

  const handleCreateFromTemplate = (tpl: typeof NOTE_TEMPLATES[number]) => {
    const fresh: Note = {
      id: `note-${Date.now()}`,
      title: tpl.title,
      content: tpl.content,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: tpl.categoryId,
      tags: tpl.tags,
      importance: 'medium',
      color: accentColor,
      attachments: [],
      isProtected: false,
      versions: [],
    };
    onAddNote(fresh);
    setActiveNoteId(fresh.id);
    setNoteTemplatesOpen(false);
    setNotesViewMode('editor');
    triggerHaptic('success');
  };

  // ATTACHMENT ADD LOGIC
  const handleAddLinkAttachment = () => {
    if (!newLinkUrl || !currentNote) return;

    const newAttach: Attachment = {
      id: `attach-${Date.now()}`,
      name: newLinkName || 'Ссылка',
      type: 'link',
      url: newLinkUrl,
    };

    const nextList = [...(currentNote.attachments || []), newAttach];
    syncAutosave({ attachments: nextList });

    setNewLinkUrl('');
    setNewLinkName('');
    setShowAttachmentMenu(false);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'pdf' | 'doc') => {
    const file = e.target.files?.[0];
    if (!file || !currentNote) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64Data = reader.result as string;
      const newAttach: Attachment = {
        id: `attach-${Date.now()}`,
        name: file.name,
        type: fileType,
        url: b64Data,
      };

      const nextList = [...(currentNote.attachments || []), newAttach];
      syncAutosave({ attachments: nextList });
    };
    reader.readAsDataURL(file);
    setShowAttachmentMenu(false);
  };

  const handleRemoveAttachment = (attachId: string) => {
    if (!currentNote) return;
    const nextList = (currentNote.attachments || []).filter((at) => at.id !== attachId);
    syncAutosave({ attachments: nextList });
    if (audioBlobUrl && (currentNote.attachments || []).find((at) => at.id === attachId)?.type === 'audio') {
      setAudioBlobUrl(null);
    }
  };

  // SPEECH WEB API
  const handleToggleSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('К сожалению, ваш браузер не поддерживает Speech Recognition API. Попробуйте Google Chrome!');
        return;
      }

      if (isRecognizing) {
        recognitionRef.current?.stop();
        setIsRecognizing(false);
      } else {
        const recog = new SpeechRecognition();
        recog.lang = 'ru-RU';
        recog.continuous = true;
        recog.interimResults = true;

        recog.onresult = (event: any) => {
          let interimTrans = '';
          let finalTrans = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            } else {
              interimTrans += event.results[i][0].transcript;
            }
          }

          if (finalTrans) {
            const addedText = `<p>${finalTrans}</p>`;
            const nextContent = editorContent + addedText;
            setEditorContent(nextContent);
            if (editorRef.current) {
              editorRef.current.innerHTML = nextContent;
            }
            syncAutosave({ content: nextContent });
          }
        };

        recog.onend = () => {
          setIsRecognizing(false);
        };

        recog.start();
        recognitionRef.current = recog;
        setIsRecognizing(true);
      }
    } catch (e) {
      console.warn('Real-time Speech Recognition is restricted.', e);
    }
  };

  // NATIVE MICROPHONE RECORDING & STORAGE
  const handleToggleMicrophoneRecord = async () => {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecordingAudio(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const media = new MediaRecorder(stream);
        audioChunksRef.current = [];

        media.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };

        media.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = () => {
            const b64Data = reader.result as string;
            setAudioBlobUrl(b64Data);

            if (currentNote) {
              const voiceAttach: Attachment = {
                id: `attach-voice-${Date.now()}`,
                name: `Голосовая заметка - ${new Date().toLocaleTimeString()}`,
                type: 'audio',
                url: b64Data,
              };

              const cleanAttachments = (currentNote.attachments || []).filter((at) => at.type !== 'audio');
              syncAutosave({ attachments: [...cleanAttachments, voiceAttach] });
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach((tk) => tk.stop());
        };

        media.start();
        mediaRecorderRef.current = media;
        setIsRecordingAudio(true);
      } catch (err) {
        console.warn('Microphone permission blocked or input not found.', err);
      }
    }
  };

  // SERVER-SIDE GEMINI ASSISTANT API PROXIES
  const handleAskAiForSummary = async () => {
    if (!editorContent) return;
    setIsGeneratingAi(true);
    setAiError('');
    setAiSummaryResult('');

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editorTitle, content: editorContent }),
      });

      if (!response.ok) throw new Error('Ошибка связи с сервером Gemini.');
      const data = await response.json();
      setAiSummaryResult(data.summary || 'К сожалению, ИИ не смог составить краткую выжимку.');
    } catch (err: any) {
      setAiError(err.message || 'Ошибка суммаризации');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAskAiForProofread = async () => {
    if (!editorContent) return;
    setIsGeneratingAi(true);
    setAiError('');

    try {
      const response = await fetch('/api/ai/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent }),
      });

      if (!response.ok) throw new Error('Ошибка редактора Gemini.');
      const data = await response.json();

      if (data.corrected) {
        let cleanText = data.corrected;
        // Strip markdown code fences if any
        cleanText = cleanText.replace(/^```(?:html|json|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
        // If raw JSON string was returned
        if (cleanText.startsWith('{') && cleanText.includes('"corrected"')) {
          try {
            const parsed = JSON.parse(cleanText);
            if (parsed.corrected) cleanText = parsed.corrected;
          } catch {
            cleanText = cleanText.replace(/,\s*"explanation"\s*:[\s\S]*$/, '').replace(/^\{\s*"corrected"\s*:\s*"?/, '').replace(/"?\s*\}$/, '');
          }
        }
        cleanText = cleanText.replace(/,?\s*"explanation"\s*:\s*"[\s\S]*?"\s*\}?/gi, '').trim();

        setDiffOriginal(editorContent);
        setDiffSuggested(cleanText);
        setDiffModalOpen(true);
        triggerHaptic('success');
      }
    } catch (err: any) {
      setAiError(err.message || 'Ошибка исправления текста');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAskAiForChecklist = async () => {
    if (!editorContent) return;
    setIsGeneratingAi(true);
    setAiError('');
    setAiTasksResult([]);

    try {
      const response = await fetch('/api/ai/tasks-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editorContent.replace(/<[^>]*>/g, '') }),
      });

      if (!response.ok) throw new Error('Ошибка извлечения задач.');
      const data = await response.json();

      if (data.tasks && data.tasks.length > 0) {
        setAiTasksResult(data.tasks.map((t: any) => t.title));

        let checkHtml = '<h3>Список извлеченных задач от ИИ:</h3><ul>';
        data.tasks.forEach((t: any) => {
          checkHtml += `<li>[ ] [Приоритет: ${t.priority}] ${t.title}</li>`;
        });
        checkHtml += '</ul>';

        const merged = editorContent + checkHtml;
        setEditorContent(merged);
        if (editorRef.current) {
          editorRef.current.innerHTML = merged;
        }
        syncAutosave({ content: merged });
      } else {
        setAiError('ИИ не обнаружил конкретных действий в тексте.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Ошибка создания задач');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // FILE QUERY LIST FILTERING MATCHER
  const listToRender = notesSubTab === 'active' ? (notes || []) : (deletedNotes || []);

  const filteredNotes = listToRender.filter((n) => {
    if (!n) return false;
    const rawSearch = (searchQuery || '').toLowerCase();
    const titleMatch = (n.title || '').toLowerCase().includes(rawSearch);
    const contentMatch = (n.content || '').toLowerCase().includes(rawSearch);
    const tagMatch = (n.tags || []).some((t) => (t || '').toLowerCase().includes(rawSearch));

    const searchCondition = titleMatch || contentMatch || tagMatch;
    const catCondition = selectedCategory === 'all' || n.categoryId === selectedCategory;
    const priorityCondition = selectedImportance === 'all' || n.importance === selectedImportance;
    const favCondition = !filterFavorites || n.isFavorite;

    return searchCondition && catCondition && priorityCondition && favCondition;
  });

  const pinnedNotes = filteredNotes.filter((n) => n?.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n?.isPinned);
  const activeThemeConfig = getNoteThemeConfig(editorTheme);

  return (
    <div id="notes-tab-container" className="space-y-4 max-w-7xl mx-auto p-1 font-sans">
      {/* 🚀 1. NOTION / OBSIDIAN MULTI-VIEW SWITCHER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-2xl shadow-sm text-xs">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <button
            onClick={() => {
              setNotesViewMode('editor');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              notesViewMode === 'editor' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <AlignLeft size={14} /> Редактор
          </button>
          <button
            onClick={() => {
              setNotesViewMode('database');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              notesViewMode === 'database' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TableIcon size={14} /> 📊 База Данных
          </button>
        </div>

        {/* Action Buttons: Daily Note & New Note */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenDailyNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md transition-all cursor-pointer"
            title="Создать или открыть сегодняшнюю заметку-дневник"
          >
            <CalendarIcon size={14} /> Заметка дня
          </button>

          <button
            onClick={handleCreateNewBlankNote}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus size={14} /> Заметка
          </button>

          <button
            onClick={() => setNoteTemplatesOpen((o) => !o)}
            className="p-1.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 rounded-xl border border-slate-800/80 transition-all cursor-pointer"
            title="Шаблоны заметок"
          >
            <Copy size={15} />
          </button>
        </div>
      </div>

      {/* 🌌 2. CONDITIONAL VIEW CONTAINER */}
      {notesViewMode === 'database' ? (
        <React.Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Загрузка базы данных...</p>
            </div>
          }
        >
          <SphereDatabase
            notes={notes}
            categories={categories}
            activeNoteId={activeNoteId}
            onSelectNote={(id) => {
              setActiveNoteId(id);
              setNotesViewMode('editor');
            }}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onAddNote={onAddNote}
            accentColor={accentColor}
          />
        </React.Suspense>
      ) : (
        /* 📝 3. STANDARD EDITOR VIEW */
        <div className="space-y-4">
          {/* Top Sub Navbar (Search, Filters, Trash) */}
          <div
            id="notes-sub-navbar"
            className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-[#0e1422]/90 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl shadow-sm text-xs"
          >
            {/* Toggle between Active system and Trash bin */}
            <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                id="subtab-active-btn"
                onClick={() => {
                  setNotesSubTab('active');
                  setActiveNoteId(null);
                }}
                className={`py-1.5 px-3.5 font-semibold rounded-lg transition-all cursor-pointer ${
                  notesSubTab === 'active'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Активные ({notes.length})
              </button>
              <button
                id="subtab-trash-btn"
                onClick={() => {
                  setNotesSubTab('trash');
                  setActiveNoteId(null);
                }}
                className={`py-1.5 px-3.5 font-semibold rounded-lg transition-all cursor-pointer ${
                  notesSubTab === 'trash'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Корзина ({deletedNotes.length})
              </button>
            </div>

            {/* Filters and search in real-time */}
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end max-w-2xl w-full">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  id="notes-search-query"
                  type="text"
                  placeholder="Поиск по фразе, [[ссылке]]..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full text-xs"
                />
              </div>

              <div className="bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 px-2 rounded-xl py-0.5">
                <select
                  id="notes-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-300 focus:outline-none py-1 block text-xs cursor-pointer"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Все категории</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  filterFavorites
                    ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/40'
                    : 'bg-slate-100 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Только избранные"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Templates Dropdown Drawer */}
          {noteTemplatesOpen && (
            <div className="p-3 bg-white dark:bg-[#0e1422]/95 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg flex flex-wrap gap-2 animate-fade-in">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block w-full">Создать из готового шаблона:</span>
              {NOTE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreateFromTemplate(tpl)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-900 dark:text-slate-200 text-xs rounded-xl border dark:border-slate-800/80 transition cursor-pointer"
                >
                  <span>{tpl.icon}</span>
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* DUAL COLUMN WORKSPACE */}
          <div id="notes-workspace" className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* SIDE LIST */}
            <div
              id="notes-sidebar-list"
              className={`space-y-3 max-h-[620px] overflow-y-auto pr-1 ${activeNoteId ? 'hidden md:block' : 'block'}`}
            >
              {filteredNotes.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 font-sans">
                  Заметок не найдено
                </div>
              ) : (
                <div className="space-y-3">
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black tracking-wider text-slate-400 block uppercase px-1">
                        📌 Закрепленные
                      </span>
                      <AnimatePresence>{pinnedNotes.map((note, idx) => renderNoteCard(note, idx))}</AnimatePresence>
                    </div>
                  )}

                  {unpinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      {pinnedNotes.length > 0 && (
                        <span className="text-[10px] font-black tracking-wider text-slate-400 block uppercase px-1 pt-2">
                          Все остальные
                        </span>
                      )}
                      <AnimatePresence>{unpinnedNotes.map((note, idx) => renderNoteCard(note, idx))}</AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CENTRAL FULL-FEATURED EDITOR */}
            <div
              id="notes-main-editor"
              style={activeThemeConfig.style}
              className={`md:col-span-2 ${activeThemeConfig.editorClass} border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between min-h-[620px] relative transition-all duration-300 ${
                activeNoteId ? 'block' : 'hidden md:flex'
              }`}
            >
              {activeNoteId === null || !currentNote ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <AlignLeft className="w-12 h-12 text-slate-350 dark:text-slate-700 mb-2 animate-pulse" />
                  <h4 className="font-bold text-sm tracking-wide text-slate-755 dark:text-slate-300">
                    Редактор заметок NoteSphere
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1.5 font-sans">
                    Выберите заметку слева, чтобы приступить к написанию, настроить тему оформления, вставить [[Wikilinks]] или блоки через слеш-меню (/).
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Editor Controls Bar */}
                  <div
                    id="editor-control-header"
                    className={`px-4 py-2.5 border-b flex justify-between items-center text-xs gap-2.5 flex-wrap transition-colors duration-300 ${activeThemeConfig.editorHeaderClass}`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setActiveNoteId(null);
                          triggerHaptic('light');
                        }}
                        className="md:hidden py-1 px-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[11px]"
                      >
                        ← Список
                      </button>

                      {/* Theme / Background selector */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5" title="Тема и фон заметки (OLED, Sepia, Blueprint, Bullet, Glass)">
                        <span className="text-[11px]">🎨</span>
                        <select
                          id="editor-theme-picker"
                          value={editorTheme || 'default'}
                          onChange={(e) => {
                            const nextTheme = e.target.value as Note['theme'];
                            setEditorTheme(nextTheme);
                            syncAutosave({ theme: nextTheme });
                            triggerHaptic('selection');
                          }}
                          className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-[11px] font-medium cursor-pointer"
                        >
                          {NOTE_THEMES.map((th) => (
                            <option key={th.id} value={th.id} className="bg-slate-900 text-white">
                              {th.icon} {th.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Size select */}
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                        <select
                          id="editor-font-size-picker"
                          value={noteFontSize}
                          onChange={(e) => setNoteFontSize(e.target.value)}
                          className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-[11px] cursor-pointer"
                          title="Размер шрифта"
                        >
                          <option value="13px">13 px</option>
                          <option value="15px">15 px</option>
                          <option value="17px">17 px</option>
                          <option value="19px">19 px</option>
                          <option value="22px">22 px</option>
                        </select>
                      </div>

                      {/* Font Family select */}
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                        <select
                          id="editor-font-family-picker"
                          value={noteFontFamily}
                          onChange={(e) => setNoteFontFamily(e.target.value)}
                          className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-[11px] cursor-pointer"
                          title="Шрифт текста"
                        >
                          <option value="sans">Sans (Без засечек)</option>
                          <option value="serif">Serif (С засечками)</option>
                          <option value="mono">Mono (Код)</option>
                        </select>
                      </div>

                      {/* Importance selector */}
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                        <select
                          id="editor-prio-picker"
                          value={editorImportance}
                          onChange={(e) => {
                            setEditorImportance(e.target.value as Importance);
                            syncAutosave({ importance: e.target.value as Importance });
                          }}
                          className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-[11px]"
                        >
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                          <option value="critical">Критический</option>
                        </select>
                      </div>

                      {/* Color dot picker */}
                      <input
                        id="editor-color-picker"
                        type="color"
                        value={editorColor}
                        onChange={(e) => {
                          setEditorColor(e.target.value);
                          syncAutosave({ color: e.target.value });
                        }}
                        className="w-5 h-5 border-none cursor-pointer rounded-full bg-transparent overflow-hidden"
                      />

                      {/* Protected lock */}
                      <button
                        id="editor-lock-toggle"
                        onClick={() => {
                          setEditorIsProtected(!editorIsProtected);
                          syncAutosave({ isProtected: !editorIsProtected });
                          triggerHaptic('light');
                        }}
                        className={`p-1 rounded-lg border transition ${
                          editorIsProtected
                            ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id="pin-note-btn"
                        onClick={() => {
                          syncAutosave({ isPinned: !currentNote.isPinned });
                          triggerHaptic('light');
                        }}
                        className={`p-1.5 rounded-lg border transition ${
                          currentNote.isPinned
                            ? 'bg-indigo-50 text-indigo-500 border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        id="fav-note-btn"
                        onClick={() => {
                          syncAutosave({ isFavorite: !currentNote.isFavorite });
                          triggerHaptic('light');
                        }}
                        className={`p-1.5 rounded-lg border transition ${
                          currentNote.isFavorite
                            ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </button>
                      {notesSubTab === 'active' ? (
                        <button
                          id="trash-active-note-btn"
                          onClick={() => {
                            onDeleteNote(currentNote.id);
                            triggerHaptic('medium');
                          }}
                          className="p-1.5 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 rounded-lg transition dark:bg-red-500/20 dark:border-red-500/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          id="restore-trashed-note-btn"
                          onClick={() => {
                            onRestoreFromTrash && onRestoreFromTrash(currentNote.id);
                            triggerHaptic('success');
                          }}
                          className="p-1.5 bg-green-50 text-green-500 border border-green-100 rounded-lg transition dark:bg-emerald-500/20 dark:text-emerald-400"
                        >
                          Восстановить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div id="editor-title-container" className="px-5 pt-3">
                    <input
                      id="active-note-title"
                      type="text"
                      value={editorTitle}
                      onChange={(e) => {
                        setEditorTitle(e.target.value);
                        syncAutosave({ title: e.target.value });
                      }}
                      placeholder="Заголовок заметки..."
                      disabled={notesSubTab === 'trash'}
                      className="w-full text-lg font-black tracking-tight text-slate-900 dark:text-white border-none focus:outline-none font-sans bg-transparent"
                    />
                  </div>

                  {/* Rich Text & Block Formatting Bar */}
                  {notesSubTab === 'active' && (
                    <div
                      id="rich-text-formatting-bar"
                      className="mx-5 my-2 p-1 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-1 flex-wrap text-xs items-center shadow-xs"
                    >
                      <button
                        onClick={() => applyTextstyle('bold')}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold transition"
                      >
                        B
                      </button>
                      <button
                        onClick={() => applyTextstyle('italic')}
                        className="p-1 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 italic transition"
                      >
                        I
                      </button>
                      <button
                        onClick={() => applyTextstyle('underline')}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 underline transition"
                      >
                        U
                      </button>
                      <button
                        onClick={() => applyTextstyle('formatBlock', '<h1>')}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold transition"
                      >
                        H1
                      </button>
                      <button
                        onClick={() => applyTextstyle('formatBlock', '<h2>')}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-[10px] transition"
                      >
                        H2
                      </button>
                      <button
                        onClick={() => applyTextstyle('insertUnorderedList')}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] transition"
                      >
                        • Список
                      </button>

                      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5 h-4" />

                      {/* ⚡ Slash Command Quick Blocks Menu */}
                      <button
                        onClick={() => setShowSlashMenu(!showSlashMenu)}
                        className="p-1 px-2 bg-violet-500/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/40 rounded hover:bg-violet-500/20 dark:hover:bg-violet-600/30 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        ⚡ + Блок (/)
                      </button>

                      {/* 🔗 Wikilink Picker Button */}
                      <button
                        onClick={() => setShowWikilinkPicker(!showWikilinkPicker)}
                        className="p-1 px-2 bg-cyan-500/10 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded hover:bg-cyan-500/20 dark:hover:bg-cyan-600/30 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        🔗 [[Ссылка]]
                      </button>

                      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5 h-4" />

                      {/* Voice to text */}
                      <button
                        id="speech-convert-btn"
                        onClick={handleToggleSpeechRecognition}
                        className={`p-1 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          isRecognizing
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Mic className="w-3 h-3" /> {isRecognizing ? 'Запись...' : 'Голос'}
                      </button>

                      {/* Attachments */}
                      <button
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="p-1 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        📎 Файл
                      </button>

                      {/* ⌨️ Vim Mode Toggle */}
                      <button
                        id="vim-mode-btn"
                        onClick={() => {
                          setIsVimMode((prev) => {
                            const next = !prev;
                            localStorage.setItem('ns_vim_mode', String(next));
                            return next;
                          });
                          triggerHaptic('medium');
                        }}
                        className={`p-1 px-2 rounded text-[10px] font-bold font-mono flex items-center gap-1 transition cursor-pointer ${
                          isVimMode
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Vim-режим (Normal: i, a, x, Esc)"
                      >
                        ⌨️ Vim {isVimMode ? `[${vimStatus}]` : 'Off'}
                      </button>
                    </div>
                  )}

                  {/* ⚡ FLOATING SLASH COMMANDS MENU */}
                  <AnimatePresence>
                    {showSlashMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mx-5 mb-2 p-2 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-30 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-slate-200"
                      >
                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<div class="ns-callout ns-callout-info"><div>💡</div><div><b>Информация:</b> Введите текст подсказки...</div></div><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 text-left transition"
                        >
                          <Info size={14} className="text-blue-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-blue-200 text-[11px]">Инфо Callout</div>
                            <div className="text-[9px] text-slate-400">Синяя плашка</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<div class="ns-callout ns-callout-warn"><div>⚠️</div><div><b>Внимание:</b> Важное предостережение...</div></div><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/50 text-left transition"
                        >
                          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-amber-200 text-[11px]">Внимание Callout</div>
                            <div className="text-[9px] text-slate-400">Янтарная плашка</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<div class="ns-callout ns-callout-success"><div>✅</div><div><b>Успех:</b> Достигнутый результат...</div></div><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 text-left transition"
                        >
                          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-emerald-200 text-[11px]">Успех Callout</div>
                            <div className="text-[9px] text-slate-400">Зеленая плашка</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<div class="ns-callout ns-callout-critical"><div>🔥</div><div><b>Критично:</b> Срочные детали...</div></div><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-red-950/40 border border-red-500/30 hover:bg-red-900/50 text-left transition"
                        >
                          <Flame size={14} className="text-red-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-red-200 text-[11px]">Критично Callout</div>
                            <div className="text-[9px] text-slate-400">Красная плашка</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<details class="ns-toggle"><summary>Нажмите, чтобы развернуть спойлер...</summary><div class="ns-toggle-body"><p>Скрытый текст или детали...</p></div></details><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/50 text-left transition"
                        >
                          <CornerDownRight size={14} className="text-purple-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-purple-200 text-[11px]">Спойлер (Toggle)</div>
                            <div className="text-[9px] text-slate-400">Сворачиваемый блок</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              '<div class="ns-code-block"><div class="ns-code-header"><span>Code Block</span></div><pre class="ns-code-content"><code>// Напишите ваш код здесь...</code></pre></div><p></p>'
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-left transition"
                        >
                          <Code size={14} className="text-cyan-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-cyan-200 text-[11px]">Блок кода</div>
                            <div className="text-[9px] text-slate-400">С подсветкой</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowSlashMenu(false);
                            setShowWikilinkPicker(true);
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 text-left transition"
                        >
                          <Link2 size={14} className="text-cyan-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-cyan-200 text-[11px]">[[Wikilink]]</div>
                            <div className="text-[9px] text-slate-400">Связать заметку</div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            insertCustomHtmlBlock(
                              `<b>📅 ${new Date().toLocaleDateString('ru-RU')}</b>&nbsp;`
                            )
                          }
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-left transition"
                        >
                          <CalendarIcon size={14} className="text-pink-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-pink-200 text-[11px]">Дата сегодня</div>
                            <div className="text-[9px] text-slate-400">Быстрая вставка</div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 🔗 WIKILINK AUTOCOMPLETE PICKER */}
                  <AnimatePresence>
                    {showWikilinkPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mx-5 mb-2 p-3 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl z-30 text-xs text-slate-200"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-2">
                          <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                            <Link2 size={13} /> Выберите заметку для двусторонней связи [[...]]
                          </span>
                          <button onClick={() => setShowWikilinkPicker(false)}>✕</button>
                        </div>
                        <input
                          type="text"
                          placeholder="Поиск заметки..."
                          value={wikilinkSearch}
                          onChange={(e) => setWikilinkSearch(e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white mb-2 outline-none"
                          autoFocus
                        />
                        <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                          {notes
                            .filter(
                              (n) =>
                                n.id !== currentNote.id &&
                                (!wikilinkSearch || n.title.toLowerCase().includes(wikilinkSearch.toLowerCase()))
                            )
                            .map((n) => (
                              <button
                                key={n.id}
                                onClick={() => handleInsertWikilink(n)}
                                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-violet-900/40 text-left text-slate-200 transition"
                              >
                                <span className="font-medium truncate">{n.title}</span>
                                <span className="text-[10px] text-slate-400">[[вставить]]</span>
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Attachments Menu Drawer */}
                  {showAttachmentMenu && (
                    <div className="mx-5 mb-2 bg-slate-900 border border-white/10 rounded-xl p-3 space-y-2 z-30 text-[11px] animate-fade-in">
                      <div className="flex justify-between items-center pb-1 border-b border-white/10 font-semibold text-slate-400">
                        <span>Вложения к заметке</span>
                        <button onClick={() => setShowAttachmentMenu(false)}>✕</button>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="URL-адрес"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="w-full p-1.5 bg-slate-950 border border-white/10 rounded-lg text-white"
                        />
                        <input
                          type="text"
                          placeholder="Название ссылки"
                          value={newLinkName}
                          onChange={(e) => setNewLinkName(e.target.value)}
                          className="w-full p-1.5 bg-slate-950 border border-white/10 rounded-lg text-white"
                        />
                        <button
                          onClick={handleAddLinkAttachment}
                          className="w-full py-1 bg-violet-600 text-white font-bold rounded-lg text-xs"
                        >
                          Добавить ссылку
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <label className="flex-1 py-1.5 text-center bg-slate-800 hover:bg-slate-750 text-white rounded-lg cursor-pointer">
                          🖼 Картинка
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileAttach(e, 'image')}
                            className="hidden"
                          />
                        </label>
                        <label className="flex-1 py-1.5 text-center bg-slate-800 hover:bg-slate-750 text-white rounded-lg cursor-pointer">
                          📄 PDF
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleFileAttach(e, 'pdf')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Rich Contents Editable Area */}
                  <div id="editor-body-scroller" className="flex-1 overflow-y-auto px-5 py-2 min-h-[220px]">
                    <div
                      id="rich-editable-area"
                      ref={editorRef}
                      contentEditable={notesSubTab === 'active'}
                      onInput={handleEditableInput}
                      onClick={handleEditorClick}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (isVimMode) {
                          if (vimStatus === 'NORMAL') {
                            if (e.key === 'i' || e.key === 'a') {
                              e.preventDefault();
                              setVimStatus('INSERT');
                              triggerHaptic('light');
                              return;
                            }
                            if (e.key === 'x') {
                              e.preventDefault();
                              document.execCommand('delete');
                              return;
                            }
                            if (e.key === 'w' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              syncAutosave({ content: editorContent });
                              triggerHaptic('success');
                              return;
                            }
                            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'h', 'j', 'k', 'l'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                            }
                          } else if (vimStatus === 'INSERT') {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setVimStatus('NORMAL');
                              triggerHaptic('light');
                            }
                          }
                        }
                      }}
                      className={`w-full h-full min-h-[200px] rich-text-content focus:outline-none prose dark:prose-invert transition-colors ${activeThemeConfig.contentClass}`}
                      style={{
                        fontSize: noteFontSize,
                        fontFamily:
                          noteFontFamily === 'mono'
                            ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                            : noteFontFamily === 'serif'
                            ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
                            : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    />
                  </div>

                  {/* 🔗 OBSIDIAN BACKLINKS & UNLINKED MENTIONS INSPECTOR */}
                  {(backlinks.length > 0 || unlinkedMentions.length > 0) && (
                    <div className="mx-5 my-2 p-3 bg-violet-950/20 border border-violet-500/25 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-violet-300">
                        <span className="flex items-center gap-1.5">
                          <Link2 size={14} /> Обратные связи (Backlinks)
                        </span>
                        <span className="text-[10px] text-violet-400">
                          {backlinks.length} входящих ссылок
                        </span>
                      </div>

                      {backlinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {backlinks.map((bn) => (
                            <button
                              key={bn.id}
                              onClick={() => {
                                setActiveNoteId(bn.id);
                                triggerHaptic('selection');
                              }}
                              className="px-2.5 py-1 bg-violet-900/40 hover:bg-violet-800/60 border border-violet-500/30 rounded-lg text-[11px] text-violet-200 flex items-center gap-1.5 transition"
                            >
                              <span>📄 {bn.title}</span>
                              <ArrowRight size={10} className="text-violet-400" />
                            </button>
                          ))}
                        </div>
                      )}

                      {unlinkedMentions.length > 0 && (
                        <div className="pt-1.5 border-t border-violet-500/20">
                          <span className="text-[10px] text-slate-400 block mb-1">Несвязанные упоминания:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {unlinkedMentions.map((um) => (
                              <button
                                key={um.id}
                                onClick={() => {
                                  // Add explicit link
                                  const updated = {
                                    ...um,
                                    links: Array.from(new Set([...(um.links || []), currentNote.title])),
                                  };
                                  onUpdateNote(updated);
                                  triggerHaptic('success');
                                }}
                                className="px-2 py-0.5 bg-slate-800/60 hover:bg-slate-700 border border-white/10 rounded-md text-[10px] text-slate-300 flex items-center gap-1"
                              >
                                <span>{um.title}</span>
                                <span className="text-cyan-400 font-bold">+ связать</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🌌 LOCAL MINI-GRAPH OF CURRENT NOTE */}
                  {currentNote && (
                    <div className="mx-5 my-2 p-3 bg-slate-900/60 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                        <span className="flex items-center gap-1.5 text-cyan-300">
                          <Share2 size={13} /> Локальное созвездие заметки
                        </span>
                        <button
                          onClick={() => setNotesViewMode('graph')}
                          className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        >
                          Открыть полный граф <ArrowRight size={10} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 py-1">
                        {/* Center Node (Current Note) */}
                        <div className="px-3 py-1.5 rounded-xl bg-violet-600/30 border border-violet-500 text-xs text-white font-bold flex items-center gap-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                          <span>{currentNote.title}</span>
                        </div>

                        {/* Connected Outgoing and Backlinks Nodes */}
                        {allConnectedNotes.length > 0 ? (
                          allConnectedNotes.map((cn) => (
                            <button
                              key={cn.id}
                              onClick={() => {
                                setActiveNoteId(cn.id);
                                triggerHaptic('selection');
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/15 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm group"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cn.color || '#38bdf8' }} />
                              <span className="truncate max-w-[140px]">{cn.title}</span>
                              <ArrowRight size={10} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            </button>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Нет прямых связей. Наберите [[ для ссылки на другую заметку.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags Panel */}
                  {notesSubTab === 'active' && (
                    <div
                      id="editor-tags-footer"
                      className="px-5 py-2 flex items-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/10 gap-2 text-xs"
                    >
                      <span className="text-slate-400 font-bold uppercase text-[10px]">ТЕГИ:</span>
                      <input
                        id="active-note-tags"
                        type="text"
                        value={editorTags}
                        onChange={(e) => {
                          setEditorTags(e.target.value);
                          syncAutosave({
                            tags: e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          });
                        }}
                        placeholder="обучение, планы, идеи..."
                        className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 font-sans"
                      />
                    </div>
                  )}

                  {/* Audio Playback controls */}
                  {audioBlobUrl && (
                    <div
                      id="voice-attachments-panel"
                      className="mx-5 my-2 p-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/40 rounded-xl space-y-1"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-indigo-400">
                        <span>ГОЛОСОВОЙ ДИКТАФОН</span>
                        <button onClick={() => setAudioBlobUrl(null)} className="text-red-400">
                          Удалить
                        </button>
                      </div>
                      <audio id="v-player" src={audioBlobUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  {/* GEMINI AI ASSISTANT WIDGET */}
                  {notesSubTab === 'active' && (
                    <div
                      id="gemini-ai-assistant-widget"
                      className="bg-amber-500/5 dark:bg-amber-500/10 border-t border-slate-155 dark:border-slate-800 p-3.5 space-y-2.5 font-sans"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">ИИ-Помощник Gemini</span>
                        </div>
                        {isGeneratingAi && (
                          <span className="text-[10px] font-semibold text-amber-500 animate-pulse">Генерирую...</span>
                        )}
                      </div>

                      <div className="flex gap-1.5 text-[10px] flex-wrap">
                        <button
                          id="ai-summary-btn"
                          onClick={handleAskAiForSummary}
                          disabled={isGeneratingAi}
                          className="py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-amber-50/50"
                        >
                          Краткое изложение
                        </button>
                        <button
                          id="ai-proof-btn"
                          onClick={handleAskAiForProofread}
                          disabled={isGeneratingAi}
                          className="py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-amber-50/50"
                        >
                          Исправить ошибки
                        </button>
                        <button
                          id="ai-tasks-btn"
                          onClick={handleAskAiForChecklist}
                          disabled={isGeneratingAi}
                          className="py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-amber-50/50"
                        >
                          Создать To-Do список
                        </button>
                      </div>

                      {aiError && <p className="text-[10px] text-red-500 font-semibold">{aiError}</p>}

                      {(aiSummaryResult || aiProofreadExplanation) && (
                        <div
                          id="ai-output-box"
                          className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300 max-h-[120px] overflow-y-auto leading-relaxed"
                        >
                          {aiSummaryResult && (
                            <div>
                              <span className="font-bold text-amber-600 block mb-0.5">Краткая выжимка (Gemini):</span>
                              <p className="whitespace-pre-line">{aiSummaryResult}</p>
                            </div>
                          )}
                          {aiProofreadExplanation && (
                            <div>
                              <span className="font-bold text-emerald-500 block mb-0.5">Редакторская правка:</span>
                              <p className="italic">« {aiProofreadExplanation} »</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Diff Review Modal («Было / Стало») */}
      <AiDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        originalText={diffOriginal}
        suggestedText={diffSuggested}
        onAccept={handleAcceptAiDiff}
        accentColor={accentColor}
        language={language}
      />
    </div>
  );

  // Render subcard for the notes list
  function renderNoteCard(note: Note, index: number = 0) {
    const isSelected = note.id === activeNoteId;
    const cat = categories.find((c) => c.id === note.categoryId);
    const plaintext = (note.content || '').replace(/<[^>]*>/g, '');
    const cardTheme = getNoteThemeConfig(note.theme);
    const themeBadge = note.theme && note.theme !== 'default' ? NOTE_THEMES.find((t) => t.id === note.theme) : null;

    let priorityBorderClass = '';
    if (note.importance === 'critical') priorityBorderClass = 'priority-crit';
    else if (note.importance === 'high') priorityBorderClass = 'priority-high';
    else if (note.importance === 'medium') priorityBorderClass = 'priority-med';
    else priorityBorderClass = 'priority-low';

    return (
      <motion.div
        id={`note-card-selector-${note.id}`}
        key={`note-${note.id || index}-${index}`}
        layout
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, delay: Math.min(index % 10, 6) * 0.03 }}
        whileHover={{ y: -3, scale: 1.01 }}
        onClick={() => {
          setActiveNoteId(note.id);
          setNotesViewMode('editor');
        }}
        className={`p-3 rounded-2xl border text-left cursor-pointer flex flex-col justify-between transition-all ${priorityBorderClass} ${
          isSelected
            ? 'bg-indigo-50/80 dark:bg-[#131929] border-indigo-500/70 shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/50'
            : cardTheme.cardClass
        }`}
        style={isSelected ? { borderColor: accentColor || '#6366f1' } : {}}
      >
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-1">
            <h4 className="font-bold text-xs leading-tight truncate flex-1">
              {note.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {themeBadge && (
                <span title={`Тема: ${themeBadge.label}`} className="text-[10px] bg-white/10 px-1 py-0.5 rounded">
                  {themeBadge.icon}
                </span>
              )}
              {note.dailyDate && <span title="Дневник дня">📅</span>}
              {note.isPinned && <Pin className="w-2.5 h-2.5 text-slate-400 rotate-45 flex-shrink-0" />}
              {note.isFavorite && <Bookmark className="w-2.5 h-2.5 text-amber-500 fill-current flex-shrink-0" />}
              {note.isProtected && <Lock className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
            </div>
          </div>

          <p className="text-[11px] opacity-70 line-clamp-2 leading-tight">
            {plaintext || 'Пустое содержимое...'}
          </p>
        </div>

        <div className="flex justify-between items-center text-[9px] pt-1.5 mt-1.5 border-t border-white/10 opacity-70 leading-none">
          <span>{new Date(note.updatedAt || Date.now()).toLocaleDateString()}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider">{cat?.name || 'Личное'}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: note.color || '#3b82f6' }} />
          </div>
        </div>
      </motion.div>
    );
  }
}
