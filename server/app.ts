import { type Server } from "node:http";
import { createServer } from "node:http";
import path from "path";
import { fileURLToPath } from "url";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import cors from "cors";
import authRoutes from "./auth";
import v4Routes from "./routes/v4";
import refsRoutes from "./refs";
import sessionsRoutes from "./sessions";
import mobileRoutes from "./v5-mobile";
import linksRoutes from "./v5-links";
import galleryRoutes from "./gallery";
import voiceRoutes from "./routes/voice";
import animateRoutes from "./routes/animate";
import styleRoutes from "./routes/style";
import artistRoutes from "./routes/artist";
import billingRoutes from "./routes/billing";
import connectRoutes from "./routes/connect";
import v6Routes from "./routes/v6";
import galleryAutofillRoutes from "./routes/gallery-autofill";
import galleryIngestRoutes from "./routes/gallery-ingest";
import galleryForkRoutes from "./routes/gallery-fork";
import chargeStatsRoutes from "./routes/charge-stats";
import { v3Proxy } from "./middleware/v3-proxy";
import { initWebSocket } from "./websocket";
import { tierMiddleware } from "./middleware/tiers";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// CORS configuration for Vercel frontend
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.VERCEL_URL || 'https://pacaiwolfstudio.com'
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Production security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ===== API ROUTES FIRST (highest priority) =====
// Auth routes
app.use(authRoutes);

// v4 Routes (includes /v5/health, /v5/projects)
app.use(v4Routes);

// Refs routes (image references for generation)
app.use(refsRoutes);

// Sessions routes (live override WebSocket bridge)
app.use(sessionsRoutes);

// v5.3: Mobile exports (ZIP downloads)
app.use(mobileRoutes);

// v5.3: Direct shareable links with QR codes
app.use(linksRoutes);

// v5.4: Gallery with community remix + offline cache
app.use(galleryRoutes);

// v5.5: Apply tier middleware for new modules
app.use(tierMiddleware);

// v5.5: Voice Synthesis Module
app.use(voiceRoutes);

// v5.5: Animation/Rigging Module
app.use(animateRoutes);

// v5.5: Texture/Style Module
app.use(styleRoutes);

// v5.6: Artist Portal with royalty tracking
app.use(artistRoutes);

// v5.7: Billing and tier upgrades
app.use(billingRoutes);

// v5.7: Stripe Connect marketplace for creators
app.use("/api/connect", connectRoutes);

// v6.0: AI Core Upgrades - Reasoning engine, NPC/Fauna/Simulation generation
app.use("/v6", v6Routes);

// v6.1: Gallery auto-fill for vehicles, weapons, creatures
app.use("/v6", galleryAutofillRoutes);
app.use("/v6", galleryIngestRoutes);
app.use("/v6", galleryForkRoutes);
app.use("/v6", chargeStatsRoutes);

// Serve uploads directory for ref images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// v3 Gateway proxy (before static so /v3/* are intercepted)
app.use(v3Proxy);

// ===== INDIVIDUAL ROUTES (before static serving) =====
// Login route
app.get('/login', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard route
app.get('/dashboard', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ===== STATIC SERVING (after API routes) =====
// Serve static files (login.html, dashboard.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Production only: Serve React build from dist/public
// In development, Vite middleware handles this via index-dev.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/public')));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Routes already registered at module level (before static serving)
  
  // Create HTTP server
  const server = createServer(app);
  
  // Initialize WebSocket server for live overrides
  initWebSocket(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Production (Fly.io): $PORT defaults to 8080
  // Development (Replit): defaults to 5000
  // This serves both the API and the client.
  const defaultPort = process.env.NODE_ENV === 'production' ? '8080' : '5000';
  const port = parseInt(process.env.PORT || defaultPort, 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
