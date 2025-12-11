import { reasonThroughPrompt } from "../lib/reasoning";

export type WeaponType = "melee" | "ranged" | "energy" | "explosive";

export interface WeaponStruct {
  type: WeaponType;
  material: string;
  damage: number;
  reloadTime?: number;
  style: string;
  faction: string;
  specialEffects: string[];
  meta?: Record<string, unknown>;
}

function clampPositive(n: number) {
  return Math.max(0, n);
}

function extractWeaponType(base: Record<string, unknown>): WeaponType {
  const validTypes: WeaponType[] = ["melee", "ranged", "energy", "explosive"];
  const baseType = (base as any)?.type;
  if (typeof baseType === "string" && validTypes.includes(baseType as WeaponType)) {
    return baseType as WeaponType;
  }
  return "ranged";
}

export async function generateWeapon(prompt: string): Promise<WeaponStruct> {
  const base = await reasonThroughPrompt(prompt, "simulation");

  const weaponType = extractWeaponType(base);

  const weapon: WeaponStruct = {
    type: weaponType,
    material: (base as any)?.material || "steel",
    damage: clampPositive((base as any)?.damage ?? 75),
    reloadTime: (base as any)?.reloadTime ?? 2.5,
    style: (base as any)?.style || "tactical military",
    faction: (base as any)?.faction || "marines",
    specialEffects: Array.isArray((base as any)?.specialEffects)
      ? (base as any).specialEffects
      : ["armor piercing"],
    meta: { base, generatedAt: Date.now(), version: "v6" },
  };

  return weapon;
}
