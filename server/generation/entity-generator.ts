/**
 * PacAI v5 Entity Generator
 * Creates NPCs, vehicles, and other entities with behaviors
 */

import { DeterministicRNG } from './rng';
import type { Entity, EntityType, EntityStats, Loadout, BehaviorState, BehaviorType, World, POI } from './types';

const ENTITY_ARCHETYPES: Record<EntityType, {
  stats: Partial<EntityStats>;
  loadouts: Loadout[];
  behaviors: BehaviorType[];
}> = {
  infantry: {
    stats: { max_health: 100, speed: 5, accuracy: 0.7, stealth: 0.3, perception: 0.6, armor: 0.2 },
    loadouts: [
      { primary_weapon: 'assault_rifle', secondary_weapon: 'pistol', equipment: ['grenade', 'medkit'], ammo: { rifle: 180, pistol: 45 } },
      { primary_weapon: 'smg', secondary_weapon: 'pistol', equipment: ['flashbang', 'smoke'], ammo: { smg: 200, pistol: 45 } }
    ],
    behaviors: ['patrol', 'guard', 'engage', 'cover']
  },
  scout: {
    stats: { max_health: 75, speed: 7, accuracy: 0.6, stealth: 0.7, perception: 0.9, armor: 0.1 },
    loadouts: [
      { primary_weapon: 'marksman_rifle', secondary_weapon: 'pistol', equipment: ['binoculars', 'radio'], ammo: { rifle: 60, pistol: 30 } }
    ],
    behaviors: ['patrol', 'search', 'investigate', 'retreat']
  },
  sniper: {
    stats: { max_health: 70, speed: 4, accuracy: 0.95, stealth: 0.8, perception: 0.95, armor: 0.1 },
    loadouts: [
      { primary_weapon: 'sniper_rifle', secondary_weapon: 'pistol', equipment: ['ghillie', 'rangefinder'], ammo: { sniper: 30, pistol: 30 } }
    ],
    behaviors: ['guard', 'engage', 'cover']
  },
  heavy: {
    stats: { max_health: 150, speed: 3, accuracy: 0.5, stealth: 0.1, perception: 0.5, armor: 0.6 },
    loadouts: [
      { primary_weapon: 'lmg', secondary_weapon: 'pistol', equipment: ['ammo_box', 'armor_plates'], ammo: { lmg: 400, pistol: 30 } }
    ],
    behaviors: ['guard', 'engage', 'support']
  },
  medic: {
    stats: { max_health: 90, speed: 5, accuracy: 0.5, stealth: 0.3, perception: 0.6, armor: 0.2 },
    loadouts: [
      { primary_weapon: 'smg', secondary_weapon: 'pistol', equipment: ['medkit', 'medkit', 'defibrillator'], ammo: { smg: 120, pistol: 30 } }
    ],
    behaviors: ['follow', 'heal', 'support', 'retreat']
  },
  engineer: {
    stats: { max_health: 95, speed: 4, accuracy: 0.55, stealth: 0.3, perception: 0.6, armor: 0.3 },
    loadouts: [
      { primary_weapon: 'shotgun', secondary_weapon: 'pistol', equipment: ['toolkit', 'mines', 'turret'], ammo: { shotgun: 32, pistol: 30 } }
    ],
    behaviors: ['guard', 'repair', 'support']
  },
  officer: {
    stats: { max_health: 100, speed: 5, accuracy: 0.75, stealth: 0.4, perception: 0.8, armor: 0.3 },
    loadouts: [
      { primary_weapon: 'assault_rifle', secondary_weapon: 'pistol', equipment: ['radio', 'binoculars', 'smoke'], ammo: { rifle: 150, pistol: 45 } }
    ],
    behaviors: ['patrol', 'guard', 'engage', 'flank']
  },
  civilian: {
    stats: { max_health: 50, speed: 4, accuracy: 0.2, stealth: 0.5, perception: 0.4, armor: 0 },
    loadouts: [
      { equipment: [], ammo: {} }
    ],
    behaviors: ['idle', 'retreat']
  },
  vip: {
    stats: { max_health: 80, speed: 4, accuracy: 0.3, stealth: 0.2, perception: 0.5, armor: 0.1 },
    loadouts: [
      { secondary_weapon: 'pistol', equipment: ['radio'], ammo: { pistol: 15 } }
    ],
    behaviors: ['follow', 'retreat']
  },
  hostile: {
    stats: { max_health: 80, speed: 5, accuracy: 0.5, stealth: 0.4, perception: 0.5, armor: 0.2 },
    loadouts: [
      { primary_weapon: 'assault_rifle', equipment: ['grenade'], ammo: { rifle: 90 } },
      { primary_weapon: 'smg', equipment: [], ammo: { smg: 120 } }
    ],
    behaviors: ['patrol', 'search', 'engage', 'pursue']
  },
  vehicle_light: {
    stats: { max_health: 300, speed: 15, accuracy: 0.6, stealth: 0, perception: 0.7, armor: 0.4 },
    loadouts: [
      { primary_weapon: 'mounted_mg', equipment: ['radio'], ammo: { mg: 500 } }
    ],
    behaviors: ['patrol', 'pursue', 'engage']
  },
  vehicle_heavy: {
    stats: { max_health: 800, speed: 8, accuracy: 0.7, stealth: 0, perception: 0.6, armor: 0.9 },
    loadouts: [
      { primary_weapon: 'cannon', secondary_weapon: 'coax_mg', equipment: ['smoke_launcher'], ammo: { cannon: 40, mg: 1000 } }
    ],
    behaviors: ['patrol', 'engage', 'support']
  },
  aircraft: {
    stats: { max_health: 200, speed: 50, accuracy: 0.5, stealth: 0.1, perception: 0.9, armor: 0.3 },
    loadouts: [
      { primary_weapon: 'rockets', secondary_weapon: 'gun_pod', equipment: ['flares'], ammo: { rockets: 16, gun: 500 } }
    ],
    behaviors: ['patrol', 'engage', 'support']
  },
  drone: {
    stats: { max_health: 50, speed: 20, accuracy: 0.4, stealth: 0.6, perception: 0.95, armor: 0 },
    loadouts: [
      { equipment: ['camera', 'radio'], ammo: {} }
    ],
    behaviors: ['patrol', 'search', 'investigate']
  }
};

