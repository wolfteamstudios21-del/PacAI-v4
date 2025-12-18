/**
 * PacAI v6.3 Core Generation Types
 * These define the structure of generated worlds, entities, and narratives
 */

export interface Tile {
  x: number;
  y: number;
  height: number;
  biome: BiomeType;
  terrain: TerrainType;
  passable: boolean;
  cover: number;
  resources: string[];
}

export type BiomeType = 
  | 'urban' | 'suburban' | 'industrial' | 'commercial'
  | 'forest' | 'jungle' | 'desert' | 'arctic' | 'tundra'
  | 'mountains' | 'plains' | 'wetlands' | 'coastal'
  | 'underground' | 'facility' | 'ruins';

export type TerrainType = 
  | 'road' | 'path' | 'building' | 'vegetation'
  | 'water' | 'rock' | 'sand' | 'snow' | 'mud'
  | 'concrete' | 'metal' | 'rubble';

export interface POI {
  id: string;
  name: string;
  type: POIType;
  x: number;
  y: number;
  radius: number;
  faction?: string;
  importance: number;
  resources: string[];
  defenses: number;
  population: number;
}

export type POIType = 
  | 'base' | 'outpost' | 'checkpoint' | 'depot'
  | 'settlement' | 'bunker' | 'factory' | 'hospital'
  | 'communications' | 'power_plant' | 'water_source'
  | 'extraction' | 'research' | 'ruins' | 'landmark';

export interface Road {
  id: string;
  points: Array<{x: number; y: number}>;
  type: 'highway' | 'main' | 'secondary' | 'path' | 'rail';
  condition: number;
  controlled_by?: string;
}

export interface Zone {
  id: string;
  name: string;
  bounds: {minX: number; minY: number; maxX: number; maxY: number};
  biome: BiomeType;
  threat_level: number;
  controlled_by?: string;
  pois: string[];
}

export interface World {
  id: string;
  seed: string;
  version: string;
  generated_at: string;
  dimensions: {width: number; height: number};
  tiles: Tile[][];
  heightmap: number[][];
  biomes: Record<string, Zone>;
  pois: POI[];
  roads: Road[];
  spawn_points: Array<{x: number; y: number; faction: string; type: string}>;
  weather: WeatherState;
  time_of_day: number;
  checksum: string;
}

export interface WeatherState {
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'sandstorm';
  intensity: number;
  wind_speed: number;
  wind_direction: number;
  visibility: number;
  temperature: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  faction: string;
  position: {x: number; y: number; z: number};
  rotation: number;
  stats: EntityStats;
  loadout: Loadout;
  behavior: BehaviorState;
  alive: boolean;
  spawned_at: number;
}

export type EntityType = 
  | 'infantry' | 'scout' | 'sniper' | 'heavy' | 'medic' | 'engineer'
  | 'officer' | 'civilian' | 'vip' | 'hostile'
  | 'vehicle_light' | 'vehicle_heavy' | 'aircraft' | 'drone';

export interface EntityStats {
  health: number;
  max_health: number;
  stamina: number;
  morale: number;
  accuracy: number;
  stealth: number;
  perception: number;
  speed: number;
  armor: number;
}

export interface Loadout {
  primary_weapon?: string;
  secondary_weapon?: string;
  equipment: string[];
  ammo: Record<string, number>;
}

export interface BehaviorState {
  current: BehaviorType;
  target?: string;
  destination?: {x: number; y: number};
  patrol_route?: Array<{x: number; y: number}>;
  patrol_index?: number;
  alert_level: number;
  last_known_enemy?: {x: number; y: number; time: number};
  orders?: string[];
  rng_state: string;
}

export type BehaviorType = 
  | 'idle' | 'patrol' | 'guard' | 'search'
  | 'pursue' | 'engage' | 'cover' | 'retreat'
  | 'flank' | 'support' | 'heal' | 'repair'
  | 'follow' | 'escort' | 'investigate';

export interface Faction {
  id: string;
  name: string;
  color: string;
  alignment: 'friendly' | 'neutral' | 'hostile';
  relations: Record<string, number>;
  resources: Record<string, number>;
  controlled_pois: string[];
  population: number;
  military_strength: number;
  tech_level: number;
}

export interface Mission {
  id: string;
  type: MissionType;
  name: string;
  description: string;
  objectives: Objective[];
  primary_faction: string;
  opposing_factions: string[];
  location: string;
  difficulty: number;
  time_limit?: number;
  rewards: Record<string, number>;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export type MissionType = 
  | 'assault' | 'defend' | 'patrol' | 'recon'
  | 'extraction' | 'escort' | 'sabotage' | 'rescue'
  | 'capture' | 'eliminate' | 'supply' | 'training';

export interface Objective {
  id: string;
  type: 'primary' | 'secondary' | 'bonus';
  description: string;
  target?: string;
  location?: {x: number; y: number};
  quantity?: number;
  progress: number;
  completed: boolean;
  time_limit?: number;
}

export interface Narrative {
  id: string;
  seed: string;
  factions: Faction[];
  missions: Mission[];
  timeline: TimelineEvent[];
  current_time: number;
  global_tension: number;
  active_conflicts: string[];
  recent_events: string[];
}

export interface TimelineEvent {
  id: string;
  time: number;
  type: 'battle' | 'treaty' | 'disaster' | 'discovery' | 'betrayal' | 'reinforcement';
  description: string;
  factions_involved: string[];
  outcome?: string;
  impact: Record<string, number>;
}

export interface Override {
  id: string;
  type: OverrideType;
  target?: string;
  payload: Record<string, any>;
  user: string;
  timestamp: number;
  applied: boolean;
  validated: boolean;
}

export type OverrideType = 
  | 'spawn_entity' | 'remove_entity' | 'move_entity'
  | 'set_behavior' | 'set_aggression' | 'set_faction'
  | 'set_weather' | 'set_time' | 'trigger_event'
  | 'add_objective' | 'complete_objective' | 'add_poi'
  | 'damage' | 'heal' | 'resupply';

export interface GenerationResult {
  world: World;
  entities: Entity[];
  narrative: Narrative;
  metadata: {
    seed: string;
    generated_at: string;
    generation_time_ms: number;
    tile_count: number;
    entity_count: number;
    poi_count: number;
    checksum: string;
  };
}

export interface TickResult {
  tick: number;
  time_delta: number;
  entity_updates: Array<{id: string; changes: Partial<Entity>}>;
  events: Array<{type: string; data: any}>;
  new_entities: Entity[];
  removed_entities: string[];
  world_changes: Partial<World>;
}
