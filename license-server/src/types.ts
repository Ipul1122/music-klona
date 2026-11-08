export interface DeviceBinding {
  deviceId: string;
  deviceName?: string;
  registeredAt: string;
  lastIp?: string;
}

export interface LicenseRecord {
  licenseKey: string;
  maxDevices: number;
  devices: DeviceBinding[];
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
  license?: {
    key: string;
    maxDevices: number;
    registeredDevices: number;
    status: string;
  };
  error?: string;
}

export interface AdminGenerateRequestBody {
  adminSecret: string;
  count?: number;
  buyerName?: string;
  buyerPhone?: string;
  maxDevices?: number;
}

export interface AdminGenerateResponse {
  success: boolean;
  message: string;
  generatedKeys?: LicenseRecord[];
  error?: string;
}

