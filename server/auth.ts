import { Router } from "express";

const router = Router();

// In-memory user store with tier tracking
interface User {
  password: string;
  tier: "free" | "creator" | "lifetime";
  generationsThisWeek: number;
  lastGenerationReset: number;
}

const users: Record<string, User> = {
  // Dev backdoor
  "WolfTeamstudio2": {
    password: "AdminTeam15",
    tier: "lifetime",
    generationsThisWeek: 0,
    lastGenerationReset: Date.now()
  }
};

// Get week start (Monday)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

// Register
router.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  if (users[username]) return res.status(400).json({ error: "Username taken" });

  users[username] = {
    password,
    tier: "free", // Default to free tier
    generationsThisWeek: 0,
    lastGenerationReset: getWeekStart()
  };
  
  res.json({ success: true, tier: "free" });
});

// Login
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Wrong username/password" });
  }

  // Reset weekly counter if needed
  const weekStart = getWeekStart();
  if (user.lastGenerationReset < weekStart) {
    user.generationsThisWeek = 0;
    user.lastGenerationReset = weekStart;
  }

  res.json({ 
    success: true, 
    tier: user.tier,
    generationsThisWeek: user.generationsThisWeek,
    generationLimit: user.tier === "free" ? 2 : user.tier === "creator" ? 100 : 999
  });
});

// Export user store for rate limiting in v4 routes
export { users, getWeekStart };
export type { User };
export default router;
