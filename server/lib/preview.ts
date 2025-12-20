import crypto from "crypto";
import OpenAI from "openai";
import { updateGalleryItemPreview } from "../db/gallery";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type AssetKind = "vehicle" | "weapon" | "creature" | "concept" | "model" | "world" | "npc" | "simulation";

const PREVIEW_PROMPTS: Record<AssetKind, string> = {
  vehicle: "detailed military vehicle concept art, professional game asset, dramatic lighting, dark background",
  weapon: "detailed weapon design, professional game asset render, studio lighting, dark background",
  creature: "detailed creature portrait, full body view, dramatic game art style, dark background",
  concept: "cinematic concept art illustration, professional quality, dramatic lighting",
  model: "3D model showcase render, studio lighting, turntable view, dark background",
  world: "tactical map overview, terrain visualization, strategic game asset",
  npc: "character portrait design, professional game NPC art, dramatic lighting",
  simulation: "abstract data visualization, tactical interface, cyberpunk HUD style",
};

export function silhouetteFromTags(tags: string[], w = 512, h = 512) {
  const seed = crypto.createHash("sha256").update(tags.join("|")).digest("hex").slice(0, 6);
  const color = `#${seed}`;
  const pathSeed = parseInt(seed, 16) % 200 + 50;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#0b0b0b"/>
      <g fill="${color}">
        <path d="M ${w / 2} ${h / 4} L ${w / 2 + pathSeed} ${h / 2} L ${w / 2} ${h - h / 4} L ${w / 2 - pathSeed} ${h / 2} Z"/>
      </g>
      <text x="50%" y="${h - 24}" text-anchor="middle" fill="#ffffff" font-size="18" font-family="monospace">${tags[0] || "pacai"}</text>
    </svg>`;
  return Buffer.from(svg).toString("base64");
}

export async function choosePreview(meta: any, fallbackTags: string[]) {
  const tags = Array.from(new Set([
    ...(meta?.visuals?.palette ? [meta.visuals.palette] : []),
    ...(meta?.abilities || []),
    ...(meta?.tags || []),
    ...fallbackTags
  ]))
    .filter(Boolean)
    .slice(0, 6);

  return silhouetteFromTags(tags);
}

export async function generateAssetPreview(
  assetId: string,
  kind: AssetKind,
  prompt: string,
  meta?: Record<string, any>
): Promise<{ url: string; fallbackTier: number }> {
  console.log(`[preview] Generating preview for ${kind} asset ${assetId}`);
  
  try {
    await updateGalleryItemPreview(assetId, {
      previewStatus: "generating",
      previewFallbackTier: 2,
    });
    
    const stylePrompt = PREVIEW_PROMPTS[kind] || PREVIEW_PROMPTS.concept;
    const fullPrompt = `${prompt}. Style: ${stylePrompt}`.substring(0, 4000);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;

    if (imageUrl) {
      console.log(`[preview] AI preview generated for ${assetId}`);
      await updateGalleryItemPreview(assetId, {
        previewImageUrl: imageUrl,
        previewThumbnailUrl: imageUrl,
        previewStatus: "ready",
        previewAltText: `AI-generated preview: ${prompt.substring(0, 100)}`,
        previewFallbackTier: 0,
      });
      return { url: imageUrl, fallbackTier: 0 };
    }
    
    return await generateConceptFallback(assetId, kind, prompt);
    
  } catch (error: any) {
    console.error(`[preview] Primary generation failed:`, error.message);
    return await generateConceptFallback(assetId, kind, prompt);
  }
}

async function generateConceptFallback(
  assetId: string,
  kind: AssetKind,
  prompt: string
): Promise<{ url: string; fallbackTier: number }> {
  console.log(`[preview] Attempting concept art fallback for ${assetId}`);
  
  try {
    const simplePrompt = `Simple ${kind} sketch: ${prompt.substring(0, 200)}. Minimalist, dark background.`;
    
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: simplePrompt,
      n: 1,
      size: "512x512",
    });

    const imageUrl = response.data?.[0]?.url;

    if (imageUrl) {
      console.log(`[preview] Concept fallback succeeded for ${assetId}`);
      await updateGalleryItemPreview(assetId, {
        previewImageUrl: imageUrl,
        previewThumbnailUrl: imageUrl,
        previewStatus: "ready",
        previewAltText: `Concept sketch: ${kind}`,
        previewFallbackTier: 1,
      });
      return { url: imageUrl, fallbackTier: 1 };
    }
  } catch (error: any) {
    console.error(`[preview] Concept fallback failed:`, error.message);
  }

  return await useIconFallback(assetId, kind);
}

async function useIconFallback(
  assetId: string,
  kind: AssetKind
): Promise<{ url: string; fallbackTier: number }> {
  console.log(`[preview] Using icon fallback for ${assetId}`);
  
  const iconUrl = `/icons/${kind}-placeholder.svg`;
  
  await updateGalleryItemPreview(assetId, {
    previewImageUrl: iconUrl,
    previewThumbnailUrl: iconUrl,
    previewStatus: "ready",
    previewAltText: `${kind} asset (preview unavailable)`,
    previewFallbackTier: 2,
  });
  
  return { url: iconUrl, fallbackTier: 2 };
}
