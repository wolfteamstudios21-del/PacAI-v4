import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, template } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const projectId = `proj_${crypto.randomBytes(8).toString("hex")}`;
  const project = { id: projectId, name, template: template || "default", created_at: new Date().toISOString(), license_valid: true };
  // store in KV optional: await kv.set(`project:${projectId}`, project)
  res.status(201).json(project);
}
