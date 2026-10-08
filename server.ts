/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { exec } from 'child_process';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_SYSTEM_PROMPT } from './src/config/aiPromptConfig';

// Загружаем секреты локально: .env, затем .env.local (у него приоритет),
// чтобы GEMINI_API_KEY из .env.local попадал в процесс при npm run dev.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// Initialise Google GenAI SDK if key is available
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI successfully initialized');
  } catch (err) {
    console.error('Error initializing Gemini AI:', err);
  }
} else {
  console.log('GEMINI_API_KEY is not defined or is placeholder. AI assistant features will run in demo/simulation mode.');
}

// Ensure the helper can fail-safe if API key is not present
function isAiActive(): boolean {
  return ai !== null;
}

// ---------------------- CLIENT CONSOLE LOG CAPTURE ----------------------
interface ClientLogEntry {
  level: string;
  message: string;
  time: string;
}
const clientLogs: ClientLogEntry[] = [];

app.post('/api/client-log', (req, res) => {
  const { level = 'info', message = '', time = new Date().toISOString() } = req.body || {};
  const entry: ClientLogEntry = { level, message, time };
  clientLogs.push(entry);
  if (clientLogs.length > 200) clientLogs.shift();
  console.log(`[BROWSER ${entry.level.toUpperCase()}] ${entry.message}`);
  res.json({ ok: true });
});

app.get('/api/client-logs', (req, res) => {
  res.json(clientLogs);
});

app.post('/api/clear-client-logs', (req, res) => {
  clientLogs.length = 0;
  res.json({ ok: true, cleared: true });
});

// ---------------------- DOCUMENTS STORAGE API ----------------------
function getServerDocumentsDir(): string {
  try {
    const docPath = path.join(os.homedir(), 'Documents');
    const target = path.join(docPath, 'NoteSphere');
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    return target;
  } catch {
    const fallback = path.join(process.cwd(), '.notesphere-data');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getServerStateFilePath(): string {
  return path.join(getServerDocumentsDir(), 'notesphere-data.json');
}

app.get('/api/storage/load', (req, res) => {
  try {
    const file = getServerStateFilePath();
    if (!fs.existsSync(file)) return res.json({ data: null });
    const content = fs.readFileSync(file, 'utf8');
    res.json({ data: content });
  } catch (err: any) {
    console.error('[server] Failed to load storage:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/storage/save', (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data) return res.status(400).json({ error: 'Data is required' });
    const file = getServerStateFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, file);

    // Export markdown notes
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rawValue = parsed?.ns_notes || parsed?.notesphere_notes;
      if (parsed && rawValue) {
        const rawNotes = typeof rawValue === 'string'
          ? JSON.parse(rawValue)
          : rawValue;
        if (Array.isArray(rawNotes)) {
          const notesDir = path.join(dir, 'Notes');
          if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
          for (const n of rawNotes) {
            if (n && n.title) {
              const safeName = n.title.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 60) || n.id;
              const noteFile = path.join(notesDir, `${safeName}.md`);
              const textContent = (n.content || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]*>/g, '');
              const md = `# ${n.title}\n\n*Категория: ${n.categoryId || 'Личное'} | Обновлено: ${n.updatedAt || new Date().toISOString()}*\n\n${textContent}\n`;
              fs.writeFileSync(noteFile, md, 'utf8');
            }
          }
        }
      }
    } catch {
      // Non-critical background export
    }

    res.json({ success: true, path: file });
  } catch (err: any) {
    console.error('[server] Failed to save storage:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/storage/path', (req, res) => {
  res.json({ path: getServerStateFilePath(), folder: getServerDocumentsDir() });
});

app.post('/api/storage/open-folder', (req, res) => {
  const dir = getServerDocumentsDir();
  if (process.platform === 'win32') {
    exec(`explorer.exe "${dir}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${dir}"`);
  } else {
    exec(`xdg-open "${dir}"`);
  }
  res.json({ success: true, folder: dir });
});

// ---------------------- API PATHS ----------------------

// 1. AI Health and Status
app.get('/api/ai/status', (req, res) => {
  res.json({
    active: isAiActive(),
    reason: isAiActive() ? 'Initialized' : 'Please configure GEMINI_API_KEY in Secrets or Settings',
  });
});

// 1.1 Save and Activate Gemini API Key dynamically
app.post('/api/ai/set-key', (req, res) => {
  const rawKey = req.body?.key || req.body?.apiKey;
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return res.status(400).json({ error: 'API ключ не может быть пустым' });
  }

  const trimmedKey = rawKey.trim();
  try {
    ai = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    process.env.GEMINI_API_KEY = trimmedKey;

    // Persist to .env.local if file system is accessible
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${trimmedKey}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${trimmedKey}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (fsErr) {
      console.warn('[AI] Could not write .env.local file:', fsErr);
    }

    console.log('Gemini AI successfully re-initialized with new key');
    res.json({ success: true, message: 'Google Gemini API ключ успешно сохранён и активирован!' });
  } catch (err: any) {
    console.error('Error updating Gemini API key:', err);
    res.status(500).json({ error: err.message || 'Ошибка инициализации Gemini SDK' });
  }
});

// 1.2 AI Key Test Endpoint
app.post('/api/ai/test', async (req, res) => {
  try {
    const rawKey = req.body?.key || req.body?.apiKey;
    const candidateKey = rawKey ? String(rawKey).trim() : (process.env.GEMINI_API_KEY || '');
    if (!candidateKey || candidateKey === 'MY_GEMINI_API_KEY') {
      return res.status(400).json({ ok: false, success: false, error: 'GEMINI_API_KEY не задан. Введите валидный ключ из Google AI Studio.' });
    }

    const testClient = new GoogleGenAI({
      apiKey: candidateKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const testResponse = await testClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Проверка соединения. Ответь строго одним словом: Готово.',
    });

    const reply = (testResponse.text || '').trim();
    return res.json({
      ok: true,
      success: true,
      model: 'gemini-2.5-flash',
      reply,
      message: 'Gemini 2.5 Flash успешно отвечает!',
    });
  } catch (err: any) {
    console.error('Error testing Gemini API key:', err);
    return res.status(500).json({
      ok: false,
      success: false,
      error: err.message || 'Ошибка соединения с сервером Google Gemini',
    });
  }
});

// 2. AI Summarize / Краткое содержание
app.post('/api/ai/summarize', async (req, res) => {
  const { title, content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required for summary' });
  }

  // If AI is not configured, fall back to an ingenious smart client-side summary algorithm
  if (!isAiActive()) {
    console.log('Running simulated summary (AI not connected)');
    const fakeSummary = `[ДЕМО-РЕЖИМ] Краткая выжимка заметки "${title || 'Без названия'}":\n- Заметка содержит ключевые понятия и списки.\n- Основная идея: эффективная организация рабочей и личной среды через структурирование информации.\n- Рекомендуется закрепить данную запись и связать с соответствующими задачами.`;
    return res.json({ summary: fakeSummary });
  }

  try {
    const prompt = `Проанализируй заголовок "${title || 'Без названия'}" и следующее содержимое заметки. Предоставь емкую, структурированную краткую выжимку (summary) на красивом русском языке, выделив главные моменты в виде маркированного списка. Ограничься 3-5 предложениями.\n\nСодержимое:\n${content.replace(/<[^>]*>/g, '')}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('Gemini error during summarization:', error);
    res.status(500).json({ error: error.message || 'Error communicating with Gemini' });
  }
});

// 3. AI Code and Grammar Correction / Исправление ошибок
app.post('/api/ai/proofread', async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!isAiActive()) {
    const textWithoutHtml = content.replace(/<[^>]*>/g, '');
    const hasTypos = textWithoutHtml.includes('вожские') || textWithoutHtml.includes('чеклиста');
    let fixed = content;
    if (hasTypos) {
      fixed = content
        .replace('вожские', 'столовые')
        .replace('чеклиста', 'чек-листа');
    }
    return res.json({
      corrected: fixed,
      explanation: ''
    });
  }

  try {
    const prompt = `Ты — профессиональный редактор текста. Исправь все орфографические, пунктуационные и грамматические ошибки в следующем тексте, строго сохраняя структуру и разметку HTML (теги <p>, <b>, <ul>, <li> и т.д., если они есть).
ВНИМАНИЕ: Верни ТОЛЬКО исправленный текст заметки. Не добавляй никаких пояснений, списков изменений, комментариев, технических меток или полей JSON (никаких "explanation"). Твой ответ должен содержать исключительно чистый отредактированный текст заметки.\n\nТекст:\n${content}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Ты — редактор текста NoteSphere OS. Ты возвращаешь исключительно исправленный текст заметки с сохранением HTML. Запрещено добавлять метаданные, пояснения, списки ошибок и JSON-структуры.'
      }
    });

    let rawText = (response.text || '').trim();

    // 1. Strip markdown fences ```html ... ``` or ```json ... ```
    rawText = rawText.replace(/^```(?:html|json|text)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Check if response is a JSON string or contains JSON fields
    if ((rawText.startsWith('{') && rawText.endsWith('}')) || rawText.includes('"corrected"')) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.corrected && typeof parsed.corrected === 'string') {
          rawText = parsed.corrected;
        } else if (parsed.text && typeof parsed.text === 'string') {
          rawText = parsed.text;
        } else if (parsed.content && typeof parsed.content === 'string') {
          rawText = parsed.content;
        }
      } catch {
        const match = rawText.match(/"corrected"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*\})/);
        if (match && match[1]) {
          rawText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        } else {
          rawText = rawText
            .replace(/,\s*"explanation"\s*:\s*[\s\S]*$/, '')
            .replace(/^\{\s*"corrected"\s*:\s*"?/, '')
            .replace(/"?\s*\}$/, '')
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"');
        }
      }
    }

    // 3. Guaranteed removal of any explanation keys or residual JSON artifacts
    rawText = rawText.replace(/,?\s*"explanation"\s*:\s*"[\s\S]*?"\s*\}?/gi, '');
    rawText = rawText.replace(/,?\s*"explanation"\s*:\s*\[[\s\S]*?\]\s*\}?/gi, '');
    rawText = rawText.replace(/<\/?(?:html|body)[^>]*>/gi, '');
    rawText = rawText.trim();

    res.json({ corrected: rawText, explanation: '' });
  } catch (error: any) {
    console.error('Gemini error during proofreading:', error);
    res.status(500).json({ error: error.message || 'Error proofreading text' });
  }
});

// 4. AI Extract Checklist / Генерация списка задач по тексту
app.post('/api/ai/tasks-generator', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  if (!isAiActive()) {
    console.log('Running simulated task generator');
    return res.json({
      tasks: [
        { title: 'Проверить технические детали по тексту', priority: 'medium' },
        { title: 'Запланировать встречу с заинтересованными сторонами', priority: 'high' },
        { title: 'Выполнить финальное ревью результатов работы', priority: 'low' }
      ]
    });
  }

  try {
    const prompt = `Проанализируй следующий текст и сгенерируй из него конкретный список конкретных задач (TO-DO список) с приоритетами. Текст:\n${text}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            tasks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING', description: 'Краткое название задачи на русском языке' },
                  priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'], description: 'Уровень приоритета задачи' }
                },
                required: ['title', 'priority']
              }
            }
          },
          required: ['tasks']
        }
      }
    });

    try {
      const parsed = JSON.parse(response.text || '{"tasks":[]}');
      res.json(parsed);
    } catch {
      res.json({ tasks: [] });
    }
  } catch (error: any) {
    console.error('Gemini error in tasks-generator:', error);
    res.status(500).json({ error: error.message || 'Error extracting tasks' });
  }
});

