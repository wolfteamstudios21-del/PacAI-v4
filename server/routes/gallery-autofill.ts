import { Router } from "express";
import { generateVehicle } from "../generation/vehicle-v6";
import { generateWeapon } from "../generation/weapon-v6";
import { generateCreature } from "../generation/creature-v6";
import { addToGallery } from "../services/autofill";
import { listGalleryItems, getGalleryItem, countGalleryItems } from "../db/gallery";

const router = Router();

router.post("/gallery/autofill/vehicle", async (req, res) => {
  try {
    const { prompt = "default armored transport", title = "System Vehicle" } = req.body;
    const meta = await generateVehicle(prompt);
    const item = await addToGallery("vehicle", title, meta, "system", "system");
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/vehicle] Error:", error);
    res.status(500).json({ error: "Vehicle autofill failed" });
  }
});

router.post("/gallery/autofill/weapon", async (req, res) => {
  try {
    const { prompt = "default rifle", title = "System Weapon" } = req.body;
    const meta = await generateWeapon(prompt);
    const item = await addToGallery("weapon", title, meta, "system", "system");
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/weapon] Error:", error);
    res.status(500).json({ error: "Weapon autofill failed" });
  }
});

router.post("/gallery/autofill/creature", async (req, res) => {
  try {
    const { prompt = "default jungle predator", title = "System Creature" } = req.body;
    const meta = await generateCreature(prompt);
    const item = await addToGallery("creature", title, meta, "system", "system");
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/creature] Error:", error);
    res.status(500).json({ error: "Creature autofill failed" });
  }
});

router.post("/gallery/autofill/bulk", async (req, res) => {
  try {
    const { vehicles = [], weapons = [], creatures = [] } = req.body as {
      vehicles: { prompt: string; title?: string }[];
      weapons: { prompt: string; title?: string }[];
      creatures: { prompt: string; title?: string }[];
    };

    const out: any[] = [];
    for (const v of vehicles) {
      const meta = await generateVehicle(v.prompt);
      out.push(await addToGallery("vehicle", v.title || v.prompt, meta));
    }
    for (const w of weapons) {
      const meta = await generateWeapon(w.prompt);
      out.push(await addToGallery("weapon", w.title || w.prompt, meta));
    }
    for (const c of creatures) {
      const meta = await generateCreature(c.prompt);
      out.push(await addToGallery("creature", c.title || c.prompt, meta));
    }
    res.json({ success: true, count: out.length, items: out });
  } catch (error) {
    console.error("[gallery/autofill/bulk] Error:", error);
    res.status(500).json({ error: "Bulk autofill failed" });
  }
});

router.get("/gallery", async (req, res) => {
  try {
    const { kind } = req.query as { kind?: "vehicle" | "weapon" | "creature" };
    const items = await listGalleryItems(kind);
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("[gallery] Error:", error);
    res.status(500).json({ error: "Failed to list gallery" });
  }
});

router.get("/gallery/:id", async (req, res) => {
  try {
    const item = await getGalleryItem(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/:id] Error:", error);
    res.status(500).json({ error: "Failed to get gallery item" });
  }
});

router.get("/gallery/stats", async (req, res) => {
  try {
    const total = await countGalleryItems();
    const vehicles = await countGalleryItems("vehicle");
    const weapons = await countGalleryItems("weapon");
    const creatures = await countGalleryItems("creature");
    res.json({ success: true, stats: { total, vehicles, weapons, creatures } });
  } catch (error) {
    console.error("[gallery/stats] Error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
