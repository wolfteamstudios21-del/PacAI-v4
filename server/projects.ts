import { randomUUID } from "crypto";
import { saveProject, getProject, addAudit } from "./db";
import crypto from "crypto";

let seedCounter = 0;

export async function createProject(type = "game") {
  const id = randomUUID();
  const project = {
    id,
    created_at: Date.now(),
    type,
    seed: Date.now() + seedCounter++,
    state: { biome: "urban", npcs: 0, aggression: 0.5, weather: "clear" },
    history: [],
    checksum: "initial"
  };
  await saveProject(project);
  await addAudit({ type: "project_created", projectId: id, user: "system" });
  return project;
}

export async function applyOverride(projectId: string, command: string, user: string) {
  let p = await getProject(projectId);
  if (!p) return null;

  // Parse simple overrides
  if (command.includes("spawn")) {
    const n = parseInt(command.match(/\d+/)?.[0] || "10");
    p.state.npcs += n;
  }
  if (command.includes("arctic")) p.state.biome = "arctic";
  if (command.includes("desert")) p.state.biome = "desert";
  if (command.includes("rain")) p.state.weather = "rainy";
  if (command.includes("aggression")) {
    const val = parseFloat(command.match(/-?\d+\.?\d*/)?.[0] || "0");
    p.state.aggression = Math.max(0, Math.min(1, p.state.aggression + val / 100));
  }

  p.history.push({ type: "override", command, user, ts: Date.now() });
  p.checksum = crypto.createHash("sha256").update(JSON.stringify(p.state)).digest("hex");

  await saveProject(p);
  await addAudit({ type: "override", projectId, command, user, checksum: p.checksum });
  return p;
}
