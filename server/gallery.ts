// PacAI v6.3 - Gallery Module with Community Remix + Offline Cache
import { Router, Request, Response } from "express";
import { getProject, listProjects, saveProject } from "./db";
import { createProject } from "./projects";
import { addAudit } from "./db";

const router = Router();

interface GalleryItem {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  is_public: boolean;
  remix_count: number;
  remixed_from: string | null;
  seed: number;
  refs: string[];
  license: "private" | "cc-by" | "cc-by-nc" | "commercial";
  created_at: number;
  updated_at: number;
}

interface RemixRecord {
  id: string;
  original_id: string;
  remix_id: string;
  user_id: string;
  license: string;
  created_at: number;
}

const galleryStore = new Map<string, GalleryItem>();
const remixesStore = new Map<string, RemixRecord>();
const userGalleryIndex = new Map<string, Set<string>>();

function generateId(): string {
  return crypto.randomUUID();
}

// GET /v5/gallery - List gallery items (public or user's own)
router.get("/v5/gallery", async (req: Request, res: Response) => {
  const { publicOnly, userId, limit = 50, offset = 0 } = req.query;
  const requestingUser = req.headers["x-username"] as string || "anonymous";
  
  let items = Array.from(galleryStore.values());
  
  // Filter by visibility
  if (publicOnly === "true") {
    items = items.filter(g => g.is_public);
  } else if (userId) {
    items = items.filter(g => g.user_id === userId);
  } else {
    // Show user's own + public items
    items = items.filter(g => g.is_public || g.user_id === requestingUser);
  }
  
  // Sort by newest first
  items.sort((a, b) => b.created_at - a.created_at);
  
  // Paginate
  const total = items.length;
  const paginated = items.slice(Number(offset), Number(offset) + Number(limit));
  
  res.json({
    galleries: paginated.map(g => ({
      ...g,
      remix_count: countRemixes(g.id),
      canRemix: g.license !== "private" || g.user_id === requestingUser
    })),
    total,
    limit: Number(limit),
    offset: Number(offset)
  });
});

// GET /v5/gallery/:id - Get single gallery item
router.get("/v5/gallery/:id", async (req: Request, res: Response) => {
  const item = galleryStore.get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Gallery item not found" });
  }
  
  const requestingUser = req.headers["x-username"] as string;
  if (!item.is_public && item.user_id !== requestingUser) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const remixes = getItemRemixes(req.params.id);
  
  res.json({
    ...item,
    remix_count: remixes.length,
    remixes: remixes.slice(0, 10) // Last 10 remixes
  });
});

// POST /v5/gallery - Add project to gallery
router.post("/v5/gallery", async (req: Request, res: Response) => {
  const { projectId, name, description, isPublic = false, license = "private" } = req.body;
  const userId = req.headers["x-username"] as string || req.body.username;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!projectId) {
    return res.status(400).json({ error: "Project ID required" });
  }
  
  const project = await getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  
  // Cast to extended type for optional properties
  const extProject = project as typeof project & { refs?: string[]; name?: string };
  
  const galleryId = generateId();
  const item: GalleryItem = {
    id: galleryId,
    project_id: projectId,
    user_id: userId,
    name: name || extProject.name || `Gallery ${galleryId.slice(0, 8)}`,
    description: description || null,
    thumbnail: (project.state as any)?.thumbnail || null,
    is_public: Boolean(isPublic),
    remix_count: 0,
    remixed_from: null,
    seed: project.seed || Date.now(),
    refs: extProject.refs || [],
    license: license as GalleryItem["license"],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  galleryStore.set(galleryId, item);
  if (!userGalleryIndex.has(userId)) {
    userGalleryIndex.set(userId, new Set());
  }
  userGalleryIndex.get(userId)!.add(galleryId);
  
  await addAudit({
    projectId,
    action: "gallery_add",
    actor: userId,
    details: { galleryId, isPublic, license },
    ts: Date.now()
  });
  
  res.json({
    gallery: item,
    message: "Added to gallery"
  });
});

// POST /v5/gallery/:id/remix - Fork project with new seed
router.post("/v5/gallery/:id/remix", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.headers["x-username"] as string || req.body.username || "anonymous";
  
  const gallery = galleryStore.get(id);
  if (!gallery) {
    return res.status(404).json({ error: "Gallery item not found" });
  }
  
  // Check license allows remix
  if (gallery.license === "private" && gallery.user_id !== userId) {
    return res.status(403).json({ error: "This item doesn't allow remixes" });
  }
  
  const originalProject = await getProject(gallery.project_id);
  if (!originalProject) {
    return res.status(404).json({ error: "Original project not found" });
  }
  
  // Create remixed project with new seed but inherited refs
  const remix = await createProject();
  const extRemix = remix as typeof remix & { refs?: string[]; remixed_from?: string; name?: string };
  extRemix.seed = Date.now();
  extRemix.refs = gallery.refs; // Inherit refs for instant variants
  extRemix.remixed_from = gallery.project_id;
  extRemix.name = `Remix of ${gallery.name}`;
  
  await saveProject(extRemix as any);
  
  // Track the remix
  const remixRecord: RemixRecord = {
    id: generateId(),
    original_id: id,
    remix_id: remix.id,
    user_id: userId,
    license: gallery.license,
    created_at: Date.now()
  };
  remixesStore.set(remixRecord.id, remixRecord);
  
  // Log to audit
  await addAudit({
    projectId: remix.id,
    action: "remix_created",
    actor: userId,
    details: {
      original_gallery: id,
      original_project: gallery.project_id,
      license: gallery.license
    },
    ts: Date.now()
  });
  
  res.json({
    remix: {
      id: remix.id,
      seed: extRemix.seed,
      refs: extRemix.refs,
      remixed_from: gallery.project_id,
      name: extRemix.name
    },
    original: {
      id: gallery.id,
      name: gallery.name,
      license: gallery.license
    },
    message: "Remixed! Edit in dashboard."
  });
});

// PATCH /v5/gallery/:id - Update gallery item
router.patch("/v5/gallery/:id", async (req: Request, res: Response) => {
  const userId = req.headers["x-username"] as string;
  const item = galleryStore.get(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: "Gallery item not found" });
  }
  
  if (item.user_id !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  
  const { name, description, isPublic, license } = req.body;
  
  if (name !== undefined) item.name = name;
  if (description !== undefined) item.description = description;
  if (isPublic !== undefined) item.is_public = Boolean(isPublic);
  if (license !== undefined) item.license = license;
  item.updated_at = Date.now();
  
  galleryStore.set(req.params.id, item);
  
  res.json({ gallery: item, message: "Updated" });
});

// DELETE /v5/gallery/:id - Remove from gallery
router.delete("/v5/gallery/:id", async (req: Request, res: Response) => {
  const userId = req.headers["x-username"] as string;
  const item = galleryStore.get(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: "Gallery item not found" });
  }
  
  if (item.user_id !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  
  galleryStore.delete(req.params.id);
  userGalleryIndex.get(userId)?.delete(req.params.id);
  
  res.json({ deleted: true, id: req.params.id });
});

// Helper functions
function countRemixes(galleryId: string): number {
  return Array.from(remixesStore.values()).filter(r => r.original_id === galleryId).length;
}

function getItemRemixes(galleryId: string): RemixRecord[] {
  return Array.from(remixesStore.values())
    .filter(r => r.original_id === galleryId)
    .sort((a, b) => b.created_at - a.created_at);
}

export function getGalleryItem(id: string): GalleryItem | undefined {
  return galleryStore.get(id);
}

export default router;
