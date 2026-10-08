import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Search,
  Grid,
  List,
  Heart,
  MoreHorizontal,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  Mic,
  Maximize2,
  Minimize2,
  Upload,
  Download,
  Trash2,
  Sparkles,
  Camera,
  X,
  Check,
  ChevronDown,
  CloudUpload,
  ListPlus,
  Settings,
  HardDrive,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { saveTrackToDB, deleteTrackFromDB } from '../utils/mediaDB';
import { parseAudioMetadata } from '../utils/id3Parser';

import { LocalTrack, LocalPlaylist, MediaTabProps } from './media/mediaTypes';
import { DEFAULT_PLAYLISTS, DEFAULT_VIDEO_PLAYLISTS, RECENTLY_ADDED, COVER_PRESETS, formatTime } from './media/mediaConstants';
import { CoverArtModal } from './media/modals/CoverArtModal';
import { AddTrackModal } from './media/modals/AddTrackModal';
import { TrackPlaylistModal } from './media/modals/TrackPlaylistModal';
import { SelectTracksModal } from './media/modals/SelectTracksModal';
import { NewPlaylistModal } from './media/modals/NewPlaylistModal';
import { MediaFoldersModal } from './media/modals/MediaFoldersModal';
import { MediaLightboxModal } from './media/modals/MediaLightboxModal';

// Re-export types for backward compatibility across the app
export type { LocalTrack, LocalPlaylist };

