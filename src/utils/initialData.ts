/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Category, Task, Reminder, Alarm, FinancialTransaction, FinancialBudget, FinancialGoal, Goal, Habit, PomodoroConfig, Project } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-work', name: 'Работа', icon: 'Briefcase', color: '#3b82f6' },
  { id: 'cat-study', name: 'Учеба', icon: 'GraduationCap', color: '#10b981' },
  { id: 'cat-home', name: 'Дом', icon: 'Home', color: '#8b5cf6' },
  { id: 'cat-finance', name: 'Финансы', icon: 'DollarSign', color: '#f59e0b' },
  { id: 'cat-health', name: 'Здоровье', icon: 'Heart', color: '#ef4444' },
  { id: 'cat-personal', name: 'Личное', icon: 'User', color: '#ec4899' },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-notesphere-mobile',
    name: 'NoteSphere Mobile',
    description: 'Кроссплатформенный мобильный клиент NoteSphere с полной поддержкой офлайн-режима и синхронизации.',
    icon: '🟣',
    color: '#8b5cf6',
    status: 'in_progress',
    startDate: '2026-09-01',
    deadline: '2026-10-12',
    targetGoal: 'Выпустить стабильный релиз в Google Play и App Store с офлайн-заметками и виджетами.',
    milestones: [
      { id: 'm-ns-1', title: 'Android build setup & SQLite schema', isCompleted: true, targetDate: '2026-09-10' },
      { id: 'm-ns-2', title: 'Push notifications & background sync', isCompleted: true, targetDate: '2026-09-18' },
      { id: 'm-ns-3', title: 'Оптимизация сенсорных жестов и холста', isCompleted: true, targetDate: '2026-09-22' },
      { id: 'm-ns-4', title: 'Google Play Release Candidate APK', isCompleted: false, targetDate: '2026-10-05' },
      { id: 'm-ns-5', title: 'Публикация в App Store & TestFlight', isCompleted: false, targetDate: '2026-10-12' },
    ],
    budgetLimit: 45000,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-21T10:00:00.000Z',
  },
  {
    id: 'proj-minecraft-bot',
    name: 'Minecraft Bot',
    description: 'Автономный помощник для игрового сервера на базе LLM Gemini с админ-панелью и очередью Telegram.',
    icon: '🤖',
    color: '#10b981',
    status: 'planning',
    startDate: '2026-09-15',
    deadline: '2026-10-30',
    targetGoal: '24/7 автономная работа бота с интеллектуальной модерацией и голосовыми командами.',
    milestones: [
      { id: 'm-mc-1', title: 'Архитектура WebSocket & протокол пакетов', isCompleted: true, targetDate: '2026-09-19' },
      { id: 'm-mc-2', title: 'Исправить Telegram queue обработку', isCompleted: false, targetDate: '2026-09-26' },
      { id: 'm-mc-3', title: 'Интеграция Gemini AI reasoning', isCompleted: false, targetDate: '2026-10-08' },
      { id: 'm-mc-4', title: 'Web Dashboard & Admin panel', isCompleted: false, targetDate: '2026-10-18' },
      { id: 'm-mc-5', title: 'Деплой контейнера на Railway Cloud', isCompleted: false, targetDate: '2026-10-30' },
    ],
    budgetLimit: 15000,
    createdAt: '2026-09-15T09:00:00.000Z',
    updatedAt: '2026-09-21T11:00:00.000Z',
  },
  {
    id: 'proj-ielts-prep',
    name: 'IELTS 8.0 Prep',
    description: 'Комплексный курс подготовки к сдаче экзамена IELTS: эссе Task 2, идиомы C1/C2 и аудирование.',
    icon: '🔵',
    color: '#06b6d4',
    status: 'in_progress',
    startDate: '2026-08-25',
    deadline: '2026-12-13',
    targetGoal: 'Получить общий сертификат IELTS Academic не менее 8.0 баллов.',
    milestones: [
      { id: 'm-ie-1', title: '15 тестов Cambridge IELTS 17-19', isCompleted: true, targetDate: '2026-09-15' },
      { id: 'm-ie-2', title: '30 эссе Task 2 с детальным анализом', isCompleted: false, targetDate: '2026-10-25' },
      { id: 'm-ie-3', title: 'Финальный пробный экзамен Mock Test', isCompleted: false, targetDate: '2026-11-28' },
      { id: 'm-ie-4', title: 'Официальный экзамен в тест-центре', isCompleted: false, targetDate: '2026-12-13' },
    ],
    budgetLimit: 32000,
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-09-21T12:00:00.000Z',
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-ns-arch',
    title: 'Mobile Architecture & Offline-First',
    content: '<h2>Архитектура NoteSphere Mobile</h2><p>Используем локальный IndexedDB/SQLite для всех мутаций, с последующим фоновым разрешением конфликтов.</p><ul><li>Оптимистичный UI рендеринг</li><li>Фоновые воркеры для синхронизации</li><li>Хранение медиафайлов через FileSystem API</li></ul>',
    isFavorite: true,
    isPinned: true,
    createdAt: '2026-09-05T10:00:00.000Z',
    updatedAt: '2026-09-20T14:30:00.000Z',
    categoryId: 'cat-work',
    tags: ['mobile', 'architecture', 'react-native'],
    importance: 'high',
    color: '#8b5cf6',
    attachments: [],
    isProtected: false,
    versions: [],
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'note-ns-ui',
    title: 'UI Ideas & Touch Interactions',
    content: '<h2>Концепт мобильного интерфейса</h2><p>Нижний бар с тактильным откликом haptic feedback, свайпы для быстрого закрытия задач и плавающий таймер Pomodoro.</p>',
    isFavorite: false,
    isPinned: false,
    createdAt: '2026-09-12T11:20:00.000Z',
    updatedAt: '2026-09-19T16:00:00.000Z',
    categoryId: 'cat-work',
    tags: ['ui', 'design', 'ux'],
    importance: 'medium',
    color: '#8b5cf6',
    attachments: [],
    isProtected: false,
    versions: [],
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'note-mc-bot-arch',
    title: 'Minecraft Bot: Схема сокетов и события',
    content: '<h2>Архитектура ядра бота</h2><p>Модульная система плагинов: ChatManager, QueueDispatcher, LLMExecutor. Обмен событиями через EventEmitter3.</p>',
    isFavorite: true,
    isPinned: false,
    createdAt: '2026-09-16T15:00:00.000Z',
    updatedAt: '2026-09-20T17:10:00.000Z',
    categoryId: 'cat-work',
    tags: ['bot', 'architecture', 'sockets'],
    importance: 'high',
    color: '#10b981',
    attachments: [],
    isProtected: false,
    versions: [],
    projectId: 'proj-minecraft-bot',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-ns-1',
    title: 'Настроить Android build & Gradle оптимизацию',
    isCompleted: true,
    subtasks: [
      { id: 'st-1', title: 'Конфигурация signing key', isCompleted: true },
      { id: 'st-2', title: 'Минификация ProGuard', isCompleted: true },
    ],
    dueDate: '2026-09-10',
    priority: 'high',
    category: 'Работа',
    recurrence: 'none',
    progress: 100,
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'task-ns-2',
    title: 'Подключить Push Notifications (Firebase FCM)',
    isCompleted: true,
    subtasks: [],
    dueDate: '2026-09-18',
    priority: 'high',
    category: 'Работа',
    recurrence: 'none',
    progress: 100,
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'task-ns-3',
    title: 'Офлайн кэширование заметок и задач в IndexedDB',
    isCompleted: true,
    subtasks: [],
    dueDate: '2026-09-20',
    priority: 'critical',
    category: 'Работа',
    recurrence: 'none',
    progress: 100,
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'task-ns-4',
    title: 'Подготовка графики и скриншотов для Google Play',
    isCompleted: false,
    subtasks: [
      { id: 'st-3', title: 'Скриншоты светлой и тёмной темы', isCompleted: false },
      { id: 'st-4', title: 'Баннер 1024x500 px', isCompleted: false },
    ],
    dueDate: '2026-10-02',
    priority: 'high',
    category: 'Работа',
    recurrence: 'none',
    progress: 35,
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'task-ns-5',
    title: 'Сборка релиз-кандидата APK & AAB',
    isCompleted: false,
    subtasks: [],
    dueDate: '2026-10-05',
    priority: 'critical',
    category: 'Работа',
    recurrence: 'none',
    progress: 0,
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'task-mc-1',
    title: 'Исправить Telegram queue обработку сообщений',
    isCompleted: false,
    subtasks: [],
    dueDate: '2026-09-25',
    priority: 'critical',
    category: 'Работа',
    recurrence: 'none',
    progress: 40,
    projectId: 'proj-minecraft-bot',
  },
  {
    id: 'task-mc-2',
    title: 'Подключить Gemini API для генерации ответов в чате',
    isCompleted: false,
    subtasks: [],
    dueDate: '2026-10-02',
    priority: 'high',
    category: 'Работа',
    recurrence: 'none',
    progress: 20,
    projectId: 'proj-minecraft-bot',
  },
  {
    id: 'task-mc-3',
    title: 'Собрать Web Admin Panel для управления ботом',
    isCompleted: false,
    subtasks: [],
    dueDate: '2026-10-12',
    priority: 'medium',
    category: 'Работа',
    recurrence: 'none',
    progress: 0,
    projectId: 'proj-minecraft-bot',
  },
  {
    id: 'task-mc-4',
    title: 'Deploy бота на Railway в Docker-контейнере',
    isCompleted: false,
    subtasks: [],
    dueDate: '2026-10-28',
    priority: 'medium',
    category: 'Работа',
    recurrence: 'none',
    progress: 0,
    projectId: 'proj-minecraft-bot',
  },
];

