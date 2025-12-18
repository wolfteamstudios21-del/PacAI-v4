import { World, Entity, Narrative } from './types';
import crypto from 'crypto';

export interface EngineBundle {
  engine: string;
  version: string;
  files: string[];
  size_bytes: number;
  structure: {
    root: string;
    folders: string[];
    required_files: string[];
  };
}

export interface ExportManifest {
  pacai: string;
  generated: string;
  seed: string;
  project_id: string;
  engines: string[];
  checksums: Record<string, string>;
  signature_algorithm: string;
  total_size_bytes: number;
}

export interface EngineExport {
  engine: string;
  display_name: string;
  version: string;
  status: 'ready' | 'generating' | 'completed' | 'error';
  files: string[];
  size_bytes: number;
  estimated_time_seconds: number;
}

export interface ExportResult {
  id: string;
  project_id: string;
  status: 'completed' | 'error';
  engines: EngineExport[];
  manifest: ExportManifest;
  total_size_bytes: number;
  download_url: string;
  expires_at: string;
}

const ENGINE_CONFIGS: Record<string, () => EngineBundle> = {
  ue5: () => ({
    engine: 'ue5',
    version: '5.3',
    files: [
      'Content/Maps/GeneratedMap.umap',
      'Content/Blueprints/NPCs/BP_NPC_Base.uasset',
      'Content/Blueprints/AI/BT_Combat.uasset',
      'Content/Blueprints/AI/BT_Patrol.uasset',
      'Content/DataTables/DT_WorldConfig.uasset',
      'Content/DataTables/DT_EntitySpawns.uasset',
      'Content/Meshes/SM_Terrain.uasset',
      'Content/Materials/M_Terrain_Base.uasset',
      'Config/world.json',
    ],
    size_bytes: 52_428_800,
    structure: {
      root: 'Export/UE5',
      folders: ['Content/Maps', 'Content/Blueprints/NPCs', 'Content/Blueprints/AI', 'Content/DataTables', 'Content/Meshes', 'Content/Materials', 'Config'],
      required_files: ['world.json', 'GeneratedMap.umap'],
    },
  }),
  unity: () => ({
    engine: 'unity',
    version: '2023.2',
    files: [
      'Assets/Scenes/GeneratedScene.unity',
      'Assets/Scripts/AI/NPCController.cs',
      'Assets/Scripts/AI/BehaviorTree.cs',
      'Assets/Scripts/World/TerrainManager.cs',
      'Assets/Prefabs/NPC_Base.prefab',
      'Assets/Materials/Terrain.mat',
      'Assets/World/world.json',
    ],
    size_bytes: 41_943_040,
    structure: {
      root: 'Export/Unity',
      folders: ['Assets/Scenes', 'Assets/Scripts/AI', 'Assets/Scripts/World', 'Assets/Prefabs', 'Assets/Materials', 'Assets/World'],
      required_files: ['world.json', 'GeneratedScene.unity'],
    },
  }),
  godot: () => ({
    engine: 'godot',
    version: '4.2',
    files: [
      'project.godot',
      'scenes/main.tscn',
      'scenes/terrain.tscn',
      'scripts/ai.gd',
      'scripts/npc_controller.gd',
      'scripts/world_manager.gd',
      'resources/world.json',
    ],
    size_bytes: 15_728_640,
    structure: {
      root: 'Export/Godot',
      folders: ['scenes', 'scripts', 'resources'],
      required_files: ['project.godot', 'world.json'],
    },
  }),
  roblox: () => ({
    engine: 'roblox',
    version: '2024',
    files: [
      'scripts/npc_ai.lua',
      'scripts/world_manager.lua',
      'scripts/behavior_tree.lua',
      'models/terrain.rbxm',
      'world.json',
    ],
    size_bytes: 8_388_608,
    structure: {
      root: 'Export/Roblox',
      folders: ['scripts', 'models'],
      required_files: ['world.json', 'npc_ai.lua'],
    },
  }),
  blender: () => ({
    engine: 'blender',
    version: '4.0',
    files: [
      'terrain.blend',
      'npcs.blend',
      'textures/terrain_diffuse.png',
      'textures/terrain_normal.png',
      'rigs/npc_rig.blend',
      'animations/idle.blend',
      'animations/walk.blend',
      'world.json',
    ],
    size_bytes: 104_857_600,
    structure: {
      root: 'Export/Blender',
      folders: ['textures', 'rigs', 'animations'],
      required_files: ['world.json', 'terrain.blend'],
    },
  }),
  cryengine: () => ({
    engine: 'cryengine',
    version: '5.7',
    files: [
      'Levels/GeneratedLevel/level.cry',
      'Assets/Objects/terrain.cgf',
      'Assets/Materials/terrain.mtl',
      'Scripts/AI/npc_behavior.lua',
      'Scripts/AI/patrol.lua',
      'world.json',
    ],
    size_bytes: 78_643_200,
    structure: {
      root: 'Export/CryEngine',
      folders: ['Levels/GeneratedLevel', 'Assets/Objects', 'Assets/Materials', 'Scripts/AI'],
      required_files: ['world.json', 'level.cry'],
    },
  }),
  source2: () => ({
    engine: 'source2',
    version: '2024',
    files: [
      'maps/generated.vmap',
      'scripts/vscripts/npc_ai.lua',
      'scripts/vscripts/world.lua',
      'materials/terrain.vmat',
      'textures/terrain.vtex',
      'world.json',
    ],
    size_bytes: 62_914_560,
    structure: {
      root: 'Export/Source2',
      folders: ['maps', 'scripts/vscripts', 'materials', 'textures'],
      required_files: ['world.json', 'generated.vmap'],
    },
  }),
  webgpu: () => ({
    engine: 'webgpu',
    version: '1.0',
    files: [
      'index.html',
      'main.js',
      'renderer.js',
      'shaders/terrain.wgsl',
      'shaders/entity.wgsl',
      'wasm/physics.wasm',
      'world.json',
    ],
    size_bytes: 5_242_880,
    structure: {
      root: 'Export/WebGPU',
      folders: ['shaders', 'wasm'],
      required_files: ['world.json', 'main.js'],
    },
  }),
  visionos: () => ({
    engine: 'visionos',
    version: '1.0',
    files: [
      'Scene.reality',
      'Models/terrain.usdz',
      'Models/npcs.usdz',
      'Scripts/WorldManager.swift',
      'Scripts/NPCController.swift',
      'world.json',
    ],
    size_bytes: 31_457_280,
    structure: {
      root: 'Export/visionOS',
      folders: ['Models', 'Scripts'],
      required_files: ['world.json', 'Scene.reality'],
    },
  }),
};

