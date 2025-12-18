/**
 * PacAI v6.3 World Generator
 * Deterministic procedural world generation from seed
 */

import { DeterministicRNG, octaveNoise, noise2D } from './rng';
import type { World, Tile, POI, Road, Zone, BiomeType, TerrainType, WeatherState } from './types';
import crypto from 'crypto';

const BIOME_CONFIGS: Record<BiomeType, {
  heightRange: [number, number];
  terrains: TerrainType[];
  resources: string[];
  poiTypes: string[];
  passableThreshold: number;
}> = {
  urban: { heightRange: [0.3, 0.6], terrains: ['road', 'building', 'concrete'], resources: ['supplies', 'fuel', 'electronics'], poiTypes: ['base', 'checkpoint', 'hospital'], passableThreshold: 0.7 },
  suburban: { heightRange: [0.3, 0.5], terrains: ['road', 'building', 'vegetation'], resources: ['supplies', 'fuel'], poiTypes: ['settlement', 'depot'], passableThreshold: 0.8 },
  industrial: { heightRange: [0.2, 0.5], terrains: ['concrete', 'metal', 'road'], resources: ['fuel', 'materials', 'electronics'], poiTypes: ['factory', 'depot', 'power_plant'], passableThreshold: 0.6 },
  commercial: { heightRange: [0.3, 0.5], terrains: ['road', 'building', 'concrete'], resources: ['supplies', 'electronics'], poiTypes: ['settlement', 'depot'], passableThreshold: 0.75 },
  forest: { heightRange: [0.3, 0.7], terrains: ['vegetation', 'path', 'rock'], resources: ['wood', 'food', 'water'], poiTypes: ['outpost', 'ruins', 'landmark'], passableThreshold: 0.5 },
  jungle: { heightRange: [0.2, 0.6], terrains: ['vegetation', 'water', 'mud'], resources: ['food', 'water', 'medicinal'], poiTypes: ['ruins', 'research', 'extraction'], passableThreshold: 0.4 },
  desert: { heightRange: [0.1, 0.8], terrains: ['sand', 'rock', 'path'], resources: ['fuel', 'minerals'], poiTypes: ['outpost', 'extraction', 'ruins'], passableThreshold: 0.85 },
  arctic: { heightRange: [0.1, 0.9], terrains: ['snow', 'rock', 'path'], resources: ['fuel', 'water'], poiTypes: ['base', 'research', 'bunker'], passableThreshold: 0.7 },
  tundra: { heightRange: [0.2, 0.6], terrains: ['snow', 'mud', 'vegetation'], resources: ['fuel', 'food'], poiTypes: ['outpost', 'settlement'], passableThreshold: 0.6 },
  mountains: { heightRange: [0.6, 1.0], terrains: ['rock', 'snow', 'path'], resources: ['minerals', 'water'], poiTypes: ['bunker', 'communications', 'landmark'], passableThreshold: 0.3 },
  plains: { heightRange: [0.2, 0.4], terrains: ['vegetation', 'path', 'road'], resources: ['food', 'water'], poiTypes: ['settlement', 'outpost', 'depot'], passableThreshold: 0.9 },
  wetlands: { heightRange: [0.1, 0.3], terrains: ['water', 'mud', 'vegetation'], resources: ['food', 'water', 'medicinal'], poiTypes: ['outpost', 'extraction'], passableThreshold: 0.4 },
  coastal: { heightRange: [0.0, 0.4], terrains: ['sand', 'water', 'rock'], resources: ['food', 'water', 'fuel'], poiTypes: ['base', 'depot', 'settlement'], passableThreshold: 0.6 },
  underground: { heightRange: [0.0, 0.2], terrains: ['rock', 'concrete', 'metal'], resources: ['minerals', 'electronics'], poiTypes: ['bunker', 'research', 'depot'], passableThreshold: 0.5 },
  facility: { heightRange: [0.3, 0.5], terrains: ['concrete', 'metal', 'road'], resources: ['electronics', 'supplies', 'fuel'], poiTypes: ['base', 'research', 'factory'], passableThreshold: 0.8 },
  ruins: { heightRange: [0.2, 0.6], terrains: ['rubble', 'concrete', 'vegetation'], resources: ['materials', 'supplies'], poiTypes: ['ruins', 'landmark', 'extraction'], passableThreshold: 0.5 }
};

