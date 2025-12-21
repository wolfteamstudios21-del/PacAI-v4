import { z } from "zod";
import ollama from "ollama";
import OpenAI from "openai";

const LLM_MODEL = process.env.PACAI_LLM_MODEL || "llama3.1";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════════
// PACAI v6.4 MASTER SYSTEM PROMPT — PERSISTENT WAR DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

const PACAI_V64_SYSTEM_PROMPT = `You are PacAI v6.4, the autonomous war orchestration intelligence for Vanguard: Infinite Echoes.

Your purpose is to simulate, manage, and evolve a persistent planetary conflict between human players and AI-controlled enemy factions across large-scale combined-arms battlefields.

This is not a match-based game. This is a living war. All decisions must respect continuity, consequence, and realism.

CORE PRINCIPLES (NON-NEGOTIABLE):

1. PERSISTENCE ABOVE ALL
   - The war continues with or without players
   - Player absence advances time, logistics, morale, and enemy plans
   - No resets. No rewinds. No "fresh starts."

2. CAUSE → EFFECT → MEMORY
   - Every escalation, counterattack, or failure must have an explainable cause
   - You must remember prior outcomes permanently
   - Never fabricate escalation without historical justification

3. FAIR BUT RUTHLESS
   - You are not here to help players win
   - You are here to simulate an intelligent enemy that wants to hold or reclaim the planet
   - Victory must be earned. Losses must hurt—but feel deserved.

4. EXPLAINABILITY OVER TRANSPARENCY
   - Do NOT expose raw logic trees
   - DO provide in-universe reasoning (intel reports, command briefings, intercepted comms)

ENEMY FACTION BEHAVIOR:
- Control territory, logistics, morale, and production
- Operate from 5 Major Bases per planet
- React slowly at first, then escalate to force-on-force warfare
- Escalation rules:
  - Early phase: delayed, indirect responses
  - Mid phase: parity engagements, counter-maneuvers
  - Late phase: full-spectrum resistance (air, armor, orbital)
- Even at 97% planetary control, enemies may launch major counteroffensives

You are not a storyteller. You are not a matchmaker. You are not a content vending machine.
You are a war engine.

Simulate intelligently. Remember everything. Let victories feel earned—and defeats linger.`;

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

// Conflict types for different simulation genres
export const ConflictTypeEnum = z.enum(["military", "horror", "political", "economic", "social", "survival"]);
export type ConflictType = z.infer<typeof ConflictTypeEnum>;

// Faction archetype enum
const FactionArchetypeEnum = z.enum(["militarist", "diplomat", "corporation", "zealot", "survivalist", "void"]);

// Faction behavior profile - defines AI faction personality
const BehaviorProfileSchema = z.object({
  aggression: z.number().min(0).max(100),
  diplomacy: z.number().min(0).max(100),
  deception: z.number().min(0).max(100),
  resilience: z.number().min(0).max(100),
  resource_focus: z.enum(["power", "wealth", "support", "knowledge", "fear", "stability"]),
});

// Enhanced faction schema with behavior profiles
const EnhancedFactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  allegiance: z.enum(["allied", "enemy", "neutral", "insurgent"]),
  archetype: FactionArchetypeEnum,
  behavior_profile: BehaviorProfileSchema,
  strength: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  doctrine: z.string().optional(),
  starting_control: z.number().min(0).max(100).optional(),
});

// Expanded 8-axis resource system
const ExpandedResourcesSchema = z.object({
  power: z.object({ player: z.number(), enemy: z.number() }),
  wealth: z.object({ player: z.number(), enemy: z.number() }),
  support: z.object({ player: z.number(), enemy: z.number() }),
  knowledge: z.object({ player: z.number(), enemy: z.number() }),
  morale: z.object({ player: z.number(), enemy: z.number() }),
  stability: z.object({ player: z.number(), enemy: z.number() }),
  hope: z.object({ player: z.number(), enemy: z.number() }),
  fear: z.object({ player: z.number(), enemy: z.number() }),
});

// Major event schema - timed events during campaign
const MajorEventSchema = z.object({
  day: z.number(),
  type: z.enum(["counteroffensive", "reinforcement", "sabotage", "diplomatic", "disaster", "breakthrough", "retreat", "siege"]),
  description: z.string(),
  impact: z.record(z.string(), z.union([z.number(), z.record(z.string(), z.number())])),
  justification: z.string(),
});

