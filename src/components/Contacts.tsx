/**
 * NoteSphere OS — Контакты (smart contacts).
 * Роуминг телефонов, имён, тегов и метаданных. Быстрый звонок/письмо/заметка.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Phone, Mail, MessageCircle, MoreVertical, Trash2,
  Search, Star, User as UserIcon, StickyNote, X, Pencil, Save,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  role: string;
  note: string;
  favorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ContactsProps {
  accentColor: string;
}

const DEFAULT_TAGS = ['Работа', 'Семья', 'Друзья', 'Учёба'];

export default function Contacts({ accentColor }: ContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('ns_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      { id: 'c1', name: 'Анна Смирнова', phone: '+7 900 123-45-67', email: 'anna@example.com', company: 'NoteSphere', role: 'Дизайнер', note: 'Ревью макетов по средам', favorite: true, tags: ['Работа'], createdAt: '', updatedAt: '' },
      { id: 'c2', name: 'Иван Петров', phone: '+7 911 999-11-22', email: 'ivan@example.com', company: 'ГБУ №2', role: 'Врач', note: 'Запись в клинику — приоритетно', favorite: true, tags: ['Здоровье', 'Семья'], createdAt: '', updatedAt: '' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('ns_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [draft, setDraft] = useState<Partial<Contact>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const filtered = contacts.filter(c => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.phone, c.company, c.role, c.note, ...(c.tags || [])].join(' ').toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.name.localeCompare(b.name));

  const startNew = () => {
    setEditing(null);
    setDraft({ name: '', phone: '', email: '', company: '', role: '', note: '', tags: [] });
    setShowForm(true);
    setMenuFor(null);
  };

  const startEdit = (c: Contact) => {
    setEditing(c);
    setDraft({ ...c, tags: [...(c.tags || [])] });
    setShowForm(true);
    setMenuFor(null);
  };

  const saveContact = () => {
    if (!draft.name?.trim()) return;
    const now = new Date().toISOString();
    if (editing) {
      setContacts(prev => prev.map(c => c.id === editing.id ? { ...c, ...draft, updatedAt: now } : c));
    } else {
      const nc: Contact = {
        id: `contact-${Date.now()}`,
        name: draft.name,
        phone: draft.phone || '',
        email: draft.email || '',
        company: draft.company || '',
        role: draft.role || '',
        note: draft.note || '',
        favorite: !!draft.favorite,
        tags: draft.tags || [],
        createdAt: now,
        updatedAt: now,
      };
      setContacts(prev => [nc, ...prev]);
    }
    triggerHaptic('success');
    setShowForm(false);
    setEditing(null);
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    setMenuFor(null);
    triggerHaptic('medium');
  };

  const toggleFav = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c));
    triggerHaptic('light');
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  };

  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#f43f5e'];

  const setTag = (tag: string) => {
    const tags = draft.tags || [];
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setDraft({ ...draft, tags: next });
  };

  return (
    <div className="h-full flex flex-col space-y-4 pr-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 glass">
        <div>
          <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display text-gradient-accent">
            <Users className="w-4 h-4 text-indigo-500" />
            Контакты
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Умная книга контактов: быстрые звонки, письма и заметки по каждому человеку. ({contacts.length})
          </p>
        </div>
        <button
          id="contact-add-btn"
          onClick={startNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="w-4 h-4" /> Контакт
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, телефону, тегу или заметке..."
          className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Contact Cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Контакты не найдены. Добавьте первый контакт кнопкой выше.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 pb-4 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {sorted.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="relative bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 glass p-4 hover:border-indigo-500/30 transition group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
                    style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{c.name}</span>
                      <button
                        onClick={() => toggleFav(c.id)}
                        className={`transition ${c.favorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      >
                        <Star className={`w-3.5 h-3.5 ${c.favorite ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                    {c.company && c.role && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {c.role} · {c.company}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuFor(menuFor === c.id ? null : c.id)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {menuFor === c.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 top-7 z-30 w-32 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-1"
                      >
                        <button onClick={() => startEdit(c)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left">
                          <Pencil className="w-3 h-3" /> Редактировать
                        </button>
                        <button onClick={() => removeContact(c.id)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-500/10 rounded-lg text-left">
                          <Trash2 className="w-3 h-3" /> Удалить
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 space-y-1.5 text-[11px]">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-500">
                      <Phone className="w-3 h-3 text-indigo-500" /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-500 truncate">
                      <Mail className="w-3 h-3 text-rose-400" /> {c.email}
                    </a>
                  )}
                  {c.note && (
                    <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                      <StickyNote className="w-3 h-3 text-amber-400 mt-0.5" /> <span className="italic line-clamp-2">{c.note}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {(c.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {(c.tags || []).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick action bar */}
                <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: accentColor }}>
                      <Phone className="w-3 h-3" /> Звонок
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 hover:border-indigo-400">
                      <Mail className="w-3 h-3" /> Письмо
                    </a>
                  )}
                  <button onClick={() => startEdit(c)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:hover:text-white">
                    <MessageCircle className="w-3 h-3" /> Заметка
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-20 px-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ y: -20, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -16, scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-5 font-sans"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + '22', color: accentColor }}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white font-display">{editing ? 'Редактировать контакт' : 'Новый контакт'}</span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Имя*" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} className="col-span-2" />
                <Field label="Телефон" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
                <Field label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
                <Field label="Компания" value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} />
                <Field label="Должность" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} />
                <label className="col-span-2">
                  <span className="text-[10px] text-slate-400 block mb-1">Заметка</span>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 resize-none"
                    placeholder="Полезные детали о человеке..."
                  />
                </label>
              </div>

              <div className="mt-3">
                <span className="text-[10px] text-slate-400 block mb-1.5">Теги</span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTag(tag)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${(draft.tags || []).includes(tag) ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 mt-3 text-[11px] text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!draft.favorite} onChange={(e) => setDraft({ ...draft, favorite: e.target.checked })} className="accent-amber-500" />
                Добавить в избранное
              </label>

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition">
                  Отмена
                </button>
                <button
                  onClick={saveContact}
                  disabled={!draft.name?.trim()}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Save className="w-3.5 h-3.5" /> {editing ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, className, type = 'text' }: any) {
  return (
    <label className={className}>
      <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1"
      />
    </label>
  );
}