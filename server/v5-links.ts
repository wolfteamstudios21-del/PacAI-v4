import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { getProject } from "./db";

const router = Router();

interface LinkRecord {
  id: string;
  project_id: string;
  token: string;
  short_url: string;
  created_by: string;
  expires_at: number;
  access_count: number;
  created_at: number;
}

const linksStore = new Map<string, LinkRecord>();
const shortToToken = new Map<string, string>();

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "pacai-dev-secret";
const BASE_URL = process.env.BASE_URL || "https://pacaiwolfstudio.com";

function generateShortId(token: string): string {
  const base64 = Buffer.from(token).toString("base64url");
  return base64.slice(0, 8);
}

router.post("/v5/projects/:id/link", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username = "anonymous", expiresInDays = 7, readOnly = true } = req.body;

  const project = await getProject(id);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * expiresInDays);
  
  const token = jwt.sign({
    projectId: id,
    userId: username,
    readOnly,
    exp: expiresAt
  }, JWT_SECRET);

  const shortId = generateShortId(token);
  const shortLink = `${BASE_URL}/p/${shortId}`;

  const linkRecord: LinkRecord = {
    id: crypto.randomUUID(),
    project_id: id,
    token,
    short_url: shortLink,
    created_by: username,
    expires_at: expiresAt * 1000,
    access_count: 0,
    created_at: Date.now()
  };

  linksStore.set(linkRecord.id, linkRecord);
  shortToToken.set(shortId, token);

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(shortLink, {
      width: 256,
      margin: 2,
      color: { dark: "#3e73ff", light: "#0b0d0f" }
    });
  } catch (err) {
    console.error("QR generation failed:", err);
  }

  res.json({
    link: shortLink,
    shortId,
    token,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    expiresInDays,
    readOnly,
    qr: qrDataUrl
  });
});

router.get("/v5/projects/:id/links", async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await getProject(id);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const links = Array.from(linksStore.values())
    .filter(link => link.project_id === id)
    .map(link => ({
      id: link.id,
      short_url: link.short_url,
      created_by: link.created_by,
      expires_at: new Date(link.expires_at).toISOString(),
      access_count: link.access_count,
      expired: link.expires_at < Date.now()
    }));

  res.json({ links });
});

router.get("/p/:shortId", async (req: Request, res: Response) => {
  const { shortId } = req.params;
  
  const token = shortToToken.get(shortId);
  if (!token) {
    return res.status(404).json({ error: "Link not found or expired" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      projectId: string;
      userId: string;
      readOnly: boolean;
      exp: number;
    };

    const project = await getProject(decoded.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const linkRecord = Array.from(linksStore.values()).find(l => l.short_url.includes(shortId));
    if (linkRecord) {
      linkRecord.access_count++;
    }

    res.json({
      project: {
        id: project.id,
        type: project.type,
        seed: project.seed,
        state: project.state,
        created_at: project.created_at
      },
      access: {
        readOnly: decoded.readOnly,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        accessCount: linkRecord?.access_count || 1
      }
    });

  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      shortToToken.delete(shortId);
      return res.status(410).json({ error: "Link has expired" });
    }
    return res.status(401).json({ error: "Invalid link" });
  }
});

router.delete("/v5/links/:linkId", async (req: Request, res: Response) => {
  const { linkId } = req.params;
  
  const link = linksStore.get(linkId);
  if (!link) {
    return res.status(404).json({ error: "Link not found" });
  }

  const shortId = link.short_url.split("/").pop() || "";
  shortToToken.delete(shortId);
  linksStore.delete(linkId);

  res.json({ success: true, deleted: linkId });
});

router.post("/v5/links/:shortId/qr", async (req: Request, res: Response) => {
  const { shortId } = req.params;
  const { size = 256, format = "dataurl" } = req.body;

  const token = shortToToken.get(shortId);
  if (!token) {
    return res.status(404).json({ error: "Link not found" });
  }

  const link = `${BASE_URL}/p/${shortId}`;

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(link, { type: "svg", width: size });
      res.type("image/svg+xml").send(svg);
    } else if (format === "png") {
      const buffer = await QRCode.toBuffer(link, { width: size });
      res.type("image/png").send(buffer);
    } else {
      const dataUrl = await QRCode.toDataURL(link, {
        width: size,
        margin: 2,
        color: { dark: "#3e73ff", light: "#0b0d0f" }
      });
      res.json({ qr: dataUrl, link, shortId });
    }
  } catch (err) {
    res.status(500).json({ error: "QR generation failed" });
  }
});

export default router;
