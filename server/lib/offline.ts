import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    console.warn('[OFFLINE] WARNING: No JWT_SECRET or SESSION_SECRET set. Offline license features disabled.');
    return null;
  }
  return secret;
}

const ALLOWED_USB_PATHS = ['/dev/usb0', '/dev/usb1', '/media', '/mnt/usb', '/tmp/licenses'];

interface LicensePayload {
  userId: string;
  tier: string;
  machineId: string;
  expiresAt: number;
  features: string[];
  offlineGraceDays: number;
}

interface OfflineLicenseResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: string;
  remainingGraceDays?: number;
}

function isAllowedPath(inputPath: string): boolean {
  const normalized = path.normalize(inputPath);
  if (normalized.includes('..')) return false;
  return ALLOWED_USB_PATHS.some(allowed => normalized.startsWith(allowed));
}

export async function offlineRenewLicense(usbPath?: string): Promise<OfflineLicenseResult> {
  try {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return {
        valid: false,
        error: 'Offline licensing disabled: No JWT_SECRET or SESSION_SECRET configured.'
      };
    }
    
    const licensePath = usbPath || process.env.USB_LICENSE_PATH || '/dev/usb0/pacai_license.jwt';
    
    if (!isAllowedPath(licensePath)) {
      return {
        valid: false,
        error: 'Invalid license path. Path must be within allowed USB directories.'
      };
    }
    
    let licenseToken: string;
    try {
      licenseToken = await fs.readFile(licensePath, 'utf-8');
      licenseToken = licenseToken.trim();
    } catch (readError) {
      return {
        valid: false,
        error: `License file not found at ${licensePath}. Insert USB with valid license.`
      };
    }
    
    const decoded = jwt.verify(licenseToken, jwtSecret) as unknown as LicensePayload;
    
    const now = Date.now();
    if (decoded.expiresAt < now) {
      const gracePeriodMs = (decoded.offlineGraceDays || 30) * 24 * 60 * 60 * 1000;
      if (decoded.expiresAt + gracePeriodMs < now) {
        return {
          valid: false,
          error: 'License expired and grace period exceeded. Connect to renew.',
          remainingGraceDays: 0
        };
      }
      
      const remainingGraceMs = (decoded.expiresAt + gracePeriodMs) - now;
      const remainingGraceDays = Math.ceil(remainingGraceMs / (24 * 60 * 60 * 1000));
      
      return {
        valid: true,
        payload: decoded,
        remainingGraceDays,
        error: `License expired but within grace period. ${remainingGraceDays} days remaining.`
      };
    }
    
    return {
      valid: true,
      payload: decoded
    };
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid license signature. License may be corrupted or tampered.'
      };
    }
    return {
      valid: false,
      error: `License verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function generateOfflineLicense(
  userId: string,
  tier: string,
  machineId: string,
  validDays: number = 365,
  features: string[] = ['generation', 'export', 'override']
): string | null {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    console.error('[OFFLINE] Cannot generate license: No JWT_SECRET or SESSION_SECRET configured.');
    return null;
  }
  
  const payload: LicensePayload = {
    userId,
    tier,
    machineId,
    expiresAt: Date.now() + (validDays * 24 * 60 * 60 * 1000),
    features,
    offlineGraceDays: 30
  };
  
  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
}

export interface CachedAsset {
  id: string;
  type: 'world' | 'entity' | 'texture' | 'audio' | 'animation';
  data: string;
  checksum: string;
  cachedAt: number;
  expiresAt: number;
}

const assetCache: Map<string, CachedAsset> = new Map();

export function cacheAsset(asset: Omit<CachedAsset, 'cachedAt'>): void {
  assetCache.set(asset.id, {
    ...asset,
    cachedAt: Date.now()
  });
  
  if (assetCache.size > 1000) {
    const now = Date.now();
    for (const [id, cached] of assetCache.entries()) {
      if (cached.expiresAt < now) {
        assetCache.delete(id);
      }
    }
    
    if (assetCache.size > 1000) {
      const sorted = [...assetCache.entries()]
        .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      const toRemove = sorted.slice(0, assetCache.size - 800);
      for (const [id] of toRemove) {
        assetCache.delete(id);
      }
    }
  }
}

export function getCachedAsset(id: string): CachedAsset | null {
  const cached = assetCache.get(id);
  if (!cached) return null;
  
  if (cached.expiresAt < Date.now()) {
    assetCache.delete(id);
    return null;
  }
  
  return cached;
}

export function clearExpiredCache(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (const [id, cached] of assetCache.entries()) {
    if (cached.expiresAt < now) {
      assetCache.delete(id);
      cleared++;
    }
  }
  
  return cleared;
}

export function getCacheStats(): { total: number; byType: Record<string, number>; sizeEstimate: number } {
  const byType: Record<string, number> = {};
  let sizeEstimate = 0;
  
  for (const cached of assetCache.values()) {
    byType[cached.type] = (byType[cached.type] || 0) + 1;
    sizeEstimate += cached.data.length;
  }
  
  return {
    total: assetCache.size,
    byType,
    sizeEstimate
  };
}

export const INDEXEDDB_SCHEMA = {
  name: 'PacAI_OfflineCache',
  version: 1,
  stores: {
    assets: {
      keyPath: 'id',
      indexes: ['type', 'cachedAt', 'expiresAt', 'checksum']
    },
    generations: {
      keyPath: 'seed',
      indexes: ['projectId', 'createdAt']
    },
    licenses: {
      keyPath: 'machineId',
      indexes: ['expiresAt']
    }
  },
  clientCode: `
// SDK Usage (Unity/Godot/Web):
const db = await openDB('PacAI_OfflineCache', 1, {
  upgrade(db) {
    const assets = db.createObjectStore('assets', { keyPath: 'id' });
    assets.createIndex('type', 'type');
    assets.createIndex('cachedAt', 'cachedAt');
    
    const generations = db.createObjectStore('generations', { keyPath: 'seed' });
    generations.createIndex('projectId', 'projectId');
  }
});

// Cache asset
await db.put('assets', { id, type, data: base64, cachedAt: Date.now() });

// Retrieve cached
const cached = await db.get('assets', assetId);
`
};