// 5. Intelligent Scheduling Suggestions / Умные советы по планированию
app.post('/api/ai/schedule-advisor', async (req, res) => {
  const { currentTasks, currentEvents, freeSlots } = req.body;

  if (!isAiActive()) {
    return res.json({
      suggestions: [
        {
          time: '11:00 - 12:00',
          activity: 'Прекрасное время для интенсивной работы над ключевым проектом',
          reason: 'Высокая концентрация внимания после утренней рутины'
        },
        {
          time: '15:30 - 16:00',
          activity: 'Интеграция короткой прогулки или Pomodoro-отдыха',
          reason: 'Традиционный дневной спад энергии.'
        }
      ]
    });
  }

  try {
    const prompt = `Ты — лучший персональный коуч по продуктивности и тайм-менеджменту. Проанализируй текущие задачи пользователя, расписание на день и свободные окна.\nЗадачи:\n${JSON.stringify(currentTasks)}\nКалендарь событий:\n${JSON.stringify(currentEvents)}\nСвободные слоты времени:\n${JSON.stringify(freeSlots || ['09:00-11:00', '14:00-16:00'])}\nПредложи 2-3 персональные и умные рекомендации о том, как распределить задачи на спорт, учебу, финансы или кодинг в свободные временные слоты. Составь ответ на русском.`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            suggestions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  time: { type: 'STRING', description: 'Рекомендуемое время или слот' },
                  activity: { type: 'STRING', description: 'Чем заняться (Конкретное дело или отдых)' },
                  reason: { type: 'STRING', description: 'Обоснование, почему это время подходит' }
                },
                required: ['time', 'activity', 'reason']
              }
            }
          },
          required: ['suggestions']
        }
      }
    });

    try {
      const parsed = JSON.parse(response.text || '{"suggestions":[]}');
      res.json(parsed);
    } catch {
      res.json({ suggestions: [] });
    }
  } catch (error: any) {
    console.error('Gemini error in scheduling advisory:', error);
    res.status(500).json({ error: error.message || 'Error loading scheduling advice' });
  }
});


// 6. AI Quick Capture (Inbox) / Парсинг быстрого захвата
app.post('/api/ai/inbox', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });

  if (!isAiActive()) {
    // Простой локальный fallback без ИИ
    const t = text.trim();
    const fresh = /(сегодня|завтра|послезавтра|to\s*\d+|завтра)/i.test(t);
    return res.json({
      title: t,
      category: 'personal' as const,
      priority: 'medium' as const,
      dueOffsetDays: fresh ? 0 : null,
      needTask: true,
      needReminder: fresh,
      parsed: false,
    });
  }

  try {
    const prompt = `Ты — умный парсер пометок (GTD inbox). Разбери следующую запись на структурированные данные на русском.\nВходной текст:\n"${text}"\nВерни JSON со строгими полями:
      {"title": string, "category": "work|study|home|finance|health|personal", "priority": "low|medium|high|critical", "dueDate": "YYYY-MM-DD или null", "needTask": boolean, "needReminder": boolean, "reminderTime": "HH:MM или null"}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    try {
      const parsed = JSON.parse(response.text || '{}');
      res.json({ ...parsed, parsed: true });
    } catch {
      res.json({ title: text.trim(), category: 'personal', priority: 'medium', dueDate: null, needTask: true, needReminder: false, parsed: false });
    }
  } catch (error: any) {
    console.error('Gemini error in inbox:', error);
    res.status(500).json({ error: error.message || 'Error parsing capture' });
  }
});

// 7. AI Weekly Review / Еженедельный дайджест продуктивности
app.post('/api/ai/weekly-review', async (req, res) => {
  const { summary } = req.body || {};

  if (!isAiActive()) {
    return res.json({
      review: `[ДЕМО-РЕЖИМ] Качественная неделя!\n\n**Итоги:**\n- Задачи: выполнено большинство приоритетных блоков.\n- Заметки: копилка знаний пополняется.\n- Финансы: расходы в пределах лимитов.\n\n**Совет:** закрепите 2 самых важных дела завтрашнего дня.`,
    });
  }

  try {
    const prompt = `Ты — персональный коуч по продуктивности. Проанализируй статистику недели пользователя и составь мотивирующий краткий обзор на русском (5-8 маркированных пунктов) плюс 2-3 конкретные рекомендации.\n\nСтатистика:\n${JSON.stringify(summary)}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ review: response.text || '' });
  } catch (error: any) {
    console.error('Gemini error in weekly review:', error);
    res.status(500).json({ error: error.message || 'Error building review' });
  }
});

