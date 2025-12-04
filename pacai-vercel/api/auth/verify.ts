import { getUser } from "../../lib/kv";

export default async function handler(req, res) {
  const username = String(req.query.username || "");
  if (!username) return res.status(400).json({ error: "Username required" });
  const user = await getUser(username);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ username, tier: user.tier, verified: user.verified });
}
