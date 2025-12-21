import { z } from "zod";

export const ConflictTypeSchema = z.enum([
  "military",
  "horror", 
  "political",
  "economic",
  "social",
  "survival"
]);
export type ConflictType = z.infer<typeof ConflictTypeSchema>;

export const FactionArchetypeSchema = z.enum([
  "militarist",
  "diplomat",
  "corporation",
  "zealot",
  "survivalist",
  "void"
]);
export type FactionArchetype = z.infer<typeof FactionArchetypeSchema>;

export interface TerminologyDictionary {
  casualties: string;
  territory: string;
  garrison: string;
  counteroffensive: string;
  morale: string;
  infantry: string;
  armor: string;
  air: string;
  strategicValue: string;
  base: string;
  victory: string;
  defeat: string;
  stalemate: string;
  resources: string;
  attack: string;
  defense: string;
  retreat: string;
  reinforcement: string;
  intelligence: string;
  propaganda: string;
}

export interface ResourceAxes {
  primary: string[];
  secondary: string[];
  hidden: string[];
}

export interface EventTaxonomy {
  positive: string[];
  negative: string[];
  neutral: string[];
  catastrophic: string[];
}

export interface BehaviorDefaults {
  aggression: number;
  diplomacy: number;
  deception: number;
  resilience: number;
  resource_focus: string;
}

export interface ConflictConfig {
  type: ConflictType;
  displayName: string;
  description: string;
  terminology: TerminologyDictionary;
  resourceAxes: ResourceAxes;
  eventTaxonomy: EventTaxonomy;
  archetypeDefaults: Record<FactionArchetype, BehaviorDefaults>;
  narrativeTone: string;
  primaryMechanics: string[];
}

const MILITARY_CONFIG: ConflictConfig = {
  type: "military",
  displayName: "Military Conflict",
  description: "Traditional warfare with armed forces, territorial control, and strategic operations",
  terminology: {
    casualties: "casualties",
    territory: "territory",
    garrison: "garrison",
    counteroffensive: "counteroffensive",
    morale: "morale",
    infantry: "infantry",
    armor: "armor",
    air: "air support",
    strategicValue: "strategic value",
    base: "military base",
    victory: "victory",
    defeat: "defeat",
    stalemate: "stalemate",
    resources: "supplies",
    attack: "assault",
    defense: "fortification",
    retreat: "tactical withdrawal",
    reinforcement: "reinforcements",
    intelligence: "military intelligence",
    propaganda: "war propaganda",
  },
  resourceAxes: {
    primary: ["power", "morale", "stability"],
    secondary: ["wealth", "support", "knowledge"],
    hidden: ["hope", "fear"],
  },
  eventTaxonomy: {
    positive: ["breakthrough", "liberation", "alliance_formed", "supply_captured"],
    negative: ["ambush", "betrayal", "supply_line_cut", "key_position_lost"],
    neutral: ["ceasefire", "negotiation", "reconnaissance"],
    catastrophic: ["massacre", "total_defeat", "command_destroyed"],
  },
  archetypeDefaults: {
    militarist: { aggression: 85, diplomacy: 15, deception: 30, resilience: 70, resource_focus: "power" },
    diplomat: { aggression: 20, diplomacy: 85, deception: 40, resilience: 50, resource_focus: "support" },
    corporation: { aggression: 40, diplomacy: 60, deception: 70, resilience: 60, resource_focus: "wealth" },
    zealot: { aggression: 90, diplomacy: 5, deception: 20, resilience: 85, resource_focus: "fear" },
    survivalist: { aggression: 30, diplomacy: 40, deception: 50, resilience: 90, resource_focus: "stability" },
    void: { aggression: 70, diplomacy: 10, deception: 90, resilience: 40, resource_focus: "fear" },
  },
  narrativeTone: "grim_tactical",
  primaryMechanics: ["territorial_control", "force_projection", "logistics", "command_structure"],
};

