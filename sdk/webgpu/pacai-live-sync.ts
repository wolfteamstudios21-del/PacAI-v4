// PacAI v5.3 WebGPU/Browser SDK - Live Sync Module
// Connects to PacAI WebSocket for real-time override sync and continuous generation

import { io, Socket } from 'socket.io-client';

export interface NPCData {
  id: string;
  type: string;
  faction: string;
  position: { x: number; y: number; z: number };
  health: number;
  behavior: string;
  aggression: number;
  equipment: string[];
}

export interface DialogData {
  id: string;
  speaker: string;
  text: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  duration: number;
}

export interface ConflictEvent {
  id: string;
  type: string;
  location: { x: number; y: number; z: number };
  factions: string[];
  intensity: number;
  outcome: string;
  casualties: { friendly: number; enemy: number };
}

export interface WorldChunk {
  tiles: any[][];
  pois: any[];
  roads: any[];
  weather: {
    condition: string;
    intensity: number;
    windDirection: number;
    windSpeed: number;
    visibility: number;
  };
  checksum: string;
}

export interface OverrideData {
  projectId: string;
  command: string;
  user: string;
  success: boolean;
  changes: Record<string, any>;
  timestamp: number;
}

export interface PacAILiveSyncConfig {
  serverUrl: string;
  projectId: string;
  authToken: string;
  generationFrequencyMs?: number;
  subscribeToWorld?: boolean;
  subscribeToNPCs?: boolean;
  subscribeToDialog?: boolean;
  subscribeToConflict?: boolean;
}

export type EventHandler<T> = (data: T) => void;

export class PacAILiveSync {
  private socket: Socket | null = null;
  private config: Required<PacAILiveSyncConfig>;
  private isConnected = false;

  // Event handlers
  public onOverride: EventHandler<OverrideData> | null = null;
  public onNPCs: EventHandler<NPCData[]> | null = null;
  public onDialogs: EventHandler<DialogData[]> | null = null;
  public onConflicts: EventHandler<ConflictEvent[]> | null = null;
  public onWorldChunk: EventHandler<WorldChunk> | null = null;
  public onGeneration: EventHandler<any> | null = null;
  public onGlobalEvent: EventHandler<any> | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: EventHandler<string> | null = null;

  constructor(config: PacAILiveSyncConfig) {
    this.config = {
      generationFrequencyMs: 30000,
      subscribeToWorld: true,
      subscribeToNPCs: true,
      subscribeToDialog: true,
      subscribeToConflict: true,
      ...config
    };
  }

  connect(): void {
    this.socket = io(this.config.serverUrl, {
      path: '/ws',
      auth: { token: this.config.authToken },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('[PacAI] Connected to live sync server');
      this.isConnected = true;
      this.subscribeToProject();
      this.subscribeToGeneration();
      this.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      console.log('[PacAI] Disconnected from server');
      this.isConnected = false;
      this.onDisconnect?.();
    });

    this.socket.on('project-override', (data: OverrideData) => {
      console.log(`[PacAI] Override received: ${data.command}`);
      this.onOverride?.(data);
    });

    this.socket.on('project-generated', (data: any) => {
      console.log('[PacAI] New world generation received');
      this.onGeneration?.(data);
    });

    this.socket.on('project-state', (data: any) => {
      console.log('[PacAI] State update received');
    });

    this.socket.on('gen-pull', (data: any) => {
      this.processGenerationData(data);
    });

    this.socket.on('global-event', (data: any) => {
      console.log(`[PacAI] Global event: ${data.name}`);
      this.onGlobalEvent?.(data);
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error(`[PacAI] Error: ${data.message}`);
      this.onError?.(data.message);
    });
  }

  private subscribeToProject(): void {
    if (!this.config.projectId) return;
    this.socket?.emit('subscribe-project', { projectId: this.config.projectId });
    console.log(`[PacAI] Subscribed to project: ${this.config.projectId}`);
  }

  private subscribeToGeneration(): void {
    this.socket?.emit('subscribe-gen', {
      type: 'all',
      frequency: this.config.generationFrequencyMs,
      projectId: this.config.projectId,
      includeNPCs: this.config.subscribeToNPCs,
      includeDialog: this.config.subscribeToDialog,
      includeConflict: this.config.subscribeToConflict
    });
    console.log('[PacAI] Subscribed to continuous generation');
  }

  private processGenerationData(data: any): void {
    if (data.npcs && this.config.subscribeToNPCs) {
      this.onNPCs?.(data.npcs);
    }
    if (data.dialogs && this.config.subscribeToDialog) {
      this.onDialogs?.(data.dialogs);
    }
    if (data.conflicts && this.config.subscribeToConflict) {
      this.onConflicts?.(data.conflicts);
    }
    if (data.world && this.config.subscribeToWorld) {
      this.onWorldChunk?.(data.world);
    }
  }

  pushOverride(command: string): void {
    if (!this.isConnected) {
      console.warn('[PacAI] Not connected, cannot push override');
      return;
    }
    this.socket?.emit('override-push', {
      sessionId: this.config.projectId,
      payload: { key: 'override', value: command }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe-project', { projectId: this.config.projectId });
      this.socket.emit('unsubscribe-gen', { type: 'all', projectId: this.config.projectId });
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Usage Example:
/*
const pacai = new PacAILiveSync({
  serverUrl: 'https://your-pacai-server.com',
  projectId: 'proj_abc123',
  authToken: 'your-jwt-token',
  generationFrequencyMs: 10000
});

pacai.onNPCs = (npcs) => {
  npcs.forEach(npc => spawnNPC(npc.position, npc.type));
};

pacai.onDialogs = (dialogs) => {
  dialogs.forEach(d => showSubtitle(d.speaker, d.text));
};

pacai.onOverride = (override) => {
  if (override.changes.weather) {
    updateWeather(override.changes.weather);
  }
};

pacai.connect();
*/