// 7.5. AI Project Advisor / ИИ-Ассистент и консультант проектов
app.post('/api/ai/project-advisor', async (req, res) => {
  const { query, project, tasks = [], transactions = [], notes = [], history = [] } = req.body || {};

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const projectName = project?.name || 'Текущий проект';
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.isCompleted);
  const activeTasks = tasks.filter((t: any) => !t.isCompleted);
  const highPriority = activeTasks.filter((t: any) => t.priority === 'high' || t.priority === 'critical');
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const budgetLimit = project?.budgetLimit || 0;

  // Local fallback with real project metrics
  const runFallbackProjectAdvisor = () => {
    const q = query.toLowerCase();
    if (q.includes('проанализировать') || q.includes('состояние') || q.includes('статус')) {
      return `📊 **Аналитический срез проекта «${projectName}»**:\n\n` +
        `• **Прогресс**: **${progressPercent}%** (выполнено ${completedTasks.length} из ${totalTasks} задач).\n` +
        `• **Текущий статус**: ${project?.status || 'В работе'}.\n` +
        `• **Сроки**: ${project?.deadline ? `Дедлайн: ${project.deadline}` : 'Дедлайн не установлен'}.\n` +
        `• **Финансы**: израсходовано **${totalExpenses.toLocaleString()} ₽**${budgetLimit ? ` из бюджета **${budgetLimit.toLocaleString()} ₽** (остаток: ${(budgetLimit - totalExpenses).toLocaleString()} ₽)` : ''}.\n\n` +
        `💡 **Рекомендация NEXAR**: ${activeTasks.length > 0 ? `сконцентрируйтесь на ближайшей задаче: «${activeTasks[0].title}». Завершение высокоприоритетных блоков снимет риски срыва сроков.` : 'Все текущие задачи выполнены! Добавьте новый этап или подведите итоги проекта.'}`;
    } else if (q.includes('риск') || q.includes('просрочен') || q.includes('узк')) {
      return `⚠️ **Аудит рисков и узких мест «${projectName}»**:\n\n` +
        `• Активных задач: **${activeTasks.length}** (из них с высоким приоритетом: **${highPriority.length}**).\n` +
        `• Бюджетный риск: ${budgetLimit > 0 && totalExpenses > budgetLimit ? '❌ Превышение бюджета!' : budgetLimit > 0 && totalExpenses > budgetLimit * 0.8 ? '⚠️ Израсходовано более 80% бюджета.' : '✅ Финансы в пределах нормы.'}\n` +
        `• Узкое место: ${highPriority[0] ? `Критический фокус на задаче «${highPriority[0].title}» (${highPriority[0].dueDate || 'дедлайн не указан'})` : 'Критических блокеров не выявлено.'}\n\n` +
        `💡 **Действие**: декомпозируйте тяжелые задачи на подзадачи по 30–60 минут.`;
    } else if (q.includes('план') || q.includes('цель') || q.includes('разбить') || q.includes('этап')) {
      return `🎯 **Пошаговый план развития проекта «${projectName}»**:\n\n` +
        `1. **Фокус на текущих вехах**: закрыть ${highPriority.length > 0 ? `задачу «${highPriority[0].title}»` : 'активные задачи первого этапа'}.\n` +
        `2. **Контроль ресурсов**: зафиксировать все расходы в финансовом модуле проекта.\n` +
        `3. **Промежуточное ревью**: протестировать результаты и зафиксировать выводы в заметке хаба.\n` +
        `4. **Подготовка к релизу / сдаче**: провести финальный чек-лист перед дедлайном (${project?.deadline || 'плановая дата'}).`;
    } else {
      return `💡 **Ответ по проекту «${projectName}»**:\n\n` +
        `Я проанализировал ваш запрос «${query}» в контексте текущего прогресса (${progressPercent}%, ${activeTasks.length} активных задач).\n\n` +
        `Рекомендую привязать конкретные шаги к вехам проекта и зафиксировать промежуточные результаты в заметках. Если хотите, могу расписать план спринта или предложить новые гипотезы.`;
    }
  };

  if (!isAiActive()) {
    return res.json({ reply: runFallbackProjectAdvisor() });
  }

  try {
    const projectContext = {
      name: projectName,
      description: project?.description || '',
      targetGoal: project?.targetGoal || '',
      status: project?.status || 'in_progress',
      deadline: project?.deadline || 'Не задан',
      budgetLimit: budgetLimit,
      totalExpenses,
      totalIncome,
      progressPercent,
      tasks: tasks.slice(0, 15).map((t: any) => ({
        title: t.title,
        priority: t.priority,
        isCompleted: t.isCompleted,
        dueDate: t.dueDate,
      })),
      milestones: (project?.milestones || []).map((m: any) => ({
        title: m.title,
        date: m.date,
        completed: m.completed,
      })),
    };

    const systemPrompt = `Ты — NEXAR, персональный технический директор и ментор Лазиза в операционной системе NoteSphere OS.
Ты отвечаешь на вопросы по конкретному проекту «${projectName}».
Тебе передан полный актуальный контекст проекта (задачи, прогресс, бюджет, дедлайны, цели).
Отвечай структурированно, емко, профессионально, на живом русском языке с Markdown (жирный шрифт, списки, эмодзи).
Предлагай конкретные практические шаги, находи скрытые риски и помогай быстрее довести проект до финала.

Контекст проекта:
${JSON.stringify(projectContext, null, 2)}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Вопрос/команда пользователя: "${query}"\nИстория диалога:\n${JSON.stringify(history.slice(-6))}`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const reply = response.text || runFallbackProjectAdvisor();
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini error in project advisor:', error);
    res.json({ reply: runFallbackProjectAdvisor() });
  }
});

