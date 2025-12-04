export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { scenario_id, engine } = req.body || {};
  if (!scenario_id || !engine) return res.status(400).json({ error: "scenario_id and engine required" });
  const exportId = `exp_${Math.random().toString(36).slice(2,10)}`;
  // In prod push to queue
  res.status(201).json({ export_id: exportId, status: "queued", bundle_url: `/api/v4/export/${exportId}/download` });
}
