import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';
import { LocalTrack } from '../mediaTypes';

interface MediaLightboxModalProps {
  track: LocalTrack | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ track, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!track) return null;

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#07090e] flex flex-col justify-between p-4"
      >
        <div className="flex items-center justify-between z-10">
          <span className="text-xs font-bold text-white">{track.name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
              className="p-2 rounded-xl bg-[#111622] text-slate-300 hover:text-white cursor-pointer"
              title="Увеличить"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
              className="p-2 rounded-xl bg-[#111622] text-slate-300 hover:text-white cursor-pointer"
              title="Уменьшить"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => setRotation((r) => r + 90)}
              className="p-2 rounded-xl bg-[#111622] text-slate-300 hover:text-white cursor-pointer"
              title="Повернуть"
            >
              <RotateCw size={16} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-[#111622] text-slate-300 hover:text-white cursor-pointer"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <img
            src={track.url}
            alt={track.name}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease',
            }}
            className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