const FACTION_NAMES: Record<string, string[]> = {
  alpha: ['Alpha-1', 'Alpha-2', 'Alpha-3', 'Bravo-1', 'Bravo-2', 'Charlie-1'],
  bravo: ['Echo-1', 'Echo-2', 'Foxtrot-1', 'Foxtrot-2', 'Golf-1', 'Hotel-1'],
  hostile: ['Tango-1', 'Tango-2', 'X-Ray-1', 'X-Ray-2', 'Zulu-1', 'Victor-1'],
  neutral: ['Civilian', 'Worker', 'Trader', 'Medic', 'Engineer', 'Observer']
};

export function generateEntities(
  rng: DeterministicRNG,
  world: World,
  options: {
    density?: number;
    hostileRatio?: number;
    vehicleRatio?: number;
  } = {}
): Entity[] {
  const entities: Entity[] = [];
  const density = options.density || 0.5;
  const hostileRatio = options.hostileRatio || 0.3;
  const vehicleRatio = options.vehicleRatio || 0.1;

  for (const spawn of world.spawn_points) {
    const entity = generateEntity(rng, spawn.faction, spawn.type as EntityType, spawn.x, spawn.y);
    entities.push(entity);
  }

  for (const poi of world.pois) {
    const poiPopulation = Math.floor(poi.population * density);
    const faction = poi.faction || (rng.nextBool(hostileRatio) ? 'hostile' : rng.pick(['alpha', 'bravo', 'neutral']));
    
    for (let i = 0; i < poiPopulation; i++) {
      const isVehicle = rng.nextBool(vehicleRatio);
      const type = isVehicle 
        ? rng.pick(['vehicle_light', 'vehicle_heavy'] as EntityType[])
        : getEntityTypeForPOI(rng, poi, faction);
      
      const offsetX = rng.nextInt(-poi.radius, poi.radius);
      const offsetY = rng.nextInt(-poi.radius, poi.radius);
      
      const entity = generateEntity(rng, faction, type, poi.x + offsetX, poi.y + offsetY);
      entities.push(entity);
    }
  }

  return entities;
}

