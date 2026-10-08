import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ─── Browser Console & Error Catcher Relay ───
let isRelaying = false;
function relayToBackend(level: string, args: any[]) {
  if (isRelaying) return;
  try {
    isRelaying = true;
    const details = args.map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    });

    const message = details.join(' | ');

    fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, details, time: new Date().toLocaleTimeString() }),
    }).catch(() => {});
  } catch {
    // Ignore relay errors to avoid recursion
  } finally {
    isRelaying = false;
  }
}

const originalError = console.error;
console.error = (...args: any[]) => {
  relayToBackend('error', args);
  originalError.apply(console, args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  relayToBackend('warn', args);
  originalWarn.apply(console, args);
};

window.addEventListener('error', (event) => {
  relayToBackend('uncaught-exception', [
    event.message,
    `at ${event.filename}:${event.lineno}:${event.colno}`,
    event.error?.stack || '',
  ]);
});

window.addEventListener('unhandledrejection', (event) => {
  relayToBackend('unhandled-promise', [
    event.reason?.message || event.reason,
    event.reason?.stack || '',
  ]);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