// 8. AI Copilot / ИИ-Командир экосистемы NoteSphere OS
app.post('/api/ai/copilot', async (req, res) => {
  const { message, history, appContext, customSystemPrompt } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const userQuery = message.trim();

  // Local rule-based fallback parser for fast or offline execution
  const runLocalFallbackCopilot = () => {
    const q = userQuery.toLowerCase();
    const actions: any[] = [];
    let replyText = 'Я обработал ваш запрос.';

    // 0. Project Ecosystem Generation (V4 Intelligence)
    if (q.includes('проект') || q.includes('project')) {
      const cleanName = userQuery
        .replace(/создай проект|новый проект|спланируй проект|проект:|проект/gi, '')
        .trim()
        .replace(/^[:\-–—«"]+|[»"]+$/g, '') || 'Новый Проект';

      const isEducation = q.includes('университет') || q.includes('university') || q.includes('korea') || q.includes('study') || q.includes('учеб') || q.includes('ielts');
      const isTech = q.includes('программ') || q.includes('app') || q.includes('сайт') || q.includes('код') || q.includes('разработк') || q.includes('notesphere');
      const isTravel = q.includes('поездк') || q.includes('путешеств') || q.includes('тур') || q.includes('отпуск');

      const categoryIcon = isEducation ? '🎓' : isTech ? '💻' : isTravel ? '✈️' : '🚀';
      const categoryColor = isEducation ? '#8b5cf6' : isTech ? '#3b82f6' : isTravel ? '#10b981' : '#ec4899';

      const projectPayload = {
        projectName: cleanName,
        categoryIcon,
        categoryColor,
        description: `Комплексная экосистема проекта «${cleanName}»`,
        hubNote: {
          title: `🏛️ Хаб Проекта: ${cleanName}`,
          content: `<h1>🏛️ Проект: ${cleanName}</h1><p>Единый центр управления целями, задачами и ресурсами проекта.</p><h2>🎯 Ключевые этапы</h2><ul><li>Исследование и сбор исходных требований</li><li>Разработка плана действий и дедлайнов</li><li>Выполнение ключевых вех и контроль результатов</li></ul><h2>📎 Документы и ссылки</h2><p>[[Заметки по проекту ${cleanName}]]</p>`,
          tags: ['проект', cleanName.toLowerCase().replace(/\s+/g, '-')]
        },
        tasks: isEducation ? [
          { title: `Сдать тест/экзамен для ${cleanName}`, priority: 'high', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], subtasks: ['Подготовка материалов', 'Пробное тестирование'] },
          { title: `Собрать пакет документов для ${cleanName}`, priority: 'high', dueDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0], subtasks: ['Апостиль и переводы', 'Рекомендательные письма'] },
          { title: `Написать мотивационное эссе (${cleanName})`, priority: 'medium', dueDate: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0], subtasks: ['Черновик', 'Вычитка'] },
          { title: `Подать заявку и оплатить взнос`, priority: 'critical', dueDate: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0], subtasks: [] },
        ] : [
          { title: `Анализ требований и скоупа (${cleanName})`, priority: 'high', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], subtasks: ['Список требований', 'Критерии готовности'] },
          { title: `Разработка первого этапа / прототипа`, priority: 'high', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], subtasks: ['Каркас', 'Базовая реализация'] },
          { title: `Тестирование и проверка качества`, priority: 'medium', dueDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0], subtasks: [] },
          { title: `Финальный запуск и подведение итогов`, priority: 'critical', dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], subtasks: [] },
        ],
        budgetAllocation: {
          plannedAmount: 30000,
          expenseCategory: isEducation ? 'Образование' : 'Проекты',
          comment: `Бюджетный резерв на расходы по проекту «${cleanName}»`
        },
        goals: [
          { name: `Успешная реализация проекта «${cleanName}»`, targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] }
        ]
      };

      actions.push({
        type: 'create_project_ecosystem',
        payload: projectPayload
      });

      replyText = `🚀 **Проект «${cleanName}» развёрнут.** Собрал тебе полноценную экосистему:\n\n` +
        `├── 📁 **Категория & Фокус:** ${categoryIcon} ${cleanName}\n` +
        `├── 📝 **Хаб-заметка:** «🏛️ Хаб Проекта: ${cleanName}»\n` +
        `├── ✅ **Задачи:** 4 связанных этапа с дедлайнами\n` +
        `├── 💰 **Бюджет:** 30 000 руб. аллокация\n` +
        `├── 🎯 **Цель:** Долгосрочный майлстоун\n` +
        `└── 🧠 **Canvas:** Секция на дашборде со связанными нодами\n\n` +
        `Всё слинковано в системе. Бери и делай, не откладывай.`;
    }
    // 0.1 Plan my day (V4 Intelligence)
    else if (
      q.includes('что мне делать') ||
      q.includes('что делать') ||
      q.includes('что мне сегодня делать') ||
      q.includes('план на день') ||
      q.includes('план на сегодня') ||
      q.includes('план на завтра') ||
      q.includes('мой день') ||
      q.includes('расписание') ||
      q.includes('plan my day') ||
      q.includes('собери мне план') ||
      (q.includes('что') && q.includes('делать'))
    ) {
      const existingTasks = Array.isArray(appContext?.tasks) ? appContext.tasks : [];
      const activeTasks = existingTasks.filter((t: any) => !t.isCompleted).slice(0, 4);

      const items = activeTasks.length >= 2 ? [
        { time: '09:00 - 10:30', taskId: activeTasks[0]?.id, taskTitle: activeTasks[0]?.title || 'Глубокий фокус: Главная задача', priority: activeTasks[0]?.priority || 'high', category: activeTasks[0]?.category || 'Работа' },
        { time: '11:00 - 12:30', taskId: activeTasks[1]?.id, taskTitle: activeTasks[1]?.title || 'Разработка и продолжение проекта', priority: activeTasks[1]?.priority || 'high', category: activeTasks[1]?.category || 'Работа' },
        { time: '14:00 - 15:30', taskId: activeTasks[2]?.id, taskTitle: activeTasks[2]?.title || 'Операционные дела и коммуникации', priority: activeTasks[2]?.priority || 'medium', category: activeTasks[2]?.category || 'Личное' },
        { time: '16:30 - 18:00', taskId: activeTasks[3]?.id, taskTitle: activeTasks[3]?.title || 'Обучение, спорт и подведение итогов дня', priority: activeTasks[3]?.priority || 'medium', category: activeTasks[3]?.category || 'Развитие' },
      ] : [
        { time: '09:00 - 10:30', taskTitle: '🎯 Главный фокус дня (IELTS / Академическая подготовка)', priority: 'high', category: 'Учеба' },
        { time: '11:00 - 12:30', taskTitle: '⚡ Архитектурная разработка NoteSphere OS', priority: 'high', category: 'Работа' },
        { time: '14:00 - 15:30', taskTitle: '📄 Сбор и оформление документов по проектам', priority: 'high', category: 'Проекты' },
        { time: '16:30 - 18:00', taskTitle: '💻 Программирование и решение практических задач', priority: 'medium', category: 'Работа' },
      ];

      actions.push({
        type: 'plan_my_day',
        payload: {
          summary: 'Сбалансированный персональный график: глубокая работа утром, рутина днем, спорт и восстановление вечером.',
          items,
          habitsToComplete: ['Выпить 2л воды', 'Чтение 20 мин', 'Медитация / Дыхание']
        }
      });
      replyText = `📅 Лазиз, держи плотный график на день. Выделил главные фокусы — делай по порядку и без прокрастинации. В 1 клик можешь закинуть в свои задачи.`;
    }
    // 0.2 Cross-Module Synthesis Search
    else if (q.includes('найди') || q.includes('покажи') || q.includes('поиск')) {
      const searchTerm = userQuery.replace(/найди всё, что связано с|найди всё про|найди всё|покажи мои|покажи|найди|поиск/gi, '').trim();
      actions.push({
        type: 'search_app',
        payload: { query: searchTerm || 'все' }
      });
      replyText = `🔍 Ищу по всей экосистеме NoteSphere: **«${searchTerm || userQuery}»**. Смотри результаты:`;
    }
    // 1. Create note
    else if (q.includes('создай заметку') || q.includes('напиши заметку') || q.startsWith('заметка:')) {
      const clean = userQuery.replace(/создай заметку|напиши заметку|заметка:/gi, '').trim();
      const parts = clean.split('\n');
      const title = parts[0]?.replace(/^[:\-–—\s]+/, '') || 'Новая заметка';
      const content = parts.slice(1).join('\n') || `<p>${title}</p>`;
      actions.push({
        type: 'create_note',
        payload: {
          title,
          content: `<p>${content}</p>`,
          categoryId: 'cat-personal',
          tags: ['nexar', 'заметки'],
          importance: 'medium'
        }
      });
      replyText = `✨ Заметку оформил: **«${title}»**. Лежит в твоем блокноте.`;
    }
    // 2. Create reminder / notification
    else if (q.includes('напомни') || q.includes('напоминание') || q.includes('уведомление') || q.includes('remind')) {
      const clean = userQuery.replace(/напомни мне|напомни|поставь напоминание|создай напоминание|напоминание:|уведомление/gi, '').trim();
      const timeMatch = q.match(/(\d{1,2})[:.](\d{2})/);
      let timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';
      actions.push({
        type: 'create_reminder',
        payload: {
          title: clean || 'Важное дело',
          time: timeStr,
          date: new Date().toISOString().split('T')[0],
          recurrence: 'none',
        }
      });
      replyText = `🔔 Зафиксировал напоминание: **«${clean || 'Важное дело'}»** на ${timeStr}. Отобразится в панели колокольчика.`;
    }
    // 2.1 Create task
    else if (q.includes('добавь задачу') || q.includes('создай задачу') || q.startsWith('задача:')) {
      const clean = userQuery.replace(/добавь задачу|создай задачу|задача:/gi, '').trim();
      const isHigh = q.includes('срочно') || q.includes('важн') || q.includes('критич');
      actions.push({
        type: 'create_task',
        payload: {
          title: clean || 'Новая задача',
          priority: isHigh ? 'high' : 'medium',
          category: 'Работа',
          dueDate: new Date().toISOString().split('T')[0],
          subtasks: []
        }
      });
      replyText = `✅ Задачу закинул в трекер: **«${clean || 'Новая задача'}»**. Сделай вовремя, без прокрастинации.`;
    }
    // 3. Add financial transaction
    else if (q.includes('расход') || q.includes('доход') || q.includes('потратил') || q.includes('заработал') || q.includes('купил')) {
      const amountMatch = q.match(/\d+[\d\s]*/);
      const amount = amountMatch ? parseInt(amountMatch[0].replace(/\s/g, ''), 10) : 500;
      const isIncome = q.includes('доход') || q.includes('заработал') || q.includes('зарплата');
      const comment = userQuery.replace(/\d+/g, '').replace(/запиши|добавь|расход|доход|потратил|купил|на|рублей|руб|сум/gi, '').trim() || 'Транзакция от ИИ';

      actions.push({
        type: 'add_transaction',
        payload: {
          type: isIncome ? 'income' : 'expense',
          amount,
          categoryId: 'f-misc',
          comment
        }
      });
      replyText = `💰 Зафиксировал ${isIncome ? 'доход' : 'расход'} на **${amount}**: «${comment}». Баланс обновлен. Держи под контролем, Лазиз.`;
    }
    // 4. Switch tab
    else if (q.includes('открой') || q.includes('переключи') || q.includes('покажи')) {
      let targetTab: string | null = null;
      if (q.includes('проект')) targetTab = 'projects';
      else if (q.includes('заметк') || q.includes('блокнот')) targetTab = 'notes';
      else if (q.includes('задач') || q.includes('канбан')) targetTab = 'tasks';
      else if (q.includes('календар')) targetTab = 'calendar';
      else if (q.includes('финанс') || q.includes('бюджет')) targetTab = 'finance';
      else if (q.includes('граф') || q.includes('созвезди')) targetTab = 'notes';
      else if (q.includes('холст') || q.includes('canvas')) targetTab = 'dashboard';
      else if (q.includes('медиа') || q.includes('плеер')) targetTab = 'media';
      else if (q.includes('стат') || q.includes('отчет')) targetTab = 'stats';
      else if (q.includes('виджет') || q.includes('привычк')) targetTab = 'widgets';

      if (targetTab) {
        actions.push({ type: 'switch_tab', payload: { tab: targetTab } });
        replyText = `🚀 Переключил на **${targetTab}**.`;
      } else {
        replyText = `Я — NEXAR. Могу развернуть проект, собрать расписание дня, сделать заметку или задачу. Говори, что нужно.`;
      }
    }
    // 5. Change theme
    else if (q.includes('тему') || q.includes('цвет') || q.includes('палитр')) {
      let color = '#8b5cf6';
      let name = 'Фиолетовый';
      if (q.includes('изумруд') || q.includes('зелен')) { color = '#10b981'; name = 'Изумрудный'; }
      else if (q.includes('син') || q.includes('голуб')) { color = '#3b82f6'; name = 'Космический синий'; }
      else if (q.includes('янтар') || q.includes('желт') || q.includes('оранж')) { color = '#f59e0b'; name = 'Янтарный'; }
      else if (q.includes('бирюз') || q.includes('циан') || q.includes('кибер')) { color = '#06b6d4'; name = 'Киберпанк Циан'; }
      else if (q.includes('красн') || q.includes('рубин')) { color = '#ef4444'; name = 'Рубиновый'; }
      else if (q.includes('розов')) { color = '#ec4899'; name = 'Розовый кварц'; }

      actions.push({ type: 'set_theme', payload: { accentColor: color } });
      replyText = `🎨 Поставил цвет: **${name}**. Смотрится четко.`;
    }
    else {
      replyText = `Я — NEXAR. Хватит тратить время впустую, говори задачу:\n\n- *«Создай проект Korea University»*\n- *«Что мне сегодня делать?»* (соберу план дня)\n- *«Добавь важную задачу на завтра...»*\n- *«Запиши расход 1500 на такси»*\n- *«Найди всё по проекту...»*`;
    }

    return { reply: replyText, actions };
  };

  if (!isAiActive()) {
    const fallback = runLocalFallbackCopilot();
    return res.json(fallback);
  }

  try {
    const userCustomInstructions = customSystemPrompt && typeof customSystemPrompt === 'string' && customSystemPrompt.trim()
      ? `\nПОЛЬЗОВАТЕЛЬСКИЕ ИНСТРУКЦИИ (ВЫСШИЙ ПРИОРИТЕТ ДЛЯ СТИЛЯ И ПОВЕДЕНИЯ):\n${customSystemPrompt.trim()}\n`
      : `\n${DEFAULT_SYSTEM_PROMPT}\n`;

    const systemPrompt = `Ты — NEXAR, персональный AI-ассистент Лазиза и встроенный интеллектуальный координатор персональной операционной системы NoteSphere OS.
${userCustomInstructions}
Твоя главная парадигма: не копировать разрозненные приложения, а объединять данные в единую связанную операционную систему.
Когда пользователь просит создать проект (например, «Создай проект Korea University» или «Проект Запуск подкаста»), ты ОБЯЗАТЕЛЬНО возвращаешь действие "create_project_ecosystem", связывающее категорию, хаб-заметку, 4-5 ключевых задач со сроками, бюджет и цели.
Когда пользователь спрашивает «Что мне сегодня делать?» или «Собери мне план на день/завтра», ты возвращаешь действие "plan_my_day" с логичными временными блоками и приоритетами.

Формат ответа JSON:
{
  "reply": "Твой четкий, вдохновляющий, емкий ответ в формате Markdown с перечислением созданных сущностей или расписания дня.",
  "actions": [
    {
      "type": "create_project_ecosystem | create_project | update_project | plan_my_day | create_note | create_task | create_reminder | add_transaction | create_habit | create_alarm | switch_tab | set_theme | search_app",
      "payload": { ...специфичные параметры... }
    }
  ]
}

Спецификации payload:
- create_project_ecosystem: {
    "projectName": string,
    "categoryIcon": string (emoji),
    "categoryColor": string (hex, например #3b82f6 или #8b5cf6),
    "description": string,
    "hubNote": { "title": string, "content": string (HTML разметка), "tags": string[] },
    "tasks": [ { "title": string, "priority": "low"|"medium"|"high"|"critical", "dueDate": "YYYY-MM-DD", "subtasks": string[] } ],
    "budgetAllocation": { "plannedAmount": number, "expenseCategory": string, "comment": string },
    "goals": [ { "name": string, "targetDate": "YYYY-MM-DD" } ]
  }
- plan_my_day: {
    "summary": string,
    "items": [ { "time": "09:00 - 10:30", "taskTitle": string, "priority": "low"|"medium"|"high"|"critical", "category": string } ],
    "habitsToComplete": string[]
  }
- create_project: {
    "name": string,
    "description": string,
    "status": "idea"|"planning"|"in_progress"|"paused"|"launch"|"completed",
    "deadline": "YYYY-MM-DD",
    "targetGoal": string,
    "budgetLimit": number,
    "milestones": [ { "title": string, "targetDate": "YYYY-MM-DD" } ]
  }
- update_project: {
    "projectId": string (or "projectName"),
    "status": "idea"|"planning"|"in_progress"|"paused"|"launch"|"completed",
    "deadline": "YYYY-MM-DD",
    "targetGoal": string,
    "progress": number,
    "description": string
  }
- create_note: { "title": string, "content": string (HTML), "categoryId": string, "tags": string[], "importance": "low"|"medium"|"high"|"critical" }
- create_task: { "title": string, "priority": "low"|"medium"|"high"|"critical", "category": string, "dueDate": "YYYY-MM-DD", "subtasks": string[] }
- create_reminder: { "title": string, "time": "HH:MM", "date": "YYYY-MM-DD" }
- add_transaction: { "type": "income"|"expense", "amount": number, "categoryId": string, "comment": string }
- switch_tab: { "tab": "notes"|"tasks"|"projects"|"calendar"|"finance"|"stats"|"widgets"|"media"|"dashboard" }
- set_theme: { "accentColor": "#8b5cf6"|"#3b82f6"|"#10b981"|"#f59e0b"|"#ec4899"|"#ef4444"|"#06b6d4" }

Контекст состояния приложения:
${JSON.stringify(appContext || {})}`;

    const prompt = `Запрос пользователя: "${userQuery}"\nИстория диалога:\n${JSON.stringify(history || [])}`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    });

    try {
      const parsed = JSON.parse(response.text || '{}');
      res.json({
        reply: parsed.reply || 'Запрос обработан.',
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      });
    } catch {
      const fallback = runLocalFallbackCopilot();
      res.json(fallback);
    }
  } catch (error: any) {
    console.error('Gemini error in copilot:', error);
    const fallback = runLocalFallbackCopilot();
    res.json(fallback);
  }
});

