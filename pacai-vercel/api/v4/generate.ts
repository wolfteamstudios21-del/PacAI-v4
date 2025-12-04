export const config = { runtime: "edge" };

import crypto from "crypto";

export default async function handler(req) {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { prompt, seed } = body;
  if (!prompt || seed === undefined) return new Response(JSON.stringify({ error: "prompt and seed required" }), { status: 400 });

  // Simple deterministic checksum for demo
  const zoneHash = crypto.createHash("sha256").update(`${prompt}_${seed}`).digest("hex");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // send chunk 0
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        chunk: 0,
        message: "starting generation",
        partial: { summary: "terrain", entities: 200 }
      })}\n\n`));
      // simulated chunks
      let chunk = 1;
      const timer = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          chunk,
          message: `stream chunk ${chunk}`,
          partial: { entities: 200 }
        })}\n\n`));
        chunk++;
        if (chunk > 4) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            finished: true,
            zone_id: `zone_${zoneHash.slice(0,8)}`,
            checksum: zoneHash
          })}\n\n`));
          clearInterval(timer);
          controller.close();
        }
      }, 300);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
