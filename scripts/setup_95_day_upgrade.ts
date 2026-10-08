import fs from 'fs';
import path from 'path';
import os from 'os';

const rootDir = 'd:/notesphere-notes-&-planner';
const userFile = path.join(os.homedir(), 'Documents', 'NoteSphere', 'notesphere-data.json');

// 1. Project
const project95 = {
  id: 'proj-95-day-upgrade',
  name: '95-Day Upgrade: Transform OS',
  description: 'Комплексный 95-дневный апгрейд до 31 декабря: Python до первых заказов, C++, тело и осанка, сон 22:00-06:00, фокус и питание.',
  icon: '🚀',
  color: '#6366f1',
  status: 'in_progress',
  startDate: '2026-09-27',
  deadline: '2026-12-31',
  targetGoal: 'Выйти на уверенную базу Python + 3 проекта + первые заказы, укрепить тело и осанку, стабилизировать сон 22:00-06:00.',
  budgetLimit: 4750000, // 50k сум * 95 дней
  milestones: [
    { id: 'm-95-1', title: 'Этап 1: Запуск системы и привыкание (27 сен - 18 окт)', isCompleted: false, targetDate: '2026-10-18' },
    { id: 'm-95-2', title: 'Этап 2: Прокачка (requests, API, git, C++ база, чтение) (19 окт - 15 ноя)', isCompleted: false, targetDate: '2026-11-15' },
    { id: 'm-95-3', title: 'Этап 3: Проекты (3 готовых проекта: парсер, API, Telegram-бот) (16 ноя - 13 дек)', isCompleted: false, targetDate: '2026-12-13' },
    { id: 'm-95-4', title: 'Этап 4: Портфолио, первые заявки на заказы и итоговый тест (14 дек - 31 дек)', isCompleted: false, targetDate: '2026-12-31' }
  ],
  createdAt: '2026-09-27T08:00:00.000Z',
  updatedAt: '2026-09-27T08:00:00.000Z'
};

// 2. Goals
const goals = [
  {
    id: 'goal-95-python',
    name: 'Python: От новичка до коммерческих заказов и 3 проектов',
    description: 'База -> модули -> requests/API -> 3 проекта -> портфолио GitHub и первые заказы.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-python']
  },
  {
    id: 'goal-95-body',
    name: 'Тело & Осанка: Сила всего тела, кор, спина и 30-Day Workout',
    description: 'Регулярные силовые тренировки, осанка, отжимания, приседания, планка без диет на износ.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-workout']
  },
  {
    id: 'goal-95-cpp',
    name: 'C++: Фундамент параллельно с университетом',
    description: 'Освоить типы, циклы, массивы, функции и базовые алгоритмы.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-cpp']
  },
  {
    id: 'goal-95-mind',
    name: 'Интеллект: Чтение / аудиокниги 20-30 минут ежедневно',
    description: 'Развитие концентрации, логики и кругозора через ежедневное вдумчивое чтение.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-reading']
  },
  {
    id: 'goal-95-digital',
    name: 'Телефон и контент: Выход из-под контроля алгоритмов',
    description: 'YouTube, игры и аниме остаются приятным отдыхом, но не крадут продуктивное время.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-digital']
  },
  {
    id: 'goal-95-sleep',
    name: 'Режим сна: Стабильный отбой 22:00 -> подъем 06:00',
    description: 'Глубокое восстановление нервной системы и заряд энергии на весь учебный день.',
    type: 'long',
    targetDate: '2026-12-31',
    progress: 0,
    tasks: [],
    habitIds: ['habit-95-sleep']
  }
];

// 3. Habits
const habits = [
  {
    id: 'habit-95-python',
    title: 'Python Кодинг (мин. 30 мин / норма 2-3 ч)',
    category: 'Учеба',
    icon: 'Code',
    color: '#3b82f6',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  },
  {
    id: 'habit-95-workout',
    title: 'Workout & Осанка (спина, кор, сила)',
    category: 'Здоровье',
    icon: 'Activity',
    color: '#ef4444',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  },
  {
    id: 'habit-95-cpp',
    title: 'C++ Практика (30-60 минут)',
    category: 'Учеба',
    icon: 'Cpu',
    color: '#06b6d4',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  },
  {
    id: 'habit-95-reading',
    title: 'Чтение / Аудиокнига (15-30 минут)',
    category: 'Личное',
    icon: 'BookOpen',
    color: '#a855f7',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  },
  {
    id: 'habit-95-nutrition',
    title: 'Рацион без пропусков (белок + углеводы, до 50k сум)',
    category: 'Здоровье',
    icon: 'Utensils',
    color: '#10b981',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  },
  {
    id: 'habit-95-sleep',
    title: 'Сон: отбой до 22:30 -> подъем 06:00-06:30',
    category: 'Здоровье',
    icon: 'Moon',
    color: '#6366f1',
    completedDates: [],
    createdAt: '2026-09-27T08:00:00.000Z',
    streak: 0
  }
];

