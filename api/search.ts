export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const query = req.body?.query || req.query?.q;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

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
        query: query.trim()
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `YouTube returned status ${response.status}` });
    }

    const data: any = await response.json();
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents || !Array.isArray(contents)) {
      return res.json({ tracks: [] });
    }

    const tracks: any[] = [];
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

        const parts = duration.replace('.', ':').split(':').map((p: string) => parseInt(p, 10));
        let durationSec = 0;
        if (parts.length === 2) durationSec = (parts[0] || 0) * 60 + (parts[1] || 0);
        else if (parts.length === 3) durationSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);

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

    return res.json({ tracks });
  } catch (err: any) {
    console.error('[SEARCH_API_ERROR]:', err);
    return res.status(500).json({ error: err?.message || 'Internal Search Error' });
  }
}

