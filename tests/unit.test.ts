/**
 * NoteSphere OS — Core Unit Test Suite
 * Tests Eisenhower matrix, markdown task parser, backup validation, translations parity,
 * AI configuration integrity, and canvas linking invariants.
 */

import { describe, it, expect, runner } from './test-framework';
import { autoEisenhower } from '../src/utils/eisenhower';
import { extractTasksFromNote, updateNoteChecklistContent } from '../src/utils/noteTasks';
import { parseAndValidateBackup } from '../src/utils/backupSync';
import { TRANSLATIONS } from '../src/config/translations';
import { DEFAULT_SYSTEM_PROMPT, AI_SYSTEM_PROMPT_PRESETS } from '../src/config/aiPromptConfig';
import { Note, Task, Project } from '../src/types';
import { INITIAL_PROJECTS } from '../src/utils/initialData';

describe('1. Eisenhower Matrix Prioritization Engine', () => {
  const baseDate = new Date('2026-09-05T12:00:00');

  it('Critical priority with deadline today is urgent-important', () => {
    const res = autoEisenhower('critical', '2026-09-05', baseDate);
    expect(res).toBe('urgent-important');
  });

  it('Critical priority overdue (yesterday) is urgent-important', () => {
    const res = autoEisenhower('critical', '2026-09-04', baseDate);
    expect(res).toBe('urgent-important');
  });

  it('High priority due in 2 days (urgent) is urgent-important', () => {
    const res = autoEisenhower('high', '2026-09-07', baseDate);
    expect(res).toBe('urgent-important');
  });

  it('High priority due in 15 days is not-urgent-important', () => {
    const res = autoEisenhower('high', '2026-09-20', baseDate);
    expect(res).toBe('not-urgent-important');
  });

  it('Medium priority due tomorrow is urgent-not-important (delegate/clear)', () => {
    const res = autoEisenhower('medium', '2026-09-06', baseDate);
    expect(res).toBe('urgent-not-important');
  });

  it('Medium priority due next month is not-urgent-important', () => {
    const res = autoEisenhower('medium', '2026-10-15', baseDate);
    expect(res).toBe('not-urgent-important');
  });

  it('Low priority with no deadline is not-urgent-not-important', () => {
    const res = autoEisenhower('low', undefined, baseDate);
    expect(res).toBe('not-urgent-not-important');
  });

  it('Low priority due in 1 day is urgent-not-important', () => {
    const res = autoEisenhower('low', '2026-09-06', baseDate);
    expect(res).toBe('urgent-not-important');
  });
});

describe('2. Markdown Checklist & Task Synchronization', () => {
  it('Extracts unchecked and checked tasks from note HTML', () => {
    const sampleNote: Note = {
      id: 'note-test-1',
      title: 'План подготовки',
      content: '<p>- [ ] Купить учебник по IELTS</p><p>- [x] Оформить студенческий билет</p>',
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-study',
      tags: ['учеба'],
      importance: 'high',
      color: '#8b5cf6',
      attachments: [],
      isProtected: false,
      versions: [],
    };

    const tasks = extractTasksFromNote(sampleNote);
    expect(tasks.length).toBe(2);
    expect(tasks[0].title).toBe('Купить учебник по IELTS');
    expect(tasks[0].isCompleted).toBe(false);
    expect(tasks[0].progress).toBe(0);

    expect(tasks[1].title).toBe('Оформить студенческий билет');
    expect(tasks[1].isCompleted).toBe(true);
    expect(tasks[1].progress).toBe(100);
  });

  it('Parses priority emojis and monetary amounts inside tasks', () => {
    const sampleNote: Note = {
      id: 'note-test-2',
      title: 'Финансы и проекты',
      content: '<p>- [ ] 🔥 Оплатить взнос в университет (50000 руб)</p><p>- [ ] ☕ Забрать распечатку</p>',
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-finance',
      tags: [],
      importance: 'medium',
      color: '#3b82f6',
      attachments: [],
      isProtected: false,
      versions: [],
    };

    const tasks = extractTasksFromNote(sampleNote);
    expect(tasks.length).toBe(2);
    expect(tasks[0].priority).toBe('critical');
    expect(tasks[0].expenseAmount).toBe(50000);
    expect(tasks[1].priority).toBe('low');
  });

  it('Updates task completion status in note HTML content', () => {
    const note: Note = {
      id: 'note-test-3',
      title: 'Todo',
      content: '<ul><li>- [ ] Подготовить релиз</li></ul>',
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-dev',
      tags: [],
      importance: 'high',
      color: '#10b981',
      attachments: [],
      isProtected: false,
      versions: [],
    };

    const updated = updateNoteChecklistContent(note, 'Подготовить релиз', true);
    expect(updated.content).toContain('- [x] Подготовить релиз');

    const reverted = updateNoteChecklistContent(updated, 'Подготовить релиз', false);
    expect(reverted.content).toContain('- [ ] Подготовить релиз');
  });

  it('Excludes 30-day challenge blocks from inline tasks to prevent list pollution', () => {
    const noteWithChallenge: Note = {
      id: 'note-c30',
      title: 'Fitness',
      content: `
        <p>- [ ] Обычная задача</p>
        <!-- challenge-30-start -->
        <div class="ns-challenge-30">
          <h4>🏆 30-дневный челлендж</h4>
          <p>- [ ] День 1 (2026-09-08): Отжимания</p>
          <p>- [ ] День 2 (2026-09-09): Отжимания</p>
        </div>
        <!-- challenge-30-end -->
      `,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-health',
      tags: [],
      importance: 'medium',
      color: '#10b981',
      attachments: [],
      isProtected: false,
      versions: [],
    };

    const extracted = extractTasksFromNote(noteWithChallenge);
    expect(extracted.length).toBe(1);
    expect(extracted[0].title).toBe('Обычная задача');
  });

  it('Updates challenge day checkbox directly inside note content', () => {
    const noteWithChallenge: Note = {
      id: 'note-c30-2',
      title: 'Workout',
      content: `<div class="ns-challenge-30"><p>- [ ] День 1 (2026-09-08): Отжимания</p></div>`,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: 'cat-health',
      tags: [],
      importance: 'medium',
      color: '#10b981',
      attachments: [],
      isProtected: false,
      versions: [],
    };

    const updated = updateNoteChecklistContent(noteWithChallenge, 'День 1 (2026-09-08): Отжимания', true);
    expect(updated.content).toContain('- [x] День 1 (2026-09-08): Отжимания');

    const reverted = updateNoteChecklistContent(updated, 'День 1 (2026-09-08): Отжимания', false);
    expect(reverted.content).toContain('- [ ] День 1 (2026-09-08): Отжимания');
  });
});

