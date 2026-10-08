import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderPlus, X, Check, Plus } from 'lucide-react';
import { LocalTrack, LocalPlaylist } from '../mediaTypes';
import { DEFAULT_PLAYLISTS } from '../mediaConstants';

interface TrackPlaylistModalProps {
  track: LocalTrack | null;
  accentColor: string;
  localPlaylists: LocalPlaylist[];
  onClose: () => void;
  onTogglePlaylist: (trackId: string, playlistId: string) => void;
  onCreateNewPlaylist: () => void;
}

export const TrackPlaylistModal: React.FC<TrackPlaylistModalProps> = ({
  track,
  accentColor,
  localPlaylists,
  onClose,
  onTogglePlaylist,
  onCreateNewPlaylist,
}) => {
  if (!track) return null;

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
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                <FolderPlus size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">В плейлист...</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{track.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* List of playlists with checkboxes */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {/* Favorite toggle */}
            <div
              onClick={() => onTogglePlaylist(track.id, 'favorites')}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer border border-slate-100 dark:border-[#1e2638]/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">❤️</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">Избранное</span>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                  track.isFavorite
                    ? 'text-white border-transparent'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                style={track.isFavorite ? { backgroundColor: accentColor } : undefined}
              >
                {track.isFavorite && <Check size={12} strokeWidth={3} />}
              </div>
            </div>

            {/* Default & Local Playlists */}
            {[
              ...DEFAULT_PLAYLISTS.filter((p) => p.id !== 'all' && p.id !== 'favorites'),
              ...localPlaylists,
            ].map((pl) => {
              const isInPlaylist =
                (track.playlistIds && track.playlistIds.includes(pl.id)) ||
                track.playlistId === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => onTogglePlaylist(track.id, pl.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer border border-slate-100 dark:border-[#1e2638]/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{pl.icon || '📁'}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{pl.name}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      isInPlaylist
                        ? 'text-white border-transparent'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={isInPlaylist ? { backgroundColor: accentColor } : undefined}
                  >
                    {isInPlaylist && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#1e2638] flex items-center justify-between">
            <button
              type="button"
              onClick={onCreateNewPlaylist}
              className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
              style={{ color: accentColor }}
            >
              <Plus size={13} />
              <span>Создать плейлист</span>
            </button>
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
