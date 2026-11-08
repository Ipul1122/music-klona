export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.body?.videoId || req.query?.videoId;
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'videoId parameter is required' });
  }

  // Selalu arahkan ke audio streaming proxy resmi yang mendukung full range stream bebas CORS
  return res.status(200).json({
    success: true,
    audioUrl: `/api/stream?videoId=${encodeURIComponent(videoId.trim())}`,
    videoId: videoId.trim()
  });
}