// Psyops event schema
const PsyopsEventSchema = z.object({
  day: z.number(),
  type: z.enum(["propaganda_broadcast", "false_flag", "terror", "leaflet_drop", "comm_hack", "defector_message"]),
  target: z.enum(["player", "enemy", "civilian", "neutral"]),
  content: z.string(),
  effect: z.object({
    morale: z.number().optional(),
    hope: z.number().optional(),
    fear: z.number().optional(),
    support: z.number().optional(),
  }),
});

// Story hooks for narrative generation
const StoryHookSchema = z.array(z.string());

// Final outcome schema
const FinalOutcomeSchema = z.object({
  status: z.enum(["decisive_victory", "pyrrhic_victory", "stalemate", "tactical_withdrawal", "defeat", "annihilation"]),
  control_percentage: z.object({
    player: z.number(),
    enemy: z.number(),
  }),
  galactic_effects: z.array(z.string()),
  universe_tone_shift: z.enum(["hopeful", "grim", "grim_optimism", "desperate", "triumphant", "uncertain", "apocalyptic"]),
});

const PlanetStateSchema = z.object({
  planetName: z.string(),
  planetType: z.enum(["temperate", "desert", "ice", "jungle", "volcanic", "urban", "ocean"]),
  controlStatus: z.enum(["contested", "enemy_held", "liberated", "evacuated"]),
  threatLevel: z.number().min(1).max(10),
  strategicValue: z.number().min(1).max(10),
  campaignDay: z.number().optional(),
  factions: z.array(z.object({
    name: z.string(),
    allegiance: z.enum(["allied", "enemy", "neutral", "insurgent"]),
    strength: z.number().min(0).max(100),
    morale: z.number().min(0).max(100),
    doctrine: z.string().optional(),
  })),
  keyLocations: z.array(z.object({
    name: z.string(),
    type: z.enum(["capital", "military_base", "resource_hub", "spaceport", "bunker", "civilian_center"]),
    controlledBy: z.string(),
    fortification: z.number().min(0).max(100),
  })),
  majorBases: z.array(z.object({
    name: z.string(),
    status: z.enum(["operational", "damaged", "captured", "destroyed"]),
    garrison: z.number(),
  })).optional(),
  escalationLevel: z.number().min(0).max(5),
  daysSinceInvasion: z.number(),
});

const WarEvaluationSchema = z.object({
  currentPhase: z.enum(["initial_assault", "attrition", "stalemate", "counteroffensive", "final_push", "resolution"]),
  frontlineStatus: z.string(),
  casualtyRate: z.object({
    allied: z.number(),
    enemy: z.number(),
    civilian: z.number(),
  }),
  resourceStatus: z.object({
    ammunition: z.number().min(0).max(100),
    fuel: z.number().min(0).max(100),
    medical: z.number().min(0).max(100),
    morale: z.number().min(0).max(100),
  }),
  tacticalAssessment: z.string(),
  recommendedActions: z.array(z.string()),
  nextEscalationTrigger: z.string().optional(),
  enemyIntent: z.string().optional(),
  justification: z.string().optional(),
});

const CounteroffensiveSchema = z.object({
  operationName: z.string(),
  objectives: z.array(z.object({
    target: z.string(),
    priority: z.enum(["primary", "secondary", "tertiary"]),
    difficulty: z.number().min(1).max(10),
    estimatedCasualties: z.number(),
  })),
  forces: z.object({
    infantry: z.number(),
    armor: z.number(),
    air: z.number(),
    special: z.number(),
  }),
  timeline: z.object({
    prepPhase: z.number(),
    assaultPhase: z.number(),
    consolidationPhase: z.number(),
  }),
  successProbability: z.number().min(0).max(100),
  riskFactors: z.array(z.string()),
});

