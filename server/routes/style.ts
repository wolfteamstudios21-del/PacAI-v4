import { Router, Response } from "express";
import { TierRequest, getTierLimits } from "../middleware/tiers";
import { v4 as uuidv4 } from "uuid";

const router = Router();

interface StyleAsset {
  id: string;
  imageBase64: string;
  license: string;
  originalId?: string;
  createdAt: number;
}

const styleAssets: Map<string, StyleAsset> = new Map();

const STYLE_FILTERS = [
  'gritty', 'clean', 'vintage', 'cyberpunk', 'military',
  'realistic', 'stylized', 'noir', 'vibrant', 'muted',
  'tactical', 'worn', 'pristine', 'weathered', 'futuristic'
];

const VALID_LICENSES = [
  'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 
  'cc0', 'proprietary', 'pacai-exclusive'
];

const UPSCALE_FACTORS = [2, 4, 8];

function applyMockFilter(filter: string, brightness: number = 1.0): { brightness: number; contrast: number; saturation: number; hue: number } {
  const filterEffects: Record<string, { brightness: number; contrast: number; saturation: number; hue: number }> = {
    gritty: { brightness: 0.9, contrast: 1.3, saturation: 0.7, hue: 0 },
    clean: { brightness: 1.1, contrast: 1.0, saturation: 1.0, hue: 0 },
    vintage: { brightness: 1.0, contrast: 0.9, saturation: 0.6, hue: 15 },
    cyberpunk: { brightness: 1.1, contrast: 1.4, saturation: 1.3, hue: -20 },
    military: { brightness: 0.95, contrast: 1.1, saturation: 0.5, hue: 10 },
    realistic: { brightness: 1.0, contrast: 1.05, saturation: 0.95, hue: 0 },
    stylized: { brightness: 1.15, contrast: 1.2, saturation: 1.2, hue: 0 },
    noir: { brightness: 0.85, contrast: 1.5, saturation: 0.0, hue: 0 },
    vibrant: { brightness: 1.1, contrast: 1.1, saturation: 1.4, hue: 0 },
    muted: { brightness: 0.95, contrast: 0.9, saturation: 0.5, hue: 0 },
    tactical: { brightness: 0.9, contrast: 1.2, saturation: 0.6, hue: 5 },
    worn: { brightness: 0.85, contrast: 1.1, saturation: 0.7, hue: 20 },
    pristine: { brightness: 1.15, contrast: 1.0, saturation: 1.1, hue: -5 },
    weathered: { brightness: 0.9, contrast: 1.15, saturation: 0.65, hue: 15 },
    futuristic: { brightness: 1.1, contrast: 1.25, saturation: 1.1, hue: -15 }
  };
  
  const effect = filterEffects[filter] || filterEffects.clean;
  return {
    ...effect,
    brightness: effect.brightness * brightness
  };
}