export const INITIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'tx-ns-1',
    type: 'expense',
    amount: 2500,
    date: '2026-09-08',
    categoryId: 'cat-work',
    comment: 'Google Play Console аккаунт разработчика',
    projectId: 'proj-notesphere-mobile',
  },
  {
    id: 'tx-mc-1',
    type: 'expense',
    amount: 1200,
    date: '2026-09-17',
    categoryId: 'cat-work',
    comment: 'Railway Cloud хостинг бота на месяц',
    projectId: 'proj-minecraft-bot',
  },
  {
    id: 'tx-mc-2',
    type: 'expense',
    amount: 450,
    date: '2026-09-20',
    categoryId: 'cat-work',
    comment: 'Gemini API токены для тестирования',
    projectId: 'proj-minecraft-bot',
  },
];

export const INITIAL_BUDGET: FinancialBudget = {
  monthlyLimit: 120000,
  weeklyLimit: 30000,
  categoryLimits: {}
};

export const INITIAL_FIN_GOALS: FinancialGoal[] = [];
export const INITIAL_GOALS: Goal[] = [];
export const INITIAL_REMINDERS: Reminder[] = [];
export const INITIAL_ALARMS: Alarm[] = [];

export const POMODORO_DEFAULT: PomodoroConfig = {
  workTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cyclesCount: 4
};

export const INITIAL_HABITS: Habit[] = [];

export const INITIAL_MEDIA_ITEMS: any[] = [];


