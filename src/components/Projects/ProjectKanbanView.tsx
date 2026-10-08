/**
 * NoteSphere OS — ProjectKanbanView
 * Groups projects across the 6 lifecycle stages:
 * 💡 Идея → 📝 Планирование → 🔨 В работе → ⏸ На паузе → 🚀 Запуск → ✅ Завершён
 */

import React from 'react';
import { Plus, ChevronLeft, ChevronRight, CheckSquare, Calendar } from 'lucide-react';
import { Project, Task, ProjectStatus } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectKanbanViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenProject: (projectId: string) => void;
  onUpdateProjectStatus: (projectId: string, newStatus: ProjectStatus) => void;
  onNewProjectInStatus: (status: ProjectStatus) => void;
  accentColor?: string;
}

const KANBAN_COLUMNS: { id: ProjectStatus; title: string; icon: string; border: string; bg: string }[] = [
  { id: 'idea', title: 'Идея', icon: '💡', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  { id: 'planning', title: 'Планирование', icon: '📝', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  { id: 'in_progress', title: 'В работе', icon: '🔨', border: 'border-indigo-500/30', bg: 'bg-indigo-500/5' },
  { id: 'paused', title: 'На паузе', icon: '⏸', border: 'border-slate-500/30', bg: 'bg-slate-500/5' },
  { id: 'launch', title: 'Запуск', icon: '🚀', border: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  { id: 'completed', title: 'Завершён', icon: '✅', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
];

const ORDERED_STATUSES: ProjectStatus[] = ['idea', 'planning', 'in_progress', 'paused', 'launch', 'completed'];

export default function ProjectKanbanView({
  projects,
  tasks,
  onOpenProject,
  onUpdateProjectStatus,
  onNewProjectInStatus,
  accentColor = '#8b5cf6',
}: ProjectKanbanViewProps) {
  const getPrevStatus = (current: ProjectStatus): ProjectStatus | null => {
    const idx = ORDERED_STATUSES.indexOf(current);
    return idx > 0 ? ORDERED_STATUSES[idx - 1] : null;
  };

  const getNextStatus = (current: ProjectStatus): ProjectStatus | null => {
    const idx = ORDERED_STATUSES.indexOf(current);
    return idx < ORDERED_STATUSES.length - 1 ? ORDERED_STATUSES[idx + 1] : null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 select-none min-h-[550px] scrollbar-thin">
      {KANBAN_COLUMNS.map((col) => {
        const colProjects = projects.filter((p) => p.status === col.id);

        return (
          <div
            key={col.id}
            className="w-72 shrink-0 bg-slate-50 dark:bg-[#090b10] border border-slate-200 dark:border-[#1e2638] rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#0d111a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{col.icon}</span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wide">{col.title}</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1e2638] text-slate-600 dark:text-slate-300">
                  {colProjects.length}
                </span>
              </div>
              <button
                onClick={() => onNewProjectInStatus(col.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                title={`Добавить проект в "${col.title}"`}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Column Body / Cards */}
            <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
              {colProjects.length === 0 ? (
                <div className="h-28 border border-dashed border-slate-200 dark:border-[#1e2638] rounded-xl flex items-center justify-center text-center p-3">
                  <span className="text-[11px] text-slate-400 font-medium">Нет проектов</span>
                </div>
              ) : (
                colProjects.map((project) => {
                  const projectTasks = tasks.filter(
                    (t) => t.projectId === project.id || t.category === project.name
                  );
                  const completed = projectTasks.filter((t) => t.isCompleted).length;
                  const total = projectTasks.length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  const prev = getPrevStatus(project.status);
                  const next = getNextStatus(project.status);

                  return (
                    <div
                      key={project.id}
                      onClick={() => onOpenProject(project.id)}
                      className="group bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-400 dark:hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 cursor-pointer transition shadow-sm hover:shadow-md"
                    >
                      {/* Top line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{project.icon || '📁'}</span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {project.name}
                          </h4>
                        </div>
                      </div>

                      {/* Goal / Description snippet */}
                      {project.targetGoal && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          🎯 {project.targetGoal}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <CheckSquare size={11} className="text-indigo-500 dark:text-indigo-400" />
                            {total > 0 ? `${completed}/${total}` : '0'}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-white">{percent}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-[#151c2c] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percent}%`, backgroundColor: project.color || accentColor }}
                          />
                        </div>
                      </div>

                      {/* Footer Actions: Move Left / Right */}
                      <div
                        className="pt-2 border-t border-slate-200 dark:border-[#1e2638] flex items-center justify-between text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {prev ? (
                          <button
                            onClick={() => {
                              onUpdateProjectStatus(project.id, prev);
                              triggerHaptic('light');
                            }}
                            className="flex items-center gap-0.5 text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                            title="Сместить назад"
                          >
                            <ChevronLeft size={12} />
                            <span>Назад</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {next && (
                          <button
                            onClick={() => {
                              onUpdateProjectStatus(project.id, next);
                              triggerHaptic('light');
                            }}
                            className="flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300 font-bold px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                            title="Сместить вперед"
                          >
                            <span>Вперёд</span>
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
