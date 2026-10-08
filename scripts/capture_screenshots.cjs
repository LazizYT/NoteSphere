/**
 * NoteSphere OS - Automated Full-Tab Screenshot Generator for Redesign
 * Uses Electron to capture pixel-perfect full screenshots of all tabs and modals
 * with real user state (notes, tasks, habits, transactions).
 */

process.env.NODE_ENV = 'production';

const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots_redesign');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function stateFilePath() {
  const docPath = path.join(app.getPath('documents'), 'NoteSphere', 'notesphere-data.json');
  if (fs.existsSync(docPath)) return docPath;
  const userPath = path.join(process.env.APPDATA || '', 'notesphere-os', 'notesphere-state.json');
  if (fs.existsSync(userPath)) return userPath;
  return path.join(app.getPath('userData'), 'notesphere-state.json');
}

// Register IPC handlers to load user state
ipcMain.handle('ns:load', async () => {
  try {
    const file = stateFilePath();
    console.log(`[Screenshot Script] Loading state from: ${file}`);
    if (!fs.existsSync(file)) {
      console.warn(`[Screenshot Script] File not found: ${file}`);
      return null;
    }
    const content = fs.readFileSync(file, 'utf8');
    console.log(`[Screenshot Script] State loaded successfully (${content.length} bytes)`);
    return content;
  } catch (err) {
    console.error(`[Screenshot Script] Error reading state:`, err);
    return null;
  }
});

ipcMain.handle('ns:save', async () => true);
ipcMain.handle('ns:version', () => '1.0.0');
ipcMain.handle('ns:select-folder', async () => null);
ipcMain.handle('ns:native:widget:toggle', async () => null);
ipcMain.on('ns:native:media', () => {});
ipcMain.on('ns:native:notes', () => {});
ipcMain.on('ns:native:notes:save', () => {});

let mainWindow = null;
let serverInstance = null;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureTabViews(tabConfig) {
  console.log(`\n--> Navigating to [${tabConfig.label}]...`);
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('${tabConfig.selector}');
      if (btn) btn.click();
    })()
  `);

  await sleep(tabConfig.wait || 2000);

  if (tabConfig.onActive) {
    await mainWindow.webContents.executeJavaScript(tabConfig.onActive);
    await sleep(1500);
  }

  // 1. Standard 1920x1080 desktop capture
  mainWindow.setContentSize(1920, 1080);
  await sleep(500);

  const desktopImg = await mainWindow.capturePage();
  const desktopFile = path.join(OUTPUT_DIR, `${tabConfig.name}_desktop_1080p.png`);
  fs.writeFileSync(desktopFile, desktopImg.toPNG());
  console.log(`   ✔ Saved Desktop 1080p: ${desktopFile} (${desktopImg.getSize().width}x${desktopImg.getSize().height})`);

  // 2. Full-page complete capture (expand container overflow so entire scroll height is visible)
  const contentHeight = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const render = document.querySelector('#workspace-render');
      const inner = render ? render.firstElementChild : null;
      const h1 = render ? render.scrollHeight : 0;
      const h2 = inner ? inner.scrollHeight : 0;
      const h3 = document.body.scrollHeight;
      const h4 = document.documentElement.scrollHeight;
      return Math.max(h1, h2 + 100, h3, h4, 1080);
    })()
  `);

  if (contentHeight > 1080 && tabConfig.id !== 'dashboard') {
    console.log(`   -> Expanding viewport to full height: 1920x${contentHeight}...`);
    await mainWindow.webContents.executeJavaScript(`
      (() => {
        const render = document.querySelector('#workspace-render');
        if (render) {
          render.style.overflow = 'visible';
          render.style.height = 'auto';
        }
        const splitter = document.querySelector('#workspace-layout-splitter');
        if (splitter) {
          splitter.style.height = 'auto';
        }
      })()
    `);

    mainWindow.setContentSize(1920, Math.min(contentHeight + 120, 5000));
    await sleep(800);

    const fullImg = await mainWindow.capturePage();
    const fullFile = path.join(OUTPUT_DIR, `${tabConfig.name}_full_complete.png`);
    fs.writeFileSync(fullFile, fullImg.toPNG());
    console.log(`   ✔ Saved Complete Full View: ${fullFile} (${fullImg.getSize().width}x${fullImg.getSize().height})`);

    // Restore styling
    await mainWindow.webContents.executeJavaScript(`
      (() => {
        const render = document.querySelector('#workspace-render');
        if (render) {
          render.style.overflow = '';
          render.style.height = '';
        }
        const splitter = document.querySelector('#workspace-layout-splitter');
        if (splitter) {
          splitter.style.height = '';
        }
      })()
    `);
    mainWindow.setContentSize(1920, 1080);
    await sleep(400);
  } else {
    const fullFile = path.join(OUTPUT_DIR, `${tabConfig.name}_full_complete.png`);
    fs.writeFileSync(fullFile, desktopImg.toPNG());
    console.log(`   ✔ Saved Complete View: ${fullFile} (${desktopImg.getSize().width}x${desktopImg.getSize().height})`);
  }

  // Secondary sub-views if requested
  if (tabConfig.subviews) {
    for (const sub of tabConfig.subviews) {
      console.log(`   -> Sub-view [${sub.label}]...`);
      await mainWindow.webContents.executeJavaScript(sub.trigger);
      await sleep(1500);

      const subImg = await mainWindow.capturePage();
      const subFile = path.join(OUTPUT_DIR, `${sub.name}.png`);
      fs.writeFileSync(subFile, subImg.toPNG());
      console.log(`   ✔ Saved Sub-view: ${subFile}`);

      if (sub.cleanup) {
        await mainWindow.webContents.executeJavaScript(sub.cleanup);
        await sleep(1000);
      }
    }
  }
}

