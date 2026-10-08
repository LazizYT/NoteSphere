// IndexedDB + LocalStorage hybrid storage utility for preserving local music, video and photo tracks.
// Designed with 100% local resilience and zero external dependencies.

export interface StorageTrack {
  id: string;
  name: string;
  size: string;
  type: 'audio' | 'video' | 'image';
  file?: File | Blob;
  url?: string;
  album?: string;
  artist?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  genre?: string;
  duration?: string;
  createdAt?: string;
  isFavorite?: boolean;
  playlistId?: string;
  playlistIds?: string[];
}

const DB_NAME = 'SpherePlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const LOCAL_STORAGE_KEY = 'ns_media_tracks_meta';

// Helper to update localStorage metadata cache
function syncToLocalStorage(tracks: StorageTrack[]) {
  try {
    const metaList = tracks.map(({ file, ...meta }) => meta);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metaList));
  } catch (e) {
    console.warn('[mediaDB] Could not sync metadata to localStorage:', e);
  }
}

export function loadMetaFromLocalStorage(): StorageTrack[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function saveTrackToDB(track: StorageTrack): Promise<void> {
  // Update localStorage metadata cache first
  const currentMeta = loadMetaFromLocalStorage();
  const existingIdx = currentMeta.findIndex((t) => t.id === track.id);
  const { file: _, ...metaOnly } = track;
  if (existingIdx !== -1) {
    currentMeta[existingIdx] = { ...currentMeta[existingIdx], ...metaOnly };
  } else {
    currentMeta.unshift(metaOnly as StorageTrack);
  }
  syncToLocalStorage(currentMeta);

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getReq = store.get(track.id);
      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        const merged: StorageTrack = {
          ...existing,
          ...track,
          file: track.file || existing.file,
          url: track.url || existing.url,
          coverUrl: track.coverUrl !== undefined ? track.coverUrl : existing.coverUrl,
        };
        const putReq = store.put(merged);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => {
        const putReq = store.put(track);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
    });
  } catch (err) {
    console.warn('[mediaDB] IndexedDB unavailable, saved metadata to localStorage:', err);
  }
}

export async function loadTracksFromDB(): Promise<StorageTrack[]> {
  try {
    const db = await getDB();
    const idbTracks: StorageTrack[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (idbTracks && idbTracks.length > 0) {
      // Merge with localStorage metadata
      const localMeta = loadMetaFromLocalStorage();
      const metaMap = new Map(localMeta.map((m) => [m.id, m]));
      const merged = idbTracks.map((t) => ({ ...t, ...(metaMap.get(t.id) || {}) }));
      syncToLocalStorage(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[mediaDB] IndexedDB error, falling back to localStorage cache:', err);
  }

  // Fallback to localStorage metadata if IndexedDB returned nothing or failed
  return loadMetaFromLocalStorage();
}

export async function deleteTrackFromDB(id: string): Promise<void> {
  const currentMeta = loadMetaFromLocalStorage().filter((t) => t.id !== id);
  syncToLocalStorage(currentMeta);

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[mediaDB] IndexedDB delete error:', err);
  }
}

export async function clearAllTracksFromDB(): Promise<void> {
  syncToLocalStorage([]);
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[mediaDB] IndexedDB clear error:', err);
  }
}

