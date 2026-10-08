import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { LocalTrack } from '../mediaTypes';
import { COVER_PRESETS } from '../mediaConstants';

interface CoverArtModalProps {
  track: LocalTrack | null;
  accentColor: string;
  galleryImages?: LocalTrack[];
  onClose: () => void;
  onSaveCover: (trackId: string, newCoverUrl: string) => void;
}

export const CoverArtModal: React.FC<CoverArtModalProps> = ({
  track,
  accentColor,
  galleryImages = [],
  onClose,
  onSaveCover,
}) => {
  const [coverUrl, setCoverUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (track) {
      setCoverUrl(track.coverUrl || track.thumbnailUrl || '');
    }
  }, [track]);

  if (!track) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        setCoverUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
          className="w-full max-w-md bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: accentColor }}
              >
                <Camera size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Обложка: {track.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-36 h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#111622] shadow-md">
              {coverUrl ? (
                <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                  <ImageIcon size={24} />
                  <span className="text-[10px]">Нет фото</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload file from computer */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Upload size={14} style={{ color: accentColor }} />
              <span>Выбрать фото с диска (JPG, PNG, WEBP)</span>
            </button>
          </div>

          {/* URL Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Или ссылка на фото (URL):
            </label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={coverUrl.startsWith('data:') ? '' : coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Gallery Images from NoteSphere */}
          {galleryImages && galleryImages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Фото из вашей галереи NoteSphere:
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {galleryImages.length} {galleryImages.length === 1 ? 'фото' : 'фотографий'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-28 overflow-y-auto pr-1">
                {galleryImages.map((imgItem) => {
                  const url = imgItem.url || imgItem.coverUrl || imgItem.thumbnailUrl;
                  if (!url) return null;
                  const isSelected = coverUrl === url;
                  return (
                    <div
                      key={imgItem.id}
                      onClick={() => setCoverUrl(url)}
                      className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition hover:scale-105 ${
                        isSelected
                          ? 'ring-2 ring-offset-1 border-transparent'
                          : 'border-slate-200 dark:border-[#1e2638] hover:border-slate-400'
                      }`}
                      style={isSelected ? { borderColor: accentColor, outlineColor: accentColor } : undefined}
                      title={imgItem.name}
                    >
                      <img src={url} alt={imgItem.name} className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Или выберите готовую обложку:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((url, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setCoverUrl(url);
                    onSaveCover(track.id, url);
                  }}
                  className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition hover:scale-105 ${
                    coverUrl === url
                      ? 'ring-2 ring-offset-1'
                      : 'border-slate-200 dark:border-[#1e2638] hover:border-slate-400'
                  }`}
                  style={coverUrl === url ? { borderColor: accentColor, outlineColor: accentColor } : undefined}
                  title="Нажмите, чтобы применить эту обложку"
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#1e2638]">
            <div>
              {(track.coverUrl || coverUrl) && (
                <button
                  type="button"
                  onClick={() => onSaveCover(track.id, '')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                >
                  Удалить обложку
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => onSaveCover(track.id, coverUrl)}
                disabled={!coverUrl.trim()}
                style={{ backgroundColor: accentColor }}
                className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 text-white shadow-md cursor-pointer transition hover:brightness-110"
              >
                Сохранить обложку
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