async function run() {
  const port = await pickFreePort();
  process.env.PORT = String(port);

  console.log(`[Screenshot Script] Starting server on port ${port}...`);
  const serverModule = require(path.join(__dirname, '..', 'dist', 'server.cjs'));
  if (typeof serverModule.startServer === 'function') {
    serverInstance = await serverModule.startServer(port);
  } else if (typeof serverModule.default?.startServer === 'function') {
    serverInstance = await serverModule.default.startServer(port);
  }

  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: true,
    backgroundColor: '#07080a',
    title: 'NoteSphere OS - Redesign Capture',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
    },
  });

  const url = `http://127.0.0.1:${port}`;
  console.log(`[Screenshot Script] Loading app from ${url}...`);
  await mainWindow.loadURL(url);

  console.log('[Screenshot Script] Pre-seeding localStorage from real desktop state...');
  const stateFile = stateFilePath();
  if (fs.existsSync(stateFile)) {
    try {
      const stateObj = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      await mainWindow.webContents.executeJavaScript(`
        (() => {
          const state = ${JSON.stringify(stateObj)};
          for (const [k, v] of Object.entries(state)) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        })()
      `);
      console.log('[Screenshot Script] Injected state keys into localStorage. Reloading window to hydrate...');
      await mainWindow.reload();
      await sleep(3500);
    } catch (e) {
      console.warn('[Screenshot Script] State pre-seed warning:', e.message);
    }
  }

  console.log('[Screenshot Script] Waiting for full app hydration & database initialization...');
  await sleep(3000);

  const tabs = [
    {
      id: 'widgets',
      name: '01_widgets_tab',
      label: 'Виджеты (Widgets Hub & Dynamic Agenda)',
      selector: '#nav-widgets',
      wait: 2500,
      subviews: [
        {
          name: '01_widgets_tab_calendar_selected_date',
          label: 'Календарь (Задачи на выбранный день)',
          trigger: `
            (() => {
              const dayCells = Array.from(document.querySelectorAll('#notesphere-agenda-sidebar div'));
              const targetDay = dayCells.find(c => c.textContent && c.textContent.trim() === '17');
              if (targetDay) targetDay.click();
            })()
          `,
        },
      ],
    },
    {
      id: 'notes',
      name: '02_notes_tab',
      label: 'Заметки (Notes & Active Editor)',
      selector: '#nav-notes',
      wait: 2500,
      onActive: `
        (() => {
          // Select the first note in the list so editor shows real content
          const noteCards = Array.from(document.querySelectorAll('main div.cursor-pointer'));
          if (noteCards.length > 0) {
            noteCards[0].click();
          }
        })()
      `,
      subviews: [
        {
          name: '02_notes_tab_database_view',
          label: 'База Данных (Database Table View)',
          trigger: `
            (() => {
              const dbBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('База Данных'));
              if (dbBtn) dbBtn.click();
            })()
          `,
          cleanup: `
            (() => {
              const edBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Редактор'));
              if (edBtn) edBtn.click();
            })()
          `,
        },
      ],
    },
    {
      id: 'tasks',
      name: '03_tasks_tab',
      label: 'Задачи (Tasks & Matrix)',
      selector: '#nav-tasks',
      wait: 2500,
      subviews: [
        {
          name: '03_tasks_tab_kanban_view',
          label: 'Канбан Доска (Kanban Board)',
          trigger: `
            (() => {
              const kanbanBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Канбан'));
              if (kanbanBtn) kanbanBtn.click();
            })()
          `,
          cleanup: `
            (() => {
              const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Список'));
              if (listBtn) listBtn.click();
            })()
          `,
        },
        {
          name: '03_tasks_tab_goals_view',
          label: 'Цели и Привычки (Goals & Habits)',
          trigger: `
            (() => {
              const goalsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Цели'));
              if (goalsBtn) goalsBtn.click();
            })()
          `,
          cleanup: `
            (() => {
              const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Список'));
              if (listBtn) listBtn.click();
            })()
          `,
        },
      ],
    },
    {
      id: 'dashboard',
      name: '04_canvas_creative_space',
      label: 'Холст / Творческое пространство (Creative Canvas)',
      selector: '#nav-dashboard',
      wait: 3500,
    },
    {
      id: 'finance',
      name: '05_finance_tab',
      label: 'Финансы (Finance, Budget & Analytics)',
      selector: '#nav-finance',
      wait: 2500,
    },
    {
      id: 'media',
      name: '06_media_tab',
      label: 'Медиатека (Media Player & Focus Audio)',
      selector: '#nav-media',
      wait: 2500,
    },
    {
      id: 'projects',
      name: '07_projects_tab',
      label: 'Проекты (Projects Hub & Linear OS)',
      selector: '#nav-projects',
      wait: 2500,
      subviews: [
        {
          name: '07_projects_tab_kanban',
          label: 'Проекты Канбан (Projects Kanban)',
          trigger: `
            (() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Kanban'));
              if (btn) btn.click();
            })()
          `,
          cleanup: `
            (() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Карточки'));
              if (btn) btn.click();
            })()
          `,
        },
        {
          name: '07_projects_hub_workspace',
          label: 'Project Hub (NoteSphere Mobile)',
          trigger: `
            (() => {
              const card = Array.from(document.querySelectorAll('h3')).find(h => h.textContent && h.textContent.includes('NoteSphere Mobile'));
              if (card) card.click();
            })()
          `,
          cleanup: `
            (() => {
              const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Проекты'));
              if (backBtn) backBtn.click();
            })()
          `,
        },
      ],
    },
  ];

  console.log('\n=== CAPTURING ENHANCED TABS WITH REAL CONTENT ===\n');

  for (const tab of tabs) {
    await captureTabViews(tab);
  }

  // 7. Settings Modal
  console.log('\n--> Capturing [Settings Overlay / Настройки]...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('#settings-trigger-header');
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);

  const settingsImg = await mainWindow.capturePage();
  const settingsFile = path.join(OUTPUT_DIR, '08_settings_overlay.png');
  fs.writeFileSync(settingsFile, settingsImg.toPNG());
  console.log(`   ✔ Saved settings overlay: ${settingsFile}`);

  // Close Settings modal
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const closeBtn = document.querySelector('#close-settings');
      if (closeBtn) closeBtn.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    })()
  `);
  await sleep(1000);

  // 8. Command Center Modal
  console.log('\n--> Capturing [Command Center / NEXAR Copilot]...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('#command-center-trigger-header');
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);

  const ccImg = await mainWindow.capturePage();
  const ccFile = path.join(OUTPUT_DIR, '09_command_center_overlay.png');
  fs.writeFileSync(ccFile, ccImg.toPNG());
  console.log(`   ✔ Saved command center: ${ccFile}`);

  await mainWindow.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    })()
  `);
  await sleep(500);

  // 9. Light Theme Verification
  console.log('\n--> Capturing [Light Theme Mode]...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Переключить тему'));
      if (themeBtn) themeBtn.click();
    })()
  `);
  await sleep(1500);

  const lightImg = await mainWindow.capturePage();
  const lightFile = path.join(OUTPUT_DIR, '10_light_theme_preview.png');
  fs.writeFileSync(lightFile, lightImg.toPNG());
  console.log(`   ✔ Saved light theme preview: ${lightFile}`);

  // Switch back to dark theme
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Переключить тему'));
      if (themeBtn) themeBtn.click();
    })()
  `);
  await sleep(500);

  console.log('\n================================================================');
  console.log('🎉 ВСЕ СКРИНШОТЫ ДЛЯ РЕДИЗАЙНА УСПЕШНО СОЗДАНЫ!');
  console.log(`📁 Директория: ${OUTPUT_DIR}`);
  console.log('================================================================\n');

  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
  app.quit();
}

app.whenReady().then(run).catch((err) => {
  console.error('Fatal error during capture:', err);
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
  app.quit();
});
