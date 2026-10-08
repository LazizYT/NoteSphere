/**
 * NoteSphere OS — PomodoroHeaderWidget
 * Ultra-compact, stylish Pomodoro focus timer integrated directly into the app header.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Flame, Settings2, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Language, t } from '../config/translations';

interface PomodoroHeaderWidgetProps {
  accentColor: string;
  language?: Language;
}

export default function PomodoroHeaderWidget({ accentColor, language = 'ru' }: PomodoroHeaderWidgetProps) {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [remainingSecs, setRemainingSecs] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play gentle sound on completion
  const playAlertSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setRemainingSecs((prev) => {
          if (prev <= 1) {
            playAlertSound();
            triggerHaptic('success');
            // Auto switch modes
            if (mode === 'work') {
              setMode('break');
              return breakDuration * 60;
            } else {
              setMode('work');
              return workDuration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, workDuration, breakDuration]);

  const toggleStartPause = () => {
    setIsRunning((prev) => !prev);
    triggerHaptic('light');
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSecs((mode === 'work' ? workDuration : breakDuration) * 60);
    triggerHaptic('light');
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setRemainingSecs((newMode === 'work' ? workDuration : breakDuration) * 60);
    triggerHaptic('light');
  };

  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDurationSecs = (mode === 'work' ? workDuration : breakDuration) * 60;
  const progressPercent = Math.round(((totalDurationSecs - remainingSecs) / totalDurationSecs) * 100);

  return (
    <div className="relative flex items-center">
      {/* Compact Header Pill */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono transition-all select-none ${
          isRunning
            ? 'bg-violet-600/15 border-violet-500/40 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        {/* Mode Icon */}
        <button
          onClick={() => switchMode(mode === 'work' ? 'break' : 'work')}
          className="flex items-center gap-1 transition hover:scale-110 cursor-pointer"
          title={mode === 'work' ? t(language, 'pomo_focus_tooltip') : t(language, 'pomo_break_tooltip')}
        >
          {mode === 'work' ? (
            <Flame className={`w-3.5 h-3.5 ${isRunning ? 'text-amber-400 animate-pulse' : 'text-amber-500'}`} />
          ) : (
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>

        {/* Time countdown */}
        <span
          onClick={() => setShowSettings(!showSettings)}
          className="font-bold text-[11px] tracking-wider cursor-pointer hover:underline text-slate-200"
          title={t(language, 'pomo_settings_tooltip')}
        >
          {formattedTime}
        </span>

        {/* Play/Pause Button */}
        <button
          onClick={toggleStartPause}
          className="p-1 hover:text-white text-slate-300 rounded transition cursor-pointer"
          title={isRunning ? t(language, 'pomo_pause') : t(language, 'pomo_start')}
        >
          {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="p-1 hover:text-white text-slate-500 rounded transition cursor-pointer"
          title={t(language, 'pomo_reset_tooltip')}
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div className="absolute top-9 left-0 z-50 w-56 p-3 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl text-white font-sans text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-bold">
            <span>{t(language, 'pomo_settings_title')}</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">{t(language, 'pomo_focus_duration')}</span>
              <div className="flex items-center gap-1">
                {[15, 25, 45].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setWorkDuration(m);
                      if (mode === 'work') setRemainingSecs(m * 60);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      workDuration === m ? 'bg-violet-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">{t(language, 'pomo_break_duration')}</span>
              <div className="flex items-center gap-1">
                {[3, 5, 10].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setBreakDuration(m);
                      if (mode === 'break') setRemainingSecs(m * 60);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      breakDuration === m ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
