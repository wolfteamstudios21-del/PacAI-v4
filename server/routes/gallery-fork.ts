import { Router } from "express";
import { getGalleryItem, insertGalleryItem } from "../db/gallery";
import { chargeMiddleware, isDevTeam } from "../middleware/charge";

const router = Router();

interface ForkRecord {
  id: string;
  sourceItemId: string;
  projectId: string;
  user: string;
  forkedAt: number;
}

const forkRecords: ForkRecord[] = [];

router.post("/gallery/fork/:id", chargeMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, username = "anonymous", password } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const item = await getGalleryItem(id);
    if (!item) {
      return res.status(404).json({ error: "Gallery item not found" });
    }

    const forkedItem = await insertGalleryItem({
      kind: item.kind,
      title: `${item.title} (Fork)`,
      tags: [...item.tags, "forked"],
      license: item.license,
      owner: username,
      imageBase64: item.imageBase64,
      modelUrl: item.modelUrl,
      meta: {
        ...item.meta,
        forkedFrom: item.id,
        forkedAt: Date.now(),
        projectId
      }
    });

    const forkRecord: ForkRecord = {
      id: forkedItem.id,
      sourceItemId: id,
      projectId,
      user: username,
      forkedAt: Date.now()
    };
    forkRecords.push(forkRecord);

    const charged = !isDevTeam(username, password);

    console.log(`[gallery/fork] User ${username} forked ${item.title} to project ${projectId} (charged: ${charged})`);

    res.json({
      success: true,
      charged: charged ? 0.50 : 0,
      fork: forkRecord,
      item: forkedItem
    });
  } catch (error) {
    console.error("[gallery/fork] Error:", error);
    res.status(500).json({ error: "Fork failed" });
  }
});

router.get("/gallery/forks", async (req, res) => {
  try {
    const { projectId, user } = req.query as { projectId?: string; user?: string };
    
    let filtered = forkRecords;
    if (projectId) filtered = filtered.filter(f => f.projectId === projectId);
    if (user) filtered = filtered.filter(f => f.user === user);
    
    res.json({ success: true, count: filtered.length, forks: filtered });
  } catch (error) {
    console.error("[gallery/forks] Error:", error);
    res.status(500).json({ error: "Failed to list forks" });
  }
});

export default router;
