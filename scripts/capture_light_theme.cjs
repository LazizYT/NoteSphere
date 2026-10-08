/**
 * NoteSphere OS - Automated Light Theme Screenshot Capture
 * Captures pixel-perfect screenshots of all tabs in pure light mode.
 */

process.env.NODE_ENV = 'production';

const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots_light_theme');
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

ipcMain.handle('ns:load', async () => {
  try {
    const file = stateFilePath();
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
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

async function captureTab(name, selector, prepareJs) {
  console.log(`\n--> Capturing [${name}] via ${selector}...`);
  if (selector) {
    await mainWindow.webContents.executeJavaScript(`
      (() => {
        const btn = document.querySelector('${selector}');
        if (btn) btn.click();
      })()
    `);
    await sleep(1500);
  }

  if (prepareJs) {
    try {
      const res = await mainWindow.webContents.executeJavaScript(prepareJs);
      console.log(`   [prepareJs] result for ${name}:`, res);
    } catch (err) {
      console.error(`   [prepareJs ERROR] for ${name}:`, err);
    }
    await sleep(1000);
  }

  // Ensure light mode is applied
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    })()
  `);
  await sleep(300);

  const img = await mainWindow.capturePage();
  const file = path.join(OUTPUT_DIR, `${name}.png`);
  fs.writeFileSync(file, img.toPNG());
  console.log(`   ✔ Saved: ${file} (${img.getSize().width}x${img.getSize().height})`);
}

async function run() {
  const port = await pickFreePort();
  process.env.PORT = String(port);

  console.log(`[Light Capture] Starting server on port ${port}...`);
  const serverModule = require(path.join(__dirname, '..', 'dist', 'server.cjs'));
  if (typeof serverModule.startServer === 'function') {
    serverInstance = await serverModule.startServer(port);
  } else if (typeof serverModule.default?.startServer === 'function') {
    serverInstance = await serverModule.default.startServer(port);
  }

  nativeTheme.themeSource = 'light';

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    backgroundColor: '#f8fafc',
    title: 'NoteSphere OS - Light Theme Audit',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
    },
  });

  mainWindow.webContents.on('console-message', (e, level, msg) => console.log('   [Browser]', msg));

  const url = `http://127.0.0.1:${port}`;
  await mainWindow.loadURL(url);

  // Pre-seed localStorage with light theme
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
    } catch (e) {}
  }

  await mainWindow.webContents.executeJavaScript(`
    (() => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('notesphere_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      // If there is a theme toggle button that needs clicking to align state:
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Переключить тему'));
      if (document.documentElement.classList.contains('dark') && themeBtn) {
        themeBtn.click();
      }
    })()
  `);
  await sleep(1500);

  // 1. Widgets Tab - Notion Hub
  await captureTab('01_light_widgets_notion', '#nav-widgets', `
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Notion Hub'));
      if (btn) btn.click();
    })()
  `);

  // 2. Widgets Tab - Classic Widgets
  await captureTab('01_light_widgets_classic', '#nav-widgets', `
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Виджеты'));
      if (btn) btn.click();
    })()
  `);

  // 3. Notes Tab - Active Editor
  await captureTab('02_light_notes_editor', '#nav-notes', `
    (() => {
      const noteCards = Array.from(document.querySelectorAll('main div.cursor-pointer'));
      if (noteCards.length > 0) noteCards[0].click();
    })()
  `);

  // 4. Notes Tab - Database View
  await captureTab('02_light_notes_database', '#nav-notes', `
    (() => {
      const dbBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('База Данных'));
      if (dbBtn) dbBtn.click();
    })()
  `);

  // 5. Tasks Tab - Kanban
  await captureTab('03_light_tasks_kanban', '#nav-tasks', `
    (() => {
      const kanbanBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Канбан'));
      if (kanbanBtn) kanbanBtn.click();
    })()
  `);

  // 6. Tasks Tab - List
  await captureTab('03_light_tasks_list', '#nav-tasks', `
    (() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Список'));
      if (listBtn) listBtn.click();
    })()
  `);

  // 7. Media Tab - Music Player & Tracklist
  await captureTab('04_light_media_music', '#nav-media', `
    (() => {
      const musicTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Музыка'));
      if (musicTab) musicTab.click();
    })()
  `);

  // 8. Media Tab - Gallery
  await captureTab('04_light_media_gallery', '#nav-media', `
    (() => {
      const galleryTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Галерея'));
      if (galleryTab) galleryTab.click();
    })()
  `);

  // 9. Media Tab - Video
  await captureTab('04_light_media_video', '#nav-media', `
    (() => {
      const videoTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Видео'));
      if (videoTab) videoTab.click();
    })()
  `);

  // 10. Creative Canvas
  await captureTab('05_light_canvas', '#nav-dashboard');

  // 11. Finance Tab
  await captureTab('06_light_finance', '#nav-finance');

  // 12. Projects Tab
  await captureTab('07_light_projects', '#nav-projects');

  // 12.1 Projects Hub AI Tab
  await captureTab('07_light_projects_hub_ai', null, `
    (async () => {
      const card = document.querySelector('[data-project-id]');
      if (!card) return 'No card with data-project-id found';
      card.click();
      await new Promise(r => setTimeout(r, 1500));
      const aiSubtabBtn = document.querySelector('[data-subtab="ai"]');
      if (!aiSubtabBtn) return 'Card clicked, but data-subtab=ai not found';
      aiSubtabBtn.click();
      await new Promise(r => setTimeout(r, 1200));
      return 'Successfully opened project and switched to AI tab';
    })()
  `);

  // 13. Settings Overlay
  await captureTab('08_light_settings', null, `
    (() => {
      const btn = document.querySelector('#settings-trigger-header');
      if (btn) btn.click();
    })()
  `);

  // Close Settings
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const closeBtn = document.querySelector('#close-settings');
      if (closeBtn) closeBtn.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    })()
  `);
  await sleep(600);

  // 14. Command Center
  await captureTab('09_light_command_center', null, `
    (() => {
      const btn = document.querySelector('#command-center-trigger-header');
      if (btn) btn.click();
    })()
  `);

  console.log('\n🎉 Все скриншоты светлой темы успешно сохранены в: ' + OUTPUT_DIR);

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
