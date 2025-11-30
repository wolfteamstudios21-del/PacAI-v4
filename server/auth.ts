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

const users: Record<string, User> = {
  "WolfTeamstudio2": {
    password: "AdminTeam15",
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

// Dev-only upgrade endpoint
router.post("/api/upgrade", async (req, res) => {
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

export { users, getWeekStart };
export type { User };
export default router;
