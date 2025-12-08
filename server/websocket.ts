import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { OverridePayload } from "@shared/schema";
import { DeterministicRNG, noise2D } from "./generation";
import { generateEntities } from "./generation/entity-generator";
import { generateWorld } from "./generation/world-generator";

// Singleton io instance for bridge from REST API
let ioInstance: Server | null = null;

interface AuthenticatedSocket extends Socket {
  user?: {
    username: string;
    tier: string;
    sessionId?: string;
  };
  genSubscriptions?: Map<string, NodeJS.Timeout>;
}

interface SessionState {
  clients: Set<string>;
  overrideQueue: Array<{ payload: OverridePayload; timestamp: number; userId: string }>;
}

const activeSessions = new Map<string, SessionState>();

const TIER_RATE_LIMITS: Record<string, number> = {
  free: 5,
  pro: 30,
  creator: 50,
  lifetime: 100,
  admin: 1000,
};

const rateLimitCounters = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, tier: string): boolean {
  const limit = TIER_RATE_LIMITS[tier] || 5;
  const now = Date.now();
  const counter = rateLimitCounters.get(userId);
  
  if (!counter || counter.resetTime < now) {
    rateLimitCounters.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (counter.count >= limit) {
    return false;
  }
  
  counter.count++;
  return true;
}

// Project subscriptions for game servers - maps projectId to connected socket IDs
const projectSubscriptions = new Map<string, Set<string>>();

// Generation types for continuous streaming
type GenType = "world" | "npc" | "dialog" | "conflict" | "weather" | "all";

interface ContinuousGenOptions {
  type: GenType;
  frequency: number;
  projectId?: string;
  chunkSize?: number;
  includeNPCs?: boolean;
  includeDialog?: boolean;
  includeConflict?: boolean;
}

// Generate world chunk for streaming
function generateWorldChunk(rng: DeterministicRNG, chunkSize: number = 16) {
  const world = generateWorld(rng.getSeed(), {
    width: chunkSize,
    height: chunkSize,
    density: 0.5,
    difficulty: 0.5
  });
  
  return {
    tiles: world.tiles,
    pois: world.pois.slice(0, 3),
    roads: world.roads.slice(0, 2),
    weather: world.weather,
    checksum: world.checksum
  };
}

// Generate NPCs for streaming
function generateNPCBatch(rng: DeterministicRNG, count: number = 5) {
  const types = ["infantry", "scout", "sniper", "heavy", "hostile"] as const;
  const factions = ["alpha", "bravo", "hostile", "neutral"] as const;
  const behaviors = ["patrol", "guard", "search", "idle"] as const;
  
  const npcs = [];
  for (let i = 0; i < count; i++) {
    npcs.push({
      id: `npc_${rng.getSeed().substring(0, 6)}_${i}`,
      type: types[Math.floor(rng.next() * types.length)],
      faction: factions[Math.floor(rng.next() * factions.length)],
      position: {
        x: rng.next() * 100 - 50,
        y: 0,
        z: rng.next() * 100 - 50
      },
      health: 50 + Math.floor(rng.next() * 50),
      behavior: behaviors[Math.floor(rng.next() * behaviors.length)],
      aggression: rng.next(),
      equipment: rng.next() > 0.5 ? ["rifle", "vest"] : ["pistol"]
    });
  }
  return npcs;
}

// Generate dialog for streaming
function generateDialogBatch(rng: DeterministicRNG, count: number = 3) {
  const speakers = ["Command", "Alpha Lead", "Bravo Lead", "Scout", "Intel", "HQ"];
  const priorities = ["low", "normal", "high", "critical"] as const;
  
  const templates = [
    "Contact spotted at grid reference ${grid}.",
    "Reinforcements are ${eta} minutes out.",
    "Weather advisory: ${weather} incoming.",
    "Objective ${obj} has been updated.",
    "Intel suggests enemy movement at ${location}.",
    "All units be advised: ${alert}.",
    "Mission clock at ${time} hours.",
    "Requesting fire support at coordinates ${coords}."
  ];
  
  const dialogs = [];
  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(rng.next() * templates.length)];
    const text = template
      .replace("${grid}", `${Math.floor(rng.next() * 9)}${Math.floor(rng.next() * 9)}`)
      .replace("${eta}", String(Math.floor(rng.next() * 15) + 1))
      .replace("${weather}", ["storm", "fog", "sandstorm", "clear"][Math.floor(rng.next() * 4)])
      .replace("${obj}", ["Alpha", "Bravo", "Charlie"][Math.floor(rng.next() * 3)])
      .replace("${location}", ["north ridge", "east flank", "supply depot", "extraction point"][Math.floor(rng.next() * 4)])
      .replace("${alert}", ["enemy reinforcements", "air support", "artillery strike", "patrol change"][Math.floor(rng.next() * 4)])
      .replace("${time}", String(Math.floor(rng.next() * 24)))
      .replace("${coords}", `${Math.floor(rng.next() * 100)}, ${Math.floor(rng.next() * 100)}`);
    
    dialogs.push({
      id: `dlg_${Date.now()}_${i}`,
      speaker: speakers[Math.floor(rng.next() * speakers.length)],
      text,
      priority: priorities[Math.floor(rng.next() * priorities.length)],
      timestamp: Date.now(),
      duration: 3000 + Math.floor(rng.next() * 5000)
    });
  }
  return dialogs;
}

