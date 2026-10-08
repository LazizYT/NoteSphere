import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, Check } from 'lucide-react';
import { LocalTrack } from '../mediaTypes';

interface SelectTracksModalProps {
  isOpen: boolean;
  activePlaylistId: string;
  activePlaylistName: string;
  tracks: LocalTrack[];
  accentColor: string;
  onClose: () => void;
  onToggleTrack: (trackId: string, playlistId: string) => void;
}

export const SelectTracksModal: React.FC<SelectTracksModalProps> = ({
  isOpen,
  activePlaylistId,
  activePlaylistName,
  tracks,
  accentColor,
  onClose,
  onToggleTrack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = tracks
    .filter((t) => t.type === 'audio')
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.artist && t.artist.toLowerCase().includes(q));
    });

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
          className="w-full max-w-lg bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Добавить треки в «{activePlaylistName}»
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Отметьте галочками треки из вашей медиатеки
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search within modal */}
          <div className="shrink-0">
            <input
              type="text"
              placeholder="Поиск по названию или исполнителю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Tracks List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-48">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Треков не найдено</div>
            ) : (
              filtered.map((track) => {
                const isInCurrentPlaylist =
                  activePlaylistId === 'favorites'
                    ? !!track.isFavorite
                    : (track.playlistIds && track.playlistIds.includes(activePlaylistId)) ||
                      track.playlistId === activePlaylistId;

                return (
                  <div
                    key={track.id}
                    onClick={() => onToggleTrack(track.id, activePlaylistId)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer border border-slate-100 dark:border-[#1e2638]/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#111622] shrink-0 border border-slate-200 dark:border-[#1e2638]">
                        {track.coverUrl || track.thumbnailUrl ? (
                          <img
                            src={track.coverUrl || track.thumbnailUrl}
                            alt={track.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: accentColor + '20', color: accentColor }}
                          >
                            <Music size={12} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {track.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {track.artist || 'NoteSphere'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ml-2 ${
                        isInCurrentPlaylist
                          ? 'text-white border-transparent'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                      style={isInCurrentPlaylist ? { backgroundColor: accentColor } : undefined}
                    >
                      {isInCurrentPlaylist && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: accentColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition hover:brightness-110"
            >
              Готово
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
