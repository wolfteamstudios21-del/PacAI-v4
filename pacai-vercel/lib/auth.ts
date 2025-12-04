import { getUser } from "./kv";

export async function verifyApiKey(req) {
  // demo: accept X-API-KEY as username; in prod use JWT + HSM-signed tokens
  const apiKey = req.headers["x-api-key"] || req.headers["authorization"];
  if (!apiKey) return null;
  const username = String(apiKey).replace("Bearer ", "");
  const user = await getUser(username);
  return user;
}
