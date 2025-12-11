import OpenAI from "openai";
import { augmentPromptWithSearch, type SearchResult } from "./search-rag";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let ragEnabled = true;

export function setRAGEnabled(enabled: boolean): void {
  ragEnabled = enabled;
  console.log(`[llm-service] RAG ${enabled ? "enabled" : "disabled"}`);
}

export function isRAGEnabled(): boolean {
  return ragEnabled;
}

export interface GenerationResult {
  text: string;
  usedOllama: boolean;
  usedRAG: boolean;
  sources?: SearchResult[];
}

export async function generateNarrative(
  prompt: string,
  variables: Record<string, string>,
  options: { category?: string; useRAG?: boolean } = {}
): Promise<GenerationResult> {
  let template = prompt;
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });

  const shouldUseRAG = options.useRAG ?? ragEnabled;
  let finalPrompt = template;
  let sources: SearchResult[] = [];

  if (shouldUseRAG) {
    try {
      const ragResult = await augmentPromptWithSearch(template, options.category);
      if (ragResult.sources.length > 0) {
        finalPrompt = ragResult.augmentedPrompt;
        sources = ragResult.sources;
        console.log(`[llm-service] RAG injected ${sources.length} sources`);
      }
    } catch (error: any) {
      console.error("[llm-service] RAG augmentation failed:", error.message);
    }
  }

  try {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
    const response = await fetch(`${ollamaEndpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: `Continue this narrative in an engaging way (max 200 words): ${finalPrompt}`,
        stream: false,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        text: data.response || template,
        usedOllama: true,
        usedRAG: sources.length > 0,
        sources,
      };
    }
  } catch (error) {
    console.log("Ollama unavailable, falling back to OpenAI");
  }

  try {
    const systemPrompt = sources.length > 0
      ? "You are a creative game content generator. Use the provided web knowledge to enhance your response with current trends and real-world inspiration. Generate engaging, detailed game-ready content in 150-200 words."
      : "You are a creative narrative writer. Continue the given narrative scenario in an engaging and immersive way. Keep it to 150-200 words.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt },
      ],
      max_tokens: 500,
    });

    return {
      text: completion.choices[0].message.content || template,
      usedOllama: false,
      usedRAG: sources.length > 0,
      sources,
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      text: `${template}\n\n[LLM generation failed. Showing template only.]`,
      usedOllama: false,
      usedRAG: false,
    };
  }
}

export async function generateWithRAG(
  prompt: string,
  category: string
): Promise<GenerationResult> {
  return generateNarrative(prompt, {}, { category, useRAG: true });
}
