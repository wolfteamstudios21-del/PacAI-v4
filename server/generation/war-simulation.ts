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

const PlanetStateSchema = z.object({
  planetName: z.string(),
  planetType: z.enum(["temperate", "desert", "ice", "jungle", "volcanic", "urban", "ocean"]),
  controlStatus: z.enum(["contested", "enemy_held", "liberated", "evacuated"]),
  threatLevel: z.number().min(1).max(10),
  strategicValue: z.number().min(1).max(10),
  campaignDay: z.number().default(1),
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
// MAIN SIMULATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface WarSimulationResult {
  id: string;
  type: "war.simulation";
  version: "6.4";
  planetState: PlanetState;
  evaluation: WarEvaluation;
  counteroffensive?: Counteroffensive;
  resolution?: Resolution;
  afterActionIntel?: AfterActionIntel;
  propaganda?: PropagandaMessage;
  strategicContinuity?: StrategicContinuity;
  phase: "initialized" | "evaluated" | "counteroffensive" | "resolved" | "intel_gathered" | "psyops_active" | "continuity_calculated";
  generatedAt: number;
}

export interface WarSimulationInput {
  planetType: string;
  loreTags: string[];
  planetName?: string;
  threatLevel?: number;
  runCounteroffensive?: boolean;
  resolveWar?: boolean;
  gatherIntel?: boolean;
  generatePropaganda?: boolean;
  calculateContinuity?: boolean;
  playerActions?: {
    missionsCompleted?: number;
    averageSquadSize?: number;
    preferredTactics?: string[];
    retreatRate?: number;
    objectiveCompletionRate?: number;
  };
  previousCampaigns?: Array<{ planetName: string; outcome: string; daysAgo: number }>;
}

export async function runFullWarSimulation(input: WarSimulationInput): Promise<WarSimulationResult> {
  const id = `war_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[war-simulation] Starting full war simulation v6.4: ${id}`);
  
  // Phase 1: Planet Initialization
  const planetState = await planetInitialization(input);
  let phase: WarSimulationResult["phase"] = "initialized";
  
  // Phase 2: War Evaluation
  const evaluation = await liveWarEvaluation(planetState);
  phase = "evaluated";
  
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
  if (input.gatherIntel) {
    afterActionIntel = await analyzeAfterActionIntel(planetState, evaluation, input.playerActions);
    phase = "intel_gathered";
  }
  
  // Phase 6: Psychological Warfare (optional)
  let propaganda: PropagandaMessage | undefined;
  if (input.generatePropaganda) {
    propaganda = await generatePropaganda(planetState, evaluation, afterActionIntel);
    phase = "psyops_active";
  }
  
  // Phase 7: Strategic Continuity (requires resolution)
  let strategicContinuity: StrategicContinuity | undefined;
  if (input.calculateContinuity && resolution) {
    strategicContinuity = await calculateStrategicContinuity(planetState, resolution, input.previousCampaigns);
    phase = "continuity_calculated";
  }
  
  console.log(`[war-simulation] Completed simulation ${id} at phase: ${phase}`);
  
  return {
    id,
    type: "war.simulation",
    version: "6.4",
    planetState,
    evaluation,
    counteroffensive,
    resolution,
    afterActionIntel,
    propaganda,
    strategicContinuity,
    phase,
    generatedAt: Date.now(),
  };
}
