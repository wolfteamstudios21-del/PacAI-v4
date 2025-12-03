import path from "node:path";
import { fileURLToPath } from "url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { authRouter } from "./auth.js";
import v4Router from "./routes/v4.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// === PRODUCTION SECURITY HARDENING ===
app.set('trust proxy', 1);
app.use(helmet({ hstsMaxAge: 31536000, contentSecurityPolicy: true }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "https://pac-ai-v4.vercel.app" }));
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// === STATIC FRONTEND ===
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/v4")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// === API ROUTES ===
app.use("/api", authRouter);
app.use("/v4", v4Router);

// === HEALTH + COLD START OPTIMIZED ===
app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

// === 404 + ERROR HANDLER ===
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
