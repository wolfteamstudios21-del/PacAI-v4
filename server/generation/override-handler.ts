/**
 * PacAI v6.3 Override Handler
 * Validates and applies runtime behavior modifications
 */

import { DeterministicRNG } from './rng';
import type { Override, OverrideType, World, Entity, Narrative, WeatherState } from './types';
import { generateEntity } from './entity-generator';
import crypto from 'crypto';

export interface OverrideResult {
  success: boolean;
  override: Override;
  changes: {
    world?: Partial<World>;
    entities_added?: Entity[];
    entities_removed?: string[];
    entities_modified?: Array<{id: string; changes: Partial<Entity>}>;
    narrative?: Partial<Narrative>;
  };
  error?: string;
}

const OVERRIDE_LIMITS = {
  spawn_entity: { max_per_call: 50, cooldown_ms: 1000 },
  remove_entity: { max_per_call: 100, cooldown_ms: 500 },
  move_entity: { max_distance: 100, cooldown_ms: 100 },
  set_aggression: { min: 0, max: 1, cooldown_ms: 500 },
  damage: { min: 0, max: 1000, cooldown_ms: 100 },
  heal: { min: 0, max: 1000, cooldown_ms: 100 }
};

const lastOverrideTimes: Record<string, number> = {};

export function parseOverrideCommand(command: string): Override | null {
  const parts = command.toLowerCase().trim().split(/\s+/);
  
  const patterns: Array<{regex: RegExp; type: OverrideType; extractor: (match: RegExpMatchArray) => Record<string, any>}> = [
    {
      regex: /^spawn\s+(\d+)?\s*(infantry|scout|sniper|heavy|hostile|vehicle_light|vehicle_heavy|drone)(?:\s+at\s+(\d+)[,\s]+(\d+))?(?:\s+faction\s+(\w+))?$/i,
      type: 'spawn_entity',
      extractor: (m) => ({
        count: parseInt(m[1] || '1'),
        entity_type: m[2],
        x: m[3] ? parseInt(m[3]) : undefined,
        y: m[4] ? parseInt(m[4]) : undefined,
        faction: m[5] || 'hostile'
      })
    },
    {
      regex: /^remove\s+(entity_\w+|all\s+\w+)$/i,
      type: 'remove_entity',
      extractor: (m) => ({ target: m[1] })
    },
    {
      regex: /^move\s+(entity_\w+)\s+to\s+(\d+)[,\s]+(\d+)$/i,
      type: 'move_entity',
      extractor: (m) => ({ target: m[1], x: parseInt(m[2]), y: parseInt(m[3]) })
    },
    {
      regex: /^set\s+behavior\s+(entity_\w+)\s+(patrol|guard|search|engage|retreat|idle)$/i,
      type: 'set_behavior',
      extractor: (m) => ({ target: m[1], behavior: m[2] })
    },
    {
      regex: /^(?:set\s+)?aggression\s+([+-]?\d+(?:\.\d+)?)/i,
      type: 'set_aggression',
      extractor: (m) => ({ delta: parseFloat(m[1]) })
    },
    {
      regex: /^set\s+faction\s+(entity_\w+)\s+(\w+)$/i,
      type: 'set_faction',
      extractor: (m) => ({ target: m[1], faction: m[2] })
    },
    {
      regex: /^(?:set\s+)?weather\s+(clear|cloudy|rain|storm|snow|fog|sandstorm)(?:\s+intensity\s+(\d+))?$/i,
      type: 'set_weather',
      extractor: (m) => ({ condition: m[1], intensity: m[2] ? parseInt(m[2]) / 100 : 0.5 })
    },
    {
      regex: /^set\s+time\s+(\d+(?:\.\d+)?)$/i,
      type: 'set_time',
      extractor: (m) => ({ time: parseFloat(m[1]) })
    },
    {
      regex: /^trigger\s+(battle|disaster|reinforcement)\s+at\s+(\w+)$/i,
      type: 'trigger_event',
      extractor: (m) => ({ event_type: m[1], location: m[2] })
    },
    {
      regex: /^add\s+objective\s+"([^"]+)"(?:\s+at\s+(\d+)[,\s]+(\d+))?$/i,
      type: 'add_objective',
      extractor: (m) => ({ description: m[1], x: m[2] ? parseInt(m[2]) : undefined, y: m[3] ? parseInt(m[3]) : undefined })
    },
    {
      regex: /^complete\s+objective\s+(obj_\w+)$/i,
      type: 'complete_objective',
      extractor: (m) => ({ objective_id: m[1] })
    },
    {
      regex: /^damage\s+(entity_\w+)\s+(\d+)$/i,
      type: 'damage',
      extractor: (m) => ({ target: m[1], amount: parseInt(m[2]) })
    },
    {
      regex: /^heal\s+(entity_\w+)\s+(\d+)$/i,
      type: 'heal',
      extractor: (m) => ({ target: m[1], amount: parseInt(m[2]) })
    },
    {
      regex: /^arctic$/i,
      type: 'set_weather',
      extractor: () => ({ condition: 'snow', intensity: 0.7, biome_shift: 'arctic' })
    },
    {
      regex: /^desert$/i,
      type: 'set_weather',
      extractor: () => ({ condition: 'sandstorm', intensity: 0.5, biome_shift: 'desert' })
    },
    {
      regex: /^riot$/i,
      type: 'spawn_entity',
      extractor: () => ({ count: 20, entity_type: 'hostile', faction: 'hostile', spread: true })
    }
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern.regex);
    if (match) {
      return {
        id: `override_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: pattern.type,
        payload: pattern.extractor(match),
        user: 'system',
        timestamp: Date.now(),
        applied: false,
        validated: false
      };
    }
  }

  return null;
}

export function validateOverride(override: Override): {valid: boolean; error?: string} {
  const limits = OVERRIDE_LIMITS[override.type as keyof typeof OVERRIDE_LIMITS];
  
  if (limits?.cooldown_ms) {
    const lastTime = lastOverrideTimes[override.type] || 0;
    if (Date.now() - lastTime < limits.cooldown_ms) {
      return { valid: false, error: `Cooldown active for ${override.type}` };
    }
  }

  switch (override.type) {
    case 'spawn_entity':
      const count = override.payload.count || 1;
      const spawnLimits = OVERRIDE_LIMITS.spawn_entity;
      if (count > spawnLimits.max_per_call) {
        return { valid: false, error: `Cannot spawn more than ${spawnLimits.max_per_call} entities at once` };
      }
      break;
      
    case 'set_aggression':
      const delta = override.payload.delta;
      if (delta < -1 || delta > 1) {
        return { valid: false, error: 'Aggression delta must be between -1 and 1' };
      }
      break;
      
    case 'damage':
    case 'heal':
      const amount = override.payload.amount;
      if (amount < 0 || amount > 1000) {
        return { valid: false, error: 'Damage/heal amount must be between 0 and 1000' };
      }
      break;
      
    case 'move_entity':
      const { x, y } = override.payload;
      if (x < 0 || y < 0 || x > 1000 || y > 1000) {
        return { valid: false, error: 'Position out of bounds' };
      }
      break;
  }

  return { valid: true };
}

export function applyOverride(
  override: Override,
  world: World,
  entities: Entity[],
  narrative: Narrative,
  rng: DeterministicRNG
): OverrideResult {
  const validation = validateOverride(override);
  if (!validation.valid) {
    return {
      success: false,
      override: { ...override, validated: false },
      changes: {},
      error: validation.error
    };
  }

  override.validated = true;
  lastOverrideTimes[override.type] = Date.now();

  const result: OverrideResult = {
    success: true,
    override: { ...override, applied: true },
    changes: {}
  };

  switch (override.type) {
    case 'spawn_entity':
      result.changes.entities_added = handleSpawnEntity(override, world, rng);
      break;
      
    case 'remove_entity':
      result.changes.entities_removed = handleRemoveEntity(override, entities);
      break;
      
    case 'move_entity':
      result.changes.entities_modified = handleMoveEntity(override, entities);
      break;
      
    case 'set_behavior':
      result.changes.entities_modified = handleSetBehavior(override, entities);
      break;
      
    case 'set_aggression':
      result.changes.entities_modified = handleSetAggression(override, entities);
      break;
      
    case 'set_faction':
      result.changes.entities_modified = handleSetFaction(override, entities);
      break;
      
    case 'set_weather':
      result.changes.world = handleSetWeather(override, world);
      break;
      
    case 'set_time':
      result.changes.world = { time_of_day: override.payload.time % 24 };
      break;
      
    case 'damage':
    case 'heal':
      result.changes.entities_modified = handleDamageHeal(override, entities);
      break;
      
    case 'add_objective':
      result.changes.narrative = handleAddObjective(override, narrative, rng);
      break;
      
    case 'complete_objective':
      result.changes.narrative = handleCompleteObjective(override, narrative);
      break;
  }

  return result;
}

function handleSpawnEntity(override: Override, world: World, rng: DeterministicRNG): Entity[] {
  const { count = 1, entity_type, faction = 'hostile', spread = false } = override.payload;
  let { x, y } = override.payload;
  
  if (x === undefined || y === undefined) {
    const centerPOI = world.pois[Math.floor(rng.next() * world.pois.length)];
    x = centerPOI?.x ?? Math.floor(world.dimensions.width / 2);
    y = centerPOI?.y ?? Math.floor(world.dimensions.height / 2);
  }
  
  const newEntities: Entity[] = [];
  for (let i = 0; i < count; i++) {
    const spawnX = spread ? x + rng.nextInt(-10, 10) : x + rng.nextInt(-2, 2);
    const spawnY = spread ? y + rng.nextInt(-10, 10) : y + rng.nextInt(-2, 2);
    
    const entity = generateEntity(rng, faction, entity_type, spawnX, spawnY);
    newEntities.push(entity);
  }
  
  return newEntities;
}

function handleRemoveEntity(override: Override, entities: Entity[]): string[] {
  const { target } = override.payload;
  
  if (target.startsWith('all ')) {
    const faction = target.replace('all ', '');
    return entities.filter(e => e.faction === faction).map(e => e.id);
  }
  
  return entities.filter(e => e.id === target).map(e => e.id);
}

function handleMoveEntity(override: Override, entities: Entity[]): Array<{id: string; changes: Partial<Entity>}> {
  const { target, x, y } = override.payload;
  const entity = entities.find(e => e.id === target);
  
  if (!entity) return [];
  
  return [{
    id: target,
    changes: {
      position: { x, y, z: entity.position.z }
    }
  }];
}

function handleSetBehavior(override: Override, entities: Entity[]): Array<{id: string; changes: Partial<Entity>}> {
  const { target, behavior } = override.payload;
  const entity = entities.find(e => e.id === target);
  
  if (!entity) return [];
  
  return [{
    id: target,
    changes: {
      behavior: {
        ...entity.behavior,
        current: behavior,
        target: undefined,
        destination: undefined
      }
    }
  }];
}

function handleSetAggression(override: Override, entities: Entity[]): Array<{id: string; changes: Partial<Entity>}> {
  const { delta } = override.payload;
  
  return entities
    .filter(e => e.faction === 'hostile' && e.alive)
    .map(e => ({
      id: e.id,
      changes: {
        behavior: {
          ...e.behavior,
          alert_level: Math.max(0, Math.min(1, e.behavior.alert_level + delta))
        }
      }
    }));
}

function handleSetFaction(override: Override, entities: Entity[]): Array<{id: string; changes: Partial<Entity>}> {
  const { target, faction } = override.payload;
  const entity = entities.find(e => e.id === target);
  
  if (!entity) return [];
  
  return [{
    id: target,
    changes: { faction }
  }];
}

function handleSetWeather(override: Override, world: World): Partial<World> {
  const { condition, intensity = 0.5 } = override.payload;
  
  const weather: WeatherState = {
    ...world.weather,
    condition,
    intensity,
    visibility: condition === 'fog' ? 0.3 : condition === 'storm' ? 0.5 : 0.9,
    wind_speed: condition === 'storm' ? 40 : condition === 'sandstorm' ? 35 : 10
  };
  
  return { weather };
}

function handleDamageHeal(override: Override, entities: Entity[]): Array<{id: string; changes: Partial<Entity>}> {
  const { target, amount } = override.payload;
  const entity = entities.find(e => e.id === target);
  
  if (!entity) return [];
  
  const isHeal = override.type === 'heal';
  const newHealth = isHeal 
    ? Math.min(entity.stats.max_health, entity.stats.health + amount)
    : Math.max(0, entity.stats.health - amount);
  
  return [{
    id: target,
    changes: {
      stats: { ...entity.stats, health: newHealth },
      alive: newHealth > 0
    }
  }];
}

function handleAddObjective(override: Override, narrative: Narrative, rng: DeterministicRNG): Partial<Narrative> {
  const { description, x, y } = override.payload;
  const activeMission = narrative.missions.find(m => m.status === 'active');
  
  if (!activeMission) return {};
  
  const newObjective = {
    id: `obj_custom_${Date.now()}`,
    type: 'secondary' as const,
    description,
    location: x !== undefined ? { x, y } : undefined,
    progress: 0,
    completed: false
  };
  
  activeMission.objectives.push(newObjective);
  
  return { missions: narrative.missions };
}

function handleCompleteObjective(override: Override, narrative: Narrative): Partial<Narrative> {
  const { objective_id } = override.payload;
  
  for (const mission of narrative.missions) {
    const objective = mission.objectives.find(o => o.id === objective_id);
    if (objective) {
      objective.completed = true;
      objective.progress = 100;
      break;
    }
  }
  
  return { missions: narrative.missions };
}

export function computeStateChecksum(world: World, entities: Entity[], narrative: Narrative): string {
  const state = {
    world_checksum: world.checksum,
    entity_count: entities.length,
    entity_health_sum: entities.reduce((sum, e) => sum + e.stats.health, 0),
    narrative_tension: narrative.global_tension,
    timestamp: Date.now()
  };
  
  return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex').substring(0, 16);
}
