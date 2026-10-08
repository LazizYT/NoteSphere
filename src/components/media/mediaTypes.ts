import React from 'react';

export interface LocalTrack {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'audio' | 'video' | 'image';
  duration?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  artist?: string;
  album?: string;
  genre?: string;
  dimensions?: string;
  createdAt?: string;
  file?: File | Blob;
  isFavorite?: boolean;
  playlistId?: string;
  playlistIds?: string[];
}

export interface LocalPlaylist {
  id: string;
  name: string;
  path: string;
  type: 'audio' | 'video' | 'image';
  color: string;
  icon?: string;
  trackCount?: number;
}

export interface MediaTabProps {
  accentColor: string;
  tracks: LocalTrack[];
  setTracks: React.Dispatch<React.SetStateAction<LocalTrack[]>>;
  currentTrackIndex: number;
  setCurrentTrackIndex: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isShuffle: boolean;
  setIsShuffle: (shuffle: boolean) => void;
  isRepeat: boolean;
  setIsRepeat: (repeat: boolean) => void;
  repeatMode?: 'off' | 'all' | 'one';
  cycleRepeatMode?: () => void;
  activeVideoUrl: string | null;
  setActiveVideoUrl: (url: string | null) => void;
  videoPlaySpeed: number;
  setVideoPlaySpeed: (speed: number) => void;
  isCinemaMode: boolean;
  setIsCinemaMode: (cinema: boolean) => void;
  globalAudioRef: React.RefObject<HTMLAudioElement | null>;
  handlesSkip: (dir: 'next' | 'prev') => void;
  handlePlayTrack: (index: number) => void;
  mediaQueue: string[];
  setMediaQueue: React.Dispatch<React.SetStateAction<string[]>>;
  showHud: (msg: string) => void;
  onAddNote?: (note: any) => void;
}
