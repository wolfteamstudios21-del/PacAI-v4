import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { OverridePayload } from "@shared/schema";
import { DeterministicRNG, noise2D } from "./generation";

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

    // v5.3: Constant Engine Draw - Subscribe to random generation pulls
    socket.on("subscribe-gen", async ({ type = "world", frequency = 30000, projectId }: { type?: string; frequency?: number; projectId?: string }) => {
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

      const generateRandomData = () => {
        const seed = Date.now() + Math.floor(Math.random() * 10000);
        const rng = new DeterministicRNG(`gen_${seed}`);
        
        const positions: Array<{ x: number; y: number; z: number }> = [];
        const posCount = 3 + Math.floor(rng.next() * 5);
        for (let i = 0; i < posCount; i++) {
          positions.push({
            x: rng.next() * 100 - 50,
            y: rng.next() * 10,
            z: rng.next() * 100 - 50
          });
        }

        const biomes = ["forest", "desert", "arctic", "urban", "ocean", "volcanic"];
        const dialogs = [
          "Incoming hostile forces detected.",
          "Mission objective updated.",
          "Ally reinforcements en route.",
          "Weather systems changing.",
          "New zone discovered.",
          "Resource deposit located."
        ];

        return {
          type,
          seed,
          projectId,
          positions,
          biome: biomes[Math.floor(rng.next() * biomes.length)],
          dialog: dialogs[Math.floor(rng.next() * dialogs.length)],
          tension: rng.next(),
          timestamp: Date.now()
        };
      };

      const initialData = generateRandomData();
      socket.emit("gen-pull", initialData);

      const interval = setInterval(() => {
        if (!checkRateLimit(socket.user!.username, socket.user!.tier)) {
          return;
        }
        const freshGen = generateRandomData();
        socket.emit("gen-pull", freshGen);
      }, Math.max(frequency, 5000));

      socket.genSubscriptions.set(subKey, interval);

      console.log(`[WS] ${socket.user.username} subscribed to ${type} gen (every ${frequency}ms)`);
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

      activeSessions.forEach((session, sessionId) => {
        if (session.clients.has(socket.id)) {
          session.clients.delete(socket.id);
          io.to(sessionId).emit("client-count", { 
            sessionId, 
            count: session.clients.size 
          });
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
