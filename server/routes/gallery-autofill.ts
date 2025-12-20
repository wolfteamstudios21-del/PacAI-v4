import { Router } from "express";
import { generateVehicle } from "../generation/vehicle-v6";
import { generateWeapon } from "../generation/weapon-v6";
import { generateCreature } from "../generation/creature-v6";
import { addToGallery } from "../services/autofill";
import { listGalleryItems, getGalleryItem, countGalleryItems } from "../db/gallery";
import { realChargeMiddleware, isDevTeam } from "../middleware/real-charge";
import { generateConceptArt } from "../services/generation-image";
import { generate3DModel } from "../services/generation-model";
import { generateAssetPreview } from "../lib/preview";

const router = Router();

router.post("/gallery/autofill/vehicle", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt = "default armored transport", title = "System Vehicle" } = req.body;
    const meta = await generateVehicle(prompt);
    const item = await addToGallery("vehicle", title, meta, "system", "system");
    
    // Generate AI preview asynchronously (don't block response)
    generateAssetPreview(item.id, "vehicle", prompt, meta).catch(e => 
      console.error(`[preview] Background preview failed for ${item.id}:`, e.message)
    );
    
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/vehicle] Error:", error);
    res.status(500).json({ error: "Vehicle autofill failed" });
  }
});

router.post("/gallery/autofill/weapon", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt = "default rifle", title = "System Weapon" } = req.body;
    const meta = await generateWeapon(prompt);
    const item = await addToGallery("weapon", title, meta, "system", "system");
    
    generateAssetPreview(item.id, "weapon", prompt, meta).catch(e => 
      console.error(`[preview] Background preview failed for ${item.id}:`, e.message)
    );
    
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/weapon] Error:", error);
    res.status(500).json({ error: "Weapon autofill failed" });
  }
});

router.post("/gallery/autofill/creature", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt = "default jungle predator", title = "System Creature" } = req.body;
    const meta = await generateCreature(prompt);
    const item = await addToGallery("creature", title, meta, "system", "system");
    
    generateAssetPreview(item.id, "creature", prompt, meta).catch(e => 
      console.error(`[preview] Background preview failed for ${item.id}:`, e.message)
    );
    
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/creature] Error:", error);
    res.status(500).json({ error: "Creature autofill failed" });
  }
});

router.post("/gallery/autofill/concept", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt = "epic fantasy landscape", title = "Concept Art", style = "game-ready concept art" } = req.body;
    const artResult = await generateConceptArt(prompt, style);
    const item = await addToGallery("concept", title, {
      prompt,
      style,
      imageUrl: artResult.imageUrl,
      provider: artResult.provider,
      generatedAt: artResult.generatedAt,
    }, "system", "system");
    
    // For concept art, the generated image IS the preview
    if (artResult.imageUrl) {
      item.previewImageUrl = artResult.imageUrl;
      item.previewThumbnailUrl = artResult.imageUrl;
      item.previewStatus = "ready";
      item.previewFallbackTier = 0;
    }
    
    if (artResult.imageBase64) {
      item.imageBase64 = artResult.imageBase64;
    }
    
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/autofill/concept] Error:", error);
    res.status(500).json({ error: "Concept art generation failed" });
  }
});

router.post("/gallery/autofill/model", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt = "sci-fi prop", title = "3D Model", format = "glb" } = req.body;
    const modelResult = await generate3DModel(prompt, format);
    const item = await addToGallery("model", title, {
      prompt,
      format: modelResult.format,
      modelUrl: modelResult.modelUrl,
      provider: modelResult.provider,
      polyCount: modelResult.polyCount,
      generatedAt: modelResult.generatedAt,
    }, "system", "system");
    
    // Generate preview image for 3D model asynchronously
    generateAssetPreview(item.id, "model", prompt, modelResult).catch(e => 
      console.error(`[preview] Background preview failed for ${item.id}:`, e.message)
    );
    
    res.json({ success: true, item, downloadUrl: modelResult.modelUrl });
  } catch (error) {
    console.error("[gallery/autofill/model] Error:", error);
    res.status(500).json({ error: "3D model generation failed" });
  }
});

router.post("/gallery/autofill/pipeline", realChargeMiddleware, async (req, res) => {
  try {
    const { prompt, title = "Generated Asset", projectId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const [conceptResult, modelResult] = await Promise.all([
      generateConceptArt(prompt, "game asset concept"),
      generate3DModel(prompt, "glb"),
    ]);

    const conceptItem = await addToGallery("concept", `${title} - Concept`, {
      prompt,
      imageUrl: conceptResult.imageUrl,
      provider: conceptResult.provider,
      projectId,
    }, "system", "system");

    const modelItem = await addToGallery("model", `${title} - 3D Model`, {
      prompt,
      modelUrl: modelResult.modelUrl,
      format: modelResult.format,
      provider: modelResult.provider,
      projectId,
    }, "system", "system");

    res.json({
      success: true,
      concept: conceptItem,
      model: modelItem,
      downloadUrls: {
        concept: conceptResult.imageUrl,
        model: modelResult.modelUrl,
      },
    });
  } catch (error) {
    console.error("[gallery/autofill/pipeline] Error:", error);
    res.status(500).json({ error: "Pipeline generation failed" });
  }
});

router.post("/gallery/autofill/bulk", realChargeMiddleware, async (req, res) => {
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
    const { kind } = req.query as { kind?: "vehicle" | "weapon" | "creature" | "concept" | "model" };
    const items = await listGalleryItems(kind);
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("[gallery] Error:", error);
    res.status(500).json({ error: "Failed to list gallery" });
  }
});

// IMPORTANT: /gallery/stats must come BEFORE /gallery/:id to avoid :id matching "stats"
router.get("/gallery/stats", async (req, res) => {
  try {
    const total = await countGalleryItems();
    const vehicles = await countGalleryItems("vehicle");
    const weapons = await countGalleryItems("weapon");
    const creatures = await countGalleryItems("creature");
    const concepts = await countGalleryItems("concept");
    const models = await countGalleryItems("model");
    res.json({ success: true, stats: { total, vehicles, weapons, creatures, concepts, models } });
  } catch (error) {
    console.error("[gallery/stats] Error:", error);
    res.status(500).json({ error: "Failed to get stats" });
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

export default router;
