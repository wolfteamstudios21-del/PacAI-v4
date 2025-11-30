import { Router, type Request, type Response } from "express";
import { createProject, applyOverride } from "./projects";
import { getProject, listProjects, getAuditLog, addAudit } from "./db";
import { getUser, getWeekStart } from "./auth";

const router = Router();

// List projects
router.get("/v5/projects", async (req, res) => {
  res.json(await listProjects());
});

// Create new
router.post("/v5/projects", async (req, res) => {
  const p = await createProject();
  res.json(p);
});

// Get one project
router.get("/v5/projects/:id", async (req, res) => {
  const p = await getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

// Generate (streaming) - with tier enforcement
router.post("/v5/projects/:id/generate", async (req, res) => {
  const { prompt, username } = req.body;
  let p = await getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });

  // Tier enforcement
  if (username) {
    const user = getUser(username);
    if (user && user.tier === "free") {
      const weekStart = getWeekStart();
      if (user.lastGenerationReset < weekStart) {
        user.generationsThisWeek = 0;
        user.lastGenerationReset = weekStart;
      }
      if (user.generationsThisWeek >= 2) {
        return res.status(429).json({ error: "Free tier limit reached (2 per week)" });
      }
      user.generationsThisWeek++;
    }
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const steps = ["Analyzing prompt...", "Building terrain...", "Spawning NPCs...", "Finalizing..."];
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, 800));
    res.write(`data: ${JSON.stringify({ step: i + 1, total: steps.length, message: steps[i] })}\n\n`);
  }

  p.state.npcs = 5000 + Math.floor(Math.random() * 15000);
  p.history.push({ type: "generation", prompt, ts: Date.now() });
  await (await import("./db")).saveProject(p);
  await addAudit({ type: "generation", projectId: p.id, prompt });

  res.write(`data: ${JSON.stringify({ done: true, project: p })}\n\n`);
  res.end();
});

// Live override
router.post("/v5/projects/:id/override", async (req, res) => {
  const { command, user = "anonymous" } = req.body;
  const updated = await applyOverride(req.params.id, command, user);
  if (!updated) return res.status(404).json({ error: "Project not found" });
  res.json(updated);
});

// Audit stream
router.get("/v5/audit/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  res.write("data: Audit chain active\n\n");
  
  const logs = await getAuditLog();
  for (const log of logs) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }
});

// Audit history
router.get("/v5/audit", async (req, res) => {
  res.json(await getAuditLog());
});

export default router;
