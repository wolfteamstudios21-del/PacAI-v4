import { getUser, saveUser } from "../../lib/kv";

export default async function handler(req, res) {
  const { username, tier } = req.query;
  if (!username || !tier) return res.status(400).json({ error: "username and tier required" });
  let user = await getUser(username);
  if (!user) return res.status(404).json({ error: "User not found" });
  user = await saveUser(username, { ...user, tier, verified: true });
  res.json({ success: true, message: `User upgraded to ${tier}` });
}
