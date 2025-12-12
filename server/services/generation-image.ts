import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { withRetry, logHeapUsage } from "../lib/circuit-breaker";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "concept-art");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface ConceptArtResult {
  id: string;
  prompt: string;
  imageUrl: string;
  imageBase64?: string;
  style: string;
  generatedAt: number;
  provider: "openai" | "fallback";
}

export async function generateConceptArt(
  prompt: string,
  style: string = "game-ready concept art"
): Promise<ConceptArtResult> {
  const id = uuidv4();
  const fullPrompt = `${prompt}, ${style}, high-detail, professional game asset concept, dramatic lighting`;

  try {
    logHeapUsage("generation-image:start");

    const response = await withRetry(
      async () => {
        return openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json",
        });
      },
      { retries: 2, minTimeout: 2000 }
    );

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error("No image data returned from DALL-E");
    }

    logHeapUsage("generation-image:complete");

    const filename = `${id}.png`;
    const filepath = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(imageData.b64_json, "base64");
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/uploads/concept-art/${filename}`;

    console.log(`[generation-image] Generated concept art: ${id} for prompt: "${prompt.slice(0, 50)}..."`);

    return {
      id,
      prompt,
      imageUrl,
      imageBase64: imageData.b64_json,
      style,
      generatedAt: Date.now(),
      provider: "openai",
    };
  } catch (error: any) {
    console.error("[generation-image] OpenAI DALL-E error:", error.message);
    
    const { svgContent, svgBase64 } = generateFallbackPlaceholder(prompt, id);
    const filename = `${id}.svg`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, svgContent);

    return {
      id,
      prompt,
      imageUrl: `/uploads/concept-art/${filename}`,
      imageBase64: svgBase64,
      style,
      generatedAt: Date.now(),
      provider: "fallback",
    };
  }
}

function generateFallbackPlaceholder(prompt: string, id: string): { svgContent: string; svgBase64: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="200" font-family="Arial" font-size="24" fill="#3e73ff" text-anchor="middle">PacAI Concept Art</text>
  <text x="256" y="240" font-family="Arial" font-size="14" fill="#888" text-anchor="middle">${escapeXml(prompt.slice(0, 40))}</text>
  <text x="256" y="280" font-family="Arial" font-size="12" fill="#555" text-anchor="middle">ID: ${id.slice(0, 8)}</text>
  <rect x="156" y="320" width="200" height="100" rx="8" fill="#0f3460" stroke="#3e73ff" stroke-width="2"/>
  <text x="256" y="375" font-family="Arial" font-size="16" fill="#e94560" text-anchor="middle">Placeholder</text>
</svg>`;
  
  return {
    svgContent: svg,
    svgBase64: Buffer.from(svg).toString("base64"),
  };
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function generateConceptArtBatch(
  prompts: { prompt: string; style?: string }[]
): Promise<ConceptArtResult[]> {
  const results: ConceptArtResult[] = [];
  
  for (const item of prompts) {
    const result = await generateConceptArt(item.prompt, item.style);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
