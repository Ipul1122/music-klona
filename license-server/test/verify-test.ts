import app from '../src/server';
import http from 'http';

async function runTests() {
  console.log('--- MEMULAI PENGUJIAN SERVER LISENSI ---');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));
  const baseUrl = 'http://127.0.0.1:3099';

  let testKey = '';

  try {
    // TEST 1: Buat Lisensi Baru via Admin Generate
    console.log('\n[TEST 1] Admin Generate Lisensi Baru:');
    const genRes = await fetch(`${baseUrl}/api/admin-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminSecret: 'musik-klona-admin-master-key-2026',
        buyerName: 'Ahmad User',
        buyerPhone: '081299998888',
        maxDevices: 2
      })
    });
    const genData = await genRes.json();
    console.log('Status:', genRes.status, 'Response:', genData);
    if (genRes.status !== 201 || !genData.generatedKeys?.[0]?.licenseKey) {
      throw new Error('Test 1 Gagal: Tidak bisa generate lisensi');
    }
    testKey = genData.generatedKeys[0].licenseKey;
    console.log('✅ TEST 1 LULUS! Kunci didapat:', testKey);

    // TEST 2: Perangkat 1 Aktivasi Lisensi
    console.log('\n[TEST 2] Aktivasi Perangkat Pertama (HP Xiaomi):');
    const dev1Res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: testKey,
        deviceId: 'hardware-id-xiaomi-13t-pro',
        deviceName: 'Xiaomi 13T Pro'
      })
    });
    const dev1Data = await dev1Res.json();
    console.log('Status:', dev1Res.status, 'Data:', dev1Data);
    if (dev1Res.status !== 200 || !dev1Data.token || dev1Data.license?.registeredDevices !== 1) {
      throw new Error('Test 2 Gagal: Perangkat 1 gagal verifikasi');
    }
    console.log('✅ TEST 2 LULUS! Perangkat 1 terdaftar (1/2)');

    // TEST 3: Perangkat 1 Login Kembali (Idempotent)
    console.log('\n[TEST 3] Perangkat Pertama Login Kembali:');
    const dev1RepeatRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: testKey,
        deviceId: 'hardware-id-xiaomi-13t-pro',
        deviceName: 'Xiaomi 13T Pro'
      })
    });
    const dev1RepeatData = await dev1RepeatRes.json();
    if (dev1RepeatRes.status !== 200 || dev1RepeatData.license?.registeredDevices !== 1) {
      throw new Error('Test 3 Gagal: Perangkat 1 duplikasi kuota');
    }
    console.log('✅ TEST 3 LULUS! Perangkat 1 login ulang tanpa menambah kuota');

    // TEST 4: Perangkat 2 Aktivasi Lisensi (Batas Maksimum 2)
    console.log('\n[TEST 4] Aktivasi Perangkat Kedua (Samsung S23):');
    const dev2Res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: testKey,
        deviceId: 'hardware-id-samsung-s23-ultra',
        deviceName: 'Samsung S23 Ultra'
      })
    });
    const dev2Data = await dev2Res.json();
    console.log('Status:', dev2Res.status, 'Data:', dev2Data);
    if (dev2Res.status !== 200 || dev2Data.license?.registeredDevices !== 2) {
      throw new Error('Test 4 Gagal: Perangkat 2 gagal aktivasi');
    }
    console.log('✅ TEST 4 LULUS! Perangkat 2 terdaftar (2/2 Kuota Penuh)');

    // TEST 5: Perangkat 3 Mencoba Aktivasi (WAJIB DITOLAK SESUAI PRD)
    console.log('\n[TEST 5] Perangkat Ketiga Mencoba Login (iPhone 15 - Pelanggaran Anti-Sharing):');
    const dev3Res = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: testKey,
        deviceId: 'hardware-id-iphone-15-pro-max',
        deviceName: 'iPhone 15 Pro Max'
      })
    });
    const dev3Data = await dev3Res.json();
    console.log('Status:', dev3Res.status, 'Data:', dev3Data);
    if (dev3Res.status !== 403 || dev3Data.error !== 'DEVICE_LIMIT_EXCEEDED') {
      throw new Error(`Test 5 Gagal: Seharusnya ditolak 403 DEVICE_LIMIT_EXCEEDED, dapat ${dev3Res.status}`);
    }
    console.log('✅ TEST 5 LULUS! Perangkat ke-3 berhasil diblokir (403 DEVICE_LIMIT_EXCEEDED) & peringatan dikirim!');

    // TEST 6: Kunci Palsu / Invalid
    console.log('\n[TEST 6] Uji Coba Kunci Tidak Valid:');
    const fakeRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: 'PULL-FAKE-KEY9',
        deviceId: 'hardware-id-some-device'
      })
    });
    const fakeData = await fakeRes.json();
    if (fakeRes.status !== 404 || fakeData.error !== 'LICENSE_NOT_FOUND') {
      throw new Error('Test 6 Gagal: Kunci palsu tidak ditolak 404');
    }
    console.log('✅ TEST 6 LULUS! Kunci palsu berhasil ditolak 404');

    console.log('\n=============================================');
    console.log('🎉 SEMUA PENGUJIAN SERVER LISENSI LULUS 100%!');
    console.log('=============================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Pengujian gagal:', err);
  process.exit(1);
});