const HORROR_CONFIG: ConflictConfig = {
  type: "horror",
  displayName: "Horror Survival",
  description: "Supernatural or existential threats where survival and sanity are paramount",
  terminology: {
    casualties: "lost souls",
    territory: "safe zones",
    garrison: "sanctuary",
    counteroffensive: "desperate stand",
    morale: "sanity",
    infantry: "survivors",
    armor: "barriers",
    air: "divine intervention",
    strategicValue: "ritual significance",
    base: "haven",
    victory: "salvation",
    defeat: "corruption",
    stalemate: "containment",
    resources: "essence",
    attack: "manifestation",
    defense: "ward",
    retreat: "flee",
    reinforcement: "awakening",
    intelligence: "forbidden knowledge",
    propaganda: "whispers",
  },
  resourceAxes: {
    primary: ["hope", "fear", "stability"],
    secondary: ["knowledge", "support", "morale"],
    hidden: ["power", "wealth"],
  },
  eventTaxonomy: {
    positive: ["sanctuary_found", "ritual_complete", "survivor_rescued", "truth_revealed"],
    negative: ["corruption_spreads", "ally_turned", "knowledge_lost", "barrier_breached"],
    neutral: ["omen", "vision", "discovery"],
    catastrophic: ["awakening", "possession", "reality_breach", "extinction_event"],
  },
  archetypeDefaults: {
    militarist: { aggression: 60, diplomacy: 20, deception: 20, resilience: 80, resource_focus: "stability" },
    diplomat: { aggression: 15, diplomacy: 75, deception: 30, resilience: 60, resource_focus: "hope" },
    corporation: { aggression: 50, diplomacy: 30, deception: 80, resilience: 40, resource_focus: "knowledge" },
    zealot: { aggression: 70, diplomacy: 10, deception: 10, resilience: 90, resource_focus: "hope" },
    survivalist: { aggression: 25, diplomacy: 35, deception: 45, resilience: 95, resource_focus: "stability" },
    void: { aggression: 95, diplomacy: 0, deception: 100, resilience: 100, resource_focus: "fear" },
  },
  narrativeTone: "dread_mystery",
  primaryMechanics: ["sanity_management", "knowledge_vs_safety", "corruption_spread", "ritual_mechanics"],
};

const POLITICAL_CONFIG: ConflictConfig = {
  type: "political",
  displayName: "Political Intrigue",
  description: "Power struggles through influence, alliances, and manipulation",
  terminology: {
    casualties: "disgraced",
    territory: "spheres of influence",
    garrison: "loyalists",
    counteroffensive: "power play",
    morale: "loyalty",
    infantry: "agents",
    armor: "institutions",
    air: "public opinion",
    strategicValue: "political capital",
    base: "power base",
    victory: "ascension",
    defeat: "downfall",
    stalemate: "gridlock",
    resources: "influence",
    attack: "scheme",
    defense: "counter-scheme",
    retreat: "concession",
    reinforcement: "alliance",
    intelligence: "secrets",
    propaganda: "spin",
  },
  resourceAxes: {
    primary: ["support", "power", "knowledge"],
    secondary: ["wealth", "stability", "morale"],
    hidden: ["fear", "hope"],
  },
  eventTaxonomy: {
    positive: ["alliance_secured", "scandal_exposed", "legislation_passed", "election_won"],
    negative: ["betrayal", "blackmail", "coup_attempt", "public_disgrace"],
    neutral: ["negotiation", "debate", "investigation"],
    catastrophic: ["assassination", "revolution", "regime_collapse", "civil_war"],
  },
  archetypeDefaults: {
    militarist: { aggression: 70, diplomacy: 30, deception: 40, resilience: 60, resource_focus: "power" },
    diplomat: { aggression: 10, diplomacy: 95, deception: 50, resilience: 70, resource_focus: "support" },
    corporation: { aggression: 35, diplomacy: 55, deception: 85, resilience: 65, resource_focus: "wealth" },
    zealot: { aggression: 80, diplomacy: 15, deception: 25, resilience: 75, resource_focus: "support" },
    survivalist: { aggression: 20, diplomacy: 60, deception: 60, resilience: 85, resource_focus: "stability" },
    void: { aggression: 50, diplomacy: 20, deception: 95, resilience: 30, resource_focus: "fear" },
  },
  narrativeTone: "intrigue_suspense",
  primaryMechanics: ["influence_networks", "secret_management", "public_perception", "alliance_dynamics"],
};

