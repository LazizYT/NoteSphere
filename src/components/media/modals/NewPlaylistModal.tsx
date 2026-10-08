import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderPlus, X } from 'lucide-react';
import { LocalPlaylist } from '../mediaTypes';

interface NewPlaylistModalProps {
  isOpen: boolean;
  accentColor: string;
  defaultType?: 'audio' | 'video' | 'image';
  onClose: () => void;
  onCreatePlaylist: (playlist: LocalPlaylist) => void;
}

const AUDIO_ICONS = ['🎵', '🔥', '🌸', '🎧', '⚡', '☕', '🚀', '🌟'];
const VIDEO_ICONS = ['🎬', '⭐', '🎓', '💻', '🏋️', '🎥', '📺', '🚀'];

export const NewPlaylistModal: React.FC<NewPlaylistModalProps> = ({
  isOpen,
  accentColor,
  defaultType = 'audio',
  onClose,
  onCreatePlaylist,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'audio' | 'video' | 'image'>(defaultType);
  const [icon, setIcon] = useState(defaultType === 'video' ? '🎬' : '🎵');

  React.useEffect(() => {
    setType(defaultType);
    setIcon(defaultType === 'video' ? '🎬' : '🎵');
  }, [defaultType, isOpen]);


  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    const newPl: LocalPlaylist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      path: '',
      type,
      color: accentColor,
      icon,
      trackCount: 0,
    };
    onCreatePlaylist(newPl);
    setName('');
    setIcon(type === 'video' ? '🎬' : '🎵');
    onClose();
  };

  const iconsToDisplay = type === 'video' ? VIDEO_ICONS : AUDIO_ICONS;


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
          className="w-full max-w-sm bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: accentColor }}
              >
                <FolderPlus size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Создать плейлист</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                Название плейлиста:
              </label>
              <input
                type="text"
                placeholder="Например: Мой топ 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                Иконка:
              </label>
              <div className="flex items-center gap-2">
                {iconsToDisplay.map((ico) => (
                  <button
                    type="button"
                    key={ico}
                    onClick={() => setIcon(ico)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition cursor-pointer ${
                      icon === ico
                        ? 'ring-2 font-bold'
                        : 'border-slate-200 dark:border-[#1e2638] hover:bg-slate-100 dark:hover:bg-[#151c2c]'
                    }`}
                    style={icon === ico ? { borderColor: accentColor, outlineColor: accentColor } : undefined}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2638]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              style={{ backgroundColor: accentColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 text-white shadow-md cursor-pointer transition hover:brightness-110"
            >
              Создать
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
