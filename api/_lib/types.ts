export interface RegisteredDevice {
  deviceId: string;
  deviceName?: string;
  registeredAt: string;
  lastIp?: string;
}

export interface LicenseRecord {
  licenseKey: string;
  maxDevices: number;
  devices: RegisteredDevice[];
  createdAt: string;
  buyerName?: string;
  buyerPhone?: string;
  status: 'active' | 'suspended' | 'revoked';
}

export interface VerifyRequestBody {
  licenseKey: string;
  deviceId: string;
  deviceName?: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  error?: string;
  license?: {
    key: string;
    maxDevices: number;
    registeredDevices: number;
    status: string;
  };
}

export interface TelegramAlertPayload {
  licenseKey: string;
  attemptedDeviceId: string;
  attemptedDeviceName?: string;
  registeredDevices: string[];
  clientIp: string;
  reason: string;
}

