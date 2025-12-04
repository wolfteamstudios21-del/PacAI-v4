export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { projectId, name } = req.body || {};
  if (!projectId) return res.status(400).json({ error: "projectId required" });
  
  const snapshotId = `snap_${Math.random().toString(36).slice(2, 10)}`;
  res.status(201).json({
    snapshot_id: snapshotId,
    project_id: projectId,
    name: name || `Snapshot ${new Date().toLocaleString()}`,
    created_at: new Date().toISOString(),
    zone_state: { entities: 200, terrain: "processed" }
  });
}
