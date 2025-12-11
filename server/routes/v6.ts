import { Router } from "express";
import { reasonThroughPrompt } from "../lib/reasoning";
import { parseImage } from "../lib/vision";
import { generateNPC } from "../generation/npc-v6";
import { generateFauna } from "../generation/fauna-v6";
import { generateSimulationHooks } from "../generation/simulation-v6";

const router = Router();

router.post("/generate", async (req, res) => {
  try {
    const { prompt, type } = req.body as { prompt: string; type: "npc" | "fauna" | "world" | "simulation" };

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }
    if (!type || !["npc", "fauna", "world", "simulation"].includes(type)) {
      return res.status(400).json({ error: "type must be one of: npc, fauna, world, simulation" });
    }

    const out = await reasonThroughPrompt(prompt, type);
    res.json({ success: true, type, data: out });
  } catch (error) {
    console.error("[v6/generate] Error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

router.post("/generate/npc", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const data = await generateNPC(prompt);
    res.json({ success: true, type: "npc", data });
  } catch (error) {
    console.error("[v6/generate/npc] Error:", error);
    res.status(500).json({ error: "NPC generation failed" });
  }
});

router.post("/generate/fauna", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const data = await generateFauna(prompt);
    res.json({ success: true, type: "fauna", data });
  } catch (error) {
    console.error("[v6/generate/fauna] Error:", error);
    res.status(500).json({ error: "Fauna generation failed" });
  }
});

router.post("/generate/simulation", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const data = await generateSimulationHooks(prompt);
    res.json({ success: true, type: "simulation", data });
  } catch (error) {
    console.error("[v6/generate/simulation] Error:", error);
    res.status(500).json({ error: "Simulation generation failed" });
  }
});

router.post("/generate/image", async (req, res) => {
  try {
    const { prompt, type, imageUrl } = req.body as {
      prompt: string;
      type: "npc" | "fauna" | "world" | "simulation";
      imageUrl?: string;
    };

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }
    if (!type || !["npc", "fauna", "world", "simulation"].includes(type)) {
      return res.status(400).json({ error: "type must be one of: npc, fauna, world, simulation" });
    }

    let augmentedPrompt = prompt;
    let imageContext = null;

    if (imageUrl && typeof imageUrl === "string") {
      const parsed = await parseImage(imageUrl);
      imageContext = parsed;
      augmentedPrompt += ` | style=${parsed.style}; palette=${parsed.palette}; biome=${parsed.biome}; tone=${parsed.tone}; light=${parsed.light}`;
    }

    const out = await reasonThroughPrompt(augmentedPrompt, type);
    res.json({ success: true, type, imageContext, data: out });
  } catch (error) {
    console.error("[v6/generate/image] Error:", error);
    res.status(500).json({ error: "Image-aware generation failed" });
  }
});

router.get("/health", (req, res) => {
  res.json({
    status: "operational",
    version: "v6.0.0",
    features: {
      reasoning_engine: true,
      npc_generation: true,
      fauna_generation: true,
      simulation_hooks: true,
      image_parsing: !!process.env.AZURE_VISION_KEY,
      local_llm: !!process.env.PACAI_LLM_MODEL || "llama3.1 (default)",
    },
    engines: ["UE5", "Unity", "Godot", "Roblox", "Blender", "CryEngine", "Source2", "WebGPU", "visionOS"],
  });
});

export default router;
