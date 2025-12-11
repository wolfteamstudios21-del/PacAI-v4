import { z } from "zod";
import ollama from "ollama";
import { compressOutput } from "./compression";

const LLM_MODEL = process.env.PACAI_LLM_MODEL || "llama3.1";

const ElementsSchema = z.object({
  elements: z
    .object({
      style: z.string().optional(),
      biome: z.string().optional(),
      behaviors: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
    })
    .partial(),
});

type ReasonTypes = "npc" | "fauna" | "world" | "simulation";

async function safeJSON<T>(raw: string, schema?: z.ZodSchema<T>): Promise<T | Record<string, unknown>> {
  try {
    const parsed = JSON.parse(raw);
    if (schema) {
      const result = schema.safeParse(parsed);
      return result.success ? result.data : parsed;
    }
    return parsed;
  } catch {
    return {};
  }
}

async function callLLM(prompt: string): Promise<string> {
  try {
    const response = await ollama.generate({
      model: LLM_MODEL,
      prompt,
    });
    return response.response;
  } catch (error) {
    console.error("[reasoning] Ollama error, using fallback:", error);
    return JSON.stringify({
      elements: {
        style: "procedural",
        biome: "mixed",
        behaviors: ["patrol", "idle", "react"],
        dependencies: ["terrain", "lighting"],
      },
    });
  }
}

export async function reasonThroughPrompt(prompt: string, type: ReasonTypes) {
  const interpretPrompt = `Interpret this prompt for ${type} generation: "${prompt}". Extract key elements: style, biome, behaviors, dependencies. Output JSON only.`;
  const interpretResp = await callLLM(interpretPrompt);
  const interpreted = await safeJSON(interpretResp, ElementsSchema);

  const planPrompt = `Create a concise, ordered plan to generate a ${type} using: ${JSON.stringify(interpreted)}. Include motivations or constraints. Return bullet points only.`;
  const planResp = await callLLM(planPrompt);
  const plan = planResp;

  const expandPrompt = `Expand this plan into structured JSON fields suitable for game engines. Plan: ${plan}\nReturn strictly JSON.`;
  const expandResp = await callLLM(expandPrompt);
  const expanded = await safeJSON(expandResp);

  const final = await compressOutput(expanded as Record<string, any>);
  return final;
}
