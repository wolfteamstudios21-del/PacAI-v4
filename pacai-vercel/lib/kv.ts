import { kv } from "@vercel/kv";

/**
 * wrapper helpers for user records + projects
 */

export async function getUser(username: string) {
  const key = `user:${username}`;
  const data = await kv.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;
  // convert types
  return {
    username,
    password: data.password,
    tier: data.tier || "free",
    verified: data.verified === "true",
    generationsThisWeek: parseInt(data.generationsThisWeek || "0"),
    lastGenerationReset: parseInt(data.lastGenerationReset || "0")
  };
}

export async function saveUser(username: string, payload: Record<string, any>) {
  const key = `user:${username}`;
  const toStore: Record<string, string> = {};
  for (const k of Object.keys(payload)) {
    toStore[k] = String(payload[k]);
  }
  await kv.hset(key, toStore);
  return await getUser(username);
}

export async function listProjectsForDemo() {
  // small demo list stored in KV or static
  const projects = await kv.get("demo:projects");
  if (projects) return projects;
  const demo = [
    { id: "proj_demo_001", name: "Riftwars Master Map", template: "combat", created_at: "2025-11-20T10:00:00Z", license_valid: true },
    { id: "proj_demo_002", name: "Realm Unbound Metro", template: "urban", created_at: "2025-11-21T14:30:00Z", license_valid: true }
  ];
  await kv.set("demo:projects", demo);
  return demo;
}
