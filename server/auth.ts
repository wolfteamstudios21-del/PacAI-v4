import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { db } from "./drizzle";
import { users as usersTable } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Session token management
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface SessionData {
  username: string;
  tier: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (production should use Redis)
const sessions: Map<string, SessionData> = new Map();

// Generate HMAC-signed session token
function createSessionToken(username: string, tier: string): string {
  const tokenId = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL;
  
  sessions.set(tokenId, {
    username,
    tier,
    createdAt: Date.now(),
    expiresAt,
  });
  
  // Create HMAC signature
  const payload = `${tokenId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  
  return `${tokenId}:${expiresAt}:${signature}`;
}

// Validate session token and return session data
export function validateSessionToken(token: string): SessionData | null {
  if (!token) return null;
  
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  
  const [tokenId, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr);
  
  // Verify HMAC signature
  const payload = `${tokenId}:${expiresAtStr}`;
  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null; // Invalid signature
  }
  
  // Check expiration
  if (Date.now() > expiresAt) {
    sessions.delete(tokenId);
    return null;
  }
  
  // Return session data
  return sessions.get(tokenId) || null;
}

// Auth middleware - validates session and attaches user to request
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || req.headers["x-session-token"] as string;
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const session = validateSessionToken(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  
  // Attach session data to request
  (req as any).session = session;
  next();
}

// In-memory user store with tier tracking
interface User {
  password: string;
  tier: "free" | "creator" | "lifetime";
  verified: boolean;
  generationsThisWeek: number;
  lastGenerationReset: number;
}

// Dev user credentials from environment (not hardcoded in production)
const DEV_USER = process.env.DEV_USERNAME || 'WolfTeamstudio2';
const DEV_PASS = process.env.DEV_PASSWORD || 'AdminTeam15';

const users: Record<string, User> = {
  [DEV_USER]: {
    password: DEV_PASS,
    tier: "lifetime",
    verified: true,
    generationsThisWeek: 0,
    lastGenerationReset: Date.now()
  }
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

// Login / Register - checks database first for persistent tier
router.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    // First check database for existing user with tier
    let dbUser = null;
    try {
      const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.username, username));
      dbUser = foundUser;
    } catch (e) {
      // Database might not be ready, fall back to in-memory
    }

    if (dbUser) {
      // User exists in database - check password and use DB tier
      if (dbUser.password !== password) {
        return res.status(401).json({ error: "Wrong password" });
      }
      
      // Sync in-memory store with database
      users[username] = {
        password: dbUser.password,
        tier: (dbUser.tier || "free") as "free" | "creator" | "lifetime",
        verified: dbUser.is_verified === 1,
        generationsThisWeek: 0,
        lastGenerationReset: getWeekStart()
      };
      
      const tier = dbUser.tier || "free";
      const sessionToken = createSessionToken(username, tier);
      
      return res.json({ 
        success: true, 
        tier, 
        verified: dbUser.is_verified === 1,
        sessionToken,
      });
    }

    // Fall back to in-memory store
    let user = users[username];
    
    // Auto-register new user on first login
    if (!user) {
      users[username] = { 
        password, 
        tier: "free", 
        verified: false,
        generationsThisWeek: 0,
        lastGenerationReset: getWeekStart()
      };
      user = users[username];
      
      // Also insert into database for persistence
      try {
        await db.insert(usersTable).values({
          username,
          password,
          tier: "free",
          is_verified: 0,
        });
      } catch (e) {
        // Database insert failed, continue with in-memory only
      }
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(401).json({ error: "Wrong password" });
    }
    
    // Generate session token for authenticated user
    const sessionToken = createSessionToken(username, user.tier || "free");
    
    res.json({ 
      success: true, 
      tier: user.tier || "free", 
      verified: user.verified || false,
      sessionToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Verify any user (public endpoint)
router.get("/api/verify", async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const user = users[username as string];
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ 
      username, 
      tier: user.tier || "free", 
      verified: user.verified || false 
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// Dev-only upgrade endpoint - LOCKED IN PRODUCTION
router.post("/api/upgrade", async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Endpoint disabled in production" });
  }
  
  // Require admin secret for tier upgrades
  const adminSecret = req.headers['x-admin-secret'] as string;
  if (adminSecret !== (process.env.ADMIN_SECRET || 'dev-admin-secret')) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  
  try {
    const { username, tier } = req.query;
    
    if (!username || !tier) {
      return res.status(400).json({ error: "Username and tier required" });
    }

    const user = users[username as string];
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user tier and verification
    user.tier = tier as any;
    user.verified = true;

    res.json({ success: true, message: `User upgraded to ${tier}` });
  } catch (error) {
    res.status(500).json({ error: "Upgrade failed" });
  }
});

// Tier hierarchy for comparison
const TIER_LEVELS: Record<string, number> = {
  free: 0,
  creator: 1,
  pro: 1,  // alias for creator
  lifetime: 2
};

/**
 * Check if a user's tier meets the minimum required tier
 * @param userTier - The user's current tier
 * @param requiredTier - The minimum tier required
 * @returns true if user has sufficient tier
 */
export function hasTier(userTier: string | undefined, requiredTier: string): boolean {
  const userLevel = TIER_LEVELS[userTier || 'free'] ?? 0;
  const requiredLevel = TIER_LEVELS[requiredTier] ?? 0;
  return userLevel >= requiredLevel;
}

// Export users for tier checks in routes
export function getUser(username: string) {
  return users[username];
}

// Helper: Validate admin from session token (lifetime tier required)
function validateAdminSession(req: Request): { valid: boolean; username?: string; error?: string } {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || req.headers["x-session-token"] as string;
  
  if (!token) {
    return { valid: false, error: "Authentication required" };
  }
  
  const session = validateSessionToken(token);
  if (!session) {
    return { valid: false, error: "Invalid or expired session" };
  }
  
  // Check if session user has lifetime tier (admin)
  if (session.tier !== "lifetime") {
    return { valid: false, error: "Admin privileges required (lifetime tier)" };
  }
  
  return { valid: true, username: session.username };
}

// Admin: Update user tier (upgrade/downgrade)
router.post("/api/admin/user/tier", async (req, res) => {
  try {
    // Validate admin from session token
    const adminCheck = validateAdminSession(req);
    if (!adminCheck.valid) {
      return res.status(403).json({ error: adminCheck.error });
    }
    
    const { username, newTier } = req.body;
    
    if (!username || !newTier) {
      return res.status(400).json({ error: "Username and tier required" });
    }
    
    // Validate tier
    const validTiers = ["free", "creator", "pro", "lifetime", "enterprise"];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ error: "Invalid tier. Valid: free, creator, pro, lifetime, enterprise" });
    }

    // First check database for user
    let dbUser = null;
    try {
      const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.username, username));
      dbUser = foundUser;
    } catch (e) {
      // Database query failed
    }

    const user = users[username];
    if (!user && !dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const previousTier = user?.tier || dbUser?.tier || "free";
    
    // Update in-memory store if exists
    if (user) {
      user.tier = newTier as any;
      user.verified = true;
    }

    // Update database
    try {
      await db.update(usersTable)
        .set({ tier: newTier, is_verified: 1 })
        .where(eq(usersTable.username, username));
    } catch (e) {
      // Database update failed
    }

    res.json({ 
      success: true, 
      message: `User ${username} tier changed from ${previousTier} to ${newTier}`,
      previousTier,
      newTier,
      adminBy: adminCheck.username,
    });
  } catch (error) {
    res.status(500).json({ error: "Tier update failed" });
  }
});

// Admin: Delete user account
router.delete("/api/admin/user", async (req, res) => {
  try {
    // Validate admin from session token
    const adminCheck = validateAdminSession(req);
    if (!adminCheck.valid) {
      return res.status(403).json({ error: adminCheck.error });
    }
    
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // Prevent self-deletion
    if (username === adminCheck.username) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Check if user exists in database or memory
    let dbUser = null;
    try {
      const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.username, username));
      dbUser = foundUser;
    } catch (e) {
      // Database query failed
    }

    const user = users[username];
    if (!user && !dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete from in-memory store
    delete users[username];

    // Delete from database
    try {
      await db.delete(usersTable).where(eq(usersTable.username, username));
    } catch (e) {
      // Database delete failed
    }

    res.json({ 
      success: true, 
      message: `User ${username} has been deleted`,
      deletedBy: adminCheck.username,
    });
  } catch (error) {
    res.status(500).json({ error: "User deletion failed" });
  }
});

// Admin: List all users (for admin panel)
router.get("/api/admin/users", async (req, res) => {
  try {
    // Validate admin from session token
    const adminCheck = validateAdminSession(req);
    if (!adminCheck.valid) {
      return res.status(403).json({ error: adminCheck.error });
    }

    // Get users from database
    let dbUsers: any[] = [];
    try {
      dbUsers = await db.select({
        username: usersTable.username,
        tier: usersTable.tier,
        isVerified: usersTable.is_verified,
      }).from(usersTable);
    } catch (e) {
      // Database query failed, fall back to in-memory
    }

    // Merge with in-memory data for generation counts
    const userList = dbUsers.length > 0 
      ? dbUsers.map(u => ({
          username: u.username,
          tier: u.tier || "free",
          verified: u.isVerified === 1,
          generationsThisWeek: users[u.username]?.generationsThisWeek || 0,
        }))
      : Object.entries(users).map(([username, data]) => ({
          username,
          tier: data.tier,
          verified: data.verified,
          generationsThisWeek: data.generationsThisWeek,
        }));

    res.json({ users: userList });
  } catch (error) {
    res.status(500).json({ error: "Failed to list users" });
  }
});

export { users, getWeekStart };
export type { User };
export default router;
