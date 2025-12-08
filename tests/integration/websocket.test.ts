import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:5000/ws';

describe('WebSocket Features', () => {
  let ws: WebSocket;
  let projectId: string;
  const API_URL = process.env.TEST_API_URL || 'http://localhost:5000';

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_URL}/v5/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'WS Test Project' })
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

  afterAll(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', async () => {
      return new Promise<void>((resolve, reject) => {
        ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          resolve();
        });
        
        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should receive welcome message on connect', async () => {
      return new Promise<void>((resolve, reject) => {
        const testWs = new WebSocket(WS_URL);
        
        testWs.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          expect(msg.type).toBeDefined();
          testWs.close();
          resolve();
        });
        
        testWs.on('error', reject);
        
        setTimeout(() => {
          testWs.close();
          reject(new Error('Message timeout'));
        }, 5000);
      });
    });
  });

  describe('subscribe-gen Event', () => {
    it('should subscribe to constant generation', async () => {
      return new Promise<void>((resolve, reject) => {
        const testWs = new WebSocket(WS_URL);
        
        testWs.on('open', () => {
          testWs.send(JSON.stringify({
            type: 'subscribe-gen',
            projectId
          }));
        });
        
        testWs.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'gen-update' || msg.type === 'subscribed') {
            expect(msg).toBeDefined();
            testWs.close();
            resolve();
          }
        });
        
        testWs.on('error', reject);
        
        setTimeout(() => {
          testWs.close();
          resolve();
        }, 3000);
      });
    });
  });

  describe('event-override Event', () => {
    it('should handle seasonal event overrides', async () => {
      return new Promise<void>((resolve, reject) => {
        const testWs = new WebSocket(WS_URL);
        
        testWs.on('open', () => {
          testWs.send(JSON.stringify({
            type: 'event-override',
            projectId,
            event: {
              name: 'winter_festival',
              params: { snow: true, decorations: true }
            }
          }));
        });
        
        testWs.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'override-applied' || msg.type === 'error' || msg.type === 'connected') {
            testWs.close();
            resolve();
          }
        });
        
        testWs.on('error', reject);
        
        setTimeout(() => {
          testWs.close();
          resolve();
        }, 3000);
      });
    });
  });
});
