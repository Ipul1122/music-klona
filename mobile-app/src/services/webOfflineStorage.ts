/**
 * Web Offline Audio Storage menggunakan IndexedDB (Khusus Mode Browser Web)
 * Menyimpan biner file audio (Blob .m4a) langsung di penyimpanan lokal peramban.
 * Memungkinkan pemutaran lagu 100% offline saat WiFi & koneksi data dimatikan.
 */

const DB_NAME = 'musik_klona_offline_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB tidak didukung oleh browser ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });
}

export const webOfflineStorage = {
  /**
   * Menyimpan file audio biner (Blob) ke IndexedDB
   */
  async saveBlob(trackId: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, trackId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Gagal menyimpan file biner ke IndexedDB'));
    });
  },

  /**
   * Mengambil file audio biner (Blob) dari IndexedDB untuk diputar secara offline
   */
  async getBlob(trackId: string): Promise<Blob | null> {
    if (!isIndexedDBAvailable()) return null;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(trackId);

        req.onsuccess = () => {
          resolve((req.result as Blob) || null);
        };
        req.onerror = () => {
          reject(req.error || new Error('Gagal membaca file biner dari IndexedDB'));
        };
      });
    } catch {
      return null;
    }
  },

  /**
   * Menghapus file audio biner dari IndexedDB
   */
  async deleteBlob(trackId: string): Promise<void> {
    if (!isIndexedDBAvailable()) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(trackId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Gagal menghapus file dari IndexedDB'));
      });
    } catch {
      // ignore
    }
  },

  /**
   * Cek apakah lagu tersimpan secara offline di IndexedDB
   */
  async hasBlob(trackId: string): Promise<boolean> {
    const blob = await this.getBlob(trackId);
    return blob !== null;
  }
};

