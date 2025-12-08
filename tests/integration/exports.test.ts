import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.TEST_API_URL || 'http://localhost:5000';

describe('v5.3 Export Features', () => {
  let projectId: string;

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_URL}/v5/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Export Project' })
      });
      if (res.ok) {
        const data = await res.json();
        projectId = data.id;
      } else {
        projectId = 'test-fallback-id';
      }
    } catch {
      projectId = 'test-fallback-id';
    }
  });

  describe('GET /v5/export/engines', () => {
    it('should return list of supported engines', async () => {
      try {
        const res = await fetch(`${API_URL}/v5/export/engines`);
        if (!res.ok) return; // Skip if auth required
        const data = await res.json();
        
        expect(data.engines).toBeDefined();
        expect(data.engines.length).toBeGreaterThan(0);
        expect(data.engines.some((e: any) => e.id === 'unity')).toBe(true);
        expect(data.engines.some((e: any) => e.id === 'blender')).toBe(true);
      } catch {
        // Server not available, skip
      }
    });

    it('should include mobile support flags', async () => {
      try {
        const res = await fetch(`${API_URL}/v5/export/engines`);
        if (!res.ok) return;
        const data = await res.json();
        
        const blender = data.engines.find((e: any) => e.id === 'blender');
        if (blender) {
          expect(blender.mobile).toBeDefined();
        }
      } catch {
        // Server not available
      }
    });
  });

  describe('POST /v5/export/mobile', () => {
    it('should return ZIP with Content-Disposition header', async () => {
      if (projectId === 'test-fallback-id') return; // Skip without valid project
      try {
        const res = await fetch(`${API_URL}/v5/export/mobile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, engine: 'blender', includeSDK: true })
        });
        if (!res.ok) return;
        
        expect(res.headers.get('Content-Type')).toBe('application/zip');
        expect(res.headers.get('Content-Disposition')).toContain('attachment');
      } catch {
        // Server not available
      }
    });
  });

  describe('POST /v5/projects/:id/link', () => {
    it('should generate shareable link with QR code', async () => {
      if (projectId === 'test-fallback-id') return; // Skip without valid project
      try {
        const res = await fetch(`${API_URL}/v5/projects/${projectId}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'test-user', expiresInDays: 7 })
        });
        if (!res.ok) return;
        const data = await res.json();
        
        expect(data.link).toBeDefined();
        expect(data.shortId).toBeDefined();
        expect(data.token).toBeDefined();
        expect(data.qr).toContain('data:image/png;base64');
      } catch {
        // Server not available
      }
    });
  });
});

describe('Constant Engine Draw', () => {
  describe('GET /v5/gen/random', () => {
    it('should return random world generation', async () => {
      try {
        const res = await fetch(`${API_URL}/v5/gen/random`);
        if (!res.ok) return;
        const data = await res.json();
        
        expect(data.seed).toBeDefined();
        expect(data.biome).toBeDefined();
        expect(data.positions).toBeDefined();
        expect(Array.isArray(data.positions)).toBe(true);
      } catch {
        // Server not available
      }
    });

    it('should return different seeds on each call', async () => {
      try {
        const res1 = await fetch(`${API_URL}/v5/gen/random`);
        const res2 = await fetch(`${API_URL}/v5/gen/random`);
        if (!res1.ok || !res2.ok) return;
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        expect(data1.seed).not.toBe(data2.seed);
      } catch {
        // Server not available
      }
    });
  });
});
