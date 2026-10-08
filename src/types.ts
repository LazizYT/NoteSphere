/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Importance = 'low' | 'medium' | 'high' | 'critical';

export interface NoteVersion {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // 'image' | 'pdf' | 'doc' | 'audio' | 'video' | 'link'
  url: string;  // Data URL (base64) or external link
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  tags: string[];
  importance: Importance;
  color: string; // Hex or tailwind color class
  attachments: Attachment[];
  isProtected: boolean;
  versions: NoteVersion[];
  links?: string[]; // Note titles or IDs referenced via [[Wikilinks]]
  canvasPosition?: { x: number; y: number };
  dailyDate?: string; // YYYY-MM-DD for Daily Notes
  status?: 'todo' | 'in_progress' | 'done' | 'archived';
  theme?: 'default' | 'oled' | 'sepia' | 'grid' | 'dots' | 'glass';
  projectId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  subtasks: SubTask[];
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:yy
  priority: Importance;
  category: string; // 'work' | 'study' | 'home' | 'finance' | 'health' | 'personal' | string
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  progress: number; // 0 to 100
  timeBlock?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  eisenhower?: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';
  fromNoteId?: string; // ID of the note if extracted from markdown checklist
  fromNoteTitle?: string; // Title of the note containing this task
  expenseAmount?: number; // Optional attached financial expense amount
  expenseCategory?: string; // Expense category if financial
  is30DayChallenge?: boolean; // 30-day tracking challenge linked to note
  challengeStartDate?: string; // Start date YYYY-MM-DD
  description?: string;
  color?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  reminder?: string;
  tags?: string[];
  attachedFile?: string;
  taskType?: 'task' | 'subtask' | 'goal';
  projectId?: string;
}

export interface Reminder {
  id: string;
  noteId?: string;
  title: string;
  content?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  isTriggered: boolean;
  completed?: boolean;
  categoryId?: string;
}

export interface Alarm {
  id: string;
  time: string; // HH:MM
  label: string;
  isEnabled: boolean;
  volume: number; // 0 to 100
  vibrate: boolean;
  repeats: number[]; // Days of week: 0 = Sun, 1 = Mon ... 6 = Sat
  sound: string; // 'ringtone1' | 'ringtone2' | 'natural'
}

export interface StopwatchLap {
  id: string;
  lapNumber: number;
  lapTime: string; // MM:SS.CC
  totalTime: string; // MM:SS.CC
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string; // Category ID of the transaction
  comment?: string;
  projectId?: string;
}

export interface FinancialBudget {
  monthlyLimit: number;
  weeklyLimit: number;
  categoryLimits: Record<string, number>; // key: categoryName/ID, value: max amount
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  type: 'short' | 'medium' | 'long'; // short (day/week), medium (month), long (year)
  targetDate: string; // YYYY-MM-DD
  progress: number; // 0 to 100
  tasks: string[]; // Associated task IDs
  habitIds: string[]; // Associated habit IDs
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  completedDates: string[]; // YYYY-MM-DD strings
  createdAt: string;
  streak: number;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'audio' | 'video' | 'image';
  duration?: string;
  thumbnailUrl?: string;
  isFavorite?: boolean;
  album?: string;
  dimensions?: string;
  createdAt?: string;
  projectId?: string;
}

export interface PomodoroConfig {
  workTime: number; // minutes
  shortBreak: number; // minutes
  longBreak: number; // minutes
  cyclesCount: number; // cycles of work before long break
}

// ------------------- Notion & Obsidian Enhancement Types -------------------

export interface CanvasCard {
  id: string;
  type: 'note' | 'sticky' | 'media' | 'link' | 'section' | 'task' | 'group';
  noteId?: string;
  taskId?: string;
  category?: string;
  isCompleted?: boolean;
  priority?: string;
  dueDate?: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  mediaUrl?: string;
  projectId?: string;
}

export interface CanvasLink {
  id: string;
  fromId?: string;
  toId?: string;
  fromCardId?: string;
  toCardId?: string;
  label?: string;
  color?: string;
}

export interface CanvasState {
  cards: CanvasCard[];
  links: CanvasLink[];
  zoom: number;
  panX: number;
  panY: number;
}

export type DatabaseViewType = 'table' | 'kanban' | 'gallery' | 'list';

export interface DatabaseProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'status' | 'date' | 'checkbox' | 'rating';
  options?: { id: string; label: string; color: string }[];
}

// ------------------- Project OS Architecture Types -------------------

export type ProjectStatus = 'idea' | 'planning' | 'in_progress' | 'paused' | 'launch' | 'completed';

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate?: string; // YYYY-MM-DD
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  color: string; // Hex color
  status: ProjectStatus;
  startDate?: string; // YYYY-MM-DD
  deadline?: string; // YYYY-MM-DD
  targetGoal?: string; // High-level outcome description
  milestones?: ProjectMilestone[];
  budgetLimit?: number; // Target financial budget
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface AppState {
  notes: Note[];
  categories: Category[];
  tasks: Task[];
  projects?: Project[];
  reminders: Reminder[];
  alarms: Alarm[];
  transactions: FinancialTransaction[];
  budget: FinancialBudget;
  financialGoals: FinancialGoal[];
  goals: Goal[];
  habits?: Habit[];
  pomodoroConfig: PomodoroConfig;
  canvasState?: CanvasState;
}

// ------------------- V4 OS Intelligence & Command Center -------------------

export interface DayScheduleItem {
  time: string; // e.g. "09:00 - 10:30"
  taskId?: string;
  taskTitle: string;
  priority: Importance;
  category?: string;
  isCompleted?: boolean;
}

export interface PlanMyDayPayload {
  summary: string;
  items: DayScheduleItem[];
  habitsToComplete: string[];
}

export interface ProjectEcosystemPayload {
  projectName: string;
  categoryIcon?: string;
  categoryColor?: string;
  description?: string;
  hubNote: {
    title: string;
    content: string; // rich HTML/markdown with structure
    tags: string[];
  };
  tasks: Array<{
    title: string;
    priority: Importance;
    dueDate?: string;
    timeBlock?: { start: string; end: string };
    subtasks?: string[];
  }>;
  budgetAllocation?: {
    plannedAmount: number;
    expenseCategory: string;
    comment?: string;
  };
  goals?: Array<{
    name: string;
    targetDate: string;
  }>;
}

export interface CopilotAction {
  type:
    | 'create_note'
    | 'create_task'
    | 'add_transaction'
    | 'create_habit'
    | 'create_alarm'
    | 'create_reminder'
    | 'switch_tab'
    | 'set_theme'
    | 'search_app'
    | 'create_project_ecosystem'
    | 'create_project'
    | 'update_project'
    | 'plan_my_day'
    | 'apply_day_schedule';
  payload: any;
  executed?: boolean;
  actionId?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: CopilotAction[];
}