const POI_NAMES = {
  base: ['Alpha Base', 'Forward Command', 'Camp Delta', 'HQ Bravo', 'Firebase Echo'],
  outpost: ['Observation Post', 'Watchtower', 'Scout Camp', 'Lookout Point', 'Ranger Station'],
  checkpoint: ['Gate Alpha', 'Security Station', 'Border Control', 'Access Point', 'Guard Post'],
  depot: ['Supply Depot', 'Logistics Hub', 'Storage Facility', 'Warehouse District', 'Distribution Center'],
  settlement: ['Haven', 'Refuge', 'Sanctuary', 'Community Center', 'Township'],
  bunker: ['Bunker Complex', 'Underground Shelter', 'Hardened Facility', 'Safe House', 'Vault'],
  factory: ['Manufacturing Plant', 'Assembly Facility', 'Production Center', 'Workshop', 'Foundry'],
  hospital: ['Medical Center', 'Field Hospital', 'Clinic', 'Treatment Facility', 'Trauma Center'],
  communications: ['Comms Tower', 'Signal Station', 'Broadcast Center', 'Relay Point', 'Network Hub'],
  power_plant: ['Power Station', 'Generator Complex', 'Energy Facility', 'Substation', 'Reactor'],
  water_source: ['Water Treatment', 'Reservoir', 'Spring', 'Pumping Station', 'Well Site'],
  extraction: ['Mining Site', 'Extraction Point', 'Drill Site', 'Resource Depot', 'Processing Plant'],
  research: ['Research Lab', 'Science Facility', 'Testing Ground', 'Development Center', 'Institute'],
  ruins: ['Ancient Ruins', 'Collapsed Structure', 'Old Town', 'Abandoned Site', 'Remnants'],
  landmark: ['Monument', 'Historic Site', 'Scenic Point', 'Memorial', 'Natural Wonder']
};

export function generateWorld(seed: string, options: {
  width?: number;
  height?: number;
  primaryBiome?: BiomeType;
  density?: number;
  difficulty?: number;
} = {}): World {
  const startTime = Date.now();
  const rng = new DeterministicRNG(seed);
  
  const width = options.width || 64;
  const height = options.height || 64;
  const primaryBiome = options.primaryBiome || rng.pick(['urban', 'forest', 'desert', 'arctic', 'facility'] as BiomeType[]);
  const density = options.density || 0.5;
  const difficulty = options.difficulty || 0.5;

  const heightmap = generateHeightmap(rng, width, height);
  const biomeMap = generateBiomeMap(rng, width, height, primaryBiome, heightmap);
  const tiles = generateTiles(rng, width, height, heightmap, biomeMap);
  const zones = generateZones(rng, width, height, biomeMap, tiles);
  const pois = generatePOIs(rng, zones, tiles, density, difficulty);
  const roads = generateRoads(rng, pois, tiles);
  const spawnPoints = generateSpawnPoints(rng, pois, zones);
  const weather = generateWeather(rng, primaryBiome);

  applyRoadsToTiles(tiles, roads);
  assignPOIsToZones(zones, pois);

  const worldData = {
    tiles: tiles.map(row => row.map(t => ({ ...t }))),
    heightmap,
    pois,
    roads,
    zones: Object.fromEntries(zones.map(z => [z.id, z])),
    spawnPoints
  };

  const checksum = crypto.createHash('sha384')
    .update(JSON.stringify(worldData))
    .digest('hex');

  const world: World = {
    id: `world_${rng.getSeed().substring(0, 8)}`,
    seed: rng.getSeed(),
    version: 'v6.3.0',
    generated_at: new Date().toISOString(),
    dimensions: { width, height },
    tiles,
    heightmap,
    biomes: Object.fromEntries(zones.map(z => [z.id, z])),
    pois,
    roads,
    spawn_points: spawnPoints,
    weather,
    time_of_day: rng.nextFloat(0, 24),
    checksum
  };

  return world;
}

