export default async function handler(req, res) {
  const { exportId } = req.query;
  if (!exportId) return res.status(400).json({ error: "exportId required" });
  res.json({
    export_id: exportId,
    status: "completed",
    progress: 100,
    signed: true,
    checksum: `sha256_${Math.random().toString(36).slice(2,18)}`,
    size_bytes: 50 * 1024 * 1024,
    created_at: new Date(Date.now() - 300000).toISOString(),
    completed_at: new Date().toISOString()
  });
}