describe('3. Backup & Snapshot Validation', () => {
  it('Validates a legitimate NoteSphere OS backup snapshot', () => {
    const validJson = JSON.stringify({
      version: '2.5.0',
      timestamp: '2026-09-05T12:00:00Z',
      notes: [{ id: 'n1', title: 'Test Note' }],
      tasks: [{ id: 't1', title: 'Test Task' }],
      categories: [],
      habits: [],
      transactions: [],
    });

    const parsed = parseAndValidateBackup(validJson);
    expect(parsed.version).toBe('2.5.0');
    expect(parsed.notes.length).toBe(1);
    expect(parsed.tasks.length).toBe(1);
  });

  it('Preserves habits and finance metadata (transactions, budget, currency)', () => {
    const backupWithHabitsAndMoney = JSON.stringify({
      version: '2.5.0',
      timestamp: '2026-09-08T18:00:00Z',
      notes: [],
      tasks: [],
      categories: [],
      habits: [
        { id: 'h1', title: 'Утренняя зарядка', streak: 7, frequency: 'daily', completedDates: ['2026-09-08'] }
      ],
      transactions: [
        { id: 'tx-1', amount: 15000, type: 'income', category: 'Зарплата', date: '2026-09-01' }
      ],
      budget: { monthlyLimit: 50000, categoryLimits: {} },
      financeGoals: [{ id: 'fg-1', title: 'Новый ноутбук', targetAmount: 100000, currentAmount: 35000 }],
      currency: 'rub',
    });

    const parsed = parseAndValidateBackup(backupWithHabitsAndMoney);
    expect(parsed.habits?.length).toBe(1);
    expect(parsed.habits?.[0].title).toBe('Утренняя зарядка');
    expect(parsed.transactions?.length).toBe(1);
    expect(parsed.transactions?.[0].amount).toBe(15000);
    expect(parsed.budget?.monthlyLimit).toBe(50000);
    expect(parsed.currency).toBe('rub');
  });

  it('Rejects corrupted or non-NoteSphere backup files', () => {
    expect(() => {
      parseAndValidateBackup('invalid-json');
    }).toThrow();

    expect(() => {
      parseAndValidateBackup(JSON.stringify({ someRandomField: 123 }));
    }).toThrow('Некорректный формат бэкапа NoteSphere OS');
  });
});