function getEntityTypeForPOI(rng: DeterministicRNG, poi: POI, faction: string): EntityType {
  if (faction === 'neutral') {
    return rng.pick(['civilian', 'civilian', 'civilian', 'vip'] as EntityType[]);
  }
  
  if (faction === 'hostile') {
    return rng.pick(['hostile', 'hostile', 'scout', 'sniper'] as EntityType[]);
  }
  
  const typeWeights: Record<string, EntityType[]> = {
    base: ['infantry', 'infantry', 'officer', 'medic', 'engineer', 'heavy'],
    outpost: ['scout', 'infantry', 'sniper'],
    checkpoint: ['infantry', 'infantry', 'officer'],
    depot: ['infantry', 'engineer', 'civilian'],
    hospital: ['medic', 'medic', 'civilian'],
    factory: ['engineer', 'civilian', 'infantry']
  };
  
  const pool = typeWeights[poi.type] || ['infantry', 'scout'];
  return rng.pick(pool);
}

export function generateEntity(
  rng: DeterministicRNG,
  faction: string,
  type: EntityType,
  x: number,
  y: number
): Entity {
  const archetype = ENTITY_ARCHETYPES[type] || ENTITY_ARCHETYPES.infantry;
  const baseStats = archetype.stats;
  
  const stats: EntityStats = {
    health: baseStats.max_health || 100,
    max_health: baseStats.max_health || 100,
    stamina: 100,
    morale: rng.nextFloat(0.5, 1.0),
    accuracy: (baseStats.accuracy || 0.5) + rng.nextFloat(-0.1, 0.1),
    stealth: (baseStats.stealth || 0.3) + rng.nextFloat(-0.1, 0.1),
    perception: (baseStats.perception || 0.5) + rng.nextFloat(-0.1, 0.1),
    speed: (baseStats.speed || 5) + rng.nextFloat(-0.5, 0.5),
    armor: baseStats.armor || 0
  };

  Object.keys(stats).forEach(key => {
    const k = key as keyof EntityStats;
    if (typeof stats[k] === 'number' && k !== 'health' && k !== 'max_health' && k !== 'stamina') {
      stats[k] = Math.max(0, Math.min(1, stats[k]));
    }
  });

  const loadout = rng.pick(archetype.loadouts);
  const behaviorRng = rng.fork(`behavior_${x}_${y}`);
  
  const behavior: BehaviorState = {
    current: rng.pick(archetype.behaviors),
    alert_level: rng.nextFloat(0, 0.3),
    rng_state: behaviorRng.getSeed()
  };

  if (behavior.current === 'patrol') {
    behavior.patrol_route = generatePatrolRoute(rng, x, y, 5);
    behavior.patrol_index = 0;
  }

  if (behavior.current === 'guard') {
    behavior.destination = { x, y };
  }

  const names = FACTION_NAMES[faction] || FACTION_NAMES.neutral;
  const name = `${rng.pick(names)}-${rng.nextInt(1, 99)}`;

  return {
    id: `entity_${rng.getSeed().substring(0, 6)}_${Date.now() % 10000}`,
    type,
    name,
    faction,
    position: { x, y, z: 0 },
    rotation: rng.nextFloat(0, 360),
    stats,
    loadout: { ...loadout },
    behavior,
    alive: true,
    spawned_at: Date.now()
  };
}

function generatePatrolRoute(rng: DeterministicRNG, startX: number, startY: number, points: number): Array<{x: number; y: number}> {
  const route: Array<{x: number; y: number}> = [{ x: startX, y: startY }];
  
  let x = startX, y = startY;
  for (let i = 1; i < points; i++) {
    x += rng.nextInt(-3, 3);
    y += rng.nextInt(-3, 3);
    route.push({ x, y });
  }
  
  return route;
}

export function tickEntity(entity: Entity, world: World, allEntities: Entity[], deltaTime: number): Partial<Entity> {
  const changes: Partial<Entity> = {};
  const rng = new DeterministicRNG(entity.behavior.rng_state);

  switch (entity.behavior.current) {
    case 'patrol':
      changes.position = tickPatrol(entity, rng, deltaTime);
      break;
    case 'guard':
      changes.behavior = tickGuard(entity, allEntities, rng);
      break;
    case 'search':
      changes.position = tickSearch(entity, rng, deltaTime);
      break;
    case 'pursue':
      if (entity.behavior.target) {
        const target = allEntities.find(e => e.id === entity.behavior.target);
        if (target) {
          changes.position = moveToward(entity.position, target.position, entity.stats.speed * deltaTime);
        }
      }
      break;
    case 'engage':
      changes.behavior = tickEngage(entity, allEntities, rng);
      break;
    case 'retreat':
      changes.position = tickRetreat(entity, rng, deltaTime);
      break;
    case 'idle':
    default:
      if (rng.nextBool(0.01)) {
        changes.rotation = entity.rotation + rng.nextFloat(-30, 30);
      }
      break;
  }

  entity.behavior.rng_state = rng.getSeed();
  
  return changes;
}