// 4. Tasks for Week 1 (27 сентября -> 4 октября)
const days = [
  {
    date: '2026-09-27',
    name: 'День 1 (Воскресенье, 27 сен)',
    focus: 'Запуск системы: переменные и типы в Python, тест формы, настройка расписания',
    items: [
      { title: 'Python: Переменные, типы данных (int, float, str, bool), ввод/вывод input() & print()', prio: 'critical', sub: ['Установить/проверить Python и IDE', 'Решить 10 простых задач на ввод/вывод и арифметику'] },
      { title: 'Workout: Базовый тест сил (макс. отжимания, планка на время, приседания)', prio: 'high', sub: ['Записать исходные цифры в заметку', '5-7 минут растяжка спины и шеи для осанки'] },
      { title: 'Питание: Закупить базовую продуктовую корзину на 2-3 дня (яйца, овсянка, бананы, арахис, рис)', prio: 'high', sub: ['Уложиться в рамки дневного бюджета 50 000 сум', 'Приготовить овсянку с молоком и бананом'] },
      { title: 'Цифровой баланс: Установить лимиты экранного времени на YouTube и игры во время учебы', prio: 'medium', sub: ['Включить режим «Не беспокоить» во время блока кодинга'] },
      { title: 'Интеллект: 15 минут чтения полезной книги или статьи по архитектуре кода', prio: 'medium', sub: ['Без параллельного переключения на уведомления'] },
      { title: 'Сон: Подготовка ко сну в 22:00, убрать яркие экраны за 30 мин до сна', prio: 'high', sub: ['Проветрить комнату', 'Отбой в 22:30'] }
    ]
  },
  {
    date: '2026-09-28',
    name: 'День 2 (Понедельник, 28 сен)',
    focus: 'Ветвления и условия if/elif/else, тренировка груди и трицепса',
    items: [
      { title: 'Python: Ветвления if / elif / else, логические операторы and/or/not (10 задач на логику)', prio: 'critical', sub: ['Написать мини-программу калькулятор условий', 'Решить 5 задач на LeetCode/Codeforces начального уровня'] },
      { title: 'C++: Знакомство со структурой программы (#include <iostream>, main, типы данных cin/cout)', prio: 'medium', sub: ['Сравнить синтаксис cin/cout с input()/print() в Python'] },
      { title: 'Workout: 30-Day Workout День 1 — Грудь и руки (отжимания от пола 4x10, отжимания от возвышения 3x12)', prio: 'high', sub: ['Планка 3x45 сек с ровной поясницей', 'Упражнение «лодочка» для укрепления разгибателей спины'] },
      { title: 'Питание: Полноценный белковый завтрак (3 яйца + овсянка с молоком) и сытный обед с рисом', prio: 'high', sub: ['Не пропускать приемы пищи между парами', 'Перекус: банан + горсть арахиса'] },
      { title: 'Интеллект: 20 минут чтения перед вечерним отдыхом', prio: 'medium', sub: ['Зафиксировать 1 главную мысль в заметках NoteSphere'] },
      { title: 'Сон: Отбой строго в 22:15, будильник на 06:15', prio: 'high', sub: ['Стакан теплой воды перед сном'] }
    ]
  },
  {
    date: '2026-09-29',
    name: 'День 3 (Вторник, 29 сен)',
    focus: 'Циклы for и while, тренировка ног и кора, контроль времени в телефоне',
    items: [
      { title: 'Python: Циклы for и while, range(), операторы break и continue (решить 12 задач)', prio: 'critical', sub: ['Написать скрипт генерации таблицы умножения и поиска простых чисел', 'Практика вложенных циклов'] },
      { title: 'C++: Условные конструкции if/else и switch-case в C++', prio: 'medium', sub: ['Решить 3 задачи с проверкой условий'] },
      { title: 'Workout: Ноги и кор (глубокие приседания 4x15, выпады 3x12 на каждую ногу, подъем ног лежа 3x15)', prio: 'high', sub: ['У стены: стойка с ровной осанкой 3 мин'] },
      { title: 'Питание: Обед — макароны с курицей/бобовыми + свежие овощи', prio: 'high', sub: ['Водный баланс: 1.5 - 2 литра чистой воды за день'] },
      { title: 'Цифровой баланс: Ноль YouTube шортс/рилс до завершения блоков Python и Workout', prio: 'medium', sub: ['Только длинный качественный контент во время вечернего отдыха'] },
      { title: 'Сон: Фиксация режима — отбой в 22:15', prio: 'high', sub: ['Подъем в 06:15'] }
    ]
  },
  {
    date: '2026-09-30',
    name: 'День 4 (Среда, 30 сен)',
    focus: 'Строки и срезы в Python, тренировка спины и осанки',
    items: [
      { title: 'Python: Строки, методы строк (.split, .join, .strip, .replace), срезы [start:stop:step]', prio: 'critical', sub: ['Написать валидатор паролей и очистку текстовых данных', 'Решить задачу на палиндром и переворот строки'] },
      { title: 'C++: Циклы for, while и do-while в C++', prio: 'medium', sub: ['Написать алгоритм суммирования чисел от 1 до N'] },
      { title: 'Workout: Спина и осанка (подтягивания на турнике или австралийские подтягивания 4x8, супермен 3x15, кобра)', prio: 'high', sub: ['Растяжка грудных мышц у дверного проема (снимает сутулость)'] },
      { title: 'Питание: Картофель/рис с яйцами и бобовыми + кефир на ночь', prio: 'high', sub: ['Контроль бюджета: проверить чек-лист трат за 4 дня'] },
      { title: 'Интеллект: 20 минут аудиокниги или чтения', prio: 'medium', sub: ['Анализ прочитанного материала'] },
      { title: 'Сон: Отбой в 22:00 -> подъем в 06:00', prio: 'high', sub: ['Осознанный вечер без скроллинга ленты'] }
    ]
  },
  {
    date: '2026-10-01',
    name: 'День 5 (Четверг, 1 окт)',
    focus: 'Списки (Lists) и методы списков в Python, круговая тренировка',
    items: [
      { title: 'Python: Списки list, методы (.append, .extend, .pop, .remove, .sort), генераторы списков list comprehension', prio: 'critical', sub: ['Написать консольный список дел (мини-менеджер задач)', 'Решить 8 задач на сортировку и фильтрацию списков'] },
      { title: 'C++: Одномерные статические массивы int arr[N], заполнение и вывод', prio: 'medium', sub: ['Поиск максимального и минимального элемента в массиве'] },
      { title: 'Workout: Интенсивный кор и плечи (отжимания «домиком» pike push-ups 3x10, боковая планка 3x30 сек, берпи 3x10)', prio: 'high', sub: ['Вращения плечами и гиперэкстензия на коврике'] },
      { title: 'Питание: Гречка/рис с курицей или яйцами + банан и арахис на перекус', prio: 'high', sub: ['Плотный обед после занятий в университете'] },
      { title: 'Цифровой баланс: Залипание в телефон заменить на 15 мин прогулку на свежем воздухе', prio: 'medium', sub: ['Оставить телефон в кармане'] },
      { title: 'Сон: 22:00 отбой', prio: 'high', sub: ['Подъем в 06:00'] }
    ]
  },
  {
    date: '2026-10-02',
    name: 'День 6 (Пятница, 2 окт)',
    focus: 'Словари (dict) и множества (set), функциональная тренировка',
    items: [
      { title: 'Python: Словари dict (ключ-значение, .keys(), .values(), .items()), множества set', prio: 'critical', sub: ['Написать телефонную книгу и счетчик повторяющихся слов в тексте', 'Решить задачу двух указателей или анаграммы через dict'] },
      { title: 'C++: Вложенные циклы и двумерные матрицы (вывод таблицы, шахматного поля)', prio: 'medium', sub: ['Написать поиск суммы элементов строк матрицы'] },
      { title: 'Workout: Силовая круговая тренировка всего тела (отжимания, приседания с паузой, лодочка, планка)', prio: 'high', sub: ['3 полных круга с отдыхом 90 сек между кругами'] },
      { title: 'Питание: Овсянка утром, плотный обед с фасолью/рисом, творог или кефир вечером', prio: 'high', sub: ['Достаточное количество белка и энергии'] },
      { title: 'Интеллект: 25 минут чтения технической или развивающей литературы', prio: 'medium', sub: ['Выписать 3 новых термина или идеи'] },
      { title: 'Сон: Подготовка ко сну в 22:15', prio: 'high', sub: ['Проветренная темная комната'] }
    ]
  },
  {
    date: '2026-10-03',
    name: 'День 7 (Суббота, 3 окт)',
    focus: 'Функции def в Python, мощная тренировка на спину и бицепс',
    items: [
      { title: 'Python: Функции def, позиционные и именованные аргументы *args, **kwargs, return', prio: 'critical', sub: ['Разбить весь написанный за неделю код на переиспользуемые функции', 'Написать модуль математических и строковых хелперов'] },
      { title: 'C++: Функции в C++, передача параметров по значению и ссылке (&)', prio: 'medium', sub: ['Написать функцию swap и функцию вычисления факториала'] },
      { title: 'Workout: Акцент на спину, плечи и силу хвата (подтягивания 5 подходов, отжимания 4x12, вис на турнике 3xмакс)', prio: 'high', sub: ['Глубокая растяжка поясницы и грудного отдела'] },
      { title: 'Питание: Сбалансированный домашний рацион на 50 000 сум с достаточным количеством калорий', prio: 'high', sub: ['Приготовить порцию еды заранее на завтра'] },
      { title: 'Цифровой детокс: 3 часа днем вообще без соцсетей и мессенджеров', prio: 'medium', sub: ['Чистый фокус на коде и физической активности'] },
      { title: 'Сон: 22:00 отбой', prio: 'high', sub: ['Подъем в 06:00'] }
    ]
  },
  {
    date: '2026-10-04',
    name: 'День 8 (Воскресенье, 4 окт)',
    focus: 'Недельный спринт: консольная мини-игра/утилита на Python, итоги Недели 1 и планирование Недели 2',
    items: [
      { title: 'Python: Итоговый проект Недели 1 — Консольная игра/утилита (Виселица, Квиз или Консольный трекер привычек)', prio: 'critical', sub: ['Использовать все изученное: циклы, списки, словари, функции и валидацию ввода', 'Опубликовать код в свой первый репозиторий на GitHub'] },
      { title: 'C++: Итоговый разбор алгоритмов поиска и сортировки недели (Bubble Sort)', prio: 'medium', sub: ['Реализовать пузырьковую сортировку на C++'] },
      { title: 'Workout & Тело: Контрольный замер силовых показателей и тест осанки (сравнить с 27 сентября)', prio: 'high', sub: ['Записать прогресс в отжиманиях и планке', 'Легкая восстановительная растяжка и прогулка'] },
      { title: 'Ретроспектива и планирование: Оценить Неделю 1, скорректировать план на Неделю 2', prio: 'critical', sub: ['Проверить бюджет питания (50k сум/день)', 'Оценить прогресс режима сна и экранного времени'] },
      { title: 'Интеллект: 30 минут чтения книги', prio: 'medium', sub: ['Подведение итогов прочитанного за 7 дней'] },
      { title: 'Сон: 22:00 стабильный отбой ко второй неделе апгрейда', prio: 'high', sub: ['Подъем в 06:00'] }
    ]
  }
];

