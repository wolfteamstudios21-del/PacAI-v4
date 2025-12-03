import { Router, type Request, type Response } from "express";
import { createProject, applyOverride } from "./projects";
import { getProject, listProjects, getAuditLog, addAudit, saveProject } from "./db";
import { getUser, getWeekStart } from "./auth";
import { 
  generateFullWorld, 
  getSummary, 
  DeterministicRNG,
  parseOverrideCommand,
  applyOverride as applyGenerationOverride,
  tickEntity,
  getWorldSummary,
  getEntitySummary,
  getNarrativeSummary
} from "./generation";
import type { GenerationResult, Entity, World, Narrative } from "./generation";

const router = Router();

const projectStates: Map<string, {
  result: GenerationResult;
  entities: Entity[];
  tick: number;
}> = new Map();

router.get("/v5/projects", async (req, res) => {
  res.json(await listProjects());
});

router.post("/v5/projects", async (req, res) => {
  const p = await createProject();
  res.json(p);
});

router.get("/v5/projects/:id", async (req, res) => {
  const p = await getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  
  const state = projectStates.get(req.params.id);
  if (state) {
    (p as any).generated = {
      world: getWorldSummary(state.result.world),
      entities: getEntitySummary(state.entities),
      narrative: getNarrativeSummary(state.result.narrative),
      tick: state.tick
    };
  }
  
  res.json(p);
});

router.get("/v5/projects/:id/world", async (req, res) => {
  const state = projectStates.get(req.params.id);
  if (!state) {
    return res.status(404).json({ error: "World not generated yet" });
  }
  
  res.json({
    world: state.result.world,
    summary: getWorldSummary(state.result.world)
  });
});

router.get("/v5/projects/:id/entities", async (req, res) => {
  const state = projectStates.get(req.params.id);
  if (!state) {
    return res.status(404).json({ error: "World not generated yet" });
  }
  
  res.json({
    entities: state.entities,
    summary: getEntitySummary(state.entities)
  });
});

router.get("/v5/projects/:id/narrative", async (req, res) => {
  const state = projectStates.get(req.params.id);
  if (!state) {
    return res.status(404).json({ error: "World not generated yet" });
  }
  
  res.json({
    narrative: state.result.narrative,
    summary: getNarrativeSummary(state.result.narrative)
  });
});

router.post("/v5/projects/:id/generate", async (req, res) => {
  const { prompt, username, options = {} } = req.body;
  let p = await getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });

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

  const seed = options.seed || `${p.seed}_${Date.now()}`;
  const biomeHints = extractBiomeFromPrompt(prompt || '');
  
  const steps = [
    { step: 1, total: 6, message: "Analyzing scenario parameters..." },
    { step: 2, total: 6, message: "Generating terrain and heightmap..." },
    { step: 3, total: 6, message: "Placing points of interest and roads..." },
    { step: 4, total: 6, message: "Spawning entities and factions..." },
    { step: 5, total: 6, message: "Building narrative and missions..." },
    { step: 6, total: 6, message: "Finalizing world state..." }
  ];

  try {
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 300));
      res.write(`data: ${JSON.stringify(steps[i])}\n\n`);
    }

    const result = await generateFullWorld({
      seed,
      width: options.width || 64,
      height: options.height || 64,
      primaryBiome: biomeHints || options.biome,
      density: options.density || 0.5,
      hostileRatio: options.hostileRatio || 0.3,
      difficulty: options.difficulty || 0.5,
      useAI: options.useAI !== false
    });

    for (let i = 3; i < 6; i++) {
      await new Promise(r => setTimeout(r, 200));
      res.write(`data: ${JSON.stringify(steps[i])}\n\n`);
    }

    projectStates.set(p.id, {
      result,
      entities: result.entities,
      tick: 0
    });

    p.state = {
      biome: result.world.tiles[0]?.[0]?.biome || 'urban',
      npcs: result.entities.length,
      aggression: result.narrative.global_tension,
      weather: result.world.weather.condition,
      seed: result.metadata.seed,
      checksum: result.metadata.checksum
    };
    p.history.push({ 
      type: "generation", 
      prompt, 
      seed: result.metadata.seed,
      ts: Date.now() 
    });

    await saveProject(p);
    await addAudit({ 
      type: "generation", 
      projectId: p.id, 
      prompt,
      seed: result.metadata.seed,
      checksum: result.metadata.checksum
    });

    const summary = getSummary(result);
    
    res.write(`data: ${JSON.stringify({ 
      done: true, 
      project: p,
      generation: {
        seed: result.metadata.seed,
        generation_time_ms: result.metadata.generation_time_ms,
        world: summary.world,
        entities: summary.entities,
        narrative: summary.narrative,
        checksum: result.metadata.checksum
      }
    })}\n\n`);
    
  } catch (error) {
    console.error("Generation error:", error);
    res.write(`data: ${JSON.stringify({ 
      error: true, 
      message: error instanceof Error ? error.message : "Generation failed" 
    })}\n\n`);
  }
  
  res.end();
});

