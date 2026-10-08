/**
 * NoteSphere OS — Автоматический подбор квадранта Эйзенхауэра
 * по приоритету и срочности (дедлайну). Чистая функция, легко тестируется.
 */
export type Importance = 'low' | 'medium' | 'high' | 'critical';
export type Eisenhower = 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';

const DAY = 86400000;

/**
 * Возвращает рекомендуемый квадрант Эйзенхауэра.
 * @param priority важность задачи
 * @param dueDate   дедлайн YYYY-MM-DD (может быть пустым)
 * @param today     опорная дата (по умолчанию сегодня)
 */
export function autoEisenhower(
  priority: Importance,
  dueDate?: string,
  today: Date = new Date()
): Eisenhower {
  let daysLeft: number | null = null;
  if (dueDate) {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const d = new Date(dueDate + 'T00:00:00').getTime();
    daysLeft = Math.round((d - t) / DAY);
  }

  const isUrgent = daysLeft !== null && daysLeft <= 3;

  // Критично (требует немедленных действий) — всегда важно и срочно
  if (priority === 'critical' && daysLeft !== null && daysLeft <= 0) {
    return 'urgent-important';
  }

  if (priority === 'critical' || priority === 'high') {
    // Важное: срочно, если дедлайн близко, иначе — запланировать
    return isUrgent ? 'urgent-important' : 'not-urgent-important';
  }

  if (priority === 'medium') {
    // Среднее: если есть близкий дедлайн — срочно (делегировать), иначе отложить
    return isUrgent ? 'urgent-not-important' : 'not-urgent-important';
  }

  // Низкий приоритет
  return isUrgent ? 'urgent-not-important' : 'not-urgent-not-important';
}