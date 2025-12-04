import { saveUser, getUser } from "../../lib/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  let user = await getUser(username);
  if (!user) {
    // create demo user
    user = await saveUser(username, {
      password,
      tier: "free",
      verified: false,
      generationsThisWeek: 0,
      lastGenerationReset: Date.now()
    });
  }

  if (user.password !== password) return res.status(401).json({ error: "Wrong password" });

  // For demo, we use username as API key: client should store and send it in X-API-KEY
  res.json({
    success: true,
    tier: user.tier,
    verified: user.verified,
    api_key: username
  });
}
