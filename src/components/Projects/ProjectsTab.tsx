/**
 * NoteSphere OS — ProjectsTab
 * Main Projects entry point.
 * Level 1: Projects List with Filters (Все, Активные, Завершённые, Архив),
 * Search, and View switchers (Карточки, Список, Kanban, Timeline).
 * Level 2: Deep Project Hub workspace.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Columns,
  Calendar,
  Filter,
  CheckCircle2,
  Archive,
  ArrowRight,
  CheckSquare,
  Notebook,
} from 'lucide-react';
import { Project, Task, Note, FinancialTransaction, ProjectStatus } from '../../types';
import ProjectCard from './ProjectCard';
import ProjectKanbanView from './ProjectKanbanView';
import ProjectTimelineView from './ProjectTimelineView';
import ProjectHub from './ProjectHub';
import ProjectCreateModal from './ProjectCreateModal';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectsTabProps {
  projects: Project[];
  onAddProject: (p: Project) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  tasks: Task[];
  onAddTask: (t: Task) => void;
  onUpdateTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  notes: Note[];
  onAddNote: (n: Note) => void;
  onSelectNote: (id: string) => void;
  transactions: FinancialTransaction[];
  onAddTransaction: (tx: FinancialTransaction) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  currency?: string;
  accentColor?: string;
}

type ViewMode = 'cards' | 'list' | 'kanban' | 'timeline';
type FilterStatus = 'all' | 'active' | 'completed' | 'archived';

export default function ProjectsTab({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  notes,
  onAddNote,
  onSelectNote,
  transactions,
  onAddTransaction,
  activeProjectId,
  setActiveProjectId,
  currency = 'rub',
  accentColor = '#8b5cf6',
}: ProjectsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Active project object
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // Filtered projects for Level 1
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status filter
      if (filterStatus === 'active') {
        if (p.archived || p.status === 'completed') return false;
      } else if (filterStatus === 'completed') {
        if (p.status !== 'completed' || p.archived) return false;
      } else if (filterStatus === 'archived') {
        if (!p.archived) return false;
      } else {
        // 'all' hides archived by default
        if (p.archived) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesGoal = p.targetGoal?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesGoal) return false;
      }

      return true;
    });
  }, [projects, filterStatus, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setIsCreateModalOpen(true);
  };

  // Toggle Archive
  const handleToggleArchive = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      onUpdateProject({ ...proj, archived: !proj.archived });
      triggerHaptic('light');
    }
  };

  // If inside Level 2 (Project Hub)
  if (activeProject) {
    return (
      <ProjectHub
        project={activeProject}
        onBack={() => setActiveProjectId(null)}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
        onOpenEditModal={handleOpenEdit}
        tasks={tasks}
        onAddTask={onAddTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        notes={notes}
        onAddNote={onAddNote}
        onSelectNote={onSelectNote}
        transactions={transactions}
        onAddTransaction={onAddTransaction}
        currency={currency}
        accentColor={accentColor}
      />
    );
  }

  // Otherwise render Level 1: Projects List
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#090b10] text-slate-900 dark:text-slate-200 select-none pb-12">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#0e1422] border-b border-slate-200 dark:border-[#1e2638] px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Title & + New Project Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <Folder size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Проекты
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Рабочие пространства для задач, заметок, холста, финансов и AI
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
              triggerHaptic('light');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Новый проект</span>
          </button>
        </div>

        {/* Row 2: Status Tabs, Search & View Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Tabs: [Все] [Активные] [Завершённые] [Архив] */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#090b10] p-1 rounded-xl border border-slate-200 dark:border-[#1e2638]">
            {[
              { id: 'all' as const, label: 'Все' },
              { id: 'active' as const, label: 'Активные' },
              { id: 'completed' as const, label: 'Завершённые' },
              { id: 'archived' as const, label: 'Архив' },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id);
                    triggerHaptic('light');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#151c2c] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-xs relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по проектам..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-100 dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* View Mode Switcher: Карточки | Список | Kanban | Timeline */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#090b10] p-1 rounded-xl border border-slate-200 dark:border-[#1e2638]">
            {[
              { id: 'cards' as const, label: 'Карточки', icon: LayoutGrid },
              { id: 'list' as const, label: 'Список', icon: ListIcon },
              { id: 'kanban' as const, label: 'Kanban', icon: Columns },
              { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
            ].map((v) => {
              const IconComponent = v.icon;
              const isActive = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setViewMode(v.id);
                    triggerHaptic('light');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#151c2c] text-slate-900 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={v.label}
                >
                  <IconComponent size={14} />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {filteredProjects.length === 0 ? (
          <div className="max-w-md mx-auto my-16 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-8 text-center space-y-3 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mx-auto">
              <Folder size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Проекты не найдены</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery
                ? `По запросу «${searchQuery}» ничего не найдено.`
                : 'Создайте свой первый проект для объединения заметок, задач и финансов!'}
            </p>
            <button
              onClick={() => {
                setEditingProject(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Создать проект</span>
            </button>
          </div>
        ) : (
          <>
            {/* VIEW 1: CARDS / GRID */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasks={tasks}
                    notes={notes}
                    onOpen={(id) => setActiveProjectId(id)}
                    onEdit={handleOpenEdit}
                    onDelete={onDeleteProject}
                    onToggleArchive={handleToggleArchive}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            )}

            {/* VIEW 2: COMPACT LIST */}
            {viewMode === 'list' && (
              <div className="max-w-5xl mx-auto bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-[#1e2638] shadow-md">
                {filteredProjects.map((project) => {
                  const projectTasks = tasks.filter((t) => t.projectId === project.id || t.category === project.name);
                  const completed = projectTasks.filter((t) => t.isCompleted).length;
                  const total = projectTasks.length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveProjectId(project.id);
                      }}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{project.icon || '📁'}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {project.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                            {project.targetGoal || project.description || 'Без описания'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">{percent}%</span>
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-[#151c2c] rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: project.color || accentColor }}
                            />
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden md:inline">
                          {completed}/{total} задач
                        </span>

                        <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW 3: KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <ProjectKanbanView
                projects={filteredProjects}
                tasks={tasks}
                onOpenProject={(id) => setActiveProjectId(id)}
                onUpdateProjectStatus={(id, newStatus) => {
                  const p = projects.find((proj) => proj.id === id);
                  if (p) onUpdateProject({ ...p, status: newStatus });
                }}
                onNewProjectInStatus={(status) => {
                  setEditingProject({
                    id: `proj-${Date.now()}`,
                    name: '',
                    description: '',
                    icon: '🚀',
                    color: '#6366f1',
                    status,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  setIsCreateModalOpen(true);
                }}
                accentColor={accentColor}
              />
            )}

            {/* VIEW 4: TIMELINE */}
            {viewMode === 'timeline' && (
              <div className="max-w-6xl mx-auto">
                <ProjectTimelineView
                  projects={filteredProjects}
                  tasks={tasks}
                  onOpenProject={(id) => setActiveProjectId(id)}
                  accentColor={accentColor}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Project Create / Edit Modal */}
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={(savedProject) => {
          const exists = projects.some((p) => p.id === savedProject.id);
          if (exists) {
            onUpdateProject(savedProject);
          } else {
            onAddProject(savedProject);
          }
        }}
        initialProject={editingProject}
        accentColor={accentColor}
      />
    </div>
  );
}
