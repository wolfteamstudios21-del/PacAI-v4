export default async function handler(req, res) {
  res.json({
    licensed: true,
    hsm_device: "YubiHSM2",
    serial: "YH-000001-02",
    expiry: "2026-04-15",
    days_remaining: 141,
    seats_used: 1,
    seats_available: 10,
    offline_grace_period_remaining_hours: 720,
    signature: `ed25519_sig_${Math.random().toString(36).slice(2,20)}`
  });
}
