// Стойкий слой хранения для NoteSphere.
// Основная проблема в обёртках (EXE/PWA/APK): localStorage ведёт себя как
// непостоянный in-memory профиль — записи "успешны", но теряются при перезапуске.
// Решение: дублируем данные в IndexedDB (устойчива в этих контекстах) и при
// загрузке восстанавливаем их, отдавая приоритет IndexedDB.

const DB_NAME = 'NoteSphereKV';
const DB_VERSION = 2;
const STORE = 'kv';

type KVRow = { key: string; value: string };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[storage] IndexedDB write failed:', key, e);
  }
}

export async function idbGetAll(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        (req.result || []).forEach((row: KVRow) => { map[row.key] = row.value; });
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[storage] IndexedDB read failed:', e);
  }
  return map;
}

// Синхронное безопасное чтение из localStorage (без падений при ошибках).
export function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

// Синхронный безопасный JSON-ридер localStorage.
export function lsGetJSON<T>(key: string): T | null {
  const raw = lsGet(key);
  if (raw == null) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// Универсальная запись: пишем и в localStorage (надежды), и в IndexedDB (как в
// источник истины). Асинхронная зеркальная запись не блокирует рендер.
export function savePersistent(key: string, value: unknown): void {
  let str: string;
  if (typeof value === 'string') {
    str = value;
  } else {
    try { str = JSON.stringify(value); } catch { return; }
  }
  try { localStorage.setItem(key, str); } catch { /* недоступен */ }
  void idbSet(key, str);
  void nsFileUpsert(key, str);
}

// ---------------------------------------------------------------------------
// Файловый слой хранения (Electron desktop).
// В десктопном приложении данные дублируются в JSON-файл в папке userData,
// чтобы заметки гарантированно переживали перезапуски независимо от состояния
// браузерного хранилища. Мост предоставляется preload-скриптом Electron.
// В обычном браузере (без моста) всё работает как раньше (localStorage+IDB).
// ---------------------------------------------------------------------------

type DesktopDiskBridge = {
  load: () => Promise<string | null>;
  save: (value: string) => Promise<void>;
};

function getDiskBridge(): DesktopDiskBridge | null {
  try {
    const b = (window as any).nsDisk as DesktopDiskBridge | undefined;
    return b && b.load && b.save ? b : null;
  } catch {
    return null;
  }
}

// Чтение всего дискового состояния одной пачкой (map: key -> raw value).
// Сначала пробуем Electron bridge (window.nsDisk), затем REST API сервера (/api/storage/load).
export async function nsFileLoadAll(): Promise<Record<string, string>> {
  const bridge = getDiskBridge();
  if (bridge) {
    try {
      const raw = await bridge.load();
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      console.warn('[storage] Desktop state load failed:', e);
      return {};
    }
  }

  // Fallback to server storage API (Web / Browser mode)
  try {
    const res = await fetch('/api/storage/load');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const parsed = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
        return (parsed && typeof parsed === 'object') ? parsed : {};
      }
    }
  } catch {
    // Server endpoint not reachable or offline
  }
  return {};
}

// Обновить одну запись в дисковом файле (read-modify-write).
export async function nsFileUpsert(key: string, value: string): Promise<void> {
  const bridge = getDiskBridge();
  if (bridge) {
    try {
      const current = await nsFileLoadAll();
      current[key] = value;
      await bridge.save(JSON.stringify(current));
    } catch (e) {
      console.warn('[storage] Desktop state save failed:', e);
    }
    return;
  }

  try {
    const current = await nsFileLoadAll();
    current[key] = value;
    await fetch('/api/storage/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: current }),
    });
  } catch {
    // Offline
  }
}

// Записать сразу всё состояние (полная синхронизация).
export async function nsFileSaveAll(values: Record<string, string>): Promise<void> {
  const bridge = getDiskBridge();
  if (bridge) {
    try {
      await bridge.save(JSON.stringify(values));
    } catch (e) {
      console.warn('[storage] Desktop full-state save failed:', e);
    }
    return;
  }

  try {
    await fetch('/api/storage/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: values }),
    });
  } catch {
    // Offline
  }
}

// Открыть папку Документы / NoteSphere в проводнике Windows / Mac / Linux
export async function openDocumentsFolder(): Promise<void> {
  const b = (window as any).nsDisk;
  if (b && typeof b.openDocumentsFolder === 'function') {
    try {
      await b.openDocumentsFolder();
      return;
    } catch (e) {
      console.warn('Failed to open documents folder via electron:', e);
    }
  }
  try {
    await fetch('/api/storage/open-folder', { method: 'POST' });
  } catch (e) {
    console.warn('Failed to open documents folder via API:', e);
  }
}

// Умеем ли мы читать дисковый файл (только в десктоп-приложении)?
export function hasDesktopBridge(): boolean {
  return getDiskBridge() !== null;
}