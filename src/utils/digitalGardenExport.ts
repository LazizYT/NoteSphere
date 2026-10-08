/**
 * NoteSphere OS — Digital Garden / Static HTML Dump Generator
 * Packages notes into a standalone, single-file responsive website that opens
 * in any browser without needing a server.
 */

import { Note, Category } from '../types';

export function exportDigitalGardenHTML(notes: Note[], categories: Category[]): void {
  const cleanNotes = notes.map((n) => ({
    id: n.id,
    title: n.title || 'Без названия',
    content: n.content || '',
    category: categories.find((c) => c.id === n.categoryId)?.name || 'Общее',
    tags: n.tags || [],
    updatedAt: n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('ru-RU') : '',
    importance: n.importance || 'medium',
  }));

  const dataJSON = JSON.stringify(cleanNotes);
  const categoriesJSON = JSON.stringify(categories.map((c) => c.name));

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🪐 NoteSphere Digital Garden</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: rgba(255, 255, 255, 0.1);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #8b5cf6;
      --accent-hover: #7c3aed;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    #sidebar {
      width: 320px;
      background-color: #0d121f;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    .brand {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .search-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      background: #172033;
      border: 1px solid var(--border);
      color: #fff;
      font-size: 13px;
      outline: none;
    }
    .notes-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .note-item {
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.15s ease;
    }
    .note-item:hover, .note-item.active {
      background: rgba(139, 92, 246, 0.15);
      border-left: 3px solid var(--accent);
    }
    .note-item-title {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .note-item-meta {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 8px;
    }
    #content-pane {
      flex: 1;
      overflow-y: auto;
      padding: 40px 60px;
      max-width: 900px;
      margin: 0 auto;
    }
    .note-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .note-title {
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 8px;
    }
    .note-meta-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 11px;
    }
    .badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 6px;
      color: var(--text-muted);
    }
    .badge-cat {
      background: rgba(139, 92, 246, 0.2);
      color: #c4b5fd;
    }
    .note-body {
      font-size: 15px;
      line-height: 1.7;
      color: #e5e7eb;
    }
    .note-body p { margin-bottom: 16px; }
    .note-body h1, .note-body h2, .note-body h3 {
      color: #fff;
      margin: 24px 0 12px;
    }
    .note-body ul, .note-body ol {
      padding-left: 24px;
      margin-bottom: 16px;
    }
    .note-body li { margin-bottom: 6px; }
    .note-body code {
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
    .note-body pre {
      background: #000;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 16px;
    }
    .note-body blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 16px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div id="sidebar">
    <div class="sidebar-header">
      <div class="brand">🪐 NoteSphere Digital Garden</div>
      <input type="text" id="search-input" class="search-input" placeholder="Поиск заметок..." oninput="filterNotes()">
    </div>
    <div id="notes-list" class="notes-list"></div>
  </div>

  <div id="content-pane">
    <div id="empty-view" style="display:none; text-align:center; padding-top:100px; color:#6b7280;">
      Выберите заметку из списка слева для чтения.
    </div>
    <div id="active-note-view">
      <div class="note-header">
        <h1 id="note-title" class="note-title"></h1>
        <div id="note-badges" class="note-meta-badges"></div>
      </div>
      <div id="note-body" class="note-body"></div>
    </div>
  </div>

  <script>
    const notes = ${dataJSON};
    let activeNoteId = notes.length > 0 ? notes[0].id : null;

    function renderList(list) {
      const container = document.getElementById('notes-list');
      container.innerHTML = '';
      if (list.length === 0) {
        container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:12px; text-align:center;">Заметок не найдено</div>';
        return;
      }
      list.forEach(n => {
        const div = document.createElement('div');
        div.className = 'note-item' + (n.id === activeNoteId ? ' active' : '');
        div.onclick = () => selectNote(n.id);
        div.innerHTML = \`
          <div class="note-item-title">\${escapeHTML(n.title)}</div>
          <div class="note-item-meta">
            <span>📁 \${escapeHTML(n.category)}</span>
            <span>📅 \${escapeHTML(n.updatedAt)}</span>
          </div>
        \`;
        container.appendChild(div);
      });
    }

    function selectNote(id) {
      activeNoteId = id;
      const note = notes.find(n => n.id === id);
      if (!note) return;

      document.getElementById('empty-view').style.display = 'none';
      document.getElementById('active-note-view').style.display = 'block';

      document.getElementById('note-title').textContent = note.title;

      const badges = document.getElementById('note-badges');
      badges.innerHTML = \`
        <span class="badge badge-cat">📁 \${escapeHTML(note.category)}</span>
        <span class="badge">📅 \${escapeHTML(note.updatedAt)}</span>
      \`;
      (note.tags || []).forEach(t => {
        badges.innerHTML += \`<span class="badge">#\${escapeHTML(t)}</span>\`;
      });

      document.getElementById('note-body').innerHTML = note.content || '<p>Заметка пуста.</p>';

      renderList(getFilteredNotes());
    }

    function getFilteredNotes() {
      const q = (document.getElementById('search-input').value || '').toLowerCase();
      return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }

    function filterNotes() {
      renderList(getFilteredNotes());
    }

    function escapeHTML(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    if (notes.length > 0) {
      selectNote(notes[0].id);
    } else {
      document.getElementById('empty-view').style.display = 'block';
      document.getElementById('active-note-view').style.display = 'none';
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notesphere-digital-garden-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
