import OpenAI from "openai";
import { PreviewGenerationRequest, PreviewGenerationResult, AssetKind } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSET_PROMPTS: Record<AssetKind, string> = {
  vehicle: "detailed concept art of a military vehicle, professional game asset render, dark background, cinematic lighting",
  weapon: "detailed weapon design concept art, professional game asset render, dark background, studio lighting",
  creature: "detailed creature concept art, full body portrait, professional game asset, dark dramatic background",
  concept: "cinematic concept art illustration, professional quality, dramatic lighting",
  model: "3D model render turntable view, studio lighting, dark background, professional asset showcase",
  world: "top-down tactical map view of terrain, strategic overview, professional game asset style",
  npc: "character portrait and full body design, professional game NPC concept art, dramatic lighting",
  simulation: "abstract data visualization, tactical interface design, cyberpunk style HUD elements",
};

const FALLBACK_ICONS: Record<AssetKind, string> = {
  vehicle: "/icons/vehicle-placeholder.svg",
  weapon: "/icons/weapon-placeholder.svg",
  creature: "/icons/creature-placeholder.svg",
  concept: "/icons/concept-placeholder.svg",
  model: "/icons/model-placeholder.svg",
  world: "/icons/world-placeholder.svg",
  npc: "/icons/npc-placeholder.svg",
  simulation: "/icons/simulation-placeholder.svg",
};

export async function generatePreview(request: PreviewGenerationRequest): Promise<PreviewGenerationResult> {
  const { assetId, assetKind, prompt, meta } = request;

  console.log(`[preview-gen] Starting preview for ${assetKind} asset ${assetId}`);

  try {
    const enhancedPrompt = buildPreviewPrompt(assetKind, prompt, meta);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;

    if (imageUrl) {
      console.log(`[preview-gen] Generated preview for ${assetId}`);
      return {
        success: true,
        previewUrl: imageUrl,
        thumbnailUrl: imageUrl,
        altText: `Preview of ${assetKind}: ${prompt.substring(0, 100)}`,
        fallbackTier: 0,
      };
    }

    return generateConceptFallback(assetKind, prompt);

  } catch (error: any) {
    console.error(`[preview-gen] Primary generation failed for ${assetId}:`, error.message);
    
    return generateConceptFallback(assetKind, prompt);
  }
}

function buildPreviewPrompt(kind: AssetKind, userPrompt: string, meta?: Record<string, any>): string {
  const basePrompt = ASSET_PROMPTS[kind] || ASSET_PROMPTS.concept;
  
  let prompt = `${userPrompt}. Style: ${basePrompt}`;
  
  if (meta?.biome) {
    prompt += `, set in ${meta.biome} environment`;
  }
  if (meta?.weather) {
    prompt += `, ${meta.weather} weather conditions`;
  }
  if (meta?.faction) {
    prompt += `, ${meta.faction} faction design`;
  }

  return prompt.substring(0, 4000);
}

async function generateConceptFallback(kind: AssetKind, prompt: string): Promise<PreviewGenerationResult> {
  console.log(`[preview-gen] Attempting concept art fallback for ${kind}`);

  try {
    const simplePrompt = `Simple concept sketch of ${kind}: ${prompt.substring(0, 200)}. Minimalist style, dark background.`;
    
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: simplePrompt,
      n: 1,
      size: "512x512",
    });

    const imageUrl = response.data?.[0]?.url;

    if (imageUrl) {
      console.log(`[preview-gen] Concept fallback succeeded`);
      return {
        success: true,
        previewUrl: imageUrl,
        thumbnailUrl: imageUrl,
        altText: `Concept sketch of ${kind}`,
        fallbackTier: 1,
      };
    }
  } catch (error: any) {
    console.error(`[preview-gen] Concept fallback failed:`, error.message);
  }

  return getIconFallback(kind);
}

function getIconFallback(kind: AssetKind): PreviewGenerationResult {
  console.log(`[preview-gen] Using icon fallback for ${kind}`);
  
  return {
    success: true,
    previewUrl: FALLBACK_ICONS[kind] || FALLBACK_ICONS.concept,
    thumbnailUrl: FALLBACK_ICONS[kind] || FALLBACK_ICONS.concept,
    altText: `${kind} asset (preview pending)`,
    fallbackTier: 2,
  };
}

export function getPreviewStatusDescription(status: string, fallbackTier: number): string {
  switch (status) {
    case "pending":
      return "Preview generation queued";
    case "generating":
      return "Generating preview...";
    case "ready":
      if (fallbackTier === 0) return "AI-generated preview";
      if (fallbackTier === 1) return "Concept art preview";
      return "Type icon (preview unavailable)";
    case "failed":
      return "Preview generation failed";
    default:
      return "Unknown status";
  }
}
