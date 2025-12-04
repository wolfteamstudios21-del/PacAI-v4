export const config = { runtime: "edge" };

export default async function handler(req) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const events = [
        { timestamp: new Date().toISOString(), event_id: `evt_${Math.random().toString(36).slice(2,10)}`, event_type: "license_check_pass", actor: "system", path: "/v4/status" },
        { timestamp: new Date(Date.now()-60000).toISOString(), event_id: `evt_${Math.random().toString(36).slice(2,10)}`, event_type: "export_signed", actor: "admin", path: "/v4/export" },
        { timestamp: new Date(Date.now()-120000).toISOString(), event_id: `evt_${Math.random().toString(36).slice(2,10)}`, event_type: "override_applied", actor: "operator", path: "/v4/projects/proj_001/override" }
      ];
      events.forEach(e => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)));
      // keep the stream alive for a bit (demo)
      const t = setTimeout(() => { controller.close(); }, 3000);
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control":"no-cache" }});
}