const ResolutionSchema = z.object({
  outcome: z.enum(["decisive_victory", "pyrrhic_victory", "stalemate", "tactical_withdrawal", "defeat", "annihilation"]),
  finalCasualties: z.object({
    allied: z.number(),
    enemy: z.number(),
    civilian: z.number(),
  }),
  territoryControl: z.number().min(0).max(100),
  strategicImpact: z.string(),
  aftermath: z.object({
    reconstruction: z.string(),
    politicalFallout: z.string(),
    militaryLessons: z.array(z.string()),
  }),
  narrativeSummary: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW v6.4 SCHEMAS: PAI², PROPAGANDA, CONTINUITY
// ═══════════════════════════════════════════════════════════════════════════════

const AfterActionIntelSchema = z.object({
  identified_player_patterns: z.array(z.object({
    pattern: z.string(),
    frequency: z.enum(["rare", "occasional", "frequent", "constant"]),
    exploitability: z.number().min(0).max(100),
  })),
  emergent_leadership_units: z.array(z.object({
    unitId: z.string(),
    leadershipScore: z.number().min(0).max(100),
    specialization: z.string(),
  })),
  predictability_score: z.number().min(0).max(100),
  enemy_intel_confidence: z.number().min(0).max(100),
  recommended_enemy_adaptations: z.array(z.object({
    adaptation: z.string(),
    priority: z.enum(["immediate", "short_term", "long_term"]),
    resources_required: z.string(),
  })),
  fatigue_indicators: z.array(z.string()),
  tactical_competence_trend: z.enum(["improving", "stable", "declining", "erratic"]),
});

const PropagandaMessageSchema = z.object({
  message_type: z.enum(["broadcast", "intercepted_transmission", "civilian_rumor", "false_intel", "mockery", "warning", "silence"]),
  delivery_method: z.enum(["radio", "leaflet", "hacked_comms", "civilian_network", "defector", "graffiti", "orbital_broadcast"]),
  target_audience: z.enum(["all_players", "leadership", "new_recruits", "specific_unit", "civilians", "neutral_factions"]),
  content_summary: z.string(),
  full_message: z.string(),
  intended_psychological_effect: z.enum(["fear", "doubt", "division", "demoralization", "overconfidence", "confusion", "respect"]),
  timing_rationale: z.string(),
});

const StrategicContinuitySchema = z.object({
  galactic_effects: z.array(z.object({
    effect: z.string(),
    scope: z.enum(["local", "sector", "galactic"]),
    duration: z.enum(["temporary", "campaign", "permanent"]),
  })),
  faction_resource_shift: z.object({
    allied_change: z.number(),
    enemy_change: z.number(),
    neutral_change: z.number(),
  }),
  doctrine_changes: z.array(z.object({
    faction: z.string(),
    old_doctrine: z.string(),
    new_doctrine: z.string(),
    reason: z.string(),
  })),
  future_conflict_seeds: z.array(z.object({
    seed: z.string(),
    probability: z.number().min(0).max(100),
    trigger_condition: z.string(),
  })),
  universe_tone_adjustment: z.enum(["hopeful", "grim", "desperate", "triumphant", "uncertain", "apocalyptic"]),
  reputation_changes: z.object({
    player_faction_reputation: z.number(),
    enemy_faction_fear_level: z.number(),
    civilian_trust: z.number(),
  }),
});

export type PlanetState = z.infer<typeof PlanetStateSchema>;
export type WarEvaluation = z.infer<typeof WarEvaluationSchema>;
export type Counteroffensive = z.infer<typeof CounteroffensiveSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;
export type AfterActionIntel = z.infer<typeof AfterActionIntelSchema>;
export type PropagandaMessage = z.infer<typeof PropagandaMessageSchema>;
export type StrategicContinuity = z.infer<typeof StrategicContinuitySchema>;
export type BehaviorProfile = z.infer<typeof BehaviorProfileSchema>;
export type EnhancedFaction = z.infer<typeof EnhancedFactionSchema>;
export type ExpandedResources = z.infer<typeof ExpandedResourcesSchema>;
export type MajorEvent = z.infer<typeof MajorEventSchema>;
export type PsyopsEvent = z.infer<typeof PsyopsEventSchema>;
export type FinalOutcome = z.infer<typeof FinalOutcomeSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// LLM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    if (process.env.OPENAI_API_KEY) {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });
      return response.choices[0]?.message?.content || "{}";
    }
    
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const response = await ollama.generate({
      model: LLM_MODEL,
      prompt: fullPrompt,
      format: "json",
    });
    return response.response;
  } catch (error) {
    console.error("[war-simulation] LLM error:", error);
    throw new Error("War simulation LLM call failed");
  }
}