function tickPatrol(entity: Entity, rng: DeterministicRNG, deltaTime: number): Entity['position'] {
  const route = entity.behavior.patrol_route;
  if (!route || route.length === 0) return entity.position;
  
  const targetIdx = entity.behavior.patrol_index || 0;
  const target = route[targetIdx];
  
  const dist = distance(entity.position, { x: target.x, y: target.y, z: 0 });
  
  if (dist < 0.5) {
    entity.behavior.patrol_index = (targetIdx + 1) % route.length;
    return entity.position;
  }
  
  return moveToward(entity.position, { x: target.x, y: target.y, z: 0 }, entity.stats.speed * deltaTime);
}

function tickGuard(entity: Entity, allEntities: Entity[], rng: DeterministicRNG): BehaviorState {
  const hostiles = allEntities.filter(e => 
    e.faction !== entity.faction && 
    e.faction !== 'neutral' &&
    e.alive &&
    distance(entity.position, e.position) < 15 * entity.stats.perception
  );
  
  if (hostiles.length > 0) {
    const nearest = hostiles.sort((a, b) => 
      distance(entity.position, a.position) - distance(entity.position, b.position)
    )[0];
    
    return {
      ...entity.behavior,
      current: 'engage',
      target: nearest.id,
      alert_level: Math.min(1, entity.behavior.alert_level + 0.3)
    };
  }
  
  return entity.behavior;
}

function tickSearch(entity: Entity, rng: DeterministicRNG, deltaTime: number): Entity['position'] {
  if (!entity.behavior.destination || rng.nextBool(0.1)) {
    entity.behavior.destination = {
      x: entity.position.x + rng.nextInt(-5, 5),
      y: entity.position.y + rng.nextInt(-5, 5)
    };
  }
  
  const target = { x: entity.behavior.destination.x, y: entity.behavior.destination.y, z: 0 };
  return moveToward(entity.position, target, entity.stats.speed * 0.7 * deltaTime);
}

function tickEngage(entity: Entity, allEntities: Entity[], rng: DeterministicRNG): BehaviorState {
  if (!entity.behavior.target) {
    return { ...entity.behavior, current: 'search' };
  }
  
  const target = allEntities.find(e => e.id === entity.behavior.target);
  if (!target || !target.alive) {
    return { ...entity.behavior, current: 'search', target: undefined };
  }
  
  const dist = distance(entity.position, target.position);
  
  if (dist > 20) {
    return { ...entity.behavior, current: 'pursue' };
  }
  
  if (entity.stats.health < entity.stats.max_health * 0.2 && rng.nextBool(0.3)) {
    return { ...entity.behavior, current: 'retreat', target: undefined };
  }
  
  return entity.behavior;
}

function tickRetreat(entity: Entity, rng: DeterministicRNG, deltaTime: number): Entity['position'] {
  const retreatDir = rng.nextFloat(0, Math.PI * 2);
  return {
    x: entity.position.x + Math.cos(retreatDir) * entity.stats.speed * deltaTime,
    y: entity.position.y + Math.sin(retreatDir) * entity.stats.speed * deltaTime,
    z: entity.position.z
  };
}

function moveToward(from: {x: number; y: number; z: number}, to: {x: number; y: number; z: number}, speed: number): {x: number; y: number; z: number} {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < speed) {
    return { x: to.x, y: to.y, z: from.z };
  }
  
  return {
    x: from.x + (dx / dist) * speed,
    y: from.y + (dy / dist) * speed,
    z: from.z
  };
}

function distance(a: {x: number; y: number; z?: number}, b: {x: number; y: number; z?: number}): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getEntitySummary(entities: Entity[]): {
  total: number;
  by_faction: Record<string, number>;
  by_type: Record<string, number>;
  alive: number;
  combat_ready: number;
} {
  const byFaction: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let alive = 0;
  let combatReady = 0;
  
  for (const entity of entities) {
    byFaction[entity.faction] = (byFaction[entity.faction] || 0) + 1;
    byType[entity.type] = (byType[entity.type] || 0) + 1;
    if (entity.alive) {
      alive++;
      if (entity.stats.health > entity.stats.max_health * 0.5 && entity.stats.stamina > 30) {
        combatReady++;
      }
    }
  }
  
  return {
    total: entities.length,
    by_faction: byFaction,
    by_type: byType,
    alive,
    combat_ready: combatReady
  };
}
