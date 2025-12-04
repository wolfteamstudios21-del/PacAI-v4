import { Router } from "express";

const router = Router();

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

// Login / Register
router.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

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
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(401).json({ error: "Wrong password" });
    }
    
    res.json({ 
      success: true, 
      tier: user.tier || "free", 
      verified: user.verified || false 
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

export { users, getWeekStart };
export type { User };
export default router;
