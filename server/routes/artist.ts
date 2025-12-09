import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getUser, requireAuth, validateSessionToken, type User } from "../auth";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for artist uploads
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `artist_${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error("Only PNG, JPG, and WebP images are allowed"));
    return;
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

interface ArtistRefRecord {
  id: string;
  user_id: string;
  artist_name: string;
  image_url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  royalty_percent: number;
  license: "cc-by" | "cc-by-nc" | "commercial" | "pacai-exclusive";
  total_earned: number;
  usage_count: number;
  is_featured: boolean;
  created_at: number;
}

const artistRefsStore: Map<string, ArtistRefRecord> = new Map();
const artistIndex: Map<string, Set<string>> = new Map();

const ROYALTY_OPTIONS = [10, 20, 30];
const LICENSE_OPTIONS = ["cc-by", "cc-by-nc", "commercial", "pacai-exclusive"];

function getEarningsPerUse(userTier: string): number {
  switch (userTier) {
    case "enterprise": return 300; // $3.00
    case "lifetime":
    case "pro": return 90; // $0.90
    case "creator": return 60; // $0.60
    default: return 30; // $0.30
  }
}

router.post("/v5/refs/artist", upload.single("file"), async (req: Request, res: Response) => {
  try {
    // Validate session token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.headers["x-session-token"] as string;
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required - session token missing" });
    }
    
    const session = validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    // Derive username from validated session (not from request body)
    const username = session.username;
    const user = getUser(username);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const title = req.body.title;
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: "Title is required (min 3 characters)" });
    }

    const artistName = req.body.artistName || `@${username}`;
    const royaltyPercent = parseInt(req.body.royaltyPercent) || 30;
    const license = req.body.license || "commercial";

    if (!ROYALTY_OPTIONS.includes(royaltyPercent)) {
      return res.status(400).json({ error: "Invalid royalty percent. Options: 10, 20, 30" });
    }

    if (!LICENSE_OPTIONS.includes(license)) {
      return res.status(400).json({ error: "Invalid license type" });
    }

    const refId = crypto.randomUUID();
    const imageUrl = `/uploads/${req.file.filename}`;

    const artistRef: ArtistRefRecord = {
      id: refId,
      user_id: username,
      artist_name: artistName,
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      title: title.trim(),
      description: req.body.description || null,
      royalty_percent: royaltyPercent,
      license: license as ArtistRefRecord["license"],
      total_earned: 0,
      usage_count: 0,
      is_featured: false,
      created_at: Date.now(),
    };

    artistRefsStore.set(refId, artistRef);
    if (!artistIndex.has(username)) {
      artistIndex.set(username, new Set());
    }
    artistIndex.get(username)!.add(refId);

    res.json({
      success: true,
      ref: artistRef,
      message: `You'll earn ${royaltyPercent}% every time someone uses "${title}"!`,
    });
  } catch (error) {
    console.error("Artist upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/v5/refs/artist", async (req: Request, res: Response) => {
  try {
    const featured = req.query.featured === "true";
    const artistId = req.query.artistId as string;
    
    let refs = Array.from(artistRefsStore.values());
    
    if (featured) {
      refs = refs.filter(r => r.is_featured);
    }
    
    if (artistId) {
      const userRefs = artistIndex.get(artistId);
      if (userRefs) {
        refs = refs.filter(r => userRefs.has(r.id));
      } else {
        refs = [];
      }
    }
    
    refs.sort((a, b) => b.usage_count - a.usage_count);
    
    res.json({
      refs,
      count: refs.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch artist refs" });
  }
});

router.get("/v5/refs/artist/:id", async (req: Request, res: Response) => {
  const ref = artistRefsStore.get(req.params.id);
  if (!ref) {
    return res.status(404).json({ error: "Artist reference not found" });
  }
  res.json(ref);
});

router.post("/v5/refs/artist/:id/use", async (req: Request, res: Response) => {
  try {
    const ref = artistRefsStore.get(req.params.id);
    if (!ref) {
      return res.status(404).json({ error: "Artist reference not found" });
    }

    const username = req.body.username || req.headers["x-username"] as string;
    const user = getUser(username);
    const userTier = user?.tier || "free";

    const baseEarnings = getEarningsPerUse(userTier);
    const artistEarnings = Math.floor(baseEarnings * (ref.royalty_percent / 100));

    ref.total_earned += artistEarnings;
    ref.usage_count += 1;
    artistRefsStore.set(ref.id, ref);

    res.json({
      success: true,
      artistEarnings: artistEarnings / 100,
      artistEarningsFormatted: `$${(artistEarnings / 100).toFixed(2)}`,
      totalEarned: ref.total_earned / 100,
      usageCount: ref.usage_count,
      artist: ref.artist_name,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to record usage" });
  }
});

router.get("/v5/artist/leaderboard", async (req: Request, res: Response) => {
  try {
    const artistStats: Map<string, { artist_name: string; total_earned: number; total_uses: number; ref_count: number }> = new Map();

    for (const ref of artistRefsStore.values()) {
      const current = artistStats.get(ref.user_id) || {
        artist_name: ref.artist_name,
        total_earned: 0,
        total_uses: 0,
        ref_count: 0,
      };
      current.total_earned += ref.total_earned;
      current.total_uses += ref.usage_count;
      current.ref_count += 1;
      artistStats.set(ref.user_id, current);
    }

    const leaderboard = Array.from(artistStats.entries())
      .map(([user_id, stats]) => ({
        user_id,
        ...stats,
        total_earned_formatted: `$${(stats.total_earned / 100).toFixed(2)}`,
      }))
      .sort((a, b) => b.total_earned - a.total_earned)
      .slice(0, 10);

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/v5/artist/stats", async (req: Request, res: Response) => {
  try {
    // Validate session token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.headers["x-session-token"] as string;
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required - session token missing" });
    }
    
    const session = validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    // Derive username from validated session (not from query params)
    const username = session.username;

    const userRefIds = artistIndex.get(username);
    if (!userRefIds || userRefIds.size === 0) {
      return res.json({
        total_earned: 0,
        total_earned_formatted: "$0.00",
        total_uses: 0,
        ref_count: 0,
        refs: [],
      });
    }

    let totalEarned = 0;
    let totalUses = 0;
    const refs: ArtistRefRecord[] = [];

    for (const refId of userRefIds) {
      const ref = artistRefsStore.get(refId);
      if (ref) {
        totalEarned += ref.total_earned;
        totalUses += ref.usage_count;
        refs.push(ref);
      }
    }

    res.json({
      total_earned: totalEarned,
      total_earned_formatted: `$${(totalEarned / 100).toFixed(2)}`,
      total_uses: totalUses,
      ref_count: refs.length,
      refs: refs.sort((a, b) => b.usage_count - a.usage_count),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch artist stats" });
  }
});

export function getArtistRefById(refId: string): ArtistRefRecord | undefined {
  return artistRefsStore.get(refId);
}

export function recordArtistRefUsage(refId: string, userTier: string): { earnings: number } | null {
  const ref = artistRefsStore.get(refId);
  if (!ref) return null;

  const baseEarnings = getEarningsPerUse(userTier);
  const artistEarnings = Math.floor(baseEarnings * (ref.royalty_percent / 100));

  ref.total_earned += artistEarnings;
  ref.usage_count += 1;
  artistRefsStore.set(ref.id, ref);

  return { earnings: artistEarnings };
}

export default router;
