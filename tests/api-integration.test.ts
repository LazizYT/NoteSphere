/**
 * NoteSphere OS — API & Copilot Integration Tests
 * Tests Express server endpoints, JSON schemas, fallback handlers, and AI copilot actions.
 */

import { describe, it, expect, runner } from './test-framework';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function postJson(endpoint: string, body: any) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getJson(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  const data = await res.json();
  return { status: res.status, data };
}

describe('1. Server Health & Client Logging API', () => {
  it('GET /api/ai/status returns active AI state', async () => {
    const { status, data } = await getJson('/api/ai/status');
    expect(status).toBe(200);
    expect(typeof data.active).toBe('boolean');
    expect(typeof data.reason).toBe('string');
  });

  it('POST /api/client-log logs an event and retrieves it via /api/client-logs', async () => {
    const testMessage = `Test QA Log ${Date.now()}`;
    const postRes = await postJson('/api/client-log', {
      level: 'info',
      message: testMessage,
      context: { qa: true },
    });
    expect(postRes.status).toBe(200);
    expect(postRes.data.ok).toBe(true);

    const getRes = await getJson('/api/client-logs');
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.data)).toBe(true);
    const found = getRes.data.some((l: any) => l.message === testMessage);
    expect(found).toBe(true);
  });
});

describe('2. NEXAR Copilot Action Handlers & Schema Verification', () => {
  it('Creates Project Ecosystem on user query', async () => {
    const { status, data } = await postJson('/api/ai/copilot', {
      message: 'Создай проект Korea University',
      history: [],
      appContext: { notes: [], tasks: [] },
    });

    expect(status).toBe(200);
    expect(typeof data.reply).toBe('string');
    expect(Array.isArray(data.actions)).toBe(true);

    const projectAction = data.actions.find((a: any) => a.type === 'create_project_ecosystem');
    expect(Boolean(projectAction)).toBe(true);
    expect(projectAction.payload.projectName).toBeTruthy();
    expect(projectAction.payload.hubNote).toBeTruthy();
    expect(Array.isArray(projectAction.payload.tasks)).toBe(true);
    expect(projectAction.payload.tasks.length).toBeGreaterThan(0);
  });

  it('Generates Day Plan with structured time blocks', async () => {
    const { status, data } = await postJson('/api/ai/copilot', {
      message: 'Что мне сегодня делать? (план дня)',
      history: [],
      appContext: {
        tasks: [
          { id: 't1', title: 'IELTS Подготовка', isCompleted: false, priority: 'high' },
          { id: 't2', title: 'NoteSphere OS Архитектура', isCompleted: false, priority: 'critical' },
        ],
      },
    });

    expect(status).toBe(200);
    expect(typeof data.reply).toBe('string');
    const planAction = data.actions.find((a: any) => a.type === 'plan_my_day');
    expect(Boolean(planAction)).toBe(true);
    expect(Array.isArray(planAction.payload.items)).toBe(true);
    expect(planAction.payload.items.length).toBeGreaterThan(1);
    expect(planAction.payload.items[0].time).toBeTruthy();
    expect(planAction.payload.items[0].taskTitle).toBeTruthy();
  });

  it('Parses and records financial expense transaction', async () => {
    const { status, data } = await postJson('/api/ai/copilot', {
      message: 'Запиши расход 1800 на обед',
      history: [],
    });

    expect(status).toBe(200);
    const txAction = data.actions.find((a: any) => a.type === 'add_transaction');
    expect(Boolean(txAction)).toBe(true);
    expect(txAction.payload.type).toBe('expense');
    expect(txAction.payload.amount).toBe(1800);
  });

  it('Executes theme switching command', async () => {
    const { status, data } = await postJson('/api/ai/copilot', {
      message: 'Поставь изумрудную тему',
      history: [],
    });

    expect(status).toBe(200);
    const themeAction = data.actions.find((a: any) => a.type === 'set_theme');
    expect(Boolean(themeAction)).toBe(true);
    expect(themeAction.payload.accentColor).toBe('#10b981');
  });

  it('Executes tab navigation command', async () => {
    const { status, data } = await postJson('/api/ai/copilot', {
      message: 'Открой раздел задач',
      history: [],
    });

    expect(status).toBe(200);
    const switchAction = data.actions.find((a: any) => a.type === 'switch_tab');
    expect(Boolean(switchAction)).toBe(true);
    expect(switchAction.payload.tab).toBe('tasks');
  });
});

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('api-integration.test.ts')) {
  runner.run().then((results) => {
    const hasFailures = results.some((r) => !r.passed);
    if (hasFailures) process.exit(1);
  });
}