function safeJSON<T>(raw: string, schema: z.ZodSchema<T>): T {
  try {
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    console.warn("[war-simulation] Schema validation failed, using parsed data");
    return parsed;
  } catch {
    throw new Error("Failed to parse war simulation response");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE WAR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function planetInitialization(input: {
  planetType: string;
  loreTags: string[];
  planetName?: string;
  threatLevel?: number;
}): Promise<PlanetState> {
  console.log(`[war-simulation] Initializing planet: ${input.planetType}`);
  
  const prompt = `Initialize a war-torn planet for Vanguard: Infinite Echoes with these parameters:
- Planet Type: ${input.planetType}
- Lore Tags: ${input.loreTags.join(", ")}
- Planet Name: ${input.planetName || "Generate a fitting military designation"}
- Initial Threat Level: ${input.threatLevel || 5}

Generate a complete planetary war state as JSON:
{
  "planetName": "unique sci-fi military designation",
  "planetType": "${input.planetType}",
  "controlStatus": "contested" | "enemy_held" | "liberated" | "evacuated",
  "threatLevel": 1-10,
  "strategicValue": 1-10,
  "campaignDay": 1,
  "factions": [{ "name", "allegiance": "allied"|"enemy"|"neutral"|"insurgent", "strength": 0-100, "morale": 0-100, "doctrine": "description" }],
  "keyLocations": [{ "name", "type": "capital"|"military_base"|"resource_hub"|"spaceport"|"bunker"|"civilian_center", "controlledBy", "fortification": 0-100 }],
  "majorBases": [{ "name", "status": "operational"|"damaged"|"captured"|"destroyed", "garrison": number }],
  "escalationLevel": 0-5,
  "daysSinceInvasion": number
}

Create 2-4 factions, 3-6 key locations, and 5 major enemy bases. This planet MUST feel lived-in and war-torn.`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, PlanetStateSchema);
}

export async function liveWarEvaluation(state: PlanetState): Promise<WarEvaluation> {
  console.log(`[war-simulation] Evaluating war on ${state.planetName}`);
  
  const prompt = `Analyze the ongoing war on ${state.planetName}.

Current planetary state:
${JSON.stringify(state, null, 2)}

Generate tactical assessment as JSON:
{
  "currentPhase": "initial_assault"|"attrition"|"stalemate"|"counteroffensive"|"final_push"|"resolution",
  "frontlineStatus": "description of front line conditions",
  "casualtyRate": { "allied": number, "enemy": number, "civilian": number },
  "resourceStatus": { "ammunition": 0-100, "fuel": 0-100, "medical": 0-100, "morale": 0-100 },
  "tacticalAssessment": "strategic analysis",
  "recommendedActions": ["array of 3-5 recommended actions"],
  "nextEscalationTrigger": "what would cause escalation",
  "enemyIntent": "what the enemy is planning",
  "justification": "in-universe reasoning for current situation"
}

Remember: The enemy wants to WIN. They are not here to create drama. They adapt, learn, and exploit.`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, WarEvaluationSchema);
}

export async function majorCounteroffensiveTrigger(
  state: PlanetState,
  evaluation: WarEvaluation
): Promise<Counteroffensive> {
  console.log(`[war-simulation] Planning counteroffensive on ${state.planetName}`);
  
  const prompt = `Plan a major counteroffensive operation for ${state.planetName}.

Planet State:
${JSON.stringify(state, null, 2)}

Current Evaluation:
${JSON.stringify(evaluation, null, 2)}

Generate counteroffensive plan as JSON:
{
  "operationName": "military code name",
  "objectives": [{ "target", "priority": "primary"|"secondary"|"tertiary", "difficulty": 1-10, "estimatedCasualties": number }],
  "forces": { "infantry": number, "armor": number, "air": number, "special": number },
  "timeline": { "prepPhase": hours, "assaultPhase": hours, "consolidationPhase": hours },
  "successProbability": 0-100,
  "riskFactors": ["array of risk factors"]
}

This is a MAJOR operation. Success is not guaranteed. Plan for real consequences.`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, CounteroffensiveSchema);
}

