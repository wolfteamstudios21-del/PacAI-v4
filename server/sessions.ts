import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Session, Override, OverridePayload } from "@shared/schema";
import { getSessionState, getActiveSessionCount } from "./websocket";

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: { username: string; tier: string };
}

function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "pacai-dev-secret";
      const decoded = jwt.verify(token, secret) as { username: string; tier?: string; sessionId?: string };
      req.user = { username: decoded.username, tier: decoded.tier || "free" };
    } catch (err) {
    }
  }
  next();
}

function requireOwner(req: AuthenticatedRequest, res: Response, sessionId: string): boolean {
  const session = sessionsStore.get(sessionId);
  if (!session) {
    return true;
  }
  
  if (!req.user) {
    return true;
  }
  
  if (req.user.username !== session.owner_id && req.user.tier !== "admin") {
    res.status(403).json({ error: "You do not own this session" });
    return false;
  }
  return true;
}

interface SessionRecord {
  id: string;
  owner_id: string;
  name: string;
  project_id?: string;
  status: "active" | "paused" | "closed";
  connected_clients: number;
  metadata?: Record<string, any>;
  created_at: number;
  updated_at: number;
}

interface OverrideRecord {
  id: string;
  session_id: string;
  user_id: string;
  entity_id?: string;
  key: string;
  value: any;
  applied: number;
  created_at: number;
}

const sessionsStore = new Map<string, SessionRecord>();
const overridesStore = new Map<string, OverrideRecord[]>();

// Dev-only mock users (remove in production)
const MOCK_USERS: Record<string, { tier: string }> = process.env.NODE_ENV === 'development' ? {
  WolfTeamstudio2: { tier: "lifetime" },
  AdminTeam15: { tier: "admin" },
  ProUser: { tier: "pro" },
  CreatorUser: { tier: "creator" },
  FreeUser: { tier: "free" },
} : {};

function getUserTier(username: string): string {
  if (process.env.NODE_ENV === 'development') {
    return MOCK_USERS[username]?.tier || "free";
  }
  // Production: require actual user records from database
  return "free";
}

function getSessionLimit(tier: string): number {
  switch (tier) {
    case "lifetime":
    case "admin":
      return 20;
    case "creator":
      return 10;
    case "pro":
      return 5;
    default:
      return 2;
  }
}

router.post("/v5/sessions", (req: Request, res: Response) => {
  const { username, name, projectId } = req.body;

  if (!username || !name) {
    return res.status(400).json({ error: "Username and session name required" });
  }

  const tier = getUserTier(username);
  const userSessions = Array.from(sessionsStore.values()).filter(
    (s) => s.owner_id === username && s.status === "active"
  );

  if (userSessions.length >= getSessionLimit(tier)) {
    return res.status(403).json({
      error: `Session limit reached (${getSessionLimit(tier)} for ${tier} tier)`,
      limit: getSessionLimit(tier),
      current: userSessions.length,
    });
  }

  const session: SessionRecord = {
    id: crypto.randomUUID(),
    owner_id: username,
    name,
    project_id: projectId,
    status: "active",
    connected_clients: 0,
    metadata: {},
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  sessionsStore.set(session.id, session);
  overridesStore.set(session.id, []);

  res.status(201).json({
    session,
    connectUrl: `/ws`,
    token: generateSessionToken(session.id, username, tier),
  });
});

router.get("/v5/sessions", (req: Request, res: Response) => {
  const username = req.query.username as string;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  const userSessions = Array.from(sessionsStore.values())
    .filter((s) => s.owner_id === username)
    .map((s) => {
      const wsState = getSessionState(s.id);
      return {
        ...s,
        connected_clients: wsState?.clients.size || 0,
        queued_overrides: wsState?.overrideQueue.length || 0,
      };
    });

  res.json({
    sessions: userSessions,
    activeCount: getActiveSessionCount(),
    limit: getSessionLimit(getUserTier(username)),
  });
});

router.get("/v5/sessions/:id", (req: Request, res: Response) => {
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const wsState = getSessionState(session.id);

  res.json({
    session: {
      ...session,
      connected_clients: wsState?.clients.size || 0,
    },
    overrides: overridesStore.get(session.id) || [],
    queuedOverrides: wsState?.overrideQueue || [],
  });
});

router.get("/v5/sessions/:id/overrides", (req: Request, res: Response) => {
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const wsState = getSessionState(session.id);
  const storedOverrides = overridesStore.get(session.id) || [];
  const pendingOverrides = storedOverrides.filter((o) => o.applied === 0);

  res.json({
    overrides: pendingOverrides,
    queuedCount: wsState?.overrideQueue.length || 0,
    liveQueue: wsState?.overrideQueue || [],
  });
});

router.post("/v5/sessions/:id/overrides", (req: Request, res: Response) => {
  const { username, entityId, key, value } = req.body;
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (!username || !key) {
    return res.status(400).json({ error: "Username and key required" });
  }

  if (session.owner_id !== username) {
    const tier = getUserTier(username);
    if (tier !== "admin") {
      return res.status(403).json({ error: "Only session owner can push overrides" });
    }
  }

  const override: OverrideRecord = {
    id: crypto.randomUUID(),
    session_id: session.id,
    user_id: username,
    entity_id: entityId,
    key,
    value,
    applied: 0,
    created_at: Date.now(),
  };

  const sessionOverrides = overridesStore.get(session.id) || [];
  sessionOverrides.push(override);
  overridesStore.set(session.id, sessionOverrides);

  res.status(201).json({
    override,
    message: "Override queued. Connect via WebSocket for real-time sync.",
  });
});

router.post("/v5/sessions/:id/overrides/:overrideId/ack", (req: Request, res: Response) => {
  const sessionOverrides = overridesStore.get(req.params.id);

  if (!sessionOverrides) {
    return res.status(404).json({ error: "Session not found" });
  }

  const override = sessionOverrides.find((o) => o.id === req.params.overrideId);

  if (!override) {
    return res.status(404).json({ error: "Override not found" });
  }

  override.applied = 1;

  res.json({ success: true, override });
});

router.patch("/v5/sessions/:id", (req: Request, res: Response) => {
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const { status, name, metadata } = req.body;

  if (status) session.status = status;
  if (name) session.name = name;
  if (metadata) session.metadata = { ...session.metadata, ...metadata };
  session.updated_at = Date.now();

  sessionsStore.set(session.id, session);

  res.json({ session });
});

router.delete("/v5/sessions/:id", (req: Request, res: Response) => {
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  sessionsStore.delete(session.id);
  overridesStore.delete(session.id);

  res.json({ success: true, message: "Session deleted" });
});

router.post("/v5/sessions/:id/token", (req: Request, res: Response) => {
  const { username } = req.body;
  const session = sessionsStore.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  if (session.owner_id !== username) {
    const tier = getUserTier(username);
    if (tier !== "admin") {
      return res.status(403).json({ error: "Only session owner can get tokens" });
    }
  }

  const tier = getUserTier(username);
  const token = generateSessionToken(session.id, username, tier);

  res.json({ token, expiresIn: "7d" });
});

function generateSessionToken(sessionId: string, username: string, tier: string): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "pacai-dev-secret";
  
  return jwt.sign(
    { sessionId, username, tier },
    secret,
    { expiresIn: "7d" }
  );
}

export default router;
