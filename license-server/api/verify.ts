import type { Request, Response } from 'express';
import { getLicense, saveLicense } from '../src/db';
import { signLicenseJwt } from '../src/utils';
import { sendTelegramAlert } from '../src/telegram';
import { VerifyRequestBody, VerifyResponse } from '../src/types';

export default async function handler(req: Request, res: Response) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Metode HTTP tidak diizinkan. Gunakan POST.',
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { licenseKey, deviceId, deviceName }: VerifyRequestBody = req.body || {};

    if (!licenseKey || typeof licenseKey !== 'string' || !licenseKey.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kode lisensi (licenseKey) wajib diisi.',
        error: 'INVALID_LICENSE_KEY'
      });
    }

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID Perangkat (deviceId) unik hardware wajib disertakan.',
        error: 'INVALID_DEVICE_ID'
      });
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    const cleanDeviceId = deviceId.trim();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const license = await getLicense(cleanKey);

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Kode lisensi tidak ditemukan di sistem. Pastikan kode benar atau hubungi admin.',
        error: 'LICENSE_NOT_FOUND'
      });
    }

    if (license.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Lisensi ini tidak aktif (status: ${license.status}). Hubungi admin untuk aktivasi kembali.`,
        error: 'LICENSE_INACTIVE'
      });
    }

    // Cek apakah perangkat sudah terdaftar sebelumnya
    const existingIndex = license.devices.findIndex(d => d.deviceId === cleanDeviceId);

    if (existingIndex !== -1) {
      // Perangkat sah & sudah terdaftar
      license.devices[existingIndex].lastIp = clientIp;
      if (deviceName) {
        license.devices[existingIndex].deviceName = deviceName;
      }
      await saveLicense(license);

      const token = signLicenseJwt(cleanKey, cleanDeviceId, deviceName);
      const responseBody: VerifyResponse = {
        success: true,
        message: 'Verifikasi berhasil. Perangkat Anda telah terdaftar sebelumnya.',
        token,
        license: {
          key: license.licenseKey,
          maxDevices: license.maxDevices,
          registeredDevices: license.devices.length,
          status: license.status
        }
      };
      return res.status(200).json(responseBody);
    }

    // Jika perangkat baru, periksa batas kuota perangkat (Maksimal 2 Perangkat)
    if (license.devices.length >= license.maxDevices) {
      // BATAS TERCAPAI (Perangkat ke-3 atau lebih mencoba login)
      // Jalankan Kriteria Keberhasilan PRD: Kirim peringatan ke Telegram Developer
      await sendTelegramAlert({
        licenseKey: cleanKey,
        attemptedDeviceId: cleanDeviceId,
        attemptedDeviceName: deviceName,
        registeredDevices: license.devices.map(d => `${d.deviceId} (${d.deviceName || 'No Name'})`),
        clientIp,
        reason: `Mencoba aktivasi pada perangkat baru melampaui kuota maksimum (${license.devices.length}/${license.maxDevices})`
      });

      const responseBody: VerifyResponse = {
        success: false,
        message: `Batas kuota perangkat (${license.maxDevices} HP) telah tercapai untuk lisensi ini. Akses pada perangkat baru ditolak secara permanen. Hubungi admin jika ingin reset perangkat.`,
        error: 'DEVICE_LIMIT_EXCEEDED',
        license: {
          key: license.licenseKey,
          maxDevices: license.maxDevices,
          registeredDevices: license.devices.length,
          status: license.status
        }
      };
      return res.status(403).json(responseBody);
    }

    // Daftarkan perangkat baru (Perangkat ke-1 atau ke-2)
    license.devices.push({
      deviceId: cleanDeviceId,
      deviceName: deviceName || 'Smartphone',
      registeredAt: new Date().toISOString(),
      lastIp: clientIp
    });

    await saveLicense(license);

    const token = signLicenseJwt(cleanKey, cleanDeviceId, deviceName);
    const responseBody: VerifyResponse = {
      success: true,
      message: `Aktivasi berhasil! Perangkat ke-${license.devices.length} dari ${license.maxDevices} terdaftar.`,
      token,
      license: {
        key: license.licenseKey,
        maxDevices: license.maxDevices,
        registeredDevices: license.devices.length,
        status: license.status
      }
    };

    return res.status(200).json(responseBody);
  } catch (error: any) {
    console.error('[VERIFY_ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal pada server lisensi.',
      error: error?.message || 'INTERNAL_SERVER_ERROR'
    });
  }
}

