import { reasonThroughPrompt } from "../lib/reasoning";

export type VehicleType = "car" | "tank" | "starship" | "aircraft" | "boat";

export interface VehicleStruct {
  type: VehicleType;
  faction: string;
  stats: { speed: number; armor: number; fuel: number };
  visuals: { palette: string; silhouette: string };
  abilities: string[];
  meta?: Record<string, unknown>;
}

function clampPositive(n: number) {
  return Math.max(0, n);
}

function extractVehicleType(base: Record<string, unknown>): VehicleType {
  const validTypes: VehicleType[] = ["car", "tank", "starship", "aircraft", "boat"];
  const baseType = (base as any)?.type;
  if (typeof baseType === "string" && validTypes.includes(baseType as VehicleType)) {
    return baseType as VehicleType;
  }
  return "tank";
}

export async function generateVehicle(prompt: string): Promise<VehicleStruct> {
  const base = await reasonThroughPrompt(prompt, "simulation");

  const vehicleType = extractVehicleType(base);

  const vehicle: VehicleStruct = {
    type: vehicleType,
    faction: (base as any)?.faction || "marines",
    stats: {
      speed: clampPositive((base as any)?.stats?.speed ?? 45),
      armor: clampPositive((base as any)?.stats?.armor ?? 80),
      fuel: clampPositive((base as any)?.stats?.fuel ?? 100),
    },
    visuals: {
      palette: (base as any)?.visuals?.palette || "olive drab",
      silhouette: (base as any)?.visuals?.silhouette || "tracked heavy",
    },
    abilities: Array.isArray((base as any)?.abilities)
      ? (base as any).abilities
      : ["armored", "all-terrain"],
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return vehicle;
}
