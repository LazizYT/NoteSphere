/**
 * NoteSphere OS — SphereCreativeSpace: Ultimate Infinite Creative Dashboard
 * Replaces and unifies Knowledge Graph + Infinite Whiteboard Canvas + Mind Mapping
 * into one seamless, high-performance spatial workspace where you can create, link, and visualize anything.
 *
 * New Features:
 * - 🗺️ Interactive Minimap Navigator with Viewfinder
 * - ⚡ Force-Directed Auto-Layout (anti-collision clustering)
 * - 🔗 [[Backlinks]] auto-link discovery between notes
 * - 🎬 Media nodes (photos, audio player, video) on canvas
 * - 📱 Bulletproof linking (click-to-connect & drag-to-connect)
 * - 📁 Auto-grouping of notes and tasks by category
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, Category, Task, CanvasCard, CanvasLink } from '../types';
import {
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Link2,
  FileText,
  StickyNote,
  Download,
  Layers,
  Search,
  Check,
  BrainCircuit,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckSquare,
  Square,
  Folder,
  X,
  RefreshCw,
  FolderOpen,
  Calendar,
  AlertCircle,
  Tag,
  Map as MapIcon,
  Play,
  Pause,
  Image as ImageIcon,
  Film,
  Music,
  LayoutGrid,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SphereCreativeSpaceProps {
  notes: Note[];
  categories: Category[];
  tasks?: Task[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  accentColor: string;
  onConnectNotes?: (sourceId: string, targetId: string) => void;
  onCreateNoteAt?: (title: string, categoryId: string) => void;
  onCreateNoteFromCanvas?: (title: string, content: string, color?: string) => void;
  onUpdateTask?: (task: Task) => void;
}

const CARD_COLORS = [
  { name: 'Фиолетовый', hex: '#8b5cf6' },
  { name: 'Синий', hex: '#3b82f6' },
  { name: 'Изумрудный', hex: '#10b981' },
  { name: 'Янтарный', hex: '#f59e0b' },
  { name: 'Розовый', hex: '#ec4899' },
  { name: 'Бирюзовый', hex: '#06b6d4' },
];

const CAT_COLORS: Record<string, string> = {
  'Работа': '#3b82f6',
  'Личное': '#ec4899',
  'Дом': '#10b981',
  'Учеба': '#8b5cf6',
  'Финансы': '#f59e0b',
  'Здоровье': '#06b6d4',
};

const getCatColor = (cat: string, idx: number) => {
  return CAT_COLORS[cat] || CARD_COLORS[idx % CARD_COLORS.length].hex;
};

export default function SphereCreativeSpace({
  notes,
  categories,
  tasks = [],
  activeNoteId,
  onSelectNote,
  accentColor,
  onConnectNotes,
  onCreateNoteAt,
  onCreateNoteFromCanvas,
  onUpdateTask,
}: SphereCreativeSpaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen Mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Minimap Visibility
  const [showMinimap, setShowMinimap] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'tasks' | 'media' | 'groups'>('all');
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Infinite Canvas Pan & Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cards State
  const [cards, setCards] = useState<CanvasCard[]>(() => {
    try {
      const saved = localStorage.getItem('ns_creative_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      {
        id: 'card-hub-main',
        type: 'sticky',
        title: '🧠 Творческий Центр',
        content: 'Единый дашборд: создавайте мысли, тяните стрелки между карточками, группируйте заметки и задачи по категориям!',
        x: 180,
        y: 120,
        width: 280,
        height: 160,
        color: '#8b5cf6',
      },
      {
        id: 'card-sub-ideas',
        type: 'sticky',
        title: '💡 Быстрые Идеи',
        content: 'Кликните на кружок связи карточки, чтобы соединить её стрелкой с любой другой!',
        x: 540,
        y: 120,
        width: 260,
        height: 150,
        color: '#10b981',
      },
    ];
  });

  // Links State: User requested to completely remove all existing links ("Буквально все связи убери, потом я сам добавлю")
  const [links, setLinks] = useState<CanvasLink[]>(() => {
    try {
      const resetFlag = localStorage.getItem('ns_links_fully_cleared_user_v3');
      if (!resetFlag) {
        localStorage.setItem('ns_creative_links', '[]');
        localStorage.setItem('ns_links_fully_cleared_user_v3', 'true');
        return [];
      }
      const saved = localStorage.getItem('ns_creative_links');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  // Interactive Linking State
  const [linkingFromCardId, setLinkingFromCardId] = useState<string | null>(null);
  const [isLinkingMode, setIsLinkingMode] = useState<boolean>(false);
  const [linkingFromPort, setLinkingFromPort] = useState<'top' | 'right' | 'bottom' | 'left'>('right');
  const [dragLinkWorldPos, setDragLinkWorldPos] = useState<{ x: number; y: number } | null>(null);
  const isMouseDownLinkingRef = useRef<boolean>(false);
  const linkDragStartScreenRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Card dragging & selection
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const draggedCardIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Quick Create Modal
  const [createModalPos, setCreateModalPos] = useState<{ screenX: number; screenY: number; worldX: number; worldY: number } | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCat, setNewNoteCat] = useState(categories[0]?.id || 'cat-personal');

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('ns_creative_cards', JSON.stringify(cards));
    } catch {}
  }, [cards]);

  useEffect(() => {
    try {
      localStorage.setItem('ns_creative_links', JSON.stringify(links));
    } catch {}
  }, [links]);

  // Esc key cancels linking or exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (linkingFromCardId || isLinkingMode) {
          setLinkingFromCardId(null);
          setIsLinkingMode(false);
          setDragLinkWorldPos(null);
          triggerHaptic('light');
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [linkingFromCardId, isLinkingMode, isFullscreen]);


  // 🔄 Automatic synchronization of Notes, Tasks & Categories onto Dashboard
  useEffect(() => {
    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.id, c.name));

    const categoryNames = new Set<string>();
    categories.forEach((c) => categoryNames.add(c.name));
    notes.forEach((n) => {
      const name = catMap.get(n.categoryId) || n.categoryId || 'Общее';
      categoryNames.add(name);
    });
    tasks.forEach((t) => {
      categoryNames.add(t.category || 'Общее');
    });

    const activeCategories = Array.from(categoryNames).filter(Boolean);
    if (activeCategories.length === 0) activeCategories.push('Работа', 'Личное');

    const cols = Math.min(3, Math.max(1, activeCategories.length));
    const colSpacing = 720;
    const rowSpacing = 850;

    const validNoteIds = new Set(notes.map((n) => n.id));
    const validTaskIds = new Set(tasks.map((t) => t.id));

    setCards((prevCards) => {
      // Filter out deleted notes/tasks
      let updatedCards = prevCards.filter((c) => {
        if (c.type === 'note' && c.noteId && !validNoteIds.has(c.noteId)) return false;
        if (c.type === 'task' && c.taskId && !validTaskIds.has(c.taskId)) return false;
        return true;
      });

      const cardMap = new Map<string, CanvasCard>();
      updatedCards.forEach((c) => cardMap.set(c.id, c));

      // Ensure each category has a group section card
      activeCategories.forEach((catName, catIdx) => {
        const catSlug = catName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '-').toLowerCase();
        const groupCardId = `group-sec-${catSlug}`;
        const col = catIdx % cols;
        const row = Math.floor(catIdx / cols);
        const baseX = 80 + col * colSpacing;
        const baseY = 80 + row * rowSpacing;
        const color = getCatColor(catName, catIdx);

        const catNotes = notes.filter((n) => (catMap.get(n.categoryId) || n.categoryId) === catName);
        const catTasks = tasks.filter((t) => (t.category || 'Общее') === catName);
        const calcHeight = Math.max(360, 160 + Math.max(catNotes.length, catTasks.length, 1) * 155);

        if (!cardMap.has(groupCardId)) {
          const groupCard: CanvasCard = {
            id: groupCardId,
            type: 'group',
            category: catName,
            title: `📁 Группа: ${catName}`,
            content: `${catNotes.length} заметок • ${catTasks.length} задач`,
            x: baseX,
            y: baseY,
            width: 650,
            height: calcHeight,
            color: color,
          };
          updatedCards.push(groupCard);
          cardMap.set(groupCardId, groupCard);
        } else {
          const existing = cardMap.get(groupCardId)!;
          existing.content = `${catNotes.length} заметок • ${catTasks.length} задач`;
        }

        // Add or update note cards
        catNotes.forEach((n, nIdx) => {
          const noteCardId = `card-note-${n.id}`;
          if (!cardMap.has(noteCardId)) {
            const noteCard: CanvasCard = {
              id: noteCardId,
              type: 'note',
              noteId: n.id,
              category: catName,
              title: n.title || 'Без названия',
              content: (n.content || '').replace(/<[^>]*>/g, ' ').slice(0, 110),
              x: baseX + 30,
              y: baseY + 85 + nIdx * 155,
              width: 275,
              height: 140,
              color: n.color || color,
            };
            updatedCards.push(noteCard);
            cardMap.set(noteCardId, noteCard);
          } else {
            const existing = cardMap.get(noteCardId)!;
            existing.title = n.title || 'Без названия';
            existing.content = (n.content || '').replace(/<[^>]*>/g, ' ').slice(0, 110);
          }
        });

        // Add or update task cards
        catTasks.forEach((t, tIdx) => {
          const taskCardId = `card-task-${t.id}`;
          if (!cardMap.has(taskCardId)) {
            const taskCard: CanvasCard = {
              id: taskCardId,
              type: 'task',
              taskId: t.id,
              category: catName,
              isCompleted: t.isCompleted,
              dueDate: t.dueDate,
              title: t.title,
              content: t.dueDate ? `Дедлайн: ${t.dueDate}` : `Приоритет: ${t.priority}`,
              x: baseX + 330,
              y: baseY + 85 + tIdx * 155,
              width: 280,
              height: 140,
              color: t.isCompleted ? '#10b981' : color,
            };
            updatedCards.push(taskCard);
            cardMap.set(taskCardId, taskCard);
          } else {
            const existing = cardMap.get(taskCardId)!;
            existing.title = t.title;
            existing.isCompleted = t.isCompleted;
            existing.dueDate = t.dueDate;
          }
        });
      });

      return updatedCards;
    });
  }, [notes, tasks, categories]);

  // Clean up any old links on mount as requested
  useEffect(() => {
    try {
      const resetFlag = localStorage.getItem('ns_links_fully_cleared_user_v3');
      if (!resetFlag) {
        setLinks([]);
        localStorage.setItem('ns_creative_links', '[]');
        localStorage.setItem('ns_links_fully_cleared_user_v3', 'true');
      }
    } catch {}
  }, []);

  // Coordinate conversion
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const getPortPosition = (card: CanvasCard, port: 'top' | 'right' | 'bottom' | 'left') => {
    const w = card.width || 260;
    const h = card.height || 140;
    switch (port) {
      case 'top':
        return { x: card.x + w / 2, y: card.y };
      case 'right':
        return { x: card.x + w, y: card.y + h / 2 };
      case 'bottom':
        return { x: card.x + w / 2, y: card.y + h };
      case 'left':
        return { x: card.x, y: card.y + h / 2 };
    }
  };

  const getOptimalLinkPorts = (fromCard: CanvasCard, toCard: CanvasCard) => {
    const w1 = fromCard.width || 260;
    const h1 = fromCard.height || 140;
    const w2 = toCard.width || 260;
    const h2 = toCard.height || 140;

    const c1x = fromCard.x + w1 / 2;
    const c1y = fromCard.y + h1 / 2;
    const c2x = toCard.x + w2 / 2;
    const c2y = toCard.y + h2 / 2;

    const dx = c2x - c1x;
    const dy = c2y - c1y;

    let p1: { x: number; y: number };
    let p2: { x: number; y: number };
    let isVertical = false;
    let dir = 1;

    if (Math.abs(dx) > Math.abs(dy)) {
      isVertical = false;
      if (dx > 0) {
        p1 = { x: fromCard.x + w1, y: c1y };
        p2 = { x: toCard.x, y: c2y };
        dir = 1;
      } else {
        p1 = { x: fromCard.x, y: c1y };
        p2 = { x: toCard.x + w2, y: c2y };
        dir = -1;
      }
    } else {
      isVertical = true;
      if (dy > 0) {
        p1 = { x: c1x, y: fromCard.y + h1 };
        p2 = { x: c2x, y: toCard.y };
        dir = 1;
      } else {
        p1 = { x: c1x, y: fromCard.y };
        p2 = { x: c2x, y: toCard.y + h2 };
        dir = -1;
      }
    }

    return { p1, p2, isVertical, dir };
  };

  // ----------------- BULLETPROOF LINKING -----------------
  const handleStartLink = (e: React.MouseEvent, card: CanvasCard, port: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    e.preventDefault();
    setLinkingFromCardId(card.id);
    setLinkingFromPort(port);
    setDragLinkWorldPos(screenToWorld(e.clientX, e.clientY));
    isMouseDownLinkingRef.current = true;
    linkDragStartScreenRef.current = { x: e.clientX, y: e.clientY };
    triggerHaptic('medium');
  };

  const handleConnectCards = (targetCardId: string) => {
    if (!linkingFromCardId || linkingFromCardId === targetCardId) {
      setLinkingFromCardId(null);
      setDragLinkWorldPos(null);
      return;
    }

    const fromCard = cards.find((c) => c.id === linkingFromCardId);
    const toCard = cards.find((c) => c.id === targetCardId);
    if (!fromCard || !toCard) {
      setLinkingFromCardId(null);
      setDragLinkWorldPos(null);
      return;
    }

    const exists = links.some(
      (l) =>
        (l.fromCardId === linkingFromCardId && l.toCardId === targetCardId) ||
        (l.fromCardId === targetCardId && l.toCardId === linkingFromCardId)
    );

    if (!exists) {
      const newLink: CanvasLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fromCardId: linkingFromCardId,
        toCardId: targetCardId,
        color: toCard.color || fromCard.color || accentColor,
      };
      setLinks((prev) => [...prev, newLink]);
      triggerHaptic('success');

      if (onConnectNotes && fromCard.noteId && toCard.noteId) {
        onConnectNotes(fromCard.noteId, toCard.noteId);
      }
    }

    setLinkingFromCardId(null);
    setDragLinkWorldPos(null);
    setIsLinkingMode(false);
    isMouseDownLinkingRef.current = false;
  };

  const handleDeleteLink = (linkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    triggerHaptic('light');
  };

  // ----------------- FORCE-DIRECTED AUTO LAYOUT -----------------
  const handleAutoLayout = () => {
    triggerHaptic('medium');

    const updated = cards.map((c) => ({ ...c }));
    const padding = 40;

    // Separate groups from regular cards
    const groups = updated.filter((c) => c.type === 'group' || c.type === 'section');
    const childCards = updated.filter((c) => c.type !== 'group' && c.type !== 'section');

    // Run simple collision resolution iterations
    for (let iter = 0; iter < 25; iter++) {
      for (let i = 0; i < childCards.length; i++) {
        for (let j = i + 1; j < childCards.length; j++) {
          const c1 = childCards[i];
          const c2 = childCards[j];

          const w1 = c1.width || 270;
          const h1 = c1.height || 140;
          const w2 = c2.width || 270;
          const h2 = c2.height || 140;

          // Check overlap
          const overlapX = (w1 + w2) / 2 + padding - Math.abs(c1.x + w1 / 2 - (c2.x + w2 / 2));
          const overlapY = (h1 + h2) / 2 + padding - Math.abs(c1.y + h1 / 2 - (c2.y + h2 / 2));

          if (overlapX > 0 && overlapY > 0) {
            // Push apart along axis of smallest overlap
            if (overlapX < overlapY) {
              const sign = c1.x < c2.x ? -1 : 1;
              c1.x += (sign * overlapX) / 2;
              c2.x -= (sign * overlapX) / 2;
            } else {
              const sign = c1.y < c2.y ? -1 : 1;
              c1.y += (sign * overlapY) / 2;
              c2.y -= (sign * overlapY) / 2;
            }
          }
        }
      }
    }

    setCards([...groups, ...childCards]);
    triggerHaptic('success');
  };

  // ----------------- AUTOMATIC GROUPING OF NOTES & TASKS -----------------
  const handleGroupAllNotesAndTasks = () => {
    triggerHaptic('medium');

    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.id, c.name));

    const categoryNames = new Set<string>();
    categories.forEach((c) => categoryNames.add(c.name));
    notes.forEach((n) => {
      const name = catMap.get(n.categoryId) || n.categoryId || 'Общее';
      categoryNames.add(name);
    });
    tasks.forEach((t) => {
      categoryNames.add(t.category || 'Общее');
    });

    const activeCategories = Array.from(categoryNames).filter(Boolean);
    if (activeCategories.length === 0) activeCategories.push('Работа', 'Личное', 'Дом');

    const newCards: CanvasCard[] = [];
    const newLinks: CanvasLink[] = [];

    const CAT_COLORS: Record<string, string> = {
      'Работа': '#3b82f6',
      'Личное': '#ec4899',
      'Дом': '#10b981',
      'Учеба': '#8b5cf6',
      'Финансы': '#f59e0b',
      'Здоровье': '#06b6d4',
    };

    const getCatColor = (cat: string, idx: number) => {
      return CAT_COLORS[cat] || CARD_COLORS[idx % CARD_COLORS.length].hex;
    };

    const cols = Math.min(3, Math.max(1, activeCategories.length));
    const colSpacing = 720;
    const rowSpacing = 850;

    activeCategories.forEach((catName, catIdx) => {
      const col = catIdx % cols;
      const row = Math.floor(catIdx / cols);
      const baseX = 80 + col * colSpacing;
      const baseY = 80 + row * rowSpacing;
      const color = getCatColor(catName, catIdx);

      const catNotes = notes.filter((n) => {
        const cName = catMap.get(n.categoryId) || n.categoryId;
        return cName === catName;
      });

      const catTasks = tasks.filter((t) => (t.category || 'Общее') === catName);

      const sectionHeight = Math.max(340, 160 + Math.max(catNotes.length, catTasks.length, 1) * 145);

      const catSlug = catName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '-').toLowerCase();
      const sectionId = `group-sec-${catSlug}`;
      const groupCard: CanvasCard = {
        id: sectionId,
        type: 'group',
        category: catName,
        title: `📁 Группа: ${catName}`,
        content: `${catNotes.length} заметок • ${catTasks.length} задач`,
        x: baseX,
        y: baseY,
        width: 650,
        height: sectionHeight,
        color: color,
      };
      newCards.push(groupCard);

      catNotes.forEach((n, nIdx) => {
        const noteCardId = `card-note-${n.id}`;
        const noteCard: CanvasCard = {
          id: noteCardId,
          type: 'note',
          noteId: n.id,
          category: catName,
          title: n.title || 'Без названия',
          content: (n.content || '').replace(/<[^>]*>/g, ' ').slice(0, 110),
          x: baseX + 30,
          y: baseY + 85 + nIdx * 155,
          width: 275,
          height: 140,
          color: n.color || color,
        };
        newCards.push(noteCard);
      });

      catTasks.forEach((t, tIdx) => {
        const taskCardId = `card-task-${t.id}`;
        const taskCard: CanvasCard = {
          id: taskCardId,
          type: 'task',
          taskId: t.id,
          category: catName,
          isCompleted: t.isCompleted,
          priority: t.priority,
          dueDate: t.dueDate,
          title: t.title,
          content: t.dueDate ? `📅 Дедлайн: ${t.dueDate}` : 'Задача без срока',
          x: baseX + 340,
          y: baseY + 85 + tIdx * 135,
          width: 275,
          height: 120,
          color: t.priority === 'high' || t.priority === 'critical' ? '#ef4444' : color,
        };
        newCards.push(taskCard);
      });
    });

    setCards(newCards);
    setLinks((prevLinks) => {
      const filtered = prevLinks.filter(
        (l) =>
          !l.id.startsWith('link-group-sec-') &&
          !l.fromCardId.startsWith('group-sec-') &&
          !l.toCardId.startsWith('group-sec-') &&
          l.label !== 'заметка' &&
          l.label !== 'задача' &&
          l.label !== 'дело'
      );
      localStorage.setItem('ns_creative_links', JSON.stringify(filtered));
      return filtered;
    });
    setPan({ x: 30, y: 30 });
    setZoom(0.85);
    triggerHaptic('success');
  };

  const handleToggleTaskFromCanvas = (card: CanvasCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.type !== 'task' || !card.taskId) return;
    const newStatus = !card.isCompleted;

    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isCompleted: newStatus } : c))
    );

    if (onUpdateTask && tasks.length > 0) {
      const realTask = tasks.find((t) => t.id === card.taskId);
      if (realTask) {
        onUpdateTask({
          ...realTask,
          isCompleted: newStatus,
          progress: newStatus ? 100 : 0,
        });
        triggerHaptic('medium');
      }
    }
  };

  // ----------------- CARD & NODE ACTIONS -----------------
  const handleAddSticky = (customX?: number, customY?: number) => {
    const world = screenToWorld(
      customX ?? window.innerWidth / 2,
      customY ?? window.innerHeight / 2
    );

    const newCard: CanvasCard = {
      id: `card-${Date.now()}`,
      type: 'sticky',
      title: 'Новая мысль',
      content: '',
      x: world.x - 130,
      y: world.y - 80,
      width: 260,
      height: 150,
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)].hex,
    };

    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setShowAddMenu(false);
    triggerHaptic('medium');
  };

  const handleAddNoteToCanvas = (note: Note) => {
    const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newCard: CanvasCard = {
      id: `card-note-${note.id}-${Date.now()}`,
      type: 'note',
      noteId: note.id,
      title: note.title,
      content: (note.content || '').replace(/<[^>]*>/g, ' ').slice(0, 140),
      x: world.x - 140 + (Math.random() - 0.5) * 50,
      y: world.y - 90 + (Math.random() - 0.5) * 50,
      width: 280,
      height: 160,
      color: note.color || accentColor,
    };

    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setShowAddMenu(false);
    triggerHaptic('medium');
  };

  const handleAddMediaNode = (mediaType: 'image' | 'audio' | 'video') => {
    const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newCard: CanvasCard = {
      id: `card-media-${Date.now()}`,
      type: 'media',
      title: mediaType === 'image' ? '📸 Скриншот / Фото' : mediaType === 'audio' ? '🎵 Аудиотрек' : '🎬 Видеоролик',
      content: '',
      x: world.x - 140,
      y: world.y - 90,
      width: 280,
      height: mediaType === 'image' ? 220 : 160,
      color: mediaType === 'image' ? '#10b981' : mediaType === 'audio' ? '#8b5cf6' : '#06b6d4',
      mediaUrl: mediaType === 'image' ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80' : undefined,
    };

    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setShowAddMenu(false);
    triggerHaptic('medium');
  };

  const handleAddSection = () => {
    const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newCard: CanvasCard = {
      id: `card-sec-${Date.now()}`,
      type: 'section',
      title: '📁 Секция / Спринт',
      content: '',
      x: world.x - 240,
      y: world.y - 160,
      width: 500,
      height: 340,
      color: '#3b82f6',
    };

    setCards((prev) => [newCard, ...prev]);
    setSelectedCardId(newCard.id);
    setShowAddMenu(false);
    triggerHaptic('medium');
  };

  const handleDeleteCard = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setLinks((prev) => prev.filter((l) => l.fromCardId !== cardId && l.toCardId !== cardId));
    if (selectedCardId === cardId) setSelectedCardId(null);
    triggerHaptic('light');
  };

  const handleUpdateCard = (cardId: string, updates: Partial<CanvasCard>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c)));
  };

  // ----------------- MOUSE & DRAG HANDLERS -----------------
  const handleMouseDownContainer = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-surface-grid')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedCardId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (linkingFromCardId) {
      setDragLinkWorldPos(world);
    }

    if (draggedCardIdRef.current) {
      const cid = draggedCardIdRef.current;
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cid) return c;
          return {
            ...c,
            x: world.x - dragOffsetRef.current.x,
            y: world.y - dragOffsetRef.current.y,
          };
        })
      );
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    draggedCardIdRef.current = null;

    if (isMouseDownLinkingRef.current && linkingFromCardId) {
      const dx = Math.abs(e.clientX - linkDragStartScreenRef.current.x);
      const dy = Math.abs(e.clientY - linkDragStartScreenRef.current.y);

      if (dx > 15 || dy > 15) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cardEl = el?.closest('[data-card-id]');
        if (cardEl) {
          const targetId = cardEl.getAttribute('data-card-id');
          if (targetId && targetId !== linkingFromCardId) {
            handleConnectCards(targetId);
            return;
          }
        }
      }
      isMouseDownLinkingRef.current = false;
    }
  };

  const handleStartDragCard = (e: React.MouseEvent, card: CanvasCard) => {
    if (isLinkingMode && !linkingFromCardId) {
      e.stopPropagation();
      e.preventDefault();
      setLinkingFromCardId(card.id);
      setIsLinkingMode(false);
      triggerHaptic('medium');
      return;
    }

    if (linkingFromCardId) {
      e.stopPropagation();
      e.preventDefault();
      if (linkingFromCardId !== card.id) {
        handleConnectCards(card.id);
      } else {
        setLinkingFromCardId(null);
        setDragLinkWorldPos(null);
        setIsLinkingMode(false);
      }
      return;
    }

    e.stopPropagation();
    setSelectedCardId(card.id);
    draggedCardIdRef.current = card.id;
    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = { x: world.x - card.x, y: world.y - card.y };
    triggerHaptic('light');
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.5, Math.max(0.25, zoom * zoomFactor));
    setZoom(newZoom);
  };

  const handleDoubleClickCanvas = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-surface-grid')) {
      const world = screenToWorld(e.clientX, e.clientY);
      setCreateModalPos({ screenX: e.clientX, screenY: e.clientY, worldX: world.x, worldY: world.y });
      setNewNoteTitle('');
      triggerHaptic('medium');
    }
  };

  const handleConfirmCreateFromModal = (type: 'sticky' | 'note') => {
    if (!createModalPos) return;
    if (type === 'sticky') {
      const newCard: CanvasCard = {
        id: `card-${Date.now()}`,
        type: 'sticky',
        title: newNoteTitle.trim() || 'Новая мысль',
        content: '',
        x: createModalPos.worldX - 130,
        y: createModalPos.worldY - 80,
        width: 260,
        height: 150,
        color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)].hex,
      };
      setCards((prev) => [...prev, newCard]);
      setSelectedCardId(newCard.id);
    } else {
      if (onCreateNoteAt && newNoteTitle.trim()) {
        onCreateNoteAt(newNoteTitle.trim(), newNoteCat);
      }
    }
    setCreateModalPos(null);
    triggerHaptic('success');
  };

  // ----------------- MINIMAP NAVIGATION -----------------
  // Compute bounding box of all cards for the minimap
  const boundingBox = React.useMemo(() => {
    if (cards.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 800, width: 1000, height: 800 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach((c) => {
      const w = c.width || 260;
      const h = c.height || 140;
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x + w > maxX) maxX = c.x + w;
      if (c.y + h > maxY) maxY = c.y + h;
    });
    // Add margin
    minX -= 150;
    minY -= 150;
    maxX += 150;
    maxY += 150;
    return { minX, minY, maxX, maxY, width: Math.max(800, maxX - minX), height: Math.max(600, maxY - minY) };
  }, [cards]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatioX = (e.clientX - rect.left) / rect.width;
    const clickRatioY = (e.clientY - rect.top) / rect.height;

    const targetWorldX = boundingBox.minX + clickRatioX * boundingBox.width;
    const targetWorldY = boundingBox.minY + clickRatioY * boundingBox.height;

    const containerW = containerRef.current?.clientWidth || window.innerWidth;
    const containerH = containerRef.current?.clientHeight || window.innerHeight;

    setPan({
      x: containerW / 2 - targetWorldX * zoom,
      y: containerH / 2 - targetWorldY * zoom,
    });
    triggerHaptic('light');
  };

  const linkingSourceCard = linkingFromCardId ? cards.find((c) => c.id === linkingFromCardId) : null;

  const displayedCards = cards.filter((card) => {
    if (activeFilter === 'notes' && card.type !== 'note') return false;
    if (activeFilter === 'tasks' && card.type !== 'task') return false;
    if (activeFilter === 'media' && card.type !== 'media') return false;
    if (activeFilter === 'groups' && card.type !== 'group' && card.type !== 'section') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return card.title.toLowerCase().includes(q) || card.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDownContainer}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClickCanvas}
      className={`relative w-full h-full min-h-[640px] bg-[#f8fafc] dark:bg-[#07090e] [--canvas-dots:rgba(100,116,139,0.38)] dark:[--canvas-dots:rgba(255,255,255,0.12)] overflow-hidden flex flex-col select-none cursor-grab active:cursor-grabbing transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner'
      }`}
    >
      {/* 🔗 ACTIVE LINKING BANNER */}
      <AnimatePresence>
        {(linkingFromCardId || isLinkingMode) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 text-xs font-semibold backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <Link2 size={15} />
              <span>
                {linkingSourceCard ? (
                  <>Связывание: кликните по карточке, к которой провести стрелку от «<b>{linkingSourceCard.title}</b>»</>
                ) : (
                  <>Режим связывания: кликните на <b>исходную</b> карточку для создания связи</>
                )}
              </span>
            </div>
            <button
              onClick={() => {
                setLinkingFromCardId(null);
                setIsLinkingMode(false);
                setDragLinkWorldPos(null);
                triggerHaptic('light');
              }}
              className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-[11px] transition cursor-pointer"
            >
              ✕ Отмена (Esc)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌌 Top Creative HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/90 dark:bg-[#0e1422]/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md dark:shadow-2xl flex-wrap">
          <button
            onClick={() => handleAddSticky()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <StickyNote size={14} />
            <span>+ Мысль</span>
          </button>

          {/* 🔗 Bulletproof Link Button */}
          <button
            onClick={() => {
              if (linkingFromCardId || isLinkingMode) {
                setLinkingFromCardId(null);
                setIsLinkingMode(false);
                setDragLinkWorldPos(null);
                triggerHaptic('light');
              } else if (selectedCardId) {
                setLinkingFromCardId(selectedCardId);
                setIsLinkingMode(false);
                triggerHaptic('medium');
              } else {
                setIsLinkingMode(true);
                triggerHaptic('medium');
              }
            }}
            title="Связать карточки стрелкой: выберите первую, затем целевую карточку"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              linkingFromCardId || isLinkingMode
                ? 'bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-500/30 animate-pulse'
                : 'bg-violet-50 dark:bg-violet-600/20 hover:bg-violet-100 dark:hover:bg-violet-600/40 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white'
            }`}
          >
            <Link2 size={14} className={linkingFromCardId || isLinkingMode ? 'text-white' : 'text-violet-600 dark:text-violet-400'} />
            <span>{linkingFromCardId ? 'Выберите цель' : isLinkingMode ? 'Кликните источник' : 'Связать'}</span>
          </button>

          {/* 🗑️ Clear All Links Button (when links exist) */}
          {links.length > 0 && (
            <button
              onClick={() => {
                setLinks([]);
                try {
                  localStorage.setItem('ns_creative_links', '[]');
                } catch {}
                triggerHaptic('medium');
              }}
              title="Удалить все связи с холста"
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/35 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Очистить связи ({links.length})</span>
            </button>
          )}

          {/* ⚡ Auto Group Button */}
          <button
            onClick={handleGroupAllNotesAndTasks}
            title="Автоматически распределить все заметки и задачи по группам (Работа, Личное, Дом и т.д.)"
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/30 hover:bg-emerald-100 dark:hover:bg-emerald-600/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm dark:shadow-md cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
            <span>Сгруппировать ({notes.length + tasks.length})</span>
          </button>

          {/* 🧩 Auto Layout / Anti-Collision Button */}
          <button
            onClick={handleAutoLayout}
            title="Упорядочить карточки: растолкнуть перекрытия и выровнять кластеры"
            className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/40 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LayoutGrid size={14} className="text-blue-500 dark:text-blue-400" />
            <span>Упорядочить</span>
          </button>

          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Добавить...</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

          <button
            onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
          >
            <BrainCircuit size={14} />
            <span>Шаблоны</span>
          </button>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/90 dark:bg-[#0e1422]/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md dark:shadow-2xl">
          {/* Filter Pills */}
          <div className="hidden md:flex items-center gap-1 mr-1 text-[11px]">
            {(['all', 'notes', 'tasks', 'media', 'groups'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveFilter(mode)}
                className={`px-2 py-0.5 rounded-lg transition ${
                  activeFilter === mode
                    ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {mode === 'all' ? 'Все' : mode === 'notes' ? 'Заметки' : mode === 'tasks' ? 'Задачи' : mode === 'media' ? 'Медиа' : 'Группы'}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Minimap Toggle */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            title={showMinimap ? 'Скрыть миникарту' : 'Показать миникарту'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              showMinimap ? 'bg-violet-100 dark:bg-violet-600/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <MapIcon size={14} />
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            title="Приблизить"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))}
            title="Отдалить"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
            title="Центрировать"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Выйти из полноэкранного режима (Esc)' : 'На весь экран'}
            className="p-1.5 text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white rounded-xl hover:bg-violet-100 dark:hover:bg-violet-600/30 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Add Menu (Notes, Sections, Media) */}
      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-52 z-40 w-80 max-h-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 rounded-2xl p-3 shadow-2xl overflow-y-auto text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1 border-b border-slate-200 dark:border-white/10 pb-1.5">
              <span>Добавить элемент на дашборд</span>
              <button onClick={() => setShowAddMenu(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {/* Quick Media Nodes */}
            <div className="mb-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-1">Медиа-ноды</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleAddMediaNode('image')}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer"
                >
                  <ImageIcon size={16} /> Фото
                </button>
                <button
                  onClick={() => handleAddMediaNode('audio')}
                  className="p-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-600 dark:text-violet-300 text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Music size={16} /> Аудио
                </button>
                <button
                  onClick={() => handleAddMediaNode('video')}
                  className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Film size={16} /> Видео
                </button>
              </div>
            </div>

            {/* Existing Notes List */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-1">Заметки из блокнота</span>
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleAddNoteToCanvas(n)}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors truncate flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: n.color || accentColor }} />
                  <span className="truncate">{n.title || 'Без названия'}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Main Infinite Canvas Transform Container */}
      <div
        className="canvas-surface-grid w-full h-full relative"
        style={{
          backgroundImage: `radial-gradient(circle, var(--canvas-dots, rgba(148, 163, 184, 0.45)) 1.25px, transparent 1.25px)`,
          backgroundSize: `${Math.max(14, Math.min(64, 26 * zoom))}px ${Math.max(14, Math.min(64, 26 * zoom))}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Links Layer */}
          <svg className="absolute left-0 top-0 w-full h-full overflow-visible pointer-events-none z-10">
            <defs>
              <marker
                id="creative-arrow"
                markerWidth="12"
                markerHeight="9"
                refX="10"
                refY="4.5"
                orient="auto"
              >
                <polygon points="0 1, 11 4.5, 0 8" fill="#ec4899" />
              </marker>
              <filter id="glow-link" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Links */}
            {links.map((link) => {
              const fromCard = cards.find((c) => c.id === link.fromCardId);
              const toCard = cards.find((c) => c.id === link.toCardId);
              if (!fromCard || !toCard) return null;

              const { p1, p2, isVertical, dir } = getOptimalLinkPorts(fromCard, toCard);
              let pathData: string;
              if (isVertical) {
                const dist = Math.abs(p2.y - p1.y);
                const offset = Math.max(35, Math.min(120, dist * 0.45)) * dir;
                pathData = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + offset}, ${p2.x} ${p2.y - offset}, ${p2.x} ${p2.y}`;
              } else {
                const dist = Math.abs(p2.x - p1.x);
                const offset = Math.max(35, Math.min(120, dist * 0.45)) * dir;
                pathData = `M ${p1.x} ${p1.y} C ${p1.x + offset} ${p1.y}, ${p2.x - offset} ${p2.y}, ${p2.x} ${p2.y}`;
              }
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;

              return (
                <g key={link.id} className="pointer-events-auto group">
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    className="cursor-pointer"
                    onClick={(e) => handleDeleteLink(link.id, e)}
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke={link.color || '#ec4899'}
                    strokeWidth="3.5"
                    strokeOpacity="0.95"
                    markerEnd="url(#creative-arrow)"
                    className="transition-all group-hover:stroke-cyan-400 group-hover:stroke-[4.5px]"
                  />
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    className="cursor-pointer transition-transform group-hover:scale-125"
                    onClick={(e) => handleDeleteLink(link.id, e)}
                  >
                    <circle r="10" fill="#0f172a" stroke={link.color || '#ec4899'} strokeWidth="2" />
                    <text
                      textAnchor="middle"
                      dy=".35em"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      ✕
                    </text>
                    {link.label && (
                      <text
                        y="-14"
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="10"
                        fontWeight="600"
                        className="select-none pointer-events-none bg-slate-900/80"
                      >
                        {link.label}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}

            {/* Dynamic Linking Line in progress */}
            {linkingFromCardId && dragLinkWorldPos && (
              (() => {
                const src = cards.find((c) => c.id === linkingFromCardId);
                if (!src) return null;
                const p1 = getPortPosition(src, linkingFromPort);
                return (
                  <g className="pointer-events-none">
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={dragLinkWorldPos.x}
                      y2={dragLinkWorldPos.y}
                      stroke="#ec4899"
                      strokeWidth="3.5"
                      strokeDasharray="6,4"
                      filter="url(#glow-link)"
                    />
                    <circle cx={dragLinkWorldPos.x} cy={dragLinkWorldPos.y} r="6" fill="#ec4899" />
                  </g>
                );
              })()
            )}
          </svg>

          {/* Cards and Elements */}
          {displayedCards.map((card) => {
            const isSelected = selectedCardId === card.id;
            const isLinkingSource = linkingFromCardId === card.id;
            const isLinkingTargetCandidate = Boolean(linkingFromCardId && linkingFromCardId !== card.id);
            const isLinkingSourceCandidate = Boolean(isLinkingMode && !linkingFromCardId);
            const isGroup = card.type === 'group' || card.type === 'section';
            const isTask = card.type === 'task';
            const isNote = card.type === 'note';
            const isMedia = card.type === 'media';

            // ── GROUP CONTAINER CARD ──
            if (isGroup) {
              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  style={{
                    transform: `translate(${card.x}px, ${card.y}px)`,
                    width: `${card.width || 500}px`,
                    height: `${card.height || 340}px`,
                  }}
                  className={`absolute pointer-events-auto rounded-3xl border-2 border-dashed transition-all p-4 ${
                    isLinkingTargetCandidate
                      ? 'ring-4 ring-pink-500/60 border-pink-400 bg-pink-950/20 cursor-pointer animate-pulse'
                      : isLinkingSourceCandidate
                      ? 'ring-2 ring-violet-400 hover:ring-pink-400 bg-violet-950/20 cursor-pointer'
                      : isSelected
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-300 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.02] shadow-xs'
                  }`}
                  onMouseDown={(e) => {
                    if (isLinkingSourceCandidate) {
                      e.stopPropagation();
                      e.preventDefault();
                      setLinkingFromCardId(card.id);
                      setIsLinkingMode(false);
                      triggerHaptic('medium');
                      return;
                    }
                    if (linkingFromCardId) {
                      e.stopPropagation();
                      e.preventDefault();
                      if (linkingFromCardId !== card.id) {
                        handleConnectCards(card.id);
                      } else {
                        setLinkingFromCardId(null);
                        setDragLinkWorldPos(null);
                        setIsLinkingMode(false);
                      }
                      return;
                    }
                    handleStartDragCard(e, card);
                  }}
                  onClick={(e) => {
                    if (isLinkingSourceCandidate) {
                      e.stopPropagation();
                      setLinkingFromCardId(card.id);
                      setIsLinkingMode(false);
                      triggerHaptic('medium');
                    } else if (linkingFromCardId && linkingFromCardId !== card.id) {
                      e.stopPropagation();
                      handleConnectCards(card.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder size={16} style={{ color: card.color || '#3b82f6' }} className="shrink-0" />
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                        className={`bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white w-full ${
                          isLinkingTargetCandidate || isLinkingSourceCandidate ? 'pointer-events-none' : ''
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">{card.content}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLinkingSourceCandidate) {
                            setLinkingFromCardId(card.id);
                            setIsLinkingMode(false);
                            triggerHaptic('medium');
                          } else if (linkingFromCardId) {
                            if (linkingFromCardId === card.id) {
                              setLinkingFromCardId(null);
                              setDragLinkWorldPos(null);
                              setIsLinkingMode(false);
                            } else {
                              handleConnectCards(card.id);
                            }
                          } else {
                            handleStartLink(e, card, 'right');
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          isLinkingSource
                            ? 'bg-pink-600 text-white shadow-md'
                            : isLinkingTargetCandidate
                            ? 'bg-violet-600 hover:bg-violet-500 text-white ring-2 ring-violet-300 shadow-lg animate-pulse'
                            : isLinkingSourceCandidate
                            ? 'bg-violet-600/60 hover:bg-violet-600 text-white'
                            : 'bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                        }`}
                        title={
                          isLinkingTargetCandidate
                            ? 'Соединить с этой группой'
                            : isLinkingSource
                            ? 'Отменить связывание'
                            : isLinkingSourceCandidate
                            ? 'Выбрать эту группу как начало связи'
                            : 'Создать связь от группы'
                        }
                      >
                        {isLinkingTargetCandidate ? (
                          <>
                            <Check size={11} className="text-white" />
                            <span>Соединить</span>
                          </>
                        ) : isLinkingSource ? (
                          <>
                            <X size={11} className="text-white" />
                            <span>Отмена</span>
                          </>
                        ) : (
                          <>
                            <Link2 size={11} />
                            <span>Связать</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeleteCard(card.id, e)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Удалить секцию"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div
                    onMouseDown={(e) => handleStartLink(e, card, 'top')}
                    title="Потяните для связи"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                  />
                  <div
                    onMouseDown={(e) => handleStartLink(e, card, 'right')}
                    title="Потяните для связи"
                    className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                  />
                  <div
                    onMouseDown={(e) => handleStartLink(e, card, 'bottom')}
                    title="Потяните для связи"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                  />
                  <div
                    onMouseDown={(e) => handleStartLink(e, card, 'left')}
                    title="Потяните для связи"
                    className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                  />
                </div>
              );
            }

            // ── MEDIA NODE CARD ──
            if (isMedia) {
              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  style={{
                    transform: `translate(${card.x}px, ${card.y}px)`,
                    width: `${card.width || 280}px`,
                    minHeight: `${card.height || 180}px`,
                    borderColor: isSelected ? '#38bdf8' : card.color || '#10b981',
                    boxShadow: isSelected ? '0 0 15px rgba(56,189,248,0.4)' : '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                  className={`absolute pointer-events-auto rounded-2xl border-2 p-3 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-sm dark:shadow-md flex flex-col justify-between group transition-all select-none ${
                    isLinkingTargetCandidate
                      ? 'ring-4 ring-pink-500/60 border-pink-400 bg-pink-50 dark:bg-pink-950/20 cursor-pointer animate-pulse'
                      : isLinkingSourceCandidate
                      ? 'ring-2 ring-violet-400 hover:ring-pink-400 bg-violet-50 dark:bg-violet-950/20 cursor-pointer'
                      : 'cursor-move'
                  }`}
                  onMouseDown={(e) => {
                    if (isLinkingSourceCandidate) {
                      e.stopPropagation();
                      e.preventDefault();
                      setLinkingFromCardId(card.id);
                      setIsLinkingMode(false);
                      triggerHaptic('medium');
                      return;
                    }
                    if (linkingFromCardId) {
                      e.stopPropagation();
                      e.preventDefault();
                      if (linkingFromCardId !== card.id) {
                        handleConnectCards(card.id);
                      } else {
                        setLinkingFromCardId(null);
                        setDragLinkWorldPos(null);
                        setIsLinkingMode(false);
                      }
                      return;
                    }
                    handleStartDragCard(e, card);
                  }}
                  onClick={(e) => {
                    if (isLinkingSourceCandidate) {
                      e.stopPropagation();
                      setLinkingFromCardId(card.id);
                      setIsLinkingMode(false);
                      triggerHaptic('medium');
                    } else if (linkingFromCardId && linkingFromCardId !== card.id) {
                      e.stopPropagation();
                      handleConnectCards(card.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-1 mb-2 pb-1 border-b border-slate-200 dark:border-white/10">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-emerald-500 dark:text-emerald-400" />
                      {card.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Media Visual Body */}
                  {card.mediaUrl ? (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 relative">
                      <img src={card.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                      Аудио / Видео поток
                    </div>
                  )}

                  <div className="pt-2 mt-1 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">Медиа-нода</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLinkingSourceCandidate) {
                          setLinkingFromCardId(card.id);
                          setIsLinkingMode(false);
                          triggerHaptic('medium');
                        } else if (linkingFromCardId) {
                          if (linkingFromCardId === card.id) {
                            setLinkingFromCardId(null);
                            setDragLinkWorldPos(null);
                            setIsLinkingMode(false);
                          } else {
                            handleConnectCards(card.id);
                          }
                        } else {
                          handleStartLink(e, card, 'right');
                        }
                      }}
                      className={`px-2 py-0.5 rounded font-bold text-[10px] transition cursor-pointer ${
                        isLinkingSource
                          ? 'bg-pink-600 text-white shadow-md'
                          : isLinkingTargetCandidate
                          ? 'bg-violet-600 hover:bg-violet-500 text-white ring-2 ring-violet-300 shadow-lg animate-pulse'
                          : isLinkingSourceCandidate
                          ? 'bg-violet-600/60 hover:bg-violet-600 text-white'
                          : 'bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      {isLinkingTargetCandidate ? (
                        <>
                          <Check size={11} className="inline mr-1 text-white" />
                          <span>Соединить</span>
                        </>
                      ) : isLinkingSource ? (
                        <>
                          <X size={11} className="inline mr-1 text-white" />
                          <span>Отмена</span>
                        </>
                      ) : (
                        <>
                          <Link2 size={11} className="inline mr-1" />
                          <span>Связать</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ports */}
                  <div onMouseDown={(e) => handleStartLink(e, card, 'top')} className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-white cursor-crosshair z-20" />
                  <div onMouseDown={(e) => handleStartLink(e, card, 'right')} className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-white cursor-crosshair z-20" />
                  <div onMouseDown={(e) => handleStartLink(e, card, 'bottom')} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-white cursor-crosshair z-20" />
                  <div onMouseDown={(e) => handleStartLink(e, card, 'left')} className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 border-2 border-white cursor-crosshair z-20" />
                </div>
              );
            }

            // ── TASK / NOTE / STICKY CARD ──
            return (
              <div
                key={card.id}
                data-card-id={card.id}
                style={{
                  transform: `translate(${card.x}px, ${card.y}px)`,
                  width: `${card.width || 270}px`,
                  minHeight: `${card.height || 140}px`,
                  borderColor: isLinkingSource
                    ? '#ec4899'
                    : isLinkingTargetCandidate
                    ? '#a855f7'
                    : isSelected
                    ? '#38bdf8'
                    : card.color || 'rgba(100,116,139,0.3)',
                  boxShadow: isLinkingSource
                    ? '0 0 16px rgba(236,72,153,0.5)'
                    : isLinkingTargetCandidate
                    ? '0 0 16px rgba(168,85,247,0.5)'
                    : isSelected
                    ? '0 0 15px rgba(56,189,248,0.4)'
                    : '0 4px 12px rgba(0,0,0,0.08)',
                }}
                className={`absolute pointer-events-auto rounded-2xl border-2 p-3 bg-white dark:bg-slate-900 flex flex-col justify-between group transition-all select-none shadow-sm dark:shadow-md ${
                  isLinkingTargetCandidate
                    ? 'ring-4 ring-pink-500/60 border-pink-400 bg-pink-50 dark:bg-pink-950/20 cursor-pointer animate-pulse'
                    : isLinkingSourceCandidate
                    ? 'ring-2 ring-violet-400 hover:ring-pink-400 bg-violet-50 dark:bg-violet-950/20 cursor-pointer'
                    : 'cursor-move'
                }`}
                onMouseDown={(e) => {
                  if (isLinkingSourceCandidate) {
                    e.stopPropagation();
                    e.preventDefault();
                    setLinkingFromCardId(card.id);
                    setIsLinkingMode(false);
                    triggerHaptic('medium');
                    return;
                  }
                  if (linkingFromCardId) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (linkingFromCardId !== card.id) {
                      handleConnectCards(card.id);
                    } else {
                      setLinkingFromCardId(null);
                      setDragLinkWorldPos(null);
                      setIsLinkingMode(false);
                    }
                    return;
                  }
                  handleStartDragCard(e, card);
                }}
                onClick={(e) => {
                  if (isLinkingSourceCandidate) {
                    e.stopPropagation();
                    setLinkingFromCardId(card.id);
                    setIsLinkingMode(false);
                    triggerHaptic('medium');
                  } else if (linkingFromCardId && linkingFromCardId !== card.id) {
                    e.stopPropagation();
                    handleConnectCards(card.id);
                  }
                }}
              >
                {/* 4 Connecting Port Handles */}
                <div
                  onMouseDown={(e) => handleStartLink(e, card, 'top')}
                  title="Потяните для связи или кликните"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                />
                <div
                  onMouseDown={(e) => handleStartLink(e, card, 'right')}
                  title="Потяните для связи или кликните"
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                />
                <div
                  onMouseDown={(e) => handleStartLink(e, card, 'bottom')}
                  title="Потяните для связи или кликните"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                />
                <div
                  onMouseDown={(e) => handleStartLink(e, card, 'left')}
                  title="Потяните для связи или кликните"
                  className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 hover:bg-pink-500 border-2 border-white cursor-crosshair transition-transform hover:scale-125 z-20"
                />

                {/* Card Content Top */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {isTask ? (
                        <button
                          onClick={(e) => handleToggleTaskFromCanvas(card, e)}
                          className="text-slate-400 hover:text-emerald-500 transition cursor-pointer flex-shrink-0"
                          title="Переключить статус задачи"
                        >
                          {card.isCompleted ? (
                            <CheckSquare size={15} className="text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      ) : isNote ? (
                        <FileText size={14} className="text-violet-500 dark:text-violet-400 flex-shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: card.color }} />
                      )}

                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                        className={`bg-transparent border-none outline-none font-semibold text-xs text-slate-800 dark:text-white truncate w-full ${
                          isTask && card.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        } ${isLinkingTargetCandidate ? 'pointer-events-none' : ''}`}
                      />
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {card.noteId && (
                        <button
                          onClick={() => onSelectNote(card.noteId!)}
                          title="Открыть в блокноте"
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <ExternalLink size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteCard(card.id, e)}
                        title="Удалить"
                        className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {isTask ? (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      {card.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                          <Calendar size={11} /> {card.dueDate}
                        </div>
                      )}
                      {card.category && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[9px] text-slate-600 dark:text-slate-300 font-mono">
                          {card.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={card.content}
                      onChange={(e) => handleUpdateCard(card.id, { content: e.target.value })}
                      placeholder="Текст мысли..."
                      className={`w-full bg-transparent border-none outline-none resize-none text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed font-sans ${
                        isLinkingTargetCandidate ? 'pointer-events-none' : ''
                      }`}
                    />
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-2 mt-1 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    {CARD_COLORS.slice(0, 4).map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => handleUpdateCard(card.id, { color: col.hex })}
                        className="w-2.5 h-2.5 rounded-full hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLinkingSourceCandidate) {
                        setLinkingFromCardId(card.id);
                        setIsLinkingMode(false);
                        triggerHaptic('medium');
                      } else if (linkingFromCardId) {
                        if (linkingFromCardId === card.id) {
                          setLinkingFromCardId(null);
                          setDragLinkWorldPos(null);
                          setIsLinkingMode(false);
                        } else {
                          handleConnectCards(card.id);
                        }
                      } else {
                        handleStartLink(e, card, 'right');
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                      isLinkingSource
                        ? 'bg-pink-600 text-white shadow-md'
                        : isLinkingTargetCandidate
                        ? 'bg-violet-600 hover:bg-violet-500 text-white ring-2 ring-violet-300 shadow-lg animate-pulse'
                        : isLinkingSourceCandidate
                        ? 'bg-violet-600/60 hover:bg-violet-600 text-white'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-violet-100 dark:hover:bg-violet-600/30 text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-white'
                    }`}
                    title={
                      isLinkingTargetCandidate
                        ? 'Соединить с этой карточкой'
                        : isLinkingSource
                        ? 'Отменить связывание'
                        : isLinkingSourceCandidate
                        ? 'Выбрать эту карточку как начало связи'
                        : 'Создать связь от этой карточки'
                    }
                  >
                    {isLinkingTargetCandidate ? (
                      <>
                        <Check size={11} className="inline mr-1 text-white" />
                        <span>Соединить</span>
                      </>
                    ) : isLinkingSource ? (
                      <>
                        <X size={11} className="inline mr-1 text-white" />
                        <span>Отмена</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={11} className="inline mr-1" />
                        <span>Связать</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🗺️ INTERACTIVE MINIMAP WITH VIEWFINDER */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-12 right-4 z-30 w-48 h-32 bg-white/95 dark:bg-[#0e1422]/95 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg dark:shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col pointer-events-auto select-none"
          >
            <div className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <MapIcon size={11} className="text-indigo-500 dark:text-indigo-400" /> Миникарта
              </span>
              <button
                onClick={() => setShowMinimap(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Minimap Canvas Surface */}
            <div
              onClick={handleMinimapClick}
              className="flex-1 relative bg-slate-50 dark:bg-[#05070a] cursor-crosshair overflow-hidden"
            >
              {cards.map((c) => {
                const relX = ((c.x - boundingBox.minX) / boundingBox.width) * 100;
                const relY = ((c.y - boundingBox.minY) / boundingBox.height) * 100;
                const relW = Math.max(3, ((c.width || 260) / boundingBox.width) * 100);
                const relH = Math.max(2, ((c.height || 140) / boundingBox.height) * 100);

                return (
                  <div
                    key={c.id}
                    style={{
                      left: `${relX}%`,
                      top: `${relY}%`,
                      width: `${relW}%`,
                      height: `${relH}%`,
                      backgroundColor: c.color || '#8b5cf6',
                    }}
                    className="absolute rounded-[1px] opacity-75"
                  />
                );
              })}

              {/* Viewfinder Viewport Rectangle */}
              {(() => {
                const contW = containerRef.current?.clientWidth || 800;
                const contH = containerRef.current?.clientHeight || 600;
                const viewWorldX = -pan.x / zoom;
                const viewWorldY = -pan.y / zoom;
                const viewWorldW = contW / zoom;
                const viewWorldH = contH / zoom;

                const vfX = Math.max(0, Math.min(100, ((viewWorldX - boundingBox.minX) / boundingBox.width) * 100));
                const vfY = Math.max(0, Math.min(100, ((viewWorldY - boundingBox.minY) / boundingBox.height) * 100));
                const vfW = Math.min(100, (viewWorldW / boundingBox.width) * 100);
                const vfH = Math.min(100, (viewWorldH / boundingBox.height) * 100);

                return (
                  <div
                    style={{
                      left: `${vfX}%`,
                      top: `${vfY}%`,
                      width: `${vfW}%`,
                      height: `${vfH}%`,
                    }}
                    className="absolute border border-cyan-500 dark:border-cyan-400 bg-cyan-500/10 pointer-events-none rounded-[2px]"
                  />
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 Bottom Status Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-md px-3.5 py-1 rounded-xl border border-slate-200 dark:border-white/10 pointer-events-auto flex items-center gap-3 shadow-md dark:shadow-lg">
          <span>
            Карточек: <b className="text-slate-800 dark:text-white">{cards.length}</b>
          </span>
          <span>•</span>
          <span>
            Связей: <b className="text-cyan-600 dark:text-cyan-400">{links.length}</b>
          </span>
          <span>•</span>
          <span>
            Масштаб: <b className="text-violet-600 dark:text-violet-400">{Math.round(zoom * 100)}%</b>
          </span>
        </div>
        <div className="hidden sm:block bg-white/90 dark:bg-slate-900/85 backdrop-blur-md px-3.5 py-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-md dark:shadow-lg">
          💡 Кликните по миникарте в углу для мгновенного перемещения • Ссылки [[Заметка]] связываются автоматически
        </div>
      </div>
    </div>
  );
}
