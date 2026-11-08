const YOUTUBE_IOS_UA = 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)';

interface VideoMetadata {
  url: string;
  totalLength: number;
  durationSec: number;
  expires: number;
}

const urlCache = new Map<string, VideoMetadata>();

async function getOrFetchStreamMetadata(videoId: string): Promise<VideoMetadata> {
  const cached = urlCache.get(videoId);
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
    throw new Error(`YouTube player API returned status ${response.status}`);
  }

  const data: any = await response.json();
  const adaptiveFormats = data.streamingData?.adaptiveFormats || [];
  const regularFormats = data.streamingData?.formats || [];
  const allFormats = [...adaptiveFormats, ...regularFormats];

  let targetFormat = allFormats.find((f: any) => f.itag === 140 && f.url);
  if (!targetFormat) {
    targetFormat = allFormats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);
  }

  // Ekstraksi fallback jika URL ada di dalam signatureCipher
  if (!targetFormat) {
    const cipherFormat = allFormats.find((f: any) => f.signatureCipher || f.cipher);
    if (cipherFormat) {
      const rawCipher = cipherFormat.signatureCipher || cipherFormat.cipher;
      const params = new URLSearchParams(rawCipher);
      const url = params.get('url');
      if (url) {
        targetFormat = { ...cipherFormat, url };
      }
    }
  }

  if (!targetFormat || !targetFormat.url) {
    throw new Error('Format audio direct tidak ditemukan untuk video ini');
  }

  const durationSec = parseInt(
    data.videoDetails?.lengthSeconds ||
      (targetFormat.approxDurationMs ? String(Math.floor(targetFormat.approxDurationMs / 1000)) : '0'),
    10
  );
  const totalLength = parseInt(targetFormat.contentLength || '3500000', 10);

  const meta: VideoMetadata = {
    url: targetFormat.url,
    totalLength,
    durationSec,
    expires: Date.now() + 2 * 60 * 60 * 1000
  };

  urlCache.set(videoId, meta);
  return meta;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query?.videoId || req.body?.videoId;
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Parameter videoId diperlukan' });
  }

  try {
    const meta = await getOrFetchStreamMetadata(videoId.trim());

    // 1. Tangani request HEAD (cek ukuran file tanpa download isi)
    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      if (meta.totalLength > 0) {
        res.setHeader('Content-Length', String(meta.totalLength));
      }
      return res.end();
    }

    // 2. Tangani request GET (Streaming audio range chunk)
    const rangeHeader = req.headers['range'];
    let rangeStart = 0;
    let rangeEnd: number | undefined;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        rangeStart = parseInt(match[1], 10);
        if (match[2]) {
          rangeEnd = parseInt(match[2], 10);
        }
      }
    }

    // Chunk streaming aman (maks 1MB per request untuk respon instan tanpa timeout)
    const chunkSize = 1048576; // 1 MB
    const actualEnd =
      rangeEnd !== undefined
        ? rangeEnd
        : meta.totalLength > 0
          ? Math.min(rangeStart + chunkSize - 1, meta.totalLength - 1)
          : rangeStart + chunkSize - 1;

    const ytHeaders: any = {
      'User-Agent': YOUTUBE_IOS_UA,
      'Range': `bytes=${rangeStart}-${actualEnd}`
    };

    const upstream = await fetch(meta.url, { headers: ytHeaders });

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    if (upstream.headers.has('content-range')) {
      res.setHeader('Content-Range', upstream.headers.get('content-range')!);
    } else if (meta.totalLength > 0) {
      res.setHeader('Content-Range', `bytes ${rangeStart}-${actualEnd}/${meta.totalLength}`);
    }

    if (upstream.headers.has('content-length')) {
      res.setHeader('Content-Length', upstream.headers.get('content-length')!);
    }

    const arrayBuf = await upstream.arrayBuffer();
    return res.end(Buffer.from(arrayBuf));
  } catch (err: any) {
    console.error('[STREAM_API_ERROR]:', err);
    return res.status(500).json({ error: err?.message || 'Gagal streaming audio' });
  }
}
