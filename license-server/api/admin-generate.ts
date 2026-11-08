import type { Request, Response } from 'express';
import { getLicense, saveLicense } from '../src/db';
import { generateLicenseKey } from '../src/utils';
import { AdminGenerateRequestBody, AdminGenerateResponse, LicenseRecord } from '../src/types';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'musik-klona-admin-master-key-2026';

export default async function handler(req: Request, res: Response) {
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
    const body: AdminGenerateRequestBody = req.body || {};
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const secretProvided = body.adminSecret || bearerSecret;

    if (!secretProvided || secretProvided !== ADMIN_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Kunci rahasia admin (adminSecret) salah atau tidak disertakan.',
        error: 'UNAUTHORIZED'
      });
    }

    const count = Math.min(Math.max(Number(body.count) || 1, 1), 50);
    const maxDevices = Number(body.maxDevices) || 2;
    const generatedKeys: LicenseRecord[] = [];

    for (let i = 0; i < count; i++) {
      let key = generateLicenseKey();
      // Pastikan unik
      while (await getLicense(key)) {
        key = generateLicenseKey();
      }

      const newRecord: LicenseRecord = {
        licenseKey: key,
        maxDevices,
        devices: [],
        createdAt: new Date().toISOString(),
        buyerName: body.buyerName || undefined,
        buyerPhone: body.buyerPhone || undefined,
        status: 'active'
      };

      await saveLicense(newRecord);
      generatedKeys.push(newRecord);
    }

    const responseBody: AdminGenerateResponse = {
      success: true,
      message: `Berhasil membuat ${generatedKeys.length} lisensi baru (Maks. ${maxDevices} perangkat per lisensi).`,
      generatedKeys
    };

    return res.status(201).json(responseBody);
  } catch (error: any) {
    console.error('[ADMIN_GENERATE_ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat lisensi.',
      error: error?.message || 'INTERNAL_SERVER_ERROR'
    });
  }
}

