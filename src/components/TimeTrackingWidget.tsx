/**
 * NoteSphere OS — TimeTrackingWidget
 * Dual-mode Time Tracking Desktop Widget:
 * 1. 🍅 Pomodoro Focus Studio (Work/Break cycles, presets, audio alert, daily stats)
 * 2. ⏱️ Precision Stopwatch (1/100s, laps recording, split times)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, Coffee, Flag, Clock, Timer, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Language, t } from '../config/translations';

interface TimeTrackingWidgetProps {
  accentColor: string;
  language?: Language;
}

interface LapRecord {
  id: number;
  timeCentis: number;
  splitCentis: number;
}

export default function TimeTrackingWidget({ accentColor, language = 'ru' }: TimeTrackingWidgetProps) {
  // Mode: 'pomodoro' | 'stopwatch'
  const [activeMode, setActiveMode] = useState<'pomodoro' | 'stopwatch'>(() => {
    return (localStorage.getItem('ns_ttw_mode') as 'pomodoro' | 'stopwatch') || 'pomodoro';
  });

  // ----------------- POMODORO STATE (PERSISTENT) -----------------
  const [pomoWorkMinutes, setPomoWorkMinutes] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_pomo_work_min');
    return v ? parseInt(v, 10) : 25;
  });
  const [pomoBreakMinutes, setPomoBreakMinutes] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_pomo_break_min');
    return v ? parseInt(v, 10) : 5;
  });
  const [pomoState, setPomoState] = useState<'work' | 'break'>(() => {
    return (localStorage.getItem('ns_ttw_pomo_state') as 'work' | 'break') || 'work';
  });
  const [isPomoRunning, setIsPomoRunning] = useState<boolean>(() => {
    return localStorage.getItem('ns_ttw_pomo_is_running') === 'true';
  });
  const [pomoTargetEndTime, setPomoTargetEndTime] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_pomo_target_end');
    return v ? parseInt(v, 10) : 0;
  });
  const [pomoRemainingSecs, setPomoRemainingSecs] = useState<number>(() => {
    const isRunning = localStorage.getItem('ns_ttw_pomo_is_running') === 'true';
    const targetEnd = parseInt(localStorage.getItem('ns_ttw_pomo_target_end') || '0', 10);
    const savedRemaining = parseInt(localStorage.getItem('ns_ttw_pomo_remaining_sec') || '1500', 10);

    if (isRunning && targetEnd > 0) {
      const diff = Math.max(0, Math.round((targetEnd - Date.now()) / 1000));
      return diff;
    }
    return savedRemaining;
  });

  // Daily logged stats
  const [todayFocusMins, setTodayFocusMins] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_today_focus_mins');
    return v ? parseInt(v, 10) : 0;
  });

  // Web Audio for alarm
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
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
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch {}
  };

  // Sync mode changes
  useEffect(() => {
    localStorage.setItem('ns_ttw_mode', activeMode);
  }, [activeMode]);

  // Sync today focus minutes
  useEffect(() => {
    localStorage.setItem('ns_ttw_today_focus_mins', String(todayFocusMins));
  }, [todayFocusMins]);

  // Pomodoro timer tick & background recovery
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomoRunning) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.round((pomoTargetEndTime - now) / 1000));
        setPomoRemainingSecs(diff);
        localStorage.setItem('ns_ttw_pomo_remaining_sec', String(diff));

        if (diff <= 0) {
          playChime();
          triggerHaptic('success');
          if (pomoState === 'work') {
            const added = todayFocusMins + pomoWorkMinutes;
            setTodayFocusMins(added);
            localStorage.setItem('ns_ttw_today_focus_mins', String(added));
            setPomoState('break');
            localStorage.setItem('ns_ttw_pomo_state', 'break');
            const nextSecs = pomoBreakMinutes * 60;
            const newTarget = Date.now() + nextSecs * 1000;
            setPomoTargetEndTime(newTarget);
            setPomoRemainingSecs(nextSecs);
            localStorage.setItem('ns_ttw_pomo_target_end', String(newTarget));
            localStorage.setItem('ns_ttw_pomo_remaining_sec', String(nextSecs));
          } else {
            setPomoState('work');
            localStorage.setItem('ns_ttw_pomo_state', 'work');
            const nextSecs = pomoWorkMinutes * 60;
            const newTarget = Date.now() + nextSecs * 1000;
            setPomoTargetEndTime(newTarget);
            setPomoRemainingSecs(nextSecs);
            localStorage.setItem('ns_ttw_pomo_target_end', String(newTarget));
            localStorage.setItem('ns_ttw_pomo_remaining_sec', String(nextSecs));
          }
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomoRunning, pomoTargetEndTime, pomoState, pomoWorkMinutes, pomoBreakMinutes, todayFocusMins]);

  const togglePomoPlay = () => {
    const nextRunning = !isPomoRunning;
    setIsPomoRunning(nextRunning);
    localStorage.setItem('ns_ttw_pomo_is_running', String(nextRunning));

    if (nextRunning) {
      const target = Date.now() + pomoRemainingSecs * 1000;
      setPomoTargetEndTime(target);
      localStorage.setItem('ns_ttw_pomo_target_end', String(target));
    } else {
      localStorage.setItem('ns_ttw_pomo_remaining_sec', String(pomoRemainingSecs));
    }
    triggerHaptic('medium');
  };

  const resetPomo = () => {
    setIsPomoRunning(false);
    localStorage.setItem('ns_ttw_pomo_is_running', 'false');
    const resetSecs = (pomoState === 'work' ? pomoWorkMinutes : pomoBreakMinutes) * 60;
    setPomoRemainingSecs(resetSecs);
    setPomoTargetEndTime(0);
    localStorage.setItem('ns_ttw_pomo_remaining_sec', String(resetSecs));
    localStorage.setItem('ns_ttw_pomo_target_end', '0');
    triggerHaptic('light');
  };

  const switchPomoPreset = (workM: number, breakM: number) => {
    setPomoWorkMinutes(workM);
    setPomoBreakMinutes(breakM);
    localStorage.setItem('ns_ttw_pomo_work_min', String(workM));
    localStorage.setItem('ns_ttw_pomo_break_min', String(breakM));
    setIsPomoRunning(false);
    localStorage.setItem('ns_ttw_pomo_is_running', 'false');
    const newSecs = (pomoState === 'work' ? workM : breakM) * 60;
    setPomoRemainingSecs(newSecs);
    setPomoTargetEndTime(0);
    localStorage.setItem('ns_ttw_pomo_remaining_sec', String(newSecs));
    localStorage.setItem('ns_ttw_pomo_target_end', '0');
    triggerHaptic('light');
  };

  const pomoMins = Math.floor(pomoRemainingSecs / 60);
  const pomoSecs = pomoRemainingSecs % 60;
  const formattedPomoTime = `${String(pomoMins).padStart(2, '0')}:${String(pomoSecs).padStart(2, '0')}`;
  const totalPomoSecs = (pomoState === 'work' ? pomoWorkMinutes : pomoBreakMinutes) * 60;
  const pomoProgressPercent = Math.round(((totalPomoSecs - pomoRemainingSecs) / totalPomoSecs) * 100);

  // ----------------- STOPWATCH STATE (PERSISTENT) -----------------
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(() => {
    return localStorage.getItem('ns_ttw_sw_is_running') === 'true';
  });
  const [stopwatchStartTime, setStopwatchStartTime] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_sw_start_time');
    return v ? parseInt(v, 10) : 0;
  });
  const [stopwatchAccumulatedMs, setStopwatchAccumulatedMs] = useState<number>(() => {
    const v = localStorage.getItem('ns_ttw_sw_accumulated_ms');
    return v ? parseInt(v, 10) : 0;
  });
  const [stopwatchTime, setStopwatchTime] = useState<number>(() => {
    const isRunning = localStorage.getItem('ns_ttw_sw_is_running') === 'true';
    const startTime = parseInt(localStorage.getItem('ns_ttw_sw_start_time') || '0', 10);
    const acc = parseInt(localStorage.getItem('ns_ttw_sw_accumulated_ms') || '0', 10);
    if (isRunning && startTime > 0) {
      return Math.floor((acc + (Date.now() - startTime)) / 10);
    }
    return Math.floor(acc / 10);
  });
  const [laps, setLaps] = useState<LapRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ns_ttw_sw_laps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const lastLapCentisRef = useRef(laps.length > 0 ? laps[0].timeCentis : 0);

  // Stopwatch high-precision tick
  useEffect(() => {
    let animationFrame: number | null = null;
    let interval: NodeJS.Timeout | null = null;

    if (isStopwatchRunning) {
      const tick = () => {
        const now = Date.now();
        const totalMs = stopwatchAccumulatedMs + (now - stopwatchStartTime);
        const centis = Math.floor(totalMs / 10);
        setStopwatchTime(centis);
      };
      // Regular interval ensures background updates
      interval = setInterval(tick, 30);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isStopwatchRunning, stopwatchStartTime, stopwatchAccumulatedMs]);

  const toggleStopwatchPlay = () => {
    const nextRunning = !isStopwatchRunning;
    setIsStopwatchRunning(nextRunning);
    localStorage.setItem('ns_ttw_sw_is_running', String(nextRunning));

    if (nextRunning) {
      const now = Date.now();
      setStopwatchStartTime(now);
      localStorage.setItem('ns_ttw_sw_start_time', String(now));
    } else {
      const now = Date.now();
      const added = now - stopwatchStartTime;
      const newAcc = stopwatchAccumulatedMs + added;
      setStopwatchAccumulatedMs(newAcc);
      localStorage.setItem('ns_ttw_sw_accumulated_ms', String(newAcc));
      localStorage.setItem('ns_ttw_sw_start_time', '0');
    }
    triggerHaptic('medium');
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchStartTime(0);
    setStopwatchAccumulatedMs(0);
    setStopwatchTime(0);
    setLaps([]);
    lastLapCentisRef.current = 0;
    localStorage.setItem('ns_ttw_sw_is_running', 'false');
    localStorage.setItem('ns_ttw_sw_start_time', '0');
    localStorage.setItem('ns_ttw_sw_accumulated_ms', '0');
    localStorage.removeItem('ns_ttw_sw_laps');
    triggerHaptic('light');
  };

  const recordLap = () => {
    if (stopwatchTime === 0) return;
    const split = stopwatchTime - lastLapCentisRef.current;
    lastLapCentisRef.current = stopwatchTime;

    const newLap: LapRecord = {
      id: laps.length + 1,
      timeCentis: stopwatchTime,
      splitCentis: split,
    };
    const nextLaps = [newLap, ...laps];
    setLaps(nextLaps);
    localStorage.setItem('ns_ttw_sw_laps', JSON.stringify(nextLaps));
    triggerHaptic('success');
  };

  const formatStopwatch = (centis: number) => {
    const totalSecs = Math.floor(centis / 100);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const cs = centis % 100;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between select-none">
      {/* Mode Selector Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-white/5 text-xs">
          <button
            onClick={() => {
              setActiveMode('pomodoro');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              activeMode === 'pomodoro'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{t(language, 'pomo_focus_mode')}</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('stopwatch');
              triggerHaptic('light');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              activeMode === 'stopwatch'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-blue-400" />
            <span>{t(language, 'stopwatch_mode')}</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{t(language, 'widget_timer')}</span>
      </div>

      {/* ── MODE 1: POMODORO VIEW ── */}
      {activeMode === 'pomodoro' && (
        <div className="flex-1 flex flex-col justify-between space-y-2">
          {/* Presets row */}
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{language === 'en' ? 'Presets:' : 'Пресеты:'}</span>
            <div className="flex items-center gap-1">
              {[
                { label: '25 / 5', w: 25, b: 5 },
                { label: '45 / 10', w: 45, b: 10 },
                { label: '15 / 3', w: 15, b: 3 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => switchPomoPreset(p.w, p.b)}
                  className={`px-2 py-0.5 rounded font-mono transition cursor-pointer ${
                    pomoWorkMinutes === p.w
                      ? 'bg-violet-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center Digital Display */}
          <div className="flex flex-col items-center justify-center my-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-1">
              {pomoState === 'work' ? (
                <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
                  <Flame size={13} /> {language === 'en' ? 'Focus session' : 'Фокус-сессия'}
                </span>
              ) : (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                  <Coffee size={13} /> {t(language, 'pomo_break_mode')}
                </span>
              )}
            </div>

            <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none">
              {formattedPomoTime}
            </span>

            {/* Progress bar */}
            <div className="w-48 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pomoProgressPercent}%`,
                  backgroundColor: pomoState === 'work' ? '#8b5cf6' : '#10b981',
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={resetPomo}
              className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <RotateCcw size={12} /> {t(language, 'pomo_reset')}
            </button>
            <button
              onClick={togglePomoPlay}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1 transition cursor-pointer shadow-md"
              style={{ backgroundColor: isPomoRunning ? '#ea580c' : accentColor }}
            >
              {isPomoRunning ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
              <span>{isPomoRunning ? t(language, 'pomo_pause') : t(language, 'pomo_start')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODE 2: STOPWATCH VIEW ── */}
      {activeMode === 'stopwatch' && (
        <div className="flex-1 flex flex-col justify-between space-y-2">
          {/* Big Digital Stopwatch Display */}
          <div className="text-center my-1">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white block leading-none">
              {formatStopwatch(stopwatchTime)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 block">
              {language === 'en' ? 'minutes : seconds . hundredths' : 'минуты : секунды . сотые'}
            </span>
          </div>

          {/* Recorded Laps list */}
          {laps.length > 0 && (
            <div className="max-h-16 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] font-mono">
              {laps.slice(0, 3).map((l) => (
                <div key={l.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Lap' : 'Круг'} {l.id}</span>
                  <span className="text-blue-500 dark:text-blue-400">+{formatStopwatch(l.splitCentis)}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatStopwatch(l.timeCentis)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={resetStopwatch}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              title={t(language, 'pomo_reset')}
            >
              <RotateCcw size={12} />
            </button>
            <button
              onClick={recordLap}
              disabled={!isStopwatchRunning}
              className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Flag size={12} /> {t(language, 'lap_btn')}
            </button>
            <button
              onClick={toggleStopwatchPlay}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1 transition cursor-pointer shadow-md"
              style={{ backgroundColor: isStopwatchRunning ? '#ea580c' : accentColor }}
            >
              {isStopwatchRunning ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
              <span>{isStopwatchRunning ? t(language, 'pomo_pause') : t(language, 'pomo_start')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
