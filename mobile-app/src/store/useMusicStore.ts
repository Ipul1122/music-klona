import { create } from 'zustand';
import { AppTab, LicenseData, Track } from '../types';
import { storageService } from '../services/storageService';
import { downloadManager } from '../services/downloadManager';
import { playerService } from '../services/playerService';
import { searchYouTubeTracks } from '../api/youtubeScraper';
import { verifyLicenseWithServer } from '../api/licenseApi';

interface MusicStoreState {
  // Lisensi
  license: LicenseData;
  isVerifyingLicense: boolean;
  licenseError: string | null;

  // Navigasi & Koneksi
  activeTab: AppTab;
  isOnline: boolean;

  // Pencarian
  searchQuery: string;
  searchResults: Track[];
  isSearching: boolean;
  searchError: string | null;

  // Koleksi Offline
  offlineTracks: Track[];
  isLoadingOffline: boolean;

  // Unduhan
  activeDownloads: Record<string, number>; // id -> progress 0..100

  // Pemutar Musik
  currentTrack: Track | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  isBuffering: boolean;
  isPlayerModalOpen: boolean;

  // Actions
  initApp: () => Promise<void>;
  setActiveTab: (tab: AppTab) => void;
  setIsOnline: (online: boolean) => void;
  setSearchQuery: (query: string) => void;
  searchTracks: (query: string) => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  deleteOfflineTrack: (trackId: string) => Promise<void>;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  playAllOffline: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seekTo: (sec: number) => Promise<void>;
  setPlayerModalOpen: (open: boolean) => void;
  activateLicense: (key: string, serverUrl?: string) => Promise<{ success: boolean; message: string; error?: string }>;
  logoutLicense: () => Promise<void>;
}

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  // Lisensi Awal
  license: { isActivated: false },
  isVerifyingLicense: false,
  licenseError: null,

  // UI
  activeTab: 'search',
  isOnline: true,

  // Search
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchError: null,

  // Offline
  offlineTracks: [],
  isLoadingOffline: true,

  // Download
  activeDownloads: {},

  // Player
  currentTrack: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  isBuffering: false,
  isPlayerModalOpen: false,

  initApp: async () => {
    // 1. Hubungkan event callback dari player service
    playerService.setCallbacks({
      onStatusUpdate: (status) => {
        set({
          isPlaying: status.isPlaying,
          positionSec: status.positionSec,
          durationSec: status.durationSec,
          isBuffering: status.isBuffering
        });
      },
      onTrackChange: (track) => {
        set({ currentTrack: track });
      },
      onError: (msg) => {
        console.warn('[STORE] Player Error:', msg);
      }
    });

    // 2. Muat data lisensi yang tersimpan di HP (Bisa jalan Offline)
    const storedLicense = await storageService.getLicenseData();
    if (storedLicense && storedLicense.isActivated) {
      set({ license: storedLicense });
    }

    // 3. Muat daftar lagu offline dari database lokal
    const tracks = await storageService.getOfflineTracks();
    set({ offlineTracks: tracks, isLoadingOffline: false });
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setIsOnline: (isOnline) => set({ isOnline }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  searchTracks: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false, searchError: null });
      return;
    }

    set({ isSearching: true, searchError: null });
    try {
      const results = await searchYouTubeTracks(query);
      const offline = get().offlineTracks;

      // Sinkronkan status offline pada hasil pencarian
      const synced = results.map(track => {
        const found = offline.find(o => o.id === track.id);
        if (found) {
          return { ...track, isDownloaded: true, localUri: found.localUri };
        }
        return track;
      });

      set({ searchResults: synced, isSearching: false });
    } catch (err: any) {
      set({
        isSearching: false,
        searchError: err?.message || 'Gagal mencari lagu. Periksa koneksi internet.'
      });
    }
  },

  downloadTrack: async (track: Track) => {
    const { activeDownloads } = get();
    if (activeDownloads[track.id] !== undefined) return; // sedang proses

    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [track.id]: 0 }
    }));

    try {
      const completed = await downloadManager.downloadTrack(track, (percent) => {
        set((state) => ({
          activeDownloads: { ...state.activeDownloads, [track.id]: percent }
        }));
      });

      // Update daftar offline secara real-time (tanpa refresh manual)
      const currentOffline = get().offlineTracks;
      const updatedOffline = [completed, ...currentOffline.filter(t => t.id !== completed.id)];

      // Sinkronkan hasil pencarian jika sedang tampil
      const updatedSearchResults = get().searchResults.map(t =>
        t.id === completed.id ? { ...t, isDownloaded: true, localUri: completed.localUri } : t
      );

      // Bersihkan dari active downloads
      const newDownloads = { ...get().activeDownloads };
      delete newDownloads[track.id];

      set({
        offlineTracks: updatedOffline,
        searchResults: updatedSearchResults,
        activeDownloads: newDownloads
      });
    } catch (err: any) {
      console.error('[STORE] Download error:', err);
      const newDownloads = { ...get().activeDownloads };
      delete newDownloads[track.id];
      set({ activeDownloads: newDownloads });
      alert(`Gagal mengunduh lagu: ${err?.message || 'Terjadi kesalahan'}`);
    }
  },

  deleteOfflineTrack: async (trackId: string) => {
    await downloadManager.deleteDownloadedTrack(trackId);
    const updated = get().offlineTracks.filter(t => t.id !== trackId);

    // Sinkronkan dengan hasil pencarian jika ada
    const updatedSearch = get().searchResults.map(t =>
      t.id === trackId ? { ...t, isDownloaded: false, localUri: undefined } : t
    );

    set({ offlineTracks: updated, searchResults: updatedSearch });
  },

  playTrack: async (track: Track, queue?: Track[]) => {
    // Jika tidak ada queue eksplisit, buat queue dari daftar yang sedang aktif
    const activeQueue = queue || (get().activeTab === 'library' ? get().offlineTracks : get().searchResults);
    await playerService.playTrack(track, activeQueue);
  },

  playAllOffline: async () => {
    const tracks = get().offlineTracks;
    if (tracks.length === 0) return;
    await playerService.playAll(tracks);
  },

  togglePlayPause: async () => {
    await playerService.togglePlayPause();
  },

  skipNext: async () => {
    await playerService.skipNext();
  },

  skipPrevious: async () => {
    await playerService.skipPrevious();
  },

  seekTo: async (sec: number) => {
    await playerService.seekTo(sec);
  },

  setPlayerModalOpen: (isPlayerModalOpen) => set({ isPlayerModalOpen }),

  activateLicense: async (licenseKey: string, serverUrl?: string) => {
    set({ isVerifyingLicense: true, licenseError: null });

    const result = await verifyLicenseWithServer(licenseKey, serverUrl);

    if (result.success && result.token) {
      const licenseData: LicenseData = {
        isActivated: true,
        licenseKey: result.license?.key || licenseKey.trim().toUpperCase(),
        token: result.token,
        maxDevices: result.license?.maxDevices || 2,
        registeredDevices: result.license?.registeredDevices || 1,
        activatedAt: new Date().toISOString()
      };

      await storageService.saveLicenseData(licenseData);
      set({
        license: licenseData,
        isVerifyingLicense: false,
        licenseError: null
      });

      return { success: true, message: result.message };
    } else {
      set({
        isVerifyingLicense: false,
        licenseError: result.message
      });
      return { success: false, message: result.message, error: result.error };
    }
  },

  logoutLicense: async () => {
    await storageService.clearLicenseData();
    set({ license: { isActivated: false } });
  }
}));

