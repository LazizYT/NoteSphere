export const DEFAULT_PLAYLISTS = [
  { id: 'all', name: 'Все треки', icon: '🎵' },
  { id: 'favorites', name: 'Избранное', icon: '❤️' },
  { id: 'study', name: 'Для учёбы', icon: '📚' },
  { id: 'sport', name: 'Для спорта', icon: '⚡' },
  { id: 'relax', name: 'Relax', icon: '☕' },
  { id: 'kpop', name: 'K-Pop', icon: '🌸' },
  { id: 'lofi', name: 'Lo-Fi', icon: '🎧' },
  { id: 'russian-rap', name: 'Русский рэп', icon: '🔥' },
  { id: 'travel', name: 'Путешествия', icon: '✈️' },
  { id: 'moodless', name: 'Без настроения', icon: '🌧' },
];

export const DEFAULT_VIDEO_PLAYLISTS = [
  { id: 'video-all', name: 'Все видео', icon: '🎬' },
  { id: 'video-favs', name: 'Избранные видео', icon: '⭐' },
  { id: 'video-study', name: 'Лекции и учеба', icon: '🎓' },
  { id: 'video-coding', name: 'Уроки и кодинг', icon: '💻' },
  { id: 'video-sport', name: 'Тренировки', icon: '🏋️' },
  { id: 'video-clips', name: 'Клипы и шортсы', icon: '🎥' },
];


export const RECENTLY_ADDED = [
  {
    id: 'rec-1',
    title: 'Tokyo Night Walk 4K',
    subtitle: 'Lo-Fi / Ambient',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-tokyo-night',
  },
  {
    id: 'rec-2',
    title: 'After Dark',
    subtitle: 'Mareux • Darkwave',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-after-dark',
  },
  {
    id: 'rec-3',
    title: 'Dreams',
    subtitle: 'Fleetwood Mac • Rock',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-dreams',
  },
  {
    id: 'rec-4',
    title: 'Chill Vibes',
    subtitle: 'Lofi Girl • Study',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-better-days',
  },
  {
    id: 'rec-5',
    title: 'K-Pop Mix',
    subtitle: 'NewJeans • Pop',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-the-nights',
  },
  {
    id: 'rec-6',
    title: 'Workout Music',
    subtitle: 'NEFFEX • Energy',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    trackId: 'track-better-days',
  },
];

export const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
];

export function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
