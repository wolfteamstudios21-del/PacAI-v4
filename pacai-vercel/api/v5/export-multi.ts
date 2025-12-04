export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { scenario_id, engines } = req.body || {};
  if (!scenario_id || !engines || !Array.isArray(engines)) return res.status(400).json({ error: "scenario_id and engines array required" });
  
  const bundleId = `bundle_${Math.random().toString(36).slice(2, 10)}`;
  res.status(201).json({
    bundle_id: bundleId,
    status: "queued",
    engines: engines,
    manifest: {
      version: "5.0.0",
      engines_included: engines.length,
      deterministic_seed: Math.random().toString(36).slice(2, 15),
      created_at: new Date().toISOString()
    },
    download_url: `/api/v5/bundle/${bundleId}/download`
  });
}