let generatedTasks = [];
let taskCounter = 0;

for (const day of days) {
  for (const item of day.items) {
    taskCounter++;
    const taskId = 'task-95-' + day.date + '-' + taskCounter;
    generatedTasks.push({
      id: taskId,
      title: item.title,
      isCompleted: false,
      priority: item.prio,
      category: '95-Day Upgrade',
      dueDate: day.date,
      recurrence: 'none',
      progress: 0,
      eisenhower: item.prio === 'critical' || item.prio === 'high' ? 'urgent-important' : 'not-urgent-important',
      projectId: project95.id,
      description: day.focus,
      subtasks: item.sub.map((s, idx) => ({
        id: 'sub-' + taskId + '-' + idx,
        title: s,
        isCompleted: false
      }))
    });
  }
}

// 5. Notes: Architecture, Nutrition & Guides
const notes = [
  {
    id: 'note-95-master-plan',
    title: '🚀 95-Day Upgrade: Мастер-план и 4 Этапа до 31 Декабря',
    content: '<h1>🚀 95-Day Upgrade: Программа системной трансформации</h1><p><strong>Период:</strong> 27 сентября → 31 декабря (95 дней до Нового года)</p><p><strong>Главные ориентиры:</strong> Регулярное качественное питание (50 000 сум/день), достаточный белок и энергия, сон 22:00 → 06:00, постепенный рост силы и осанки, коммерческий уровень в Python, база C++ и возвращение контроля над вниманием.</p><h2>🎯 6 Главных целей программы</h2><ol><li><strong>Python:</strong> Новичок → синтаксис → библиотеки (requests, API) → 3 реальных проекта → портфолио GitHub → первые онлайн-заказы.</li><li><strong>Тело & Осанка:</strong> 30-Day Workout, сила спины, кора, груди и ног, расправление плеч и здоровая осанка без перегрузок.</li><li><strong>Телефон & Фокус:</strong> YouTube, игры и аниме не запрещены, но перестают управлять расписанием и не крадут продуктивные часы.</li><li><strong>Интеллект:</strong> 15–30 минут чтения / полезных аудиокниг в день, развитие логики и концентрации.</li><li><strong>C++:</strong> Освоение фундамента параллельно с университетской программой.</li><li><strong>Сон:</strong> Постепенное закрепление стабильного режима <strong>22:00 → 06:00</strong>.</li></ol><h2>🗓️ 4 Стратегических этапа</h2><h3>Этап 1: 27 сентября → 18 октября — «Запуск системы»</h3><p>Фокус на привыкании и регулярности, а не на рекордах. Освоение базового синтаксиса Python (переменные, условия, циклы, строки, списки, словари, функции, много логических задач). Начало 30-day workout с упором на спину и осанку. Выстраивание трехразового питания и режима сна.</p><h3>Этап 2: 19 октября → 15 ноября — «Прокачка»</h3><p>Глубокие функции, модули, работа с файлами, requests, HTTP API, основы Git/GitHub, первые скрипты автоматизации. Фундамент C++ (типы, циклы, массивы, функции, базовые алгоритмы). Отслеживание силового прогресса в тренировках. 15-30 мин чтения ежедневно.</p><h3>Этап 3: 16 ноября → 13 декабря — «3 Практических Проекта»</h3><ul><li><strong>Проект 1:</strong> Практический консольный скрипт / парсер данных.</li><li><strong>Проект 2:</strong> Клиентское приложение для работы с внешним REST API.</li><li><strong>Проект 3:</strong> Telegram-бот автоматизации с базой данных и логикой.</li></ul><p>После этого этапа начинается анализ реальных задач на фриланс-биржах и телеграм-каналах с заказами.</p><h3>Этап 4: 14 → 31 декабря — «Монетизация, Портфолио и Финал»</h3><p>Упаковка 2-3 проектов в красивое портфолио на GitHub. Оформление README, отправка первых откликов на простые заказы скриптов/ботов. Контрольные замеры силовых показателей тела и осанки. Подведение итогов сэкономленного времени телефона. Большой итоговый тест 31 декабря.</p>',
    isFavorite: true,
    isPinned: true,
    categoryId: 'cat-study',
    tags: ['95-Day-Upgrade', 'План', 'Python', 'Здоровье'],
    importance: 'critical',
    color: '#6366f1',
    attachments: [],
    isProtected: false,
    versions: [],
    links: ['[[Рацион питания на 50 000 сум]]', '[[Регламент идеального дня: 3 режима]]', '[[Руководство: 30-Day Workout, Спина, Кор и Осанка]]'],
    createdAt: '2026-09-27T08:00:00.000Z',
    updatedAt: '2026-09-27T08:00:00.000Z',
    projectId: project95.id
  },
  {
    id: 'note-95-nutrition',
    title: '🍳 Рацион питания и энергия: Бюджетная база 50 000 сум в день',
    content: '<h1>🍳 Питание без перегрузок и химии: Бюджетная база</h1><p><strong>Бюджет:</strong> ~50 000 сум в день с возможностью готовить самостоятельно.</p><p><strong>Главный принцип:</strong> Не нужны дорогие «гейнеры» или жесткие подсчеты граммов на весах. Нужна простая, сытная, богатая белком и сложными углеводами еда, регулярность без пропуска приемов пищи и без попыток съесть все одним гигантским ужином.</p><h2>🛒 Продуктовая корзина</h2><ul><li>🥚 <strong>Яйца:</strong> Самый дешевый и биодоступный источник чистого белка. Быстро готовятся (вареные, яичница, омлет).</li><li>🥛 <strong>Молоко / Кефир:</strong> Идеально к кашам, для перекусов и вечернего легкого насыщения.</li><li>🌾 <strong>Овсянка:</strong> Доступная энергия медленных углеводов на утро. Прекрасно сочетается с молоком, бананом и арахисом.</li><li>🍚 <strong>Рис:</strong> Доступная база для обеда и ужина, легко варится большими порциями на 2 дня вперед.</li><li>🥔 <strong>Картофель & 🍝 Макароны:</strong> Качественные бюджетные углеводы для восстановления мышц и энергии.</li><li>🫘 <strong>Фасоль / Чечевица / Горох:</strong> Растительный белок и клетчатка по минимальной цене.</li><li>🥜 <strong>Арахис:</strong> Концентрированная энергия, полезные жиры и белок для перекусов между парами.</li><li>🍌 <strong>Бананы:</strong> Быстрый чистый перекус до или после тренировки.</li><li>🍞 <strong>Хлеб:</strong> Обычный хлеб как часть сытного рациона.</li><li>🍗 <strong>Курица:</strong> По бюджету регулярно добавляем части курицы (бедра, голени или филе).</li><li>🥗 <strong>Овощи и зелень:</strong> Огурцы, помидоры, капуста, морковь для пищеварения.</li></ul><h2>🍽️ Пример идеального дня питания</h2><h3>Завтрак</h3><p>Овсянка на молоке с нарезанным бананом и горстью арахиса + 2-3 яйца (вареные или глазунья).</p><h3>Обед</h3><p>Большая порция риса или макарон + курица или тушеная фасоль + свежий салат/овощи.</p><h3>Полдник / Перекус между парами</h3><p>Банан + горсть арахиса + стакан кефира или молока (или бутерброд с яйцом/сыром).</p><h3>Ужин</h3><p>Картофель / рис / макароны + 2 яйца или курица + овощи.</p><h3>Если голоден перед сном</h3><p>Стакан теплого молока или кефира, кусочек хлеба с яйцом — легкий белковый перекус, не нарушающий сон.</p>',
    isFavorite: true,
    isPinned: true,
    categoryId: 'cat-health',
    tags: ['Питание', 'Здоровье', 'Бюджет', 'Энергия'],
    importance: 'high',
    color: '#10b981',
    attachments: [],
    isProtected: false,
    versions: [],
    links: ['[[95-Day Upgrade: Мастер-план и 4 Этапа до 31 Декабря]]'],
    createdAt: '2026-09-27T08:00:00.000Z',
    updatedAt: '2026-09-27T08:00:00.000Z',
    projectId: project95.id
  },
  {
    id: 'note-95-daily-modes',
    title: '⏰ Регламент идеального дня: 3 Режима продуктивности',
    content: '<h1>⏰ Организация дня без жесткой привязки к минутам</h1><p>Расписание университета меняется, поэтому система строится на <strong>3 гибких режимах</strong>, чтобы ни один день не превращался в нулевой.</p><h2>🔴 Режим 1: Минимум — «Плохой / Тяжелый день»</h2><p><em>Когда устал после университета, нет настроения или приболел:</em></p><ul><li>✅ <strong>Python:</strong> Ровно 30 минут (хотя бы 2 задачи или разбор одного урока).</li><li>✅ <strong>Workout:</strong> Короткая разминка 10-15 минут (отжимания, планка, растяжка спины).</li><li>✅ <strong>Интеллект:</strong> 10 минут чтения или аудиокниги.</li><li>✅ <strong>Не залипать в телефоне</strong> часами после этого. Сон вовремя.</li></ul><p><strong>Главное правило:</strong> Даже плохой день дает +1 к стрик-прогрессу и не обнуляет систему.</p><h2>🟢 Режим 2: Нормальный день — «Рабочий ритм»</h2><p><em>Стандартный продуктивный день:</em></p><ul><li>💻 <strong>Python:</strong> 2 – 3 часа чистого фокус-кодинга.</li><li>⚙️ <strong>C++:</strong> 30 – 60 минут практики.</li><li>💪 <strong>Workout:</strong> 30 – 45 минут силовой тренировки + спина/осанка.</li><li>📖 <strong>Чтение / аудиокнига:</strong> 20 – 30 минут.</li><li>🎮 <strong>Отдых:</strong> Университет, прогулки, игры, YouTube и жизнь без чувства вины.</li></ul><h2>🔥 Режим 3: Сильный день — «Турбо-прорыв»</h2><p><em>Когда есть свободные выходные или праздничные дни:</em></p><ul><li>🚀 <strong>Python:</strong> 3 – 4 часа глубокого погружения в проект.</li><li>⚙️ <strong>C++:</strong> 1 час алгоритмов.</li><li>💪 <strong>Workout:</strong> 45 – 60 минут полноценной тренировки.</li><li>🧠 <strong>Интеллект:</strong> 30 минут чтения + конспект.</li></ul><p><em>Это бонусный день для рывка, а не обязательная давящая норма.</em></p>',
    isFavorite: true,
    isPinned: false,
    categoryId: 'cat-personal',
    tags: ['Распорядок', 'Фокус', 'Продуктивность', 'Привычки'],
    importance: 'high',
    color: '#f59e0b',
    attachments: [],
    isProtected: false,
    versions: [],
    links: ['[[95-Day Upgrade: Мастер-план и 4 Этапа до 31 Декабря]]'],
    createdAt: '2026-09-27T08:00:00.000Z',
    updatedAt: '2026-09-27T08:00:00.000Z',
    projectId: project95.id
  },
  {
    id: 'note-95-posture-workout',
    title: '🏋️ Руководство: 30-Day Workout, Спина, Кор и Осанка',
    content: '<h1>🏋️ Тренировочный гайд: Сила, Спина и Ровная Осанка</h1><p>Сидячая учеба за столом и кодинг перегружают шейно-грудной отдел. Тренировки направлены не на истощение, а на <strong>мощный мышечный корсет, широкую спину и расправленные плечи</strong>.</p><h2>🎯 4 Столпа физического прогресса</h2><ol><li><strong>Регулярность:</strong> 4-5 тренировочных дней в неделю лучше, чем 1 изнурительный день.</li><li><strong>Спина и задние дельты:</strong> Упражнения на вытягивание и сведение лопаток (подтягивания, лодочка/супермен, растяжка грудных).</li><li><strong>Кор (пресс и разгибатели спины):</strong> Планка с нейтральным положением таза, подъемы ног, вакуум.</li><li><strong>Базовая сила:</strong> Отжимания от пола (разные хваты), приседания с идеальной техникой, выпады.</li></ol><h2>🧘 Протокол для здоровой осанки (5 минут каждый день)</h2><ul><li><strong>Стойка у стены:</strong> Пятки, икры, ягодицы, лопатки и затылок прижаты к ровной стене — удерживать 2-3 минуты, запоминая ощущение ровной спины.</li><li><strong>Лодочка (Супермен):</strong> Лежа на животе, синхронный подъем рук и ног со сведением лопаток — 3 подхода по 12-15 повторений с фиксацией в верхней точке на 2 сек.</li><li><strong>Раскрытие грудного отдела:</strong> Растяжка грудных мышц в дверном проеме по 30 секунд на каждую сторону (убирает сутулость от сидения за ноутбуком).</li></ul>',
    isFavorite: false,
    isPinned: false,
    categoryId: 'cat-health',
    tags: ['Workout', 'Осанка', 'Спина', 'Здоровье'],
    importance: 'medium',
    color: '#ec4899',
    attachments: [],
    isProtected: false,
    versions: [],
    links: ['[[95-Day Upgrade: Мастер-план и 4 Этапа до 31 Декабря]]'],
    createdAt: '2026-09-27T08:00:00.000Z',
    updatedAt: '2026-09-27T08:00:00.000Z',
    projectId: project95.id
  }
];

