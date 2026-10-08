import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, X, FolderOpen } from 'lucide-react';

interface MediaFoldersModalProps {
  isOpen: boolean;
  accentColor: string;
  onClose: () => void;
  onPickFolder: () => void;
}

export const MediaFoldersModal: React.FC<MediaFoldersModalProps> = ({
  isOpen,
  accentColor,
  onClose,
  onPickFolder,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Папки медиа на компьютере
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Выберите системную папку (Музыка, Загрузки, Видео) или выберите каталог для импорта треков в NoteSphere.
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onPickFolder();
                onClose();
              }}
              style={{ backgroundColor: accentColor }}
              className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition hover:brightness-110"
            >
              <FolderOpen size={14} />
              <span>Выбрать папку с диска...</span>
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-[#1e2638]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