// Generate conflict events for streaming
function generateConflictEvents(rng: DeterministicRNG, count: number = 2) {
  const types = ["skirmish", "ambush", "assault", "defense", "retreat", "reinforcement"] as const;
  const outcomes = ["ongoing", "victory", "defeat", "stalemate", "escalating"] as const;
  
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: `conflict_${Date.now()}_${i}`,
      type: types[Math.floor(rng.next() * types.length)],
      location: {
        x: rng.next() * 100 - 50,
        y: 0,
        z: rng.next() * 100 - 50
      },
      factions: ["alpha", "hostile"],
      intensity: rng.next(),
      outcome: outcomes[Math.floor(rng.next() * outcomes.length)],
      casualties: {
        friendly: Math.floor(rng.next() * 5),
        enemy: Math.floor(rng.next() * 10)
      },
      timestamp: Date.now()
    });
  }
  return events;
}

export function initWebSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? ["https://pacaiwolfstudio.com", "https://*.replit.dev"]
        : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/ws",
  });

  // Store singleton for REST→WebSocket bridge
  ioInstance = io;

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;
    
    if (!token) {
      return next(new Error("Authentication required - JWT token missing"));
    }

    try {
      const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "pacai-dev-secret";
      const decoded = jwt.verify(token, secret) as { username: string; tier: string; sessionId?: string };
      socket.user = { 
        username: decoded.username, 
        tier: decoded.tier,
        sessionId: decoded.sessionId 
      };
      next();
    } catch (err) {
      return next(new Error("Invalid or expired JWT token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`[WS] Client connected: ${socket.id} (${socket.user?.username})`);

    socket.on("join-session", async (sessionId: string) => {
      if (!sessionId) {
        socket.emit("error", { message: "Session ID required" });
        return;
      }

      if (socket.user?.sessionId && socket.user.sessionId !== sessionId) {
        socket.emit("error", { message: "Token not authorized for this session" });
        console.log(`[WS] Session binding violation: token for ${socket.user.sessionId}, attempted ${sessionId}`);
        return;
      }

      socket.join(sessionId);
      
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, { clients: new Set(), overrideQueue: [] });
      }
      
      const session = activeSessions.get(sessionId)!;
      session.clients.add(socket.id);

      io.to(sessionId).emit("client-count", { 
        sessionId, 
        count: session.clients.size 
      });

      if (session.overrideQueue.length > 0) {
        session.overrideQueue.forEach((item) => {
          socket.emit("apply-override", {
            sessionId,
            payload: item.payload,
            timestamp: item.timestamp,
          });
        });
      }

      console.log(`[WS] ${socket.user?.username} joined session ${sessionId} (${session.clients.size} clients)`);
    });

    socket.on("leave-session", (sessionId: string) => {
      socket.leave(sessionId);
      
      const session = activeSessions.get(sessionId);
      if (session) {
        session.clients.delete(socket.id);
        io.to(sessionId).emit("client-count", { 
          sessionId, 
          count: session.clients.size 
        });
        
        if (session.clients.size === 0) {
          setTimeout(() => {
            const s = activeSessions.get(sessionId);
            if (s && s.clients.size === 0) {
              activeSessions.delete(sessionId);
            }
          }, 300000);
        }
      }
    });

    socket.on("override-push", async ({ sessionId, payload }: { sessionId: string; payload: OverridePayload }) => {
      if (!socket.user) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      if (!sessionId || !payload || !payload.key) {
        socket.emit("error", { message: "Invalid override payload" });
        return;
      }

      if (!checkRateLimit(socket.user.username, socket.user.tier)) {
        socket.emit("error", { message: "Rate limit exceeded. Upgrade tier for higher limits." });
        return;
      }

      const session = activeSessions.get(sessionId);
      if (!session) {
        activeSessions.set(sessionId, { clients: new Set(), overrideQueue: [] });
      }

      const overrideEvent = {
        sessionId,
        payload,
        timestamp: Date.now(),
        userId: socket.user.username,
      };

      activeSessions.get(sessionId)!.overrideQueue.push(overrideEvent);

      if (activeSessions.get(sessionId)!.overrideQueue.length > 100) {
        activeSessions.get(sessionId)!.overrideQueue.shift();
      }

      io.to(sessionId).emit("apply-override", overrideEvent);

      socket.emit("override-ack", {
        sessionId,
        payload,
        success: true,
        clientsReached: activeSessions.get(sessionId)!.clients.size,
      });

      console.log(`[WS] Override pushed to session ${sessionId}: ${payload.key}=${JSON.stringify(payload.value)}`);
    });

    // v5.3: Subscribe to project for live override sync
    socket.on("subscribe-project", async ({ projectId }: { projectId: string }) => {
      if (!socket.user) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      if (!projectId) {
        socket.emit("error", { message: "Project ID required" });
        return;
      }

      // Join project room for override broadcasts
      socket.join(`project:${projectId}`);
      
      if (!projectSubscriptions.has(projectId)) {
        projectSubscriptions.set(projectId, new Set());
      }
      projectSubscriptions.get(projectId)!.add(socket.id);

      socket.emit("project-subscribed", { 
        projectId, 
        connectedClients: projectSubscriptions.get(projectId)!.size 
      });

      console.log(`[WS] ${socket.user.username} subscribed to project ${projectId} overrides`);
    });

    socket.on("unsubscribe-project", ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      
      const subs = projectSubscriptions.get(projectId);
      if (subs) {
        subs.delete(socket.id);
        if (subs.size === 0) {
          projectSubscriptions.delete(projectId);
        }
      }
      console.log(`[WS] Unsubscribed from project ${projectId}`);
    });

    // v5.3: Enhanced Constant Engine Draw - Subscribe to continuous generation
    socket.on("subscribe-gen", async ({ 
      type = "all", 
      frequency = 30000, 
      projectId,
      chunkSize = 16,
      includeNPCs = true,
      includeDialog = true,
      includeConflict = true
    }: Partial<ContinuousGenOptions>) => {
      if (!socket.user) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      if (!checkRateLimit(socket.user.username, socket.user.tier)) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      const subKey = `${type}_${projectId || "global"}`;
      
      if (!socket.genSubscriptions) {
        socket.genSubscriptions = new Map();
      }

      if (socket.genSubscriptions.has(subKey)) {
        clearInterval(socket.genSubscriptions.get(subKey));
      }

      const generateStreamData = () => {
        const seed = Date.now() + Math.floor(Math.random() * 10000);
        const rng = new DeterministicRNG(`gen_${seed}`);
        
        const result: Record<string, any> = {
          type,
          seed,
          projectId,
          timestamp: Date.now()
        };

        // Generate based on requested type
        if (type === "world" || type === "all") {
          result.world = generateWorldChunk(rng, chunkSize);
        }
        
        if ((type === "npc" || type === "all") && includeNPCs) {
          result.npcs = generateNPCBatch(rng.fork("npcs"), 5);
        }
        
        if ((type === "dialog" || type === "all") && includeDialog) {
          result.dialogs = generateDialogBatch(rng.fork("dialog"), 3);
        }
        
        if ((type === "conflict" || type === "all") && includeConflict) {
          result.conflicts = generateConflictEvents(rng.fork("conflict"), 2);
        }
        
        if (type === "weather" || type === "all") {
          const conditions = ["clear", "cloudy", "rain", "storm", "fog", "snow"];
          result.weather = {
            condition: conditions[Math.floor(rng.next() * conditions.length)],
            intensity: rng.next(),
            windDirection: rng.next() * 360,
            windSpeed: rng.next() * 50,
            visibility: 0.3 + rng.next() * 0.7
          };
        }

        return result;
      };

      // Send initial data immediately
      const initialData = generateStreamData();
      socket.emit("gen-pull", initialData);

      // Set up recurring generation stream
      const interval = setInterval(() => {
        if (!checkRateLimit(socket.user!.username, socket.user!.tier)) {
          return;
        }
        const freshGen = generateStreamData();
        socket.emit("gen-pull", freshGen);
      }, Math.max(frequency, 5000));

      socket.genSubscriptions.set(subKey, interval);

      socket.emit("gen-subscribed", {
        type,
        frequency: Math.max(frequency, 5000),
        projectId,
        message: `Subscribed to ${type} generation stream`
      });

      console.log(`[WS] ${socket.user.username} subscribed to ${type} gen (every ${Math.max(frequency, 5000)}ms)`);
    });

    socket.on("unsubscribe-gen", ({ type = "world", projectId }: { type?: string; projectId?: string }) => {
      const subKey = `${type}_${projectId || "global"}`;
      
      if (socket.genSubscriptions?.has(subKey)) {
        clearInterval(socket.genSubscriptions.get(subKey));
        socket.genSubscriptions.delete(subKey);
        console.log(`[WS] Unsubscribed from ${subKey}`);
      }
    });

    // v5.3: Event Override - Push seasonal/special events without full update
    socket.on("event-override", async ({ eventType = "seasonal", payload }: { eventType?: string; payload: any }) => {
      if (!socket.user) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      if (!checkRateLimit(socket.user.username, socket.user.tier)) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      const overrideEvent = {
        type: eventType,
        data: payload,
        timestamp: Date.now(),
        userId: socket.user.username
      };

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          io.to(room).emit("apply-event", overrideEvent);
        }
      });

      console.log(`[WS] Event override pushed: ${eventType}`);
    });

    socket.on("disconnect", () => {
      if (socket.genSubscriptions) {
        socket.genSubscriptions.forEach((interval) => clearInterval(interval));
        socket.genSubscriptions.clear();
      }

      // Clean up session subscriptions
      activeSessions.forEach((session, sessionId) => {
        if (session.clients.has(socket.id)) {
          session.clients.delete(socket.id);
          io.to(sessionId).emit("client-count", { 
            sessionId, 
            count: session.clients.size 
          });
        }
      });

      // Clean up project subscriptions
      projectSubscriptions.forEach((subs, projectId) => {
        if (subs.has(socket.id)) {
          subs.delete(socket.id);
          if (subs.size === 0) {
            projectSubscriptions.delete(projectId);
          }
        }
      });

      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[WS] WebSocket server initialized on /ws");
  return io;
}

export function getSessionState(sessionId: string): SessionState | undefined {
  return activeSessions.get(sessionId);
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}

// ============================================
// REST → WebSocket Bridge Functions
// These allow the REST API to push to connected game servers
// ============================================

/**
 * Push an override to all game servers subscribed to a project
 * Called from POST /v5/projects/:id/override
 */
export function broadcastOverrideToProject(
  projectId: string, 
  override: {
    command: string;
    user: string;
    success: boolean;
    changes: Record<string, any>;
    timestamp: number;
  }
): number {
  if (!ioInstance) {
    console.warn("[WS Bridge] WebSocket not initialized");
    return 0;
  }

  const room = `project:${projectId}`;
  const connectedCount = projectSubscriptions.get(projectId)?.size || 0;

  if (connectedCount > 0) {
    ioInstance.to(room).emit("project-override", {
      projectId,
      ...override
    });
    console.log(`[WS Bridge] Override broadcast to ${connectedCount} clients on project ${projectId}`);
  }

  return connectedCount;
}

/**
 * Push a state update to all game servers subscribed to a project
 * Used for tick updates, entity changes, narrative updates
 */
export function broadcastStateToProject(
  projectId: string,
  stateUpdate: {
    type: "tick" | "entity" | "world" | "narrative" | "weather";
    data: Record<string, any>;
    tick?: number;
  }
): number {
  if (!ioInstance) return 0;

  const room = `project:${projectId}`;
  const connectedCount = projectSubscriptions.get(projectId)?.size || 0;

  if (connectedCount > 0) {
    ioInstance.to(room).emit("project-state", {
      projectId,
      ...stateUpdate,
      timestamp: Date.now()
    });
  }

  return connectedCount;
}

/**
 * Push a generation result to all subscribed clients
 * Used when a new world is generated
 */
export function broadcastGenerationToProject(
  projectId: string,
  generation: {
    seed: string;
    world: any;
    entities: any[];
    narrative: any;
    checksum: string;
  }
): number {
  if (!ioInstance) return 0;

  const room = `project:${projectId}`;
  const connectedCount = projectSubscriptions.get(projectId)?.size || 0;

  if (connectedCount > 0) {
    ioInstance.to(room).emit("project-generated", {
      projectId,
      ...generation,
      timestamp: Date.now()
    });
    console.log(`[WS Bridge] Generation broadcast to ${connectedCount} clients on project ${projectId}`);
  }

  return connectedCount;
}

/**
 * Push a seasonal/special event to all connected game servers
 * Used for holiday events, special missions, global alerts
 */
export function broadcastEventToAll(
  event: {
    type: string;
    name: string;
    data: Record<string, any>;
    expiresAt?: string;
  }
): number {
  if (!ioInstance) return 0;

  let totalClients = 0;
  projectSubscriptions.forEach(subs => totalClients += subs.size);

  if (totalClients > 0) {
    ioInstance.emit("global-event", {
      ...event,
      timestamp: Date.now()
    });
    console.log(`[WS Bridge] Global event "${event.name}" broadcast to ${totalClients} clients`);
  }

  return totalClients;
}

/**
 * Get count of connected game servers for a project
 */
export function getProjectSubscriberCount(projectId: string): number {
  return projectSubscriptions.get(projectId)?.size || 0;
}

/**
 * Get all projects with active game server connections
 */
export function getActiveProjects(): string[] {
  return Array.from(projectSubscriptions.keys());
}
