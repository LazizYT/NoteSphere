import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, X, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import { LocalTrack, LocalPlaylist } from '../mediaTypes';
import { DEFAULT_PLAYLISTS, COVER_PRESETS } from '../mediaConstants';
import { parseAudioMetadata } from '../../../utils/id3Parser';
import { triggerHaptic } from '../../../utils/haptics';

interface AddTrackModalProps {
  isOpen: boolean;
  accentColor: string;
  localPlaylists: LocalPlaylist[];
  onClose: () => void;
  onAddTrack: (track: LocalTrack) => void;
}

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  accentColor,
  localPlaylists,
  onClose,
  onAddTrack,
}) => {
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('Музыка');
  const [coverUrl, setCoverUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState('03:30');
  const [playlistId, setPlaylistId] = useState('all');

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setArtist('');
    setAlbum('');
    setGenre('Музыка');
    setCoverUrl('');
    setAudioFile(null);
    setDuration('03:30');
    setPlaylistId('all');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    if (!name.trim()) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }
    const blobUrl = URL.createObjectURL(file);
    const a = new Audio(blobUrl);
    a.onloadedmetadata = () => {
      if (a.duration && !isNaN(a.duration)) {
        const m = Math.floor(a.duration / 60);
        const s = Math.floor(a.duration % 60);
        setDuration(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    try {
      const meta = await parseAudioMetadata(file);
      if (meta.title) setName(meta.title);
      if (meta.artist) setArtist(meta.artist);
      if (meta.album) setAlbum(meta.album);
      if (meta.coverUrl) setCoverUrl(meta.coverUrl);
    } catch (err) {
      console.warn('Metadata parsing error:', err);
    }
    triggerHaptic('light');
    e.target.value = '';
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
        triggerHaptic('light');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const id = `track-${Date.now()}`;
    const assignedPlaylists = playlistId && playlistId !== 'all' ? [playlistId] : [];
    const audioUrl = audioFile ? URL.createObjectURL(audioFile) : '';

    const newTrk: LocalTrack = {
      id,
      name: name.trim(),
      artist: artist.trim() || 'Моя музыка',
      album: album.trim() || 'Сингл',
      genre: genre.trim() || 'Музыка',
      coverUrl: coverUrl.trim() || COVER_PRESETS[0],
      thumbnailUrl: coverUrl.trim() || COVER_PRESETS[0],
      duration: duration || '03:45',
      size: audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(1)} MB` : '8.5 MB',
      type: 'audio',
      createdAt: new Date().toISOString().split('T')[0],
      url: audioUrl,
      file: audioFile || undefined,
      isFavorite: playlistId === 'favorites',
      playlistIds: assignedPlaylists,
      playlistId: assignedPlaylists[0],
    };

    onAddTrack(newTrk);
    resetForm();
    onClose();
  };

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
          className="w-full max-w-lg bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Hidden inputs */}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioSelect}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverSelect}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: accentColor }}
              >
                <Music size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Добавить аудиофайл</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* 1. Direct Audio File Picker */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111622] border border-dashed border-slate-300 dark:border-[#1e2638] text-center space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {audioFile ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Выбран файл: {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} МБ)
                </span>
              ) : (
                'Выберите аудиофайл с вашего компьютера (MP3, WAV, FLAC, M4A)'
              )}
            </p>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] text-slate-800 dark:text-slate-200 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Upload size={13} style={{ color: accentColor }} />
              <span>{audioFile ? 'Сменить аудиофайл' : 'Выбрать аудиофайл...'}</span>
            </button>
          </div>

          {/* 2. Cover Art Preview & Upload */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#111622] shrink-0 shadow-xs relative group">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-1"
                  style={{ backgroundColor: accentColor + '15', color: accentColor }}
                >
                  <ImageIcon size={22} />
                  <span className="text-[9px]">Фото</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Обложка песни</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-[#1e2638]"
                >
                  <Camera size={13} style={{ color: accentColor }} />
                  <span>С диска...</span>
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="px-2.5 py-1.5 rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Form fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                Название трека *
              </label>
              <input
                type="text"
                placeholder="Например: Midnight Memories"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Исполнитель
                </label>
                <input
                  type="text"
                  placeholder="Имя артиста"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Альбом
                </label>
                <input
                  type="text"
                  placeholder="Название альбома"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Жанр
                </label>
                <input
                  type="text"
                  placeholder="Rock / Pop / Lo-Fi"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Добавить в плейлист
                </label>
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Без отдельного плейлиста</option>
                  <option value="favorites">❤️ Избранное</option>
                  {DEFAULT_PLAYLISTS.filter((p) => p.id !== 'all' && p.id !== 'favorites').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                  {localPlaylists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon || '📁'} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cover URL Fallback */}
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                Или ссылка на фото (URL)
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={coverUrl.startsWith('data:') ? '' : coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2638]">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim()}
              style={{ backgroundColor: accentColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 text-white shadow-md cursor-pointer transition hover:brightness-110"
            >
              Добавить в медиатеку
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
