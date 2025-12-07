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

import authRoutes from "./auth";
import v4Routes from "./routes/v4";
import refsRoutes from "./refs";
import sessionsRoutes from "./sessions";
import { v3Proxy } from "./middleware/v3-proxy";
import { initWebSocket } from "./websocket";

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
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
