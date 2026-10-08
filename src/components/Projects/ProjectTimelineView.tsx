/**
 * NoteSphere OS — ProjectTimelineView
 * Multi-project roadmap and timeline visualization spanning months.
 * Visualizes start dates, deadlines, milestones, and progress bars.
 */

import React from 'react';
import { Calendar, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Project, Task } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ProjectTimelineViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenProject: (projectId: string) => void;
  accentColor?: string;
}

export default function ProjectTimelineView({
  projects,
  tasks,
  onOpenProject,
  accentColor = '#8b5cf6',
}: ProjectTimelineViewProps) {
  // Define 5 consecutive calendar months around today (August - December 2026)
  const MONTHS = [
    { key: '2026-08', label: 'Август 2026', startDay: 1, days: 31 },
    { key: '2026-09', label: 'Сентябрь 2026', startDay: 1, days: 30 },
    { key: '2026-10', label: 'Октябрь 2026', startDay: 1, days: 31 },
    { key: '2026-11', label: 'Ноябрь 2026', startDay: 1, days: 30 },
    { key: '2026-12', label: 'Декабрь 2026', startDay: 1, days: 31 },
  ];

  // Timeline boundaries: August 1 to December 31 (approx 153 days)
  const TIMELINE_START = new Date('2026-08-01').getTime();
  const TIMELINE_END = new Date('2026-12-31').getTime();
  const TOTAL_DURATION = TIMELINE_END - TIMELINE_START;

  const calculateBarPosition = (startDate?: string, deadline?: string) => {
    const start = startDate ? new Date(startDate).getTime() : new Date('2026-09-01').getTime();
    const end = deadline ? new Date(deadline).getTime() : start + 30 * 24 * 60 * 60 * 1000;

    const clampedStart = Math.max(TIMELINE_START, Math.min(start, TIMELINE_END));
    const clampedEnd = Math.max(clampedStart + 5 * 24 * 60 * 60 * 1000, Math.min(end, TIMELINE_END));

    const leftPercent = ((clampedStart - TIMELINE_START) / TOTAL_DURATION) * 100;
    const widthPercent = Math.max(8, ((clampedEnd - clampedStart) / TOTAL_DURATION) * 100);

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  // Today marker (September 21, 2026)
  const today = new Date('2026-09-21').getTime();
  const todayPositionPercent = ((today - TIMELINE_START) / TOTAL_DURATION) * 100;

  return (
    <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 select-none overflow-x-auto min-w-[760px] shadow-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">Дорожная карта проектов (Timeline)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Сегодня: 21 сентября 2026</span>
        </div>
      </div>

      {/* Timeline Grid Container */}
      <div className="relative border border-slate-200 dark:border-[#1e2638] rounded-xl bg-slate-50 dark:bg-[#090b10] overflow-hidden pt-2 pb-6">
        {/* Months Header Columns */}
        <div className="flex border-b border-slate-200 dark:border-[#1e2638] pb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {MONTHS.map((m) => (
            <div key={m.key} className="flex-1 text-center border-r border-slate-200 dark:border-[#1e2638] last:border-r-0 py-1">
              {m.label}
            </div>
          ))}
        </div>

        {/* Current Day Marker Line */}
        <div
          className="absolute top-8 bottom-0 z-20 w-[2px] bg-rose-500 pointer-events-none"
          style={{ left: `${todayPositionPercent}%` }}
        >
          <div className="absolute -top-3 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded shadow">
            21 Sep
          </div>
        </div>

        {/* Project Lanes */}
        <div className="divide-y divide-slate-200 dark:divide-[#1e2638] relative z-10 pt-2">
          {projects.map((project) => {
            const projectTasks = tasks.filter(
              (t) => t.projectId === project.id || t.category === project.name
            );
            const completed = projectTasks.filter((t) => t.isCompleted).length;
            const total = projectTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const barPos = calculateBarPosition(project.startDate, project.deadline);

            return (
              <div
                key={project.id}
                onClick={() => {
                  triggerHaptic('light');
                  onOpenProject(project.id);
                }}
                className="py-3 px-3 hover:bg-slate-100 dark:hover:bg-white/5 transition flex flex-col gap-2 cursor-pointer group"
              >
                {/* Project Title Bar */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{project.icon || '📁'}</span>
                    <span className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1e2638] text-slate-700 dark:text-slate-300">
                      {percent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{project.startDate || '—'} → {project.deadline || '—'}</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Timeline Bar Lane */}
                <div className="relative h-7 w-full bg-white dark:bg-[#111622] rounded-lg border border-slate-200 dark:border-[#1e2638] overflow-hidden">
                  <div
                    className="absolute top-1 bottom-1 rounded-md transition-all flex items-center px-2 shadow-md"
                    style={{
                      left: barPos.left,
                      width: barPos.width,
                      backgroundColor: project.color || accentColor,
                    }}
                  >
                    <span className="text-[10px] font-bold text-white truncate drop-shadow">
                      {project.name}
                    </span>
                  </div>
                </div>

                {/* Milestones Preview Chips */}
                {project.milestones && project.milestones.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 pl-2">
                    {project.milestones.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] px-2 py-0.5 rounded-full"
                      >
                        {m.isCompleted ? (
                          <CheckCircle2 size={10} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        )}
                        <span>{m.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
