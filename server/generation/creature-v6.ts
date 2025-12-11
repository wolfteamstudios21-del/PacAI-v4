import { reasonThroughPrompt } from "../lib/reasoning";

export type CreatureClass = "beast" | "demon" | "alien" | "mutant";

export interface CreatureStruct {
  class: CreatureClass;
  biome: string;
  abilities: string[];
  weaknesses: string[];
  aggression: number;
  visuals: { palette: string; silhouette: string };
  narrativeHooks: string[];
  meta?: Record<string, unknown>;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function extractCreatureClass(base: Record<string, unknown>): CreatureClass {
  const validClasses: CreatureClass[] = ["beast", "demon", "alien", "mutant"];
  const baseClass = (base as any)?.class;
  if (typeof baseClass === "string" && validClasses.includes(baseClass as CreatureClass)) {
    return baseClass as CreatureClass;
  }
  return "beast";
}

export async function generateCreature(prompt: string): Promise<CreatureStruct> {
  const base = await reasonThroughPrompt(prompt, "fauna");

  const creatureClass = extractCreatureClass(base);

  const creature: CreatureStruct = {
    class: creatureClass,
    biome: (base as any)?.biome || "wilderness",
    abilities: Array.isArray((base as any)?.abilities)
      ? (base as any).abilities
      : ["enhanced senses", "natural armor"],
    weaknesses: Array.isArray((base as any)?.weaknesses)
      ? (base as any).weaknesses
      : ["fire", "bright light"],
    aggression: clamp01((base as any)?.aggression ?? 0.6),
    visuals: {
      palette: (base as any)?.visuals?.palette || "earth tones",
      silhouette: (base as any)?.visuals?.silhouette || "quadruped predator",
    },
    narrativeHooks: Array.isArray((base as any)?.narrativeHooks)
      ? (base as any).narrativeHooks
      : ["territorial guardian", "ancient species"],
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return creature;
}
