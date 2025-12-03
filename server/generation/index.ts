/**
 * PacAI v5 Generation Engine
 * Main entry point for deterministic world, entity, and narrative generation
 */

export { DeterministicRNG, noise2D, octaveNoise } from './rng';

export { 
  generateWorld, 
  getWorldSummary 
} from './world-generator';

export { 
  generateEntities, 
  generateEntity, 
  tickEntity,
  getEntitySummary 
} from './entity-generator';

export { 
  generateNarrative, 
  getNarrativeSummary 
} from './narrative-generator';

export { 
  parseOverrideCommand, 
  validateOverride, 
  applyOverride,
  computeStateChecksum 
} from './override-handler';

export type {
  World,
  Tile,
  POI,
  Road,
  Zone,
  BiomeType,
  TerrainType,
  WeatherState,
  Entity,
  EntityType,
  EntityStats,
  Loadout,
  BehaviorState,
  BehaviorType,
  Faction,
  Mission,
  MissionType,
  Objective,
  Narrative,
  TimelineEvent,
  Override,
  OverrideType,
  GenerationResult,
  TickResult
} from './types';

import { DeterministicRNG } from './rng';
import { generateWorld, getWorldSummary } from './world-generator';
import { generateEntities, getEntitySummary } from './entity-generator';
import { generateNarrative, getNarrativeSummary } from './narrative-generator';
import type { GenerationResult, World, Entity, Narrative } from './types';
import crypto from 'crypto';

export interface GenerationOptions {
  seed?: string;
  width?: number;
  height?: number;
  primaryBiome?: string;
  density?: number;
  hostileRatio?: number;
  difficulty?: number;
  useAI?: boolean;
}

export async function generateFullWorld(options: GenerationOptions = {}): Promise<GenerationResult> {
  const startTime = Date.now();
  
  const seed = options.seed || `pacai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const rng = new DeterministicRNG(seed);
  
  const world = generateWorld(seed, {
    width: options.width || 64,
    height: options.height || 64,
    primaryBiome: options.primaryBiome as any,
    density: options.density || 0.5,
    difficulty: options.difficulty || 0.5
  });
  
  const entityRng = rng.fork('entities');
  const entities = generateEntities(entityRng, world, {
    density: options.density || 0.5,
    hostileRatio: options.hostileRatio || 0.3,
    vehicleRatio: 0.1
  });
  
  const narrativeRng = rng.fork('narrative');
  const narrative = await generateNarrative(narrativeRng, world, {
    factionCount: 4,
    missionCount: 3,
    useAI: options.useAI !== false,
    difficulty: options.difficulty || 0.5
  });
  
  const generationTime = Date.now() - startTime;
  
  const checksum = crypto.createHash('sha384')
    .update(JSON.stringify({ 
      world: world.checksum, 
      entities: entities.length,
      narrative: narrative.id 
    }))
    .digest('hex');
  
  return {
    world,
    entities,
    narrative,
    metadata: {
      seed,
      generated_at: new Date().toISOString(),
      generation_time_ms: generationTime,
      tile_count: world.dimensions.width * world.dimensions.height,
      entity_count: entities.length,
      poi_count: world.pois.length,
      checksum
    }
  };
}

export function getSummary(result: GenerationResult): {
  world: ReturnType<typeof getWorldSummary>;
  entities: ReturnType<typeof getEntitySummary>;
  narrative: ReturnType<typeof getNarrativeSummary>;
  metadata: GenerationResult['metadata'];
} {
  return {
    world: getWorldSummary(result.world),
    entities: getEntitySummary(result.entities),
    narrative: getNarrativeSummary(result.narrative),
    metadata: result.metadata
  };
}
