import { Router } from "express";
import { getChargeLogs, getChargeStats } from "../middleware/charge";

const router = Router();

router.get("/charges/stats", async (req, res) => {
  try {
    const stats = getChargeStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("[charges/stats] Error:", error);
    res.status(500).json({ error: "Failed to get charge stats" });
  }
});

router.get("/charges/logs", async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = getChargeLogs().slice(-Number(limit));
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error("[charges/logs] Error:", error);
    res.status(500).json({ error: "Failed to get charge logs" });
  }
});

export default router;