function generateHeightmap(rng: DeterministicRNG, width: number, height: number): number[][] {
  const heightmap: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    heightmap[y] = [];
    for (let x = 0; x < width; x++) {
      const baseNoise = octaveNoise(rng, x * 0.1, y * 0.1, 4, 0.5);
      const detailNoise = noise2D(rng, x * 0.3, y * 0.3, 1) * 0.2;
      heightmap[y][x] = Math.max(0, Math.min(1, baseNoise + detailNoise));
    }
  }
  
  return heightmap;
}

function generateBiomeMap(rng: DeterministicRNG, width: number, height: number, primary: BiomeType, heightmap: number[][]): BiomeType[][] {
  const biomeMap: BiomeType[][] = [];
  const secondaryBiomes = getCompatibleBiomes(primary);
  
  for (let y = 0; y < height; y++) {
    biomeMap[y] = [];
    for (let x = 0; x < width; x++) {
      const h = heightmap[y][x];
      const variation = noise2D(rng, x * 0.05, y * 0.05, 1);
      
      if (variation < 0.3 && secondaryBiomes.length > 0) {
        biomeMap[y][x] = rng.pick(secondaryBiomes);
      } else if (h > 0.8) {
        biomeMap[y][x] = 'mountains';
      } else if (h < 0.15) {
        biomeMap[y][x] = 'wetlands';
      } else {
        biomeMap[y][x] = primary;
      }
    }
  }
  
  return biomeMap;
}

function getCompatibleBiomes(primary: BiomeType): BiomeType[] {
  const compatibilityMap: Record<BiomeType, BiomeType[]> = {
    urban: ['suburban', 'industrial', 'commercial'],
    suburban: ['urban', 'plains', 'forest'],
    industrial: ['urban', 'commercial'],
    commercial: ['urban', 'suburban'],
    forest: ['plains', 'mountains', 'wetlands'],
    jungle: ['wetlands', 'mountains', 'ruins'],
    desert: ['ruins', 'mountains'],
    arctic: ['tundra', 'mountains'],
    tundra: ['arctic', 'plains'],
    mountains: ['forest', 'arctic', 'tundra'],
    plains: ['forest', 'suburban', 'wetlands'],
    wetlands: ['plains', 'jungle', 'coastal'],
    coastal: ['wetlands', 'urban', 'plains'],
    underground: ['facility', 'ruins'],
    facility: ['underground', 'industrial'],
    ruins: ['forest', 'desert', 'jungle']
  };
  return compatibilityMap[primary] || [];
}

function generateTiles(rng: DeterministicRNG, width: number, height: number, heightmap: number[][], biomeMap: BiomeType[][]): Tile[][] {
  const tiles: Tile[][] = [];
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const biome = biomeMap[y][x];
      const config = BIOME_CONFIGS[biome];
      const h = heightmap[y][x];
      
      const terrain = rng.pick(config.terrains);
      const passable = h < config.passableThreshold && terrain !== 'water' && terrain !== 'rock';
      const cover = terrain === 'building' ? 0.9 : terrain === 'vegetation' ? 0.6 : terrain === 'rock' ? 0.7 : 0.2;
      
      const resources: string[] = [];
      if (rng.nextBool(0.1)) {
        resources.push(rng.pick(config.resources));
      }
      
      tiles[y][x] = {
        x, y,
        height: h,
        biome,
        terrain,
        passable,
        cover,
        resources
      };
    }
  }
  
  return tiles;
}