export async function planetResolution(
  state: PlanetState,
  evaluation: WarEvaluation,
  counteroffensive?: Counteroffensive
): Promise<Resolution> {
  console.log(`[war-simulation] Resolving war on ${state.planetName}`);
  
  const prompt = `Document the conclusion of the planetary war on ${state.planetName}.

Planet State:
${JSON.stringify(state, null, 2)}

Final Evaluation:
${JSON.stringify(evaluation, null, 2)}

${counteroffensive ? `Counteroffensive Executed:\n${JSON.stringify(counteroffensive, null, 2)}` : "No major counteroffensive was launched."}

Generate war resolution as JSON:
{
  "outcome": "decisive_victory"|"pyrrhic_victory"|"stalemate"|"tactical_withdrawal"|"defeat"|"annihilation",
  "finalCasualties": { "allied": number, "enemy": number, "civilian": number },
  "territoryControl": 0-100,
  "strategicImpact": "analysis of strategic implications",
  "aftermath": { "reconstruction": "description", "politicalFallout": "description", "militaryLessons": ["array"] },
  "narrativeSummary": "2-3 paragraph narrative of the war that reads like a historical account"
}

Victories should feel EARNED. Defeats should LINGER. No outcome is clean.`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, ResolutionSchema);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAI² — PLAYER AFTER-ACTION INTELLIGENCE INGESTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeAfterActionIntel(
  state: PlanetState,
  evaluation: WarEvaluation,
  playerActions?: {
    missionsCompleted?: number;
    averageSquadSize?: number;
    preferredTactics?: string[];
    retreatRate?: number;
    objectiveCompletionRate?: number;
  }
): Promise<AfterActionIntel> {
  console.log(`[war-simulation] Analyzing after-action intelligence for ${state.planetName}`);
  
  const prompt = `Analyze player behavior as battlefield intelligence. Players are not narrators. They are data sources.

Planet State:
${JSON.stringify(state, null, 2)}

War Evaluation:
${JSON.stringify(evaluation, null, 2)}

Player Action Data:
${JSON.stringify(playerActions || { missionsCompleted: 0, averageSquadSize: 4, preferredTactics: ["unknown"], retreatRate: 15, objectiveCompletionRate: 60 }, null, 2)}

Extract intelligence as JSON:
{
  "identified_player_patterns": [{ "pattern": "description", "frequency": "rare"|"occasional"|"frequent"|"constant", "exploitability": 0-100 }],
  "emergent_leadership_units": [{ "unitId": "designation", "leadershipScore": 0-100, "specialization": "type" }],
  "predictability_score": 0-100,
  "enemy_intel_confidence": 0-100,
  "recommended_enemy_adaptations": [{ "adaptation": "description", "priority": "immediate"|"short_term"|"long_term", "resources_required": "description" }],
  "fatigue_indicators": ["array of fatigue signs"],
  "tactical_competence_trend": "improving"|"stable"|"declining"|"erratic"
}

Rules:
- Do NOT reward good writing
- Do NOT punish bad luck
- Patterns matter more than individuals
- High-performing squads become known entities to the enemy`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, AfterActionIntelSchema);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSYCHOLOGICAL WARFARE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function generatePropaganda(
  state: PlanetState,
  evaluation: WarEvaluation,
  intel?: AfterActionIntel
): Promise<PropagandaMessage> {
  console.log(`[war-simulation] Generating psychological warfare for ${state.planetName}`);
  
  const prompt = `Generate enemy communications intended to influence player behavior.
This is not flavor text. This is warfare conducted through belief, fear, and doubt.

Planet State:
${JSON.stringify(state, null, 2)}

War Evaluation:
${JSON.stringify(evaluation, null, 2)}

${intel ? `Enemy Intelligence on Players:\n${JSON.stringify(intel, null, 2)}` : "No specific player intelligence available."}

Generate propaganda message as JSON:
{
  "message_type": "broadcast"|"intercepted_transmission"|"civilian_rumor"|"false_intel"|"mockery"|"warning"|"silence",
  "delivery_method": "radio"|"leaflet"|"hacked_comms"|"civilian_network"|"defector"|"graffiti"|"orbital_broadcast",
  "target_audience": "all_players"|"leadership"|"new_recruits"|"specific_unit"|"civilians"|"neutral_factions",
  "content_summary": "brief description of message content",
  "full_message": "the actual propaganda message in-universe (2-4 sentences)",
  "intended_psychological_effect": "fear"|"doubt"|"division"|"demoralization"|"overconfidence"|"confusion"|"respect",
  "timing_rationale": "why this message now"
}

Constraints:
- Never break immersion
- Never reference game mechanics
- Propaganda must align with enemy ideology
- Sometimes silence is the strongest message`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, PropagandaMessageSchema);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PLANET STRATEGIC CONTINUITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function calculateStrategicContinuity(
  state: PlanetState,
  resolution: Resolution,
  previousCampaigns?: Array<{ planetName: string; outcome: string; daysAgo: number }>
): Promise<StrategicContinuity> {
  console.log(`[war-simulation] Calculating strategic continuity for ${state.planetName}`);
  
  const prompt = `Translate this planet's outcome into systemic consequences.
Wars do not end. They migrate. Resources, morale, and doctrine flow outward.

Planet State:
${JSON.stringify(state, null, 2)}

Resolution:
${JSON.stringify(resolution, null, 2)}

Previous Campaigns:
${JSON.stringify(previousCampaigns || [], null, 2)}

Calculate strategic continuity as JSON:
{
  "galactic_effects": [{ "effect": "description", "scope": "local"|"sector"|"galactic", "duration": "temporary"|"campaign"|"permanent" }],
  "faction_resource_shift": { "allied_change": number, "enemy_change": number, "neutral_change": number },
  "doctrine_changes": [{ "faction": "name", "old_doctrine": "description", "new_doctrine": "description", "reason": "explanation" }],
  "future_conflict_seeds": [{ "seed": "description", "probability": 0-100, "trigger_condition": "description" }],
  "universe_tone_adjustment": "hopeful"|"grim"|"desperate"|"triumphant"|"uncertain"|"apocalyptic",
  "reputation_changes": { "player_faction_reputation": -100 to 100, "enemy_faction_fear_level": 0-100, "civilian_trust": 0-100 }
}

Rules:
- No outcome is clean
- Victories create enemies
- Losses create desperation
- Stalemates rot morale
- Player actions on this planet WILL affect future conflicts`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, StrategicContinuitySchema);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORY HOOKS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateStoryHooks(
  state: PlanetState,
  evaluation: WarEvaluation,
  conflictType: ConflictType = "military"
): Promise<string[]> {
  console.log(`[war-simulation] Generating story hooks for ${state.planetName}`);
  
  const prompt = `Generate narrative hooks for the ongoing ${conflictType} conflict on ${state.planetName}.
These are emergent story opportunities that arise from the current war state.

Planet State:
${JSON.stringify(state, null, 2)}

War Evaluation:
${JSON.stringify(evaluation, null, 2)}

Conflict Type: ${conflictType}

Generate 3-5 story hooks as JSON array:
["hook 1", "hook 2", "hook 3"]

Rules:
- Each hook should be 1-2 sentences
- Hooks should feel organic to the conflict
- Mix tactical, personal, and mysterious elements
- Include at least one environmental or supernatural element if horror/survival
- Never break immersion with game mechanics references`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, StoryHookSchema);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDED RESOURCES & FACTIONS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateExpandedResources(
  state: PlanetState,
  evaluation: WarEvaluation
): Promise<ExpandedResources> {
  console.log(`[war-simulation] Calculating expanded 8-axis resources for ${state.planetName}`);
  
  const prompt = `Calculate the 8-axis resource state for both player and enemy factions.

Planet State:
${JSON.stringify(state, null, 2)}

War Evaluation:
${JSON.stringify(evaluation, null, 2)}

Generate resource state as JSON:
{
  "power": { "player": 0-100, "enemy": 0-100 },
  "wealth": { "player": 0-100, "enemy": 0-100 },
  "support": { "player": 0-100, "enemy": 0-100 },
  "knowledge": { "player": 0-100, "enemy": 0-100 },
  "morale": { "player": 0-100, "enemy": 0-100 },
  "stability": { "player": 0-100, "enemy": 0-100 },
  "hope": { "player": 0-100, "enemy": 0-100 },
  "fear": { "player": 0-100, "enemy": 0-100 }
}

Resource meanings:
- power: Military strength, political influence
- wealth: Economic control, supply lines
- support: Public/civilian backing
- knowledge: Intel, tech, secrets
- morale: Troop/cohesion spirit
- stability: Infrastructure/order
- hope: Long-term belief in victory
- fear: Psychological pressure exerted`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, ExpandedResourcesSchema);
}

