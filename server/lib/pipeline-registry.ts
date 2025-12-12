import { registerPipeline, type PipelineContext, type PipelineInput } from "./pipeline-engine";
import { generateConceptArt, type ConceptArtResult } from "../services/generation-image";
import { generate3DModel, type Model3DResult } from "../services/generation-model";

registerPipeline("image.concept", async (input: PipelineInput, ctx: PipelineContext) => {
  const { prompt, style } = input as { prompt: string; style?: string };
  
  ctx.log(`Generating concept art: "${prompt.slice(0, 50)}..."`);
  
  const result: ConceptArtResult = await generateConceptArt(prompt, style || "concept art");
  
  ctx.log(`Generated image: ${result.imageUrl} (provider: ${result.provider})`);
  
  return {
    type: "concept",
    id: result.id,
    imageUrl: result.imageUrl,
    imageBase64: result.imageBase64,
    prompt: result.prompt,
    style: result.style,
    provider: result.provider,
    generatedAt: result.generatedAt,
  };
});

registerPipeline("model.3d", async (input: PipelineInput, ctx: PipelineContext) => {
  const { prompt, format } = input as { prompt: string; format?: "glb" | "gltf" | "obj" };
  
  ctx.log(`Generating 3D model: "${prompt.slice(0, 50)}..."`);
  
  const result: Model3DResult = await generate3DModel(prompt, format || "glb");
  
  ctx.log(`Generated 3D model: ${result.modelUrl} (provider: ${result.provider})`);
  
  return {
    type: "model",
    id: result.id,
    modelUrl: result.modelUrl,
    thumbnailUrl: result.thumbnailUrl,
    format: result.format,
    prompt: result.prompt,
    provider: result.provider,
    generatedAt: result.generatedAt,
  };
});

registerPipeline("gallery.autofill", async (input: PipelineInput, ctx: PipelineContext) => {
  const { prompt, count = 1, type = "concept" } = input as { prompt: string; count?: number; type?: string };
  
  ctx.log(`Gallery autofill: generating ${count} ${type}(s)`);
  
  const results: Array<{ type: string; id: string; url: string; prompt: string }> = [];
  
  for (let i = 0; i < count; i++) {
    ctx.log(`Generating item ${i + 1}/${count}...`);
    
    if (type === "model") {
      const result = await generate3DModel(prompt, "glb");
      results.push({ type: "model", id: result.id, url: result.modelUrl, prompt: result.prompt });
    } else {
      const result = await generateConceptArt(prompt, "concept art");
      results.push({ type: "concept", id: result.id, url: result.imageUrl, prompt: result.prompt });
    }
  }
  
  ctx.log(`Gallery autofill complete: ${results.length} items generated`);
  
  return {
    generated: results.length,
    items: results,
  };
});

registerPipeline("gallery.ingest", async (input: PipelineInput, ctx: PipelineContext) => {
  const { urls } = input as { urls: string[] };
  
  ctx.log(`Ingesting ${urls.length} URLs into gallery`);
  
  const results = [];
  for (const url of urls) {
    ctx.log(`Processing: ${url.slice(0, 50)}...`);
    results.push({
      url,
      status: "ingested",
      timestamp: Date.now(),
    });
  }
  
  ctx.log(`Ingestion complete: ${results.length} items processed`);
  
  return {
    ingested: results.length,
    items: results,
  };
});

registerPipeline("npc.generate", async (input: PipelineInput, ctx: PipelineContext) => {
  const { biome, count = 1, aggression = 0.5 } = input as { biome: string; count?: number; aggression?: number };
  
  ctx.log(`Generating ${count} NPCs for ${biome} biome (aggression: ${aggression})`);
  
  const archetypes = ["civilian", "guard", "merchant", "hostile", "neutral"];
  const npcs = [];
  
  for (let i = 0; i < count; i++) {
    const archetype = aggression > 0.7 ? "hostile" : archetypes[Math.floor(Math.random() * archetypes.length)];
    npcs.push({
      id: `npc_${Date.now()}_${i}`,
      archetype,
      biome,
      aggression: archetype === "hostile" ? aggression : aggression * 0.5,
      traits: ["procedural", biome.toLowerCase()],
    });
  }
  
  ctx.log(`Generated ${npcs.length} NPCs`);
  
  return {
    generated: npcs.length,
    npcs,
  };
});

registerPipeline("fauna.generate", async (input: PipelineInput, ctx: PipelineContext) => {
  const { biome, trophicLevel = "herbivore", count = 1 } = input as { biome: string; trophicLevel?: string; count?: number };
  
  ctx.log(`Generating ${count} fauna for ${biome} (${trophicLevel})`);
  
  const fauna = [];
  for (let i = 0; i < count; i++) {
    fauna.push({
      id: `fauna_${Date.now()}_${i}`,
      biome,
      trophicLevel,
      behavior: trophicLevel === "predator" ? "aggressive" : "passive",
      traits: ["procedural", biome.toLowerCase()],
    });
  }
  
  ctx.log(`Generated ${fauna.length} fauna`);
  
  return {
    generated: fauna.length,
    fauna,
  };
});

console.log("[pipeline-registry] All pipelines registered");
