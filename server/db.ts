// In-memory project and audit store
interface WarSimConfig {
  planetType: string;
  planetName: string;
  loreTags: string[];
  threatLevel: number;
  runCounteroffensive: boolean;
  resolveWar: boolean;
}

interface WarSimResult {
  phase: string;
  planetState?: any;
  evaluation?: any;
  counteroffensive?: any;
  resolution?: any;
  timestamp: number;
}

interface Project {
  id: string;
  created_at: number;
  type: string;
  seed: number;
  state: any;
  history: any[];
  checksum: string;
  warSimConfig?: WarSimConfig;
  warSimResults?: WarSimResult[];
}

interface AuditEntry {
  seq: number;
  hash: string;
  type: string;
  ts: number;
  prev?: string;
  [key: string]: any;
}

const projects: Record<string, Project> = {};
const auditLog: AuditEntry[] = [];
let auditSeq = 0;
let lastHash = "0".repeat(64);

export async function getProject(id: string) {
  return projects[id] || null;
}

export async function saveProject(project: Project) {
  projects[project.id] = project;
}

export async function listProjects() {
  return Object.values(projects).sort((a, b) => b.created_at - a.created_at);
}

export async function getAuditLog() {
  return auditLog;
}

export async function addAudit(event: any) {
  const crypto = await import("crypto");
  const payload = JSON.stringify({ ...event, prev: lastHash });
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  const entry: AuditEntry = {
    seq: auditSeq++,
    hash,
    ts: Date.now(),
    ...event
  };
  auditLog.push(entry);
  lastHash = hash;
  return entry;
}
