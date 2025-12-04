export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });
  res.json({
    id,
    name: "Riftwars Master Map",
    template: "combat",
    created_at: "2025-11-20T10:00:00Z",
    license_valid: true,
    snapshots: 7,
    last_snapshot: "2025-11-25T15:20:00Z"
  });
}
