export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const videoId = req.body?.videoId || req.query?.videoId;
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ error: 'videoId parameter is required' });
    }

    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json', {
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

    if (!response.ok) {
      return res.status(response.status).json({ error: `YouTube returned status ${response.status}` });
    }

    const data: any = await response.json();
    const adaptiveFormats = data.streamingData?.adaptiveFormats || [];
    const regularFormats = data.streamingData?.formats || [];
    const allFormats = [...adaptiveFormats, ...regularFormats];

    const itag140 = allFormats.find((f: any) => f.itag === 140 && f.url);
    if (itag140?.url) {
      return res.json({ success: true, audioUrl: itag140.url });
    }

    const anyAudio = allFormats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);
    if (anyAudio?.url) {
      return res.json({ success: true, audioUrl: anyAudio.url });
    }

    return res.status(404).json({ error: 'Direct audio stream format not found' });
  } catch (err: any) {
    console.error('[EXTRACT_STREAM_ERROR]:', err);
    return res.status(500).json({ error: err?.message || 'Internal Player Error' });
  }
}

