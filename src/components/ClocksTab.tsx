/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Plus, Trash2, Volume2, Play, Pause, RotateCcw, Award, Percent, AlarmClock, Timer as TimerIcon, StopCircle } from 'lucide-react';
import { Alarm, StopwatchLap } from '../types';

interface ClocksTabProps {
  alarms: Alarm[];
  onAddAlarm: (alarm: Alarm) => void;
  onDeleteAlarm: (id: string) => void;
  onUpdateAlarm: (alarm: Alarm) => void;
  accentColor: string;
}

export default function ClocksTab({
  alarms,
  onAddAlarm,
  onDeleteAlarm,
  onUpdateAlarm,
  accentColor,
}: ClocksTabProps) {
  // Navigation inside tab: 'alarm' | 'timer' | 'stopwatch' | 'pomodoro'
  const [clocksTab, setClocksTab] = useState<'alarm' | 'timer' | 'stopwatch' | 'pomodoro'>('alarm');

  // 1. STATE FOR ALARMS CREATOR
  const [newAlarmTime, setNewAlarmTime] = useState('08:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('Будильник');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default
  const [newAlarmSound, setNewAlarmSound] = useState('ringtone1');
  const [newAlarmVibrate, setNewAlarmVibrate] = useState(true);

  // 2. STATE FOR TIMER
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(300); // 5 mins in secs
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [timerTotal, setTimerTotal] = useState(300);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 3. STATE FOR STOPWATCH
  const [stopwatchTime, setStopwatchTime] = useState(0); // in centiseconds (1/100s)
  const [stopwatchState, setStopwatchState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [laps, setLaps] = useState<StopwatchLap[]>([]);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 4. TRIGGERED ALARM STATE
  const [activeTriggeredAlarm, setActiveTriggeredAlarm] = useState<Alarm | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const audioPlayRef = useRef<HTMLAudioElement | null>(null);

  // 5. STATE FOR POMODORO
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);
  const [pomodoroRemaining, setPomodoroRemaining] = useState(1500); // 25 * 60
  const [pomodoroState, setPomodoroState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const [pomodoroTotalDuration, setPomodoroTotalDuration] = useState(1500);
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sound config for timers & pomodoro
  const [timerSound, setTimerSound] = useState('ringtone1');

  // Trigger sound logic
  const startAlarmBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate continuous pulsing beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Pitch A5

      // Pulse volume modulation
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
    } catch (e) {
      console.warn('Audio API failed which is expected inside some iframe layers.', e);
    }
  };

  const stopAlarmBeep = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
  };

  const startAlarmAudio = (soundName: string) => {
    // Stop any existing playing custom audio
    if (audioPlayRef.current) {
      try {
        audioPlayRef.current.pause();
      } catch (e) {}
      audioPlayRef.current = null;
    }

    if (soundName && (soundName.startsWith('http') || soundName.startsWith('data:'))) {
      try {
        const audio = new Audio(soundName);
        audio.loop = true;
        audio.play().catch((err) => {
          console.warn('Custom playback blocked, falling back to oscillator beep.', err);
          startAlarmBeep();
        });
        audioPlayRef.current = audio;
      } catch (e) {
        startAlarmBeep();
      }
    } else {
      startAlarmBeep();
    }
  };

  const stopAlarmAudio = () => {
    stopAlarmBeep();
    if (audioPlayRef.current) {
      try {
        audioPlayRef.current.pause();
      } catch (e) {}
      audioPlayRef.current = null;
    }
  };

  // CHECK ALARMS EVERY SECOND
  useEffect(() => {
    const checkSchedule = setInterval(() => {
      if (activeTriggeredAlarm) return; // Wait until current alarm is resolved

      const now = new Date();
      const currentHHMM = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

      const matched = alarms.find((al) => {
        if (!al.isEnabled) return false;
        if (al.time !== currentHHMM) return false;

        // If it repeats on specific days, check if today is selected
        if (al.repeats.length > 0 && !al.repeats.includes(currentDay)) {
          return false;
        }
        return true;
      });

      if (matched) {
        setActiveTriggeredAlarm(matched);
        startAlarmAudio(matched.sound);
      }
    }, 1000);

    return () => clearInterval(checkSchedule);
  }, [alarms, activeTriggeredAlarm]);

  // TIMER TIMER TICK
  useEffect(() => {
    if (timerState === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            setTimerState('idle');
            clearInterval(timerIntervalRef.current!);
            // Trigger timer sound
            startAlarmAudio(timerSound);
            setTimeout(() => stopAlarmAudio(), 4500); // sound auto-stops after 4.5 seconds
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerState]);

  // POMODORO TIMER TICK
  useEffect(() => {
    if (pomodoroState === 'running') {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(pomodoroIntervalRef.current!);
            
            // Toggle modes and reset total duration
            if (pomodoroMode === 'work') {
              setPomodoroMode('break');
              const breakSecs = pomodoroBreakMinutes * 60;
              setPomodoroRemaining(breakSecs);
              setPomodoroTotalDuration(breakSecs);
            } else {
              setPomodoroMode('work');
              const workSecs = pomodoroMinutes * 60;
              setPomodoroRemaining(workSecs);
              setPomodoroTotalDuration(workSecs);
            }
            
            // Sound an end bell / customizable song
            startAlarmAudio(timerSound);
            setTimeout(() => stopAlarmAudio(), 5000); // alarm sound duration 5 seconds
            setPomodoroState('idle'); // stop after completion so they can click start for next mode
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    }

    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    };
  }, [pomodoroState, pomodoroMode, pomodoroMinutes, pomodoroBreakMinutes, timerSound]);

  // STOPWATCH STOPWATCH TICK
  useEffect(() => {
    if (stopwatchState === 'running') {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime((prev) => prev + 1);
      }, 10); // tick every 10ms (1 centisecond)
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }

    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchState]);

  // 1. ADD NEW ALARM ACTION
  const handleAddNewAlarm = () => {
    const newlyCreated: Alarm = {
      id: `alarm-${Date.now()}`,
      time: newAlarmTime,
      label: newAlarmLabel || 'Будильник',
      isEnabled: true,
      volume: 80,
      vibrate: newAlarmVibrate,
      repeats: selectedDays,
      sound: newAlarmSound,
    };
    onAddAlarm(newlyCreated);
    setNewAlarmLabel('Будильник');
  };

  const toggleDaySelection = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // 2. STOPWATCH ACTIONS
  const formatStopwatchTime = (totalCentiseconds: number): string => {
    const mins = Math.floor(totalCentiseconds / 6000);
    const secs = Math.floor((totalCentiseconds % 6000) / 100);
    const centis = totalCentiseconds % 100;

    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  };

  const handleLap = () => {
    if (stopwatchState !== 'running') return;
    const currentTotalFormatted = formatStopwatchTime(stopwatchTime);
    const lastLapTime = laps.length > 0 ? loopsDiff(laps[laps.length - 1].totalTime, currentTotalFormatted) : currentTotalFormatted;

    const newLap: StopwatchLap = {
      id: `lap-${Date.now()}`,
      lapNumber: laps.length + 1,
      lapTime: lastLapTime,
      totalTime: currentTotalFormatted,
    };
    setLaps([...laps, newLap]);
  };

  // Helper calculating difference
  const loopsDiff = (prevFormatted: string, currentFormatted: string) => {
    const toCentis = (str: string) => {
      const [m, sc] = str.split(':');
      const [s, c] = sc.split('.');
      return parseInt(m) * 6000 + parseInt(s) * 100 + parseInt(c);
    };

    const diff = toCentis(currentFormatted) - toCentis(prevFormatted);
    const mins = Math.floor(diff / 6000);
    const secs = Math.floor((diff % 6000) / 100);
    const centis = diff % 100;
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  };

  const handleResetStopwatch = () => {
    setStopwatchState('idle');
    setStopwatchTime(0);
    setLaps([]);
  };

  // 3. TIMER ACTIONS
  const selectTimerValue = (h: number, m: number, s: number) => {
    setTimerHours(h);
    setTimerMinutes(m);
    setTimerSeconds(s);
    const totalSecs = h * 3600 + m * 60 + s;
    setTimerRemaining(totalSecs);
    setTimerTotal(totalSecs);
    setTimerState('idle');
  };

  const formatTimerRemaining = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${h > 0 ? pad(h) + ':' : ''}${pad(m)}:${pad(s)}`;
  };

  // 4. ACTIVE ALARM ACTIONS
  const handleDismissAlarm = () => {
    stopAlarmAudio();
    setActiveTriggeredAlarm(null);
  };

  const handleSnoozeAlarm = () => {
    stopAlarmAudio();
    if (activeTriggeredAlarm) {
      // Create a snooze alarm 1 minute later
      const [h, m] = activeTriggeredAlarm.time.split(':').map(Number);
      const targetMin = (m + 2) % 60; // 2 minutes later
      const targetHour = targetMin < m ? (h + 1) % 24 : h;
      const nextTime = `${targetHour < 10 ? '0' + targetHour : targetHour}:${targetMin < 10 ? '0' + targetMin : targetMin}`;

      const snoozed: Alarm = {
        ...activeTriggeredAlarm,
        time: nextTime,
        label: `[Отложен] ${activeTriggeredAlarm.label}`,
      };
      onUpdateAlarm(snoozed);
    }
    setActiveTriggeredAlarm(null);
  };

  const daysOfWeekLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div id="clocks-tab-container" className="space-y-6 max-w-5xl mx-auto p-1 font-sans">
      
      {/* 4. ALARM OVERLAY IN CASE TIMER OR ALARM RINGS */}
      {activeTriggeredAlarm && (
        <div id="alarm-ringing-overlay" className="fixed inset-0 z-[110] flex items-center justify-center bg-red-600/95 dark:bg-slate-950/95 p-6 animate-pulse text-white">
          <div id="alarm-center" className="text-center max-w-md space-y-8">
            <div className="w-24 h-24 rounded-full bg-white text-red-600 dark:text-slate-900 mx-auto flex items-center justify-center shadow-2xl animate-bounce">
              <AlarmClock className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-wider animate-pulse">{activeTriggeredAlarm.time}</h1>
              <h2 className="text-2xl font-bold">{activeTriggeredAlarm.label}</h2>
              <p className="text-sm opacity-80">Пришло время важного напоминания. Проснитесь или приступайте к задачам!</p>
            </div>

            <div className="flex gap-4 justify-center pt-6">
              <button
                id="alarm-snooze-btn"
                onClick={handleSnoozeAlarm}
                className="py-4 px-8 bg-white/20 hover:bg-white/30 border-2 border-white text-white rounded-2xl font-semibold transition-all text-lg active:scale-95"
              >
                Отложить на 2 мин
              </button>
              <button
                id="alarm-dismiss-btn"
                onClick={handleDismissAlarm}
                className="py-4 px-8 bg-white text-red-600 hover:bg-slate-100 rounded-2xl font-bold transition-all text-lg shadow-xl active:scale-95"
              >
                Выключить сигнал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOCK NAVIGATION BAR */}
      <div id="clocks-selector" className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 max-w-lg">
        {(['alarm', 'timer', 'stopwatch', 'pomodoro'] as const).map((mode) => (
          <button
            id={`tab-selector-${mode}`}
            key={mode}
            onClick={() => setClocksTab(mode)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              clocksTab === mode
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-700/40'
            }`}
          >
            {mode === 'alarm' && <AlarmClock className="w-4 h-4" />}
            {mode === 'timer' && <TimerIcon className="w-4 h-4" />}
            {mode === 'stopwatch' && <StopCircle className="w-4 h-4" />}
            {mode === 'pomodoro' && <Clock className="w-4 h-4 text-rose-500" />}
            {mode === 'alarm' ? 'Будильники' : mode === 'timer' ? 'Таймер' : mode === 'stopwatch' ? 'Секундомер' : 'Помодоро'}
          </button>
        ))}
      </div>

      {/* ----------------- SUBTAB 1: ALARM SECTION ----------------- */}
      {clocksTab === 'alarm' && (
        <div id="alarm-layout" className="grid md:grid-cols-3 gap-6">
          
          {/* Creator panel */}
          <div id="alarm-creator-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-white text-md flex items-center gap-1.5">
              <Plus className="w-4 h-4" style={{ color: accentColor }} /> Создать будильник
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Выбор времени</label>
              <input
                id="alarm-time-picker"
                type="time"
                value={newAlarmTime}
                onChange={(e) => setNewAlarmTime(e.target.value)}
                className="w-full text-3xl font-bold tracking-widest text-center py-2 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Подпись / Текст</label>
              <input
                id="alarm-label-input"
                type="text"
                value={newAlarmLabel}
                onChange={(e) => setNewAlarmLabel(e.target.value)}
                placeholder="Название будильника"
                className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Повтор по дням</label>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const isSelected = selectedDays.includes(d);
                  return (
                    <button
                      id={`alarm-day-pick-${d}`}
                      key={d}
                      onClick={() => toggleDaySelection(d)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      style={isSelected ? { backgroundColor: accentColor } : {}}
                    >
                      {daysOfWeekLabels[d]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <label className="text-xs font-semibold text-slate-400 uppercase">Звуковой сигнал</label>
              <select
                id="alarm-sound-select"
                value={newAlarmSound.startsWith('http') || newAlarmSound.startsWith('data:') ? 'custom' : newAlarmSound}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== 'custom') {
                    setNewAlarmSound(val);
                  }
                }}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
              >
                <option value="ringtone1">🔊 Сирена (Импульсный)</option>
                <option value="ringtone2">🔔 Звонок (Электронный)</option>
                <option value="natural">🍃 Мелодия леса (Мягкий)</option>
                <option value="custom">🎵 Своя песня (Ссылка или Файл)</option>
              </select>

              {(newAlarmSound.startsWith('http') || newAlarmSound.startsWith('data:') || (document.getElementById('alarm-sound-select') as HTMLSelectElement)?.value === 'custom') && (
                <div className="space-y-2.5 mt-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase block">Загрузить аудио (.mp3, .wav)</span>
                    <input
                      id="alarm-file-loader"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setNewAlarmSound(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[10px] block text-slate-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase block">Или указать прямую ссылку</span>
                    <input
                      id="alarm-custom-url-src"
                      type="text"
                      placeholder="https://example.com/sound.mp3"
                      value={newAlarmSound.startsWith('data:') ? '' : newAlarmSound}
                      onChange={(e) => setNewAlarmSound(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 font-medium text-xs text-slate-800 dark:text-white rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Вибрация (пульс)</span>
              <input
                id="alarm-vibrate-toggle"
                type="checkbox"
                checked={newAlarmVibrate}
                onChange={(e) => setNewAlarmVibrate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-indigo-500"
              />
            </div>

            <button
              id="submit-alarm-btn"
              onClick={handleAddNewAlarm}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-md active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              Добавить будильник
            </button>
          </div>

          {/* List panel */}
          <div id="alarm-list-container" className="md:col-span-2 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-white text-md">
              Активные сигналы ({alarms.length})
            </h3>

            {alarms.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">Будильники отсутствуют</p>
              </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {alarms.map((al) => (
                    <div
                      id={`alarm-item-${al.id}`}
                      key={al.id}
                      className={`bg-white dark:bg-slate-900 border ${
                        al.isEnabled ? 'border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/10' : 'border-slate-200 dark:border-slate-800 opacity-60'
                      } rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-3xl font-black text-slate-800 dark:text-white tracking-wider">{al.time}</span>
                          <p className="text-xs text-slate-500 font-medium">{al.label}</p>
                        </div>
                        <input
                          id={`alarm-toggle-${al.id}`}
                          type="checkbox"
                          checked={al.isEnabled}
                          onChange={() => onUpdateAlarm({ ...al, isEnabled: !al.isEnabled })}
                          className="w-4 h-4 rounded border-slate-300"
                          style={{ accentColor: accentColor }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex gap-1">
                          {al.repeats.length === 0 ? (
                            <span className="text-xs text-slate-400">Однократно</span>
                          ) : (
                            al.repeats.map((day) => (
                              <span
                                id={`alarm-day-lbl-${al.id}-${day}`}
                                key={day}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase"
                              >
                                {daysOfWeekLabels[day]}
                              </span>
                            ))
                          )}
                        </div>

                        <button
                          id={`delete-alarm-${al.id}`}
                          onClick={() => onDeleteAlarm(al.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>

        </div>
      )}

      {/* ----------------- SUBTAB 2: TIMER SECTION ----------------- */}
      {clocksTab === 'timer' && (
        <div id="timer-layout" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white font-sans">Таймер обратного отсчета</h3>
            <p className="text-xs text-slate-400 mt-1">Используйте для учебы, работы или спорта</p>
          </div>

          {/* Custom Time Selector Inputs */}
          {timerState === 'idle' && (
            <div id="custom-timer-adjuster" className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-505 font-mono">
              <div className="flex flex-col items-center">
                <span className="font-sans font-bold text-[9px] uppercase text-slate-400 mb-1">МИНУТЫ</span>
                <input
                  id="timer-m-input"
                  type="number"
                  min="0"
                  max="59"
                  value={timerMinutes}
                  onChange={(e) => {
                    const nextM = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    selectTimerValue(timerHours, nextM, timerSeconds);
                  }}
                  className="w-12 py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg text-center font-bold focus:outline-none"
                />
              </div>
              <span className="font-bold text-slate-400 text-sm mt-3">:</span>
              <div className="flex flex-col items-center">
                <span className="font-sans font-bold text-[9px] uppercase text-slate-400 mb-1">СЕКУНДЫ</span>
                <input
                  id="timer-s-input"
                  type="number"
                  min="0"
                  max="59"
                  value={timerSeconds}
                  onChange={(e) => {
                    const nextS = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    selectTimerValue(timerHours, timerMinutes, nextS);
                  }}
                  className="w-12 py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg text-center font-bold focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Quick Preset Pickers */}
          <div id="timer-presets" className="flex flex-wrap gap-2 justify-center max-w-md">
            {[1, 5, 10, 15, 25, 45, 60].map((mins) => (
              <button
                id={`timer-preset-${mins}`}
                key={mins}
                onClick={() => selectTimerValue(0, mins, 0)}
                className="py-1 px-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
              >
                {mins} мин
              </button>
            ))}
          </div>

          {/* Sound selector for Timer */}
          <div id="timer-sound-adjustment" className="w-full max-w-sm space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 text-left text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px]">Звук по окончании</span>
            <select
              id="timer-sound-select"
              value={timerSound.startsWith('http') || timerSound.startsWith('data:') ? 'custom' : timerSound}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'custom') {
                  setTimerSound(val);
                }
              }}
              className="w-full py-1.5 px-3.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
            >
              <option value="ringtone1">🔊 Стандартный сирена</option>
              <option value="ringtone2">🔔 Электронный звонок</option>
              <option value="natural">🍃 Мягкая мелодия леса</option>
              <option value="custom">🎵 Своя песня (Ссылка или Файл)</option>
            </select>

            {(timerSound.startsWith('http') || timerSound.startsWith('data:') || (document.getElementById('timer-sound-select') as HTMLSelectElement)?.value === 'custom') && (
              <div className="space-y-2 mt-2 p-2.5 bg-white dark:bg-[#1E293B]/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase block">Загрузить аудио (.mp3, .wav)</span>
                  <input
                    id="timer-file-loader"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTimerSound(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[10px] block text-slate-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase block">Ссылка на аудиофайл</span>
                  <input
                    id="timer-custom-url-src"
                    type="text"
                    placeholder="https://example.com/sound.mp3"
                    value={timerSound.startsWith('data:') ? '' : timerSound}
                    onChange={(e) => setTimerSound(e.target.value)}
                    className="w-full py-1 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 font-medium text-xs text-slate-800 dark:text-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sizable Big Clock face */}
          <div id="timer-canvas-container" className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg id="timer-progress-svg" className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                id="timer-bg-circle"
                cx="96"
                cy="96"
                r="80"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                strokeWidth="10"
              />
              <circle
                id="timer-fg-circle"
                cx="96"
                cy="96"
                r="80"
                className="fill-none transition-all duration-1000"
                strokeWidth="10"
                strokeLinecap="round"
                style={{
                  stroke: accentColor,
                  strokeDasharray: 502,
                  strokeDashoffset: timerTotal > 0 ? 502 - (502 * timerRemaining) / timerTotal : 502,
                }}
              />
            </svg>
            
            <div className="z-10 text-center space-y-1">
              <span id="timer-left-display" className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-widest leading-none">
                {formatTimerRemaining(timerRemaining)}
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {timerState === 'running' ? 'ТИКАЕТ' : timerState === 'paused' ? 'ПАУЗА' : 'ГОТОВ'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div id="timer-controls" className="flex gap-4 justify-center items-center w-full max-w-xs">
            <button
              id="timer-reset-btn"
              onClick={() => {
                setTimerState('idle');
                setTimerRemaining(timerTotal);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Сброс
            </button>

            {timerState !== 'running' ? (
              <button
                id="timer-start-btn"
                onClick={() => setTimerState('running')}
                className="flex-1 py-2.5 px-6 rounded-xl text-white font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                <Play className="w-4 h-4 fill-current" /> Старт
              </button>
            ) : (
              <button
                id="timer-pause-btn"
                onClick={() => setTimerState('paused')}
                className="flex-1 py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Pause className="w-4 h-4 fill-current" /> Пауза
              </button>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SUBTAB 3: STOPWATCH SECTION ----------------- */}
      {clocksTab === 'stopwatch' && (
        <div id="stopwatch-layout" className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Visual Display */}
          <div id="stopwatch-screen-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 shadow-sm">
            <div className="text-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Секундомер активности</h3>
              <p className="text-xs text-slate-400 mt-1">Отслеживайте свои круги и результаты</p>
            </div>

            <div id="stopwatch-num-display" className="text-5xl font-black font-mono tracking-widest text-slate-800 dark:text-white my-4 leading-none select-none">
              {formatStopwatchTime(stopwatchTime)}
            </div>

            <div className="flex gap-2 w-full">
              <button
                id="stopwatch-reset-btn"
                onClick={handleResetStopwatch}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex justify-center items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Сбросить
              </button>

              {stopwatchState === 'running' && (
                <button
                  id="stopwatch-lap-btn"
                  onClick={handleLap}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-1.5"
                >
                  <Award className="w-4 h-4" /> Круг
                </button>
              )}

              {stopwatchState !== 'running' ? (
                <button
                  id="stopwatch-start-btn"
                  onClick={() => setStopwatchState('running')}
                  className="flex-1 py-3 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex justify-center items-center gap-1.5 active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <Play className="w-4 h-4 fill-current" /> Начать
                </button>
              ) : (
                <button
                  id="stopwatch-pause-btn"
                  onClick={() => setStopwatchState('paused')}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex justify-center items-center gap-1.5 active:scale-95"
                >
                  <Pause className="w-4 h-4 fill-current" /> Пауза
                </button>
              )}
            </div>
          </div>

          {/* Laps List */}
          <div id="stopwatch-laps-pane" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col max-h-[360px]">
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-4">История кругов ({laps.length})</h4>
            
            {laps.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Пока нет записанных кругов
              </div>
            ) : (
              <div id="laps-list" className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono">
                {laps.slice().reverse().map((lap) => (
                  <div
                    id={`lap-item-${lap.id}`}
                    key={lap.id}
                    className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 py-2 px-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm"
                  >
                    <span className="text-slate-400 font-bold">Круг {lap.lapNumber}</span>
                    <div className="flex gap-4">
                      <span className="text-slate-500 text-xs">+{lap.lapTime}</span>
                      <span className="font-bold text-slate-800 dark:text-white">{lap.totalTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ----------------- SUBTAB 4: POMODORO TECHNIQUE SECTION ----------------- */}
      {clocksTab === 'pomodoro' && (
        <div id="pomodoro-layout" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white font-sans">Таймер Помидора (Pomodoro)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Классическая техника концентрации: 25 минут сфокусированной работы и 5 минут отдыха
            </p>
          </div>

          {/* Quick presets for Pomodoro */}
          {pomodoroState === 'idle' && (
            <div id="pomodoro-presets-row" className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex flex-col items-center">
                <span className="font-sans font-bold text-[9px] uppercase text-slate-400 mb-1">РАБОТА (МИНУТЫ)</span>
                <input
                  id="pomo-work-input"
                  type="number"
                  min="1"
                  max="120"
                  value={pomodoroMinutes}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 25));
                    setPomodoroMinutes(val);
                    if (pomodoroMode === 'work') {
                      setPomodoroRemaining(val * 60);
                      setPomodoroTotalDuration(val * 60);
                    }
                  }}
                  className="w-16 py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg text-center font-bold focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="font-sans font-bold text-[9px] uppercase text-slate-400 mb-1">ОТДЫХ (МИНУТЫ)</span>
                <input
                  id="pomo-break-input"
                  type="number"
                  min="1"
                  max="60"
                  value={pomodoroBreakMinutes}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 5));
                    setPomodoroBreakMinutes(val);
                    if (pomodoroMode === 'break') {
                      setPomodoroRemaining(val * 60);
                      setPomodoroTotalDuration(val * 60);
                    }
                  }}
                  className="w-16 py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg text-center font-bold focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Sizable Big Pomodoro Circle */}
          <div id="pomodoro-canvas-container" className="relative w-52 h-52 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg id="pomodoro-progress-svg" className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                id="pomodoro-bg-circle"
                cx="104"
                cy="104"
                r="88"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                strokeWidth="10"
              />
              <circle
                id="pomodoro-fg-circle"
                cx="104"
                cy="104"
                r="88"
                className="fill-none transition-all duration-1000"
                strokeWidth="10"
                strokeLinecap="round"
                style={{
                  stroke: pomodoroMode === 'work' ? '#f43f5e' : '#10b981', // Rose for Work, Emerald for break
                  strokeDasharray: 553,
                  strokeDashoffset: pomodoroTotalDuration > 0 ? 553 - (553 * pomodoroRemaining) / pomodoroTotalDuration : 553,
                }}
              />
            </svg>
            
            <div className="z-10 text-center space-y-1.5">
              <span id="pomodoro-left-display" className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-widest leading-none">
                {formatTimerRemaining(pomodoroRemaining)}
              </span>
              <div className="flex flex-col items-center leading-none">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  pomodoroMode === 'work' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20'
                }`}>
                  {pomodoroMode === 'work' ? '💼 РАБОТА' : '🧘 ОТДЫХ'}
                </span>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-1.5">
                  {pomodoroState === 'running' ? 'КОНЦЕНТРАЦИЯ' : pomodoroState === 'paused' ? 'ПАУЗА' : 'ГОТОВ'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick presets choices buttons */}
          <div id="pomodoro-quick-btns" className="flex gap-2">
            <button
              id="pomo-classic-preset"
              onClick={() => {
                setPomodoroMinutes(25);
                setPomodoroBreakMinutes(5);
                setPomodoroMode('work');
                setPomodoroRemaining(25 * 60);
                setPomodoroTotalDuration(25 * 60);
                setPomodoroState('idle');
              }}
              className="py-1 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300"
            >
              Classic (25 / 5)
            </button>
            <button
              id="pomo-long-preset"
              onClick={() => {
                setPomodoroMinutes(50);
                setPomodoroBreakMinutes(10);
                setPomodoroMode('work');
                setPomodoroRemaining(50 * 60);
                setPomodoroTotalDuration(50 * 60);
                setPomodoroState('idle');
              }}
              className="py-1 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300"
            >
              Long (50 / 10)
            </button>
          </div>

          {/* Controls */}
          <div id="pomodoro-controls" className="flex gap-4 justify-center items-center w-full max-w-xs">
            <button
              id="pomodoro-reset-btn"
              onClick={() => {
                setPomodoroState('idle');
                const workSecs = pomodoroMinutes * 60;
                setPomodoroRemaining(workSecs);
                setPomodoroTotalDuration(workSecs);
                setPomodoroMode('work');
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Сброс
            </button>

            {pomodoroState !== 'running' ? (
              <button
                id="pomodoro-start-btn"
                onClick={() => setPomodoroState('running')}
                className="flex-1 py-2.5 px-6 rounded-xl text-white font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                <Play className="w-4 h-4 fill-current" /> Старт
              </button>
            ) : (
              <button
                id="pomodoro-pause-btn"
                onClick={() => setPomodoroState('paused')}
                className="flex-1 py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Pause className="w-4 h-4 fill-current" /> Пауза
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