// 6. Assemble Full Package JSON
const packageData = {
  meta: {
    title: '95-Day Upgrade OS Package',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    author: 'NEXAR AI Mentor',
    totalTasksWeek1: generatedTasks.length,
    totalGoals: goals.length,
    totalHabits: habits.length,
    totalNotes: notes.length,
    daysCovered: '2026-09-27 -> 2026-10-04 (Неделя 1) + 4 Этапа до 2026-12-31'
  },
  project: project95,
  goals: goals,
  habits: habits,
  tasks: generatedTasks,
  notes: notes
};

// Write standalone package json in project root
const jsonFilePath = path.join(rootDir, '95-day-upgrade.json');
fs.writeFileSync(jsonFilePath, JSON.stringify(packageData, null, 2), 'utf8');
console.log('✔ Successfully created 95-day-upgrade.json at:', jsonFilePath);

// Write standalone backup snapshot format that can also be imported via UI Settings -> Import Backup
const backupSnapshot = {
  _app: 'NoteSphere OS',
  schemaVersion: '2.5.0',
  version: '2.5.0',
  timestamp: new Date().toISOString(),
  exportedAt: new Date().toLocaleString(),
  notes: notes,
  categories: [{ id: 'cat-95-day-upgrade', name: '95-Day Upgrade', icon: 'Rocket', color: '#6366f1' }],
  tasks: generatedTasks,
  projects: [project95],
  habits: habits,
  goals: goals
};
const backupFilePath = path.join(rootDir, 'notesphere-95-day-upgrade-backup.json');
fs.writeFileSync(backupFilePath, JSON.stringify(backupSnapshot, null, 2), 'utf8');
console.log('✔ Successfully created NoteSphere backup file at:', backupFilePath);