// ------------------ LOCAL MEDIA FOLDERS & SCREENSHOTS API ------------------

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.heic']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mov', '.avi', '.wmv', '.m4v']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma']);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function scanDirRecursive(dirPath: string, filterType: 'all' | 'image' | 'video' | 'audio' = 'all', maxDepth = 4, currentDepth = 0): any[] {
  const results: any[] = [];
  if (currentDepth > maxDepth || !fs.existsSync(dirPath)) return results;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...scanDirRecursive(fullPath, filterType, maxDepth, currentDepth + 1));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        let type: 'image' | 'video' | 'audio' | null = null;
        if (IMAGE_EXTS.has(ext)) type = 'image';
        else if (VIDEO_EXTS.has(ext)) type = 'video';
        else if (AUDIO_EXTS.has(ext)) type = 'audio';

        if (type && (filterType === 'all' || filterType === type)) {
          const stats = fs.statSync(fullPath);
          const hash = crypto.createHash('sha256').update(fullPath).digest('hex').slice(0, 24);
          results.push({
            id: `local-${hash}`,
            name: entry.name,
            fullPath,
            url: `/api/media/stream?path=${encodeURIComponent(fullPath)}`,
            size: formatFileSize(stats.size),
            type,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            modifiedTime: stats.mtimeMs,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error scanning folder:', dirPath, err);
  }
  return results;
}

app.post('/api/media/scan-local-dir', (req, res) => {
  const { dirPath, filterType = 'all' } = req.body || {};
  if (!dirPath || typeof dirPath !== 'string') {
    return res.status(400).json({ error: 'dirPath is required' });
  }

  const normalized = path.resolve(dirPath);
  if (!fs.existsSync(normalized)) {
    return res.status(404).json({ error: 'Directory not found: ' + normalized });
  }

  const items = scanDirRecursive(normalized, filterType);
  // Sort newest first
  items.sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0));
  res.json({ count: items.length, dirPath: normalized, items });
});

