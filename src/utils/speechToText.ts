/**
 * NoteSphere OS — Speech-to-Text (Voice Dictation) Utility
 * Powered by browser native Web Speech API.
 */

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

let activeRecognition: any = null;
let silenceTimer: any = null;

export function startSpeechRecognition({
  onResult,
  onError,
  onEnd,
  lang = 'ru-RU',
  continuous = false,
}: {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
  continuous?: boolean;
}): boolean {
  if (!isSpeechRecognitionSupported()) {
    if (onError) onError('Голосовой ввод не поддерживается в этом браузере.');
    return false;
  }

  stopSpeechRecognition();

  try {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    const resetSilenceTimer = (durationMs = 2000) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        stopSpeechRecognition();
        if (onEnd) onEnd();
      }, durationMs);
    };

    // Auto-stop if user doesn't say anything for 6 seconds
    resetSilenceTimer(6000);

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        if (!continuous) {
          stopSpeechRecognition();
        }
        onResult(final.trim(), true);
      } else if (interim) {
        resetSilenceTimer(2000);
        onResult(interim.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      stopSpeechRecognition();
      if (onError) onError(event.error || 'Ошибка микрофона');
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      activeRecognition = null;
      if (onEnd) onEnd();
    };

    recognition.start();
    activeRecognition = recognition;
    return true;
  } catch (err: any) {
    if (silenceTimer) clearTimeout(silenceTimer);
    stopSpeechRecognition();
    if (onError) onError(err.message || 'Сбой запуска микрофона');
    return false;
  }
}

export function stopSpeechRecognition(): void {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (activeRecognition) {
    const recog = activeRecognition;
    activeRecognition = null;
    try {
      recog.onresult = null;
      recog.onerror = null;
      recog.onend = null;
      recog.abort();
    } catch {}
    try {
      recog.stop();
    } catch {}
  }
}