// Direct Integration into Active User Documents State
if (fs.existsSync(userFile)) {
  const currentData = JSON.parse(fs.readFileSync(userFile, 'utf8'));

  // Categories
  let cats = [];
  try {
    cats = typeof currentData.ns_categories === 'string' ? JSON.parse(currentData.ns_categories) : (currentData.ns_categories || []);
  } catch (e) { cats = []; }
  if (!cats.some(c => c.name === '95-Day Upgrade')) {
    cats.push({ id: 'cat-95-day-upgrade', name: '95-Day Upgrade', icon: 'Rocket', color: '#6366f1' });
  }

  // Projects
  let projs = [];
  try {
    projs = typeof currentData.ns_projects === 'string' ? JSON.parse(currentData.ns_projects) : (currentData.ns_projects || []);
  } catch (e) { projs = []; }
  projs = projs.filter(p => p.id !== project95.id);
  projs.unshift(project95);

  // Goals
  let currentGoals = [];
  try {
    currentGoals = typeof currentData.ns_goals === 'string' ? JSON.parse(currentData.ns_goals) : (currentData.ns_goals || []);
  } catch (e) { currentGoals = []; }
  const existingGoalIds = new Set(goals.map(g => g.id));
  currentGoals = currentGoals.filter(g => !existingGoalIds.has(g.id));
  currentGoals = [...goals, ...currentGoals];

  // Habits
  let currentHabits = [];
  try {
    currentHabits = typeof currentData.ns_habits === 'string' ? JSON.parse(currentData.ns_habits) : (currentData.ns_habits || []);
  } catch (e) { currentHabits = []; }
  const existingHabitIds = new Set(habits.map(h => h.id));
  currentHabits = currentHabits.filter(h => !existingHabitIds.has(h.id));
  currentHabits = [...habits, ...currentHabits];

  // Notes
  let currentNotes = [];
  try {
    currentNotes = typeof currentData.ns_notes === 'string' ? JSON.parse(currentData.ns_notes) : (currentData.ns_notes || []);
  } catch (e) { currentNotes = []; }
  const existingNoteIds = new Set(notes.map(n => n.id));
  currentNotes = currentNotes.filter(n => !existingNoteIds.has(n.id));
  currentNotes = [...notes, ...currentNotes];

  // Tasks
  let currentTasks = [];
  try {
    currentTasks = typeof currentData.ns_tasks === 'string' ? JSON.parse(currentData.ns_tasks) : (currentData.ns_tasks || []);
  } catch (e) { currentTasks = []; }
  const existingTaskIds = new Set(generatedTasks.map(t => t.id));
  currentTasks = currentTasks.filter(t => !existingTaskIds.has(t.id));
  currentTasks = [...generatedTasks, ...currentTasks];

  currentData.ns_categories = JSON.stringify(cats);
  currentData.ns_projects = JSON.stringify(projs);
  currentData.ns_goals = JSON.stringify(currentGoals);
  currentData.ns_habits = JSON.stringify(currentHabits);
  currentData.ns_notes = JSON.stringify(currentNotes);
  currentData.ns_tasks = JSON.stringify(currentTasks);

  fs.writeFileSync(userFile, JSON.stringify(currentData, null, 2), 'utf8');
  console.log('✔ Direct integration into user database succeeded:', userFile);

  // Markdown Notes in Documents/NoteSphere/Notes
  const notesDir = path.join(path.dirname(userFile), 'Notes');
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
  for (const n of notes) {
    const cleanTitle = n.title.replace(/[\\/:*?\"<>|]/g, '_').trim().slice(0, 60);
    const mdFile = path.join(notesDir, cleanTitle + '.md');
    const textContent = (n.content || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '');
    const md = '# ' + n.title + '\n\n*Категория: 95-Day Upgrade | Обновлено: ' + n.updatedAt + '*\n\n' + textContent + '\n';
    fs.writeFileSync(mdFile, md, 'utf8');
  }
  console.log('✔ Markdown files generated in:', notesDir);
}
