import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getUser, hasTier, type User } from "./auth";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, safeName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error("Only PNG, JPG, WebP, and GIF images are allowed"));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

interface RefRecord {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url: string | null;
  type: "upload" | "link" | "gallery" | "other-ai";
  source: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: number;
}

const refsStore: Map<string, RefRecord> = new Map();
const userRefsIndex: Map<string, Set<string>> = new Map();

function generateId(): string {
  return crypto.randomUUID();
}

function getUserRefs(userId: string): RefRecord[] {
  const refIds = userRefsIndex.get(userId);
  if (!refIds) return [];
  return Array.from(refIds)
    .map((id) => refsStore.get(id))
    .filter((r): r is RefRecord => r !== undefined)
    .sort((a, b) => b.created_at - a.created_at);
}

function getRefLimit(tier: string): number {
  switch (tier) {
    case "lifetime":
      return Infinity;
    case "creator":
    case "pro":
      return 50;
    case "free":
    default:
      return 5;
  }
}

function getRefsPerGenLimit(tier: string): number {
  switch (tier) {
    case "lifetime":
      return 10;
    case "creator":
    case "pro":
      return 5;
    case "free":
    default:
      return 1;
  }
}

router.post("/v5/refs/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const username = req.body.username || req.headers["x-username"] as string;
    if (!username) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = getUser(username);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userRefs = getUserRefs(username);
    const limit = getRefLimit(user.tier || "free");
    if (userRefs.length >= limit) {
      return res.status(403).json({
        error: "Reference limit reached",
        current: userRefs.length,
        limit,
        tier: user.tier,
        message: user.tier === "free" 
          ? "Upgrade to Pro for more references" 
          : "You've reached your reference limit",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const refId = generateId();
    const url = `/uploads/${req.file.filename}`;
    const type = (req.body.type as RefRecord["type"]) || "upload";
    const source = req.body.source || null;
    const description = req.body.description || null;

    const ref: RefRecord = {
      id: refId,
      user_id: username,
      url,
      thumbnail_url: url,
      type,
      source,
      description,
      metadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      created_at: Date.now(),
    };

    refsStore.set(refId, ref);
    if (!userRefsIndex.has(username)) {
      userRefsIndex.set(username, new Set());
    }
    userRefsIndex.get(username)!.add(refId);

    res.json({
      refId,
      url,
      thumbnailUrl: url,
      type,
      message: "Reference uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/v5/refs/link", async (req: Request, res: Response) => {
  try {
    const { url, username, type = "link", source, description } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!username) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = getUser(username);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userRefs = getUserRefs(username);
    const limit = getRefLimit(user.tier || "free");
    if (userRefs.length >= limit) {
      return res.status(403).json({
        error: "Reference limit reached",
        current: userRefs.length,
        limit,
        tier: user.tier,
      });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const blockedDomains = ["localhost", "127.0.0.1", "0.0.0.0", "internal"];
    const urlObj = new URL(url);
    if (blockedDomains.some((d) => urlObj.hostname.includes(d))) {
      return res.status(400).json({ error: "Invalid URL domain" });
    }

    const refId = generateId();
    const ref: RefRecord = {
      id: refId,
      user_id: username,
      url,
      thumbnail_url: url,
      type: type as RefRecord["type"],
      source: source || detectSource(url),
      description: description || null,
      metadata: { external: true },
      created_at: Date.now(),
    };

    refsStore.set(refId, ref);
    if (!userRefsIndex.has(username)) {
      userRefsIndex.set(username, new Set());
    }
    userRefsIndex.get(username)!.add(refId);

    res.json({
      refId,
      url,
      thumbnailUrl: url,
      type,
      source: ref.source,
      message: "Reference linked successfully",
    });
  } catch (error) {
    console.error("Link error:", error);
    res.status(500).json({
      error: "Failed to add link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/v5/refs", async (req: Request, res: Response) => {
  const username = req.query.username as string || req.headers["x-username"] as string;
  
  if (!username) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = getUser(username);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const refs = getUserRefs(username);
  const limit = getRefLimit(user.tier || "free");
  const refsPerGen = getRefsPerGenLimit(user.tier || "free");

  res.json({
    refs,
    count: refs.length,
    limit,
    refsPerGeneration: refsPerGen,
    tier: user.tier,
  });
});

router.get("/v5/refs/:id", async (req: Request, res: Response) => {
  const ref = refsStore.get(req.params.id);
  if (!ref) {
    return res.status(404).json({ error: "Reference not found" });
  }
  res.json(ref);
});

router.get("/v5/refs/:id/thumb", async (req: Request, res: Response) => {
  const ref = refsStore.get(req.params.id);
  if (!ref) {
    return res.status(404).json({ error: "Reference not found" });
  }
  
  if (ref.thumbnail_url?.startsWith("/uploads/")) {
    const filePath = path.join(UPLOADS_DIR, path.basename(ref.thumbnail_url));
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  res.redirect(ref.thumbnail_url || ref.url);
});

router.delete("/v5/refs/:id", async (req: Request, res: Response) => {
  const username = req.body.username || req.headers["x-username"] as string;
  
  if (!username) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = getUser(username);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const ref = refsStore.get(req.params.id);
  if (!ref) {
    return res.status(404).json({ error: "Reference not found" });
  }

  if (ref.user_id !== username && user.tier !== "lifetime") {
    return res.status(403).json({ error: "Not authorized to delete this reference" });
  }

  if (ref.url.startsWith("/uploads/")) {
    const filePath = path.join(UPLOADS_DIR, path.basename(ref.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  refsStore.delete(req.params.id);
  userRefsIndex.get(ref.user_id)?.delete(req.params.id);

  res.json({ deleted: true, refId: req.params.id });
});

function detectSource(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("midjourney") || lower.includes("mj-")) return "midjourney";
  if (lower.includes("dalle") || lower.includes("openai")) return "dalle";
  if (lower.includes("stability") || lower.includes("dreamstudio")) return "stable-diffusion";
  if (lower.includes("replicate")) return "replicate";
  if (lower.includes("leonardo")) return "leonardo";
  if (lower.includes("artstation")) return "artstation";
  if (lower.includes("deviantart")) return "deviantart";
  return null;
}

export function getRefsByIds(refIds: string[]): RefRecord[] {
  return refIds
    .map((id) => refsStore.get(id))
    .filter((r): r is RefRecord => r !== undefined);
}

export function buildRefPromptEnhancement(refs: RefRecord[]): string {
  if (refs.length === 0) return "";
  
  const descriptions = refs
    .map((r) => {
      if (r.description) return r.description;
      if (r.source) return `${r.source} style`;
      return "reference image";
    })
    .join(", ");
  
  return `Style references: ${descriptions}. `;
}

export { getRefsPerGenLimit };
export default router;
