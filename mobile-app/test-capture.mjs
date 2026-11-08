import { Innertube, Platform } from 'youtubei.js';

const orig = Platform.shim.fetch;
Platform.shim.fetch = async (req, opts) => {
  const url = String(req?.url || req);
  if (url.includes('/player?')) {
    console.log('=== CAPTURED /player CALL ===');
    console.log('URL:', url);
    const headers = opts?.headers || req?.headers;
    console.log('HEADERS:', headers);
    const body = opts?.body || (req?.clone ? await req.clone().text() : req?.body);
    console.log('BODY:', body);
  }
  return orig(req, opts);
};

const yt = await Innertube.create();
console.log('Innertube created');
const res = await yt.actions.execute('/player', { videoId: '4tAg2H7tqD0', client: 'IOS' });
console.log('Result status:', res.data.playabilityStatus?.status);
const formats = res.data.streamingData?.adaptiveFormats || [];
const itag140 = formats.find(f => f.itag === 140);
console.log('Found itag 140 URL?:', !!itag140?.url);

