import { reasonThroughPrompt } from "../lib/reasoning";

export interface SimulationHooks {
  carTuning: { speed: number; handling: number; acceleration: number };
  streetDensity: number[];
  trafficFlows: { type: "dense" | "sparse"; patterns: string[] };
  hotspots: { races: { start: [number, number]; end: [number, number] }[] };
  npcDriving: { profiles: { aggression: number; obedience: number }[] };
  events: { triggers: { meets: string; pursuits: string } };
  cityState: { hourCycle: Record<number, { density: number; weather: string }> };
  meta?: Record<string, unknown>;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function extractTrafficType(base: Record<string, unknown>): "dense" | "sparse" {
  const baseType = (base as any)?.trafficFlows?.type;
  if (baseType === "dense" || baseType === "sparse") return baseType;
  return "sparse";
}

export async function generateSimulationHooks(prompt: string): Promise<SimulationHooks> {
  const base = await reasonThroughPrompt(prompt, "simulation");

  const trafficType = extractTrafficType(base);

  const hooks: SimulationHooks = {
    carTuning: {
      speed: (base as any)?.carTuning?.speed ?? 180,
      handling: clamp01((base as any)?.carTuning?.handling ?? 0.7),
      acceleration: (base as any)?.carTuning?.acceleration ?? 4.5,
    },
    streetDensity: Array.isArray((base as any)?.streetDensity)
      ? (base as any).streetDensity.map((d: number) => clamp01(d))
      : [0.5, 0.6, 0.4],
    trafficFlows: {
      type: trafficType,
      patterns: Array.isArray((base as any)?.trafficFlows?.patterns)
        ? (base as any).trafficFlows.patterns
        : ["standard", "rush"],
    },
    hotspots: {
      races: Array.isArray((base as any)?.hotspots?.races)
        ? (base as any).hotspots.races
        : [{ start: [0, 0], end: [500, 500] }],
    },
    npcDriving: {
      profiles: Array.isArray((base as any)?.npcDriving?.profiles)
        ? (base as any).npcDriving.profiles.map((p: any) => ({
            aggression: clamp01(p.aggression ?? 0.4),
            obedience: clamp01(p.obedience ?? 0.7),
          }))
        : [{ aggression: 0.4, obedience: 0.7 }],
    },
    events: {
      triggers: {
        meets: (base as any)?.events?.triggers?.meets || "scheduled",
        pursuits: (base as any)?.events?.triggers?.pursuits || "random",
      },
    },
    cityState: {
      hourCycle: (base as any)?.cityState?.hourCycle || {
        0: { density: 0.2, weather: "clear" },
        6: { density: 0.4, weather: "clear" },
        12: { density: 0.8, weather: "clear" },
        18: { density: 0.9, weather: "dusk" },
        22: { density: 0.5, weather: "night" },
      },
    },
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return hooks;
}
