import type { Request, Response } from 'express';

const YOUTUBE_IOS_UA = 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)';
const CHUNK_SIZE = 524288; // 512 KB per chunk untuk mencegah boundary cutoff 403

interface VideoMetadata {
  url: string;
  totalLength: number;
  durationSec: number;
  expires: number;
}

// Cache stream URLs per videoId and seek interval (cached for 2 hours)
const urlCache = new Map<string, VideoMetadata>();

async function getOrFetchStreamMetadata(videoId: string, seekSec: number): Promise<VideoMetadata> {
  const cacheKey = `${videoId}_${seekSec}`;
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  const payload: any = {
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
  };

  if (seekSec > 0) {
    payload.startTimeSecs = seekSec;
  }

  const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': '*',
      'X-Youtube-Client-Version': '20.11.6',
      'X-Youtube-Client-Name': '5',
      'User-Agent': YOUTUBE_IOS_UA,
      'Origin': 'https://www.youtube.com'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`YouTube player returned status ${response.status}`);
  }

  const data = await response.json();
  const adaptiveFormats = data.streamingData?.adaptiveFormats || [];
  const regularFormats = data.streamingData?.formats || [];
  const allFormats = [...adaptiveFormats, ...regularFormats];

  const itag140 = allFormats.find((f: any) => f.itag === 140 && f.url);
  const audioFormat = itag140 || allFormats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);

  if (!audioFormat || !audioFormat.url) {
    throw new Error('Direct audio stream format not found');
  }

  const totalLength = parseInt(audioFormat.contentLength || '5000000', 10);
  const durationSec = Math.floor(parseInt(audioFormat.approxDurationMs || '300000', 10) / 1000);

  const metadata: VideoMetadata = {
    url: audioFormat.url,
    totalLength,
    durationSec,
    expires: Date.now() + 2 * 3600 * 1000
  };

  urlCache.set(cacheKey, metadata);
  return metadata;
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = (req.query.videoId || req.body?.videoId) as string;
  if (!videoId) {
    return res.status(400).send('videoId parameter is required');
  }

  try {
    // 1. Fetch metadata awal (seek 0) untuk mengetahui ukuran file total & durasi
    const baseMeta = await getOrFetchStreamMetadata(videoId, 0);
    const totalLength = baseMeta.totalLength;
    const durationSec = baseMeta.durationSec;

    // Handle HEAD request dari browser untuk probing format & length
    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Length', String(totalLength));
      res.setHeader('Accept-Ranges', 'bytes');
      return res.end();
    }

    // 2. Parse byte range yang diminta oleh browser
    const rangeHeader = req.headers.range;
    let start = 0;
    let end = Math.min(CHUNK_SIZE - 1, totalLength - 1);

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = parseInt(match[2], 10);
        } else {
          // Open-ended range (e.g. bytes=0-): ambil 1 MB ke depan
          end = Math.min(start + CHUNK_SIZE - 1, totalLength - 1);
        }
      }
    }

    // Clamp chunk size agar tidak melebihi 1MB per request
    if (end - start + 1 > CHUNK_SIZE) {
      end = start + CHUNK_SIZE - 1;
    }
    if (end >= totalLength) {
      end = totalLength - 1;
    }
    if (start > end) {
      start = 0;
      end = Math.min(CHUNK_SIZE - 1, totalLength - 1);
    }

    // 3. Hitung seekSec untuk sliding window YouTube CDN
    const seekSec = start === 0 ? 0 : Math.floor((start / totalLength) * durationSec);
    const targetMeta = seekSec === 0 ? baseMeta : await getOrFetchStreamMetadata(videoId, seekSec);

    // 4. Request byte-range spesifik ke GoogleVideo CDN
    let ytRes = await fetch(targetMeta.url, {
      headers: {
        'User-Agent': YOUTUBE_IOS_UA,
        'Range': `bytes=${start}-${end}`
      }
    });

    // Jika upstream 403, coba persempit ukuran chunk untuk menghindari batas sliding window CDN
    if (ytRes.status === 403 && end > start + 32768) {
      end = start + Math.floor((end - start) / 2);
      ytRes = await fetch(targetMeta.url, {
        headers: {
          'User-Agent': YOUTUBE_IOS_UA,
          'Range': `bytes=${start}-${end}`
        }
      });
    }

    if (ytRes.status === 206 || ytRes.status === 200) {
      const arrayBuffer = await ytRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.status(206);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Content-Range', `bytes ${start}-${start + buffer.length - 1}/${totalLength}`);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.end(buffer);
    }

    // Jika upstream menolak (misal status 403), log detailnya
    console.error(`[STREAM_API_ERROR] Upstream GoogleVideo returned ${ytRes.status} for range bytes=${start}-${end}`);
    return res.status(ytRes.status).send(`Upstream error: ${ytRes.status}`);
  } catch (err: any) {
    console.error('[STREAM_API_ERROR]:', err);
    return res.status(500).send(err?.message || 'Error streaming audio');
  }
}
