use serde::{Deserialize, Serialize};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use rand::seq::SliceRandom;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldOutput {
    pub id: String,
    pub name: String,
    pub terrain: TerrainData,
    pub entities: Vec<Entity>,
    pub poi: Vec<PointOfInterest>,
    pub atmosphere: AtmosphereData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrainData {
    pub biome: String,
    pub elevation_range: (f32, f32),
    pub features: Vec<TerrainFeature>,
    pub hazards: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrainFeature {
    pub feature_type: String,
    pub position: (f32, f32, f32),
    pub scale: f32,
    pub rotation: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub entity_type: String,
    pub name: String,
    pub position: (f32, f32, f32),
    pub faction: String,
    pub behavior: String,
    pub stats: EntityStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityStats {
    pub health: u32,
    pub threat_level: u32,
    pub awareness: f32,
    pub aggression: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointOfInterest {
    pub id: String,
    pub poi_type: String,
    pub name: String,
    pub position: (f32, f32, f32),
    pub importance: u32,
    pub discovered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtmosphereData {
    pub time_of_day: String,
    pub weather: String,
    pub visibility: f32,
    pub ambient_threat: f32,
}

const BIOMES: [&str; 8] = [
    "urban_ruins", "arctic_waste", "desert_expanse", "dense_jungle",
    "industrial_zone", "coastal_region", "mountain_range", "underground_complex"
];

const ENTITY_TYPES: [&str; 10] = [
    "hostile_patrol", "neutral_scavenger", "friendly_survivor", "automated_turret",
    "wild_creature", "drone_swarm", "mech_unit", "sniper", "medic", "commander"
];

const FACTIONS: [&str; 6] = [
    "Corporate", "Resistance", "Rogue_AI", "Tribal", "Military", "Independent"
];

const POI_TYPES: [&str; 8] = [
    "supply_cache", "comm_tower", "shelter", "wreckage", 
    "extraction_point", "enemy_base", "neutral_zone", "hazard_zone"
];

pub fn generate(prompt: &str, seed: u64) -> WorldOutput {
    let mut rng = StdRng::seed_from_u64(seed);
    
    let id = uuid::Uuid::new_v4().to_string();
    let biome = BIOMES[rng.gen_range(0..BIOMES.len())];
    
    let num_entities: usize = rng.gen_range(5..=15);
    let num_poi: usize = rng.gen_range(3..=8);
    let num_features: usize = rng.gen_range(10..=30);
    
    let terrain = generate_terrain(&mut rng, biome, num_features);
    let entities = generate_entities(&mut rng, num_entities, &terrain);
    let poi = generate_poi(&mut rng, num_poi);
    let atmosphere = generate_atmosphere(&mut rng, biome);
    
    WorldOutput {
        id,
        name: format!("{}-{}", 
            prompt.split_whitespace().next().unwrap_or("Zone"),
            &uuid::Uuid::new_v4().to_string()[..8]),
        terrain,
        entities,
        poi,
        atmosphere,
    }
}

fn generate_terrain(rng: &mut StdRng, biome: &str, num_features: usize) -> TerrainData {
    let elevation_base: f32 = match biome {
        "mountain_range" => 500.0,
        "underground_complex" => -50.0,
        "coastal_region" => 0.0,
        _ => 100.0,
    };
    
    let elevation_variance: f32 = rng.gen_range(50.0..200.0);
    
    let feature_types = match biome {
        "urban_ruins" => vec!["building", "rubble", "crater", "vehicle_wreck"],
        "arctic_waste" => vec!["ice_formation", "snow_drift", "frozen_lake", "crevasse"],
        "dense_jungle" => vec!["large_tree", "undergrowth", "stream", "cliff"],
        "industrial_zone" => vec!["factory", "pipe_system", "storage_tank", "crane"],
        _ => vec!["rock_formation", "debris", "structure", "vegetation"],
    };
    
    let features: Vec<TerrainFeature> = (0..num_features)
        .map(|_| TerrainFeature {
            feature_type: feature_types[rng.gen_range(0..feature_types.len())].to_string(),
            position: (
                rng.gen_range(-500.0..500.0),
                rng.gen_range(-500.0..500.0),
                rng.gen_range(elevation_base - 20.0..elevation_base + elevation_variance),
            ),
            scale: rng.gen_range(0.5..5.0),
            rotation: rng.gen_range(0.0..360.0),
        })
        .collect();
    
    let hazards = match biome {
        "arctic_waste" => vec!["extreme_cold", "blizzard", "thin_ice"],
        "desert_expanse" => vec!["extreme_heat", "sandstorm", "quicksand"],
        "industrial_zone" => vec!["toxic_gas", "radiation", "unstable_structure"],
        _ => vec!["environmental_hazard"],
    }.iter().map(|s| s.to_string()).collect();
    
    TerrainData {
        biome: biome.to_string(),
        elevation_range: (elevation_base, elevation_base + elevation_variance),
        features,
        hazards,
    }
}

fn generate_entities(rng: &mut StdRng, count: usize, terrain: &TerrainData) -> Vec<Entity> {
    let names_prefix = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
    let behaviors = ["patrol", "guard", "hunt", "scavenge", "idle", "ambush"];
    
    (0..count)
        .map(|i| {
            let entity_type = ENTITY_TYPES[rng.gen_range(0..ENTITY_TYPES.len())];
            let faction = FACTIONS[rng.gen_range(0..FACTIONS.len())];
            
            let (base_health, base_threat) = match entity_type {
                "commander" => (200, 5),
                "mech_unit" => (500, 4),
                "automated_turret" => (150, 3),
                "drone_swarm" => (50, 2),
                _ => (100, 2),
            };
            
            Entity {
                id: uuid::Uuid::new_v4().to_string(),
                entity_type: entity_type.to_string(),
                name: format!("{}-{}", 
                    names_prefix[i % names_prefix.len()],
                    rng.gen_range(100..999)),
                position: (
                    rng.gen_range(-400.0..400.0),
                    rng.gen_range(-400.0..400.0),
                    terrain.elevation_range.0 + rng.gen_range(0.0..50.0),
                ),
                faction: faction.to_string(),
                behavior: behaviors[rng.gen_range(0..behaviors.len())].to_string(),
                stats: EntityStats {
                    health: base_health + rng.gen_range(0..50),
                    threat_level: base_threat,
                    awareness: rng.gen_range(0.3..1.0),
                    aggression: rng.gen_range(0.1..0.9),
                },
            }
        })
        .collect()
}

fn generate_poi(rng: &mut StdRng, count: usize) -> Vec<PointOfInterest> {
    let poi_names = [
        "Outpost", "Bunker", "Cache", "Tower", "Haven", 
        "Depot", "Station", "Point", "Site", "Base"
    ];
    
    (0..count)
        .map(|_| {
            let poi_type = POI_TYPES[rng.gen_range(0..POI_TYPES.len())];
            let name_suffix = poi_names[rng.gen_range(0..poi_names.len())];
            
            PointOfInterest {
                id: uuid::Uuid::new_v4().to_string(),
                poi_type: poi_type.to_string(),
                name: format!("{} {}", 
                    ["North", "South", "East", "West", "Central"][rng.gen_range(0..5)],
                    name_suffix),
                position: (
                    rng.gen_range(-450.0..450.0),
                    rng.gen_range(-450.0..450.0),
                    rng.gen_range(50.0..200.0),
                ),
                importance: rng.gen_range(1..=5),
                discovered: rng.gen_bool(0.3),
            }
        })
        .collect()
}

fn generate_atmosphere(rng: &mut StdRng, biome: &str) -> AtmosphereData {
    let times = ["dawn", "morning", "midday", "afternoon", "dusk", "night", "midnight"];
    let weather_options = match biome {
        "arctic_waste" => vec!["clear", "light_snow", "heavy_snow", "blizzard"],
        "desert_expanse" => vec!["clear", "hazy", "sandstorm", "heat_wave"],
        "dense_jungle" => vec!["humid", "light_rain", "heavy_rain", "foggy"],
        _ => vec!["clear", "overcast", "light_rain", "foggy"],
    };
    
    AtmosphereData {
        time_of_day: times[rng.gen_range(0..times.len())].to_string(),
        weather: weather_options[rng.gen_range(0..weather_options.len())].to_string(),
        visibility: rng.gen_range(0.3..1.0),
        ambient_threat: rng.gen_range(0.1..0.8),
    }
}