function generateZones(rng: DeterministicRNG, width: number, height: number, biomeMap: BiomeType[][], tiles: Tile[][]): Zone[] {
  const zones: Zone[] = [];
  const zoneSize = Math.max(8, Math.floor(Math.min(width, height) / 4));
  
  for (let zy = 0; zy < Math.ceil(height / zoneSize); zy++) {
    for (let zx = 0; zx < Math.ceil(width / zoneSize); zx++) {
      const minX = zx * zoneSize;
      const minY = zy * zoneSize;
      const maxX = Math.min((zx + 1) * zoneSize - 1, width - 1);
      const maxY = Math.min((zy + 1) * zoneSize - 1, height - 1);
      
      const centerBiome = biomeMap[Math.floor((minY + maxY) / 2)][Math.floor((minX + maxX) / 2)];
      
      zones.push({
        id: `zone_${zx}_${zy}`,
        name: `Sector ${String.fromCharCode(65 + zy)}${zx + 1}`,
        bounds: { minX, minY, maxX, maxY },
        biome: centerBiome,
        threat_level: rng.nextFloat(0.1, 0.9),
        controlled_by: undefined,
        pois: []
      });
    }
  }
  
  return zones;
}

function generatePOIs(rng: DeterministicRNG, zones: Zone[], tiles: Tile[][], density: number, difficulty: number): POI[] {
  const pois: POI[] = [];
  
  for (const zone of zones) {
    const poiCount = Math.floor(rng.nextFloat(1, 4) * density);
    const biomeConfig = BIOME_CONFIGS[zone.biome];
    
    for (let i = 0; i < poiCount; i++) {
      const x = rng.nextInt(zone.bounds.minX + 2, zone.bounds.maxX - 2);
      const y = rng.nextInt(zone.bounds.minY + 2, zone.bounds.maxY - 2);
      
      if (!tiles[y]?.[x]?.passable) continue;
      
      const poiType = rng.pick(biomeConfig.poiTypes) as keyof typeof POI_NAMES;
      const names = POI_NAMES[poiType] || POI_NAMES.landmark;
      
      pois.push({
        id: `poi_${pois.length}`,
        name: rng.pick(names),
        type: poiType,
        x, y,
        radius: rng.nextInt(2, 5),
        faction: undefined,
        importance: rng.nextFloat(0.3, 1.0),
        resources: rng.shuffle(biomeConfig.resources).slice(0, rng.nextInt(1, 3)),
        defenses: Math.floor(rng.nextFloat(0, 1) * difficulty * 10),
        population: rng.nextInt(5, 50)
      });
    }
  }
  
  return pois;
}

function generateRoads(rng: DeterministicRNG, pois: POI[], tiles: Tile[][]): Road[] {
  const roads: Road[] = [];
  
  const majorPOIs = pois.filter(p => p.importance > 0.6).slice(0, 5);
  
  for (let i = 0; i < majorPOIs.length - 1; i++) {
    const start = majorPOIs[i];
    const end = majorPOIs[i + 1];
    
    const points: Array<{x: number; y: number}> = [];
    let x = start.x, y = start.y;
    
    while (x !== end.x || y !== end.y) {
      points.push({ x, y });
      
      const dx = end.x - x;
      const dy = end.y - y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        x += dx > 0 ? 1 : -1;
      } else {
        y += dy > 0 ? 1 : -1;
      }
      
      if (rng.nextBool(0.2)) {
        if (rng.nextBool(0.5) && dx !== 0) x += dx > 0 ? 1 : -1;
        else if (dy !== 0) y += dy > 0 ? 1 : -1;
      }
    }
    points.push({ x: end.x, y: end.y });
    
    roads.push({
      id: `road_${roads.length}`,
      points,
      type: i === 0 ? 'highway' : 'main',
      condition: rng.nextFloat(0.5, 1.0),
      controlled_by: undefined
    });
  }
  
  return roads;
}

