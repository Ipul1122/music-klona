import AsyncStorage from '@react-native-async-storage/async-storage';
import { LicenseData, Track } from '../types';

const STORAGE_KEYS = {
  LICENSE: '@musik_klona_license_v1',
  OFFLINE_TRACKS: '@musik_klona_offline_tracks_v1',
  DEVICE_ID: '@musik_klona_device_id_v1',
  RECENT_SEARCHES: '@musik_klona_recent_searches_v1',
  SERVER_URL: '@musik_klona_server_url_v1'
};

export const storageService = {
  /**
   * Mengambil data lisensi yang tersimpan di HP
   */
  async getLicenseData(): Promise<LicenseData | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.LICENSE);
      if (!json) return null;
      return JSON.parse(json) as LicenseData;
    } catch (e) {
      console.error('[STORAGE] Gagal membaca data lisensi:', e);
      return null;
    }
  },

  /**
   * Menyimpan data lisensi (JWT & status aktivasi)
   */
  async saveLicenseData(data: LicenseData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(data));
    } catch (e) {
      console.error('[STORAGE] Gagal menyimpan data lisensi:', e);
      throw e;
    }
  },

  /**
   * Menghapus lisensi (misal logout)
   */
  async clearLicenseData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LICENSE);
    } catch (e) {
      console.error('[STORAGE] Gagal menghapus lisensi:', e);
    }
  },

  /**
   * Mengambil daftar lagu offline dari database lokal
   */
  async getOfflineTracks(): Promise<Track[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_TRACKS);
      if (!json) return [];
      const tracks: Track[] = JSON.parse(json);
      return Array.isArray(tracks) ? tracks : [];
    } catch (e) {
      console.error('[STORAGE] Gagal membaca lagu offline:', e);
      return [];
    }
  },

  /**
   * Menyimpan atau memperbarui 1 lagu offline
   */
  async saveOfflineTrack(track: Track): Promise<void> {
    try {
      const current = await this.getOfflineTracks();
      const existingIdx = current.findIndex(t => t.id === track.id);
      if (existingIdx !== -1) {
        current[existingIdx] = track;
      } else {
        current.unshift(track);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_TRACKS, JSON.stringify(current));
    } catch (e) {
      console.error('[STORAGE] Gagal menyimpan lagu offline:', e);
      throw e;
    }
  },

  /**
   * Menghapus lagu dari database offline
   */
  async removeOfflineTrack(trackId: string): Promise<void> {
    try {
      const current = await this.getOfflineTracks();
      const filtered = current.filter(t => t.id !== trackId);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_TRACKS, JSON.stringify(filtered));
    } catch (e) {
      console.error('[STORAGE] Gagal menghapus lagu offline:', e);
      throw e;
    }
  },

  /**
   * Menyimpan Hardware Device ID persistent
   */
  async getStoredDeviceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    } catch {
      return null;
    }
  },

  async setStoredDeviceId(deviceId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    } catch {
      // ignore
    }
  },

  /**
   * Mengambil riwayat pencarian terbaru (Recent Searches)
   */
  async getRecentSearches(): Promise<string[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (!json) return ['Cari Lagu'];
      return JSON.parse(json) as string[];
    } catch {
      return ['Cari Lagu'];
    }
  },

  /**
   * Menyimpan pencarian baru ke riwayat recent searches (maks 10 query terbaru)
   */
  async saveRecentSearch(query: string): Promise<string[]> {
    try {
      const clean = query.trim();
      if (!clean) return await this.getRecentSearches();
      const current = await this.getRecentSearches();
      const updated = [clean, ...current.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  /**
   * Mengambil URL server lisensi yang disimpan pengguna
   */
  async getServerUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
    } catch {
      return null;
    }
  },

  /**
   * Menyimpan URL server lisensi custom
   */
  async saveServerUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, url.trim());
    } catch {
      // ignore
    }
  },

  /**
   * Menghapus seluruh riwayat pencarian
   */
  async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    } catch (e) {
      console.error('[STORAGE] Gagal menghapus riwayat pencarian:', e);
    }
  }
};

