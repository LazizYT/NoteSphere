/**
 * NoteSphere OS — SphereDatabase: Notion-style Relational Multi-View Database
 * Supports Table, Kanban Board, Gallery, and List views with customizable properties and filters.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, Category, Importance, DatabaseViewType } from '../types';
import {
  Table as TableIcon,
  Columns,
  LayoutGrid,
  List as ListIcon,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Lock,
  Star,
  Pin,
  Calendar,
  Tag,
  ArrowRight,
  CheckCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SphereDatabaseProps {
  notes: Note[];
  categories: Category[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (note: Note) => void;
  accentColor: string;
}

export default function SphereDatabase({
  notes,
  categories,
  activeNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onAddNote,
  accentColor,
}: SphereDatabaseProps) {
  // Current view mode: 'table' | 'kanban' | 'gallery' | 'list'
  const [viewType, setViewType] = useState<DatabaseViewType>('table');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');

  // Sort state
  const [sortField, setSortField] = useState<'title' | 'updatedAt' | 'importance' | 'category'>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Category helper
  const catMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filtered and sorted notes
  const processedNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = (notes || []).filter((n) => {
      if (!n) return false;
      const matchCat = filterCategory === 'all' || n.categoryId === filterCategory;
      const matchImp = filterImportance === 'all' || n.importance === filterImportance;
      const matchQ =
        !q ||
        (n.title || '').toLowerCase().includes(q) ||
        (n.tags || []).some((t) => (t || '').toLowerCase().includes(q)) ||
        (n.content || '').toLowerCase().includes(q);

      return matchCat && matchImp && matchQ;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField === 'category' ? 'categoryId' : sortField] || '';
      let valB: any = b[sortField === 'category' ? 'categoryId' : sortField] || '';

      if (sortField === 'importance') {
        const ranks = { critical: 4, high: 3, medium: 2, low: 1 };
        valA = ranks[a.importance] || 0;
        valB = ranks[b.importance] || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [notes, searchQuery, filterCategory, filterImportance, sortField, sortAsc]);

  const handleCreateNewRow = () => {
    const fresh: Note = {
      id: `note-${Date.now()}`,
      title: 'Новая запись',
      content: '<p>Введите данные...</p>',
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: filterCategory !== 'all' ? filterCategory : 'cat-work',
      tags: [],
      importance: 'medium',
      color: accentColor,
      attachments: [],
      isProtected: false,
      versions: [],
      status: 'todo',
    };
    onAddNote(fresh);
    onSelectNote(fresh.id);
    triggerHaptic('success');
  };

  const handleToggleImportance = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const cycle: Record<Importance, Importance> = {
      low: 'medium',
      medium: 'high',
      high: 'critical',
      critical: 'low',
    };
    onUpdateNote({ ...note, importance: cycle[note.importance] || 'low', updatedAt: new Date().toISOString() });
    triggerHaptic('light');
  };

  const handleToggleStatus = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const cycle: Record<string, 'todo' | 'in_progress' | 'done'> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const nextStatus = cycle[note.status || 'todo'] || 'todo';
    onUpdateNote({ ...note, status: nextStatus, updatedAt: new Date().toISOString() });
    triggerHaptic('selection');
  };

  return (
    <div className="w-full h-full min-h-[580px] bg-white dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col p-4 select-none shadow-sm">
      {/* 📊 Header / View Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
        {/* View mode toggle pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <button
            onClick={() => {
              setViewType('table');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'table' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TableIcon size={14} /> Таблица
          </button>
          <button
            onClick={() => {
              setViewType('kanban');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'kanban' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Columns size={14} /> Канбан
          </button>
          <button
            onClick={() => {
              setViewType('gallery');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'gallery' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} /> Галерея
          </button>
          <button
            onClick={() => {
              setViewType('list');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewType === 'list' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ListIcon size={14} /> Список
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
            <Search size={14} className="text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Фильтр записей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-32 sm:w-44"
            />
          </div>

          {/* New row button */}
          <button
            onClick={handleCreateNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/25 transition-all"
          >
            <Plus size={14} /> Новая запись
          </button>
        </div>
      </div>

      {/* ⊞ 1. TABLE VIEW */}
      {viewType === 'table' && (
        <div className="flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                <th className="p-3 w-8">#</th>
                <th
                  onClick={() => {
                    setSortField('title');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Название</span> <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Статус</th>
                <th className="p-3">Категория</th>
                <th
                  onClick={() => {
                    setSortField('importance');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Важность</span> <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Теги</th>
                <th
                  onClick={() => {
                    setSortField('updatedAt');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Обновлено</span> <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {processedNotes.map((note, idx) => {
                const cat = catMap.get(note.categoryId);
                const isSelected = activeNoteId === note.id;

                return (
                  <tr
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note.id);
                      triggerHaptic('light');
                    }}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      isSelected ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                    }`}
                  >
                    <td className="p-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: note.color || accentColor }} />
                      <span className="truncate max-w-[200px]">{note.title}</span>
                      {note.isProtected && <Lock size={12} className="text-amber-500 dark:text-amber-400 flex-shrink-0" />}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => handleToggleStatus(note, e)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          note.status === 'done'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : note.status === 'in_progress'
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {note.status === 'done' ? '✅ Готово' : note.status === 'in_progress' ? '⚡ В работе' : '📋 План'}
                      </button>
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] border"
                        style={{
                          backgroundColor: `${cat?.color || '#8b5cf6'}18`,
                          borderColor: `${cat?.color || '#8b5cf6'}40`,
                          color: cat?.color || '#8b5cf6',
                        }}
                      >
                        {cat?.name || 'Заметка'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => handleToggleImportance(note, e)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider ${
                          note.importance === 'critical'
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                            : note.importance === 'high'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                            : note.importance === 'medium'
                            ? 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/30'
                            : 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30'
                        }`}
                      >
                        {note.importance}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(note.tags || []).map((t) => (
                          <span key={t} className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(note.updatedAt || Date.now()).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ▦ 2. KANBAN VIEW */}
      {viewType === 'kanban' && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
          {(['todo', 'in_progress', 'done'] as const).map((colStatus) => {
            const colNotes = processedNotes.filter((n) => (n.status || 'todo') === colStatus);
            const titles = {
              todo: { label: 'К выполнению', color: 'text-slate-600 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700' },
              in_progress: { label: 'В процессе', color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-400 dark:border-cyan-500/40' },
              done: { label: 'Завершено', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-400 dark:border-emerald-500/40' },
            };

            return (
              <div
                key={colStatus}
                className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/10 p-3 flex flex-col min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-white/10">
                  <span className={`text-xs font-bold uppercase tracking-wider ${titles[colStatus].color}`}>
                    {titles[colStatus].label} ({colNotes.length})
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
                  {colNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      className="p-3 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer transition-all hover:border-violet-400 dark:hover:border-violet-500/50 shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-xs text-slate-800 dark:text-white truncate">{note.title}</span>
                        <button
                          onClick={(e) => handleToggleStatus(note, e)}
                          title="Сменить статус"
                          className="text-[10px] text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-300"
                        >
                          →
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                        {note.content.replace(/<[^>]*>/g, ' ')}
                      </p>
                      <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-white/5">
                        <span className="text-slate-500 dark:text-slate-400">{catMap.get(note.categoryId)?.name}</span>
                        <span className="text-violet-600 dark:text-violet-400 font-medium uppercase">{note.importance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🖼️ 3. GALLERY VIEW */}
      {viewType === 'gallery' && (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 overflow-y-auto custom-scrollbar">
          {processedNotes.map((note) => {
            const cat = catMap.get(note.categoryId);
            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/50 rounded-2xl p-4 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: note.color || accentColor }} />
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-white truncate">{note.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-4 leading-relaxed mb-3">
                    {note.content.replace(/<[^>]*>/g, ' ')}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400">{cat?.name}</span>
                  <span className="text-violet-600 dark:text-violet-400 font-medium uppercase">{note.importance}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📋 4. LIST VIEW */}
      {viewType === 'list' && (
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {processedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className="p-3 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: note.color || accentColor }} />
                <span className="font-medium text-xs text-slate-800 dark:text-white truncate max-w-xs">{note.title}</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline truncate max-w-sm">
                  {note.content.replace(/<[^>]*>/g, ' ').slice(0, 70)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 hidden md:inline">
                  {new Date(note.updatedAt).toLocaleDateString('ru-RU')}
                </span>
                <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
