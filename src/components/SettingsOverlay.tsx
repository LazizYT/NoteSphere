/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Moon,
  Sun,
  Monitor,
  Type,
  Shield,
  Palette,
  Keyboard,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Cloud,
  Globe,
  Hash,
  Download,
  Upload,
  Send,
  Cpu,
  Key,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Bot,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { t } from '../config/translations';
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  TelegramConfig,
} from '../utils/telegramSync';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  accentColor: string; // hex or class
  setAccentColor: (color: string) => void;
  fontSize: 'sm' | 'base' | 'lg';
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
  pinCode: string;
  setPinCode: (pin: string) => void;
  isPinLocked: boolean;
  setIsPinLocked: (b: boolean) => void;
  backupData: () => void;
  restoreData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportFormat: (format: 'json' | 'txt') => void;
  language: 'ru' | 'en';
  setLanguage: (lang: 'ru' | 'en') => void;
  currency: 'sum' | 'dollar' | 'krw' | 'rub';
  setCurrency: (curr: 'sum' | 'dollar' | 'krw' | 'rub') => void;
  neonGlow: boolean;
  setNeonGlow: (b: boolean) => void;
  bgBlur: 'none' | 'normal' | 'high';
  setBgBlur: (val: 'none' | 'normal' | 'high') => void;
  customWallpaper?: string;
  setCustomWallpaper?: (url: string) => void;
  bgOpacity?: number;
  setBgOpacity?: (val: number) => void;
  isTransparent?: boolean;
  setIsTransparent?: (val: boolean) => void;
  onOpenWebDAV?: () => void;
  onOpenTelegram?: () => void;
  onExportDigitalGarden?: () => void;
  onOpenWebClipper?: () => void;
  onOpenGlobalTags?: () => void;
}

export const ACCENT_COLORS = [
  { key: 'color_violet' as const, name: 'Фиолетовый', value: '#8b5cf6', bgClass: 'bg-violet-500' },
  { key: 'color_blue' as const, name: 'Космический синий', value: '#3b82f6', bgClass: 'bg-blue-500' },
  { key: 'color_cyan' as const, name: 'Киберпанк бирюза', value: '#06b6d4', bgClass: 'bg-cyan-500' },
  { key: 'color_emerald' as const, name: 'Изумрудно-зеленый', value: '#10b981', bgClass: 'bg-emerald-500' },
  { key: 'color_amber' as const, name: 'Амбровый оранжевый', value: '#f59e0b', bgClass: 'bg-amber-500' },
  { key: 'color_pink' as const, name: 'Розовый кварц', value: '#ec4899', bgClass: 'bg-pink-500' },
  { key: 'color_red' as const, name: 'Гранатный красный', value: '#ef4444', bgClass: 'bg-red-500' },
  { key: 'color_slate' as const, name: 'Стильный монохром', value: '#64748b', bgClass: 'bg-slate-500' },
  { key: 'color_blue' as const, name: 'Индиго', value: '#6366f1', bgClass: 'bg-indigo-500' },
  { key: 'color_violet' as const, name: 'Пурпурный', value: '#a855f7', bgClass: 'bg-purple-500' },
  { key: 'color_cyan' as const, name: 'Морской тиловый', value: '#14b8a6', bgClass: 'bg-teal-500' },
  { key: 'color_amber' as const, name: 'Яркий оранжевый', value: '#f97316', bgClass: 'bg-orange-500' },
  { key: 'color_pink' as const, name: 'Коралловый', value: '#f43f5e', bgClass: 'bg-rose-500' },
  { key: 'color_emerald' as const, name: 'Неоновый лайм', value: '#84cc16', bgClass: 'bg-lime-500' },
  { key: 'color_blue' as const, name: 'Небесный', value: '#0ea5e9', bgClass: 'bg-sky-500' },
  { key: 'color_pink' as const, name: 'Фуксия', value: '#d946ef', bgClass: 'bg-fuchsia-500' },
];

