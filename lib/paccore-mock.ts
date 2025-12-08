/**
 * PacCore Mock Stub
 * 
 * This module provides mock implementations of the private PacCore library
 * for testing and development ramps. Replace with actual PacCore imports
 * when available.
 */

export interface PacCoreWorld {
  seed: number;
  biome: string;
  tiles: PacCoreTile[];
  weather: PacCoreWeather;
}

export interface PacCoreTile {
  x: number;
  y: number;
  z: number;
  type: string;
  elevation: number;
}

export interface PacCoreWeather {
  condition: 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
  intensity: number;
  windSpeed: number;
  windDirection: number;
}

export interface PacCoreEntity {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  health: number;
  behavior: string;
  faction: string;
}

export interface PacCoreNarrative {
  missions: PacCoreMission[];
  global_tension: number;
  active_events: string[];
}

export interface PacCoreMission {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  reward: number;
}

export interface PacCoreOverride {
  type: 'weather' | 'spawn' | 'event' | 'terrain';
  params: Record<string, any>;
  duration?: number;
}

/**
 * Mock deterministic RNG matching PacCore behavior
 */
export class MockDeterministicRNG {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

/**
 * Mock world generator matching PacCore output format
 */
export function mockGenerateWorld(seed: number): PacCoreWorld {
  const rng = new MockDeterministicRNG(seed);
  const biomes = ['urban', 'forest', 'desert', 'arctic', 'volcanic', 'oceanic'];
  const conditions: PacCoreWeather['condition'][] = ['clear', 'rain', 'snow', 'fog', 'storm'];
  
  const tiles: PacCoreTile[] = [];
  const tileCount = rng.nextInt(50, 200);
  
  for (let i = 0; i < tileCount; i++) {
    tiles.push({
      x: rng.next() * 100 - 50,
      y: rng.next() * 20,
      z: rng.next() * 100 - 50,
      type: rng.pick(['grass', 'stone', 'sand', 'snow', 'water']),
      elevation: rng.next() * 50
    });
  }
  
  return {
    seed,
    biome: rng.pick(biomes),
    tiles,
    weather: {
      condition: rng.pick(conditions),
      intensity: rng.next(),
      windSpeed: rng.next() * 30,
      windDirection: rng.next() * 360
    }
  };
}

/**
 * Mock entity spawner matching PacCore output format
 */
export function mockSpawnEntities(world: PacCoreWorld, count: number): PacCoreEntity[] {
  const rng = new MockDeterministicRNG(world.seed + 1);
  const types = ['soldier', 'vehicle', 'civilian', 'structure', 'wildlife'];
  const behaviors = ['patrol', 'guard', 'wander', 'flee', 'attack'];
  const factions = ['blue', 'red', 'neutral', 'hostile'];
  
  const entities: PacCoreEntity[] = [];
  
  for (let i = 0; i < count; i++) {
    entities.push({
      id: `entity_${world.seed}_${i}`,
      type: rng.pick(types),
      position: {
        x: rng.next() * 100 - 50,
        y: rng.next() * 10,
        z: rng.next() * 100 - 50
      },
      health: rng.nextInt(50, 100),
      behavior: rng.pick(behaviors),
      faction: rng.pick(factions)
    });
  }
  
  return entities;
}

/**
 * Mock narrative generator matching PacCore output format
 */
export function mockGenerateNarrative(world: PacCoreWorld): PacCoreNarrative {
  const rng = new MockDeterministicRNG(world.seed + 2);
  const missionCount = rng.nextInt(1, 5);
  
  const missions: PacCoreMission[] = [];
  const missionTypes = [
    { title: 'Recon Mission', desc: 'Scout the area for enemy activity' },
    { title: 'Extraction', desc: 'Extract the VIP from hostile territory' },
    { title: 'Defense', desc: 'Hold the position against enemy assault' },
    { title: 'Sabotage', desc: 'Destroy enemy infrastructure' },
    { title: 'Rescue', desc: 'Rescue hostages from enemy compound' }
  ];
  
  for (let i = 0; i < missionCount; i++) {
    const type = rng.pick(missionTypes);
    missions.push({
      id: `mission_${world.seed}_${i}`,
      title: type.title,
      description: type.desc,
      objectives: [
        'Complete primary objective',
        rng.next() > 0.5 ? 'Optional: Secure intel' : 'Optional: Minimize casualties'
      ],
      reward: rng.nextInt(100, 1000)
    });
  }
  
  return {
    missions,
    global_tension: rng.next(),
    active_events: rng.next() > 0.7 ? ['weather_event', 'enemy_reinforcements'] : []
  };
}

/**
 * Mock override applier
 */
export function mockApplyOverride(
  world: PacCoreWorld,
  override: PacCoreOverride
): PacCoreWorld {
  const updated = { ...world };
  
  switch (override.type) {
    case 'weather':
      updated.weather = {
        ...updated.weather,
        ...override.params
      };
      break;
    case 'terrain':
      break;
    default:
      break;
  }
  
  return updated;
}

export default {
  MockDeterministicRNG,
  mockGenerateWorld,
  mockSpawnEntities,
  mockGenerateNarrative,
  mockApplyOverride
};
