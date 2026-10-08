const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = 'd:/notesphere-notes-&-planner';
const userFile = path.join(os.homedir(), 'Documents', 'NoteSphere', 'notesphere-data.json');

const startDateStr = '2026-09-29'; // Starting today
const startDateObj = new Date(startDateStr + 'T00:00:00');

function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(baseDate, days) {
  const result = new Date(baseDate.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

const deadlineDate = formatDate(addDays(startDateObj, 89));

const project90 = {
  id: 'proj-python-cpp-90-days',
  name: 'Изучение Python и C++: 90-дневный курс',
  description: 'Пошаговый 90-дневный план: W3Schools Python, YouTube видеоуроки по Python и C++, ООП, Работа с файлами, MySQL, MongoDB, NumPy, Pandas, Matplotlib, Machine Learning и финальные проекты.',
  icon: '💻',
  color: '#3b82f6',
  status: 'in_progress',
  startDate: startDateStr,
  deadline: deadlineDate,
  targetGoal: 'Полностью освоить базовый и продвинутый Python (W3Schools + Data Science/ML), а также фундаментальный C++ с ООП и алгоритмами за 90 дней.',
  budgetLimit: 0,
  milestones: [
    {
      id: 'm-pycpp-1',
      title: 'Этап 1: Фундамент Python и C++ (Дни 1 - 30)',
      isCompleted: false,
      targetDate: formatDate(addDays(startDateObj, 29))
    },
    {
      id: 'm-pycpp-2',
      title: 'Этап 2: ООП, Файлы, Базы Данных и Продвинутый C++ (Дни 31 - 60)',
      isCompleted: false,
      targetDate: formatDate(addDays(startDateObj, 59))
    },
    {
      id: 'm-pycpp-3',
      title: 'Этап 3: Data Science, Machine Learning и Итоговые Проекты (Дни 61 - 90)',
      isCompleted: false,
      targetDate: deadlineDate
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const dayTopics = [
  // Days 1 - 10
  { day: 1, title: 'Введение в Python, Синтаксис и Комментарии', desc: 'W3Schools: Intro, Syntax, Comments. YT Python: Урок 1-2 (Setup & Variables).' },
  { day: 2, title: 'Переменные в Python и вывод данных', desc: 'W3Schools: Variables, Variable Names, Multiple Values, Output. YT Python: Урок 3 (User Input).' },
  { day: 3, title: 'Типы данных, Числа и Приведение типов + C++ Старт', desc: 'W3Schools: Data Types, Numbers, Casting. YT C++: Урок 1 (Intro & Setup).' },
  { day: 4, title: 'Работа со строками и срезы в Python + C++ Переменные', desc: 'W3Schools: Strings, Slicing, Modify, Format, Escape. YT C++: Урок 2 (Variables & Data Types).' },
  { day: 5, title: 'Логический тип (Boolean) и Операторы + C++ Ввод', desc: 'W3Schools: Booleans, Operators. YT Python: Урок 5 (If/Else). YT C++: Урок 3 (User Input).' },
  { day: 6, title: 'Списки (Lists) в Python: Доступ, изменение и удаление', desc: 'W3Schools: Lists, Access, Change, Add, Remove. YT Python: Урок 6 (Lists).' },
  { day: 7, title: 'Циклы по спискам, List Comprehension и Сортировка + C++ Математика', desc: 'W3Schools: Loop Lists, List Comprehension, Sort, Copy, Join. YT C++: Урок 4 (Math Functions).' },
  { day: 8, title: 'Кортежи (Tuples) в Python: Распаковка и операции', desc: 'W3Schools: Tuples, Access, Update, Unpack, Loop. YT Python: Урок 7 (Tuples).' },
  { day: 9, title: 'Множества (Sets) в Python + C++ Условия', desc: 'W3Schools: Sets, Access, Add, Remove, Loop, Join. YT C++: Урок 5 (If Statements).' },
  { day: 10, title: 'Словари (Dictionaries) в Python: Ключи и значения', desc: 'W3Schools: Dictionaries, Access, Change, Add, Remove, Loop, Nested. YT Python: Урок 8 (Dicts).' },

  // Days 11 - 20
  { day: 11, title: 'Условные операторы If...Else в Python + C++ Switch', desc: 'W3Schools: If...Else, Logical Operators, Short Hand. YT C++: Урок 6 (Switches).' },
  { day: 12, title: 'Циклы While в Python (Break, Continue, Else)', desc: 'W3Schools: While Loops. YT Python: Урок 9 (While Loops).' },
  { day: 13, title: 'Циклы For и функция Range в Python + C++ Логика', desc: 'W3Schools: For Loops, Range, Nested Loops. YT Python: Урок 10. YT C++: Урок 7 (Logical Operators).' },
  { day: 14, title: 'Функции в Python: Аргументы, Параметры и Return', desc: 'W3Schools: Functions, Arguments, Default Params, Return. YT Python: Урок 11 (Functions).' },
  { day: 15, title: 'Lambda-функции в Python + C++ Цикл For', desc: 'W3Schools: Lambda, Map, Filter. YT C++: Урок 8 (For Loops in C++).' },
  { day: 16, title: 'Массивы и Область видимости (Scope) + C++ While', desc: 'W3Schools: Arrays, Local & Global Scope. YT C++: Урок 9 (While Loops).' },
  { day: 17, title: 'Модули и импорт в Python', desc: 'W3Schools: Modules, Built-in Modules, Custom Modules. YT Python: Урок 12 (Modules & Imports).' },
  { day: 18, title: 'Модули Даты, Математики и Random в Python + C++ Do-while', desc: 'W3Schools: Dates, Math, Random Module. YT C++: Урок 10 (Do-while Loops).' },
  { day: 19, title: 'Работа с JSON в Python', desc: 'W3Schools: JSON Parsing & Conversion. YT Python: Урок 13 (Scope & Namespace).' },
  { day: 20, title: 'Регулярные выражения (RegEx) в Python + C++ Функции', desc: 'W3Schools: RegEx, Metacharacters, Search, Findall. YT C++: Урок 11 (Functions).' },

  // Days 21 - 30
  { day: 21, title: 'Пакетный менеджер PIP и виртуальные окружения', desc: 'W3Schools: PIP, Install Packages. YT Python: Урок 14 (PIP & Virtual Environments).' },
  { day: 22, title: 'Обработка ошибок Try...Except в Python + C++ Перегрузка функций', desc: 'W3Schools: Try...Except, Else, Finally, Raise. YT C++: Урок 12 (Function Overloading).' },
  { day: 23, title: 'Ввод пользователя и F-строки + C++ Массивы', desc: 'W3Schools: User Input, String Formatting, F-Strings. YT C++: Урок 13 (Arrays in C++).' },
  { day: 24, title: 'Работа с файлами в Python: Чтение файлов', desc: 'W3Schools: File Handling Intro, Reading Files. YT Python: Урок 15 (File I/O).' },
  { day: 25, title: 'Запись и удаление файлов в Python + C++ Ссылки', desc: 'W3Schools: File Writing, Creating & Deleting Files. YT C++: Урок 14 (Pass by Value vs Reference).' },
  { day: 26, title: 'Классы и Объекты в Python (ООП Старт)', desc: 'W3Schools: Classes/Objects, __init__, self, methods. YT Python: Урок 16 (Intro to OOP).' },
  { day: 27, title: 'Наследование в Python + C++ Указатели и Память', desc: 'W3Schools: Inheritance, Parent & Child Classes, super(). YT C++: Урок 15 (Pointers & Memory Addresses).' },
  { day: 28, title: 'Итераторы (Iterators) в Python', desc: 'W3Schools: Iterators, Creating Iterators, StopIteration. YT Python: Урок 17 (OOP Inheritance).' },
  { day: 29, title: 'Полиморфизм в Python + C++ Константы и Ссылки', desc: 'W3Schools: Polymorphism, Class & Inheritance Polymorphism. YT C++: Урок 16 (References & Const).' },
  { day: 30, title: 'Консолидация Этапа 1: Практика базового Python и C++', desc: 'Закрепление материала Дней 1-29. Написание мини-проекта "Консольный справочник / Калькулятор".' },

  // Days 31 - 40
  { day: 31, title: 'MySQL Базы данных в Python: Подключение и создание БД + C++ Динамическая память', desc: 'W3Schools: MySQL Intro, Get Started, Create Database. YT C++: Урок 17 (Dynamic Memory new/delete).' },
  { day: 32, title: 'MySQL: Создание таблиц, Вставка и Выборка (CRUD)', desc: 'W3Schools: MySQL Create Table, Insert Into, Select, Where. YT Python: Урок 18 (OOP Special Methods).' },
  { day: 33, title: 'MySQL: Сортировка, Обновление и Удаление + C++ Структуры', desc: 'W3Schools: MySQL Order By, Delete, Drop, Update, Limit. YT C++: Урок 18 (Structs in C++).' },
  { day: 34, title: 'MySQL: Объединение таблиц (JOINS) + C++ Enums', desc: 'W3Schools: MySQL Inner Join, Left Join, Right Join. YT C++: Урок 19 (Enums in C++).' },
  { day: 35, title: 'Практический скрипт работы с MySQL на Python', desc: 'Создание модуля управления базой данных пользователей / товаров.' },
  { day: 36, title: 'MongoDB NoSQL в Python: Подключение и коллекция', desc: 'W3Schools: MongoDB Intro, Create Database, Create Collection. YT Python: Урок 19 (Exception Handling).' },
  { day: 37, title: 'MongoDB: Вставка, Поиск и Фильтрация + C++ ООП Классы', desc: 'W3Schools: MongoDB Insert, Find, Query, Sort. YT C++: Урок 20 (Classes & Objects in C++).' },
  { day: 38, title: 'MongoDB: Обновление и Удаление документов + C++ Конструкторы', desc: 'W3Schools: MongoDB Delete, Drop Collection, Update, Limit. YT C++: Урок 21 (Constructors & Destructors).' },
  { day: 39, title: 'Сравнение SQL (MySQL) и NoSQL (MongoDB)', desc: 'Сравнительный анализ архитектуры и кейсов использования реляционных и документных БД.' },
  { day: 40, title: 'Модуль Requests в Python: HTTP запросы и API', desc: 'W3Schools: Requests Module, GET/POST, Status codes, JSON API. YT Python: Урок 20 (API Requests).' },

  // Days 41 - 50
  { day: 41, title: 'NumPy: Создание массивов, Индексация и Срезы + C++ Геттеры/Сеттеры', desc: 'W3Schools: NumPy Intro, Array Creation, Indexing, Slicing. YT C++: Урок 22 (Getters & Setters).' },
  { day: 42, title: 'NumPy: Форма массивов (Shape, Reshape) и Копии + C++ Наследование', desc: 'W3Schools: NumPy Copy vs View, Shape, Reshape. YT C++: Урок 23 (Inheritance in C++).' },
  { day: 43, title: 'NumPy: Объединение, Разделение, Сортировка и Фильтры + C++ Полиморфизм', desc: 'W3Schools: NumPy Joining, Splitting, Searching, Sorting, Filter. YT C++: Урок 24 (Polymorphism & Virtual Functions).' },
  { day: 44, title: 'NumPy Random и Распределения вероятностей', desc: 'W3Schools: NumPy Random, Data Distribution, Normal, Binomial. YT Python: Урок 21 (GUI Basics).' },
  { day: 45, title: 'NumPy ufuncs: Векторизация и Математические функции', desc: 'W3Schools: NumPy ufuncs, Arithmetic, Rounding, Logs, Summations.' },
  { day: 46, title: 'Pandas: Введение, Series, DataFrames и Чтение CSV/JSON + C++ Шаблоны', desc: 'W3Schools: Pandas Intro, Series, DataFrames, Read CSV/JSON. YT C++: Урок 25 (Templates).' },
  { day: 47, title: 'Pandas: Анализ и Очистка данных (Cleaning Data)', desc: 'W3Schools: Pandas Analyzing, Cleaning Empty Cells, Wrong Data, Duplicates. YT Python: Урок 22 (Final Project).' },
  { day: 48, title: 'Pandas: Корреляции и Графики + C++ Файловый ввод/вывод', desc: 'W3Schools: Pandas Correlations, Plotting DataFrames. YT C++: Урок 26 (File I/O std::fstream).' },
  { day: 49, title: 'Практика Pandas: Обработка реального датасета', desc: 'Загрузка CSV, очистка пропусков, группировка (groupby) и расчёт метрик.' },
  { day: 50, title: 'SciPy: Оптимизация, Графы и Пространственные данные + C++ Итоги ООП', desc: 'W3Schools: SciPy Intro, Optimizers, Spatial Data. YT C++: Урок 27 (Final Project C++).' },

  // Days 51 - 60
  { day: 51, title: 'Matplotlib: Построение базовых графиков (Pyplot)', desc: 'W3Schools: Matplotlib Intro, Pyplot, Plotting Lines & Points.' },
  { day: 52, title: 'Matplotlib: Стилизация графиков, Метки и Сетка', desc: 'W3Schools: Matplotlib Markers, Line Styles, Colors, Labels, Grid.' },
  { day: 53, title: 'Matplotlib: Subplots, Scatter Plots, Bars, Histograms & Pie Charts', desc: 'W3Schools: Matplotlib Subplots, Scatter, Bar, Hist, Pie.' },
  { day: 54, title: 'Практика Matplotlib: Интерактивный визуальный дашборд', desc: 'Создание комплексного графического отчёта на базе Pandas и Matplotlib.' },
  { day: 55, title: 'Machine Learning Старт: Статистика (Mean, Median, Std Dev, Percentiles)', desc: 'W3Schools: ML Intro, Mean/Median/Mode, Standard Deviation, Percentiles.' },
  { day: 56, title: 'Machine Learning: Распределение данных и Scatter Plot', desc: 'W3Schools: ML Data Distribution, Normal Distribution, Scatter Plot.' },
  { day: 57, title: 'Machine Learning: Линейная и Полиномиальная Регрессия', desc: 'W3Schools: ML Linear Regression, Polynomial Regression, Multiple Regression.' },
  { day: 58, title: 'Machine Learning: Масштабирование признаков и Train/Test Split', desc: 'W3Schools: ML Scale Features, Train/Test Split.' },
  { day: 59, title: 'Machine Learning: Деревья решений (Decision Tree) и Confusion Matrix', desc: 'W3Schools: ML Decision Tree, Confusion Matrix.' },
  { day: 60, title: 'Консолидация Этапа 2: Тестирование регрессионных моделей', desc: 'Построение и оценка точности модели предсказания на реальных данных.' },

  // Days 61 - 70
  { day: 61, title: 'Machine Learning: Иерархическая кластеризация и Логистическая регрессия', desc: 'W3Schools: ML Hierarchical Clustering, Logistic Regression.' },
  { day: 62, title: 'Machine Learning: Grid Search и Категориальные данные', desc: 'W3Schools: ML Grid Search, Categorical Data.' },
  { day: 63, title: 'Machine Learning: K-means Кластеризация и Bagging', desc: 'W3Schools: ML K-means, Bootstrap Aggregation.' },
  { day: 64, title: 'Machine Learning: Кросс-валидация и ROC-кривая (AUC - ROC)', desc: 'W3Schools: ML Cross Validation, AUC - ROC Curve.' },
  { day: 65, title: 'Machine Learning: Метод K-ближайших соседей (KNN)', desc: 'W3Schools: ML K-Nearest Neighbors.' },
  { day: 66, title: 'Python HowTo Практика (Часть 1): Строки, Списки, Дубликаты', desc: 'W3Schools HowTo: Reverse String, Remove Duplicates, Flatten Lists.' },
  { day: 67, title: 'Python HowTo Практика (Часть 2): Сортировки и Словари', desc: 'W3Schools HowTo: Sort Lists, Iterate Dicts, Merge Dictionaries.' },
  { day: 68, title: 'Python HowTo Практика (Часть 3): Файлы и Пути', desc: 'W3Schools HowTo: Read Line by Line, Write List, File Exists, Extensions.' },
  { day: 69, title: 'Python HowTo Практика (Часть 4): Системные команды и Время', desc: 'W3Schools HowTo: Execute System Commands, Argparse, Measure Time.' },
  { day: 70, title: 'Python Reference: Встроенные функции (Built-in Functions)', desc: 'W3Schools Reference: Обзор abs, zip, enumerate, map, filter, sorted и др.' },

  // Days 71 - 80
  { day: 71, title: 'Python Reference: Методы строк (String Methods)', desc: 'W3Schools Reference: split, join, strip, replace, find, format.' },
  { day: 72, title: 'Python Reference: Методы списков и кортежей', desc: 'W3Schools Reference: append, extend, pop, sort, reverse, count.' },
  { day: 73, title: 'Python Reference: Методы словарей и множеств', desc: 'W3Schools Reference: get, items, keys, values, update, union, intersection.' },
  { day: 74, title: 'Python Reference: Файловые методы и Математика', desc: 'W3Schools Reference: File Methods, Math Module, CMath Module.' },
  { day: 75, title: 'Python Reference: Ключевые слова, Исключения и Random', desc: 'W3Schools Reference: Keywords, Exception Hierarchy, Random Methods.' },
  { day: 76, title: 'C++ Алгоритмы: Динамические массивы (std::vector) и Векторы', desc: 'Освоение std::vector, push_back, pop_back, итераторов и выделения памяти.' },
  { day: 77, title: 'C++ Алгоритмы: Стек (std::stack) и Очередь (std::queue)', desc: 'Принцип LIFO и FIFO, работа со стеком и очередью в C++ STL.' },
  { day: 78, title: 'C++ Алгоритмы: Хэш-таблицы и Множества (std::unordered_map)', desc: 'Использование std::unordered_map и std::set для быстрого поиска O(1).' },
  { day: 79, title: 'C++ Алгоритмы: Сортировки и Бинарный поиск', desc: 'Пузырьковая сортировка, быстрая сортировка и std::binary_search.' },
  { day: 80, title: 'Практика C++: Написание собственных структур данных', desc: 'Реализация односвязного списка (Singly Linked List) на чистых указателях.' },

  // Days 81 - 90
  { day: 81, title: 'Итоговый Проект на Python (День 1): Архитектура и Структура', desc: 'Проектирование CLI / Web-парковочной системы или анализатора данных с SQLite.' },
  { day: 82, title: 'Итоговый Проект на Python (День 2): Реализация бизнес-логики', desc: 'Написание основных модулей, логирование, обработка исключений.' },
  { day: 83, title: 'Итоговый Проект на Python (День 3): Интеграция API и Дашборд', desc: 'Получение внешних данных, генерация отчётов Matplotlib.' },
  { day: 84, title: 'Итоговый Проект на C++ (День 1): Архитектура и ООП', desc: 'Создание классов, виртуальных функций, структуры хранения файлов.' },
  { day: 85, title: 'Итоговый Проект на C++ (День 2): Оптимизация и Тестирование', desc: 'Проверка утечек памяти, работа с файловым вводом/выводом, тесты.' },
  { day: 86, title: 'Рефакторинг и Чистый Код (Clean Code & Typing)', desc: 'Приведение кода к PEP 8, добавление type hints в Python, const correctness в C++.' },
  { day: 87, title: 'Git & GitHub Портфолио', desc: 'Оформление репозиториев, создание качественных README.md и коммитов.' },
  { day: 88, title: 'Комплексный Тест: Прохождение W3Schools Quiz', desc: 'Проверьте свои знания в итоговых тестах W3Schools по Python и C++.' },
  { day: 89, title: 'Решение 10 практических задач средней сложности', desc: 'Закрепление алгоритмического мышления перед окончанием курса.' },
  { day: 90, title: 'ФИНАЛ КУРСА: Подведение итогов 90 дней!', desc: 'Презентация созданных проектов, рефлексия и составление плана карьеры!' }
];

const generatedTasks = dayTopics.map((item, index) => {
  const taskDate = formatDate(addDays(startDateObj, index));
  const milestoneId = index < 30 ? 'm-pycpp-1' : (index < 60 ? 'm-pycpp-2' : 'm-pycpp-3');
  
  return {
    id: `task-pycpp-day-${item.day}`,
    title: `День ${item.day}: ${item.title}`,
    description: `${item.desc}\n\nДата плана: ${taskDate}`,
    isCompleted: false,
    dueDate: taskDate,
    dueTime: '18:00',
    priority: index % 5 === 0 ? 'high' : 'medium',
    category: 'study',
    recurrence: 'none',
    progress: 0,
    projectId: 'proj-python-cpp-90-days',
    tags: ['python', 'c++', 'w3schools', 'youtube', '90-day-challenge'],
    status: 'todo',
    subtasks: [
      { id: `st-pycpp-${item.day}-1`, title: 'Изучить теоретический материал / просмотреть видеоурок', isCompleted: false },
      { id: `st-pycpp-${item.day}-2`, title: 'Выполнить практические примеры кода в IDE', isCompleted: false },
      { id: `st-pycpp-${item.day}-3`, title: 'Отметить прогресс и сохранить готовый код', isCompleted: false }
    ]
  };
});

const goal90 = {
  id: 'goal-pycpp-90-days',
  name: 'Освоить Python & C++ за 90 дней',
  description: 'Пройти весь курс W3Schools Python, YouTube ролики по Python и C++, освоить базы данных, NumPy, Pandas, ML и задеплоить проекты.',
  type: 'long',
  targetDate: deadlineDate,
  progress: 0,
  tasks: generatedTasks.map(t => t.id),
  habitIds: ['habit-pycpp-daily-coding']
};

const habit90 = {
  id: 'habit-pycpp-daily-coding',
  title: 'Python & C++ Кодинг (мин. 1 час в день)',
  category: 'Учеба',
  icon: 'Code',
  color: '#3b82f6',
  completedDates: [],
  createdAt: new Date().toISOString(),
  streak: 0
};

console.log(`Generated ${generatedTasks.length} tasks for 90 days from ${startDateStr} to ${deadlineDate}`);

// 1. Write to user data file
if (fs.existsSync(userFile)) {
  const currentData = JSON.parse(fs.readFileSync(userFile, 'utf8'));

  // Categories
  let cats = [];
  try {
    cats = typeof currentData.ns_categories === 'string' ? JSON.parse(currentData.ns_categories) : (currentData.ns_categories || []);
  } catch (e) { cats = []; }
  if (!cats.some(c => c.id === 'cat-study')) {
    cats.push({ id: 'cat-study', name: 'Учеба', icon: 'GraduationCap', color: '#10b981' });
  }

  // Projects
  let projs = [];
  try {
    projs = typeof currentData.ns_projects === 'string' ? JSON.parse(currentData.ns_projects) : (currentData.ns_projects || []);
  } catch (e) { projs = []; }
  projs = projs.filter(p => p.id !== project90.id);
  projs.unshift(project90);

  // Goals
  let currentGoals = [];
  try {
    currentGoals = typeof currentData.ns_goals === 'string' ? JSON.parse(currentData.ns_goals) : (currentData.ns_goals || []);
  } catch (e) { currentGoals = []; }
  currentGoals = currentGoals.filter(g => g.id !== goal90.id);
  currentGoals.unshift(goal90);

  // Habits
  let currentHabits = [];
  try {
    currentHabits = typeof currentData.ns_habits === 'string' ? JSON.parse(currentData.ns_habits) : (currentData.ns_habits || []);
  } catch (e) { currentHabits = []; }
  currentHabits = currentHabits.filter(h => h.id !== habit90.id);
  currentHabits.unshift(habit90);

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
  currentData.ns_tasks = JSON.stringify(currentTasks);

  fs.writeFileSync(userFile, JSON.stringify(currentData, null, 2), 'utf8');
  console.log('✔ Direct integration into user database succeeded:', userFile);
} else {
  console.log('⚠ User data file not found:', userFile);
}
