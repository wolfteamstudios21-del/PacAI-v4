import { reasonThroughPrompt } from "../lib/reasoning";

type Cycle = "nocturnal" | "diurnal" | "crepuscular";
type Trophic = "predator" | "herbivore" | "scavenger" | "microfauna";

export interface FaunaStruct {
  trophicLayer: Trophic;
  environmentalDependencies: {
    climate: string;
    altitude: number;
    biome: string;
    waterAccess: boolean;
    migration: boolean;
  };
  behaviorModels: {
    herding: boolean;
    aggression: number;
    cycles: Cycle;
    territory: number;
  };
  packSize: number;
  huntBehavior: string;
  meta?: Record<string, unknown>;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function extractTrophic(base: Record<string, unknown>): Trophic {
  const validTrophic: Trophic[] = ["predator", "herbivore", "scavenger", "microfauna"];
  const baseTrophic = (base as any)?.trophicLayer;
  if (typeof baseTrophic === "string" && validTrophic.includes(baseTrophic as Trophic)) {
    return baseTrophic as Trophic;
  }
  return "herbivore";
}

function extractCycle(base: Record<string, unknown>): Cycle {
  const validCycles: Cycle[] = ["nocturnal", "diurnal", "crepuscular"];
  const baseCycle = (base as any)?.behaviorModels?.cycles || (base as any)?.cycles;
  if (typeof baseCycle === "string" && validCycles.includes(baseCycle as Cycle)) {
    return baseCycle as Cycle;
  }
  return "diurnal";
}

export async function generateFauna(biomePrompt: string): Promise<FaunaStruct> {
  const base = await reasonThroughPrompt(biomePrompt, "fauna");

  const trophicLayer = extractTrophic(base);
  const cycle = extractCycle(base);

  const fauna: FaunaStruct = {
    trophicLayer,
    environmentalDependencies: {
      climate: (base as any)?.environmentalDependencies?.climate || "temperate",
      altitude: (base as any)?.environmentalDependencies?.altitude ?? 0,
      biome: (base as any)?.environmentalDependencies?.biome || "forest",
      waterAccess: (base as any)?.environmentalDependencies?.waterAccess ?? true,
      migration: (base as any)?.environmentalDependencies?.migration ?? false,
    },
    behaviorModels: {
      herding: (base as any)?.behaviorModels?.herding ?? false,
      aggression: clamp01((base as any)?.behaviorModels?.aggression ?? 0.3),
      cycles: cycle,
      territory: (base as any)?.behaviorModels?.territory ?? 100,
    },
    packSize: (base as any)?.packSize ?? 1,
    huntBehavior: (base as any)?.huntBehavior || "opportunistic grazing",
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return fauna;
}