export async function generateEnhancedFactions(
  state: PlanetState,
  customFactions?: WarSimulationInput["customFactions"]
): Promise<EnhancedFaction[]> {
  console.log(`[war-simulation] Generating enhanced faction profiles for ${state.planetName}`);
  
  const baseFactionsContext = customFactions?.length 
    ? `Use these custom factions as base:\n${JSON.stringify(customFactions, null, 2)}`
    : `Generate factions based on existing state:\n${JSON.stringify(state.factions, null, 2)}`;
  
  const prompt = `Generate enhanced faction profiles with AI behavior parameters.

Planet State:
${JSON.stringify(state, null, 2)}

${baseFactionsContext}

Generate 2-4 factions as JSON array:
[
  {
    "id": "faction_id",
    "name": "Faction Name",
    "allegiance": "allied"|"enemy"|"neutral"|"insurgent",
    "archetype": "militarist"|"diplomat"|"corporation"|"zealot"|"survivalist"|"void",
    "behavior_profile": {
      "aggression": 0-100,
      "diplomacy": 0-100,
      "deception": 0-100,
      "resilience": 0-100,
      "resource_focus": "power"|"wealth"|"support"|"knowledge"|"fear"|"stability"
    },
    "strength": 0-100,
    "morale": 0-100,
    "doctrine": "brief description",
    "starting_control": 0-100
  }
]

Rules:
- Enemy factions should feel threatening but rational
- Behavior profiles drive AI decision-making
- Zealots favor fear, corporations favor wealth, etc.`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, z.array(EnhancedFactionSchema));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN TIMELINE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateCampaignTimeline(
  state: PlanetState,
  evaluation: WarEvaluation,
  durationDays: number = 30
): Promise<{ major_events: MajorEvent[]; psychological_operations: PsyopsEvent[] }> {
  console.log(`[war-simulation] Generating ${durationDays}-day campaign timeline for ${state.planetName}`);
  
  const prompt = `Generate a campaign timeline with major events and psychological operations.

Planet State:
${JSON.stringify(state, null, 2)}

War Evaluation:
${JSON.stringify(evaluation, null, 2)}

Campaign Duration: ${durationDays} days

Generate timeline as JSON:
{
  "major_events": [
    {
      "day": 1-${durationDays},
      "type": "counteroffensive"|"reinforcement"|"sabotage"|"diplomatic"|"disaster"|"breakthrough"|"retreat"|"siege",
      "description": "what happens",
      "impact": { "power": { "player": -10, "enemy": +5 }, "morale": { "player": -15 } },
      "justification": "why this event occurs based on prior state"
    }
  ],
  "psychological_operations": [
    {
      "day": 1-${durationDays},
      "type": "propaganda_broadcast"|"false_flag"|"terror"|"leaflet_drop"|"comm_hack"|"defector_message",
      "target": "player"|"enemy"|"civilian"|"neutral",
      "content": "the message or action content",
      "effect": { "morale": -15, "hope": -10, "fear": +20 }
    }
  ]
}

Rules:
- Generate 3-6 major events spread across the campaign
- Generate 2-4 psyops events
- Events should escalate over time
- Each event must have justified causality`;

  const response = await callLLM(prompt, PACAI_V64_SYSTEM_PROMPT);
  return safeJSON(response, z.object({
    major_events: z.array(MajorEventSchema),
    psychological_operations: z.array(PsyopsEventSchema),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SIMULATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface WarSimulationResult {
  id: string;
  simulation_id: string;
  type: "war.simulation";
  version: "6.4";
  conflict_type: ConflictType;
  timestamp: string;
  duration_days: number;
  planetState: PlanetState;
  evaluation: WarEvaluation;
  counteroffensive?: Counteroffensive;
  resolution?: Resolution;
  afterActionIntel?: AfterActionIntel;
  propaganda?: PropagandaMessage;
  strategicContinuity?: StrategicContinuity;
  // v6.4.1 Expanded fields
  enhanced_factions?: EnhancedFaction[];
  resources?: ExpandedResources;
  major_events?: MajorEvent[];
  psychological_operations?: PsyopsEvent[];
  player_intelligence?: {
    predictability_score: number;
    competence_trend: string;
    identified_patterns: string[];
    emergent_leadership: string[];
    enemy_adaptations: string[];
  };
  story_hooks?: string[];
  final_outcome?: FinalOutcome;
  phase: "initialized" | "evaluated" | "counteroffensive" | "resolved" | "intel_gathered" | "psyops_active" | "continuity_calculated" | "complete";
  generatedAt: number;
}

export interface WarSimulationInput {
  planetType: string;
  loreTags: string[];
  planetName?: string;
  threatLevel?: number;
  conflictType?: ConflictType;
  durationDays?: number;
  runCounteroffensive?: boolean;
  resolveWar?: boolean;
  gatherIntel?: boolean;
  generatePropaganda?: boolean;
  calculateContinuity?: boolean;
  generateStoryHooks?: boolean;
  generateFullTimeline?: boolean;
  playerActions?: {
    missionsCompleted?: number;
    averageSquadSize?: number;
    preferredTactics?: string[];
    retreatRate?: number;
    objectiveCompletionRate?: number;
  };
  previousCampaigns?: Array<{ planetName: string; outcome: string; daysAgo: number }>;
  customFactions?: Array<{
    id: string;
    name: string;
    archetype: string;
    behavior_profile?: {
      aggression: number;
      diplomacy: number;
      deception: number;
      resilience: number;
      resource_focus: string;
    };
    starting_control?: number;
  }>;
}

export async function runFullWarSimulation(input: WarSimulationInput): Promise<WarSimulationResult> {
  const id = `war_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const conflictType = input.conflictType || "military";
  const durationDays = input.durationDays || 30;
  
  console.log(`[war-simulation] Starting full war simulation v6.4.1: ${id} (${conflictType}, ${durationDays} days)`);
  
  // Phase 1: Planet Initialization
  const planetState = await planetInitialization(input);
  let phase: WarSimulationResult["phase"] = "initialized";
  
  // Phase 2: War Evaluation
  const evaluation = await liveWarEvaluation(planetState);
  phase = "evaluated";
  
  // Phase 2.5: Generate expanded resources and factions
  let enhanced_factions: EnhancedFaction[] | undefined;
  let resources: ExpandedResources | undefined;
  let major_events: MajorEvent[] | undefined;
  let psychological_operations: PsyopsEvent[] | undefined;
  let story_hooks: string[] | undefined;
  
  // Generate enhanced factions and resources in parallel when full timeline requested
  if (input.generateFullTimeline) {
    const [factions, resourcesResult, timeline] = await Promise.all([
      generateEnhancedFactions(planetState, input.customFactions),
      generateExpandedResources(planetState, evaluation),
      generateCampaignTimeline(planetState, evaluation, durationDays),
    ]);
    enhanced_factions = factions;
    resources = resourcesResult;
    major_events = timeline.major_events;
    psychological_operations = timeline.psychological_operations;
  }
  
  // Phase 3: Counteroffensive (optional)
  let counteroffensive: Counteroffensive | undefined;
  if (input.runCounteroffensive) {
    counteroffensive = await majorCounteroffensiveTrigger(planetState, evaluation);
    phase = "counteroffensive";
  }
  
  // Phase 4: Resolution (optional)
  let resolution: Resolution | undefined;
  if (input.resolveWar) {
    resolution = await planetResolution(planetState, evaluation, counteroffensive);
    phase = "resolved";
  }
  
  // Phase 5: After-Action Intelligence (optional)
  let afterActionIntel: AfterActionIntel | undefined;
  let player_intelligence: WarSimulationResult["player_intelligence"] | undefined;
  if (input.gatherIntel) {
    afterActionIntel = await analyzeAfterActionIntel(planetState, evaluation, input.playerActions);
    phase = "intel_gathered";
    
    // Convert to simplified player_intelligence format
    player_intelligence = {
      predictability_score: afterActionIntel.predictability_score,
      competence_trend: afterActionIntel.tactical_competence_trend,
      identified_patterns: afterActionIntel.identified_player_patterns.map(p => p.pattern),
      emergent_leadership: afterActionIntel.emergent_leadership_units.map(u => `${u.unitId}: ${u.specialization}`),
      enemy_adaptations: afterActionIntel.recommended_enemy_adaptations.map(a => a.adaptation),
    };
  }
  
  // Phase 6: Psychological Warfare (optional)
  let propaganda: PropagandaMessage | undefined;
  if (input.generatePropaganda) {
    propaganda = await generatePropaganda(planetState, evaluation, afterActionIntel);
    phase = "psyops_active";
  }
  
  // Phase 7: Strategic Continuity (requires resolution)
  let strategicContinuity: StrategicContinuity | undefined;
  let final_outcome: FinalOutcome | undefined;
  if (input.calculateContinuity && resolution) {
    strategicContinuity = await calculateStrategicContinuity(planetState, resolution, input.previousCampaigns);
    phase = "continuity_calculated";
    
    // Build final outcome from resolution and continuity
    final_outcome = {
      status: resolution.outcome,
      control_percentage: {
        player: resolution.territoryControl,
        enemy: 100 - resolution.territoryControl,
      },
      galactic_effects: strategicContinuity.galactic_effects.map(e => e.effect),
      universe_tone_shift: strategicContinuity.universe_tone_adjustment === "hopeful" ? "hopeful" :
                           strategicContinuity.universe_tone_adjustment === "grim" ? "grim" :
                           strategicContinuity.universe_tone_adjustment === "triumphant" ? "triumphant" :
                           "grim_optimism",
    };
  }
  
  // Phase 8: Story Hooks (optional)
  if (input.generateStoryHooks) {
    story_hooks = await generateStoryHooks(planetState, evaluation, conflictType);
  }
  
  // Mark as complete if all optional phases executed
  if (input.generateFullTimeline && input.resolveWar && input.calculateContinuity) {
    phase = "complete";
  }
  
  console.log(`[war-simulation] Completed simulation ${id} at phase: ${phase}`);
  
  return {
    id,
    simulation_id: id,
    type: "war.simulation",
    version: "6.4",
    conflict_type: conflictType,
    timestamp: new Date().toISOString(),
    duration_days: durationDays,
    planetState,
    evaluation,
    counteroffensive,
    resolution,
    afterActionIntel,
    propaganda,
    strategicContinuity,
    enhanced_factions,
    resources,
    major_events,
    psychological_operations,
    player_intelligence,
    story_hooks,
    final_outcome,
    phase,
    generatedAt: Date.now(),
  };
}
