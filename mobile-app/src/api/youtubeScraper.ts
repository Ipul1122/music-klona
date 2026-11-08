import { Track } from '../types';
import { DEFAULT_LICENSE_SERVER_URL } from './licenseApi';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * On-Device YouTube InnerTube Scraper (100% TypeScript Murni)
 * Sesuai aturan CLAUDE.md:
 * - DILARANG menggunakan Python / yt-dlp / ffmpeg.
 * - Ekstraksi pencarian dan URL audio YouTube dilakukan On-Device (Client-Side).
 * - Menyamar sebagai klien ANDROID / IOS resmi YouTube untuk direct audio .m4a (itag 140) tanpa cipher.
 * - Pada perangkat mobile native (Android/iOS), fetch langsung ke YouTube tanpa CORS.
 * - Pada preview Web Browser (localhost:8082), jika preflight CORS browser memblokir POST langsung,
 *   otomatis fallback ke dev endpoint metadata lokal.
 */

const DEV_SERVER_URL = DEFAULT_LICENSE_SERVER_URL;

// Format durasi string (e.g. "3:45" or "1:15:20" or "4.57") ke detik integer
export function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const cleaned = durationStr.replace('.', ':');
  const parts = cleaned.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  } else if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return parseInt(durationStr, 10) || 0;
}

export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Pencarian lagu on-device via InnerTube API (dengan fallback browser dev CORS)
 */
export async function searchYouTubeTracks(query: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Jika di browser Web, coba langsung atau fallback ke dev search endpoint jika terhalang CORS
  if (isWeb) {
    try {
      const devRes = await fetch(`${DEV_SERVER_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
      if (devRes.ok) {
        const devData = await devRes.json();
        if (Array.isArray(devData.tracks) && devData.tracks.length > 0) {
          return devData.tracks;
        }
      }
    } catch {
      // jika server lokal dev belum start, lanjutkan coba direct fetch
    }
  }

  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240501.00.00',
            hl: 'id',
            gl: 'ID'
          }
        },
        query: trimmed
      })
    });

    if (!response.ok) {
      throw new Error(`InnerTube Search HTTP ${response.status}`);
    }

    const data = await response.json();
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents || !Array.isArray(contents)) {
      return [];
    }

    const tracks: Track[] = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents;
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const video = item?.videoRenderer;
        if (!video || !video.videoId) continue;

        const id = video.videoId;
        const title = video.title?.runs?.map((r: any) => r.text).join('') || video.title?.simpleText || 'Unknown Title';
        const artist = video.ownerText?.runs?.[0]?.text || video.longBylineText?.runs?.[0]?.text || 'Unknown Artist';
        const duration = video.lengthText?.simpleText || '3:30';
        const durationSec = parseDurationToSeconds(duration);

        // Thumbnail resolusi terbaik
        const thumbs = video.thumbnail?.thumbnails || [];
        const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        tracks.push({
          id,
          title,
          artist,
          duration,
          durationSec,
          thumbnail,
          isDownloaded: false
        });
      }
    }

    return tracks;
  } catch (error) {
    console.error('[YOUTUBE_SCRAPER] Search Error:', error);
    throw error;
  }
}

/**
 * Ekstraksi direct audio stream URL (.m4a / itag 140) langsung di perangkat
 */
export async function extractDirectAudioUrl(videoId: string): Promise<string> {
  // Jika di browser Web, coba dev extract endpoint jika browser terhalang CORS
  if (isWeb) {
    try {
      const devRes = await fetch(`${DEV_SERVER_URL}/api/extract-stream?videoId=${encodeURIComponent(videoId)}`);
      if (devRes.ok) {
        const devData = await devRes.json();
        if (devData.audioUrl) {
          return devData.audioUrl;
        }
      }
    } catch {
      // lanjutkan coba direct
    }
  }

  // Client 1: YouTube iOS Official Client (Direct Googlevideo CDN streams on itag 140)
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': '*',
        'X-Youtube-Client-Version': '20.11.6',
        'X-Youtube-Client-Name': '5',
        'User-Agent': 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)',
        'Origin': 'https://www.youtube.com'
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            hl: 'id',
            gl: 'ID',
            clientName: 'iOS',
            clientVersion: '20.11.6',
            deviceMake: 'Apple',
            deviceModel: 'iPhone10,4',
            osName: 'iOS',
            osVersion: '16.7.7.20H330',
            platform: 'MOBILE'
          }
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const adaptiveFormats = data.streamingData?.adaptiveFormats || [];
      const regularFormats = data.streamingData?.formats || [];
      const allFormats = [...adaptiveFormats, ...regularFormats];

      // Prioritas 1: itag 140 (audio/mp4 m4a AAC 128kbps)
      const itag140 = allFormats.find((f: any) => f.itag === 140 && f.url);
      if (itag140?.url) {
        return itag140.url;
      }

      // Prioritas 2: Format audio direct lainnya
      const otherAudio = allFormats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);
      if (otherAudio?.url) {
        return otherAudio.url;
      }
    }
  } catch (err) {
    console.warn('[YOUTUBE_SCRAPER] iOS client player gagal, mencoba fallback Android:', err);
  }

  // Client 2: Fallback Android Music Client
  try {
    const androidRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '21',
        'X-Youtube-Client-Version': '6.42.52',
        'User-Agent': 'com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11)'
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            hl: 'id',
            gl: 'ID',
            clientName: 'ANDROID_MUSIC',
            clientVersion: '6.42.52',
            androidSdkVersion: 30
          }
        }
      })
    });

    if (androidRes.ok) {
      const data = await androidRes.json();
      const formats = data.streamingData?.adaptiveFormats || [];
      const audio = formats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);
      if (audio?.url) {
        return audio.url;
      }
    }
  } catch (err) {
    console.warn('[YOUTUBE_SCRAPER] Android client player gagal:', err);
  }

  throw new Error(`Tidak dapat mengekstrak direct stream audio untuk videoId: ${videoId}`);
}
