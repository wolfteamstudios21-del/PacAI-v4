/**
 * PacAI v6.3 Live Override Bridge for WebGPU/JavaScript
 * 
 * This module connects your web-based game to PacAI's live override system,
 * allowing real-time tweaks from the dashboard without page reload.
 * 
 * INSTALLATION:
 * 1. Include Socket.io client: npm install socket.io-client
 * 2. Import this module in your game
 * 3. Call connect() with your session credentials
 * 
 * USAGE:
 * import { PacAIBridge } from './pacai-bridge';
 * 
 * const bridge = new PacAIBridge({
 *   serverUrl: 'https://pacaiwolfstudio.com',
 *   sessionId: 'your-session-id',
 *   authToken: 'your-auth-token'
 * });
 * 
 * bridge.on('override', (payload) => {
 *   console.log('Override:', payload.key, '=', payload.value);
 * });
 * 
 * bridge.connect();
 */

import { io, Socket } from 'socket.io-client';

export interface OverridePayload {
  entityId?: string;
  key: string;
  value: any;
}

export interface OverrideEvent {
  sessionId: string;
  payload: OverridePayload;
  timestamp: number;
  userId?: string;
}

export interface PacAIBridgeOptions {
  serverUrl: string;
  sessionId: string;
  authToken: string;
  pollInterval?: number;
  debug?: boolean;
}

type EventHandler = (data: any) => void;

export class PacAIBridge {
  private socket: Socket | null = null;
  private options: Required<PacAIBridgeOptions>;
  private isConnected = false;
  private pollTimer: number | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private overrideHandlers: Map<string, (value: any, entityId?: string) => void> = new Map();

  constructor(options: PacAIBridgeOptions) {
    this.options = {
      pollInterval: 10000,
      debug: false,
      ...options
    };
  }

  /**
   * Connect to PacAI server
   */
  connect(): void {
    if (!this.options.sessionId || !this.options.authToken) {
      throw new Error('[PacAI] Session ID and Auth Token are required');
    }

    this.socket = io(this.options.serverUrl, {
      path: '/ws',
      auth: { token: this.options.authToken },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.log('Connected to server');
      this.socket?.emit('join-session', this.options.sessionId);
      this.emit('connected', null);
      this.stopPolling();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.log('Disconnected from server');
      this.emit('disconnected', null);
      this.startPolling();
    });

    this.socket.on('connect_error', (err) => {
      this.log(`Connection error: ${err.message}`);
      this.emit('error', err);
      this.startPolling();
    });

    this.socket.on('apply-override', (event: OverrideEvent) => {
      this.log(`Override received: ${event.payload.key} = ${JSON.stringify(event.payload.value)}`);
      this.emit('override', event.payload);
      this.applyOverride(event.payload);
    });

    this.socket.on('client-count', ({ count }: { count: number }) => {
      this.log(`${count} client(s) connected`);
      this.emit('clientCount', count);
    });

    this.socket.on('error', ({ message }: { message: string }) => {
      this.log(`Error: ${message}`);
      this.emit('error', new Error(message));
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leave-session', this.options.sessionId);
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.stopPolling();
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: EventHandler): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  /**
   * Register a handler for a specific override key
   */
  registerOverride(key: string, handler: (value: any, entityId?: string) => void): this {
    this.overrideHandlers.set(key, handler);
    return this;
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  private applyOverride(payload: OverridePayload): void {
    const handler = this.overrideHandlers.get(payload.key);
    if (handler) {
      handler(payload.value, payload.entityId);
    } else {
      this.log(`No handler for override: ${payload.key}`);
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    
    this.pollTimer = window.setInterval(() => {
      this.pollOverrides();
    }, this.options.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollOverrides(): Promise<void> {
    try {
      const response = await fetch(
        `${this.options.serverUrl}/v5/sessions/${this.options.sessionId}/overrides`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.liveQueue) {
          data.liveQueue.forEach((event: OverrideEvent) => {
            this.applyOverride(event.payload);
          });
        }
      }
    } catch (err) {
      this.log(`Poll failed: ${err}`);
    }
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[PacAI] ${message}`);
    }
  }
}

// Example usage with common game patterns
export const commonOverrides = {
  /**
   * Speed multiplier (affects game time scale)
   */
  speedMultiplier: (gameContext: { timeScale: number }) => 
    (value: number) => {
      gameContext.timeScale = value;
    },

  /**
   * AI behavior toggle
   */
  aiEnabled: (aiManager: { enabled: boolean }) =>
    (value: boolean) => {
      aiManager.enabled = value;
    },

  /**
   * Entity behavior change
   */
  behavior: (entityManager: { setEntityBehavior: (id: string, behavior: string) => void }) =>
    (value: string, entityId?: string) => {
      if (entityId) {
        entityManager.setEntityBehavior(entityId, value);
      }
    },

  /**
   * Time of day
   */
  timeOfDay: (worldRenderer: { setTimeOfDay: (hour: number) => void }) =>
    (value: number) => {
      worldRenderer.setTimeOfDay(value);
    },

  /**
   * Weather change
   */
  weather: (weatherSystem: { setWeather: (type: string) => void }) =>
    (value: string) => {
      weatherSystem.setWeather(value);
    }
};

export default PacAIBridge;
