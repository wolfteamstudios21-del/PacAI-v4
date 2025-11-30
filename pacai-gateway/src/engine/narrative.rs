use serde::{Deserialize, Serialize};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NarrativeOutput {
    pub title: String,
    pub synopsis: String,
    pub acts: Vec<Act>,
    pub characters: Vec<Character>,
    pub themes: Vec<String>,
    pub setting: Setting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Act {
    pub number: u32,
    pub title: String,
    pub description: String,
    pub beats: Vec<StoryBeat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryBeat {
    pub id: String,
    pub beat_type: String,
    pub description: String,
    pub tension: f32,
    pub characters_involved: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub role: String,
    pub archetype: String,
    pub motivation: String,
    pub traits: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub name: String,
    pub era: String,
    pub atmosphere: String,
    pub key_locations: Vec<String>,
}

const ARCHETYPES: [&str; 8] = [
    "Hero", "Mentor", "Threshold Guardian", "Herald",
    "Shapeshifter", "Shadow", "Trickster", "Ally"
];

const THEMES: [&str; 12] = [
    "Redemption", "Survival", "Justice", "Freedom",
    "Sacrifice", "Identity", "Power", "Love",
    "Revenge", "Discovery", "Transformation", "Legacy"
];

const BEAT_TYPES: [&str; 8] = [
    "inciting_incident", "rising_action", "complication",
    "crisis", "climax", "falling_action", "resolution", "denouement"
];

pub fn generate(prompt: &str, seed: u64) -> NarrativeOutput {
    let mut rng = StdRng::seed_from_u64(seed);
    
    let num_acts: usize = rng.gen_range(3..=5);
    let num_characters: usize = rng.gen_range(3..=8);
    let num_themes: usize = rng.gen_range(2..=4);
    
    let title = generate_title(&mut rng, prompt);
    let synopsis = generate_synopsis(&mut rng, prompt, &title);
    
    let characters: Vec<Character> = (0..num_characters)
        .map(|i| generate_character(&mut rng, i))
        .collect();
    
    let character_names: Vec<String> = characters.iter()
        .map(|c| c.name.clone())
        .collect();
    
    let acts: Vec<Act> = (1..=num_acts as u32)
        .map(|i| generate_act(&mut rng, i, num_acts as u32, &character_names))
        .collect();
    
    let themes: Vec<String> = THEMES.choose_multiple(&mut rng, num_themes)
        .map(|s| s.to_string())
        .collect();
    
    let setting = generate_setting(&mut rng, prompt);
    
    NarrativeOutput {
        title,
        synopsis,
        acts,
        characters,
        themes,
        setting,
    }
}

fn generate_title(rng: &mut StdRng, prompt: &str) -> String {
    let prefixes = ["The", "A", ""];
    let words: Vec<&str> = prompt.split_whitespace().take(3).collect();
    
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    let core = if words.is_empty() { 
        "Chronicle".to_string() 
    } else { 
        words.join(" ")
    };
    
    if prefix.is_empty() {
        core
    } else {
        format!("{} {}", prefix, core)
    }
}

fn generate_synopsis(rng: &mut StdRng, prompt: &str, title: &str) -> String {
    format!(
        "In a world shaped by {}, {} unfolds as forces beyond comprehension \
         collide. What begins as {} evolves into an epic tale of {}.",
        prompt,
        title,
        ["a simple mission", "an unlikely encounter", "a desperate gambit"][rng.gen_range(0..3)],
        ["survival and sacrifice", "power and redemption", "love and loss"][rng.gen_range(0..3)]
    )
}

fn generate_character(rng: &mut StdRng, index: usize) -> Character {
    let first_names = ["Marcus", "Elena", "Kira", "Dex", "Nova", "Zara", "Cole", "Maya"];
    let last_names = ["Vex", "Thorne", "Cross", "Stark", "Vale", "Frost", "Drake", "Storm"];
    let roles = ["protagonist", "antagonist", "deuteragonist", "mentor", "ally", "wildcard"];
    let motivations = [
        "seeks redemption for past failures",
        "protects loved ones at any cost",
        "pursues ultimate power",
        "searches for lost identity",
        "fights for justice",
        "desires freedom above all"
    ];
    let trait_pool = [
        "cunning", "brave", "ruthless", "compassionate", "resourceful",
        "mysterious", "loyal", "unpredictable", "wise", "fierce"
    ];
    
    let name = format!("{} {}", 
        first_names[rng.gen_range(0..first_names.len())],
        last_names[rng.gen_range(0..last_names.len())]);
    
    let num_traits: usize = rng.gen_range(2..=4);
    let traits: Vec<String> = trait_pool.choose_multiple(rng, num_traits)
        .map(|s| s.to_string())
        .collect();
    
    Character {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        role: roles[index.min(roles.len() - 1)].to_string(),
        archetype: ARCHETYPES[rng.gen_range(0..ARCHETYPES.len())].to_string(),
        motivation: motivations[rng.gen_range(0..motivations.len())].to_string(),
        traits,
    }
}

fn generate_act(rng: &mut StdRng, act_num: u32, total_acts: u32, characters: &[String]) -> Act {
    let act_titles = [
        "The Awakening", "Rising Storm", "The Crucible", 
        "Dark Night", "The Reckoning", "New Dawn"
    ];
    
    let num_beats: usize = rng.gen_range(3..=6);
    let beats: Vec<StoryBeat> = (0..num_beats)
        .map(|i| generate_beat(rng, i, num_beats, characters))
        .collect();
    
    Act {
        number: act_num,
        title: act_titles[act_num as usize % act_titles.len()].to_string(),
        description: format!("Act {} of {}: {}", act_num, total_acts, 
            ["Setup and introduction", "Rising conflict", "Crisis point", 
             "Climax and resolution", "Aftermath"][act_num as usize % 5]),
        beats,
    }
}

fn generate_beat(rng: &mut StdRng, index: usize, total: usize, characters: &[String]) -> StoryBeat {
    let tension = (index as f32 / total as f32) * 0.8 + rng.gen::<f32>() * 0.2;
    
    let num_chars: usize = rng.gen_range(1..=characters.len().min(3));
    let involved: Vec<String> = characters.choose_multiple(rng, num_chars)
        .cloned()
        .collect();
    
    StoryBeat {
        id: uuid::Uuid::new_v4().to_string(),
        beat_type: BEAT_TYPES[index % BEAT_TYPES.len()].to_string(),
        description: format!("A pivotal moment where {} must {}",
            involved.first().unwrap_or(&"the protagonist".to_string()),
            ["make a crucial choice", "face their fears", "sacrifice something precious",
             "discover a hidden truth", "confront the enemy"][rng.gen_range(0..5)]),
        tension,
        characters_involved: involved,
    }
}

fn generate_setting(rng: &mut StdRng, prompt: &str) -> Setting {
    let eras = ["near-future", "distant future", "post-apocalyptic", "alternate history", "contemporary"];
    let atmospheres = ["gritty and noir", "hopeful yet tense", "oppressive", "mysterious", "chaotic"];
    let location_types = ["The Capital", "The Wasteland", "The Underground", "The Frontier", "The Citadel"];
    
    let num_locations: usize = rng.gen_range(3..=5);
    let locations: Vec<String> = location_types.choose_multiple(rng, num_locations)
        .map(|s| s.to_string())
        .collect();
    
    Setting {
        name: format!("{} Sector", prompt.split_whitespace().next().unwrap_or("Alpha")),
        era: eras[rng.gen_range(0..eras.len())].to_string(),
        atmosphere: atmospheres[rng.gen_range(0..atmospheres.len())].to_string(),
        key_locations: locations,
    }
}

use rand::seq::SliceRandom;
