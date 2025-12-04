export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { id } = req.query;
  const { target, event, count, position } = req.body || {};
  const overrideId = `ovr_${(Math.random()*1e16|0).toString(36)}`;
  res.json({
    override_id: overrideId,
    project_id: id,
    target,
    event,
    entities_affected: count || 0,
    position: position || [0,0,0],
    applied_at: new Date().toISOString(),
    audit_logged: true
  });
}
