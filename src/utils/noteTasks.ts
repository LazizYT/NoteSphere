/**
 * NoteSphere OS — Inline Note Tasks Synchronizer
 * Parses `- [ ]` and `- [x]` markdown checklists inside notes,
 * exposes them in the global Task system and Kanban board,
 * and syncs completion status back into the note content.
 */

import { Note, Task, Importance } from '../types';

export function extractTasksFromNote(note: Note): Task[] {
  if (!note.content) return [];

  // Exclude 30-day challenge blocks so their days don't clutter the top-level inline tasks
  const strippedContent = note.content
    .replace(/<!--\s*challenge-30-start\s*-->[\s\S]*?<!--\s*challenge-30-end\s*-->/gi, '')
    .replace(/<div[^>]*class=["'][^"']*ns-challenge-30[^"']*["'][\s\S]*?<\/div>/gi, '');

  // Plain text representation by converting html entities and line breaks
  const raw = strippedContent
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const lines = raw.split('\n');
  const extracted: Task[] = [];

  const checkboxRegex = /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/;

  lines.forEach((line, idx) => {
    const match = line.match(checkboxRegex);
    if (match) {
      const isCompleted = match[1].toLowerCase() === 'x';
      const fullTitle = match[2].trim();

      // Check if there is an expense mentioned e.g. "(50000 сум)" or "($100)"
      let expenseAmount: number | undefined = undefined;
      const moneyMatch = fullTitle.match(/\(?\$?(\d[\d\s.,]*)\s*(?:сум|usd|\$|krw|руб)?\)?/i);
      if (moneyMatch) {
        const cleaned = moneyMatch[1].replace(/\s/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed) && parsed > 0 && parsed < 1000000000) {
          expenseAmount = parsed;
        }
      }

      // Priority detection from emoji or tags
      let priority: Importance = 'medium';
      if (fullTitle.includes('🔥') || fullTitle.includes('#срочно') || fullTitle.includes('!crit')) {
        priority = 'critical';
      } else if (fullTitle.includes('⚡') || fullTitle.includes('#важно') || fullTitle.includes('!high')) {
        priority = 'high';
      } else if (fullTitle.includes('☕') || fullTitle.includes('#низкий') || fullTitle.includes('!low')) {
        priority = 'low';
      }

      extracted.push({
        id: `inline-${note.id}-${idx}`,
        title: fullTitle,
        isCompleted,
        subtasks: [],
        priority,
        category: note.categoryId || 'Общее',
        recurrence: 'none',
        progress: isCompleted ? 100 : 0,
        fromNoteId: note.id,
        fromNoteTitle: note.title || 'Без названия',
        expenseAmount,
        expenseCategory: expenseAmount ? 'Техника' : undefined,
      });
    }
  });

  return extracted;
}

export function extractAllInlineTasks(notes: Note[]): Task[] {
  const all: Task[] = [];
  notes.forEach((note) => {
    all.push(...extractTasksFromNote(note));
  });
  return all;
}

export function updateNoteChecklistContent(
  note: Note,
  taskTitle: string,
  isCompleted: boolean
): Note {
  if (!note.content) return note;

  const targetBox = isCompleted ? '[x]' : '[ ]';
  const oppositeBox = isCompleted ? '\\[ \\]' : '\\[[xX]\\]';

  // Escape special regex characters in taskTitle
  const escapedTitle = taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`([-*]\\s*)${oppositeBox}(\\s*${escapedTitle})`, 'i');

  let newContent = note.content;
  if (regex.test(newContent)) {
    newContent = newContent.replace(regex, `$1${targetBox}$2`);
  } else {
    // If not found directly, try looser match on first 20 characters
    const shortTitle = taskTitle.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const looseRegex = new RegExp(`([-*]\\s*)${oppositeBox}(\\s*${shortTitle}[^<\n]*)`, 'i');
    newContent = newContent.replace(looseRegex, `$1${targetBox}$2`);
  }

  return {
    ...note,
    content: newContent,
    updatedAt: new Date().toISOString(),
  };
}