const ECONOMIC_CONFIG: ConflictConfig = {
  type: "economic",
  displayName: "Economic Warfare",
  description: "Competition for markets, resources, and financial dominance",
  terminology: {
    casualties: "bankruptcies",
    territory: "market share",
    garrison: "holdings",
    counteroffensive: "hostile takeover",
    morale: "investor confidence",
    infantry: "workforce",
    armor: "capital reserves",
    air: "market manipulation",
    strategicValue: "asset value",
    base: "headquarters",
    victory: "monopoly",
    defeat: "bankruptcy",
    stalemate: "market equilibrium",
    resources: "capital",
    attack: "acquisition",
    defense: "hedge",
    retreat: "divestiture",
    reinforcement: "investment",
    intelligence: "market intelligence",
    propaganda: "marketing",
  },
  resourceAxes: {
    primary: ["wealth", "power", "stability"],
    secondary: ["support", "knowledge", "morale"],
    hidden: ["hope", "fear"],
  },
  eventTaxonomy: {
    positive: ["merger_success", "market_boom", "patent_secured", "rival_collapses"],
    negative: ["market_crash", "hostile_takeover", "scandal", "embargo"],
    neutral: ["regulation_change", "market_shift", "new_competitor"],
    catastrophic: ["total_collapse", "fraud_exposed", "systemic_failure", "depression"],
  },
  archetypeDefaults: {
    militarist: { aggression: 75, diplomacy: 25, deception: 45, resilience: 55, resource_focus: "power" },
    diplomat: { aggression: 20, diplomacy: 80, deception: 35, resilience: 65, resource_focus: "support" },
    corporation: { aggression: 60, diplomacy: 40, deception: 70, resilience: 75, resource_focus: "wealth" },
    zealot: { aggression: 85, diplomacy: 5, deception: 30, resilience: 80, resource_focus: "power" },
    survivalist: { aggression: 30, diplomacy: 45, deception: 40, resilience: 90, resource_focus: "stability" },
    void: { aggression: 65, diplomacy: 15, deception: 90, resilience: 35, resource_focus: "wealth" },
  },
  narrativeTone: "corporate_thriller",
  primaryMechanics: ["market_dynamics", "resource_competition", "corporate_espionage", "financial_instruments"],
};

const SOCIAL_CONFIG: ConflictConfig = {
  type: "social",
  displayName: "Social Movement",
  description: "Ideological and cultural struggles for hearts and minds",
  terminology: {
    casualties: "disillusioned",
    territory: "communities",
    garrison: "supporters",
    counteroffensive: "counter-movement",
    morale: "conviction",
    infantry: "activists",
    armor: "institutions",
    air: "viral reach",
    strategicValue: "cultural significance",
    base: "movement headquarters",
    victory: "cultural shift",
    defeat: "marginalization",
    stalemate: "culture war",
    resources: "momentum",
    attack: "campaign",
    defense: "resistance",
    retreat: "regroup",
    reinforcement: "solidarity",
    intelligence: "social intelligence",
    propaganda: "messaging",
  },
  resourceAxes: {
    primary: ["support", "hope", "morale"],
    secondary: ["knowledge", "stability", "power"],
    hidden: ["wealth", "fear"],
  },
  eventTaxonomy: {
    positive: ["movement_grows", "leader_emerges", "law_changed", "public_awakening"],
    negative: ["crackdown", "schism", "scandal", "leader_falls"],
    neutral: ["debate", "demonstration", "media_coverage"],
    catastrophic: ["violent_suppression", "movement_collapse", "civil_unrest", "martyrdom"],
  },
  archetypeDefaults: {
    militarist: { aggression: 65, diplomacy: 35, deception: 25, resilience: 70, resource_focus: "power" },
    diplomat: { aggression: 15, diplomacy: 90, deception: 20, resilience: 75, resource_focus: "support" },
    corporation: { aggression: 40, diplomacy: 50, deception: 75, resilience: 55, resource_focus: "wealth" },
    zealot: { aggression: 75, diplomacy: 20, deception: 15, resilience: 90, resource_focus: "hope" },
    survivalist: { aggression: 25, diplomacy: 55, deception: 35, resilience: 85, resource_focus: "stability" },
    void: { aggression: 55, diplomacy: 10, deception: 85, resilience: 45, resource_focus: "fear" },
  },
  narrativeTone: "revolutionary_hope",
  primaryMechanics: ["public_opinion", "community_building", "narrative_control", "identity_politics"],
};