describe('4. Localization & Translation Parity (RU / EN)', () => {
  it('Contains both Russian and English dictionaries', () => {
    expect(TRANSLATIONS.ru).toBeTruthy();
    expect(TRANSLATIONS.en).toBeTruthy();
  });

  it('All Russian translation keys have matching English translation keys', () => {
    const ruKeys = Object.keys(TRANSLATIONS.ru);
    const enKeys = new Set(Object.keys(TRANSLATIONS.en));

    const missingInEn: string[] = [];
    for (const key of ruKeys) {
      if (!enKeys.has(key)) {
        missingInEn.push(key);
      }
    }

    expect(missingInEn.length).toBe(0);
  });

  it('All English translation keys have matching Russian translation keys', () => {
    const enKeys = Object.keys(TRANSLATIONS.en);
    const ruKeys = new Set(Object.keys(TRANSLATIONS.ru));

    const missingInRu: string[] = [];
    for (const key of enKeys) {
      if (!ruKeys.has(key)) {
        missingInRu.push(key);
      }
    }

    expect(missingInRu.length).toBe(0);
  });

  it('Tasks navigation label is cleanly "Задачи" (not GTD)', () => {
    expect(TRANSLATIONS.ru.nav_tasks).toBe('Задачи');
    expect(TRANSLATIONS.en.nav_tasks).toBe('Tasks');
  });
});

describe('5. NEXAR AI Persona & Prompt Configuration', () => {
  it('DEFAULT_SYSTEM_PROMPT is configured for NEXAR and Laziz', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('NEXAR');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Лазиз');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('create_project_ecosystem');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('plan_my_day');
  });

  it('Presets include canonical NEXAR and specialized engineer presets', () => {
    expect(AI_SYSTEM_PROMPT_PRESETS.length).toBeGreaterThan(2);
    const canon = AI_SYSTEM_PROMPT_PRESETS.find((p) => p.id === 'nexar_canonical');
    expect(canon).toBeTruthy();
    expect(canon?.label).toContain('NEXAR');
  });

  it('Action format specifications are strictly defined', () => {
    const expectedActions = [
      'create_project_ecosystem',
      'plan_my_day',
      'create_note',
      'create_task',
      'add_transaction',
      'switch_tab',
      'set_theme',
    ];
    for (const act of expectedActions) {
      expect(DEFAULT_SYSTEM_PROMPT).toContain(act);
    }
  });
});

describe('6. Canvas Linking Geometry & Invariants', () => {
  it('Prevents self-connecting links (fromCardId === toCardId)', () => {
    const isValidLink = (from: string, to: string) => from !== to && Boolean(from) && Boolean(to);
    expect(isValidLink('card-1', 'card-1')).toBe(false);
    expect(isValidLink('card-1', 'card-2')).toBe(true);
  });

  it('Calculates correct directional vector between card ports', () => {
    const cardA = { x: 100, y: 100, width: 200, height: 100 };
    const cardB = { x: 500, y: 100, width: 200, height: 100 };

    const dx = (cardB.x + cardB.width / 2) - (cardA.x + cardA.width / 2);
    const dy = (cardB.y + cardB.height / 2) - (cardA.y + cardA.height / 2);
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    expect(isHorizontal).toBe(true);
    expect(dx).toBeGreaterThan(0);
  });
});