export default function MediaTab({
  accentColor,
  tracks,
  setTracks,
  currentTrackIndex,
  setCurrentTrackIndex,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  duration,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  isShuffle,
  setIsShuffle,
  isRepeat,
  setIsRepeat,
  repeatMode = 'off',
  cycleRepeatMode,
  activeVideoUrl,
  setActiveVideoUrl,
  videoPlaySpeed,
  setVideoPlaySpeed,
  isCinemaMode,
  setIsCinemaMode,
  globalAudioRef,
  handlesSkip,
  handlePlayTrack,
  mediaQueue,
  setMediaQueue,
  showHud,
  onAddNote,
}: MediaTabProps) {
  // Input references
  const universalFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderPickerInputRef = useRef<HTMLInputElement | null>(null);

  // Category filter: 'audio' (Музыка), 'video' (Видео), 'image' (Галерея)
  const [selectedCategory, setSelectedCategory] = useState<'audio' | 'video' | 'image'>('audio');

  // Playlist selection
  const [activePlaylistId, setActivePlaylistId] = useState<string>('all');
  const [activeVideoPlaylistId, setActiveVideoPlaylistId] = useState<string>('video-all');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pagination: maximum 8 visible tracks per page as requested
  const PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Modals controllers
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState<boolean>(false);
  const [showFoldersModal, setShowFoldersModal] = useState<boolean>(false);
  const [commonFolders, setCommonFolders] = useState<{ name: string; type: string; path: string }[]>([]);
  const [coverModalTrack, setCoverModalTrack] = useState<LocalTrack | null>(null);
  const [trackPlaylistModalTrack, setTrackPlaylistModalTrack] = useState<LocalTrack | null>(null);
  const [showSelectTracksModal, setShowSelectTracksModal] = useState<boolean>(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState<boolean>(false);

  // OCR modal for images
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResultText, setOcrResultText] = useState('');
  const [ocrTargetName, setOcrTargetName] = useState('');

  // Lightbox modal for images
  const [lightboxTrack, setLightboxTrack] = useState<LocalTrack | null>(null);

  // Local playlists stored in localStorage
  const [localPlaylists, setLocalPlaylists] = useState<LocalPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem('ns_local_playlists_v3');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ns_local_playlists_v3', JSON.stringify(localPlaylists));
  }, [localPlaylists]);

  // Current active track
  const currentTrack: LocalTrack | null =
    currentTrackIndex >= 0 && currentTrackIndex < tracks.length ? tracks[currentTrackIndex] : null;

  // Real dynamic counts — NO fake statistics!
  const audioCount = useMemo(() => tracks.filter((t) => t.type === 'audio').length, [tracks]);
  const videoCount = useMemo(() => tracks.filter((t) => t.type === 'video').length, [tracks]);
  const imageCount = useMemo(() => tracks.filter((t) => t.type === 'image').length, [tracks]);
  const voiceCount = useMemo(
    () =>
      tracks.filter(
        (t) =>
          t.type === 'audio' &&
          (t.genre === 'Диктофон' || t.genre === 'Голос' || t.album === 'Диктофон')
      ).length,
    [tracks]
  );

  // Real accurate count helper for any audio playlist
  const getPlaylistTrackCount = (plId: string) => {
    if (plId === 'all') {
      return tracks.filter((t) => t.type === 'audio').length;
    }
    if (plId === 'favorites') {
      return tracks.filter((t) => t.type === 'audio' && t.isFavorite).length;
    }
    return tracks.filter((t) => {
      if (t.type !== 'audio') return false;
      if (t.playlistIds && t.playlistIds.includes(plId)) return true;
      if (t.playlistId === plId) return true;
      return false;
    }).length;
  };

  // Count helper for video playlists
  const getVideoPlaylistCount = (plId: string) => {
    if (plId === 'video-all') {
      return tracks.filter((t) => t.type === 'video').length;
    }
    if (plId === 'video-favs') {
      return tracks.filter((t) => t.type === 'video' && t.isFavorite).length;
    }
    return tracks.filter((t) => {
      if (t.type !== 'video') return false;
      if (t.playlistIds && t.playlistIds.includes(plId)) return true;
      if (t.playlistId === plId) return true;
      if (plId === 'video-study') return /лекци|учеб|курс|study/i.test(t.name + ' ' + (t.album || ''));
      if (plId === 'video-coding') return /код|python|react|dev|программ|урок/i.test(t.name + ' ' + (t.album || ''));
      if (plId === 'video-sport') return /тренировк|workout|спорт|gym|fitness/i.test(t.name + ' ' + (t.album || ''));
      if (plId === 'video-clips') return /клип|short|clip|музык/i.test(t.name + ' ' + (t.album || ''));
      return false;
    }).length;
  };


  // Real recent tracks (from tracks state, not hardcoded cards)
  const recentAudioTracks = useMemo(() => {
    return tracks.filter((t) => t.type === 'audio').slice(0, 6);
  }, [tracks]);

  // Extract all unique genres and artists for the dropdown filters
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach((t) => {
      if (t.genre) set.add(t.genre);
    });
    return Array.from(set);
  }, [tracks]);

  const allArtists = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach((t) => {
      if (t.artist) set.add(t.artist);
    });
    return Array.from(set);
  }, [tracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks
      .filter((t) => {
        // Category filter
        if (selectedCategory === 'audio' && t.type !== 'audio') return false;
        if (selectedCategory === 'video' && t.type !== 'video') return false;
        if (selectedCategory === 'image' && t.type !== 'image') return false;
        if (selectedCategory === 'voice' && t.type !== 'audio') return false;

        // Audio Playlist filter
        if (selectedCategory === 'audio') {
          if (activePlaylistId === 'favorites') {
            if (!t.isFavorite) return false;
          } else if (activePlaylistId !== 'all') {
            const inPlaylist =
              (t.playlistIds && t.playlistIds.includes(activePlaylistId)) ||
              t.playlistId === activePlaylistId;
            if (!inPlaylist) return false;
          }
        }

        // Video Playlist filter
        if (selectedCategory === 'video') {
          if (activeVideoPlaylistId === 'video-favs') {
            if (!t.isFavorite) return false;
          } else if (activeVideoPlaylistId === 'video-study') {
            if (!/лекци|учеб|курс|study/i.test(t.name + ' ' + (t.album || ''))) return false;
          } else if (activeVideoPlaylistId === 'video-coding') {
            if (!/код|python|react|dev|программ|урок/i.test(t.name + ' ' + (t.album || ''))) return false;
          } else if (activeVideoPlaylistId === 'video-sport') {
            if (!/тренировк|workout|спорт|gym|fitness/i.test(t.name + ' ' + (t.album || ''))) return false;
          } else if (activeVideoPlaylistId === 'video-clips') {
            if (!/клип|short|clip|музык/i.test(t.name + ' ' + (t.album || ''))) return false;
          } else if (activeVideoPlaylistId !== 'video-all') {
            const inPlaylist =
              (t.playlistIds && t.playlistIds.includes(activeVideoPlaylistId)) ||
              t.playlistId === activeVideoPlaylistId;
            if (!inPlaylist) return false;
          }
        }


        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = t.name.toLowerCase().includes(q);
          const matchesArtist = (t.artist || '').toLowerCase().includes(q);
          const matchesAlbum = (t.album || '').toLowerCase().includes(q);
          const matchesGenre = (t.genre || '').toLowerCase().includes(q);
          if (!matchesName && !matchesArtist && !matchesAlbum && !matchesGenre) return false;
        }

        // Genre filter
        if (selectedGenre !== 'all' && t.genre !== selectedGenre) return false;

        // Artist filter
        if (selectedArtist !== 'all' && t.artist !== selectedArtist) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.name.localeCompare(b.name);
        if (sortBy === 'duration') return (b.duration || '').localeCompare(a.duration || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [tracks, selectedCategory, activePlaylistId, activeVideoPlaylistId, searchQuery, selectedGenre, selectedArtist, sortBy]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, activePlaylistId, activeVideoPlaylistId, searchQuery, selectedGenre, selectedArtist, sortBy]);

  // Slice for current page
  const paginatedTracks = filteredTracks.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / PER_PAGE));

  // Helper to handle repeat cycling
  const handleToggleRepeat = () => {
    if (cycleRepeatMode) {
      cycleRepeatMode();
    } else {
      setIsRepeat(!isRepeat);
      triggerHaptic('light');
    }
  };


  // Toggle favorite on a track
  const toggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const updated = { ...t, isFavorite: !t.isFavorite };
          saveTrackToDB({
            id: updated.id,
            name: updated.name,
            size: updated.size,
            type: updated.type,
            album: updated.album,
            artist: updated.artist,
            coverUrl: updated.coverUrl,
            genre: updated.genre,
            duration: updated.duration,
            file: updated.file,
          }).catch(console.error);
          return updated;
        }
        return t;
      })
    );
    triggerHaptic('light');
  };

  // Add to Queue
  const handleAddToQueue = (trackId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMediaQueue((prev) => [...prev, trackId]);
    const trk = tracks.find((t) => t.id === trackId);
    showHud(`Трек «${trk?.name || 'Песня'}» добавлен в очередь`);
    triggerHaptic('success');
  };

  // Remove from Queue
  const handleRemoveFromQueue = (index: number) => {
    setMediaQueue((prev) => prev.filter((_, idx) => idx !== index));
    triggerHaptic('light');
  };

  // Update track cover image
  const handleSaveCoverImage = (trackId: string, newCoverUrl: string) => {
    const targetCover = (newCoverUrl || '').trim();
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const updated = { ...t, coverUrl: targetCover, thumbnailUrl: targetCover };
          saveTrackToDB({
            id: updated.id,
            name: updated.name,
            size: updated.size,
            type: updated.type,
            url: updated.url,
            album: updated.album,
            artist: updated.artist,
            coverUrl: targetCover,
            genre: updated.genre,
            duration: updated.duration,
            file: updated.file,
            isFavorite: updated.isFavorite,
            playlistIds: updated.playlistIds,
            playlistId: updated.playlistId,
          }).catch(console.error);
          return updated;
        }
        return t;
      })
    );
    setMediaQueue((prev) =>
      prev.map((q) => (q.id === trackId ? { ...q, coverUrl: targetCover, thumbnailUrl: targetCover } : q))
    );
    showHud(targetCover ? 'Обложка трека успешно обновлена!' : 'Обложка трека удалена');
    triggerHaptic('success');
    setCoverModalTrack(null);
  };

  // Delete a track
  const handleDeleteTrack = (trackId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    deleteTrackFromDB(trackId).catch(console.error);
    showHud('Трек удален из медиатеки');
    triggerHaptic('light');
  };

  // Handle uploading audio files from computer directly with ID3 cover art & tag extraction
  const handleAudioFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: LocalTrack[] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `audio-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const blobUrl = URL.createObjectURL(file);
      const assignedPlaylists = activePlaylistId && activePlaylistId !== 'all' ? [activePlaylistId] : [];

      let metaTitle = '';
      let metaArtist = '';
      let metaAlbum = '';
      let metaCover = '';

      try {
        const meta = await parseAudioMetadata(file);
        if (meta.title) metaTitle = meta.title;
        if (meta.artist) metaArtist = meta.artist;
        if (meta.album) metaAlbum = meta.album;
        if (meta.coverUrl) metaCover = meta.coverUrl;
      } catch (err) {
        console.warn('Metadata parsing error:', err);
      }

      const finalCover = metaCover || '';

      const defaultAlbum =
        activePlaylistId && activePlaylistId !== 'all'
          ? DEFAULT_PLAYLISTS.find((p) => p.id === activePlaylistId)?.name ||
            localPlaylists.find((p) => p.id === activePlaylistId)?.name ||
            'Плейлист'
          : 'Сингл';

      const item: LocalTrack = {
        id,
        name: metaTitle || file.name.replace(/\.[^/.]+$/, ''),
        url: blobUrl,
        size: sizeStr,
        type: 'audio',
        artist: metaArtist || 'Моя музыка',
        album: metaAlbum || defaultAlbum,
        genre: 'Музыка',
        duration: '03:30',
        coverUrl: finalCover,
        thumbnailUrl: finalCover,
        createdAt: dateStr,
        file: file,
        isFavorite: activePlaylistId === 'favorites',
        playlistIds: assignedPlaylists,
        playlistId: assignedPlaylists[0],
      };

      const tempAudio = new Audio();
      tempAudio.src = blobUrl;
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          const m = Math.floor(tempAudio.duration / 60);
          const s = Math.floor(tempAudio.duration % 60);
          const durStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          item.duration = durStr;
          setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, duration: durStr } : t)));
        }
      };

      newItems.push(item);
      saveTrackToDB({
        id,
        name: item.name,
        size: sizeStr,
        type: 'audio',
        artist: item.artist,
        album: item.album,
        coverUrl: item.coverUrl,
        duration: item.duration,
        file: file,
        playlistIds: assignedPlaylists,
        playlistId: assignedPlaylists[0],
      }).catch(console.error);
    }

    if (newItems.length > 0) {
      setTracks((prev) => [...newItems, ...prev]);
      showHud(`Загружено ${newItems.length} аудиофайл(ов)`);
      triggerHaptic('success');
    }
    e.target.value = '';
  };

  // Toggle track membership in a playlist
  const toggleTrackPlaylist = (trackId: string, playlistId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          if (playlistId === 'favorites') {
            const updated = { ...t, isFavorite: !t.isFavorite };
            saveTrackToDB({
              id: updated.id,
              name: updated.name,
              size: updated.size,
              type: updated.type,
              album: updated.album,
              artist: updated.artist,
              coverUrl: updated.coverUrl,
              duration: updated.duration,
              file: updated.file,
              isFavorite: updated.isFavorite,
              playlistIds: updated.playlistIds,
              playlistId: updated.playlistId,
            }).catch(console.error);
            return updated;
          }

          const currentIds = t.playlistIds || (t.playlistId ? [t.playlistId] : []);
          const exists = currentIds.includes(playlistId);
          const newIds = exists
            ? currentIds.filter((id) => id !== playlistId)
            : [...currentIds, playlistId];
          const updated = { ...t, playlistIds: newIds, playlistId: newIds[0] };
          saveTrackToDB({
            id: updated.id,
            name: updated.name,
            size: updated.size,
            type: updated.type,
            album: updated.album,
            artist: updated.artist,
            coverUrl: updated.coverUrl,
            duration: updated.duration,
            file: updated.file,
            isFavorite: updated.isFavorite,
            playlistIds: newIds,
            playlistId: newIds[0],
          }).catch(console.error);
          return updated;
        }
        return t;
      })
    );
    triggerHaptic('light');
    showHud('Плейлисты трека обновлены');
  };

  // Delete custom playlist
  const handleDeletePlaylist = (playlistId: string) => {
    const pl = localPlaylists.find((p) => p.id === playlistId);
    if (!window.confirm(`Удалить плейлист «${pl?.name || 'Плейлист'}»? Треки останутся в медиатеке.`)) {
      return;
    }
    setLocalPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (activePlaylistId === playlistId) {
      setActivePlaylistId('all');
    }
    showHud(`Плейлист «${pl?.name || ''}» удален`);
    triggerHaptic('light');
  };

  // Process files imported or dropped
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const newItems: LocalTrack[] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(file.name);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name);

      if (isImage || isVideo || isAudio) {
        const id = `media-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        const blobUrl = URL.createObjectURL(file);
        const mediaType: 'image' | 'video' | 'audio' = isImage ? 'image' : isVideo ? 'video' : 'audio';

        let coverUrl = isImage ? blobUrl : '';
        let metaTitle = '';
        let metaArtist = '';

        if (isAudio) {
          try {
            const meta = await parseAudioMetadata(file);
            if (meta.coverUrl) coverUrl = meta.coverUrl;
            if (meta.title) metaTitle = meta.title;
            if (meta.artist) metaArtist = meta.artist;
          } catch (err) {
            console.warn('Metadata parsing error:', err);
          }
        }

        const item: LocalTrack = {
          id,
          name: metaTitle || file.name.replace(/\.[^/.]+$/, ''),
          url: blobUrl,
          thumbnailUrl: coverUrl || (isImage ? blobUrl : undefined),
          coverUrl: coverUrl,
          size: sizeStr,
          type: mediaType,
          artist: metaArtist || (isAudio ? 'Моя музыка' : 'Пользователь'),
          album: 'Импортированное',
          genre: isAudio ? 'Музыка' : isVideo ? 'Видео' : 'Изображение',
          duration: '3:30',
          createdAt: dateStr,
          file: file,
          isFavorite: false,
        };

        newItems.push(item);
        saveTrackToDB({
          id,
          name: item.name,
          size: sizeStr,
          type: mediaType,
          artist: item.artist,
          album: item.album,
          coverUrl: item.coverUrl,
          duration: item.duration,
          file: file,
        }).catch(console.error);
      }
    }

    if (newItems.length > 0) {
      setTracks((prev) => [...newItems, ...prev]);
      showHud(`Добавлено ${newItems.length} файл(ов)`);
      triggerHaptic('success');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Create note from OCR
  const handleCreateNoteFromOCR = () => {
    if (!ocrResultText.trim()) return;
    if (onAddNote) {
      onAddNote({
        id: `note-ocr-${Date.now()}`,
        title: `OCR: ${ocrTargetName}`,
        content: `<p>${ocrResultText.replace(/\n/g, '<br/>')}</p>`,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categoryId: 'cat-personal',
        tags: ['ocr', 'распознано'],
        importance: 'medium',
        color: accentColor,
        attachments: [],
        isProtected: false,
        versions: [],
        links: [],
      });
      showHud('Заметка из OCR создана!');
      triggerHaptic('success');
      setOcrModalOpen(false);
    }
  };

  return (
    <div
      id="media-tab-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full flex flex-col space-y-4 overflow-y-auto pr-1 select-none font-sans relative bg-slate-50 dark:bg-[#07080a] text-slate-800 dark:text-slate-100 p-1 sm:p-2"
    >
      {/* Universal Drag & Drop Overlay Notification */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#07090e] rounded-2xl flex flex-col items-center justify-center text-white p-6 border-2 border-violet-500 border-dashed pointer-events-none"
          >
            <CloudUpload className="w-16 h-16 text-violet-400 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold font-display">Отпустите файлы для мгновенной загрузки</h3>
            <p className="text-xs text-slate-400 mt-1">Поддерживаются Музыка (MP3, WAV), Видео (MP4) и Фотографии (JPG, PNG)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <input
        ref={universalFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
        }}
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleAudioFilesUpload}
      />
      <input
        ref={folderPickerInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
        }}
      />

      {/* 1. TOP HEADER - Exact Replica with Theme & Real Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#0e1422] p-4 rounded-2xl border border-slate-200 dark:border-[#1e2638] gap-4 shadow-sm">
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-display">
              Медиатека
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ваша коллекция музыки, видео, изображений и аудиофайлов
            </p>
          </div>
        </div>

        {/* Right: Unified + Добавить action button with smart dropdown, and View Toggle */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end relative">
          {/* Primary Action Button (Adapts label to active category) */}
          <button
            onClick={() => {
              if (selectedCategory === 'audio') {
                audioFileInputRef.current?.click();
              } else if (selectedCategory === 'video' || selectedCategory === 'image') {
                universalFileInputRef.current?.click();
              }
              triggerHaptic('light');
            }}
            style={{ backgroundColor: accentColor }}
            className="text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer hover:brightness-110 active:scale-95"
            title="Загрузить файл с компьютера"
          >
            {selectedCategory === 'audio' ? (
              <>
                <Music size={14} />
                <span>+ Добавить трек</span>
              </>
            ) : selectedCategory === 'video' ? (
              <>
                <VideoIcon size={14} />
                <span>+ Загрузить видео</span>
              </>
            ) : (
              <>
                <ImageIcon size={14} />
                <span>+ Добавить фото</span>
              </>
            )}
          </button>

          {/* Quick Menu Dropdown for specific formats & playlists */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu((prev) => !prev)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-slate-800 dark:text-white font-bold text-xs px-2.5 py-2 rounded-xl flex items-center gap-1 shadow-sm transition cursor-pointer"
              title="Дополнительные действия"
            >
              <ChevronDown size={14} className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl shadow-xl z-50 p-1.5 space-y-1"
                >
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowAddTrackModal(true);
                      triggerHaptic('light');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2638] flex items-center gap-2 cursor-pointer"
                  >
                    <Music size={14} className="text-violet-400" />
                    <span>Добавить аудио с обложкой</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      folderPickerInputRef.current?.click();
                      triggerHaptic('light');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2638] flex items-center gap-2 cursor-pointer"
                  >
                    <Folder size={14} className="text-blue-400" />
                    <span>Импорт целой папки</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-[#1e2638] my-1" />
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowNewPlaylistModal(true);
                      triggerHaptic('light');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2638] flex items-center gap-2 cursor-pointer"
                  >
                    <FolderPlus size={14} className="text-amber-400" />
                    <span>Создать новый плейлист</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              style={viewMode === 'grid' ? { backgroundColor: accentColor } : undefined}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Сетка"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { backgroundColor: accentColor } : undefined}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Список"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY SWITCHER DOCK - Prominent, High-Contrast Segmented Control */}
      <div className="bg-white dark:bg-[#0e1422] p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-[#1e2638] shadow-sm flex items-center justify-between flex-wrap gap-2.5">
        <div className="bg-slate-100 dark:bg-[#07090e] p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2638] flex items-center gap-1.5 shadow-inner">
          {[
            { id: 'audio', label: 'Музыка', count: audioCount, icon: Music },
            { id: 'video', label: 'Видео', count: videoCount, icon: VideoIcon },
            { id: 'image', label: 'Галерея', count: imageCount, icon: ImageIcon },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id as any);
                  setCurrentPage(1);
                  triggerHaptic('light');
                }}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#151c2c] text-slate-900 dark:text-white shadow-md border border-slate-300/80 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={isActive ? { backgroundColor: accentColor + '20', color: accentColor } : undefined}
                >
                  <Icon size={14} />
                </div>
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-[#0e1422] text-slate-900 dark:text-white'
                      : 'bg-slate-200/80 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick status summary info */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
          <span>
            {selectedCategory === 'audio'
              ? `Всего аудиозаписей: ${audioCount}`
              : selectedCategory === 'video'
              ? `Всего видео: ${videoCount}`
              : `Изображений в галерее: ${imageCount}`}
          </span>
        </div>
      </div>

      {/* 3. 3-COLUMN STUDIO LAYOUT */}
      {selectedCategory === 'audio' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ================= COLUMN 1: PLAYLISTS (Left ~240px) ================= */}
          <div className="lg:col-span-3 xl:col-span-2 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Плейлисты</span>
              <button
                onClick={() => {
                  setShowNewPlaylistModal(true);
                  triggerHaptic('light');
                }}
                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                title="Создать новый плейлист"
              >
                <Plus size={11} />
              </button>
            </div>

            <div className="space-y-1">
              {DEFAULT_PLAYLISTS.map((pl) => {
                const isActive = activePlaylistId === pl.id;
                const count = getPlaylistTrackCount(pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      triggerHaptic('light');
                    }}
                    style={isActive ? { borderLeftColor: accentColor } : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 dark:bg-[#1e2638] text-slate-900 dark:text-white font-bold border-l-2'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#151c2c]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-sm">{pl.icon}</span>
                      <span className="truncate">{pl.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1.5">{count}</span>
                  </button>
                );
              })}

              {/* User Custom Playlists */}
              {localPlaylists.map((pl) => {
                const isActive = activePlaylistId === pl.id;
                const count = getPlaylistTrackCount(pl.id);
                return (
                  <div key={pl.id} className="group/pl flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActivePlaylistId(pl.id);
                        triggerHaptic('light');
                      }}
                      style={isActive ? { borderLeftColor: accentColor } : undefined}
                      className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer min-w-0 ${
                        isActive
                          ? 'bg-slate-100 dark:bg-[#1e2638] text-slate-900 dark:text-white font-bold border-l-2'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#151c2c]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate min-w-0">
                        <span className="text-sm">{pl.icon || '📁'}</span>
                        <span className="truncate">{pl.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1.5">
                        {count}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl.id);
                      }}
                      className="opacity-0 group-hover/pl:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                      title="Удалить плейлист"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= COLUMN 2: MAIN TRACKS & RECENTLY ADDED (Center) ================= */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            {/* Playlist Header Banner (when a specific playlist is selected) */}
            {activePlaylistId !== 'all' && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0"
                    style={{ backgroundColor: accentColor + '20' }}
                  >
                    {DEFAULT_PLAYLISTS.find((p) => p.id === activePlaylistId)?.icon ||
                      localPlaylists.find((p) => p.id === activePlaylistId)?.icon ||
                      '📁'}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>
                        {DEFAULT_PLAYLISTS.find((p) => p.id === activePlaylistId)?.name ||
                          localPlaylists.find((p) => p.id === activePlaylistId)?.name ||
                          'Плейлист'}
                      </span>
                      <span className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                        • {filteredTracks.length} {filteredTracks.length === 1 ? 'трек' : filteredTracks.length < 5 ? 'трека' : 'треков'}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {activePlaylistId === 'favorites'
                        ? 'Ваши любимые сохраненные треки'
                        : 'Плейлист вашей коллекции'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => audioFileInputRef.current?.click()}
                    style={{ backgroundColor: accentColor }}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Загрузить аудио сюда</span>
                  </button>
                  <button
                    onClick={() => setShowSelectTracksModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#151c2c] hover:bg-slate-200 dark:hover:bg-[#1e2638] text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ListPlus size={13} />
                    <span>Выбрать из базы</span>
                  </button>
                </div>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Поиск по музыке..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Genre Dropdown */}
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] text-xs text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Все жанры</option>
                {allGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Artist Dropdown */}
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] text-xs text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Все исполнители</option>
                {allArtists.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] text-xs text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="date">По дате добавления</option>
                <option value="title">По названию</option>
                <option value="duration">По длительности</option>
              </select>
            </div>

            {/* Empty State when no tracks in playlist */}
            {filteredTracks.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] space-y-3 shadow-xs">
                <div
                  className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: accentColor + '20', color: accentColor }}
                >
                  <Music size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {activePlaylistId !== 'all'
                      ? 'В этом плейлисте пока нет треков'
                      : 'В медиатеке пока нет треков'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Загрузите аудиофайлы с компьютера (MP3, WAV) или выберите треки из базы, нажав кнопку ниже.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => audioFileInputRef.current?.click()}
                    style={{ backgroundColor: accentColor }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>+ Загрузить аудио</span>
                  </button>
                  {activePlaylistId !== 'all' && (
                    <button
                      onClick={() => setShowSelectTracksModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#151c2c] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1e2638] cursor-pointer flex items-center gap-1.5"
                    >
                      <ListPlus size={13} />
                      <span>Выбрать из базы</span>
                    </button>
                  )}
                </div>
              </div>
            ) : viewMode === 'list' ? (
              /* Tracks List / Table View */
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1e2638] text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-[#111622]">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Название</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Исполнитель</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Альбом</th>
                      <th className="py-2.5 px-3 w-20 text-right">Длительность</th>
                      <th className="py-2.5 px-3 w-28 hidden xl:table-cell">Дата добавления</th>
                      <th className="py-2.5 px-3 w-28 text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2638]/50 text-xs">
                    {paginatedTracks.map((track, idx) => {
                      const isCur = currentTrack?.id === track.id;
                      const absoluteIdx = (currentPage - 1) * PER_PAGE + idx;
                      return (
                        <tr
                          key={track.id}
                          onClick={() => {
                            const originalIdx = tracks.findIndex((t) => t.id === track.id);
                            if (originalIdx !== -1) handlePlayTrack(originalIdx);
                          }}
                          style={isCur ? { borderLeftColor: accentColor } : undefined}
                          className={`group transition cursor-pointer ${
                            isCur
                              ? 'bg-slate-100 dark:bg-[#151c2c] border-l-2 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-[#151c2c]/80'
                          }`}
                        >
                          {/* Col 1: Index or Equalizer */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {isCur && isPlaying ? (
                              <div className="flex items-end justify-center gap-0.5 h-3">
                                <span className="w-0.5 h-full animate-pulse" style={{ backgroundColor: accentColor }} />
                                <span className="w-0.5 h-2/3 animate-pulse delay-75" style={{ backgroundColor: accentColor }} />
                                <span className="w-0.5 h-1/2 animate-pulse delay-150" style={{ backgroundColor: accentColor }} />
                              </div>
                            ) : (
                              <span className="group-hover:hidden">{absoluteIdx + 1}</span>
                            )}
                            {!isCur && (
                              <Play size={11} className="hidden group-hover:inline-block mx-auto text-indigo-500 dark:text-indigo-400" />
                            )}
                          </td>

                          {/* Col 2: Photo Thumbnail + Title with interactive cover changer */}
                          <td className="py-2.5 px-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCoverModalTrack(track);
                                  triggerHaptic('light');
                                }}
                                className="group/thumb relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#111622] cursor-pointer shadow-xs hover:ring-2 transition"
                                style={{ outlineColor: accentColor }}
                                title="Нажмите, чтобы изменить фото обложки"
                              >
                                {track.coverUrl || track.thumbnailUrl ? (
                                  <img
                                    src={track.coverUrl || track.thumbnailUrl}
                                    alt={track.name}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: accentColor + '20', color: accentColor }}
                                  >
                                    <Music size={18} />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                                  <Camera size={16} className="text-white drop-shadow" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="font-bold truncate"
                                  style={isCur ? { color: accentColor } : undefined}
                                >
                                  {track.name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate md:hidden">
                                  {track.artist || 'Неизвестен'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Col 3: Artist */}
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate hidden md:table-cell">
                            {track.artist || '—'}
                          </td>

                          {/* Col 4: Album */}
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate hidden lg:table-cell">
                            {track.album || '—'}
                          </td>

                          {/* Col 5: Duration */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                            {track.duration || '03:45'}
                          </td>

                          {/* Col 6: Date */}
                          <td className="py-2.5 px-3 text-slate-500 hidden xl:table-cell font-mono text-[11px]">
                            {track.createdAt || '2025-09-12'}
                          </td>

                          {/* Col 7: Actions */}
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Favorite Heart */}
                              <button
                                onClick={(e) => toggleFavorite(track.id, e)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  track.isFavorite
                                    ? 'text-rose-500 bg-rose-500/10'
                                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#151c2c]'
                                }`}
                                title={track.isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                              >
                                <Heart size={13} fill={track.isFavorite ? 'currentColor' : 'none'} />
                              </button>

                              {/* Change Cover Photo Button (Visible and distinct) */}
                              <button
                                onClick={() => {
                                  setCoverModalTrack(track);
                                  triggerHaptic('light');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
                                title="Сменить обложку трека"
                              >
                                <Camera size={13} />
                              </button>

                              {/* Add to Playlist button (Visible and distinct) */}
                              <button
                                onClick={() => {
                                  setTrackPlaylistModalTrack(track);
                                  triggerHaptic('light');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
                                title="Управление плейлистами трека"
                              >
                                <FolderPlus size={13} />
                              </button>

                              {/* Add to queue */}
                              <button
                                onClick={(e) => handleAddToQueue(track.id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
                                title="Добавить в очередь"
                              >
                                <ListPlus size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={(e) => handleDeleteTrack(track.id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Удалить трек"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedTracks.map((track) => {
                  const isCur = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        const originalIdx = tracks.findIndex((t) => t.id === track.id);
                        if (originalIdx !== -1) handlePlayTrack(originalIdx);
                      }}
                      style={isCur ? { borderColor: accentColor } : undefined}
                      className={`group bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-500/50 p-3 rounded-2xl transition cursor-pointer relative flex flex-col justify-between shadow-xs ${
                        isCur ? 'ring-2' : ''
                      }`}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638]">
                        {track.coverUrl || track.thumbnailUrl ? (
                          <img
                            src={track.coverUrl || track.thumbnailUrl}
                            alt={track.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: accentColor + '20', color: accentColor }}
                          >
                            <Music size={28} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const originalIdx = tracks.findIndex((t) => t.id === track.id);
                              if (originalIdx !== -1) handlePlayTrack(originalIdx);
                            }}
                            style={{ backgroundColor: accentColor }}
                            className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition cursor-pointer"
                          >
                            <Play size={16} className="ml-0.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCoverModalTrack(track);
                            }}
                            className="w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow transition cursor-pointer"
                            title="Сменить обложку"
                          >
                            <Camera size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackPlaylistModalTrack(track);
                            }}
                            className="w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow transition cursor-pointer"
                            title="В плейлист..."
                          >
                            <FolderPlus size={13} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4
                          className="text-xs font-bold truncate"
                          style={isCur ? { color: accentColor } : undefined}
                        >
                          {track.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {track.artist || track.album || 'NoteSphere'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3 px-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  Треки {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filteredTracks.length)} из {filteredTracks.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ← Пред
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={currentPage === pageNum ? { backgroundColor: accentColor } : {}}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === pageNum
                            ? 'text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#111622]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    След →
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Row: «Недавно добавленные» (Real dynamic tracks from tracks state) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Недавно добавленные</h3>
                <span className="text-[10px] text-slate-500 font-mono">{recentAudioTracks.length} треков</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {recentAudioTracks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const foundIdx = tracks.findIndex((t) => t.id === item.id);
                      if (foundIdx !== -1) {
                        handlePlayTrack(foundIdx);
                      } else if (tracks.length > 0) {
                        handlePlayTrack(0);
                      }
                      showHud(`Воспроизведение: ${item.name}`);
                    }}
                    className="group bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-indigo-500/50 p-2 rounded-xl transition cursor-pointer shadow-xs flex flex-col justify-between"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e2638] bg-slate-100 dark:bg-[#111622]">
                      {item.coverUrl || item.thumbnailUrl ? (
                        <img
                          src={item.coverUrl || item.thumbnailUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: accentColor + '20', color: accentColor }}
                        >
                          <Music size={20} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center shadow"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Play size={13} className="ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.artist || 'Аудио'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= COLUMN 3: RIGHT PANEL (Сейчас играет, Очередь, Быстрые действия) ================= */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4">
            {/* Card 1: «Сейчас играет» */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: accentColor + '20',
                    color: accentColor,
                    borderColor: accentColor + '40',
                  }}
                >
                  {currentTrack?.genre || 'Аудио'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      if (currentTrack) toggleFavorite(currentTrack.id, e);
                    }}
                    className={`p-1 rounded cursor-pointer transition ${
                      currentTrack?.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Избранное"
                  >
                    <Heart size={14} fill={currentTrack?.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => {
                      if (currentTrack) {
                        setCoverModalTrack(currentTrack);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                    title="Сменить обложку"
                  >
                    <Camera size={14} />
                  </button>
                </div>
              </div>

              {/* Large Cover Photo */}
              <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2638] shadow-md bg-slate-100 dark:bg-[#111622] group">
                {currentTrack?.coverUrl || currentTrack?.thumbnailUrl ? (
                  <img
                    src={currentTrack.coverUrl || currentTrack.thumbnailUrl}
                    alt={currentTrack.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2"
                    style={{ backgroundColor: accentColor + '15', color: accentColor }}
                  >
                    <Music size={40} className={isPlaying ? 'animate-pulse' : ''} />
                    <span className="text-xs font-mono font-medium">NoteSphere Audio</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (currentTrack) {
                      setCoverModalTrack(currentTrack);
                      triggerHaptic('light');
                    }
                  }}
                  className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-xs text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg backdrop-blur-md border border-white/20 active:scale-95"
                  title="Сменить фото обложки"
                >
                  <Camera size={13} />
                  <span>Фото</span>
                </button>
              </div>

              {/* Track Name & Artist */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {currentTrack ? currentTrack.name : 'Трек не выбран'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentTrack?.artist || currentTrack?.album || 'Выберите трек из списка'}
                </p>
              </div>

              {/* Scrubber Timeline */}
              <div className="space-y-1">
                <div
                  className="h-1.5 w-full bg-slate-100 dark:bg-[#1e2638] rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all"
                  onClick={(e) => {
                    if (globalAudioRef.current && duration > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      globalAudioRef.current.currentTime = pct * duration;
                      setCurrentTime(pct * duration);
                    }
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || 210)}</span>
                </div>
              </div>

              {/* Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
              <div className="flex items-center justify-between pt-1">
                {/* Shuffle */}
                <button
                  onClick={() => {
                    setIsShuffle(!isShuffle);
                    showHud(!isShuffle ? 'Случайный порядок включен' : 'Случайный порядок выключен');
                    triggerHaptic('light');
                  }}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isShuffle
                      ? 'border font-bold'
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151c2c]'
                  }`}
                  style={isShuffle ? { color: accentColor, backgroundColor: accentColor + '20', borderColor: accentColor + '40' } : undefined}
                  title={isShuffle ? 'Случайный порядок: ВКЛ' : 'Случайный порядок: ВЫКЛ'}
                >
                  <Shuffle size={15} />
                </button>

                {/* Prev */}
                <button
                  onClick={() => handlesSkip('prev')}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
                  title="Предыдущий [P]"
                >
                  <SkipBack size={16} />
                </button>

                {/* Play/Pause (Circular Colored Button) */}
                <button
                  onClick={() => {
                    if (currentTrackIndex < 0 && tracks.length > 0) {
                      setCurrentTrackIndex(0);
                    }
                    if (!isPlaying && activeVideoUrl) {
                      setActiveVideoUrl(null);
                    }
                    setIsPlaying(!isPlaying);
                    triggerHaptic('medium');
                  }}
                  style={{ backgroundColor: accentColor }}
                  className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer hover:brightness-110"
                  title={isPlaying ? 'Пауза [Space]' : 'Воспроизведение [Space]'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                {/* Next */}
                <button
                  onClick={() => handlesSkip('next')}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151c2c] transition cursor-pointer"
                  title="Следующий [N]"
                >
                  <SkipForward size={16} />
                </button>

                {/* Repeat (3-state loop cycle) */}
                <button
                  onClick={handleToggleRepeat}
                  className={`p-2 rounded-xl relative transition cursor-pointer ${
                    repeatMode !== 'off'
                      ? 'border font-bold'
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151c2c]'
                  }`}
                  style={repeatMode !== 'off' ? { color: accentColor, backgroundColor: accentColor + '20', borderColor: accentColor + '40' } : undefined}
                  title={
                    repeatMode === 'off'
                      ? 'Повтор: ВЫКЛ'
                      : repeatMode === 'all'
                      ? 'Повтор: ВСЕХ ТРЕКОВ'
                      : 'Повтор: ОДИН ТРЕК (ЗАЦИКЛИВАНИЕ)'
                  }
                >
                  {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
                  {repeatMode === 'one' && (
                    <span
                      className="absolute -top-1 -right-1 text-[8px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono font-bold shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      1
                    </span>
                  )}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-[#1e2638]">
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    triggerHaptic('light');
                  }}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title={isMuted ? 'Включить звук [M]' : 'Выключить звук [M]'}
                >
                  {isMuted ? <VolumeX size={15} className="text-rose-500" /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  style={{ accentColor: accentColor }}
                  className="w-full h-1 bg-slate-200 dark:bg-[#1e2638] rounded-full cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Card 2: «Очередь» - 100% Real data, No fake mock numbers! */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Очередь</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#151c2c] text-slate-600 dark:text-slate-400 font-medium">
                  {mediaQueue.length > 0 ? `${mediaQueue.length} ${mediaQueue.length === 1 ? 'трек' : 'треков'}` : 'Пусто'}
                </span>
              </div>

              {mediaQueue.length === 0 ? (
                <div className="py-4 text-center text-slate-400 dark:text-slate-500 space-y-1">
                  <ListPlus size={20} className="mx-auto opacity-40" />
                  <p className="text-xs font-medium">Очередь воспроизведения пуста</p>
                  <p className="text-[10px] text-slate-400">Нажмите + у любого трека, чтобы добавить его сюда</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {mediaQueue.map((trackId, i) => {
                    const trk = tracks.find((t) => t.id === trackId);
                    if (!trk) return null;
                    return (
                      <div
                        key={`${trk.id}-${i}`}
                        onClick={() => {
                          const idx = tracks.findIndex((t) => t.id === trk.id);
                          if (idx !== -1) handlePlayTrack(idx);
                        }}
                        className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151c2c] transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] shrink-0">
                            {trk.coverUrl || trk.thumbnailUrl ? (
                              <img src={trk.coverUrl || trk.thumbnailUrl} alt={trk.name} className="w-full h-full object-cover" />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: accentColor + '20', color: accentColor }}
                              >
                                <Music size={12} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight">{trk.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{trk.artist || trk.album || 'NoteSphere'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-slate-500">{trk.duration || '03:45'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromQueue(i);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Удалить из очереди"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mediaQueue.length > 0 && (
                <button
                  onClick={() => {
                    setMediaQueue([]);
                    showHud('Очередь очищена');
                    triggerHaptic('light');
                  }}
                  className="w-full py-1 text-center text-[10px] text-rose-500 hover:underline font-medium transition cursor-pointer"
                >
                  Очистить очередь
                </button>
              )}
            </div>

            {/* Card 3: «Быстрые действия» (2x2 Grid) */}
            <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Быстрые действия</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowNewPlaylistModal(true);
                    triggerHaptic('light');
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-left text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Music size={13} style={{ color: accentColor }} />
                  <span className="truncate">Создать плейлист</span>
                </button>

                <button
                  onClick={() => {
                    audioFileInputRef.current?.click();
                    triggerHaptic('light');
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-left text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CloudUpload size={13} className="text-cyan-500" />
                  <span className="truncate">+ Загрузить аудио</span>
                </button>

                <button
                  onClick={() => {
                    if (currentTrack?.url) {
                      const a = document.createElement('a');
                      a.href = currentTrack.url;
                      a.download = `${currentTrack.name || 'track'}.mp3`;
                      a.click();
                      showHud(`Скачивание трека: ${currentTrack.name}`);
                    } else {
                      showHud('Ссылка на файл недоступна для скачивания');
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-left text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={13} className="text-emerald-500" />
                  <span className="truncate">Скачать трек</span>
                </button>

                <button
                  onClick={() => {
                    setShowFoldersModal(true);
                    triggerHaptic('light');
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-left text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Settings size={13} className="text-amber-500" />
                  <span className="truncate">Настройки медиа</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : selectedCategory === 'video' ? (
        /* ================= VIDEO SECTION WITH PLAYLISTS ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ================= COLUMN 1: VIDEO PLAYLISTS (Left ~240px) ================= */}
          <div className="lg:col-span-3 xl:col-span-3 bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Плейлисты видео
              </span>
              <button
                onClick={() => {
                  setShowNewPlaylistModal(true);
                  triggerHaptic('light');
                }}
                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#151c2c] dark:hover:bg-[#1e2638] border border-slate-200 dark:border-[#1e2638] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                title="Создать видео-плейлист"
              >
                <Plus size={11} />
              </button>
            </div>

            <div className="space-y-1">
              {DEFAULT_VIDEO_PLAYLISTS.map((pl) => {
                const isActive = activeVideoPlaylistId === pl.id;
                const count = getVideoPlaylistCount(pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActiveVideoPlaylistId(pl.id);
                      triggerHaptic('light');
                    }}
                    style={isActive ? { borderLeftColor: accentColor } : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 dark:bg-[#1e2638] text-slate-900 dark:text-white font-bold border-l-2'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#151c2c]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-sm">{pl.icon}</span>
                      <span className="truncate">{pl.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1.5">{count}</span>
                  </button>
                );
              })}

              {/* User Custom Video Playlists */}
              {localPlaylists
                .filter((p) => p.type === 'video')
                .map((pl) => {
                  const isActive = activeVideoPlaylistId === pl.id;
                  const count = getVideoPlaylistCount(pl.id);
                  return (
                    <div key={pl.id} className="group/pl flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActiveVideoPlaylistId(pl.id);
                          triggerHaptic('light');
                        }}
                        style={isActive ? { borderLeftColor: accentColor } : undefined}
                        className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer min-w-0 ${
                          isActive
                            ? 'bg-slate-100 dark:bg-[#1e2638] text-slate-900 dark:text-white font-bold border-l-2'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#151c2c]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate min-w-0">
                          <span className="text-sm">{pl.icon || '🎬'}</span>
                          <span className="truncate">{pl.name}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1.5">
                          {count}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(pl.id);
                        }}
                        className="opacity-0 group-hover/pl:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Удалить плейлист"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ================= COLUMN 2: VIDEO CONTENT (Center & Right) ================= */}
          <div className="lg:col-span-9 xl:col-span-9 space-y-4">
            {activeVideoUrl && (
              <div className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <VideoIcon size={14} className="text-cyan-400" />
                    Видеопроигрыватель
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCinemaMode(!isCinemaMode)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#151c2c] border border-slate-200 dark:border-[#1e2638] text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {isCinemaMode ? 'Обычный вид' : 'Кинотеатр'}
                    </button>
                    <button
                      onClick={() => setActiveVideoUrl(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  <video
                    src={activeVideoUrl}
                    controls
                    autoPlay
                    onPlay={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                        globalAudioRef.current?.pause();
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {filteredTracks.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] space-y-3 shadow-xs">
                <div
                  className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-xs text-cyan-400 bg-cyan-500/10"
                >
                  <VideoIcon size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    В этом видео-плейлисте пока нет видео
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Загрузите MP4/WebM видеофайлы прямо с компьютера.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => universalFileInputRef.current?.click()}
                    style={{ backgroundColor: accentColor }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>+ Загрузить видео</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                        globalAudioRef.current?.pause();
                      }
                      setActiveVideoUrl(track.url);
                    }}
                    className="bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-cyan-500/50 rounded-2xl p-3 space-y-2 cursor-pointer transition shadow-sm group"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-[#111622] flex items-center justify-center">
                      <VideoIcon size={32} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow">
                          <Play size={16} className="ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{track.name}</h4>
                        <p className="text-[10px] text-slate-400">{track.size}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrack(track.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Удалить видео"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ================= IMAGES / GALLERY SECTION ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tracks.filter((t) => t.type === 'image').map((track) => (
              <div
                key={track.id}
                onClick={() => setLightboxTrack(track)}
                className="group bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1e2638] hover:border-emerald-500/50 rounded-2xl p-2 cursor-pointer transition shadow-sm space-y-1.5"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-[#111622] relative">
                  <img src={track.url} alt={track.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <ZoomIn size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate px-1">{track.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL DIALOGS (MODULAR COMPONENTS) ================= */}
      <CoverArtModal
        track={coverModalTrack}
        accentColor={accentColor}
        galleryImages={tracks.filter((t) => t.type === 'image')}
        onClose={() => setCoverModalTrack(null)}
        onSaveCover={handleSaveCoverImage}
      />

      <AddTrackModal
        isOpen={showAddTrackModal}
        accentColor={accentColor}
        localPlaylists={localPlaylists}
        onClose={() => setShowAddTrackModal(false)}
        onAddTrack={(newTrk) => {
          setTracks((prev) => [newTrk, ...prev]);
          saveTrackToDB({
            id: newTrk.id,
            name: newTrk.name,
            size: newTrk.size,
            type: newTrk.type,
            artist: newTrk.artist,
            album: newTrk.album,
            coverUrl: newTrk.coverUrl,
            duration: newTrk.duration,
            file: newTrk.file,
            playlistIds: newTrk.playlistIds,
            playlistId: newTrk.playlistId,
          }).catch(console.error);
          showHud(`Трек «${newTrk.name}» добавлен!`);
          triggerHaptic('success');
        }}
      />

      <TrackPlaylistModal
        track={trackPlaylistModalTrack}
        accentColor={accentColor}
        localPlaylists={localPlaylists}
        onClose={() => setTrackPlaylistModalTrack(null)}
        onTogglePlaylist={toggleTrackPlaylist}
        onCreateNewPlaylist={() => {
          setTrackPlaylistModalTrack(null);
          setShowNewPlaylistModal(true);
        }}
      />

      <SelectTracksModal
        isOpen={showSelectTracksModal}
        activePlaylistId={activePlaylistId}
        activePlaylistName={
          DEFAULT_PLAYLISTS.find((p) => p.id === activePlaylistId)?.name ||
          localPlaylists.find((p) => p.id === activePlaylistId)?.name ||
          'Плейлист'
        }
        tracks={tracks}
        accentColor={accentColor}
        onClose={() => setShowSelectTracksModal(false)}
        onToggleTrack={toggleTrackPlaylist}
      />

      <NewPlaylistModal
        isOpen={showNewPlaylistModal}
        accentColor={accentColor}
        defaultType={selectedCategory === 'video' ? 'video' : 'audio'}
        onClose={() => setShowNewPlaylistModal(false)}
        onCreatePlaylist={(newPl) => {
          setLocalPlaylists((prev) => [...prev, newPl]);
          if (newPl.type === 'video') {
            setActiveVideoPlaylistId(newPl.id);
          } else {
            setActivePlaylistId(newPl.id);
          }
          showHud(`Плейлист «${newPl.name}» создан!`);
          triggerHaptic('success');
        }}
      />

      <MediaFoldersModal
        isOpen={showFoldersModal}
        accentColor={accentColor}
        onClose={() => setShowFoldersModal(false)}
        onPickFolder={() => folderPickerInputRef.current?.click()}
      />

      <MediaLightboxModal
        track={lightboxTrack}
        onClose={() => setLightboxTrack(null)}
      />
    </div>
  );
}