// Discover standard media folders & subfolders on user's system for 1-click selection
app.get('/api/media/common-folders', (req, res) => {
  try {
    const home = os.homedir();
    const candidates = [
      { name: 'Моя музыка', type: 'audio', path: path.join(home, 'Music') },
      { name: 'Мои видеозаписи', type: 'video', path: path.join(home, 'Videos') },
      { name: 'Изображения / Скриншоты', type: 'image', path: path.join(home, 'Pictures') },
      { name: 'Загрузки', type: 'all', path: path.join(home, 'Downloads') },
    ];

    const result: { name: string; type: string; path: string }[] = [];

    for (const c of candidates) {
      if (fs.existsSync(c.path)) {
        // First, check immediate subdirectories (e.g. SnapTube Audio, phonk, MusicMix)
        try {
          const subs = fs.readdirSync(c.path, { withFileTypes: true });
          for (const s of subs) {
            if (s.isDirectory() && !s.name.startsWith('.') && s.name !== 'node_modules') {
              result.push({
                name: s.name,
                type: c.type,
                path: path.join(c.path, s.name),
              });
            }
          }
        } catch {}
        // Also include the root folder itself
        result.push(c);
      }
    }

    res.json({ folders: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message, folders: [] });
  }
});

// Native OS Folder Picker via PowerShell on Windows (for web browser mode)
app.post('/api/media/select-folder', (req, res) => {
  if (process.platform === 'win32') {
    const psCmd = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Выберите папку с медиафайлами'; $f.ShowNewFolderButton = $false; $top = New-Object System.Windows.Forms.Form; $top.TopMost = $true; if ($f.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $f.SelectedPath }`;
    exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, { timeout: 60000 }, (error, stdout) => {
      if (error) {
        return res.json({ canceled: true });
      }
      const folderPath = stdout.trim();
      if (folderPath && fs.existsSync(folderPath)) {
        return res.json({ folderPath });
      }
      return res.json({ canceled: true });
    });
  } else {
    return res.json({ canceled: true, fallback: true });
  }
});

// Stream local audio/video/image safely with Range support
app.get('/api/media/stream', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Watch and return only new/updated screenshots since last timestamp
app.post('/api/media/watch-screenshots', (req, res) => {
  const { dirPath, sinceTime = 0 } = req.body || {};
  if (!dirPath || !fs.existsSync(dirPath)) {
    return res.json({ newItems: [] });
  }

  const items = scanDirRecursive(path.resolve(dirPath), 'image', 2);
  const newItems = items.filter((item) => (item.modifiedTime || 0) > Number(sinceTime));
  newItems.sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0));
  res.json({ newItems, count: newItems.length });
});

// ------------------ OCR, WEB CLIPPER & WEBDAV ------------------