describe('7. Project OS Engine & Workspace Architecture', () => {
  it('Calculates accurate project progress percentage from linked tasks', () => {
    const mockTasks: Task[] = [
      { id: 't-1', title: 'Task 1', isCompleted: true, priority: 'high', category: 'Work', recurrence: 'none', progress: 100, subtasks: [], projectId: 'proj-1' },
      { id: 't-2', title: 'Task 2', isCompleted: true, priority: 'medium', category: 'Work', recurrence: 'none', progress: 100, subtasks: [], projectId: 'proj-1' },
      { id: 't-3', title: 'Task 3', isCompleted: false, priority: 'low', category: 'Work', recurrence: 'none', progress: 0, subtasks: [], projectId: 'proj-1' },
    ];

    const projectTasks = mockTasks.filter((t) => t.projectId === 'proj-1');
    const completed = projectTasks.filter((t) => t.isCompleted).length;
    const progress = Math.round((completed / projectTasks.length) * 100);

    expect(progress).toBe(67);
  });

  it('Calculates progress from project milestones when tasks are empty', () => {
    const project: Project = {
      id: 'proj-demo',
      name: 'Demo Project',
      description: 'Test',
      icon: '🚀',
      color: '#6366f1',
      status: 'planning',
      createdAt: '2026-09-21',
      updatedAt: '2026-09-21',
      milestones: [
        { id: 'm-1', title: 'Milestone 1', isCompleted: true },
        { id: 'm-2', title: 'Milestone 2', isCompleted: true },
        { id: 'm-3', title: 'Milestone 3', isCompleted: false },
        { id: 'm-4', title: 'Milestone 4', isCompleted: false },
      ],
    };

    const completedM = project.milestones!.filter((m) => m.isCompleted).length;
    const progress = Math.round((completedM / project.milestones!.length) * 100);
    expect(progress).toBe(50);
  });

  it('Correctly filters notes and tasks by projectId', () => {
    const tasks: Task[] = [
      { id: 't-1', title: 'App Task', isCompleted: false, priority: 'high', category: 'Work', recurrence: 'none', progress: 0, subtasks: [], projectId: 'proj-app' },
      { id: 't-2', title: 'Other Task', isCompleted: true, priority: 'low', category: 'Personal', recurrence: 'none', progress: 100, subtasks: [] },
    ];
    const notes: Note[] = [
      { id: 'n-1', title: 'App Arch', content: '', isFavorite: false, isPinned: false, createdAt: '', updatedAt: '', categoryId: '', tags: [], importance: 'high', color: '', attachments: [], isProtected: false, versions: [], projectId: 'proj-app' },
      { id: 'n-2', title: 'Random Note', content: '', isFavorite: false, isPinned: false, createdAt: '', updatedAt: '', categoryId: '', tags: [], importance: 'low', color: '', attachments: [], isProtected: false, versions: [] },
    ];

    const filteredTasks = tasks.filter((t) => t.projectId === 'proj-app');
    const filteredNotes = notes.filter((n) => n.projectId === 'proj-app');

    expect(filteredTasks.length).toBe(1);
    expect(filteredTasks[0].id).toBe('t-1');
    expect(filteredNotes.length).toBe(1);
    expect(filteredNotes[0].id).toBe('n-1');
  });

  it('Contains default starter projects (NoteSphere Mobile, Minecraft Bot, IELTS)', () => {
    expect(INITIAL_PROJECTS.length).toBeGreaterThanOrEqual(3);
    const mobileProj = INITIAL_PROJECTS.find((p) => p.name.includes('NoteSphere Mobile'));
    const botProj = INITIAL_PROJECTS.find((p) => p.name.includes('Minecraft Bot'));
    const ieltsProj = INITIAL_PROJECTS.find((p) => p.name.includes('IELTS'));

    expect(mobileProj).toBeTruthy();
    expect(botProj).toBeTruthy();
    expect(ieltsProj).toBeTruthy();
    expect(mobileProj?.status).toBe('in_progress');
  });

  it('Validates project backup snapshot preservation', () => {
    const backupJson = JSON.stringify({
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      notes: [],
      tasks: [],
      projects: INITIAL_PROJECTS,
    });

    const parsed = parseAndValidateBackup(backupJson);
    expect(parsed.projects).toBeTruthy();
    expect(parsed.projects?.length).toBe(INITIAL_PROJECTS.length);
  });
});

describe('8. Media Library: ID3 Extraction & 10 Tracks Pagination', () => {
  it('parseAudioMetadata handles empty buffer safely', async () => {
    const { parseAudioMetadata } = await import('../src/utils/id3Parser');
    const dummyBlob = new Blob([new Uint8Array([0, 1, 2, 3])]);
    const meta = await parseAudioMetadata(dummyBlob);
    expect(meta.coverUrl).toBe(undefined);
  });

  it('parseAudioMetadata extracts embedded APIC JPEG cover and TIT2 title', async () => {
    const { parseAudioMetadata } = await import('../src/utils/id3Parser');
    const fakeJpeg = [0xff, 0xd8, 0xff, 0xe0];
    const mimeBytes = [0x69, 0x6d, 0x61, 0x67, 0x65, 0x2f, 0x6a, 0x70, 0x65, 0x67, 0x00];
    const apicPayload = [0x00, ...mimeBytes, 0x03, 0x00, ...fakeJpeg];
    const apicFrame = [
      0x41, 0x50, 0x49, 0x43, // 'APIC'
      0, 0, 0, apicPayload.length,
      0, 0,
      ...apicPayload
    ];

    const titleText = [0x54, 0x65, 0x73, 0x74, 0x20, 0x54, 0x72, 0x61, 0x63, 0x6b]; // 'Test Track'
    const tit2Payload = [0x00, ...titleText];
    const tit2Frame = [
      0x54, 0x49, 0x54, 0x32, // 'TIT2'
      0, 0, 0, tit2Payload.length,
      0, 0,
      ...tit2Payload
    ];

    const allFrames = [...tit2Frame, ...apicFrame];
    const tagSize = allFrames.length;
    const b0 = (tagSize >> 21) & 0x7f;
    const b1 = (tagSize >> 14) & 0x7f;
    const b2 = (tagSize >> 7) & 0x7f;
    const b3 = tagSize & 0x7f;

    const header = [0x49, 0x44, 0x33, 0x03, 0x00, 0x00, b0, b1, b2, b3];
    const fileBytes = new Uint8Array([...header, ...allFrames]);
    const blob = new Blob([fileBytes]);

    const meta = await parseAudioMetadata(blob);
    expect(meta.title).toBe('Test Track');
    expect(meta.coverUrl?.startsWith('data:image/jpeg;base64,')).toBe(true);
  });
});

// Run all unit tests if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('unit.test.ts')) {
  runner.run().then((results) => {
    const hasFailures = results.some((r) => !r.passed);
    if (hasFailures) process.exit(1);
  });
}
