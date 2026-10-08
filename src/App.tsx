/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from './utils/haptics';
import {
  Notebook,
  CheckSquare,
  DollarSign,
  Clock,
  BarChart3,
  Settings,
  Lock,
  Unlock,
  Sparkles,
  Info,
  Layers,
  LayoutDashboard,
  Music,
  Film,
  Image as ImageIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Search,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Upload,
  Filter,
  Flame,
  Globe,
  Hash,
  Cloud,
  Bell,
  Sun,
  Moon,
  Folder,
  Calendar,
  Plus,
  Check,
  Shuffle,
  Repeat,
  Repeat1,
  Mic,
  X,
} from 'lucide-react';

import { Note, Category, Task, Reminder, Alarm, FinancialTransaction, FinancialBudget, FinancialGoal, Goal, Habit, PomodoroConfig, Project } from './types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PROJECTS,
  INITIAL_NOTES,
  INITIAL_TASKS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGET,
  INITIAL_FIN_GOALS,
  INITIAL_GOALS,
  INITIAL_REMINDERS,
  INITIAL_ALARMS,
  INITIAL_HABITS,
  INITIAL_MEDIA_ITEMS
} from './utils/initialData';

// Custom sub-components
import NotesTab from './components/NotesTab';
import TasksTab from './components/TasksTab';
import ProjectsTab from './components/Projects/ProjectsTab';
import FinanceTab from './components/FinanceTab';
import WidgetsTab from './components/WidgetsTab';
import AgendaSidebar from './components/AgendaSidebar';
const MediaTab = React.lazy(() => import('./components/MediaTab'));
const SphereCreativeSpace = React.lazy(() => import('./components/SphereCreativeSpace'));
import PomodoroHeaderWidget from './components/PomodoroHeaderWidget';
import SettingsOverlay from './components/SettingsOverlay';
import AuthPINOverlay from './components/AuthPINOverlay';
import WebClipperModal from './components/WebClipperModal';
import GlobalTagsModal from './components/GlobalTagsModal';
import TelegramBackupModal from './components/TelegramBackupModal';
import CommandCenter from './components/CommandCenter';
import ErrorBoundary from './components/ErrorBoundary';
import { exportDigitalGardenHTML } from './utils/digitalGardenExport';
import { t, Language } from './config/translations';
import { DayScheduleItem, ProjectEcosystemPayload, PlanMyDayPayload, CopilotAction } from './types';
import { extractAllInlineTasks, updateNoteChecklistContent } from './utils/noteTasks';
import { exportFullBackupJSON, readBackupFile } from './utils/backupSync';
import { loadTracksFromDB } from './utils/mediaDB';
import { idbGetAll, lsGet, lsGetJSON, savePersistent, nsFileLoadAll, nsFileSaveAll, hasDesktopBridge } from './utils/storage';

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  // Navigation: 'widgets' (Главная) is #1 default active tab
  const [activeTab, setActiveTab] = useState<'widgets' | 'projects' | 'notes' | 'tasks' | 'dashboard' | 'finance' | 'media'>('widgets');

  // Global Project Focus (Zen-mode) state
  const [globalFocusProject, setGlobalFocusProject] = useState<string>('all');

  // Sidebar Collapsed / Fullscreen State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ns_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ns_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeEl = document.activeElement;
        if (activeEl) {
          const tag = activeEl.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl.hasAttribute('contenteditable')) {
            return;
          }
        }
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
        triggerHaptic('light');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifications panel state & click-outside listener
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false);
  const [isAddingReminder, setIsAddingReminder] = useState<boolean>(false);
  const [reminderQuickTitle, setReminderQuickTitle] = useState<string>('');
  const [reminderQuickTime, setReminderQuickTime] = useState<string>('');
  useEffect(() => {
    if (!showNotificationsPanel) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById('notifications-panel-wrapper');
      if (panel && !panel.contains(e.target as Node)) {
        setShowNotificationsPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotificationsPanel]);

  // App core persistent states, fallback to initial mock datasets
  const [categories, setCategories] = useState<Category[]>(() => {
    return lsGetJSON<Category[] | null>('ns_categories') ?? INITIAL_CATEGORIES;
  });

  const normalizeNote = (n: any): Note => {
    if (!n) return n;
    return {
      ...n,
      title: n.title || '',
      content: n.content || '',
      tags: Array.isArray(n.tags) ? n.tags : [],
      attachments: Array.isArray(n.attachments) ? n.attachments : [],
      links: Array.isArray(n.links) ? n.links : [],
    };
  };

  const [notes, setNotes] = useState<Note[]>(() => {
    const raw = lsGetJSON<Note[] | null>('ns_notes') ?? INITIAL_NOTES;
    return (raw || []).map(normalizeNote);
  });

  const [deletedNotes, setDeletedNotes] = useState<Note[]>(() => {
    const raw = lsGetJSON<Note[] | null>('ns_deleted_notes') ?? [];
    return (raw || []).map(normalizeNote);
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    return lsGetJSON<Task[] | null>('ns_tasks') ?? INITIAL_TASKS;
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    return lsGetJSON<FinancialTransaction[] | null>('ns_transactions') ?? INITIAL_TRANSACTIONS;
  });

  const [financeBudget, setFinanceBudget] = useState<FinancialBudget>(() => {
    return lsGetJSON<FinancialBudget | null>('ns_budget') ?? INITIAL_BUDGET;
  });

  const [financeGoals, setFinanceGoals] = useState<FinancialGoal[]>(() => {
    return lsGetJSON<FinancialGoal[] | null>('ns_fin_goals') ?? INITIAL_FIN_GOALS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    return lsGetJSON<Goal[] | null>('ns_goals') ?? INITIAL_GOALS;
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    return lsGetJSON<Reminder[] | null>('ns_reminders') ?? INITIAL_REMINDERS;
  });

  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    return lsGetJSON<Alarm[] | null>('ns_alarms') ?? INITIAL_ALARMS;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    return lsGetJSON<Habit[] | null>('ns_habits') ?? INITIAL_HABITS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    return lsGetJSON<Project[] | null>('ns_projects') ?? INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // 1-Click Backup Export & Import references
  const backupFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExportBackup = () => {
    let canvasCards = [];
    let canvasLinks = [];
    try {
      canvasCards = JSON.parse(localStorage.getItem('ns_creative_cards') || '[]');
      canvasLinks = JSON.parse(localStorage.getItem('ns_creative_links') || '[]');
    } catch {}

    exportFullBackupJSON({
      notes,
      categories,
      deletedNotes,
      tasks,
      projects,
      habits,
      transactions,
      budget: financeBudget,
      financeBudget,
      financeGoals,
      goals,
      currency,
      reminders,
      alarms,
      canvasCards,
      canvasLinks,
    });
    showHud('Резервная копия .json успешно сохранена!');
    triggerHaptic('success');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snapshot = await readBackupFile(file);
      if (snapshot.notes) setNotes(snapshot.notes);
      if (snapshot.categories) setCategories(snapshot.categories);
      if (snapshot.deletedNotes) setDeletedNotes(snapshot.deletedNotes);
      if (snapshot.tasks) setTasks(snapshot.tasks);
      if (snapshot.projects) setProjects(snapshot.projects);
      if (snapshot.habits) setHabits(snapshot.habits);
      if (snapshot.transactions) setTransactions(snapshot.transactions);
      if (snapshot.financeBudget) setFinanceBudget(snapshot.financeBudget);
      else if (snapshot.budget) setFinanceBudget(snapshot.budget);
      if (snapshot.financeGoals) setFinanceGoals(snapshot.financeGoals);
      if (snapshot.goals) setGoals(snapshot.goals);
      if (snapshot.currency) setCurrency(snapshot.currency as any);
      if (snapshot.reminders) setReminders(snapshot.reminders);
      if (snapshot.alarms) setAlarms(snapshot.alarms);
      if (snapshot.canvasCards) localStorage.setItem('ns_creative_cards', JSON.stringify(snapshot.canvasCards));
      if (snapshot.canvasLinks) localStorage.setItem('ns_creative_links', JSON.stringify(snapshot.canvasLinks));
      showHud('Данные успешно восстановлены из файла бэкапа!');
      triggerHaptic('success');
    } catch (err: any) {
      showHud(`Ошибка импорта: ${err.message}`);
    }
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };

  // 🔗 Extract inline tasks from notes and merge with user tasks
  const inlineTasks = React.useMemo(() => extractAllInlineTasks(notes), [notes]);
  const combinedTasks = React.useMemo(() => {
    const existingIds = new Set(tasks.map((t) => t.id));
    const uniqueInline = inlineTasks.filter((t) => !existingIds.has(t.id));
    return [...tasks, ...uniqueInline];
  }, [tasks, inlineTasks]);

  const handleUpdateTaskWithNoteSync = (updatedTask: Task) => {
    setTasks((prev) => prev.map((old) => (old.id === updatedTask.id ? updatedTask : old)));
    if (updatedTask.fromNoteId) {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== updatedTask.fromNoteId) return n;
          return updateNoteChecklistContent(n, updatedTask.title, updatedTask.isCompleted);
        })
      );
    }
  };

  // 🎯 Global Project Focus Filtering
  const filteredNotes = React.useMemo(() => {
    if (globalFocusProject === 'all') return notes;
    const targetCat = categories.find((c) => c.name === globalFocusProject)?.id || globalFocusProject;
    return notes.filter((n) => n.categoryId === targetCat || n.categoryId === globalFocusProject);
  }, [notes, globalFocusProject, categories]);

  const filteredTasks = React.useMemo(() => {
    if (globalFocusProject === 'all') return combinedTasks;
    return combinedTasks.filter((t) => t.category === globalFocusProject);
  }, [combinedTasks, globalFocusProject]);

  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isWebClipperOpen, setIsWebClipperOpen] = useState(false);
  const [isGlobalTagsOpen, setIsGlobalTagsOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  // Признак завершения восстановления данных из IndexedDB (защита от перезаписи
  // сохранённых значений дефолтными на старте, пока асинхронное чтение идёт).
  const [hydrated, setHydrated] = useState(false);

  // Global persistent SpherePlayer media engine states
  const [mediaTracks, setMediaTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mediaCurrentTime, setMediaCurrentTime] = useState<number>(0);
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const [mediaVolume, setMediaVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const isRepeat = repeatMode !== 'off';
  const setIsRepeat = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      setRepeatMode(prev => val(prev !== 'off') ? 'all' : 'off');
    } else {
      setRepeatMode(val ? 'all' : 'off');
    }
  };
  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'off') {
        showHud('Повтор всех треков включен');
        return 'all';
      }
      if (prev === 'all') {
        showHud('Зацикливание одного трека (повтор 1)');
        return 'one';
      }
      showHud('Повтор выключен');
      return 'off';
    });
    triggerHaptic('light');
  };
  const [mediaQueue, setMediaQueue] = useState<string[]>([]);
  const [hudMessage, setHudMessage] = useState<string | null>(null);

  const showHud = (msg: string) => {
    setHudMessage(msg);
    setTimeout(() => {
      setHudMessage(prev => prev === msg ? null : prev);
    }, 2500);
  };

  // Core navigation pillars: Главная (Виджеты) • Заметки • Задачи • Холст • Финансы • Медиатека
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('ns_language') as Language) || 'ru';
  });

  const [currency, setCurrency] = useState<'sum' | 'dollar' | 'krw' | 'rub'>(() => {
    return (localStorage.getItem('ns_currency') as 'sum' | 'dollar' | 'krw' | 'rub') || 'rub';
  });

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('ns_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });

  const ALL_NAV_ITEMS = React.useMemo(() => [
    { id: 'widgets' as const, label: t(language, 'nav_widgets'), icon: LayoutDashboard },
    { id: 'projects' as const, label: t(language, 'nav_projects'), icon: Folder },
    { id: 'tasks' as const, label: t(language, 'nav_tasks'), icon: CheckSquare },
    { id: 'notes' as const, label: t(language, 'nav_notes'), icon: Notebook },
    { id: 'dashboard' as const, label: t(language, 'nav_dashboard'), icon: Sparkles },
    { id: 'finance' as const, label: t(language, 'nav_finance'), icon: DollarSign },
    { id: 'media' as const, label: t(language, 'nav_media'), icon: Music },
  ], [language]);

  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('ns_nav_order');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return ['widgets', 'projects', 'tasks', 'notes', 'dashboard', 'finance', 'media'];
  });

  const navItems = React.useMemo(() => {
    const ordered = navOrder
      .map((id) => ALL_NAV_ITEMS.find((item) => item.id === id))
      .filter(Boolean) as typeof ALL_NAV_ITEMS;
    ALL_NAV_ITEMS.forEach((item) => {
      if (!ordered.some((o) => o.id === item.id)) ordered.push(item);
    });
    return ordered;
  }, [navOrder, ALL_NAV_ITEMS]);

  const setNavItems = (items: typeof ALL_NAV_ITEMS) => {
    setNavOrder(items.map((i) => i.id));
    localStorage.setItem('ns_nav_order', JSON.stringify(items.map((i) => i.id)));
  };

  // Persistent Media Player view configurations
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [videoPlaySpeed, setVideoPlaySpeed] = useState<number>(1);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);

  const globalAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const loadedTrackIdRef = React.useRef<string | null>(null);

  // Settings customizable elements
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('ns_theme_mode') as 'light' | 'dark' | 'auto') || 'dark'; // Dark theme default looks futuristic
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('ns_accent_color') || '#8b5cf6'; // Indigo/Purple premium
  });

  const [pinCode, setPinCode] = useState(() => {
    return localStorage.getItem('ns_pin_code') || '';
  });

  const [neonGlow, setNeonGlow] = useState<boolean>(() => {
    return localStorage.getItem('ns_neon_glow') === 'true';
  });

  const [bgBlur, setBgBlur] = useState<'none' | 'normal' | 'high'>(() => {
    return (localStorage.getItem('ns_bg_blur') as 'none' | 'normal' | 'high') || 'none';
  });

  const [customWallpaper, setCustomWallpaper] = useState<string>(() => {
    return localStorage.getItem('ns_custom_wallpaper') || '';
  });

  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('ns_bg_opacity');
    return saved ? Number(saved) : 100;
  });

  const [isTransparent, setIsTransparent] = useState<boolean>(() => {
    return false;
  });

  useEffect(() => {
    localStorage.setItem('ns_custom_wallpaper', customWallpaper);
  }, [customWallpaper]);

  useEffect(() => {
    localStorage.setItem('ns_bg_opacity', String(bgOpacity));
  }, [bgOpacity]);

  useEffect(() => {
    localStorage.setItem('ns_is_transparent', String(isTransparent));
  }, [isTransparent]);

  // Security Unlock state (temporary, not persisted in localStorage obviously!)
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const secureSetup = localStorage.getItem('ns_pin_code');
    return !secureSetup; // if no pin, default to unlocked
  });

  // Overlay visibility indicators
  const [showSettings, setShowSettings] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const initialNotes = localStorage.getItem('ns_notes');
    const parsed: Note[] = initialNotes ? JSON.parse(initialNotes) : INITIAL_NOTES;
    return parsed.length > 0 ? parsed[0].id : null;
  });

  // PWA Support States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(() => {
    return localStorage.getItem('ns_hide_pwa_banner') !== 'true';
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      showHud("Успешно установлено! Запустите NoteSphere с рабочего стола!");
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (!deferredPrompt) {
      alert("Инструкция по ручной установке:\n\n📱 На iOS (Safari/iPhone):\n1. Нажмите кнопку 'Поделиться' в Safari.\n2. Выберите пункт 'На экран «Домой»'.\n\n🤖 На Android/ПК:\nНажмите три точки или кнопку со значком монитора со стрелкой в правом верхнем углу вашего браузера (Chrome/Yandex/Edge) и выберите 'Установить'!");
      return;
    }
    triggerHaptic('success');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install request outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Sync state back down to storage every time values change (guarded by hydration)
  useEffect(() => { if (hydrated) savePersistent('ns_categories', categories); }, [categories, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_notes', notes); }, [notes, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_deleted_notes', deletedNotes); }, [deletedNotes, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_tasks', tasks); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_transactions', transactions); }, [transactions, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_budget', financeBudget); }, [financeBudget, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_fin_goals', financeGoals); }, [financeGoals, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_goals', goals); }, [goals, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_reminders', reminders); }, [reminders, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_alarms', alarms); }, [alarms, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_habits', habits); }, [habits, hydrated]);
  useEffect(() => { if (hydrated) savePersistent('ns_projects', projects); }, [projects, hydrated]);

  // Rehydrate durable data from IndexedDB (source of truth) once on mount.
  // IndexedDB переживает перезапуски там, где localStorage у обёрток теряется.
  // В десктоп-режиме (Electron) источником истины становится JSON-файл на диске.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await idbGetAll();
      const desktop = await nsFileLoadAll();

      // В десктопе приоритет отдаём файлу, в браузере — IndexedDB.
      const source = desktop && Object.keys(desktop).length > 0 ? desktop : stored;
      const applyJSON = (key: string, apply: (v: any) => void) => {
        const raw = source[key];
        if (raw == null) return;
        try { apply(JSON.parse(raw)); } catch { /* ignore corrupt value */ }
      };
      applyJSON('ns_categories', setCategories);
      applyJSON('ns_notes', (loaded) => {
        if (Array.isArray(loaded)) setNotes(loaded.map(normalizeNote));
      });
      applyJSON('ns_deleted_notes', (loaded) => {
        if (Array.isArray(loaded)) setDeletedNotes(loaded.map(normalizeNote));
      });
      applyJSON('ns_tasks', setTasks);
      applyJSON('ns_projects', setProjects);
      applyJSON('ns_transactions', setTransactions);
      applyJSON('ns_budget', setFinanceBudget);
      applyJSON('ns_fin_goals', setFinanceGoals);
      applyJSON('ns_goals', setGoals);
      applyJSON('ns_reminders', setReminders);
      applyJSON('ns_alarms', setAlarms);
      applyJSON('ns_habits', setHabits);
      if (source['ns_local_playlists']) {
        try {
          localStorage.setItem('ns_local_playlists_v3', source['ns_local_playlists']);
        } catch {}
      }
      if (source['ns_media_tracks']) {
        try {
          localStorage.setItem('ns_media_tracks_meta', source['ns_media_tracks']);
        } catch {}
      }


      const applyString = (key: string, apply: (v: string) => void) => {
        if (source[key] != null) apply(source[key]);
      };
      applyString('ns_theme_mode', (v) => setThemeMode(v as any));
      applyString('ns_accent_color', setAccentColor);
      applyString('ns_font_size', (v) => setFontSize(v as any));
      applyString('ns_pin_code', setPinCode);
      applyString('ns_language', (v) => setLanguage(v as any));
      applyString('ns_currency', (v) => setCurrency(v as any));
      applyString('ns_neon_glow', (v) => setNeonGlow(v === 'true'));
      applyString('ns_bg_blur', (v) => setBgBlur(v as any));

      if (cancelled) return;
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // В десктопном приложении дублируем всё состояние в JSON-файл на диске
  // (полная синхронизация после каждого изменения состояния).
  const serializeState = () => {
    let localPlaylists = '[]';
    try {
      localPlaylists = localStorage.getItem('ns_local_playlists_v3') || '[]';
    } catch {}
    const mediaMeta = mediaTracks.map(({ file, ...meta }) => meta);

    return {
      ns_categories: JSON.stringify(categories),
      ns_notes: JSON.stringify(notes),
      ns_deleted_notes: JSON.stringify(deletedNotes),
      ns_tasks: JSON.stringify(tasks),
      ns_projects: JSON.stringify(projects),
      ns_transactions: JSON.stringify(transactions),
      ns_budget: JSON.stringify(financeBudget),
      ns_fin_goals: JSON.stringify(financeGoals),
      ns_goals: JSON.stringify(goals),
      ns_reminders: JSON.stringify(reminders),
      ns_alarms: JSON.stringify(alarms),
      ns_habits: JSON.stringify(habits),
      ns_media_tracks: JSON.stringify(mediaMeta),
      ns_local_playlists: localPlaylists,
    };
  };

  useEffect(() => {
    if (!hydrated) return;
    nsFileSaveAll(serializeState());
  }, [hydrated, categories, notes, deletedNotes, tasks, projects, transactions, financeBudget, financeGoals, goals, reminders, alarms, habits, mediaTracks]);

  const handleAddHabit = (h: Habit) => {
    setHabits(prev => [h, ...prev]);
  };

  const handleToggleHabit = (id: string, dateStr: string) => {
    let toggledOn = false;
    setHabits(prev =>
      prev.map(h => {
        if (h.id !== id) return h;
        const exists = h.completedDates.includes(dateStr);
        toggledOn = !exists;
        const newDates = exists
          ? h.completedDates.filter(d => d !== dateStr)
          : [...h.completedDates, dateStr];

        let streak = 0;
        let checkDate = new Date();
        while (true) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (newDates.includes(dStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        return { ...h, completedDates: newDates, streak };
      })
    );
    // Habits linked to goals feed the goal progress
    if (toggledOn) {
      setGoals(prev =>
        prev.map(g =>
          g.habitIds?.includes(id)
            ? { ...g, progress: Math.min(100, Math.round((g.progress || 0) + 5)) }
            : g
        )
      );
    }
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  // Adjust document theme classes based on choices
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'text-sm', 'text-base', 'text-lg');

    // Theme matching (Light / Dark / Auto)
    const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Font matching size - scales all Tailwind rem units dynamically across the entire app
    const sizeMap: Record<string, string> = {
      sm: '14px', small: '14px',
      base: '16px', normal: '16px',
      lg: '18px', large: '18px',
    };
    root.style.fontSize = sizeMap[fontSize] || '16px';
    if (fontSize === 'sm' || (fontSize as any) === 'small') root.classList.add('text-sm');
    else if (fontSize === 'lg' || (fontSize as any) === 'large') root.classList.add('text-lg');
    else root.classList.add('text-base');

    // Convert hex accentColor to RGB for neon glow
    try {
      const hex = accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        root.style.setProperty('--accent-color', accentColor);
        root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
        root.style.setProperty('--accent-bg', `rgba(${r}, ${g}, ${b}, 0.15)`);
        root.style.setProperty('--neon-glow-rgb', `rgba(${r}, ${g}, ${b}, 0.28)`);
        root.style.setProperty('--neon-glow-color', `rgba(${r}, ${g}, ${b}, 0.8)`);
        root.style.setProperty('--neon-shadow-rgb', `${r}, ${g}, ${b}`);
      }
    } catch {
      root.style.setProperty('--accent-color', '#8b5cf6');
      root.style.setProperty('--accent-rgb', '139, 92, 246');
      root.style.setProperty('--accent-bg', 'rgba(139, 92, 246, 0.15)');
      root.style.setProperty('--neon-glow-rgb', 'rgba(139, 92, 246, 0.28)');
      root.style.setProperty('--neon-glow-color', 'rgba(139, 92, 246, 0.8)');
    }

    if (neonGlow) {
      root.classList.add('cyber-neon-enabled');
    } else {
      root.classList.remove('cyber-neon-enabled');
    }

    if (!hydrated) return;

    savePersistent('ns_theme_mode', themeMode);
    savePersistent('ns_accent_color', accentColor);
    savePersistent('ns_font_size', fontSize);
    savePersistent('ns_pin_code', pinCode);
    savePersistent('ns_language', language);
    savePersistent('ns_currency', currency);
    savePersistent('ns_neon_glow', String(neonGlow));
    savePersistent('ns_bg_blur', bgBlur);
  }, [themeMode, accentColor, fontSize, pinCode, language, currency, neonGlow, bgBlur, hydrated]);

  // Swipe-down to dismiss keyboard helper
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const activeEl = document.activeElement;
      if (!activeEl) return;
      const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable;
      if (!isInput) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY;
      
      // If we swiped down by 45px or more, blur to hide modern virtual keyboards
      if (diffY > 45) {
        (activeEl as HTMLElement).blur();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 🔔 Background reminder & task deadline notification system
  const notifiedIdsRef = React.useRef<Set<string>>(new Set());

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  };

  useEffect(() => {
    const checkAlarmsAndReminders = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      const todayStr = now.toISOString().split('T')[0];

      // 1. Check Reminders
      reminders.forEach((r: any) => {
        if (r.completed) return;
        const matchesDate = !r.date || r.date === todayStr;
        const matchesTime = r.time === currentTimeStr;
        if (matchesDate && matchesTime) {
          const key = `rem-${r.id}-${todayStr}-${currentTimeStr}`;
          if (!notifiedIdsRef.current.has(key)) {
            notifiedIdsRef.current.add(key);
            playNotificationSound();
            showHud(`🔔 Напоминание: ${r.title || r.text || 'Дело'}`);
            triggerHaptic('success');
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification('🔔 NoteSphere: Напоминание', {
                  body: r.title || r.text || 'Время выполнить запланированное действие',
                });
              } catch {}
            }
          }
        }
      });

      // 2. Check Tasks with deadline
      tasks.forEach((t) => {
        if (t.isCompleted || !t.dueDate || !t.dueTime) return;
        if (t.dueDate === todayStr && t.dueTime === currentTimeStr) {
          const key = `task-${t.id}-${todayStr}-${currentTimeStr}`;
          if (!notifiedIdsRef.current.has(key)) {
            notifiedIdsRef.current.add(key);
            playNotificationSound();
            showHud(`⏰ Дедлайн задачи: ${t.title}`);
            triggerHaptic('success');
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification('⏰ Дедлайн задачи', {
                  body: t.title,
                });
              } catch {}
            }
          }
        }
      });
    };

    const interval = setInterval(checkAlarmsAndReminders, 15000);
    checkAlarmsAndReminders();
    return () => clearInterval(interval);
  }, [reminders, tasks]);

  // Synchronize and restore persisted music/video/photo tracks on application load
  useEffect(() => {
    loadTracksFromDB()
      .then((stored) => {
        if (stored && stored.length > 0) {
          const mapped = stored
            .filter((t) => Boolean(t.file || (t.url && t.url.trim() !== '')))
            .map((t) => {
              let blobUrl = t.url || '';
              const rawFile = t.file as any;
              if (rawFile && typeof Blob !== 'undefined' && rawFile instanceof Blob) {
                try {
                  blobUrl = URL.createObjectURL(rawFile);
                } catch (e) {
                  console.warn('Could not create object URL for track:', t.name, e);
                }
              }
              return {
                id: t.id,
                name: t.name,
                size: t.size,
                type: t.type,
                url: blobUrl,
                album: t.album || 'Без плейлиста',
                artist: t.artist || 'NoteSphere',
                coverUrl: t.coverUrl || '',
                thumbnailUrl: t.coverUrl || '',
                genre: t.genre || 'Музыка',
                duration: t.duration || '03:45',
                createdAt: t.createdAt,
                isFavorite: t.isFavorite || false,
                file: t.file,
              };
            });
          setMediaTracks(mapped);
          if (mapped.length > 0) setCurrentTrackIndex(0);
        } else {
          setMediaTracks([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching tracks from IndexedDB:', err);
        setMediaTracks([]);
      });
  }, []);

  // Universal SpherePlayer tracks navigator
  const handlesSkip = (dir: 'next' | 'prev') => {
    if (mediaTracks.length === 0) return;
    triggerHaptic('light');

    let nextIndex = currentTrackIndex;
    if (dir === 'next' && mediaQueue.length > 0) {
      const nextTrackId = mediaQueue[0];
      const foundIdx = mediaTracks.findIndex(t => t.id === nextTrackId);
      setMediaQueue(prev => prev.slice(1));
      if (foundIdx !== -1) {
        nextIndex = foundIdx;
      } else {
        if (isShuffle) {
          nextIndex = Math.floor(Math.random() * mediaTracks.length);
        } else {
          nextIndex = (currentTrackIndex + 1) % mediaTracks.length;
        }
      }
    } else {
      if (isShuffle) {
        let rand = Math.floor(Math.random() * mediaTracks.length);
        if (mediaTracks.length > 1 && rand === currentTrackIndex) {
          rand = (rand + 1) % mediaTracks.length;
        }
        nextIndex = rand;
      } else {
        if (dir === 'next') {
          if (repeatMode === 'off' && currentTrackIndex === mediaTracks.length - 1 && mediaQueue.length === 0) {
            setIsPlaying(false);
            setMediaCurrentTime(0);
            return;
          }
          nextIndex = (currentTrackIndex + 1) % mediaTracks.length;
        } else {
          nextIndex = (currentTrackIndex - 1 + mediaTracks.length) % mediaTracks.length;
        }
      }
    }
    
    if (nextIndex >= 0 && nextIndex < mediaTracks.length) {
      const track = mediaTracks[nextIndex];
      if (track.type === 'video') {
        setActiveVideoUrl(track.url);
        setIsPlaying(false);
      } else {
        setActiveVideoUrl(null);
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
        setMediaCurrentTime(0);
      }
    }
  };

  const handlePlayTrack = (index: number) => {
    if (index < 0 || index >= mediaTracks.length) return;
    triggerHaptic('medium');
    
    const track = mediaTracks[index];

    if (track.type === 'video') {
      setActiveVideoUrl(track.url);
      setIsPlaying(false);
    } else {
      setActiveVideoUrl(null);
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      setMediaCurrentTime(0);
    }
  };

  // Keyboard Hotkeys dispatcher for SpherePlayer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName;
        if (
          tag === 'INPUT' || 
          tag === 'TEXTAREA' || 
          activeEl.hasAttribute('contenteditable') ||
          (activeEl as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      const saved = localStorage.getItem('ns_win_hotkeys');
      let config = {
        playPause: 'Space',
        stop: 'KeyS',
        next: 'KeyN',
        prev: 'KeyP',
        mute: 'KeyM'
      };
      if (saved) {
        try {
          config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}
      }

      const code = e.code;
      if (code === config.playPause) {
        e.preventDefault();
        if (mediaTracks.length > 0) {
          setIsPlaying(prev => !prev);
          triggerHaptic('medium');
        }
      } else if (code === config.stop) {
        e.preventDefault();
        setIsPlaying(false);
        setMediaCurrentTime(0);
        if (globalAudioRef.current) {
          globalAudioRef.current.currentTime = 0;
        }
        triggerHaptic('light');
      } else if (code === config.next) {
        e.preventDefault();
        handlesSkip('next');
      } else if (code === config.prev) {
        e.preventDefault();
        handlesSkip('prev');
      } else if (code === config.mute) {
        e.preventDefault();
        setIsMuted(prev => !prev);
        triggerHaptic('light');
      } else if (code === 'KeyQ') {
        e.preventDefault();
        if (currentTrackIndex >= 0 && currentTrackIndex < mediaTracks.length) {
          const track = mediaTracks[currentTrackIndex];
          setMediaQueue(prev => [...prev, track.id]);
          triggerHaptic('success');
          showHud(`Песня "${track.name}" добавлена в очередь!`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mediaTracks, currentTrackIndex, isShuffle, isRepeat, isMuted, mediaVolume, mediaQueue]);

  // Synchronize audio element settings
  useEffect(() => {
    if (globalAudioRef.current) {
      globalAudioRef.current.volume = isMuted ? 0 : mediaVolume;
    }
  }, [mediaVolume, isMuted]);

  useEffect(() => {
    const audio = globalAudioRef.current;
    if (!audio) return;

    if (currentTrackIndex >= 0 && currentTrackIndex < mediaTracks.length) {
      const track = mediaTracks[currentTrackIndex];
      if (track && track.url) {
        // Only update audio.src if the track has actually changed
        if (loadedTrackIdRef.current !== track.id) {
          loadedTrackIdRef.current = track.id;
          audio.src = track.url;
        }

        if (isPlaying) {
          audio.play().catch(() => {
            setIsPlaying(false);
          });
        } else {
          audio.pause();
        }
        return;
      }
    }

    audio.pause();
    loadedTrackIdRef.current = null;
  }, [isPlaying, currentTrackIndex, mediaTracks]);

  // Synchronize media state to the native "now playing" desktop widget (Electron)
  useEffect(() => {
    const ns = (window as any).nsNative;
    if (!ns || !ns.pushMedia) return;
    const track = currentTrackIndex >= 0 && currentTrackIndex < mediaTracks.length ? mediaTracks[currentTrackIndex] : null;
    ns.pushMedia(track ? { name: track.name || 'SpherePlayer', playing: isPlaying } : null);
  }, [currentTrackIndex, isPlaying, mediaTracks]);

  // Global Unified Command Center hotkeys (Ctrl+Space / Cmd+Space, Ctrl+K / Cmd+K, or Ctrl+J)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const isSpace = e.code === 'Space' || e.key === ' ';
      const isK = e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л';
      const isJ = e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О';

      if (isSpace || isK || isJ) {
        // Do not intercept standard hotkeys when typing in full inputs unless it's Ctrl+Space or Ctrl+K
        e.preventDefault();
        setIsCommandCenterOpen((prev) => !prev);
        triggerHaptic('medium');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 1-Click Day Scheduler (Applies AI plan to actual task timeblocks)
  const handleApplyDaySchedule = (items: DayScheduleItem[]) => {
    if (!items || items.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedTasks = [...tasks];

    items.forEach((item, idx) => {
      const parts = (item.time || '').split(' - ');
      const start = parts[0]?.trim() || '';
      const end = parts[1]?.trim() || '';

      if (item.taskId) {
        const foundIdx = updatedTasks.findIndex(t => t.id === item.taskId);
        if (foundIdx >= 0) {
          updatedTasks[foundIdx] = {
            ...updatedTasks[foundIdx],
            dueDate: todayStr,
            timeBlock: { start, end },
          };
          return;
        }
      }

      const titleMatchIdx = updatedTasks.findIndex(t => t.title.toLowerCase() === item.taskTitle.toLowerCase());
      if (titleMatchIdx >= 0) {
        updatedTasks[titleMatchIdx] = {
          ...updatedTasks[titleMatchIdx],
          dueDate: todayStr,
          timeBlock: { start, end },
        };
        return;
      }

      const newTask: Task = {
        id: `task-sched-${Date.now()}-${idx}`,
        title: item.taskTitle,
        isCompleted: false,
        priority: item.priority || 'medium',
        category: item.category || 'Работа',
        dueDate: todayStr,
        recurrence: 'none',
        progress: 0,
        timeBlock: { start, end },
        eisenhower: item.priority === 'high' || item.priority === 'critical' ? 'urgent-important' : 'not-urgent-important',
        subtasks: [],
      };
      updatedTasks.unshift(newTask);
    });

    setTasks(updatedTasks);
    setActiveTab('tasks');
    showHud(`📅 Расписание дня успешно применено к вашим задачам!`);
    triggerHaptic('success');
  };

  // AI Copilot & Command Center Action Execution Engine
  const handleCopilotAction = (action: CopilotAction): { success: boolean; message?: string; targetId?: string } => {
    try {
      if (action.type === 'create_project_ecosystem') {
        const payload: ProjectEcosystemPayload = action.payload || {};
        const projectName = payload.projectName || 'Новый Проект';
        const projectSlug = 'cat-' + projectName.toLowerCase().replace(/[^a-zа-я0-9]/gi, '-');

        // 1. Create or link Project Category
        const existingCat = categories.find(c => c.name.toLowerCase() === projectName.toLowerCase());
        const catId = existingCat ? existingCat.id : projectSlug;
        if (!existingCat) {
          const newCat: Category = {
            id: catId,
            name: projectName,
            icon: payload.categoryIcon || '🚀',
            color: payload.categoryColor || accentColor,
          };
          setCategories(prev => [...prev, newCat]);
        }

        // 2. Create Central Project Hub Note
        const hubNoteId = 'note-' + Date.now();
        const hubNoteTitle = payload.hubNote?.title || `🏛️ Хаб Проекта: ${projectName}`;
        const hubNote: Note = {
          id: hubNoteId,
          title: hubNoteTitle,
          content: payload.hubNote?.content || `<h1>🏛️ Проект: ${projectName}</h1><p>Центральный хаб проекта.</p>`,
          categoryId: catId,
          tags: Array.isArray(payload.hubNote?.tags) ? payload.hubNote.tags : ['проект', projectName.toLowerCase()],
          importance: 'high',
          color: payload.categoryColor || accentColor,
          isFavorite: true,
          isPinned: true,
          attachments: [],
          isProtected: false,
          versions: [],
          links: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'in_progress',
        };
        setNotes(prev => [hubNote, ...prev]);
        setActiveNoteId(hubNote.id);

        // 3. Create Key Actionable Tasks
        const newTasksList: Task[] = (payload.tasks || []).map((t, idx) => ({
          id: `task-${Date.now()}-${idx}`,
          title: t.title,
          isCompleted: false,
          priority: t.priority || 'medium',
          category: projectName,
          dueDate: t.dueDate || new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          recurrence: 'none',
          progress: 0,
          eisenhower: t.priority === 'high' || t.priority === 'critical' ? 'urgent-important' : 'not-urgent-important',
          fromNoteId: hubNoteId,
          fromNoteTitle: hubNoteTitle,
          subtasks: Array.isArray(t.subtasks)
            ? t.subtasks.map((st, sidx) => ({ id: `sub-${Date.now()}-${idx}-${sidx}`, title: st, isCompleted: false }))
            : [],
        }));
        if (newTasksList.length > 0) {
          setTasks(prev => [...newTasksList, ...prev]);
        }

        // 4. Budget Allocation
        if (payload.budgetAllocation) {
          const planned = Number(payload.budgetAllocation.plannedAmount) || 0;
          if (planned > 0) {
            setFinanceBudget(prev => ({
              ...prev,
              categoryLimits: {
                ...(prev.categoryLimits || {}),
                [projectName]: planned,
              },
            }));
          }
        }

        // 5. Goals
        if (payload.goals && payload.goals.length > 0) {
          const newGoal: Goal = {
            id: 'goal-' + Date.now(),
            name: payload.goals[0].name,
            targetDate: payload.goals[0].targetDate,
            type: 'medium',
            progress: 0,
            tasks: newTasksList.map(t => t.id),
            habitIds: [],
          };
          setGoals(prev => [newGoal, ...prev]);
        }

        // 6. Native Project Entity in Projects Tab
        const nativeProject: Project = {
          id: `proj-${Date.now()}`,
          name: projectName,
          description: payload.description || `Проект «${projectName}»`,
          icon: payload.categoryIcon || '🚀',
          color: payload.categoryColor || accentColor,
          status: 'in_progress',
          deadline: payload.goals?.[0]?.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          targetGoal: payload.goals?.[0]?.name || projectName,
          budgetLimit: Number(payload.budgetAllocation?.plannedAmount) || 0,
          milestones: (payload.tasks || []).map((t, sidx) => ({
            id: `ms-${Date.now()}-${sidx}`,
            title: t.title,
            targetDate: t.dueDate,
            isCompleted: false,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProjects(prev => [nativeProject, ...prev]);

        setActiveTab('projects');
        showHud(`🚀 Проект «${projectName}» успешно создан во вкладке Проекты!`);
        triggerHaptic('success');
        return { success: true, targetId: nativeProject.id };
      } else if (action.type === 'create_project') {
        const payload = action.payload || {};
        const newProj: Project = {
          id: `proj-${Date.now()}`,
          name: payload.name || 'Новый проект',
          description: payload.description || '',
          icon: payload.icon || '🚀',
          color: payload.color || accentColor,
          status: payload.status || 'in_progress',
          deadline: payload.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          targetGoal: payload.targetGoal || payload.name || 'Цель проекта',
          budgetLimit: Number(payload.budgetLimit) || 0,
          milestones: Array.isArray(payload.milestones)
            ? payload.milestones.map((m: any, idx: number) => ({
                id: `ms-${Date.now()}-${idx}`,
                title: typeof m === 'string' ? m : m.title || `Веха ${idx + 1}`,
                targetDate: m.targetDate || m.date,
                isCompleted: false,
              }))
            : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProjects((prev) => [newProj, ...prev]);
        setActiveProjectId(newProj.id);
        setActiveTab('projects');
        showHud(`🚀 Проект «${newProj.name}» создан во вкладке Проекты!`);
        triggerHaptic('success');
        return { success: true, targetId: newProj.id };
      } else if (action.type === 'update_project') {
        const payload = action.payload || {};
        const targetId = payload.projectId || payload.id;
        const targetName = (payload.projectName || payload.name || '').toLowerCase();
        let updatedCount = 0;

        setProjects((prev) =>
          prev.map((p) => {
            if ((targetId && p.id === targetId) || (targetName && p.name.toLowerCase().includes(targetName))) {
              updatedCount++;
              return {
                ...p,
                ...(payload.name ? { name: payload.name } : {}),
                ...(payload.description ? { description: payload.description } : {}),
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.deadline ? { deadline: payload.deadline } : {}),
                ...(payload.targetGoal ? { targetGoal: payload.targetGoal } : {}),
                ...(payload.budgetLimit !== undefined ? { budgetLimit: Number(payload.budgetLimit) } : {}),
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          })
        );
        setActiveTab('projects');
        showHud(updatedCount > 0 ? `Проект обновлен!` : `Проект не найден`);
        triggerHaptic('success');
        return { success: true };
      } else if (action.type === 'plan_my_day') {
        const payload: PlanMyDayPayload = action.payload || {};
        if (payload.items && payload.items.length > 0) {
          handleApplyDaySchedule(payload.items);
        }
        return { success: true };
      } else if (action.type === 'apply_day_schedule') {
        const items: DayScheduleItem[] = Array.isArray(action.payload?.items) ? action.payload.items : [];
        handleApplyDaySchedule(items);
        return { success: true };
      } else if (action.type === 'search_app') {
        setIsCommandCenterOpen(true);
        return { success: true };
      } else if (action.type === 'create_note') {
        const payload = action.payload || {};
        const newNote: Note = {
          id: 'note-' + Date.now(),
          title: payload.title || 'Новая заметка от ИИ',
          content: payload.content || '<p></p>',
          categoryId: payload.categoryId || categories[0]?.id || 'cat-personal',
          tags: Array.isArray(payload.tags) ? payload.tags : ['ии-ассистент'],
          importance: payload.importance || 'medium',
          color: accentColor,
          isFavorite: false,
          isPinned: false,
          attachments: [],
          isProtected: false,
          versions: [],
          links: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'in_progress',
        };
        setNotes((prev) => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
        setActiveTab('notes');
        showHud(`✨ Заметка «${newNote.title}» создана!`);
        return { success: true, targetId: newNote.id };
      } else if (action.type === 'create_task') {
        const payload = action.payload || {};
        const newTask: Task = {
          id: 'task-' + Date.now(),
          title: payload.title || 'Новая задача',
          isCompleted: false,
          priority: payload.priority || 'medium',
          category: payload.category || 'Работа',
          dueDate: payload.dueDate || new Date().toISOString().split('T')[0],
          recurrence: 'none',
          progress: 0,
          eisenhower: payload.priority === 'high' || payload.priority === 'critical' ? 'urgent-important' : 'not-urgent-important',
          subtasks: Array.isArray(payload.subtasks)
            ? payload.subtasks.map((s: string, idx: number) => ({
                id: `sub-${Date.now()}-${idx}`,
                title: s,
                isCompleted: false,
              }))
            : [],
        };
        setTasks((prev) => [newTask, ...prev]);
        setActiveTab('tasks');
        showHud(`✅ Задача «${newTask.title}» добавлена!`);
        return { success: true, targetId: newTask.id };
      } else if (action.type === 'add_transaction') {
        const payload = action.payload || {};
        const newTrans: FinancialTransaction = {
          id: 't-' + Date.now(),
          type: payload.type === 'income' ? 'income' : 'expense',
          amount: Number(payload.amount) || 0,
          date: new Date().toISOString().split('T')[0],
          categoryId: payload.categoryId || 'cat-personal',
          comment: payload.comment || 'Транзакция от ИИ',
        };
        setTransactions((prev) => [newTrans, ...prev]);
        setActiveTab('finance');
        showHud(`💰 Записано: ${newTrans.amount} руб.`);
        return { success: true, targetId: newTrans.id };
      } else if (action.type === 'create_habit') {
        const payload = action.payload || {};
        const newHabit: Habit = {
          id: 'habit-' + Date.now(),
          title: payload.title || 'Новая привычка',
          category: payload.category || 'Здоровье',
          icon: 'Activity',
          color: payload.color || accentColor,
          completedDates: [],
          createdAt: new Date().toISOString(),
          streak: 0,
        };
        setHabits((prev) => [newHabit, ...prev]);
        setActiveTab('widgets');
        showHud(`🌟 Привычка «${newHabit.title}» добавлена!`);
        return { success: true, targetId: newHabit.id };
      } else if (action.type === 'create_alarm') {
        const payload = action.payload || {};
        const newAlarm: Alarm = {
          id: 'alarm-' + Date.now(),
          time: payload.time || '08:00',
          label: payload.label || 'Будильник от ИИ',
          isEnabled: true,
          volume: 80,
          vibrate: true,
          repeats: [1, 2, 3, 4, 5],
          sound: 'ringtone1',
        };
        setAlarms((prev) => [newAlarm, ...prev]);
        setActiveTab('clocks');
        showHud(`⏰ Будильник на ${newAlarm.time} установлен!`);
        return { success: true, targetId: newAlarm.id };
      } else if (action.type === 'create_reminder') {
        const payload = action.payload || {};
        const now = new Date();
        const dateStr = payload.date || now.toISOString().split('T')[0];
        const timeStr = payload.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 30).padStart(2, '0')}`;
        const newReminder: Reminder = {
          id: 'rem-' + Date.now(),
          title: payload.title || payload.text || 'Напоминание от NEXAR',
          content: payload.content || '',
          date: dateStr,
          time: timeStr,
          recurrence: payload.recurrence || 'none',
          isTriggered: false,
        };
        setReminders((prev) => [newReminder, ...prev]);
        showHud(`🔔 Напоминание «${newReminder.title}» добавлено (${newReminder.time})`);
        return { success: true, targetId: newReminder.id };
      } else if (action.type === 'switch_tab') {
        const payload = action.payload || {};
        if (payload.tab) {
          setActiveTab(payload.tab);
          showHud(`🚀 Открыт раздел: ${payload.tab}`);
          return { success: true };
        }
      } else if (action.type === 'set_theme') {
        const payload = action.payload || {};
        if (payload.accentColor) {
          setAccentColor(payload.accentColor);
          showHud(`🎨 Акцентный цвет изменен!`);
          return { success: true };
        }
      }
      return { success: true };
    } catch (e: any) {
      console.error('Error executing copilot action:', e);
      return { success: false, message: e.message };
    }
  };

// Handle locking
  const handleLockSession = () => {
    if (pinCode) {
      setIsUnlocked(false);
    }
  };

  // 1. NOTES WRAPPERS
  const handleAddNote = (newN: Note) => {
    setNotes((prev) => [newN, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    const match = notes.find((n) => n.id === id);
    if (match) {
      // Add version snapshot or tags to trashed for safety
      setDeletedNotes((prev) => [match, ...prev]);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveNoteId(null);
    }
  };

  const handleUpdateNote = (newN: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === newN.id ? newN : n)));
  };

  const handleRestoreFromTrash = (id: string) => {
    const match = deletedNotes.find((n) => n.id === id);
    if (match) {
      setNotes((prev) => [match, ...prev]);
      setDeletedNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveNoteId(match.id);
    }
  };

  // 2. DISASTER RECOVERY IMPORT-EXPORT JSON
  const handleBackupExport = () => {
    let canvasCards = [];
    let canvasLinks = [];
    try {
      canvasCards = JSON.parse(localStorage.getItem('ns_creative_cards') || '[]');
      canvasLinks = JSON.parse(localStorage.getItem('ns_creative_links') || '[]');
    } catch {}

    const dateIso = new Date().toISOString().split('T')[0];
    const bundle = {
      _app: 'NoteSphere OS',
      schemaVersion: '2.5.0',
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      exportedAt: new Date().toLocaleString(),
      categories,
      notes,
      deletedNotes,
      tasks,
      habits,
      transactions,
      financeBudget,
      budget: financeBudget,
      financeGoals,
      goals,
      currency,
      reminders,
      alarms,
      canvasCards,
      canvasLinks,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `notesphere-backup-${dateIso}.json`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const handleBackupImport = (jsonStr: string) => {
    try {
      const bundle = JSON.parse(jsonStr);
      if (bundle.categories) setCategories(bundle.categories);
      if (bundle.notes) setNotes(bundle.notes);
      if (bundle.deletedNotes) setDeletedNotes(bundle.deletedNotes);
      if (bundle.tasks) setTasks(bundle.tasks);
      if (bundle.habits) setHabits(bundle.habits);
      if (bundle.transactions) setTransactions(bundle.transactions);
      if (bundle.financeBudget) setFinanceBudget(bundle.financeBudget);
      else if (bundle.budget) setFinanceBudget(bundle.budget);
      if (bundle.financeGoals) setFinanceGoals(bundle.financeGoals);
      if (bundle.goals) setGoals(bundle.goals);
      if (bundle.currency) setCurrency(bundle.currency);
      if (bundle.reminders) setReminders(bundle.reminders);
      if (bundle.alarms) setAlarms(bundle.alarms);
      if (bundle.canvasCards) localStorage.setItem('ns_creative_cards', JSON.stringify(bundle.canvasCards));
      if (bundle.canvasLinks) localStorage.setItem('ns_creative_links', JSON.stringify(bundle.canvasLinks));
      
      showHud('Данные успешно резервно скопированы и восстановлены!');
    } catch (e) {
      alert('Ошибка структуры импортируемого файла.');
    }
  };

  const handleRestoreSnapshot = (snapshot: any) => {
    if (!snapshot) return;
    try {
      if (snapshot.categories) setCategories(snapshot.categories);
      if (snapshot.notes) setNotes(snapshot.notes);
      if (snapshot.deletedNotes) setDeletedNotes(snapshot.deletedNotes);
      if (snapshot.tasks) setTasks(snapshot.tasks);
      if (snapshot.habits) setHabits(snapshot.habits);
      if (snapshot.transactions) setTransactions(snapshot.transactions);
      if (snapshot.financeBudget) setFinanceBudget(snapshot.financeBudget);
      else if (snapshot.budget) setFinanceBudget(snapshot.budget);
      if (snapshot.financeGoals) setFinanceGoals(snapshot.financeGoals);
      if (snapshot.goals) setGoals(snapshot.goals);
      if (snapshot.currency) setCurrency(snapshot.currency);
      if (snapshot.reminders) setReminders(snapshot.reminders);
      if (snapshot.alarms) setAlarms(snapshot.alarms);
      if (snapshot.canvasCards) localStorage.setItem('ns_creative_cards', JSON.stringify(snapshot.canvasCards));
      if (snapshot.canvasLinks) localStorage.setItem('ns_creative_links', JSON.stringify(snapshot.canvasLinks));
      showHud('База NoteSphere успешно восстановлена из Telegram!');
      triggerHaptic('success');
    } catch (err) {
      console.error('Snapshot restore error:', err);
      showHud('Ошибка при применении резервной копии');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const txt = event.target?.result as string;
      handleBackupImport(txt);
    };
    reader.readAsText(file);
  };

  const handleExportFormat = (format: 'json' | 'txt') => {
    if (format === 'json') {
      handleBackupExport();
    } else {
      // Export active notes as plain text TXT
      const txtContent = notes.map((n) => `--- ${n.title} ---\n${n.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `notesphere-export-${new Date().toLocaleDateString()}.txt`;
      a.click();
      URL.revokeObjectURL(u);
    }
  };

  const blurClass = bgBlur === 'none' ? 'glass-blur-none' : bgBlur === 'normal' ? 'glass-blur-normal' : 'glass-blur-high';

  return (
    <div
      id="notesphere-application-layout"
      className="h-screen max-h-screen flex flex-col bg-slate-50 dark:bg-[#07080a] text-slate-800 dark:text-[#E2E8F0] transition-colors duration-300 font-sans no-scrollbar relative overflow-hidden"
    >
      {/* Custom Background Wallpaper Layer */}
      {customWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
          style={{
            backgroundImage: `url(${customWallpaper})`,
            opacity: bgOpacity / 100,
          }}
        />
      )}

      {/* SECURITY OVERLAY TRIGGER */}
      {!isUnlocked && pinCode && (
        <AuthPINOverlay
          correctPin={pinCode}
          onSuccess={() => setIsUnlocked(true)}
          accentColor={accentColor}
        />
      )}

      {/* A. NAV HEADER ELEMENT */}
      <header id="main-header" className={`sticky top-0 z-40 border-b border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#090b10] px-4 sm:px-6 py-2 h-14 flex items-center justify-between shadow-xs z-10 ${neonGlow ? 'neon-glow-active' : ''}`}>
        
        {/* Left side brand name & logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setIsSidebarCollapsed((prev) => !prev);
              triggerHaptic('light');
            }}
            className={`hidden md:flex p-1.5 rounded-xl border transition cursor-pointer items-center justify-center ${
              isSidebarCollapsed
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
                : 'border-slate-200 dark:border-[#1e2638] bg-slate-100 hover:bg-slate-200 dark:bg-[#0d111a] dark:hover:bg-[#151c2c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={t(language, 'sidebar_toggle')}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Hexagonal Polygon Gradient Brand Icon */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">NoteSphere</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">Твоя персональная ОС</p>
          </div>
        </div>

        {/* Center: Global Search Bar & NEXAR AI Unified Omni-Bar */}
        <div className="flex-1 max-w-2xl mx-4 hidden md:flex items-center justify-center gap-3">
          <div
            id="global-search-header"
            onClick={() => {
              setIsCommandCenterOpen(true);
              triggerHaptic('light');
            }}
            className="flex items-center justify-between flex-1 bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d111a] dark:hover:bg-[#111622] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-500/50 p-1 pl-3.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-pointer transition shadow-inner group"
            title="Поиск и ассистент NEXAR AI (Ctrl + K)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 truncate font-medium">
                Поиск или вопрос NEXAR AI...
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-[#1e2638] text-slate-400 rounded border border-slate-200 dark:border-slate-700/60 shadow-xs hidden lg:inline">
                Ctrl + K
              </kbd>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white rounded-lg text-[11px] font-bold shadow-sm shadow-indigo-600/25 group-hover:scale-105 transition"
              >
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span className="tracking-wide">NEXAR AI</span>
              </div>
            </div>
          </div>

          {/* Pomodoro Timer Header Widget */}
          <PomodoroHeaderWidget accentColor={accentColor} language={language} />
        </div>

        {/* Right Controls Group */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Mode Toggle (Sun/Moon) */}
          <button
            onClick={() => {
              setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
              triggerHaptic('light');
            }}
            className="p-2 border border-slate-200 dark:border-[#1e2638] bg-slate-100 hover:bg-slate-200 dark:bg-[#0d111a] dark:hover:bg-[#151c2c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
            title="Переключить тему (Светлая / Тёмная)"
          >
            {themeMode === 'dark' ? <Moon className="w-4 h-4 text-indigo-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Notification Bell */}
          <div className="relative" id="notifications-panel-wrapper">
            <button
              onClick={() => {
                setShowNotificationsPanel((prev) => !prev);
                triggerHaptic('light');
              }}
              className="relative p-2 border border-slate-200 dark:border-[#1e2638] bg-slate-100 hover:bg-slate-200 dark:bg-[#0d111a] dark:hover:bg-[#151c2c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
              title="Уведомления"
            >
              <Bell className="w-4 h-4" />
              {(reminders.length > 0 || alarms.length > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-xs ring-2 ring-slate-100 dark:ring-[#0d111a]" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotificationsPanel && (
              <div
                className="absolute right-0 top-full mt-2 w-80 z-50 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#1e2638]">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-500" />
                    Уведомления
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsAddingReminder((prev) => !prev);
                        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                          Notification.requestPermission();
                        }
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-violet-600/10 text-violet-500 hover:bg-violet-600/20 font-bold transition cursor-pointer"
                      title="Добавить напоминание"
                    >
                      + Напоминание
                    </button>
                    <span className="text-[11px] font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">
                      {reminders.length + alarms.length}
                    </span>
                    <button
                      onClick={() => setShowNotificationsPanel(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Quick Add Reminder Form */}
                {isAddingReminder && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reminderQuickTitle.trim() || !reminderQuickTime) return;
                      const now = new Date();
                      const todayStr = now.toISOString().split('T')[0];
                      const newRem: Reminder = {
                        id: `rem-${Date.now()}`,
                        title: reminderQuickTitle.trim(),
                        time: reminderQuickTime,
                        date: todayStr,
                        recurrence: 'none',
                        isTriggered: false,
                        completed: false,
                      };
                      setReminders((prev) => [newRem, ...prev]);
                      setReminderQuickTitle('');
                      setReminderQuickTime('');
                      setIsAddingReminder(false);
                      showHud(`🔔 Напоминание создано на ${newRem.time}!`);
                      triggerHaptic('success');
                      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                        Notification.requestPermission();
                      }
                    }}
                    className="p-3 bg-violet-500/5 dark:bg-violet-500/10 border-b border-violet-500/20 space-y-2"
                  >
                    <input
                      type="text"
                      placeholder="О чем напомнить?.."
                      value={reminderQuickTitle}
                      onChange={(e) => setReminderQuickTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-[#222e46] text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-violet-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={reminderQuickTime}
                        onChange={(e) => setReminderQuickTime(e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-[#222e46] text-slate-900 dark:text-white outline-none cursor-pointer"
                      />
                      <button
                        type="submit"
                        disabled={!reminderQuickTitle.trim() || !reminderQuickTime}
                        className="flex-1 text-xs py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Сохранить
                      </button>
                    </div>
                  </form>
                )}

                {/* Body */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e2638]">
                  {reminders.length === 0 && alarms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                      <Bell className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">Нет активных напоминаний 🎉</p>
                      <p className="text-xs text-slate-500">Все дела выполнены!</p>
                    </div>
                  ) : (
                    <>
                      {reminders.map((r: any) => (
                        <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition group">
                          <div className="mt-0.5 w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                            <Bell className="w-3.5 h-3.5 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{r.text || r.title || 'Напоминание'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{r.time || r.datetime || ''}</p>
                          </div>
                          <button
                            onClick={() => setReminders((prev: any[]) => prev.filter((x: any) => x.id !== r.id))}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="Удалить"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {alarms.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition group">
                          <div className="mt-0.5 w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{a.label || a.text || 'Будильник'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{a.time || ''}</p>
                          </div>
                          <button
                            onClick={() => setAlarms((prev: any[]) => prev.filter((x: any) => x.id !== a.id))}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="Удалить"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[#1e2638] flex justify-between items-center">
                  <button
                    onClick={() => { setActiveTab('tasks'); setShowNotificationsPanel(false); }}
                    className="text-xs text-violet-500 hover:text-violet-400 font-semibold cursor-pointer hover:underline"
                  >
                    Открыть задачи →
                  </button>
                  {(reminders.length + alarms.length) > 0 && (
                    <button
                      onClick={() => { setReminders([]); setAlarms([]); }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer transition"
                    >
                      Очистить все
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>


          {/* Settings Trigger (Single Clean Settings Action) */}
          <motion.button
            id="settings-trigger-header"
            onClick={() => {
              setShowSettings(true);
              triggerHaptic('light');
            }}
            whileHover={{ rotate: 45, y: -1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="p-2 border border-slate-200 dark:border-[#1e2638] bg-slate-100 hover:bg-slate-200 dark:bg-[#0d111a] dark:hover:bg-[#151c2c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
            title={t(language, 'settings_tooltip')}
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          {pinCode && (
            <motion.button
              id="lock-trigger-header"
              onClick={handleLockSession}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="p-2 border border-slate-200 dark:border-[#1e2638] bg-slate-100 hover:bg-slate-200 dark:bg-[#0d111a] dark:hover:bg-[#151c2c] text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl transition cursor-pointer"
              title="Заблокировать сессию"
            >
              <Lock className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </header>

      {/* B. MAIN INTERACTIVE SPLIT GRID */}
      <div id="workspace-layout-splitter" className="flex-1 flex flex-col md:flex-row pb-16 md:pb-0 min-h-0 overflow-hidden">
        
        {/* I. NAV SYSTEM BAR RAILS (Desktop) */}
        <nav
          id="workspace-sidebar"
          className={`${
            isSidebarCollapsed
              ? 'w-0 md:w-0 p-0 md:p-0 border-r-0 overflow-hidden opacity-0 pointer-events-none hidden md:hidden'
              : 'hidden md:flex md:w-64 border-r border-slate-200 dark:border-[#1e2638] bg-slate-50 dark:bg-[#0d111a] p-3 flex-col justify-between select-none z-10 shrink-0 h-full max-h-full overflow-hidden'
          } duration-300 transition-all ${
            neonGlow && !isSidebarCollapsed ? 'border-r-indigo-500/20 shadow-[4px_0_15px_-5px_var(--neon-glow-rgb)]' : ''
          }`}
        >
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-0.5">
            {/* Primary Nav List */}
            <div className="space-y-1">
              {[
                { id: 'widgets', label: 'Главная', icon: LayoutDashboard, badge: null },
                { id: 'projects', label: 'Проекты', icon: Folder, badge: projects.filter(p => !p.archived && p.status !== 'completed').length },
                { id: 'tasks', label: 'Задачи', icon: CheckSquare, badge: tasks.filter(t => !t.isCompleted).length },
                { id: 'notes', label: 'Заметки', icon: Notebook, badge: notes.length },
                { id: 'dashboard', label: 'Холст', icon: Sparkles, badge: null },
                { id: 'finance', label: 'Финансы', icon: DollarSign, badge: null },
                { id: 'media', label: 'Медиатека', icon: Music, badge: null },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    id={`nav-${item.id}`}
                    key={`nav-item-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      triggerHaptic('light');
                    }}
                    style={isActive ? { backgroundColor: accentColor } : undefined}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      isActive
                        ? 'text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-[#151c2c] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="my-1.5 border-t border-slate-200 dark:border-[#1e2638]" />

              {/* Secondary Actions: Календарь and Поиск */}
              <button
                onClick={() => {
                  setActiveTab('widgets');
                  triggerHaptic('light');
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Календарь</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandCenterOpen(true);
                  triggerHaptic('light');
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4" />
                  <span>Поиск</span>
                </div>
                <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-[#1e2638] text-slate-600 dark:text-slate-400">
                  Ctrl + K
                </kbd>
              </button>
            </div>

            {/* Quick Actions Section (БЫСТРЫЕ ДЕЙСТВИЯ) */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block">
                БЫСТРЫЕ ДЕЙСТВИЯ
              </span>
              <button
                onClick={() => {
                  const newNote: Note = {
                    id: 'note-' + Date.now(),
                    title: 'Новая заметка',
                    content: '<p></p>',
                    categoryId: categories[0]?.id || 'cat-work',
                    isFavorite: false,
                    isPinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    tags: [],
                    importance: 'medium',
                    color: '#6366f1',
                    attachments: [],
                    isProtected: false,
                    versions: [],
                  };
                  handleAddNote(newNote);
                  setActiveTab('notes');
                  triggerHaptic('success');
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} className="text-indigo-500" />
                <span>Новая заметка</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('tasks');
                  triggerHaptic('light');
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} className="text-emerald-500" />
                <span>Новая задача</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('projects');
                  setActiveProjectId(null);
                  triggerHaptic('light');
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} className="text-amber-500" />
                <span>Новый проект</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 shrink-0">
            {/* Mini Music Player in Left Sidebar (Hidden when inside Media tab to prevent duplicate player) */}
            {activeTab !== 'media' && (
              <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638] space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={11} className="text-indigo-500" />
                    <span>МЕДИАПЛЕЕР</span>
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('media');
                      triggerHaptic('light');
                    }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    title="Открыть медиатеку"
                  >
                    <span>Все</span>
                    <Maximize2 size={10} />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] space-y-2.5 shadow-sm">
                  {/* Track photo & metadata */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {mediaTracks[currentTrackIndex]?.coverUrl || mediaTracks[currentTrackIndex]?.thumbnailUrl ? (
                      <img
                        src={mediaTracks[currentTrackIndex]?.coverUrl || mediaTracks[currentTrackIndex]?.thumbnailUrl}
                        alt="Cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="w-11 h-11 rounded-lg object-cover shadow-sm shrink-0 border border-slate-200 dark:border-[#1e2638]"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-[#1e2638]"
                        style={{ backgroundColor: accentColor + '20', color: accentColor }}
                      >
                        <Music className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                        {mediaTracks[currentTrackIndex]?.name || (mediaTracks.length > 0 ? mediaTracks[0].name : 'Фоновый трек')}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                        {mediaTracks[currentTrackIndex]?.artist || mediaTracks[currentTrackIndex]?.album || 'NoteSphere Audio'}
                      </p>
                    </div>
                  </div>

                  {/* Scrubbable timeline with timestamps */}
                  <div className="space-y-1">
                    <div
                      className="h-1.5 w-full bg-slate-100 dark:bg-[#1e2638] rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all"
                      onClick={(e) => {
                        if (globalAudioRef.current && mediaDuration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          globalAudioRef.current.currentTime = pct * mediaDuration;
                          setMediaCurrentTime(pct * mediaDuration);
                        }
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                          width: `${mediaDuration > 0 ? (mediaCurrentTime / mediaDuration) * 100 : 0}%`,
                          backgroundColor: accentColor,
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 dark:text-slate-500 px-0.5">
                      <span>{formatTime(mediaCurrentTime)}</span>
                      <span>{formatTime(mediaDuration || 210)}</span>
                    </div>
                  </div>

                  {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat, Mute) */}
                  <div className="flex items-center justify-between pt-0.5">
                    {/* Shuffle / Random */}
                    <button
                      onClick={() => {
                        setIsShuffle(prev => !prev);
                        showHud(!isShuffle ? 'Случайный порядок (Shuffle) включен' : 'Случайный порядок выключен');
                        triggerHaptic('light');
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isShuffle 
                          ? 'text-indigo-400 bg-indigo-500/15 font-bold' 
                          : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={isShuffle ? 'Случайный порядок: ВКЛ' : 'Случайный порядок: ВЫКЛ'}
                    >
                      <Shuffle size={13} />
                    </button>

                    {/* Previous */}
                    <button
                      onClick={() => handlesSkip('prev')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="Предыдущий трек [P]"
                    >
                      <SkipBack size={13} />
                    </button>

                    {/* Play / Pause */}
                    <button
                      onClick={() => {
                        if (currentTrackIndex < 0 && mediaTracks.length > 0) {
                          setCurrentTrackIndex(0);
                        }
                        setIsPlaying((prev) => !prev);
                        triggerHaptic('medium');
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                      title={isPlaying ? 'Пауза [Space]' : 'Воспроизведение [Space]'}
                    >
                      {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                    </button>

                    {/* Next */}
                    <button
                      onClick={() => handlesSkip('next')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="Следующий трек [N]"
                    >
                      <SkipForward size={13} />
                    </button>

                    {/* Repeat with 3-state loop cycle: off -> all -> one -> off */}
                    <button
                      onClick={cycleRepeatMode}
                      className={`p-1.5 rounded-lg relative transition cursor-pointer ${
                        repeatMode !== 'off'
                          ? 'text-indigo-400 bg-indigo-500/15 font-bold'
                          : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={
                        repeatMode === 'off'
                          ? 'Повтор: ВЫКЛ (клик для повтора всех)'
                          : repeatMode === 'all'
                          ? 'Повтор всех треков (клик для зацикливания одного)'
                          : 'Зацикливание одного трека (клик для выключения)'
                      }
                    >
                      {repeatMode === 'one' ? <Repeat1 size={13} /> : <Repeat size={13} />}
                      {repeatMode === 'one' && (
                        <span className="absolute -top-1 -right-1 text-[8px] bg-indigo-600 text-white rounded-full w-3 h-3 flex items-center justify-center font-mono font-bold leading-none">
                          1
                        </span>
                      )}
                    </button>

                    {/* Mute */}
                    <button
                      onClick={() => {
                        setIsMuted((prev) => !prev);
                        triggerHaptic('light');
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isMuted ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={isMuted ? 'Включить звук [M]' : 'Выключить звук [M]'}
                    >
                      {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Local Storage Status Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>База данных</span>
                </span>
                <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  {mediaTracks.length + notes.length + tasks.length} объектов
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* II. MOBILE DEDICATED BOTTOM TAB BAR (Native Mobile UX) */}
        <nav
          id="mobile-bottom-nav"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b10] border-t border-[#1e2638] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb"
          style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {navItems.filter((item) => item.id !== 'dashboard').map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`mob-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as any);
                  triggerHaptic('light');
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all cursor-pointer relative ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'text-white shadow-md' : 'text-slate-400'
                  }`}
                  style={isActive ? { backgroundColor: accentColor, boxShadow: `0 4px 14px -2px ${accentColor}80` } : undefined}
                >
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[10px] leading-none tracking-tight ${isActive ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Floating Sidebar Restore Button when Collapsed (Desktop only) */}
        {isSidebarCollapsed && (
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              triggerHaptic('light');
            }}
            className="hidden md:flex fixed left-2 bottom-6 z-30 p-2 bg-[#0d111a] hover:bg-[#151c2c] text-slate-400 hover:text-white rounded-xl border border-[#1e2638] shadow-2xl transition cursor-pointer"
            title="Развернуть сайдбар (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* II. RENDERED ACTIVE TAB MODULE */}
        <main
          id="workspace-render"
          className={`flex-1 overflow-y-auto min-h-0 h-full transition-all duration-300 ${
            activeTab === 'dashboard' ? 'p-0 md:p-0' : 'p-2 md:p-3'
          }`}
        >
          <ErrorBoundary fallbackTitle="Ошибка отображения вкладки">
            <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="h-full w-full"
            >
              {activeTab === 'widgets' && (
                <WidgetsTab
                  accentColor={accentColor}
                  notes={filteredNotes}
                  tasks={filteredTasks}
                  transactions={transactions}
                  habits={habits}
                  currency={currency}
                  language={language}
                  onAddNote={handleAddNote}
                  onAddTask={(t) => setTasks((prev) => [t, ...prev])}
                  onUpdateTask={handleUpdateTaskWithNoteSync}
                  onDeleteTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
                  onAddHabit={handleAddHabit}
                  onToggleHabit={handleToggleHabit}
                  onDeleteHabit={handleDeleteHabit}
                  onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectsTab
                  projects={projects}
                  onAddProject={(p) => setProjects((prev) => [p, ...prev])}
                  onUpdateProject={(p) => setProjects((prev) => prev.map((old) => (old.id === p.id ? p : old)))}
                  onDeleteProject={(id) => {
                    setProjects((prev) => prev.filter((p) => p.id !== id));
                    if (activeProjectId === id) setActiveProjectId(null);
                  }}
                  tasks={tasks}
                  onAddTask={(t) => setTasks((prev) => [t, ...prev])}
                  onUpdateTask={handleUpdateTaskWithNoteSync}
                  onDeleteTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
                  notes={notes}
                  onAddNote={handleAddNote}
                  onSelectNote={(id) => {
                    setActiveNoteId(id);
                    setActiveTab('notes');
                  }}
                  transactions={transactions}
                  onAddTransaction={(tx) => setTransactions((prev) => [...prev, tx])}
                  activeProjectId={activeProjectId}
                  setActiveProjectId={setActiveProjectId}
                  currency={currency}
                  accentColor={accentColor}
                />
              )}

              {activeTab === 'dashboard' && (
                <React.Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Загрузка холста...</p>
                    </div>
                  }
                >
                  <SphereCreativeSpace
                  notes={filteredNotes}
                  categories={categories}
                  tasks={filteredTasks}
                  activeNoteId={activeNoteId}
                  onSelectNote={(id) => {
                    setActiveNoteId(id);
                    setActiveTab('notes');
                  }}
                  onUpdateTask={handleUpdateTaskWithNoteSync}
                  accentColor={accentColor}
                  onConnectNotes={(sourceId, targetId) => {
                    const src = notes.find((n) => n.id === sourceId);
                    const tgt = notes.find((n) => n.id === targetId);
                    if (src && tgt) {
                      const srcHasLink = (src.content || '').includes(`[[${tgt.title}]]`);
                      const tgtHasLink = (tgt.content || '').includes(`[[${src.title}]]`);

                      if (!srcHasLink) {
                        const updatedSrcLinks = Array.from(new Set([...(src.links || []), tgt.title]));
                        const updatedSrcContent = src.content
                          ? `${src.content}\n<p>🔗 Связано: [[${tgt.title}]]</p>`
                          : `<p>[[${tgt.title}]]</p>`;
                        handleUpdateNote({ ...src, links: updatedSrcLinks, content: updatedSrcContent });
                      }

                      if (!tgtHasLink) {
                        const updatedTgtLinks = Array.from(new Set([...(tgt.links || []), src.title]));
                        const updatedTgtContent = tgt.content
                          ? `${tgt.content}\n<p>🔗 Связано: [[${src.title}]]</p>`
                          : `<p>[[${src.title}]]</p>`;
                        handleUpdateNote({ ...tgt, links: updatedTgtLinks, content: updatedTgtContent });
                      }

                      showHud(`🔗 Связано: «${src.title}» ↔ «${tgt.title}»`);
                      triggerHaptic('success');
                    }
                  }}
                  onCreateNoteAt={(title, categoryId) => {
                    const newN: Note = {
                      id: `note-${Date.now()}`,
                      title,
                      content: '<p></p>',
                      isFavorite: false,
                      isPinned: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      categoryId: categoryId || categories[0]?.id || 'cat-personal',
                      tags: [],
                      importance: 'medium',
                      color: accentColor,
                      attachments: [],
                      isProtected: false,
                      versions: [],
                    };
                    handleAddNote(newN);
                    setActiveNoteId(newN.id);
                  }}
                  onCreateNoteFromCanvas={(title, content, color) => {
                    const newN: Note = {
                      id: `note-${Date.now()}`,
                      title,
                      content,
                      color: color || accentColor,
                      isFavorite: false,
                      isPinned: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      categoryId: categories[0]?.id || 'cat-personal',
                      tags: [],
                      importance: 'medium',
                      attachments: [],
                      isProtected: false,
                      versions: [],
                    };
                    handleAddNote(newN);
                  }}
                />
                </React.Suspense>
              )}

              {activeTab === 'notes' && (
                <NotesTab
                  notes={filteredNotes}
                  categories={categories}
                  activeNoteId={activeNoteId}
                  setActiveNoteId={setActiveNoteId}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                  onUpdateNote={handleUpdateNote}
                  onRestoreFromTrash={handleRestoreFromTrash}
                  deletedNotes={deletedNotes}
                  accentColor={accentColor}
                  language={language}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksTab
                  tasks={filteredTasks}
                  goals={goals}
                  habits={habits}
                  onAddTask={(t) => setTasks((prev) => [t, ...prev])}
                  onDeleteTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
                  onUpdateTask={handleUpdateTaskWithNoteSync}
                  onAddGoal={(g) => setGoals((prev) => [g, ...prev])}
                  onDeleteGoal={(id) => setGoals((prev) => prev.filter((g) => g.id !== id))}
                  onUpdateGoal={(g) => setGoals((prev) => prev.map((old) => (old.id === g.id ? g : old)))}
                  onAddTransaction={(tx) => setTransactions((prev) => [...prev, tx])}
                  accentColor={accentColor}
                  notes={notes}
                  onUpdateNote={handleUpdateNote}
                  language={language}
                />
              )}

              {activeTab === 'finance' && (
                <FinanceTab
                  transactions={transactions}
                  budget={financeBudget}
                  goals={financeGoals}
                  categories={categories}
                  onAddTransaction={(tx) => setTransactions((prev) => [...prev, tx])}
                  onDeleteTransaction={(id) => setTransactions((prev) => prev.filter((t) => t.id !== id))}
                  onUpdateBudget={setFinanceBudget}
                  onAddFinancialGoal={(g) => setFinanceGoals((prev) => [g, ...prev])}
                  onDeleteFinancialGoal={(id) => setFinanceGoals((prev) => prev.filter((g) => g.id !== id))}
                  onUpdateFinancialGoal={(g) => setFinanceGoals((prev) => prev.map((old) => (old.id === g.id ? g : old)))}
                  accentColor={accentColor}
                  currency={currency}
                />
              )}

              {activeTab === 'media' && (
                <React.Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Загрузка медиатеки...</p>
                    </div>
                  }
                >
                  <MediaTab
                    accentColor={accentColor}
                    tracks={mediaTracks}
                    setTracks={setMediaTracks}
                    currentTrackIndex={currentTrackIndex}
                    setCurrentTrackIndex={setCurrentTrackIndex}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    currentTime={mediaCurrentTime}
                    setCurrentTime={setMediaCurrentTime}
                    duration={mediaDuration}
                    volume={mediaVolume}
                    setVolume={setMediaVolume}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    isShuffle={isShuffle}
                    setIsShuffle={setIsShuffle}
                    isRepeat={isRepeat}
                    setIsRepeat={setIsRepeat}
                    repeatMode={repeatMode}
                    cycleRepeatMode={cycleRepeatMode}
                    activeVideoUrl={activeVideoUrl}
                    setActiveVideoUrl={setActiveVideoUrl}
                    videoPlaySpeed={videoPlaySpeed}
                    setVideoPlaySpeed={setVideoPlaySpeed}
                    isCinemaMode={isCinemaMode}
                    setIsCinemaMode={setIsCinemaMode}
                    globalAudioRef={globalAudioRef}
                    handlesSkip={handlesSkip}
                    handlePlayTrack={handlePlayTrack}
                    mediaQueue={mediaQueue}
                    setMediaQueue={setMediaQueue}
                    showHud={showHud}
                    onAddNote={(note) => setNotes((prev) => [note, ...prev])}
                  />
                </React.Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* III. RIGHT AGENDA SIDEBAR (Desktop Mockup Integration) */}
      {activeTab !== 'dashboard' && (
        <div className="hidden xl:block shrink-0 h-full max-h-full">
          <AgendaSidebar
            activeTab={activeTab}
            tasks={combinedTasks}
            onToggleTask={(task) => handleUpdateTaskWithNoteSync({ ...task, isCompleted: !task.isCompleted })}
            onAddTask={(t) => setTasks((prev) => [t, ...prev])}
            accentColor={accentColor}
            language={language}
            notes={notes}
            onSelectNote={(id) => {
              setActiveNoteId(id);
              setActiveTab('notes');
            }}
            onAddNote={handleAddNote}
            transactions={transactions}
            currency={currency}
            onAddTransaction={(tx) => setTransactions((prev) => [...prev, tx])}
            mediaState={{
              currentTrack: mediaTracks[currentTrackIndex] || null,
              mediaTracks: mediaTracks,
              isPlaying: isPlaying,
              onTogglePlay: () => {
                if (currentTrackIndex >= 0 && globalAudioRef.current) {
                  if (isPlaying) {
                    globalAudioRef.current.pause();
                    setIsPlaying(false);
                  } else {
                    globalAudioRef.current.play().catch(() => {});
                    setIsPlaying(true);
                  }
                } else if (mediaTracks.length > 0) {
                  handlePlayTrack(0);
                }
              },
              onSkip: handlesSkip,
              currentTime: mediaCurrentTime,
              duration: mediaDuration,
              onSeek: (time) => {
                if (globalAudioRef.current) {
                  globalAudioRef.current.currentTime = time;
                }
                setMediaCurrentTime(time);
              },
              volume: mediaVolume,
              setVolume: setMediaVolume,
              isShuffle: isShuffle,
              toggleShuffle: () => setIsShuffle(!isShuffle),
              isRepeat: isRepeat,
              toggleRepeat: () => setIsRepeat(!isRepeat),
              activeVideoUrl: activeVideoUrl,
              onSelectTrack: (idx) => handlePlayTrack(idx),
            }}
          />
        </div>
      )}

      </div>

      {/* Invisible Global Multi-Tab Player */}
      <audio
        ref={globalAudioRef}
        onTimeUpdate={() => {
          if (globalAudioRef.current) {
            setMediaCurrentTime(globalAudioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (globalAudioRef.current) {
            setMediaDuration(globalAudioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one') {
            if (globalAudioRef.current) {
              globalAudioRef.current.currentTime = 0;
              globalAudioRef.current.play().catch(() => {});
            }
          } else {
            handlesSkip('next');
          }
        }}
        loop={repeatMode === 'one'}
      />

      {/* C. POPUP MODAL OVERLAYS */}
      {/* Web Clipper Modal */}
      <WebClipperModal
        isOpen={isWebClipperOpen}
        onClose={() => setIsWebClipperOpen(false)}
        onAddNote={(n) => {
          setNotes((prev) => [n, ...prev]);
          setActiveNoteId(n.id);
          setActiveTab('notes');
          showHud('Веб-заметка успешно сохранена!');
        }}
        categories={categories}
        accentColor={accentColor}
      />

      {/* Global Tags Explorer Modal */}
      <GlobalTagsModal
        isOpen={isGlobalTagsOpen}
        onClose={() => setIsGlobalTagsOpen(false)}
        notes={notes}
        tasks={combinedTasks}
        onSelectTag={(tag) => {
          setActiveTab('notes');
          showHud(`Фильтр по тегу #${tag}`);
        }}
        accentColor={accentColor}
      />

      {/* Telegram Cloud Sync Modal */}
      <TelegramBackupModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        getFullBackupData={() => {
          let canvasCards = [];
          let canvasLinks = [];
          try {
            canvasCards = JSON.parse(localStorage.getItem('ns_creative_cards') || '[]');
            canvasLinks = JSON.parse(localStorage.getItem('ns_creative_links') || '[]');
          } catch {}
          return {
            categories,
            notes,
            deletedNotes,
            tasks,
            habits,
            transactions,
            financeBudget,
            budget: financeBudget,
            financeGoals,
            goals,
            currency,
            reminders,
            alarms,
            canvasCards,
            canvasLinks,
          };
        }}
        onRestoreSnapshot={handleRestoreSnapshot}
        accentColor={accentColor}
        language={language}
      />

      {showSettings && (
        <SettingsOverlay
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          theme={themeMode}
          setTheme={setThemeMode}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          fontSize={fontSize as any}
          setFontSize={setFontSize as any}
          pinCode={pinCode}
          setPinCode={setPinCode}
          isPinLocked={!!pinCode}
          setIsPinLocked={(locked) => {
            if (!locked) {
              setPinCode('');
            }
          }}
          backupData={handleBackupExport}
          restoreData={handleRestoreFile}
          exportFormat={handleExportFormat}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          neonGlow={neonGlow}
          setNeonGlow={setNeonGlow}
          bgBlur={bgBlur}
          setBgBlur={setBgBlur}
          customWallpaper={customWallpaper}
          setCustomWallpaper={setCustomWallpaper}
          bgOpacity={bgOpacity}
          setBgOpacity={setBgOpacity}
          isTransparent={isTransparent}
          setIsTransparent={setIsTransparent}
          onOpenTelegram={() => setIsTelegramOpen(true)}
          onOpenWebDAV={() => setIsTelegramOpen(true)}
          onExportDigitalGarden={() => {
            exportDigitalGardenHTML(notes, categories);
            showHud('Digital Garden экспортирован в HTML!');
            triggerHaptic('success');
          }}
          onOpenWebClipper={() => setIsWebClipperOpen(true)}
          onOpenGlobalTags={() => setIsGlobalTagsOpen(true)}
        />
      )}

      {/* Unified V4 Intelligence OS Command Center (Spotlight + Quick Capture + Copilot + System Prompt) */}
      <CommandCenter
        isOpen={isCommandCenterOpen}
        onClose={() => setIsCommandCenterOpen(false)}
        accentColor={accentColor}
        notes={notes}
        tasks={tasks}
        projects={projects}
        categories={categories}
        transactions={transactions}
        habits={habits}
        goals={goals}
        language={language}
        onExecuteAction={handleCopilotAction}
        onApplyDaySchedule={handleApplyDaySchedule}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          setActiveTab('notes');
        }}
        onSwitchTab={(tab) => {
          setActiveTab(tab as any);
        }}
        onAddNote={handleAddNote}
        onAddTask={(t) => {
          setTasks((prev) => [t, ...prev]);
          showHud(`Задача «${t.title}» добавлена!`);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenWebClipper={() => setIsWebClipperOpen(true)}
        onOpenGlobalTags={() => setIsGlobalTagsOpen(true)}
        onExportDigitalGarden={() => {
          exportDigitalGardenHTML(notes, categories);
          showHud('Digital Garden экспортирован в HTML!');
          triggerHaptic('success');
        }}
        onOpenWebDAV={() => setIsTelegramOpen(true)}
      />

      {/* Dynamic HUD Toast Notification */}
      <AnimatePresence>
        {hudMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 p-3 px-5 rounded-2xl text-xs font-semibold shadow-2xl z-[999] border flex items-center gap-2.5"
            style={{ 
              backgroundColor: '#111622', 
              borderColor: accentColor, 
              color: '#f8fafc',
              boxShadow: `0 10px 30px -10px ${accentColor}40, 0 0 15px ${accentColor}25`
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: accentColor }} />
            <span>{hudMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
