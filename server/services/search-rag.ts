import { google } from "googleapis";

const customsearch = google.customsearch("v1");

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

interface RAGContext {
  context: string;
  sources: SearchResult[];
  cached: boolean;
  timestamp: number;
}

const searchCache = new Map<string, RAGContext>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function searchForContext(
  query: string,
  options: {
    numResults?: number;
    siteFilter?: string;
    dateRestrict?: string;
  } = {}
): Promise<RAGContext> {
  const { numResults = 5, siteFilter, dateRestrict } = options;
  
  const cacheKey = `${query}|${numResults}|${siteFilter || ""}|${dateRestrict || ""}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[search-rag] Cache hit for: "${query.slice(0, 40)}..."`);
    return { ...cached, cached: true };
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    console.log("[search-rag] Google Search API not configured, skipping RAG augmentation");
    return {
      context: "",
      sources: [],
      cached: false,
      timestamp: Date.now(),
    };
  }

  try {
    const searchParams: any = {
      auth: apiKey,
      cx,
      q: query,
      num: Math.min(numResults, 10),
    };

    if (siteFilter) {
      searchParams.siteSearch = siteFilter;
    }

    if (dateRestrict) {
      searchParams.dateRestrict = dateRestrict;
    }

    const res = await customsearch.cse.list(searchParams);
    
    const items = res.data.items || [];
    const sources: SearchResult[] = items.map((item: any) => ({
      title: item.title || "",
      snippet: item.snippet || "",
      link: item.link || "",
    }));

    const context = sources
      .map((s) => `${s.title}: ${s.snippet}`)
      .join("\n\n");

    const result: RAGContext = {
      context,
      sources,
      cached: false,
      timestamp: Date.now(),
    };

    searchCache.set(cacheKey, result);
    
    console.log(`[search-rag] Fetched ${sources.length} results for: "${query.slice(0, 40)}..."`);
    
    return result;
  } catch (error: any) {
    console.error("[search-rag] Google Search error:", error.message);
    return {
      context: "",
      sources: [],
      cached: false,
      timestamp: Date.now(),
    };
  }
}

export async function augmentPromptWithSearch(
  prompt: string,
  category?: string
): Promise<{ augmentedPrompt: string; sources: SearchResult[] }> {
  const categoryHints: Record<string, string> = {
    vehicle: "futuristic vehicle design trends game assets",
    weapon: "sci-fi weapon design game asset concepts",
    creature: "creature design monster concepts game art",
    concept: "game environment concept art architecture design",
    model: "3D game asset design modular props",
    npc: "character design NPC game development",
    fauna: "wildlife creature ecosystem game world",
  };

  const searchQuery = category
    ? `${prompt} ${categoryHints[category] || ""} 2024 2025`
    : `${prompt} game design concept art trends 2024`;

  const ragContext = await searchForContext(searchQuery, {
    numResults: 5,
    dateRestrict: "y1", // Last year
  });

  if (!ragContext.context) {
    return { augmentedPrompt: prompt, sources: [] };
  }

  const augmentedPrompt = `## Current Web Knowledge (${new Date().toISOString().split("T")[0]}):
${ragContext.context}

## User Request:
${prompt}

Based on the current trends and information above, generate detailed game-ready content:`;

  return {
    augmentedPrompt,
    sources: ragContext.sources,
  };
}

export function clearSearchCache(): void {
  searchCache.clear();
  console.log("[search-rag] Cache cleared");
}

export function getSearchCacheStats(): { size: number; keys: string[] } {
  return {
    size: searchCache.size,
    keys: Array.from(searchCache.keys()).map(k => k.slice(0, 50) + "..."),
  };
}
