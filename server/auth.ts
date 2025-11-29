import { Router } from "express";

const router = Router();
const users: Record<string, { password: string }> = {};

// Register
router.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  if (users[username]) return res.status(400).json({ error: "Username taken" });

  users[username] = { password }; // in production hash this!
  res.json({ success: true });
});

// Login
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Wrong username/password" });
  }
  res.json({ success: true });
});

export default router;
