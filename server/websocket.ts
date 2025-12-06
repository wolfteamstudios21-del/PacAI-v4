import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { OverridePayload } from "@shared/schema";

interface AuthenticatedSocket extends Socket {
  user?: {
    username: string;
    tier: string;
    sessionId?: string;
  };
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

    socket.on("disconnect", () => {
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
