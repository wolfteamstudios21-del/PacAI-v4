import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateNarrative(
  prompt: string,
  variables: Record<string, string>
): Promise<{ text: string; usedOllama: boolean }> {
  let template = prompt;
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });

  try {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
    const response = await fetch(`${ollamaEndpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: `Continue this narrative in an engaging way (max 200 words): ${template}`,
        stream: false,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        text: data.response || template,
        usedOllama: true,
      };
    }
  } catch (error) {
    console.log("Ollama unavailable, falling back to OpenAI");
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a creative narrative writer. Continue the given narrative scenario in an engaging and immersive way. Keep it to 150-200 words.",
        },
        {
          role: "user",
          content: template,
        },
      ],
      max_completion_tokens: 300,
    });

    return {
      text: completion.choices[0].message.content || template,
      usedOllama: false,
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      text: `${template}\n\n[LLM generation failed. Showing template only.]`,
      usedOllama: false,
    };
  }
}
