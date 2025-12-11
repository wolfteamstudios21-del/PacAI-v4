import { generateVehicle } from "../generation/vehicle-v6";
import { generateWeapon } from "../generation/weapon-v6";
import { generateCreature } from "../generation/creature-v6";
import { addToGallery } from "../services/autofill";

const dailyPrompts = {
  vehicles: ["WW2 landing craft", "metro drift car", "starship patrol corvette"],
  weapons: ["bolt-action rifle", "energy pistol", "steel longsword"],
  creatures: ["tundra wolf pack", "alien dune stalker", "ruins warden"],
};

export async function runDailySeed() {
  console.log("[seed-gallery] Starting daily seed...");
  const results = [];

  for (const p of dailyPrompts.vehicles) {
    const meta = await generateVehicle(p);
    results.push(await addToGallery("vehicle", p, meta));
  }
  for (const p of dailyPrompts.weapons) {
    const meta = await generateWeapon(p);
    results.push(await addToGallery("weapon", p, meta));
  }
  for (const p of dailyPrompts.creatures) {
    const meta = await generateCreature(p);
    results.push(await addToGallery("creature", p, meta));
  }

  console.log(`[seed-gallery] Daily seed complete. Added ${results.length} items.`);
  return results;
}
