import { generateLicenseKey } from './_lib/utils';
import { saveLicense } from './_lib/db';
import { LicenseRecord } from './_lib/types';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metode HTTP harus POST.' });
  }

  const { adminSecret, buyerName, buyerPhone, count = 1, maxDevices = 2 } = req.body || {};

  const expectedSecret = process.env.ADMIN_SECRET || 'musik-klona-admin-master-key-2026';
  if (adminSecret !== expectedSecret) {
    return res.status(401).json({ success: false, message: 'Kunci rahasia admin salah atau tidak valid.' });
  }

  const generated: LicenseRecord[] = [];
  const total = Math.min(Math.max(1, count), 50);

  for (let i = 0; i < total; i++) {
    const key = generateLicenseKey();
    const newLicense: LicenseRecord = {
      licenseKey: key,
      maxDevices: maxDevices || 2,
      devices: [],
      createdAt: new Date().toISOString(),
      buyerName: buyerName || 'Pelanggan Musik Klona',
      buyerPhone: buyerPhone || '',
      status: 'active'
    };
    await saveLicense(newLicense);
    generated.push(newLicense);
  }

  return res.status(201).json({
    success: true,
    message: `Berhasil membuat ${generated.length} lisensi baru (Maks. ${maxDevices} perangkat per lisensi).`,
    generatedKeys: generated
  });
}