export default function SettingsOverlay({
  isOpen,
  onClose,
  theme,
  setTheme,
  accentColor,
  setAccentColor,
  fontSize,
  setFontSize,
  pinCode,
  setPinCode,
  isPinLocked,
  setIsPinLocked,
  backupData,
  restoreData,
  exportFormat,
  language,
  setLanguage,
  currency,
  setCurrency,
  neonGlow,
  setNeonGlow,
  bgBlur,
  setBgBlur,
  customWallpaper = '',
  setCustomWallpaper,
  bgOpacity = 100,
  setBgOpacity,
  isTransparent = false,
  setIsTransparent,
  onOpenWebDAV,
  onOpenTelegram,
  onExportDigitalGarden,
  onOpenWebClipper,
  onOpenGlobalTags,
}: SettingsOverlayProps) {
  const [internalPin, setInternalPin] = useState(pinCode);
  const [showPinAlert, setShowPinAlert] = useState(false);

  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'connected' | 'demo' | 'checking'>('checking');
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram Config State
  const [tgConfig, setTgConfig] = useState<TelegramConfig>(getTelegramConfig);
  const [showTgToken, setShowTgToken] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [tgMessage, setTgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((d) => {
          if (d.hasKey) {
            setGeminiStatus('connected');
          } else {
            setGeminiStatus('demo');
          }
        })
        .catch(() => setGeminiStatus('demo'));

      setTgConfig(getTelegramConfig());
      setGeminiMessage(null);
      setTgMessage(null);
    }
  }, [isOpen]);

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) return;
    setIsSavingGemini(true);
    setGeminiMessage(null);
    try {
      const res = await fetch('/api/ai/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: geminiKey.trim(), apiKey: geminiKey.trim() }),
      });
      const data = await res.json();
      setIsSavingGemini(false);
      if (res.ok && (data.success || data.ok)) {
        setGeminiStatus('connected');
        triggerHaptic('success');
        setGeminiMessage({
          type: 'success',
          text: language === 'ru' ? 'Gemini API ключ сохранен и активирован!' : 'Gemini API key saved and activated!',
        });
      } else {
        triggerHaptic('error');
        setGeminiMessage({
          type: 'error',
          text: data.error || (language === 'ru' ? 'Ошибка сохранения ключа' : 'Failed to save key'),
        });
      }
    } catch (err: any) {
      setIsSavingGemini(false);
      triggerHaptic('error');
      setGeminiMessage({ type: 'error', text: err.message || 'Ошибка связи с сервером' });
    }
  };

  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    setGeminiMessage(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: geminiKey.trim(), apiKey: geminiKey.trim() }),
      });
      const data = await res.json();
      setIsTestingGemini(false);
      if (res.ok && (data.success || data.ok)) {
        setGeminiStatus('connected');
        triggerHaptic('success');
        setGeminiMessage({
          type: 'success',
          text: `✅ Gemini API работает! Модель: ${data.model || 'gemini-2.5-flash'}`,
        });
      } else {
        triggerHaptic('error');
        setGeminiMessage({
          type: 'error',
          text: `❌ ${data.error || 'Ошибка проверки ключа Gemini'}`,
        });
      }
    } catch (e: any) {
      setIsTestingGemini(false);
      triggerHaptic('error');
      setGeminiMessage({ type: 'error', text: 'Ошибка соединения с сервером NoteSphere' });
    }
  };

  const handleSaveTgConfig = () => {
    saveTelegramConfig(tgConfig);
    triggerHaptic('success');
    setTgMessage({
      type: 'success',
      text: language === 'ru' ? 'Настройки Telegram сохранены!' : 'Telegram settings saved!',
    });
  };

  const handleTestTgConnection = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      setTgMessage({
        type: 'error',
        text: language === 'ru' ? 'Укажите Bot Token и Chat ID' : 'Provide Bot Token and Chat ID',
      });
      return;
    }
    setIsTestingTg(true);
    setTgMessage(null);
    const res = await testTelegramConnection(tgConfig);
    setIsTestingTg(false);
    if (res.success) {
      triggerHaptic('success');
      setTgMessage({ type: 'success', text: res.message });
      handleSaveTgConfig();
    } else {
      triggerHaptic('error');
      setTgMessage({ type: 'error', text: res.message });
    }
  };

  const openTelegramCloud = onOpenTelegram || onOpenWebDAV;

  const [autoStart, setAutoStart] = useState<boolean>(() => {
    return localStorage.getItem('ns_auto_start') === 'true';
  });

  // Keyboard Hotkeys State for Media Player
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('ns_win_hotkeys');
    if (saved) {
      try {
        return {
          playPause: 'Space',
          stop: 'KeyS',
          next: 'KeyN',
          prev: 'KeyP',
          mute: 'KeyM',
          ...JSON.parse(saved)
        };
      } catch (e) {}
    }
    return {
      playPause: 'Space',
      stop: 'KeyS',
      next: 'KeyN',
      prev: 'KeyP',
      mute: 'KeyM'
    };
  });
  const [bindingAction, setBindingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!bindingAction) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newCode = e.code;
      const updated = {
        ...hotkeys,
        [bindingAction]: newCode
      };
      setHotkeys(updated);
      localStorage.setItem('ns_win_hotkeys', JSON.stringify(updated));
      setBindingAction(null);
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
    };
  }, [bindingAction, hotkeys]);

  const formatKeyCode = (code: string) => {
    if (!code) return 'None';
    return code
      .replace(/^Key/, '')
      .replace(/^Digit/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  if (!isOpen) return null;

  const handleSavePin = () => {
    if (internalPin && internalPin.length !== 4) {
      setShowPinAlert(true);
      return;
    }
    setPinCode(internalPin);
    setIsPinLocked(!!internalPin);
    setShowPinAlert(false);
  };

  const handleClearPin = () => {
    setInternalPin('');
    setPinCode('');
    setIsPinLocked(false);
    setShowPinAlert(false);
  };

  return (
    <div id="settings-overlay-bg" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 select-none">
      <div id="settings-card" className="w-full max-w-lg bg-white dark:bg-[#0e1422] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div id="settings-header" className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090b10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <Settings id="sett-icon" className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">{t(language, 'settings_title')}</h2>
          </div>
          <button id="close-settings" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="settings-content" className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          
          {/* Theme Section */}
          <div id="theme-section" className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sun className="w-4 h-4" /> {t(language, 'theme_section')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'auto'] as const).map((tMode) => (
                <button
                  id={`theme-btn-${tMode}`}
                  key={tMode}
                  onClick={() => setTheme(tMode)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 transition-all capitalize ${
                    theme === tMode
                      ? 'border-slate-800 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200'
                      : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-75 *'
                  }`}
                >
                  {tMode === 'light' && <Sun className="w-4 h-4" />}
                  {tMode === 'dark' && <Moon className="w-4 h-4" />}
                  {tMode === 'auto' && <Monitor className="w-4 h-4" />}
                  {tMode === 'light' ? t(language, 'theme_light') : tMode === 'dark' ? t(language, 'theme_dark') : t(language, 'theme_auto')}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets Section */}
          <div id="color-section" className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4" /> {t(language, 'accent_section')}
              </label>
              <span className="text-xs font-mono text-slate-400">{accentColor}</span>
            </div>
            
            {/* Color Swatches Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColor.toLowerCase() === color.value.toLowerCase();
                return (
                  <button
                    id={`accent-btn-${color.name}`}
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setAccentColor(color.value);
                      triggerHaptic('light');
                    }}
                    title={color.name}
                    className={`h-11 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-white ring-2 ring-indigo-500 shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-700 hover:scale-102 hover:border-slate-400'
                    } bg-slate-50 dark:bg-slate-800/80`}
                  >
                    <span className={`w-4 h-4 rounded-full ${color.bgClass} shadow-inner flex items-center justify-center`}>
                      {isSelected && <Check size={10} className="text-white drop-shadow" />}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate w-full text-center px-0.5">
                      {color.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input Row */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <span>Свой цвет из палитры:</span>
                <input
                  type="color"
                  value={accentColor.startsWith('#') ? accentColor : '#8b5cf6'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0 bg-transparent"
                  title="Открыть спектр цветов"
                />
              </label>
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#8b5cf6"
                className="w-24 text-xs font-mono uppercase px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Wallpaper / Background Section */}
          <div id="wallpaper-section" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-400" /> Фон и обои приложения
              </label>
              {customWallpaper && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomWallpaper?.('');
                    triggerHaptic('light');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-400 hover:underline cursor-pointer"
                >
                  Сбросить фон
                </button>
              )}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomWallpaper?.('');
                  triggerHaptic('light');
                }}
                className={`h-16 rounded-xl border flex flex-col items-center justify-center text-xs font-medium transition cursor-pointer ${
                  !customWallpaper
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 font-bold bg-indigo-500/10 text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Без фона
              </button>
              {[
                { name: 'Космос', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80' },
                { name: 'Киберпанк', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80' },
                { name: 'Волны', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80' },
                { name: 'Аура', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80' },
                { name: 'Туман', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1600&auto=format&fit=crop&q=80' },
                { name: 'Закат', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1600&auto=format&fit=crop&q=80' },
              ].map((wp) => (
                <button
                  key={wp.name}
                  type="button"
                  onClick={() => {
                    setCustomWallpaper?.(wp.url);
                    triggerHaptic('light');
                  }}
                  className={`relative h-16 rounded-xl border overflow-hidden transition group cursor-pointer ${
                    customWallpaper === wp.url ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-md' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <img src={wp.url} alt={wp.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs text-[10px] text-white py-0.5 text-center font-medium">
                    {wp.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom File Upload & Opacity */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition">
                <Upload size={14} className="text-indigo-400" />
                <span>Загрузить фото с диска</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const res = ev.target?.result as string;
                      if (res) {
                        setCustomWallpaper?.(res);
                        triggerHaptic('success');
                      }
                    };
                    reader.readAsDataURL(f);
                  }}
                />
              </label>

              {setBgOpacity && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">Яркость:</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={bgOpacity !== undefined ? (bgOpacity <= 1 ? Math.round(bgOpacity * 100) : bgOpacity) : 85}
                    onChange={(e) => setBgOpacity(Number(e.target.value))}
                    className="w-20 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round(bgOpacity !== undefined ? (bgOpacity <= 1 ? bgOpacity * 100 : bgOpacity) : 85)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Font Sizes Section */}
          <div id="font-section" className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Type className="w-4 h-4" /> {t(language, 'font_section')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  id={`font-btn-${sz}`}
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                    fontSize === sz
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200'
                      : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {sz === 'sm' && <span className="text-xs">{t(language, 'font_sm')}</span>}
                  {sz === 'base' && <span className="text-sm">{t(language, 'font_base')}</span>}
                  {sz === 'lg' && <span className="text-base">{t(language, 'font_lg')}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Interface Language Section */}
          <div id="language-section" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="text-base">🌐</span> {t(language, 'language_section')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="lang-btn-ru"
                onClick={() => setLanguage('ru')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  language === 'ru'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                Русский (RU)
              </button>
              <button
                id="lang-btn-en"
                onClick={() => setLanguage('en')}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  language === 'en'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>

          {/* Income Currency Section */}
          <div id="currency-section" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="text-base">💰</span> {t(language, 'currency_section')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                id="currency-btn-rub"
                onClick={() => setCurrency('rub')}
                className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all truncate ${
                  currency === 'rub'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {t(language, 'curr_rub')}
              </button>
              <button
                id="currency-btn-dollar"
                onClick={() => setCurrency('dollar')}
                className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all truncate ${
                  currency === 'dollar'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {t(language, 'curr_dollar')}
              </button>
              <button
                id="currency-btn-sum"
                onClick={() => setCurrency('sum')}
                className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all truncate ${
                  currency === 'sum'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {t(language, 'curr_sum')}
              </button>
              <button
                id="currency-btn-krw"
                onClick={() => setCurrency('krw')}
                className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all truncate ${
                  currency === 'krw'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {t(language, 'curr_krw')}
              </button>
            </div>
          </div>


          {/* Key Bindings Section */}
          <div id="hotkeys-config-section" className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
              <Keyboard className="w-4 h-4" style={{ color: accentColor }} /> {t(language, 'hotkeys_section')}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(language, 'hotkeys_desc')}
            </p>

            <div className="space-y-2.5 bg-slate-50/75 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
              {[
                { keyId: 'playPause', label: t(language, 'hotkey_play_pause') },
                { keyId: 'stop', label: t(language, 'hotkey_stop') },
                { keyId: 'next', label: t(language, 'hotkey_next') },
                { keyId: 'prev', label: t(language, 'hotkey_prev') },
                { keyId: 'mute', label: t(language, 'hotkey_mute') }
              ].map((action) => (
                <div key={action.keyId} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-755 dark:text-slate-300">{action.label}</span>
                  <button
                    id={`bind-btn-${action.keyId}`}
                    onClick={() => setBindingAction(action.keyId)}
                    className={`py-1.5 px-3 rounded-lg border text-[11px] font-mono font-bold transition-all min-w-[130px] text-center cursor-pointer active:scale-95 ${
                      bindingAction === action.keyId
                        ? 'border-indigo-500 bg-indigo-500 text-white animate-pulse shadow-sm'
                        : 'border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-150 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    style={bindingAction === action.keyId ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                    title="Нажмите для ввода новой кнопки"
                  >
                    {bindingAction === action.keyId ? t(language, 'hotkey_press_key') : formatKeyCode(hotkeys[action.keyId])}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AutoStart with computer option */}
          <div id="autostart-config-section" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
              {t(language, 'autostart_section')}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(language, 'autostart_desc')}
            </p>
            <div className="flex items-center justify-between p-3 bg-slate-50/75 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
              <span className="text-xs font-semibold text-slate-755 dark:text-slate-300">{t(language, 'autostart_label')}</span>
              <button
                id="autostart-toggle-btn"
                onClick={() => {
                  const newVal = !autoStart;
                  setAutoStart(newVal);
                  localStorage.setItem('ns_auto_start', newVal ? 'true' : 'false');
                  triggerHaptic('medium');
                }}
                className={`py-1.5 px-3 rounded-lg border text-[11px] font-bold transition-all min-w-[130px] text-center cursor-pointer active:scale-95 ${
                  autoStart
                    ? 'text-white border-transparent shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-150 hover:bg-slate-50'
                }`}
                style={autoStart ? { backgroundColor: accentColor } : {}}
              >
                {autoStart ? t(language, 'autostart_active') : t(language, 'autostart_disabled')}
              </button>
            </div>
            {autoStart && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono leading-relaxed bg-emerald-500/10 dark:bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                СФЕРА НАСТРОЕНА: Приложение добавлено во внутренний реестр автозапуска. При установке PWA-приложения SpherePlayer на рабочий стол (через кнопку установки в строке браузера) оно будет запускаться при входе в систему.
              </p>
            )}
          </div>

          {/* PIN-code for safety */}
          <div id="safety-section" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> {t(language, 'security_section')}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(language, 'security_desc')}
            </p>
            <div className="flex gap-2 items-center">
              <input
                id="pin-code-input"
                type="password"
                maxLength={4}
                placeholder={t(language, 'pin_placeholder')}
                value={internalPin}
                onChange={(e) => setInternalPin(e.target.value.replace(/\D/g, ''))}
                className="w-28 py-2 px-3 text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                id="set-pin-btn"
                onClick={handleSavePin}
                className="py-2 px-4 rounded-xl text-white text-sm font-medium hover:bg-opacity-90 transition-all font-sans"
                style={{ backgroundColor: accentColor }}
              >
                {t(language, 'save_pin')}
              </button>
              {isPinLocked && (
                <button
                  id="clear-pin-btn"
                  onClick={handleClearPin}
                  className="py-2 px-3 rounded-xl border border-red-500 text-red-500 dark:border-red-600 dark:text-red-400 hover:bg-red-50 text-sm font-medium transition-colors"
                >
                  {t(language, 'reset_pin')}
                </button>
              )}
            </div>
            {showPinAlert && (
              <p className="text-red-500 text-xs mt-1">{t(language, 'pin_error')}</p>
            )}
          </div>

          {/* API & Cloud Integrations Section */}
          <div id="api-integrations-section" className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Cpu className="w-4 h-4" style={{ color: accentColor }} /> {t(language, 'api_section_title')}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t(language, 'api_section_desc')}
              </p>
            </div>

            {/* Google Gemini API Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Sparkles size={16} />
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    {t(language, 'gemini_api_label')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {geminiStatus === 'connected' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {t(language, 'gemini_status_connected')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {t(language, 'gemini_status_demo')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder={t(language, 'gemini_api_placeholder')}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full py-2 pl-3 pr-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={isTestingGemini}
                  className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                  title="Проверить работоспособность ключа"
                >
                  {isTestingGemini ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Тест</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveGeminiKey}
                  disabled={isSavingGemini || !geminiKey.trim()}
                  className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingGemini ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{t(language, 'gemini_save_btn')}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-0.5">
                <span>Модель: <code className="text-indigo-400 font-mono">gemini-2.5-flash</code></span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-500 hover:text-indigo-400 hover:underline"
                >
                  Получить ключ в Google AI Studio ↗
                </a>
              </div>

              {geminiMessage && (
                <div
                  className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    geminiMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {geminiMessage.type === 'success' ? <Check size={12} /> : <X size={12} />}
                  <span>{geminiMessage.text}</span>
                </div>
              )}
            </div>

            {/* Telegram Bot API Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                    <Bot size={16} />
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    Telegram Bot API (Cloud Sync)
                  </span>
                </div>
                {openTelegramCloud && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openTelegramCloud();
                    }}
                    className="text-[11px] text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t(language, 'telegram_cloud_title')}</span>
                    <Send size={11} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t(language, 'tg_bot_token_label')}
                  </span>
                  <div className="relative">
                    <input
                      type={showTgToken ? 'text' : 'password'}
                      placeholder={t(language, 'tg_bot_token_placeholder')}
                      value={tgConfig.botToken}
                      onChange={(e) => setTgConfig((p) => ({ ...p, botToken: e.target.value }))}
                      className="w-full py-1.5 pl-2.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-sky-500 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTgToken(!showTgToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                    >
                      {showTgToken ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t(language, 'tg_chat_id_label')}
                  </span>
                  <input
                    type="text"
                    placeholder={t(language, 'tg_chat_id_placeholder')}
                    value={tgConfig.chatId}
                    onChange={(e) => setTgConfig((p) => ({ ...p, chatId: e.target.value }))}
                    className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-sky-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestTgConnection}
                  disabled={isTestingTg || !tgConfig.botToken || !tgConfig.chatId}
                  className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingTg ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} className="text-sky-500" />}
                  <span>{t(language, 'tg_test_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTgConfig}
                  className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={12} className="text-emerald-500" />
                  <span>{t(language, 'tg_save_btn')}</span>
                </button>
              </div>

              {tgMessage && (
                <div
                  className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    tgMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {tgMessage.type === 'success' ? <Check size={12} /> : <X size={12} />}
                  <span>{tgMessage.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Storage, Sync & Export Section */}
          <div id="storage-sync-section" className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Cloud className="w-4 h-4" style={{ color: accentColor }} /> {t(language, 'storage_section')}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t(language, 'storage_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Telegram Cloud Backup */}
              {openTelegramCloud && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openTelegramCloud();
                  }}
                  className="p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-left flex items-center justify-between group transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                      <Send size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 dark:group-hover:text-white transition-colors">{t(language, 'telegram_cloud_title')}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t(language, 'telegram_cloud_subtitle')}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-sky-500 dark:text-sky-400 font-semibold">{t(language, 'configure_arrow')}</span>
                </button>
              )}

              {/* Digital Garden */}
              {onExportDigitalGarden && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onExportDigitalGarden();
                  }}
                  className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-left flex items-center justify-between group transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                      <Globe size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{t(language, 'garden_title')}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t(language, 'garden_subtitle')}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-500 dark:text-emerald-400 font-semibold">{t(language, 'export_arrow')}</span>
                </button>
              )}

              {/* Web Clipper */}
              {onOpenWebClipper && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWebClipper();
                  }}
                  className="p-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-left flex items-center justify-between group transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-violet-500/20 text-violet-500 dark:text-violet-400">
                      <Globe size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-white transition-colors">{t(language, 'clipper_title')}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t(language, 'clipper_subtitle')}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-violet-500 dark:text-violet-400 font-semibold">{t(language, 'open_arrow')}</span>
                </button>
              )}

              {/* Global Tags */}
              {onOpenGlobalTags && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGlobalTags();
                  }}
                  className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-left flex items-center justify-between group transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400">
                      <Hash size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-white transition-colors">{t(language, 'tags_title')}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t(language, 'tags_subtitle')}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-amber-500 dark:text-amber-400 font-semibold">{t(language, 'explore_arrow')}</span>
                </button>
              )}
            </div>

            {/* Direct JSON Backup & Restore & TXT Export */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t(language, 'backups_heading')}
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  id="backup-btn"
                  onClick={backupData}
                  className="py-2 px-3.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
                >
                  <Download size={14} className="text-emerald-500" />
                  <span>{t(language, 'backup_create_json')}</span>
                </button>
                <label className="py-2 px-3.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700">
                  <Upload size={14} className="text-blue-500" />
                  <span>{t(language, 'backup_restore_json')}</span>
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".json"
                    onChange={restoreData}
                    className="hidden"
                  />
                </label>
                <button
                  id="export-txt-btn"
                  onClick={() => exportFormat('txt')}
                  className="py-2 px-3.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
                >
                  <Download size={14} className="text-violet-500" />
                  <span>{t(language, 'backup_export_txt')}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div id="settings-footer" className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 text-xs text-slate-500 dark:text-slate-400 font-sans">
          <span>{t(language, 'settings_footer')}</span>
        </div>
      </div>
    </div>
  );
}