router.post("/v5/projects/:id/tick", async (req, res) => {
  const { deltaTime = 1 } = req.body;
  const state = projectStates.get(req.params.id);
  
  if (!state) {
    return res.status(404).json({ error: "World not generated yet" });
  }

  const updates: Array<{id: string; changes: Partial<Entity>}> = [];
  const events: Array<{type: string; data: any}> = [];

  for (const entity of state.entities) {
    if (!entity.alive) continue;
    
    const changes = tickEntity(entity, state.result.world, state.entities, deltaTime);
    if (Object.keys(changes).length > 0) {
      Object.assign(entity, changes);
      updates.push({ id: entity.id, changes });
    }
  }

  state.tick++;

  const combatEvents = detectCombatEvents(state.entities);
  events.push(...combatEvents);

  res.json({
    tick: state.tick,
    deltaTime,
    entity_updates: updates.length,
    events,
    summary: getEntitySummary(state.entities)
  });
});

router.post("/v5/projects/:id/override", async (req, res) => {
  const { command, user = "anonymous" } = req.body;
  let p = await getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });

  const state = projectStates.get(req.params.id);
  
  const parsedOverride = parseOverrideCommand(command);
  
  if (parsedOverride && state) {
    const rng = new DeterministicRNG(`override_${Date.now()}`);
    const overrideResult = applyGenerationOverride(
      parsedOverride,
      state.result.world,
      state.entities,
      state.result.narrative,
      rng
    );

    if (overrideResult.success) {
      if (overrideResult.changes.entities_added) {
        state.entities.push(...overrideResult.changes.entities_added);
      }
      if (overrideResult.changes.entities_removed) {
        const removed = new Set(overrideResult.changes.entities_removed);
        state.entities = state.entities.filter(e => !removed.has(e.id));
      }
      if (overrideResult.changes.entities_modified) {
        for (const mod of overrideResult.changes.entities_modified) {
          const entity = state.entities.find(e => e.id === mod.id);
          if (entity) {
            Object.assign(entity, mod.changes);
          }
        }
      }
      if (overrideResult.changes.world) {
        Object.assign(state.result.world, overrideResult.changes.world);
      }

      p.state.npcs = state.entities.length;
      p.state.weather = state.result.world.weather.condition;
    }

    p.history.push({ 
      type: "override", 
      command, 
      user, 
      success: overrideResult.success,
      ts: Date.now() 
    });
    
    await saveProject(p);
    await addAudit({ 
      type: "override", 
      projectId: p.id, 
      command, 
      user,
      success: overrideResult.success
    });

    return res.json({
      project: p,
      override: overrideResult
    });
  }

  const updated = await applyOverride(req.params.id, command, user);
  if (!updated) return res.status(404).json({ error: "Project not found" });
  res.json(updated);
});

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

router.get("/v5/audit", async (req, res) => {
  res.json(await getAuditLog());
});

router.get("/v5/health", async (req, res) => {
  res.json({
    status: "operational",
    version: "v5.0.0",
    features: {
      procedural_generation: true,
      deterministic_worlds: true,
      entity_behaviors: true,
      narrative_ai: true,
      live_overrides: true,
      multi_engine_export: true
    },
    engines: ["UE5", "Unity", "Godot", "Roblox", "Blender", "CryEngine", "Source2", "WebGPU", "visionOS"]
  });
});

function extractBiomeFromPrompt(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('arctic') || lower.includes('snow') || lower.includes('frozen') || lower.includes('winter')) {
    return 'arctic';
  }
  if (lower.includes('desert') || lower.includes('sand') || lower.includes('arid')) {
    return 'desert';
  }
  if (lower.includes('urban') || lower.includes('city') || lower.includes('metro')) {
    return 'urban';
  }
  if (lower.includes('forest') || lower.includes('woods') || lower.includes('jungle')) {
    return 'forest';
  }
  if (lower.includes('facility') || lower.includes('base') || lower.includes('bunker')) {
    return 'facility';
  }
  if (lower.includes('mountain') || lower.includes('highland')) {
    return 'mountains';
  }
  if (lower.includes('coastal') || lower.includes('beach') || lower.includes('island')) {
    return 'coastal';
  }
  
  return undefined;
}

function detectCombatEvents(entities: Entity[]): Array<{type: string; data: any}> {
  const events: Array<{type: string; data: any}> = [];
  
  const engaging = entities.filter(e => e.alive && e.behavior.current === 'engage');
  for (const attacker of engaging) {
    if (attacker.behavior.target) {
      const target = entities.find(e => e.id === attacker.behavior.target);
      if (target && target.alive) {
        events.push({
          type: 'combat',
          data: {
            attacker: attacker.id,
            target: target.id,
            attacker_faction: attacker.faction,
            target_faction: target.faction
          }
        });
      }
    }
  }
  
  return events;
}

export default router;