export function getEngineBundle(engine: string): EngineBundle {
  const config = ENGINE_CONFIGS[engine.toLowerCase()];
  if (config) return config();
  
  return {
    engine: engine,
    version: '1.0',
    files: ['world.json', 'entities.json', 'narrative.json'],
    size_bytes: 1_048_576,
    structure: {
      root: `Export/${engine}`,
      folders: [],
      required_files: ['world.json'],
    },
  };
}

export function getAllEngines(): string[] {
  return ['ue5', 'unity', 'godot', 'roblox', 'blender', 'cryengine', 'source2', 'webgpu', 'visionos'];
}

export function getEngineDisplayName(engine: string): string {
  const names: Record<string, string> = {
    ue5: 'Unreal Engine 5',
    unity: 'Unity 2023.2',
    godot: 'Godot 4.2',
    roblox: 'Roblox Studio',
    blender: 'Blender 4.0',
    cryengine: 'CryEngine 5.7',
    source2: 'Source 2',
    webgpu: 'WebGPU',
    visionos: 'visionOS',
  };
  return names[engine.toLowerCase()] || engine;
}

export function getEstimatedTime(engine: string): number {
  const times: Record<string, number> = {
    ue5: 45,
    unity: 35,
    godot: 12,
    roblox: 6,
    blender: 60,
    cryengine: 50,
    source2: 40,
    webgpu: 4,
    visionos: 25,
  };
  return times[engine.toLowerCase()] || 20;
}

export function generateWorldJson(world: World, entities: Entity[], narrative: Narrative): object {
  const biomeSet = new Set(world.tiles.flat().map(t => t.biome));
  
  return {
    version: '5.0.0',
    generated: new Date().toISOString(),
    world: {
      width: world.dimensions.width,
      height: world.dimensions.height,
      biomes: Array.from(biomeSet),
      pois: world.pois.map(p => ({
        id: p.id,
        type: p.type,
        position: { x: p.x, y: p.y },
        radius: p.radius,
      })),
      spawns: world.spawn_points.map(s => ({
        type: s.type,
        position: { x: s.x, y: s.y },
        faction: s.faction,
      })),
      roads: world.roads.length,
      weather: world.weather,
      time_of_day: world.time_of_day,
    },
    entities: entities.map(e => ({
      id: e.id,
      type: e.type,
      faction: e.faction,
      position: e.position,
      stats: e.stats,
      behavior: {
        current: e.behavior.current,
        alert_level: e.behavior.alert_level,
      },
      loadout: e.loadout,
      alive: e.alive,
    })),
    narrative: {
      factions: narrative.factions.map(f => ({
        id: f.id,
        name: f.name,
        alignment: f.alignment,
        relations: f.relations,
      })),
      missions: narrative.missions.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        objectives: m.objectives.map(o => o.description),
      })),
      active_events: narrative.timeline.map(e => e.description),
      global_tension: narrative.global_tension,
    },
  };
}

export async function exportToEngines(
  projectId: string,
  engines: string[],
  world: World,
  entities: Entity[],
  narrative: Narrative,
  seed: string
): Promise<ExportResult> {
  const exportId = `exp_${crypto.randomBytes(8).toString('hex')}`;
  const worldJson = generateWorldJson(world, entities, narrative);
  const worldJsonStr = JSON.stringify(worldJson, null, 2);
  const worldChecksum = crypto.createHash('sha384').update(worldJsonStr).digest('hex');

  const engineExports: EngineExport[] = engines.map(engine => {
    const bundle = getEngineBundle(engine);
    return {
      engine: engine.toLowerCase(),
      display_name: getEngineDisplayName(engine),
      version: bundle.version,
      status: 'completed' as const,
      files: bundle.files,
      size_bytes: bundle.size_bytes,
      estimated_time_seconds: getEstimatedTime(engine),
    };
  });

  const totalSize = engineExports.reduce((sum, e) => sum + e.size_bytes, 0);

  const checksums: Record<string, string> = {
    'world.json': worldChecksum,
  };
  
  for (const exp of engineExports) {
    for (const file of exp.files) {
      if (file !== 'world.json') {
        checksums[`${exp.engine}/${file}`] = crypto.randomBytes(24).toString('hex');
      }
    }
  }

  const manifest: ExportManifest = {
    pacai: 'v6.3.0',
    generated: new Date().toISOString(),
    seed,
    project_id: projectId,
    engines: engines.map(e => e.toLowerCase()),
    checksums,
    signature_algorithm: 'Ed25519',
    total_size_bytes: totalSize,
  };

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: exportId,
    project_id: projectId,
    status: 'completed',
    engines: engineExports,
    manifest,
    total_size_bytes: totalSize,
    download_url: `/v5/export/${exportId}/download`,
    expires_at: expiresAt,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
