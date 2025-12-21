import { randomUUID } from "crypto";
import { saveProject, getProject, addAudit } from "./db";
import crypto from "crypto";

let seedCounter = 0;

export async function createProject(type = "game", warSimConfig?: any) {
  const id = randomUUID();
  const project: any = {
    id,
    created_at: Date.now(),
    type,
    seed: Date.now() + seedCounter++,
    state: { biome: "urban", npcs: 0, aggression: 0.5, weather: "clear" },
    history: [],
    checksum: "initial",
    warSimConfig: warSimConfig || null,
    warSimResults: []
  };
  await saveProject(project);
  await addAudit({ type: "project_created", projectId: id, user: "system" });
  return project;
}

export async function applyOverride(projectId: string, command: string, user: string) {
  let p = await getProject(projectId);
  if (!p) return null;

  const cmd = command.toLowerCase();
  
  // Parse simple overrides
  if (cmd.includes("spawn")) {
    const n = parseInt(command.match(/\d+/)?.[0] || "10");
    p.state.npcs += n;
  }
  if (cmd.includes("riot")) {
    p.state.npcs += 20;
  }
  if (cmd.includes("arctic")) p.state.biome = "arctic";
  if (cmd.includes("desert")) p.state.biome = "desert";
  if (cmd.includes("rain")) p.state.weather = "rain";
  if (cmd.includes("storm")) p.state.weather = "storm";
  if (cmd.includes("clear")) p.state.weather = "clear";
  if (cmd.includes("fog")) p.state.weather = "fog";
  if (cmd.includes("snow")) p.state.weather = "snow";
  if (cmd.includes("aggression")) {
    const val = parseFloat(command.match(/[+-]?\d+\.?\d*/)?.[0] || "0");
    p.state.aggression = Math.max(0, Math.min(1, p.state.aggression + val / 100));
  }

  p.history.push({ type: "override", command, user, ts: Date.now() });
  p.checksum = crypto.createHash("sha256").update(JSON.stringify(p.state)).digest("hex");

  await saveProject(p);
  await addAudit({ type: "override", projectId, command, user, checksum: p.checksum });
  return p;
}
