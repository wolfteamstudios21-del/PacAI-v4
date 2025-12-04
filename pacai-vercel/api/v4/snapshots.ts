export default async function handler(req, res) {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: "projectId required" });
  
  res.json({
    project_id: projectId,
    snapshots: [
      { id: "snap_001", name: "Initial Gen", created_at: "2025-11-20T10:00:00Z", zone_state: { entities: 200 } },
      { id: "snap_002", name: "After Override", created_at: "2025-11-21T12:30:00Z", zone_state: { entities: 215 } }
    ],
    total: 2
  });
}
