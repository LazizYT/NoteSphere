/**
 * NoteSphere OS — Экспорт отчётов в PDF через окно печати браузера.
 * Без внешних зависимостей: собирает styled HTML и вызывает window.print(),
 * пользователь выбирает «Сохранить как PDF».
 */

interface ReportData {
  title?: string;
  tasks?: any[];
  habits?: any[];
  goals?: any[];
  notes?: any[];
  focusMinutes?: number;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (!t) return '';
      if (/^#{1,3}\s/.test(t)) return `<h3>${esc(t.replace(/^#+\s/, ''))}</h3>`;
      if (/^[-*•]\s/.test(t)) return `<li>${esc(t.replace(/^[-*•]\s/, ''))}</li>`;
      if (/^\d+[.)]\s/.test(t)) return `<li>${esc(t.replace(/^\d+[.)]\s/, ''))}</li>`;
      return `<p>${esc(t)}</p>`;
    })
    .join('\n');
}

export function openPrintWindow(title: string, bodyHTML: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1e293b; margin: 32px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 15px; color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  ul { margin: 4px 0; padding-left: 18px; }
  .ok { color: #059669; font-weight: 600; }
  .progress { display:inline-block; background:#e2e8f0; border-radius: 8px; height: 10px; width: 90px; overflow: hidden; vertical-align: middle; }
  .progress > span { display:block; height:100%; background:#2563eb; }
  footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
${bodyHTML}
<footer>Сформировано NoteSphere OS · ${new Date().toLocaleDateString('ru-RU')}</footer>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

export function buildReportHTML(data: ReportData): string {
  const tasks = data.tasks || [];
  const habits = data.habits || [];
  const goals = data.goals || [];
  const notes = data.notes || [];

  const done = tasks.filter((t: any) => t.isCompleted).length;

  const rows = tasks
    .map((t: any) => {
      const prio = t.priority || 'medium';
      const color = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' }[prio] || '#3b82f6';
      return `<tr>
        <td><span style="color:${color}">●</span> ${esc(t.title)}</td>
        <td>${esc(t.category || '—')}</td>
        <td>${esc(t.dueDate || t.due || '—')}</td>
        <td class="${t.isCompleted ? 'ok' : ''}">${t.isCompleted ? 'выполнено' : 'в работе'}</td>
      </tr>`;
    })
    .join('');

  const habitRows = habits
    .map((h: any) => `<tr><td>${esc(h.icon || '')} ${esc(h.title)}</td><td>${(h.completedDates || []).length}</td><td>серия: ${h.streak || 0} дн.</td></tr>`)
    .join('');

  const goalRows = goals
    .map((g: any) => {
      const p = Math.max(0, Math.min(100, Number(g.progress) || 0));
      return `<tr><td>${esc(g.name)}</td><td>${esc(g.type || 'short')}</td><td>${esc(g.targetDate || '—')}</td><td><span class="progress"><i style="width:${p}%"></i></span> ${p}%</td></tr>`;
    })
    .join('');

  return `
  <h1>Отчет по продуктивности</h1>
  <div class="sub">${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>

  <div class="section">
    <h2>Задачи (${tasks.length}; выполнено ${done})</h2>
    ${tasks.length ? `<table><tr><th>Задача</th><th>Категория</th><th>Срок</th><th>Статус</th></tr>${rows}</table>` : '<p>Нет задач.</p>'}
  </div>

  <div class="section">
    <h2>Привычки</h2>
    ${habits.length ? `<table><tr><th>Привычка</th><th>Выполнений</th><th>Серия</th></tr>${habitRows}</table>` : '<p>Привычки не добавлены.</p>'}
  </div>

  <div class="section">
    <h2>Цели</h2>
    ${goals.length ? `<table><tr><th>Цель</th><th>Тип</th><th>Дедлайн</th><th>Прогресс</th></tr>${goalRows}</table>` : '<p>Целей нет.</p>'}
  </div>

  ${data.focusMinutes ? `<div class="section"><h2>Фокус-время</h2><p>Всего минут сфокусированной работы: <b>${data.focusMinutes}</b> (~${Math.round(data.focusMinutes / 60)} ч).</p></div>` : ''}
  `;
}

// Open the prepared report straight away (convenience wrapper)
export function openReportAsPdf(data: ReportData): void {
  openPrintWindow('NoteSphere · Отчет', buildReportHTML(data));
}