function generateSpawnPoints(rng: DeterministicRNG, pois: POI[], zones: Zone[]): Array<{x: number; y: number; faction: string; type: string}> {
  const spawns: Array<{x: number; y: number; faction: string; type: string}> = [];
  const factions = ['alpha', 'bravo', 'hostile', 'neutral'];
  
  for (const poi of pois.filter(p => p.type === 'base' || p.type === 'outpost')) {
    const faction = rng.pick(factions);
    poi.faction = faction;
    
    for (let i = 0; i < rng.nextInt(2, 5); i++) {
      spawns.push({
        x: poi.x + rng.nextInt(-2, 2),
        y: poi.y + rng.nextInt(-2, 2),
        faction,
        type: rng.pick(['infantry', 'scout', 'heavy'])
      });
    }
  }
  
  return spawns;
}

function generateWeather(rng: DeterministicRNG, biome: BiomeType): WeatherState {
  const weatherByBiome: Record<BiomeType, Array<WeatherState['condition']>> = {
    urban: ['clear', 'cloudy', 'rain'],
    suburban: ['clear', 'cloudy', 'rain'],
    industrial: ['cloudy', 'fog', 'rain'],
    commercial: ['clear', 'cloudy'],
    forest: ['clear', 'rain', 'fog'],
    jungle: ['rain', 'storm', 'fog'],
    desert: ['clear', 'sandstorm'],
    arctic: ['snow', 'clear', 'storm'],
    tundra: ['snow', 'cloudy', 'fog'],
    mountains: ['clear', 'snow', 'storm'],
    plains: ['clear', 'cloudy', 'rain'],
    wetlands: ['fog', 'rain', 'cloudy'],
    coastal: ['clear', 'rain', 'storm'],
    underground: ['clear'],
    facility: ['clear'],
    ruins: ['fog', 'cloudy', 'rain']
  };
  
  const conditions = weatherByBiome[biome] || ['clear'];
  const condition = rng.pick(conditions);
  
  return {
    condition,
    intensity: rng.nextFloat(0.2, 0.8),
    wind_speed: rng.nextFloat(0, 30),
    wind_direction: rng.nextFloat(0, 360),
    visibility: condition === 'fog' ? rng.nextFloat(0.1, 0.4) : condition === 'storm' ? rng.nextFloat(0.3, 0.6) : rng.nextFloat(0.7, 1.0),
    temperature: biome === 'arctic' ? rng.nextFloat(-30, 0) : biome === 'desert' ? rng.nextFloat(25, 45) : rng.nextFloat(10, 25)
  };
}

function applyRoadsToTiles(tiles: Tile[][], roads: Road[]): void {
  for (const road of roads) {
    for (const point of road.points) {
      if (tiles[point.y]?.[point.x]) {
        tiles[point.y][point.x].terrain = 'road';
        tiles[point.y][point.x].passable = true;
        tiles[point.y][point.x].cover = 0.1;
      }
    }
  }
}

function assignPOIsToZones(zones: Zone[], pois: POI[]): void {
  for (const poi of pois) {
    for (const zone of zones) {
      if (poi.x >= zone.bounds.minX && poi.x <= zone.bounds.maxX &&
          poi.y >= zone.bounds.minY && poi.y <= zone.bounds.maxY) {
        zone.pois.push(poi.id);
        if (poi.faction) {
          zone.controlled_by = poi.faction;
        }
        break;
      }
    }
  }
}

export function getWorldSummary(world: World): {
  dimensions: string;
  tile_count: number;
  poi_count: number;
  road_count: number;
  spawn_count: number;
  biomes: string[];
  weather: string;
} {
  const biomes = new Set<string>();
  for (const row of world.tiles) {
    for (const tile of row) {
      biomes.add(tile.biome);
    }
  }
  
  return {
    dimensions: `${world.dimensions.width}x${world.dimensions.height}`,
    tile_count: world.dimensions.width * world.dimensions.height,
    poi_count: world.pois.length,
    road_count: world.roads.length,
    spawn_count: world.spawn_points.length,
    biomes: Array.from(biomes),
    weather: `${world.weather.condition} (${Math.round(world.weather.intensity * 100)}%)`
  };
}
