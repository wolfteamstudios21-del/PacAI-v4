import { Router } from "express";
import { searchForContext, clearSearchCache, getSearchCacheStats } from "../services/search-rag";
import { generateWithRAG, setRAGEnabled, isRAGEnabled } from "../services/llm-service";

const router = Router();

router.get("/rag/status", (req, res) => {
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  const hasSearchEngineId = !!process.env.GOOGLE_SEARCH_ENGINE_ID;
  const cacheStats = getSearchCacheStats();

  res.json({
    success: true,
    ragEnabled: isRAGEnabled(),
    configured: hasGoogleKey && hasSearchEngineId,
    missingConfig: {
      googleApiKey: !hasGoogleKey,
      searchEngineId: !hasSearchEngineId,
    },
    cache: cacheStats,
  });
});

router.post("/rag/toggle", (req, res) => {
  const { enabled } = req.body as { enabled?: boolean };
  
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "enabled must be a boolean" });
  }

  setRAGEnabled(enabled);
  
  res.json({
    success: true,
    ragEnabled: isRAGEnabled(),
    message: `RAG ${enabled ? "enabled" : "disabled"}`,
  });
});

router.post("/rag/search", async (req, res) => {
  try {
    const { query, numResults = 5, siteFilter, dateRestrict } = req.body as {
      query: string;
      numResults?: number;
      siteFilter?: string;
      dateRestrict?: string;
    };

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const result = await searchForContext(query, {
      numResults,
      siteFilter,
      dateRestrict,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[rag/search] Error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

router.post("/rag/generate", async (req, res) => {
  try {
    const { prompt, category } = req.body as {
      prompt: string;
      category?: string;
    };

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await generateWithRAG(prompt, category || "concept");

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[rag/generate] Error:", error.message);
    res.status(500).json({ error: "Generation failed" });
  }
});

router.post("/rag/cache/clear", (req, res) => {
  clearSearchCache();
  res.json({
    success: true,
    message: "Search cache cleared",
  });
});

export default router;
