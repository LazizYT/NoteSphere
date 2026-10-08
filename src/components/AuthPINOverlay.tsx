/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Delete } from 'lucide-react';

interface AuthPINOverlayProps {
  correctPin: string;
  onSuccess: () => void;
  accentColor: string;
  onClose?: () => void; // Optional if we allow closing
  title?: string;
  subtitle?: string;
}

export default function AuthPINOverlay({
  correctPin,
  onSuccess,
  accentColor,
  onClose,
  title = 'Ввод PIN-кода безопасности',
  subtitle = 'Это действие защищено вашим личным PIN-кодом',
}: AuthPINOverlayProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  const handleKeyPress = (num: string) => {
    setErrorMsg(false);
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      
      if (nextPin === correctPin) {
        setTimeout(() => {
          onSuccess();
          setEnteredPin('');
        }, 300);
      } else if (nextPin.length === 4) {
        setTimeout(() => {
          setErrorMsg(true);
          setEnteredPin('');
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin(enteredPin.slice(0, -1));
  };

  return (
    <div id="pin-lock-overlay" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div id="pin-lock-card" className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
        
        {/* Shield Icon */}
        <div id="shield-badge" className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white animate-pulse" style={{ backgroundColor: accentColor }}>
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 id="pin-lock-title" className="text-xl font-bold text-slate-900 dark:text-white text-center font-sans tracking-tight">{title}</h3>
        <p id="pin-lock-sub" className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-6 font-sans">{subtitle}</p>

        {/* PIN Indicators */}
        <div id="pin-indicators" className="flex gap-4 justify-center mb-8">
          {[0, 1, 2, 3].map((index) => {
            const hasValue = enteredPin.length > index;
            return (
              <div
                id={`pin-indicator-dot-${index}`}
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  hasValue
                    ? 'border-slate-800 bg-slate-800 dark:border-white dark:bg-white scale-110'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                } ${errorMsg ? 'border-red-500 bg-red-500 shadow-lg shadow-red-500/50' : ''}`}
                style={hasValue && !errorMsg ? { borderColor: accentColor, backgroundColor: accentColor } : {}}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <p id="pin-error-text" className="text-red-500 text-sm font-semibold mb-4 animate-bounce font-sans">Неверный PIN-код, попробуйте снова</p>
        )}

        {/* Keypad */}
        <div id="numeric-keypad" className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              id={`keypad-${num}`}
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-full text-xl font-semibold border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center font-mono"
            >
              {num}
            </button>
          ))}
          <button
            id="keypad-close"
            onClick={onClose}
            className="w-16 h-16 rounded-full text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center font-sans"
            disabled={!onClose}
          >
            {onClose ? 'Отмена' : ''}
          </button>
          <button
            id="keypad-0"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full text-xl font-semibold border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center font-mono"
          >
            0
          </button>
          <button
            id="keypad-del"
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div id="pin-lock-footer" className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Конфиденциальность обеспечена на устройстве</span>
        </div>

      </div>
    </div>
  );
}
