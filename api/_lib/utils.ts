import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'musik-klona-secret-hardware-jwt-key-2026';

export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (len: number) => {
    let result = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };

  return `PULL-${pick(4)}-${pick(4)}`;
}

export function signLicenseJwt(licenseKey: string, deviceId: string, deviceName?: string): string {
  return jwt.sign(
    {
      licenseKey,
      deviceId,
      deviceName,
      issuedAt: Date.now(),
      access: 'lifetime_premium'
    },
    JWT_SECRET,
    { expiresIn: '3650d' }
  );
}

export function verifyLicenseJwt(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

