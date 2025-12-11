import { z } from "zod";
import { reasonThroughPrompt } from "../lib/reasoning";

export const MoodSchema = z.enum(["calm", "angry", "fearful", "irritated", "neutral"]);
export type Mood = z.infer<typeof MoodSchema>;

export interface NPCStruct {
  motivation: { primary: string; secondary: string[] };
  emotionalState: { mood: Mood; intensity: number; triggers: string[] };
  behaviorHooks: { event: string; reaction: string }[];
  factionAlignment: { loyalty: number; biases: Record<string, number> };
  routines: string[];
  personality: string;
  meta?: Record<string, unknown>;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function extractMood(base: Record<string, unknown>): Mood {
  const validMoods: Mood[] = ["calm", "angry", "fearful", "irritated", "neutral"];
  const baseMood = (base as any)?.mood || (base as any)?.emotionalState?.mood;
  if (typeof baseMood === "string" && validMoods.includes(baseMood as Mood)) {
    return baseMood as Mood;
  }
  return "neutral";
}

export async function generateNPC(prompt: string): Promise<NPCStruct> {
  const base = await reasonThroughPrompt(prompt, "npc");

  const mood = extractMood(base);
  const basePersonality = (base as any)?.personality || "adaptable";
  const baseRoutines = Array.isArray((base as any)?.routines) ? (base as any).routines : [];

  const npc: NPCStruct = {
    motivation: {
      primary: (base as any)?.motivation?.primary || "follow orders",
      secondary: Array.isArray((base as any)?.motivation?.secondary)
        ? (base as any).motivation.secondary
        : ["maintain peace"],
    },
    emotionalState: {
      mood,
      intensity: clamp01((base as any)?.emotionalState?.intensity ?? 0.5),
      triggers: Array.isArray((base as any)?.emotionalState?.triggers)
        ? (base as any).emotionalState.triggers
        : ["threat detected"],
    },
    behaviorHooks: Array.isArray((base as any)?.behaviorHooks)
      ? (base as any).behaviorHooks
      : [{ event: "hostile_approach", reaction: "defensive_stance" }],
    factionAlignment: {
      loyalty: clamp01((base as any)?.factionAlignment?.loyalty ?? 0.8),
      biases: (base as any)?.factionAlignment?.biases || {},
    },
    routines: baseRoutines.length > 0 ? baseRoutines : ["patrol", "rest", "interact"],
    personality: typeof basePersonality === "string" ? basePersonality : "adaptable",
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return npc;
}
