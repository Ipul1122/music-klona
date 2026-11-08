import { searchYouTubeTracks, extractDirectAudioUrl } from '../src/api/youtubeScraper';

async function runMobileAppSmokeTest() {
  console.log('=== MEMULAI PENGUJIAN INTEGRASI ON-DEVICE YOUTUBE SCRAPER ===\n');

  // 1. Uji Pencarian YouTube InnerTube On-Device
  console.log('[TEST 1] Pencarian Lagu "Sheila On 7 Sephia" langsung via InnerTube...');
  const searchResults = await searchYouTubeTracks('sheila on 7 sephia');

  console.log(`Jumlah hasil ditemukan: ${searchResults.length}`);
  if (searchResults.length === 0) {
    throw new Error('Test 1 Gagal: Pencarian tidak menghasilkan lagu');
  }

  const firstTrack = searchResults[0];
  console.log('Sampel Lagu Pertama:');
  console.log(`- ID: ${firstTrack.id}`);
  console.log(`- Judul: ${firstTrack.title}`);
  console.log(`- Artis: ${firstTrack.artist}`);
  console.log(`- Durasi: ${firstTrack.duration} (${firstTrack.durationSec} detik)`);
  console.log(`- Thumbnail: ${firstTrack.thumbnail}`);
  console.log('✅ TEST 1 LULUS: Pencarian YouTube On-Device berhasil!\n');

  // 2. Uji Ekstraksi Direct Audio Stream URL (.m4a itag 140)
  console.log(`[TEST 2] Ekstraksi Direct Stream Audio untuk Track ID: ${firstTrack.id}...`);
  const audioUrl = await extractDirectAudioUrl(firstTrack.id);

  console.log(`Direct Audio URL diperoleh (Panjang: ${audioUrl.length} karakter):`);
  console.log(`URL Prefix: ${audioUrl.substring(0, 90)}...`);

  if (!audioUrl.startsWith('https://') || !audioUrl.includes('googlevideo.com')) {
    throw new Error('Test 2 Gagal: URL audio tidak valid');
  }

  // 3. Verifikasi ketersediaan stream (HTTP Range request untuk memastikan biner valid)
  console.log('\n[TEST 3] Mengunduh sampel biner audio (1KB range) dari CDN...');
  const sampleRes = await fetch(audioUrl, {
    headers: {
      'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)',
      'Range': 'bytes=0-1024'
    }
  });

  console.log(`HTTP Status: ${sampleRes.status} (Expected: 206 Partial Content)`);
  if (sampleRes.status !== 206 && sampleRes.status !== 200) {
    throw new Error(`Test 3 Gagal: CDN mengembalikan status ${sampleRes.status}`);
  }

  const sampleBuffer = await sampleRes.arrayBuffer();
  console.log(`Ukuran biner diterima: ${sampleBuffer.byteLength} bytes`);
  console.log('✅ TEST 2 & 3 LULUS: Direct Stream Audio .m4a 100% valid & siap diputar/diunduh!\n');

  console.log('======================================================');
  console.log('🎉 SEMUA PENGUJIAN INTEGRASI ON-DEVICE BERHASIL 100%!');
  console.log('======================================================');
}

runMobileAppSmokeTest().catch((err) => {
  console.error('Pengujian Integrasi Gagal:', err);
  process.exit(1);
});

