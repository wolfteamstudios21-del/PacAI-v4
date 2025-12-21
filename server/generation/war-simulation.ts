import { z } from "zod";
import ollama from "ollama";
import OpenAI from "openai";

const LLM_MODEL = process.env.PACAI_LLM_MODEL || "llama3.1";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PlanetStateSchema = z.object({
  planetName: z.string(),
  planetType: z.enum(["temperate", "desert", "ice", "jungle", "volcanic", "urban", "ocean"]),
  controlStatus: z.enum(["contested", "enemy_held", "liberated", "evacuated"]),
  threatLevel: z.number().min(1).max(10),
  strategicValue: z.number().min(1).max(10),
  factions: z.array(z.object({
    name: z.string(),
    allegiance: z.enum(["allied", "enemy", "neutral", "insurgent"]),
    strength: z.number().min(0).max(100),
    morale: z.number().min(0).max(100),
  })),
  keyLocations: z.array(z.object({
    name: z.string(),
    type: z.enum(["capital", "military_base", "resource_hub", "spaceport", "bunker", "civilian_center"]),
    controlledBy: z.string(),
    fortification: z.number().min(0).max(100),
  })),
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

export type PlanetState = z.infer<typeof PlanetStateSchema>;
export type WarEvaluation = z.infer<typeof WarEvaluationSchema>;
export type Counteroffensive = z.infer<typeof CounteroffensiveSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

async function callLLM(prompt: string, useOpenAI = false): Promise<string> {
  try {
    if (useOpenAI && process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });
      return response.choices[0]?.message?.content || "{}";
    }
    
    const response = await ollama.generate({
      model: LLM_MODEL,
      prompt,
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

export async function planetInitialization(input: {
  planetType: string;
  loreTags: string[];
  planetName?: string;
  threatLevel?: number;
}): Promise<PlanetState> {
  console.log(`[war-simulation] Initializing planet: ${input.planetType}`);
  
  const prompt = `You are a military simulation AI for a sci-fi war game called "Vanguard: Infinite Echoes".
  
Initialize a war-torn planet with these parameters:
- Planet Type: ${input.planetType}
- Lore Tags: ${input.loreTags.join(", ")}
- Planet Name: ${input.planetName || "Generate a fitting name"}
- Initial Threat Level: ${input.threatLevel || 5}

Generate a complete planetary war state as JSON with:
- planetName: unique sci-fi name
- planetType: "${input.planetType}"
- controlStatus: current control state
- threatLevel: 1-10
- strategicValue: 1-10
- factions: array of 2-4 factions with name, allegiance, strength (0-100), morale (0-100)
- keyLocations: array of 3-6 strategic locations with name, type, controlledBy, fortification
- escalationLevel: 0-5
- daysSinceInvasion: number

Return strictly valid JSON.`;

  const response = await callLLM(prompt, true);
  return safeJSON(response, PlanetStateSchema);
}

export async function liveWarEvaluation(state: PlanetState): Promise<WarEvaluation> {
  console.log(`[war-simulation] Evaluating war on ${state.planetName}`);
  
  const prompt = `You are a military simulation AI analyzing an ongoing war.

Current planetary state:
${JSON.stringify(state, null, 2)}

Evaluate the current war situation and generate a tactical assessment as JSON:
- currentPhase: one of "initial_assault", "attrition", "stalemate", "counteroffensive", "final_push", "resolution"
- frontlineStatus: description of front line conditions
- casualtyRate: { allied, enemy, civilian } numbers
- resourceStatus: { ammunition, fuel, medical, morale } as 0-100 values
- tacticalAssessment: strategic analysis
- recommendedActions: array of 3-5 recommended actions
- nextEscalationTrigger: what would cause escalation (optional)

Return strictly valid JSON.`;

  const response = await callLLM(prompt, true);
  return safeJSON(response, WarEvaluationSchema);
}

export async function majorCounteroffensiveTrigger(
  state: PlanetState,
  evaluation: WarEvaluation
): Promise<Counteroffensive> {
  console.log(`[war-simulation] Planning counteroffensive on ${state.planetName}`);
  
  const prompt = `You are a military AI planning a major counteroffensive operation.

Planet State:
${JSON.stringify(state, null, 2)}

Current Evaluation:
${JSON.stringify(evaluation, null, 2)}

Plan a major counteroffensive as JSON:
- operationName: code name for the operation
- objectives: array of targets with { target, priority, difficulty (1-10), estimatedCasualties }
- forces: { infantry, armor, air, special } unit counts
- timeline: { prepPhase, assaultPhase, consolidationPhase } in hours
- successProbability: 0-100
- riskFactors: array of risk factors

Return strictly valid JSON.`;

  const response = await callLLM(prompt, true);
  return safeJSON(response, CounteroffensiveSchema);
}

export async function planetResolution(
  state: PlanetState,
  evaluation: WarEvaluation,
  counteroffensive?: Counteroffensive
): Promise<Resolution> {
  console.log(`[war-simulation] Resolving war on ${state.planetName}`);
  
  const prompt = `You are a military historian AI documenting the conclusion of a planetary war.

Planet State:
${JSON.stringify(state, null, 2)}

Final Evaluation:
${JSON.stringify(evaluation, null, 2)}

${counteroffensive ? `Counteroffensive Executed:\n${JSON.stringify(counteroffensive, null, 2)}` : "No major counteroffensive was launched."}

Generate the war resolution as JSON:
- outcome: one of "decisive_victory", "pyrrhic_victory", "stalemate", "tactical_withdrawal", "defeat", "annihilation"
- finalCasualties: { allied, enemy, civilian } totals
- territoryControl: 0-100 percentage of planet controlled
- strategicImpact: analysis of strategic implications
- aftermath: { reconstruction, politicalFallout, militaryLessons: [] }
- narrativeSummary: 2-3 paragraph narrative of the war

Return strictly valid JSON.`;

  const response = await callLLM(prompt, true);
  return safeJSON(response, ResolutionSchema);
}

export interface WarSimulationResult {
  id: string;
  type: "war.simulation";
  planetState: PlanetState;
  evaluation: WarEvaluation;
  counteroffensive?: Counteroffensive;
  resolution?: Resolution;
  phase: "initialized" | "evaluated" | "counteroffensive" | "resolved";
  generatedAt: number;
}

export async function runFullWarSimulation(input: {
  planetType: string;
  loreTags: string[];
  planetName?: string;
  threatLevel?: number;
  runCounteroffensive?: boolean;
  resolveWar?: boolean;
}): Promise<WarSimulationResult> {
  const id = `war_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const planetState = await planetInitialization(input);
  let phase: WarSimulationResult["phase"] = "initialized";
  
  const evaluation = await liveWarEvaluation(planetState);
  phase = "evaluated";
  
  let counteroffensive: Counteroffensive | undefined;
  if (input.runCounteroffensive) {
    counteroffensive = await majorCounteroffensiveTrigger(planetState, evaluation);
    phase = "counteroffensive";
  }
  
  let resolution: Resolution | undefined;
  if (input.resolveWar) {
    resolution = await planetResolution(planetState, evaluation, counteroffensive);
    phase = "resolved";
  }
  
  return {
    id,
    type: "war.simulation",
    planetState,
    evaluation,
    counteroffensive,
    resolution,
    phase,
    generatedAt: Date.now(),
  };
}
