/**
 * NoteSphere OS — WebDAV & Nextcloud Cloud Sync Modal
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, X, Check, Loader2, UploadCloud, RefreshCw, Key, Globe, Shield } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { WebDAVConfig, testWebDAVConnection, uploadBackupToWebDAV } from '../utils/webdavSync';

interface WebDAVModalProps {
  isOpen: boolean;
  onClose: () => void;
  getFullBackupData: () => any;
  accentColor: string;
}

export default function WebDAVModal({
  isOpen,
  onClose,
  getFullBackupData,
  accentColor,
}: WebDAVModalProps) {
  const [config, setConfig] = useState<WebDAVConfig>(() => {
    try {
      const saved = localStorage.getItem('ns_webdav_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      url: '',
      username: '',
      password: '',
      autoSync: false,
    };
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveConfig = () => {
    localStorage.setItem('ns_webdav_config', JSON.stringify(config));
    triggerHaptic('success');
    setStatusMessage({ type: 'success', text: 'Настройки WebDAV сохранены!' });
  };

  const handleTestConnection = async () => {
    if (!config.url) {
      setStatusMessage({ type: 'error', text: 'Введите URL сервера WebDAV' });
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const result = await testWebDAVConnection(config);
    setIsTesting(false);
    if (result.success) {
      triggerHaptic('success');
      setStatusMessage({ type: 'success', text: result.message });
      handleSaveConfig();
    } else {
      triggerHaptic('error');
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleUploadBackup = async () => {
    if (!config.url) {
      setStatusMessage({ type: 'error', text: 'Сначала укажите URL WebDAV' });
      return;
    }
    setIsUploading(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const backup = getFullBackupData();
    const result = await uploadBackupToWebDAV(config, backup);
    setIsUploading(false);

    if (result.success) {
      triggerHaptic('success');
      setStatusMessage({ type: 'success', text: result.message });
      handleSaveConfig();
    } else {
      triggerHaptic('error');
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-white font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <Cloud size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base">Синхронизация WebDAV / Nextcloud</h3>
                <p className="text-xs text-slate-400">Автономное резервное копирование в личное облако</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe size={13} className="text-blue-400" /> WebDAV URL:
              </label>
              <input
                type="url"
                placeholder="https://cloud.example.com/remote.php/dav/files/user/"
                value={config.url}
                onChange={(e) => setConfig((p) => ({ ...p, url: e.target.value }))}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Логин / Username:</label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  value={config.username || ''}
                  onChange={(e) => setConfig((p) => ({ ...p, username: e.target.value }))}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center gap-1">
                  <Key size={12} className="text-amber-400" /> Пароль / App Token:
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={config.password || ''}
                  onChange={(e) => setConfig((p) => ({ ...p, password: e.target.value }))}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/20 border border-red-500/30 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? <Check size={14} /> : <X size={14} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.url}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>Тест соединения</span>
            </button>

            <button
              onClick={handleUploadBackup}
              disabled={isUploading || !config.url}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={14} />}
              <span>Выгрузить бэкап</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
