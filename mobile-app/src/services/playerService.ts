import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Track } from '../types';
import { extractDirectAudioUrl } from '../api/youtubeScraper';
import { DEFAULT_LICENSE_SERVER_URL } from '../api/licenseApi';
import { webOfflineStorage } from './webOfflineStorage';

export interface PlayerCallbackEvents {
  onStatusUpdate?: (status: {
    isPlaying: boolean;
    positionSec: number;
    durationSec: number;
    isBuffering: boolean;
    didJustFinish?: boolean;
  }) => void;
  onTrackChange?: (track: Track) => void;
  onError?: (errorMessage: string) => void;
}

class PlayerService {
  private sound: Audio.Sound | null = null;
  private webAudio: any = null; // HTML5 Audio instance for Web browser preview
  private currentBlobUrl: string | null = null; // Object URL for offline Blob audio
  private currentTrack: Track | null = null;
  private queue: Track[] = [];
  private queueIndex: number = 0;
  private isConfigured: boolean = false;
  private callbacks: PlayerCallbackEvents = {};

  /**
   * Konfigurasi audio native untuk Background Play & Lockscreen
   */
  async setupAudioMode(): Promise<void> {
    if (this.isConfigured || Platform.OS === 'web') return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // KUNCI: Musik tidak mati saat layar dikunci / background
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      this.isConfigured = true;
    } catch (e) {
      console.warn('[PLAYER_SERVICE] Gagal setup audio mode background:', e);
    }
  }

  setCallbacks(callbacks: PlayerCallbackEvents): void {
    this.callbacks = callbacks;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  getQueue(): Track[] {
    return this.queue;
  }

  /**
   * Putar satu track lagu (Bisa dari File Lokal Offline atau Stream Online)
   */
  async playTrack(track: Track, newQueue?: Track[]): Promise<void> {
    await this.setupAudioMode();

    if (newQueue) {
      this.queue = newQueue;
      this.queueIndex = newQueue.findIndex(t => t.id === track.id);
      if (this.queueIndex === -1) {
        this.queue.unshift(track);
        this.queueIndex = 0;
      }
    }

    // Stop pemutar sebelumnya
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }
    if (this.webAudio) {
      try {
        this.webAudio.pause();
        this.webAudio.src = '';
      } catch {}
      this.webAudio = null;
    }
    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {}
      this.currentBlobUrl = null;
    }

    this.currentTrack = track;
    this.callbacks.onTrackChange?.(track);

    try {
      // 1. Tentukan sumber audio:
      let sourceUri = track.localUri;

      // Pada Web Browser: Jika lagu offline, putar dari biner IndexedDB (0 internet/network call)
      if (Platform.OS === 'web') {
        let playUrl: string | null = null;

        if (track.isDownloaded || track.localUri?.startsWith('indexeddb://')) {
          const offlineBlob = await webOfflineStorage.getBlob(track.id);
          if (offlineBlob) {
            playUrl = URL.createObjectURL(offlineBlob);
            this.currentBlobUrl = playUrl;
            console.log('[PLAYER_SERVICE] Memutar lagu dari IndexedDB Offline Cache (100% Offline):', track.title);
          }
        }

        // Jika lagu online (belum diunduh), gunakan direct stream URL atau streaming server
        if (!playUrl) {
          if (track.remoteAudioUrl) {
            playUrl = track.remoteAudioUrl;
          } else {
            try {
              playUrl = await extractDirectAudioUrl(track.id);
            } catch {
              playUrl = `${DEFAULT_LICENSE_SERVER_URL.replace(/\/+$/, '')}/api/stream?videoId=${encodeURIComponent(track.id)}`;
            }
          }
        }

        sourceUri = playUrl;

        if (typeof window !== 'undefined' && typeof (window as any).Audio !== 'undefined') {
          const audio = new (window as any).Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          audio.src = sourceUri;
          this.webAudio = audio;

          audio.ontimeupdate = () => {
            this.callbacks.onStatusUpdate?.({
              isPlaying: !audio.paused,
              positionSec: Math.floor(audio.currentTime || 0),
              durationSec: Math.floor(audio.duration || this.currentTrack?.durationSec || 0),
              isBuffering: false
            });
          };

          audio.onwaiting = () => {
            this.callbacks.onStatusUpdate?.({
              isPlaying: !audio.paused,
              positionSec: Math.floor(audio.currentTime || 0),
              durationSec: Math.floor(audio.duration || this.currentTrack?.durationSec || 0),
              isBuffering: true
            });
          };

          audio.onplaying = () => {
            this.callbacks.onStatusUpdate?.({
              isPlaying: true,
              positionSec: Math.floor(audio.currentTime || 0),
              durationSec: Math.floor(audio.duration || this.currentTrack?.durationSec || 0),
              isBuffering: false
            });
          };

          audio.onended = () => {
            this.callbacks.onStatusUpdate?.({
              isPlaying: false,
              positionSec: Math.floor(audio.duration || 0),
              durationSec: Math.floor(audio.duration || 0),
              isBuffering: false,
              didJustFinish: true
            });
            this.skipNext();
          };

          audio.onerror = (e: any) => {
            const mediaErr = audio.error;
            const isNetworkOffline = typeof navigator !== 'undefined' && (navigator as any).onLine === false;
            if (isNetworkOffline && !this.currentBlobUrl) {
              const msg = 'Lagu ini belum terunduh secara offline ke memori browser. Silakan unduh ulang lagu saat terhubung ke internet.';
              console.warn('[WEB_AUDIO_OFFLINE_WARN]', msg);
              this.callbacks.onError?.(msg);
              return;
            }
            const errDetail = mediaErr ? `[MediaError ${mediaErr.code}]: ${mediaErr.message || 'Format / Source error'}` : 'Unknown audio error';
            console.error('[WEB_AUDIO_ERROR]', errDetail, e);
            this.callbacks.onError?.('Gagal memutar audio: ' + errDetail);
          };

          try {
            await audio.play();
          } catch (playErr: any) {
            console.warn('[WEB_AUDIO_AUTOPLAY_WARN] Browser menahan autoplay:', playErr?.message);
            // Tetap berikan update status paused agar UI user dapat menekan tombol play manual
            this.callbacks.onStatusUpdate?.({
              isPlaying: false,
              positionSec: 0,
              durationSec: this.currentTrack?.durationSec || 0,
              isBuffering: false
            });
          }
          return;
        }
      }

      // 2. Pada HP Fisik Native (Android & iOS)
      if (!sourceUri) {
        // Jika belum diunduh, streaming direct audio dari URL YouTube CDN On-Device
        sourceUri = await extractDirectAudioUrl(track.id);
      }

      const audioSource: any = { uri: sourceUri };
      if (sourceUri.startsWith('https://')) {
        audioSource.headers = {
          'User-Agent': 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)'
        };
      }

      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
    } catch (err: any) {
      console.error('[PLAYER_SERVICE] Error saat memutar lagu:', err);
      this.callbacks.onError?.(err?.message || 'Gagal memutar audio');
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        this.callbacks.onError?.(status.error);
      }
      return;
    }

    const positionSec = Math.floor(status.positionMillis / 1000);
    const durationSec = Math.floor((status.durationMillis || 0) / 1000);

    this.callbacks.onStatusUpdate?.({
      isPlaying: status.isPlaying,
      positionSec,
      durationSec: durationSec > 0 ? durationSec : (this.currentTrack?.durationSec || 0),
      isBuffering: status.isBuffering,
      didJustFinish: status.didJustFinish
    });

    // Otomatis putar lagu berikutnya saat selesai
    if (status.didJustFinish) {
      this.skipNext();
    }
  };

  async togglePlayPause(): Promise<void> {
    if (Platform.OS === 'web' && this.webAudio) {
      if (this.webAudio.paused) {
        await this.webAudio.play();
      } else {
        this.webAudio.pause();
      }
      return;
    }

    if (!this.sound) return;
    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await this.sound.pauseAsync();
        } else {
          await this.sound.playAsync();
        }
      }
    } catch (e) {
      console.error('[PLAYER_SERVICE] Gagal toggle play/pause:', e);
    }
  }

  async pause(): Promise<void> {
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.pause();
      return;
    }
    if (!this.sound) return;
    try {
      await this.sound.pauseAsync();
    } catch {}
  }

  async resume(): Promise<void> {
    if (Platform.OS === 'web' && this.webAudio) {
      await this.webAudio.play();
      return;
    }
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
    } catch {}
  }

  async seekTo(seconds: number): Promise<void> {
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.currentTime = seconds;
      return;
    }
    if (!this.sound) return;
    try {
      await this.sound.setPositionAsync(seconds * 1000);
    } catch (e) {
      console.error('[PLAYER_SERVICE] Gagal seek:', e);
    }
  }

  async skipNext(): Promise<void> {
    if (this.queue.length === 0) return;
    const nextIdx = (this.queueIndex + 1) % this.queue.length;
    this.queueIndex = nextIdx;
    const nextTrack = this.queue[nextIdx];
    if (nextTrack) {
      await this.playTrack(nextTrack);
    }
  }

  async skipPrevious(): Promise<void> {
    if (this.queue.length === 0) return;
    const prevIdx = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
    this.queueIndex = prevIdx;
    const prevTrack = this.queue[prevIdx];
    if (prevTrack) {
      await this.playTrack(prevTrack);
    }
  }

  /**
   * Putar semua lagu dalam daftar (Play All di Koleksi Offline)
   */
  async playAll(tracks: Track[]): Promise<void> {
    if (!tracks || tracks.length === 0) return;
    await this.playTrack(tracks[0], tracks);
  }
}

export const playerService = new PlayerService();
