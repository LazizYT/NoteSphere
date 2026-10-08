/**
 * NoteSphere OS — Telegram Cloud Backup & Restore Modal
 * Zero-cost, permanent and unlimited cloud storage using Telegram Bot API
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  X,
  Check,
  Loader2,
  DownloadCloud,
  UploadCloud,
  HelpCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  TelegramConfig,
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  uploadBackupToTelegram,
  restoreBackupFromTelegram,
} from '../utils/telegramSync';
import { t, Language } from '../config/translations';

interface TelegramBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  getFullBackupData: () => any;
  onRestoreSnapshot: (snapshot: any) => void;
  accentColor: string;
  language?: Language;
}

export default function TelegramBackupModal({
  isOpen,
  onClose,
  getFullBackupData,
  onRestoreSnapshot,
  accentColor,
  language = 'ru',
}: TelegramBackupModalProps) {
  const [config, setConfig] = useState<TelegramConfig>(getTelegramConfig);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getTelegramConfig());
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    saveTelegramConfig(config);
    triggerHaptic('success');
    setStatusMessage({
      type: 'success',
      text: language === 'ru' ? 'Настройки Telegram сохранены!' : 'Telegram settings saved!',
    });
  };

  const handleTestConnection = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'ru' ? 'Введите Bot Token и Chat ID' : 'Please enter Bot Token and Chat ID',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const res = await testTelegramConnection(config);
    setIsTesting(false);

    if (res.success) {
      triggerHaptic('success');
      setStatusMessage({ type: 'success', text: res.message });
      handleSaveConfig();
    } else {
      triggerHaptic('error');
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleUploadBackup = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'ru' ? 'Сначала укажите Bot Token и Chat ID' : 'Specify Bot Token and Chat ID first',
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    try {
      const backupData = getFullBackupData();
      const res = await uploadBackupToTelegram(config, backupData);
      setIsUploading(false);

      if (res.success) {
        triggerHaptic('success');
        setStatusMessage({
          type: 'success',
          text:
            language === 'ru'
              ? `✅ ${res.message} (${res.fileName || ''})`
              : `✅ Backup successfully sent to Telegram!`,
        });
        setConfig(getTelegramConfig());
      } else {
        triggerHaptic('error');
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setIsUploading(false);
      triggerHaptic('error');
      setStatusMessage({ type: 'error', text: err.message || 'Ошибка выгрузки' });
    }
  };

  const handleRestoreBackup = async () => {
    if (!config.botToken.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'ru' ? 'Сначала укажите Bot Token' : 'Specify Bot Token first',
      });
      return;
    }

    const confirmMsg =
      language === 'ru'
        ? 'Восстановление заменит текущие заметки и задачи данными из резервной копии Telegram. Продолжить?'
        : 'Restoring will overwrite current notes and tasks with the Telegram backup data. Continue?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    try {
      const res = await restoreBackupFromTelegram({
        botToken: config.botToken,
        chatId: config.chatId,
        fileId: config.lastBackupFileId,
      });

      setIsRestoring(false);

      if (res.success && res.snapshot) {
        triggerHaptic('success');
        onRestoreSnapshot(res.snapshot);
        setStatusMessage({
          type: 'success',
          text:
            language === 'ru'
              ? '✅ База NoteSphere успешно восстановлена из Telegram!'
              : '✅ NoteSphere database restored from Telegram!',
        });
        setConfig(getTelegramConfig());
      } else {
        triggerHaptic('error');
        setStatusMessage({
          type: 'error',
          text: res.message || (language === 'ru' ? 'Не удалось получить бэкап' : 'Failed to retrieve backup'),
        });
      }
    } catch (err: any) {
      setIsRestoring(false);
      triggerHaptic('error');
      setStatusMessage({ type: 'error', text: err.message || 'Ошибка восстановления' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-white font-sans overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Send size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>{t(language, 'telegram_cloud_title')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-normal">
                    Free & Safe
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{t(language, 'telegram_cloud_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Setup Guide Toggle */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-xs space-y-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle size={14} />
                {language === 'ru' ? 'Как настроить Telegram-бота за 1 минуту?' : 'How to set up Telegram Bot in 1 min?'}
              </span>
              <span className="text-[11px] font-mono">{showGuide ? '▲' : '▼'}</span>
            </button>

            {showGuide && (
              <div className="pt-2 text-slate-300 space-y-1.5 text-[11px] leading-relaxed border-t border-slate-700/60">
                <p className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold">1.</span>
                  <span>
                    {language === 'ru' ? (
                      <>
                        Откройте бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">@BotFather <ExternalLink size={10} /></a> и отправьте команду <code className="bg-slate-950 px-1 py-0.5 rounded text-white">/newbot</code>.
                      </>
                    ) : (
                      <>
                        Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">@BotFather <ExternalLink size={10} /></a> and send <code className="bg-slate-950 px-1 py-0.5 rounded text-white">/newbot</code>.
                      </>
                    )}
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold">2.</span>
                  <span>
                    {language === 'ru'
                      ? 'Придумайте имя боту и скопируйте полученный HTTP API Token.'
                      : 'Choose a name and copy the given HTTP API Token.'}
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold">3.</span>
                  <span>
                    {language === 'ru'
                      ? 'Найдите вашего нового бота в поиске Telegram и нажмите кнопку «Запустить» (/start).'
                      : 'Find your new bot in Telegram and press "Start" (/start).'}
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold">4.</span>
                  <span>
                    {language === 'ru' ? (
                      <>
                        Узнайте свой цифровой Chat ID через бота <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">@userinfobot <ExternalLink size={10} /></a> и вставьте его ниже.
                      </>
                    ) : (
                      <>
                        Get your Chat ID via <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">@userinfobot <ExternalLink size={10} /></a> and paste below.
                      </>
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3 text-xs">
            {/* Bot Token */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>{t(language, 'tg_bot_token_label')}:</span>
                <span className="text-[10px] text-slate-400">Telegram Bot API</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={t(language, 'tg_bot_token_placeholder')}
                  value={config.botToken}
                  onChange={(e) => setConfig((p) => ({ ...p, botToken: e.target.value }))}
                  className="w-full py-2 pl-3 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-sky-500 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Chat ID */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>{t(language, 'tg_chat_id_label')}:</span>
                <span className="text-[10px] text-slate-400">Personal or Channel ID</span>
              </label>
              <input
                type="text"
                placeholder={t(language, 'tg_chat_id_placeholder')}
                value={config.chatId}
                onChange={(e) => setConfig((p) => ({ ...p, chatId: e.target.value }))}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-sky-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'info'
                  ? 'bg-sky-500/20 border border-sky-500/30 text-sky-300'
                  : 'bg-red-500/20 border border-red-500/30 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check size={14} className="shrink-0" />
              ) : (
                <X size={14} className="shrink-0" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Last Backup Info */}
          {config.lastBackupDate && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>
                {language === 'ru' ? 'Последний бэкап:' : 'Last backup:'}{' '}
                <strong className="text-slate-200">{new Date(config.lastBackupDate).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</strong>
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            {/* Top Row: Test & Save */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !config.botToken || !config.chatId}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-40 text-slate-300 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="text-sky-400" />}
                <span>{t(language, 'tg_test_btn')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check size={13} className="text-emerald-400" />
                <span>{t(language, 'tg_save_btn')}</span>
              </button>
            </div>

            {/* Bottom Row: Send Backup & Restore */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUploadBackup}
                disabled={isUploading || !config.botToken || !config.chatId}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-600/25"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
                <span>{t(language, 'tg_send_backup_btn')}</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={isRestoring || !config.botToken}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600/80 border border-indigo-500/30 hover:border-indigo-400 disabled:opacity-40 text-indigo-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={15} />}
                <span>{t(language, 'tg_restore_btn')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
