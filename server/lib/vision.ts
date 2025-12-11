import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";

const VISION_KEY = process.env.AZURE_VISION_KEY;
const VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT;

let client: ComputerVisionClient | null = null;
if (VISION_KEY && VISION_ENDPOINT) {
  const credentials = new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": VISION_KEY } });
  client = new ComputerVisionClient(credentials, VISION_ENDPOINT);
}

export interface ImageParseResult {
  style: string;
  palette: string;
  materials: string[];
  biome: string;
  silhouettes: any[];
  props: string[];
  tone: string;
  light: string;
}

const DEFAULT_RESULT: ImageParseResult = {
  style: "realistic",
  palette: "neutral",
  materials: [],
  biome: "urban",
  silhouettes: [],
  props: [],
  tone: "neutral",
  light: "daylight",
};

export async function parseImage(url: string): Promise<ImageParseResult> {
  if (!client) return DEFAULT_RESULT;

  try {
    const features = ["ImageType", "Tags", "Description", "Objects", "Color"];
    const result = await client.analyzeImage(url, { visualFeatures: features as any });

    const tags = result.tags || [];
    const caption = result.description?.captions?.[0]?.text || "";
    const objects = result.objects || [];
    const colors = result.color;

    const biomeTag = tags.find((t) =>
      ["forest", "desert", "urban", "tundra", "jungle", "arctic", "coastal"].includes(t.name?.toLowerCase() || "")
    );
    const styleTag = tags.find((t) =>
      ["realistic", "painterly", "cel-shaded", "gritty", "photorealistic"].includes(t.name?.toLowerCase() || "")
    );
    const materialTags = tags.filter((t) =>
      ["metal", "wood", "stone", "concrete", "glass", "steel"].includes(t.name?.toLowerCase() || "")
    );

    const paletteMatch = caption.match(/\b(blue|red|green|gold|violet|earthy|warm|cool|muted)\b/i);
    const toneMatch = caption.match(/\b(dramatic|soft|harsh|warm|cold|moody)\b/i);
    const lightMatch = caption.match(/\b(daylight|night|sunset|dusk|dawn|overcast)\b/i);

    return {
      style: styleTag?.name || "realistic",
      palette: paletteMatch?.[0]?.toLowerCase() || colors?.dominantColorForeground?.toLowerCase() || "neutral",
      materials: materialTags.map((t) => t.name || ""),
      biome: biomeTag?.name?.toLowerCase() || "urban",
      silhouettes: objects.map((o) => o.rectangle).filter(Boolean),
      props: tags.filter((t) => (t.confidence || 0) > 0.7).map((t) => t.name || ""),
      tone: toneMatch?.[0]?.toLowerCase() || "neutral",
      light: lightMatch?.[0]?.toLowerCase() || "daylight",
    };
  } catch (error) {
    console.error("[vision] Azure Vision error:", error);
    return DEFAULT_RESULT;
  }
}
