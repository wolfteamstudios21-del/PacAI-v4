import { Router, Response } from "express";
import { TierRequest, getTierLimits } from "../middleware/tiers";
import { v4 as uuidv4 } from "uuid";

const router = Router();

interface VoicePreview {
  id: string;
  text: string;
  style: string;
  language: string;
  audioBase64: string;
  duration: number;
  createdAt: number;
}

const voicePreviews: Map<string, VoicePreview> = new Map();

const VOICE_STYLES = [
  'gritty', 'calm', 'urgent', 'robotic', 'tactical',
  'commander', 'civilian', 'hostile', 'friendly', 'neutral'
];

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'ar'];

function generateMockAudio(text: string, style: string): { base64: string; duration: number } {
  const seed = text.length + style.charCodeAt(0);
  const duration = Math.max(1, text.split(' ').length * 0.4);
  
  const mockWaveform = Array.from({ length: 100 }, (_, i) => 
    Math.sin(i * 0.1 + seed) * 0.5 + 0.5
  );
  
  const mockBase64 = Buffer.from(JSON.stringify({
    format: 'audio/mp3',
    sampleRate: 44100,
    channels: 1,
    style,
    waveformPreview: mockWaveform.slice(0, 20),
    placeholder: true,
    note: 'Connect Ollama or local TTS engine for real audio'
  })).toString('base64');
  
  return { base64: mockBase64, duration };
}

router.post("/v5/voice", async (req: TierRequest, res: Response) => {
  try {
    const { text, style = "gritty", language = "en", user = "anonymous" } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ error: "Text exceeds 1000 character limit" });
    }
    
    const styles = style.split(',').map((s: string) => s.trim());
    const tier = req.userTier || 'free';
    const limits = getTierLimits(tier);
    
    if (styles.length > limits.voices) {
      return res.status(403).json({ 
        error: "Tier limit exceeded",
        limit: limits.voices,
        requested: styles.length,
        tier,
        upgrade: tier === 'free' ? 'Upgrade to Pro for 5 styles' : undefined
      });
    }
    
    for (const s of styles) {
      if (!VOICE_STYLES.includes(s)) {
        return res.status(400).json({ 
          error: `Invalid style: ${s}`,
          available: VOICE_STYLES
        });
      }
    }
    
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ 
        error: `Unsupported language: ${language}`,
        available: SUPPORTED_LANGUAGES
      });
    }
    
    const audio = generateMockAudio(text, styles[0]);
    
    const previewId = uuidv4();
    const preview: VoicePreview = {
      id: previewId,
      text: text.substring(0, 100),
      style: styles[0],
      language,
      audioBase64: audio.base64,
      duration: audio.duration,
      createdAt: Date.now()
    };
    voicePreviews.set(previewId, preview);
    
    if (voicePreviews.size > 100) {
      const oldest = [...voicePreviews.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) voicePreviews.delete(oldest[0]);
    }
    
    res.json({
      success: true,
      previewId,
      audioUrl: `/v5/voice/preview/${previewId}`,
      audioBase64: audio.base64,
      duration: audio.duration,
      style: styles[0],
      language,
      tier,
      note: "Mock audio - connect Ollama/local TTS for production"
    });
    
  } catch (error) {
    console.error("Voice generation error:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

router.get("/v5/voice/preview/:id", async (req, res) => {
  const preview = voicePreviews.get(req.params.id);
  
  if (!preview) {
    return res.status(404).json({ error: "Preview not found or expired" });
  }
  
  const audioBuffer = Buffer.from(preview.audioBase64, 'base64');
  res.set({
    "Content-Type": "audio/mp3",
    "Content-Length": audioBuffer.length.toString(),
    "X-Duration": preview.duration.toString(),
    "X-Style": preview.style
  }).send(audioBuffer);
});

router.get("/v5/voice/styles", (req, res) => {
  res.json({
    styles: VOICE_STYLES,
    languages: SUPPORTED_LANGUAGES,
    tierLimits: {
      free: 1,
      pro: 5,
      enterprise: "unlimited"
    }
  });
});

export default router;
