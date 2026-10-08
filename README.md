# <p align="center"><img src="public/icon.svg" width="64" height="64" alt="NoteSphere Logo" /><br/>NoteSphere OS v2.5.0</p>

<p align="center">
  <b>Персональная Операционная Система & ИИ-Кокпит нового поколения</b><br/>
  Единое цифровое пространство для заметок, задач, визуального мышления, финансов, медиа и проектов.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-NEXAR%20Copilot-8A2BE2" />
</p>

<p align="center">
  <a href="https://github.com/LazizYT/NoteSphere/releases/tag/v2.5.0">
    <img src="https://img.shields.io/badge/⬇️_Download-Windows_EXE-blue?style=for-the-badge&logo=windows&logoColor=white" />
  </a>
  <a href="https://github.com/LazizYT/NoteSphere/releases/tag/v2.5.0">
    <img src="https://img.shields.io/badge/⬇️_Download-Android_APK-green?style=for-the-badge&logo=android&logoColor=white" />
  </a>
  <a href="https://github.com/LazizYT/NoteSphere/releases/tag/v2.5.0">
    <img src="https://img.shields.io/badge/Release-v2.5.0-purple?style=for-the-badge" />
  </a>
</p>

---

## 📸 Галерея интерфейса

### ⚡ 1. Главный рабочий стол (Widgets & Cockpit)
> Интерактивный дашборд: фокус дня, тайм-трекинг, привычки, помодоро и расписание.

<p align="center">
  <img src="screenshots_redesign/01_widgets_tab_desktop_1080p.png" alt="NoteSphere Cockpit" width="920"/>
</p>

---

### 📝 2. Заметки и База знаний (Digital Second Brain)
> Двусторонние связи [[Wikilinks]], теги, полнотекстовый поиск, версионирование и экспорт.

<p align="center">
  <img src="screenshots_redesign/02_notes_tab_desktop_1080p.png" alt="Notes & Knowledge Base" width="920"/>
</p>

---

### ✅ 3. Задачи, Канбан и Матрица Эйзенхауэра
> Смарт-фильтры по датам, тайм-блокинг, чеклисты подзадач, доска задач и долгосрочные цели.

<p align="center">
  <img src="screenshots_redesign/03_tasks_tab_kanban_view.png" alt="Tasks Kanban Board" width="920"/>
</p>

<p align="center">
  <img src="screenshots_redesign/03_tasks_tab_desktop_1080p.png" alt="Tasks List & Form" width="920"/>
</p>

---

### 🎨 4. Холст и Ментальные карты (Canvas Creative Space)
> Бесконечная интерактивная доска для карточек, связей, идей и архитектурных схем.

<p align="center">
  <img src="screenshots_redesign/04_canvas_creative_space_desktop_1080p.png" alt="Canvas Creative Space" width="920"/>
</p>

---

### 💰 5. Финансовый трекер и Бюджет
> Доходы, расходы, категории трат, баланс и отслеживание финансовых целей.

<p align="center">
  <img src="screenshots_redesign/05_finance_tab_desktop_1080p.png" alt="Finance Tracking" width="920"/>
</p>

---

### 🎵 6. Медиатека (Аудио, Видео, Фото Студия)
> Локальный плеер с извлечением обложек ID3, плейлистами для музыки и видео, галереей фото.

<p align="center">
  <img src="screenshots_redesign/06_media_tab_desktop_1080p.png" alt="Media Studio" width="920"/>
</p>

---

### 🚀 7. Хаб проектов и Экосистемное управление
> Проектные дашборды, майлстоуны, связанные заметки, задачи и аналитика прогресса.

<p align="center">
  <img src="screenshots_redesign/07_projects_tab_desktop_1080p.png" alt="Projects Hub" width="920"/>
</p>

---

### 🤖 8. Командный центр & NEXAR AI Copilot (`Ctrl + K`)
> Умный поиск по всей системе, управление горячими клавишами и автономный ИИ-помощник.

<p align="center">
  <img src="screenshots_redesign/08_command_center_overlay.png" alt="Command Center & AI" width="920"/>
</p>

---

### ☀️ 9. Темы оформления (OLED Dark & Чистый Light)
> Поддержка ультра-тёмной OLED темы, светлого режима, кастомных обоев и неонового свечения.

<p align="center">
  <img src="screenshots_redesign/10_light_theme_preview.png" alt="Light Theme" width="920"/>
</p>

---

## 🚀 Основные возможности

- 🧠 **NEXAR AI Copilot:** встроенный ИИ-ассистент, умеющий строить проекты, распределять задачи, вести бюджет и отвечать на вопросы.
- 📂 **Офлайн-первичность (Local-First):** данные хранятся локально в IndexedDB и `localStorage`, быстрый экспорт/импорт в JSON.
- 🔒 **Безопасность:** PIN-код защита, локальное шифрование, отсутствие сторонней слежки.
- 📱 **Кроссплатформенность:**
  - **Web**: чистый PWA-клиент
  - **Desktop (Windows EXE)**: сборка на базе Electron
  - **Mobile (Android APK)**: сборка через Capacitor
- 🔄 **Синхронизация:** поддержка WebDAV и Telegram Cloud Backup.

---

## 🛠️ Запуск и разработка

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск в режиме разработки
npm run dev

# 3. Сборка продакшн веб-версии
npm run build

# 4. Сборка десктопного приложения (EXE)
npm run build:exe

# 5. Сборка мобильного приложения (APK)
npm run build:apk
```

---

<p align="center">
  Разработано с ❤️ для максимальной продуктивности • <b>NoteSphere OS</b>
</p>
