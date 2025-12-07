import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import runApp from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function serveStatic(app: express.Express) {
  // === MIDDLEWARE ===
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // === STATIC SERVING (FRONTEND FIRST) ===
  const clientDist = path.join(__dirname, "../dist/public");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    console.log(`✓ Serving frontend from ${clientDist}`);
  } else {
    console.warn(`⚠ frontend not found at ${clientDist}`);
  }

  // === API ROUTES (BACKEND SECOND) ===
  // These are imported in app.ts, routes are already registered
  
  // === CATCH-ALL (FRONTEND ROUTES) ===
  app.get("*", (req, res) => {
    const clientIndex = path.join(__dirname, "../dist/public/index.html");
    if (fs.existsSync(clientIndex)) {
      res.sendFile(clientIndex);
    } else {
      res.status(500).send("Build failed — dist/public/index.html not found. Run 'npm run build' first.");
    }
  });
}

(async () => {
  try {
    // Validate required environment variables
    const requiredEnvs = ['DATABASE_URL'];
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingEnvs.join(', ')}`);
      console.error('Set these in Deployment Configuration → Environment Variables');
      process.exit(1);
    }

    console.log('✓ Environment validation passed');
    console.log(`✓ Node ENV: ${process.env.NODE_ENV}`);
    console.log(`✓ Port: ${process.env.PORT || '8080'}`);
    
    await runApp(serveStatic);
  } catch (error) {
    console.error('❌ Failed to start production server:');
    console.error(error);
    process.exit(1);
  }
})();