router.post("/v5/style", async (req: TierRequest, res: Response) => {
  try {
    const { 
      assetId, 
      filter = "gritty", 
      upscale = 4,
      license = "cc-by",
      brightness = 1.0,
      user = "anonymous"
    } = req.body;
    
    if (!assetId) {
      return res.status(400).json({ error: "assetId is required" });
    }
    
    if (!STYLE_FILTERS.includes(filter)) {
      return res.status(400).json({
        error: `Invalid filter: ${filter}`,
        available: STYLE_FILTERS
      });
    }
    
    if (!UPSCALE_FACTORS.includes(upscale)) {
      return res.status(400).json({
        error: `Invalid upscale factor: ${upscale}`,
        available: UPSCALE_FACTORS
      });
    }
    
    if (!VALID_LICENSES.includes(license)) {
      return res.status(400).json({
        error: `Invalid license: ${license}`,
        available: VALID_LICENSES
      });
    }
    
    const tier = req.userTier || 'free';
    const limits = getTierLimits(tier);
    
    const originalAsset = styleAssets.get(assetId);
    if (originalAsset && originalAsset.license !== license) {
      if (originalAsset.license === 'proprietary' || originalAsset.license === 'pacai-exclusive') {
        return res.status(403).json({
          error: "License mismatch - cannot remix proprietary assets",
          originalLicense: originalAsset.license,
          requestedLicense: license
        });
      }
    }
    
    const styleCount = 1;
    if (styleCount > limits.styles) {
      return res.status(403).json({
        error: "Tier limit exceeded for style operations",
        limit: limits.styles,
        tier,
        upgrade: tier === 'free' ? 'Upgrade to Pro for more style options' : undefined
      });
    }
    
    const filterEffect = applyMockFilter(filter, brightness);
    
    const polishedId = uuidv4();
    const mockPolishedBase64 = Buffer.from(JSON.stringify({
      format: 'image/png',
      width: 512 * upscale,
      height: 512 * upscale,
      filter,
      upscale,
      effects: filterEffect,
      originalAssetId: assetId,
      placeholder: true,
      note: 'Mock styled image - integrate Sharp/AI upscaler for production'
    })).toString('base64');
    
    const styledAsset: StyleAsset = {
      id: polishedId,
      imageBase64: mockPolishedBase64,
      license,
      originalId: assetId,
      createdAt: Date.now()
    };
    styleAssets.set(polishedId, styledAsset);
    
    if (styleAssets.size > 200) {
      const oldest = [...styleAssets.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) styleAssets.delete(oldest[0]);
    }
    
    res.json({
      success: true,
      polishedId,
      polishedUrl: `/v5/style/asset/${polishedId}`,
      polishedBase64: mockPolishedBase64,
      filter,
      upscale,
      effects: filterEffect,
      license,
      dimensions: {
        width: 512 * upscale,
        height: 512 * upscale
      },
      tier,
      note: "Mock styled asset - integrate Sharp for production filtering"
    });
    
  } catch (error) {
    console.error("Style processing error:", error);
    res.status(500).json({ error: "Style processing failed" });
  }
});

router.get("/v5/style/asset/:id", async (req, res) => {
  const asset = styleAssets.get(req.params.id);
  
  if (!asset) {
    return res.status(404).json({ error: "Styled asset not found or expired" });
  }
  
  const imageBuffer = Buffer.from(asset.imageBase64, 'base64');
  res.set({
    "Content-Type": "image/png",
    "Content-Length": imageBuffer.length.toString(),
    "X-License": asset.license
  }).send(imageBuffer);
});

router.get("/v5/style/filters", (req, res) => {
  res.json({
    filters: STYLE_FILTERS,
    categories: {
      atmosphere: ['gritty', 'clean', 'vintage', 'noir'],
      genre: ['cyberpunk', 'military', 'futuristic'],
      aesthetic: ['realistic', 'stylized', 'vibrant', 'muted'],
      condition: ['tactical', 'worn', 'pristine', 'weathered']
    },
    upscaleFactors: UPSCALE_FACTORS,
    licenses: VALID_LICENSES,
    tierLimits: {
      free: { styles: 1, maxUpscale: 2 },
      pro: { styles: 5, maxUpscale: 4 },
      enterprise: { styles: 'unlimited', maxUpscale: 8 }
    }
  });
});

router.post("/v5/style/preview", async (req: TierRequest, res: Response) => {
  try {
    const { filter = "gritty", brightness = 1.0 } = req.body;
    
    if (!STYLE_FILTERS.includes(filter)) {
      return res.status(400).json({ error: `Invalid filter: ${filter}` });
    }
    
    const effects = applyMockFilter(filter, brightness);
    
    res.json({
      filter,
      effects,
      cssFilter: `brightness(${effects.brightness}) contrast(${effects.contrast}) saturate(${effects.saturation}) hue-rotate(${effects.hue}deg)`
    });
    
  } catch (error) {
    res.status(500).json({ error: "Preview generation failed" });
  }
});

export default router;