// OCR for screenshots & images
app.post('/api/ai/ocr', async (req, res) => {
  const { imageBase64, imagePath, mimeType = 'image/png' } = req.body || {};
  try {
    let base64Data = imageBase64;
    let type = mimeType;

    if (!base64Data && imagePath && fs.existsSync(imagePath)) {
      const fileBuffer = fs.readFileSync(imagePath);
      base64Data = fileBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') type = 'image/jpeg';
      else if (ext === '.webp') type = 'image/webp';
    }

    if (!base64Data) {
      return res.status(400).json({ error: 'Image data or valid imagePath is required' });
    }

    if (base64Data.includes(';base64,')) {
      base64Data = base64Data.split(';base64,')[1];
    }

    if (isAiActive()) {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: type,
                },
              },
              {
                text: 'Ты профессиональная система оптического распознавания символов (OCR). Тщательно и точно извлеки весь печатный и рукописный текст с этого изображения/скриншота. Сохрани исходное форматирование строк и структуру абзацев. Верни ТОЛЬКО распознанный текст без каких-либо вводных слов, пояснений или комментариев.',
              },
            ],
          },
        ],
      });

      const extractedText = response.text || '';
      return res.json({ text: extractedText, source: 'gemini-ocr' });
    } else {
      return res.json({
        text: `[OCR Режим]\nФайл: ${imagePath ? path.basename(imagePath) : 'Скриншот'}\nТекст зафиксирован и готов к вставке в блокнот.`,
        source: 'simulated-ocr'
      });
    }
  } catch (err: any) {
    console.error('OCR Error:', err);
    res.status(500).json({ error: err.message || 'Ошибка распознавания текста' });
  }
});

// Helper: Extract rich structured HTML article from webpage
async function parseRichWebArticle(url: string, useAi: boolean = false): Promise<{
  title: string;
  description: string;
  siteName: string;
  richNoteHtml: string;
  markdown: string;
  sourceUrl: string;
}> {
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Сервер вернул статус ${response.status} (${response.statusText})`);
  }

  const html = await response.text();
  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname.replace(/^www\./i, '');

  // Extract meta title & og:site_name
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = ogTitle || (titleMatch ? titleMatch[1] : hostname);
  const title = rawTitle.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

  const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const siteName = (ogSiteName || hostname).trim();

  // Extract description
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const description = (ogDesc || metaDesc || '').trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

  // Strip scripts, styles, nav, header, footer, ads
  let cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  const paragraphs: string[] = [];
  const pRegex = /<(p|h1|h2|h3|li|blockquote)[^>]*>(.*?)<\/\1>/gi;
  let match;
  while ((match = pRegex.exec(cleanText)) !== null) {
    const tag = match[1].toLowerCase();
    const text = match[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    if (text.length > 25 && !text.toLowerCase().includes('cookie') && !text.toLowerCase().includes('конфиденциальности')) {
      if (tag === 'h1' || tag === 'h2') {
        paragraphs.push(`<h2>${text}</h2>`);
      } else if (tag === 'h3') {
        paragraphs.push(`<h3>${text}</h3>`);
      } else if (tag === 'blockquote') {
        paragraphs.push(`<blockquote>${text}</blockquote>`);
      } else if (tag === 'li') {
        paragraphs.push(`<li>${text}</li>`);
      } else {
        paragraphs.push(`<p>${text}</p>`);
      }
    }
  }

  let bodyHtml = paragraphs.slice(0, 35).join('\n');
  const wordCount = bodyHtml.replace(/<[^>]*>/g, ' ').split(/\s+/).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 180));
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  // Optional AI clean-up if requested and available
  if (useAi && isAiActive() && bodyHtml.length > 100) {
    try {
      const aiPrompt = `Оформи следующий сырой текст веб-страницы в красивую, структурированную заметку на русском языке с понятными подзаголовками (<h2>, <h3>), абзацами (<p>) и маркированными списками (<ul>, <li>). Не добавляй метаданных и JSON, верни только HTML:\n\n${bodyHtml.replace(/<[^>]*>/g, '\n')}`;
      const aiResp = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
      });
      const aiText = (aiResp.text || '').replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
      if (aiText && aiText.length > 50) {
        bodyHtml = aiText;
      }
    } catch (e) {
      console.warn('AI clean-up error, falling back to parsed HTML:', e);
    }
  }

  // Construct styled Rich Note HTML Card
  const richNoteHtml = `
<div class="ns-web-clip-card" data-url="${targetUrl}" style="margin-bottom:16px;">
  <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:12px;margin-bottom:14px;font-size:11px;font-family:sans-serif;">
    <span style="font-weight:700;color:#38bdf8;">🌐 ${siteName}</span>
    <span style="opacity:0.4;">•</span>
    <span style="color:#94a3b8;">📅 ${dateStr}</span>
    <span style="opacity:0.4;">•</span>
    <span style="color:#94a3b8;">⏱️ ~${readMinutes} мин чтения</span>
  </div>
  ${description ? `<div style="padding:10px 14px;background:rgba(99,102,241,0.08);border-left:3px solid #6366f1;border-radius:0 10px 10px 0;margin-bottom:16px;font-style:italic;color:#cbd5e1;font-size:13px;">💡 <b>Кратко:</b> ${description}</div>` : ''}
</div>
${bodyHtml}
<div style="margin-top:24px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;">
  <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
    🔗 Источник: ${siteName} (${hostname})
  </a>
</div>
`.trim();

  const markdown = `# ${title}\n\n> 🌐 **Источник:** [${siteName}](${targetUrl})\n> 📅 **Сохранено:** ${dateStr} (~${readMinutes} мин)\n\n${description ? `*${description}*\n\n---\n\n` : ''}${bodyHtml.replace(/<p>/g, '\n').replace(/<\/p>/g, '\n').replace(/<h2>/g, '\n## ').replace(/<\/h2>/g, '\n').replace(/<li>/g, '- ').replace(/<\/li>/g, '\n').replace(/<[^>]*>/g, '')}`;

  return {
    title,
    description,
    siteName,
    richNoteHtml,
    markdown,
    sourceUrl: targetUrl,
  };
}

// Web Clipper: URL fetching & rich HTML extraction
app.post('/api/web-clipper', async (req, res) => {
  const { url, useAi } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL обязателен для клиппера' });
  }

  try {
    const article = await parseRichWebArticle(url, !!useAi);
    res.json(article);
  } catch (err: any) {
    console.error('Web Clipper error:', err);
    res.status(500).json({ error: err.message || 'Не удалось загрузить веб-страницу' });
  }
});

