import fs from 'fs';
import path from 'path';
import { LicenseRecord } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'licenses.json');

// In-memory cache for fast lookups and fallback if filesystem is read-only (e.g. serverless)
const memoryStore = new Map<string, LicenseRecord>();

// Pre-seeded demo keys
const initialLicenses: LicenseRecord[] = [
  {
    licenseKey: 'PULL-DEMO-2026',
    maxDevices: 2,
    devices: [],
    createdAt: new Date().toISOString(),
    buyerName: 'Demo User 2026',
    buyerPhone: '085693672730',
    status: 'active'
  },
  {
    licenseKey: 'PULL-DEMO-2027',
    maxDevices: 2,
    devices: [],
    createdAt: new Date().toISOString(),
    buyerName: 'Demo User Antigravity',
    buyerPhone: '085693672730',
    status: 'active'
  },
  {
    licenseKey: 'PULL-TEST-LIFETIME',
    maxDevices: 2,
    devices: [],
    createdAt: new Date().toISOString(),
    buyerName: 'QA Tester',
    buyerPhone: '089876543210',
    status: 'active'
  }
];

function initStore(): void {
  for (const lic of initialLicenses) {
    memoryStore.set(lic.licenseKey.toUpperCase(), lic);
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed: LicenseRecord[] = JSON.parse(raw);
      for (const item of parsed) {
        memoryStore.set(item.licenseKey.toUpperCase(), item);
      }
    }
  } catch {
    // ignore
  }
}

initStore();

function persistToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const all = Array.from(memoryStore.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch {
    // Abaikan jika env serverless read-only
  }
}

export async function getLicense(key: string): Promise<LicenseRecord | null> {
  const normalized = key.trim().toUpperCase();
  const record = memoryStore.get(normalized);
  return record || null;
}

export async function saveLicense(record: LicenseRecord): Promise<void> {
  memoryStore.set(record.licenseKey.toUpperCase(), record);
  persistToFile();
}

export async function getAllLicenses(): Promise<LicenseRecord[]> {
  return Array.from(memoryStore.values());
}

