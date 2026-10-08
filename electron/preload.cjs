/**
 * NoteSphere Desktop — preload bridge.
 * Exposes a minimal, safe API to the renderer via contextIsolation.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nsDisk', {
  load: () => ipcRenderer.invoke('ns:load'),
  save: (value) => ipcRenderer.invoke('ns:save', value),
  selectFolder: () => ipcRenderer.invoke('ns:select-folder'),
  openDocumentsFolder: () => ipcRenderer.invoke('ns:open-documents-folder'),
  getDocumentsPath: () => ipcRenderer.invoke('ns:get-documents-path'),
});

contextBridge.exposeInMainWorld('nsAppInfo', {
  version: () => ipcRenderer.invoke('ns:version'),
  platform: process.platform,
});

// Мост для нативных виджетов рабочего стола (Electron only).
contextBridge.exposeInMainWorld('nsNative', {
  isDesktop: () => process.platform !== 'linux' || true,
  toggleWidget: (id, accent) => ipcRenderer.invoke('ns:native:widget:toggle', id, accent),
  pushMedia: (payload) => ipcRenderer.send('ns:native:media', payload),
  pushNotes: (text) => ipcRenderer.send('ns:native:notes', text),
  saveNotes: (text) => ipcRenderer.send('ns:native:notes:save', text),
});

// Приёмник для страниц нативных виджетов (у них тот же preload).
contextBridge.exposeInMainWorld('nsWidget', {
  onMedia: (cb) => ipcRenderer.on('native:media', (_e, d) => cb(d)),
  onNotes: (cb) => ipcRenderer.on('native:notes', (_e, t) => cb(t)),
  save: (text) => ipcRenderer.send('ns:native:notes:save', text),
});