/**
 * Lightweight mobile haptic utility using navigator.vibrate
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' | 'error' | 'selection' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      if (type === 'selection' || type === 'light') {
        window.navigator.vibrate(10);
      } else if (type === 'medium') {
        window.navigator.vibrate(25);
      } else if (type === 'success') {
        window.navigator.vibrate([15, 30, 15]);
      } else if (type === 'warning') {
        window.navigator.vibrate([40, 50, 40]);
      } else if (type === 'error') {
        window.navigator.vibrate([60, 40, 60]);
      }
    } catch (e) {
      // Intentionally ignored when permission/support is not available in frame
    }
  }
};
