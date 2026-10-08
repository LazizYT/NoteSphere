/**
 * NoteSphere OS — ProjectCard
 * Sleek, solid, Linear-inspired card for Project List / Grid view.
 * Displays progress bar, task/note counters, deadline, status badge, and target goal.
 */

import React from 'react';
import { CheckSquare, Notebook, Calendar, Target, MoreVertical, Edit2, Archive, Trash2, ArrowRight } from 'lucide-react';
import { Project, Task, Note, ProjectStatus } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectCardProps {
  key?: string;
  project: Project;
  tasks: Task[];
  notes: Note[];
  onOpen: (projectId: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onToggleArchive: (projectId: string) => void;
  accentColor?: string;
}

const STATUS_LABELS: Record<ProjectStatus, { label: string; bg: string; text: string; border: string }> = {
  idea: { label: '💡 Идея', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  planning: { label: '📝 Планирование', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  in_progress: { label: '🔨 В работе', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  paused: { label: '⏸ На паузе', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  launch: { label: '🚀 Запуск', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  completed: { label: '✅ Завершён', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export default function ProjectCard({
  project,
  tasks,
  notes,
  onOpen,
  onEdit,
  onDelete,
  onToggleArchive,
  accentColor = '#8b5cf6',
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Filter linked tasks
  const projectTasks = tasks.filter(
    (t) => t.projectId === project.id || t.category === project.name
  );
  const completedTasks = projectTasks.filter((t) => t.isCompleted);
  const totalTasks = projectTasks.length;

  // Filter linked notes
  const projectNotes = notes.filter(
    (n) => n.projectId === project.id || n.categoryId === project.id
  );

  // Progress calculation
  let progressPercent = 0;
  if (totalTasks > 0) {
    progressPercent = Math.round((completedTasks.length / totalTasks) * 100);
  } else if (project.milestones && project.milestones.length > 0) {
    const completedM = project.milestones.filter((m) => m.isCompleted).length;
    progressPercent = Math.round((completedM / project.milestones.length) * 100);
  } else if (project.status === 'completed') {
    progressPercent = 100;
  }

  const statusConfig = STATUS_LABELS[project.status] || STATUS_LABELS.planning;

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return `До ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        onOpen(project.id);
      }}
      data-project-id={project.id}
      className="group relative bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-400 dark:hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md select-none"
    >
      {/* Top Section */}
      <div className="space-y-3">
        {/* Header: Icon, Title, Status & Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-white/10 shadow-inner"
              style={{ backgroundColor: `${project.color}20`, borderColor: `${project.color}40` }}
            >
              <span>{project.icon || '📁'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                >
                  {statusConfig.label}
                </span>
                {project.archived && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    Архив
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Context Menu Button */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Опции"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-7 z-30 w-36 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl shadow-xl py-1 text-xs text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(project);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <Edit2 size={13} className="text-indigo-500" />
                  <span>Изменить</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleArchive(project.id);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <Archive size={13} className="text-amber-500" />
                  <span>{project.archived ? 'Разархивировать' : 'В архив'}</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm(`Удалить проект «${project.name}»?`)) {
                      onDelete(project.id);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition"
                >
                  <Trash2 size={13} />
                  <span>Удалить</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description / Goal */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {project.targetGoal ? (
            <span className="text-slate-700 dark:text-slate-300 font-medium">🎯 {project.targetGoal}</span>
          ) : (
            project.description || 'Нет описания проекта'
          )}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Прогресс</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#151c2c] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: project.color || accentColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Metadata Bar */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e2638] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" title="Связанные задачи">
            <CheckSquare size={13} className="text-indigo-500" />
            <span>
              {totalTasks > 0 ? `${completedTasks.length}/${totalTasks}` : '0'}
            </span>
          </span>

          <span className="flex items-center gap-1.5" title="Заметки проекта">
            <Notebook size={13} className="text-purple-500" />
            <span>{projectNotes.length}</span>
          </span>

          {project.deadline && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400" title="Дедлайн">
              <Calendar size={12} className="text-slate-400" />
              <span>{formatDeadline(project.deadline)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider">Открыть</span>
          <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );
}