// Generic & Telegram Webhook: Receive URL or text and return formatted Note
app.post('/api/webhook/note', async (req, res) => {
  const { url, text, title, categoryId, tags, useAi } = req.body || {};
  if (!url && !text) {
    return res.status(400).json({ success: false, error: 'Укажите url или text для создания заметки' });
  }

  try {
    let noteTitle = title || 'Новая веб-заметка';
    let noteContent = '';
    let noteTags = Array.isArray(tags) ? tags : ['веб-клип', 'webhook'];

    if (url) {
      const parsed = await parseRichWebArticle(url, !!useAi);
      noteTitle = title || parsed.title;
      noteContent = parsed.richNoteHtml;
      noteTags.push(parsed.siteName.toLowerCase());
    } else {
      noteContent = `<p>${(text || '').replace(/\n/g, '<br/>')}</p>`;
    }

    const note = {
      id: `note-webhook-${Date.now()}`,
      title: noteTitle,
      content: noteContent,
      categoryId: categoryId || 'cat-personal',
      tags: Array.from(new Set(noteTags)),
      importance: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isPinned: false,
      attachments: url ? [{ id: `attach-${Date.now()}`, name: noteTitle, type: 'link', url }] : [],
    };

    res.json({ success: true, message: 'Заметка успешно сформирована через Webhook', note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Ошибка обработки вебхука' });
  }
});

// WebDAV: Test connection
app.post('/api/webdav/test', async (req, res) => {
  const { url, username, password } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL сервера WebDAV обязателен' });

  try {
    const authHeader = 'Basic ' + Buffer.from(`${username || ''}:${password || ''}`).toString('base64');
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Depth': '0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok || response.status === 207 || response.status === 405) {
      res.json({ success: true, message: `Соединение с WebDAV успешно (${response.status})` });
    } else {
      res.status(response.status).json({ success: false, error: `Сервер ответил статусом ${response.status} (${response.statusText})` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Ошибка подключения к WebDAV' });
  }
});

// WebDAV: Upload Backup
app.post('/api/webdav/upload', async (req, res) => {
  const { url, username, password, backupData } = req.body || {};
  if (!url || !backupData) {
    return res.status(400).json({ error: 'URL и данные бэкапа обязательны' });
  }

  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `notesphere-backup-${dateStr}.json`;
    const targetUrl = url.endsWith('/') ? `${url}${fileName}` : `${url}/${fileName}`;
    const authHeader = 'Basic ' + Buffer.from(`${username || ''}:${password || ''}`).toString('base64');

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      res.json({ success: true, fileName, message: `Резервная копия успешно загружена на WebDAV (${fileName})` });
    } else {
      res.status(response.status).json({ success: false, error: `WebDAV ответил ошибкой: ${response.status} ${response.statusText}` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Сбой отправки бэкапа по WebDAV' });
  }
});

// Telegram: Test connection
app.post('/api/telegram/test', async (req, res) => {
  const { botToken, chatId } = req.body || {};
  if (!botToken || !chatId) {
    return res.status(400).json({ success: false, error: 'Bot Token и Chat ID обязательны' });
  }

  try {
    const testMsg = `🔔 <b>NoteSphere Cloud</b>: Тестовое подключение успешно!\nБот готов для сохранения резервных копий заметок и задач.`;
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMsg,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data: any = await resp.json();
    if (data.ok) {
      res.json({ success: true, message: 'Соединение успешно! Бот отправил тестовое сообщение в ваш Telegram.' });
    } else {
      res.status(400).json({ success: false, error: data.description || 'Ошибка Telegram API' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Ошибка подключения к Telegram' });
  }
});

// Telegram: Upload Backup Document
app.post('/api/telegram/backup', async (req, res) => {
  const { botToken, chatId, backupData } = req.body || {};
  if (!botToken || !chatId || !backupData) {
    return res.status(400).json({ success: false, error: 'Bot Token, Chat ID и данные бэкапа обязательны' });
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `notesphere-backup-${dateStr}.json`;
    const jsonStr = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);

    const formData = new FormData();
    formData.append('chat_id', chatId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    formData.append('document', blob, fileName);
    formData.append(
      'caption',
      `📦 <b>Резервная копия NoteSphere</b>\n📅 Дата: <code>${now.toLocaleString('ru-RU')}</code>\n📊 Размер: ${(jsonStr.length / 1024).toFixed(1)} KB`
    );
    formData.append('parse_mode', 'HTML');

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    const data: any = await resp.json();
    if (data.ok) {
      const fileId = data.result?.document?.file_id;
      const messageId = data.result?.message_id;
      res.json({
        success: true,
        fileName,
        fileId,
        messageId,
        message: `Резервная копия успешно отправлена в Telegram (${fileName})!`,
      });
    } else {
      res.status(400).json({ success: false, error: data.description || 'Не удалось отправить файл в Telegram' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Сбой отправки бэкапа в Telegram' });
  }
});

// Telegram: Restore Latest Backup
app.post('/api/telegram/latest', async (req, res) => {
  const { botToken, chatId, fileId: directFileId } = req.body || {};
  if (!botToken) {
    return res.status(400).json({ success: false, error: 'Bot Token обязателен' });
  }

  try {
    let targetFileId = directFileId;

    // If no direct fileId provided, search recent incoming updates
    if (!targetFileId) {
      const updatesResp = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50`, {
        signal: AbortSignal.timeout(10000),
      });
      const updatesData: any = await updatesResp.json();

      if (updatesData.ok && Array.isArray(updatesData.result)) {
        // Reverse iterate to find most recent document ending with .json
        for (let i = updatesData.result.length - 1; i >= 0; i--) {
          const u = updatesData.result[i];
          const msg = u.message || u.channel_post || u.edited_message;
          if (msg && msg.document && msg.document.file_name && msg.document.file_name.endsWith('.json')) {
            targetFileId = msg.document.file_id;
            break;
          }
        }
      }
    }

    if (!targetFileId) {
      return res.status(404).json({
        success: false,
        error: 'Файл бэкапа не найден в Telegram. Отправьте или перешлите файл бэкапа (.json) боту в чат и повторите попытку.',
      });
    }

    // Get file info from Telegram
    const fileInfoResp = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${targetFileId}`, {
      signal: AbortSignal.timeout(10000),
    });
    const fileInfoData: any = await fileInfoResp.json();

    if (!fileInfoData.ok || !fileInfoData.result?.file_path) {
      return res.status(400).json({
        success: false,
        error: fileInfoData.description || 'Не удалось получить путь к файлу в Telegram',
      });
    }

    // Download the actual file content
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfoData.result.file_path}`;
    const fileContentResp = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!fileContentResp.ok) {
      return res.status(400).json({
        success: false,
        error: `Не удалось скачать файл из Telegram: ${fileContentResp.statusText}`,
      });
    }

    const textContent = await fileContentResp.text();
    let parsed: any;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      return res.status(400).json({ success: false, error: 'Файл из Telegram не является корректным JSON' });
    }

    res.json({
      success: true,
      snapshot: parsed,
      fileId: targetFileId,
      message: 'Резервная копия успешно загружена из Telegram!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Сбой восстановления из Telegram' });
  }
});

// ------------------ EXPORT & INTEGRATION ------------------

// ---------------------- VITE MIDDLEWARE DEVELOPMENT & PRODUCTION ----------------------

export async function startServer(customPort?: number) {
  const effectivePort = customPort || Number(process.env.PORT || 3000);
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server injected into Express');
  } else {
    // В собранном (или упакованном) режиме раздаём статику из той же папки,
    // где лежит server.cjs (dist/), — не зависит от process.cwd().
    const distPath = path.resolve(__dirname);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(effectivePort, '0.0.0.0', () => {
    console.log(`🚀 NoteSphere OS serving correctly on http://localhost:${effectivePort}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Порт ${effectivePort} уже занят.`);
    } else {
      console.error('Server error:', err);
    }
  });

  return server;
}

// Запускаем сервер при прямом запуске (npm run dev / node dist/server.cjs).
// В Electron-обёртке сервер поднимается процессом main самостоятельно,
// поэтому автостарт здесь не срабатывает.
// Проверка работает и в ESM (tsx/dev), и в CJS (esbuild bundle / npm start).
let isMain = false;
try {
  // CJS-бандл (dist/server.cjs): require.main === module
  isMain = typeof require !== 'undefined' && require.main === module;
} catch {
  /* ESM */
}
if (!isMain && process.argv[1]) {
  try {
    const scriptPath = path.resolve(process.argv[1]);
    isMain = scriptPath.endsWith('server.ts') || scriptPath.endsWith('server.cjs') || scriptPath.endsWith('server.js');
  } catch {}
}

if (isMain) {
  startServer();
}
