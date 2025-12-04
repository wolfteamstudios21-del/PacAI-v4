import { listProjectsForDemo } from "../../lib/kv";

export default async function handler(req, res) {
  const projects = await listProjectsForDemo();
  res.json({ projects, total: projects.length });
}
