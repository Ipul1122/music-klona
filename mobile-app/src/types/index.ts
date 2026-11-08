export interface Track {
  id: string; // YouTube videoId
  title: string;
  artist: string;
  duration: string; // e.g. "4:15"
  durationSec: number;
  thumbnail: string;
  localUri?: string; // e.g. file:///.../tracks/{id}.m4a
  isDownloaded: boolean;
  downloadProgress?: number; // 0 - 100
  downloadStatus?: 'idle' | 'downloading' | 'completed' | 'failed';
  downloadedAt?: string;
}

export interface LicenseData {
  isActivated: boolean;
  licenseKey?: string;
  token?: string;
  deviceId?: string;
  deviceName?: string;
  maxDevices?: number;
  registeredDevices?: number;
  activatedAt?: string;
}

export interface LicenseVerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  error?: string;
  license?: {
    key: string;
    maxDevices: number;
    registeredDevices: number;
    status: string;
  };
}

export type AppTab = 'search' | 'library';

export interface PlayerStatus {
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  isBuffering: boolean;
  currentTrack: Track | null;
}