const SURVIVAL_CONFIG: ConflictConfig = {
  type: "survival",
  displayName: "Survival Crisis",
  description: "Struggle against environmental or systemic collapse",
  terminology: {
    casualties: "perished",
    territory: "habitable zones",
    garrison: "shelters",
    counteroffensive: "reclamation",
    morale: "will to survive",
    infantry: "scavengers",
    armor: "fortifications",
    air: "scouts",
    strategicValue: "resource density",
    base: "settlement",
    victory: "sustainability",
    defeat: "extinction",
    stalemate: "subsistence",
    resources: "provisions",
    attack: "raid",
    defense: "bunker down",
    retreat: "evacuation",
    reinforcement: "rescue",
    intelligence: "scouting reports",
    propaganda: "broadcasts",
  },
  resourceAxes: {
    primary: ["stability", "hope", "morale"],
    secondary: ["wealth", "support", "power"],
    hidden: ["knowledge", "fear"],
  },
  eventTaxonomy: {
    positive: ["cache_found", "safe_zone_established", "rescue_mission", "weather_clears"],
    negative: ["contamination", "raid", "equipment_failure", "disease_outbreak"],
    neutral: ["migration", "discovery", "stranger_encounter"],
    catastrophic: ["extinction_event", "total_collapse", "mass_death", "no_return"],
  },
  archetypeDefaults: {
    militarist: { aggression: 55, diplomacy: 30, deception: 35, resilience: 80, resource_focus: "power" },
    diplomat: { aggression: 20, diplomacy: 70, deception: 25, resilience: 70, resource_focus: "support" },
    corporation: { aggression: 50, diplomacy: 35, deception: 65, resilience: 60, resource_focus: "wealth" },
    zealot: { aggression: 60, diplomacy: 15, deception: 20, resilience: 85, resource_focus: "hope" },
    survivalist: { aggression: 35, diplomacy: 40, deception: 45, resilience: 95, resource_focus: "stability" },
    void: { aggression: 80, diplomacy: 5, deception: 75, resilience: 50, resource_focus: "fear" },
  },
  narrativeTone: "desperate_resilience",
  primaryMechanics: ["resource_scarcity", "environmental_hazards", "community_survival", "moral_choices"],
};

export const CONFLICT_CONFIGS: Record<ConflictType, ConflictConfig> = {
  military: MILITARY_CONFIG,
  horror: HORROR_CONFIG,
  political: POLITICAL_CONFIG,
  economic: ECONOMIC_CONFIG,
  social: SOCIAL_CONFIG,
  survival: SURVIVAL_CONFIG,
};

export function getConflictConfig(type: ConflictType): ConflictConfig {
  return CONFLICT_CONFIGS[type];
}

export function translateTerm(
  term: keyof TerminologyDictionary,
  conflictType: ConflictType
): string {
  return CONFLICT_CONFIGS[conflictType].terminology[term];
}

export function getArchetypeDefaults(
  archetype: FactionArchetype,
  conflictType: ConflictType
): BehaviorDefaults {
  return CONFLICT_CONFIGS[conflictType].archetypeDefaults[archetype];
}

export function getPrimaryResources(conflictType: ConflictType): string[] {
  return CONFLICT_CONFIGS[conflictType].resourceAxes.primary;
}

export function getEventsByType(
  conflictType: ConflictType,
  eventType: keyof EventTaxonomy
): string[] {
  return CONFLICT_CONFIGS[conflictType].eventTaxonomy[eventType];
}
