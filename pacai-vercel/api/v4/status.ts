export default async function handler(req, res) {
  res.json({
    status: "healthy",
    version: "4.0.0",
    hsm_primary: "YubiHSM2",
    hsm_primary_status: "active",
    hsm_fallback: "Nitrokey3",
    hsm_fallback_status: "active",
    offline_mode: true,
    active_shards: 18,
    queued_jobs: 0,
    avg_tick_ms: 120,
    worlds_online: 7,
    uptime_ms: Math.floor(process.uptime() * 1000)
  });
}
