import { Platform } from 'react-native';
import { Paths, Directory, File, DownloadTask, DownloadProgress } from 'expo-file-system';
import { Track } from '../types';
import { extractDirectAudioUrl } from '../api/youtubeScraper';
import { DEFAULT_LICENSE_SERVER_URL } from '../api/licenseApi';
import { storageService } from './storageService';
import { webOfflineStorage } from './webOfflineStorage';

// Active download tasks registry
const activeDownloadTasks = new Map<string, DownloadTask>();
const activeWebAbortControllers = new Map<string, AbortController>();

export const downloadManager = {
  /**
   * Mendapatkan direktori tracks di dalam dokumen aplikasi
   */
  getTracksDirectory(): Directory | null {
    if (Platform.OS === 'web') return null;
    const tracksDir = new Directory(Paths.document, 'tracks');
    if (!tracksDir.exists) {
      tracksDir.create({ idempotent: true });
    }
    return tracksDir;
  },

  /**
   * Mengunduh file fisik .m4a ke FileSystem Lokal HP atau IndexedDB (Web)
   * Menyediakan callback progress 0% - 100%
   */
  async downloadTrack(
    track: Track,
    onProgress?: (percent: number) => void
  ): Promise<Track> {
    // Mode Browser Web: Unduh binary biner audio secara riil ke IndexedDB
    if (Platform.OS === 'web') {
      const abortController = new AbortController();
      activeWebAbortControllers.set(track.id, abortController);

      try {
        let completeBlob: Blob;

        if (track.remoteAudioUrl) {
          // Unduh langsung dari URL direct audio (.m4a)
          onProgress?.(30);
          const dlRes = await fetch(track.remoteAudioUrl, { signal: abortController.signal });
          onProgress?.(70);
          const blobData = await dlRes.blob();
          completeBlob = new Blob([blobData], { type: 'audio/mp4' });
          onProgress?.(90);
        } else {
          const streamBase = `${DEFAULT_LICENSE_SERVER_URL.replace(/\/+$/, '')}/api/stream?videoId=${encodeURIComponent(track.id)}`;
          
          // 1. Dapatkan perkiraan total length melalui HEAD request
          let totalLength = 4000000;
          try {
            const headRes = await fetch(streamBase, {
              method: 'HEAD',
              signal: abortController.signal
            });
            const clen = headRes.headers.get('content-length');
            if (clen) {
              totalLength = parseInt(clen, 10);
            }
          } catch {
            // Gunakan fallback size jika HEAD tidak tersedia
          }

          const CHUNK_SIZE = 524288; // 512 KB per chunk untuk kestabilan download bebas 403
          const chunks: BlobPart[] = [];
          let downloaded = 0;

          for (let start = 0; start < totalLength; start += CHUNK_SIZE) {
            if (abortController.signal.aborted) {
              throw new Error('Unduhan dibatalkan');
            }

            const end = Math.min(start + CHUNK_SIZE - 1, totalLength - 1);
            const chunkRes = await fetch(streamBase, {
              headers: { 'Range': `bytes=${start}-${end}` },
              signal: abortController.signal
            });

            if (!chunkRes.ok && chunkRes.status !== 206) {
              throw new Error(`Gagal mengunduh bagian audio (HTTP ${chunkRes.status})`);
            }

            const arrayBuf = await chunkRes.arrayBuffer();
            chunks.push(arrayBuf);
            downloaded += arrayBuf.byteLength;

            const percent = Math.min(100, Math.round((downloaded / totalLength) * 100));
            onProgress?.(percent);
          }

          // 2. Susun biner lengkap ke Blob .m4a dan simpan ke IndexedDB
          completeBlob = new Blob(chunks, { type: 'audio/mp4' });
        }

        await webOfflineStorage.saveBlob(track.id, completeBlob);

        // 3. Trigger download file fisik .m4a ke browser (folder Download laptop/HP user)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          try {
            const blobUrl = URL.createObjectURL(completeBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const safeTitle = (track.title || 'audio')
              .replace(/[/\\?%*:|"<>]/g, '_')
              .trim();
            a.download = `${safeTitle}.m4a`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          } catch (dlErr) {
            console.warn('[DOWNLOAD_MANAGER] Gagal trigger direct browser download:', dlErr);
          }
        }

        const completedWeb: Track = {
          ...track,
          localUri: `indexeddb://${track.id}`,
          isDownloaded: true,
          downloadProgress: 100,
          downloadStatus: 'completed',
          downloadedAt: new Date().toISOString()
        };

        await storageService.saveOfflineTrack(completedWeb);
        onProgress?.(100);
        activeWebAbortControllers.delete(track.id);
        return completedWeb;
      } catch (err: any) {
        activeWebAbortControllers.delete(track.id);
        console.error('[DOWNLOAD_MGR_WEB] Error saat unduh biner:', err);
        throw err;
      }
    }

    const tracksDir = this.getTracksDirectory()!;
    const targetFile = new File(tracksDir, `${track.id}.m4a`);

    // Cek apakah file fisik sudah ada sebelumnya di HP
    if (targetFile.exists) {
      const updatedTrack: Track = {
        ...track,
        localUri: targetFile.uri,
        isDownloaded: true,
        downloadProgress: 100,
        downloadStatus: 'completed',
        downloadedAt: new Date().toISOString()
      };
      await storageService.saveOfflineTrack(updatedTrack);
      onProgress?.(100);
      return updatedTrack;
    }

    // 1. Ekstraksi Direct Stream Audio URL (.m4a itag 140) On-Device
    const audioUrl = await extractDirectAudioUrl(track.id);

    // 2. Buat task unduhan dengan listener progress
    const downloadTask = File.createDownloadTask(audioUrl, targetFile);

    const subscription = downloadTask.addListener('progress', (progress: DownloadProgress) => {
      if (progress.totalBytes > 0) {
        const percent = Math.min(100, Math.round((progress.bytesWritten / progress.totalBytes) * 100));
        onProgress?.(percent);
      }
    });

    activeDownloadTasks.set(track.id, downloadTask);

    try {
      const downloadedFile = await downloadTask.downloadAsync();
      subscription.remove();
      activeDownloadTasks.delete(track.id);

      if (!downloadedFile || !downloadedFile.uri) {
        throw new Error('Gagal mengunduh audio: hasil uri kosong');
      }

      // 3. Simpan metadata lagu dan path lokal file:/// ke database HP
      const completedTrack: Track = {
        ...track,
        localUri: downloadedFile.uri,
        isDownloaded: true,
        downloadProgress: 100,
        downloadStatus: 'completed',
        downloadedAt: new Date().toISOString()
      };

      await storageService.saveOfflineTrack(completedTrack);
      onProgress?.(100);

      return completedTrack;
    } catch (error) {
      subscription.remove();
      activeDownloadTasks.delete(track.id);
      // Bersihkan file parsial jika gagal
      try {
        if (targetFile.exists) {
          targetFile.delete();
        }
      } catch {}
      throw error;
    }
  },

  /**
   * Menghapus file fisik audio dari HP atau IndexedDB untuk menghemat memori
   */
  async deleteDownloadedTrack(trackId: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await webOfflineStorage.deleteBlob(trackId);
      } else {
        const tracksDir = this.getTracksDirectory();
        if (tracksDir) {
          const targetFile = new File(tracksDir, `${trackId}.m4a`);
          if (targetFile.exists) {
            targetFile.delete();
          }
        }
      }
    } catch (e) {
      console.warn('[DOWNLOAD_MGR] Gagal menghapus file fisik:', e);
    }
    // Hapus dari database metadata
    await storageService.removeOfflineTrack(trackId);
  },

  /**
   * Batalkan unduhan yang sedang berjalan
   */
  cancelDownload(trackId: string): void {
    if (Platform.OS === 'web') {
      const controller = activeWebAbortControllers.get(trackId);
      if (controller) {
        controller.abort();
        activeWebAbortControllers.delete(trackId);
      }
      return;
    }

    const task = activeDownloadTasks.get(trackId);
    if (task) {
      try {
        task.cancel();
      } catch {}
      activeDownloadTasks.delete(trackId);
    }
  }
};
