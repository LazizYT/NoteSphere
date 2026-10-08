/**
 * NoteSphere OS — Desktop main process.
 *
 * Запускает встроенный Express-сервер (dist/server.cjs) на localhost и открывает
 * окно приложения. Все данные (заметки, задачи, финансы) пользователь хранит
 * локально: рендерер дублирует состояние в JSON-файл в папке userData через мост
 * nsDisk (см. preload.cjs). Это гарантирует, что после перезапуска приложения
 * заметки останутся на месте.
 */
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const nativeWidgets = require('./nativeWidgets.cjs');

const SERVER_HOST = '127.0.0.1';

// Заставляем скомпилированный сервер работать в production-режиме,
// чтобы он раздавал собранный dist/ (а не встраивал Vite dev-server).
process.env.NODE_ENV = 'production';

let SERVER_PORT = 3000;
let mainWindow = null;
let serverReady = false;

// Подбираем свободный TCP-порт, чтобы исключить конфликты с другими приложениями.
function pickFreePort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function choosePort() {
  try {
    SERVER_PORT = await pickFreePort();
  } catch (err) {
    console.warn('[main] Port autoselect failed, using default:', err.message);
  }
  process.env.PORT = String(SERVER_PORT);
  return SERVER_PORT;
}

// ---------------------------------------------------------------------------
// Persistent on-disk state file in User Documents folder (Documents/NoteSphere)
// ---------------------------------------------------------------------------
function getDocumentsDir() {
  try {
    const docs = app.getPath('documents');
    const dir = path.join(docs, 'NoteSphere');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const fallback = path.join(app.getPath('userData'), 'NoteSphere');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function stateFilePath() {
  const dir = getDocumentsDir();
  return path.join(dir, 'notesphere-data.json');
}

// Auto-migrate previous state from userData if needed
function migrateOldStateIfNeeded() {
  try {
    const newPath = stateFilePath();
    if (!fs.existsSync(newPath)) {
      const oldPath = path.join(app.getPath('userData'), 'notesphere-state.json');
      if (fs.existsSync(oldPath)) {
        console.log('[main] Migrating old state from', oldPath, 'to', newPath);
        fs.copyFileSync(oldPath, newPath);
      }
    }
  } catch (e) {
    console.warn('[main] Migration check:', e.message);
  }
}

ipcMain.handle('ns:load', async () => {
  try {
    migrateOldStateIfNeeded();
    const file = stateFilePath();
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.error('[main] Failed to read state file:', err);
    return null;
  }
});

ipcMain.handle('ns:save', async (_event, value) => {
  try {
    const file = stateFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. Атомарная запись общего JSON состояния
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, value, 'utf8');
    fs.renameSync(tmp, file);

    // 2. Дополнительно экспортируем человекочитаемые заметки в Documents/NoteSphere/Notes/*.md
    try {
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
    } catch (exportErr) {
      // Non-critical background export
    }

    return true;
  } catch (err) {
    console.error('[main] Failed to write state file:', err);
    return false;
  }
});

ipcMain.handle('ns:open-documents-folder', async () => {
  const { shell } = require('electron');
  const dir = getDocumentsDir();
  await shell.openPath(dir);
  return dir;
});

ipcMain.handle('ns:get-documents-path', () => getDocumentsDir());

ipcMain.handle('ns:version', () => app.getVersion());

ipcMain.handle('ns:select-folder', async () => {
  const { dialog } = require('electron');
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку с медиафайлами',
    properties: ['openDirectory', 'dontAddToRecent'],
  });
  return res.canceled || !res.filePaths.length ? null : res.filePaths[0];
});

// ---- Native desktop widgets (always-on-top windows) ----
ipcMain.handle('ns:native:widget:toggle', (_e, id, accent) => nativeWidgets.toggle(id, accent || '#8b5cf6'));
ipcMain.on('ns:native:media', (_e, payload) => nativeWidgets.pushMedia(payload || null));
ipcMain.on('ns:native:notes', (_e, text) => nativeWidgets.pushNotesText(typeof text === 'string' ? text : ''));
ipcMain.on('ns:native:notes:save', (_e, text) => nativeWidgets.pushNotesText(typeof text === 'string' ? text : ''));

app.on('will-quit', () => nativeWidgets.closeAll());

// ---- State sync from a previous window (single instance) ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    nativeTheme.themeSource = 'dark';
    startup();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) startup();
    });
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const deadline = Date.now() + 20000;
    const attempt = () => {
      if (serverReady) return resolve();
      if (Date.now() > deadline) return reject(new Error('Server did not become ready in time.'));
      const req = http.get(`http://${SERVER_HOST}:${SERVER_PORT}/`, (res) => {
        serverReady = true;
        res.resume();
        resolve();
      });
      req.on('error', () => {
        setTimeout(attempt, 300);
      });
      req.setTimeout(2000, () => { req.destroy(); });
    };
    attempt();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#07080a',
    title: 'NoteSphere OS',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: false,
    },
  });

  // Безопасно ограничиваем переходы и открытие всплывающих окон.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowedHost = `http://${SERVER_HOST}:${SERVER_PORT}`;
    if (url.startsWith(allowedHost)) {
      return { action: 'allow' };
    }
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedHost = `http://${SERVER_HOST}:${SERVER_PORT}`;
    if (!url.startsWith(allowedHost)) event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.warn('[Electron] Failed to load URL, falling back to local bundle:', validatedURL, errorCode, errorDescription);
    const localFile = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(localFile)) {
      mainWindow.loadFile(localFile);
    }
  });

  mainWindow.loadURL(`http://${SERVER_HOST}:${SERVER_PORT}`);
}

async function startup() {
  try {
    // Выбираем свободный порт и передаём его серверу через переменную окружения.
    await choosePort();
    // Загружаем скомпилированный сервер и явно запускаем его с выбранным портом.
    const server = require(path.join(__dirname, '..', 'dist', 'server.cjs'));
    if (typeof server.startServer === 'function') {
      await server.startServer(SERVER_PORT);
    } else if (typeof server.default?.startServer === 'function') {
      await server.default.startServer(SERVER_PORT);
    }
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error('[main] Startup failed:', err);
    // Попытка прямого открытия локального HTML бандла при сбое HTTP сервера
    try {
      createWindow();
      const localFile = path.join(__dirname, '..', 'dist', 'index.html');
      if (mainWindow && fs.existsSync(localFile)) {
        mainWindow.loadFile(localFile);
        return;
      }
    } catch {}
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'NoteSphere OS не смог запуститься',
      `Произошла ошибка при запуске локального сервера:\n\n${err.message}\n\nПереустановите приложение или воспользуйтесь установщиком.`
    );
    app.quit();
  }
}