import { Router } from "express";
import { insertGalleryItem, GalleryItem } from "../db/gallery";

const router = Router();

router.post("/gallery/ingest", async (req, res) => {
  try {
    const {
      kind = "vehicle",
      title,
      tags = [],
      imageBase64,
      modelUrl,
      license = "cc-by",
      sourceUrl
    } = req.body as {
      kind?: GalleryItem["kind"];
      title: string;
      tags?: string[];
      imageBase64?: string;
      modelUrl?: string;
      license?: string;
      sourceUrl?: string;
    };

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    if (!["cc0", "cc-by"].includes(license)) {
      return res.status(403).json({ error: "License must be cc0 or cc-by for web ingestion" });
    }

    if (!["vehicle", "weapon", "creature"].includes(kind)) {
      return res.status(400).json({ error: "kind must be vehicle, weapon, or creature" });
    }

    const item = await insertGalleryItem({
      kind: kind as GalleryItem["kind"],
      title,
      tags,
      license: license as "cc0" | "cc-by",
      owner: "web",
      imageBase64,
      modelUrl,
      meta: { sourceUrl, ingestedAt: Date.now() },
    });

    console.log(`[gallery/ingest] Ingested ${kind} "${title}" from web (license=${license})`);
    res.json({ success: true, item });
  } catch (error) {
    console.error("[gallery/ingest] Error:", error);
    res.status(500).json({ error: "Ingestion failed" });
  }
});

export default router;
