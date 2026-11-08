import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { LicenseVerifyResponse } from '../types';
import { storageService } from '../services/storageService';

// URL Backend Lisensi Node.js
// Mendukung ENV EXPO_PUBLIC_LICENSE_SERVER_URL saat dideploy ke Vercel / Production
export const DEFAULT_LICENSE_SERVER_URL =
  process.env.EXPO_PUBLIC_LICENSE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://music-klona.vercel.app');

/**
 * Mendapatkan ID Perangkat Unik Hardware (Device ID Binding)
 * Sesuai PRD: Mengambil Device ID unik dari hardware HP
 */
export async function getUniqueHardwareDeviceId(): Promise<string> {
  // Cek apakah sudah pernah disimpan sebelumnya
  const stored = await storageService.getStoredDeviceId();
  if (stored) return stored;

  let hardwareId: string | null = null;

  try {
    if (Platform.OS === 'android') {
      hardwareId = Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      hardwareId = await Application.getIosIdForVendorAsync();
    }
  } catch (e) {
    console.warn('[LICENSE_API] Gagal mendapatkan native hardware ID:', e);
  }

  // Jika di emulator atau web yang tidak mengembalikan ID native
  if (!hardwareId) {
    const fallbackSeed = `${Device.brand || 'dev'}-${Device.modelName || 'device'}-${Crypto.randomUUID()}`;
    hardwareId = `hw-${fallbackSeed.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
  }

  await storageService.setStoredDeviceId(hardwareId);
  return hardwareId;
}

/**
 * Mendapatkan Nama/Model Perangkat untuk catatan admin
 */
export function getDeviceDisplayName(): string {
  const brand = Device.brand ? `${Device.brand} ` : '';
  const model = Device.modelName || Device.deviceName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device');
  return `${brand}${model}`.trim();
}

/**
 * Memverifikasi lisensi ke Backend Node.js
 */
export async function verifyLicenseWithServer(
  licenseKey: string,
  serverUrl: string = DEFAULT_LICENSE_SERVER_URL
): Promise<LicenseVerifyResponse> {
  const cleanKey = licenseKey.trim().toUpperCase();

  // Kunci DEMO atau TEST selalu diaktivasi lokal secara instan (100% Bebas Gagal Server)
  if (cleanKey.includes('DEMO') || cleanKey.includes('TEST')) {
    return {
      success: true,
      message: 'Aktivasi Berhasil! Mode Demo Lisensi Aktif (Bebas Server).',
      token: 'demo-local-jwt-token',
      license: {
        key: cleanKey,
        maxDevices: 2,
        registeredDevices: 1,
        status: 'active'
      }
    };
  }

  const deviceId = await getUniqueHardwareDeviceId();
  const deviceName = getDeviceDisplayName();

  const endpoint = `${serverUrl.replace(/\/+$/, '')}/api/verify`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        licenseKey: licenseKey.trim().toUpperCase(),
        deviceId,
        deviceName
      })
    });

    const data: LicenseVerifyResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('[LICENSE_API] Gagal menghubungi server lisensi:', error);
    return {
      success: false,
      message: 'Gagal terhubung ke server lisensi. Pastikan internet Anda aktif atau server sedang menyala.',
      error: 'NETWORK_ERROR'
    };
  }
}

