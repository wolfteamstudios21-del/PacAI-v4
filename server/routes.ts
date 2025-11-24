import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { storage } from "./storage";
import { queueMiddleware } from "./middleware/request-queue";
import { authenticateApiKey, generateToken, type AuthRequest } from "./middleware/auth";
import { requireCredits, deductCredits } from "./middleware/credits";
import { rateLimiter } from "./middleware/rate-limiter";
import { executeBehaviorTree } from "./services/bt-executor";
import { predictWithOnnx } from "./services/onnx-predictor";
import { generateNarrative } from "./services/llm-service";
import {
  btExecutionSchema,
  onnxPredictionSchema,
  narrativeGenerationSchema,
  worldStateSchema,
  NARRATIVE_TEMPLATES,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(queueMiddleware);
  app.use(rateLimiter(100, 60));

  // v2: Auth endpoints
  app.post("/api/auth/login", async (req: AuthRequest, res) => {
    try {
      const { api_key } = req.body;
      if (!api_key) {
        return res.status(400).json({ error: "api_key is required" });
      }

      // Validate API key
      let userId: string = "";
      if (api_key === "sk_demo_1234567890abcdef") userId = "user-001";
      else if (api_key === "sk_admin_master_key_2025") userId = "admin";
      else {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const user = await storage.getUserWithCredits(userId);

      if (!user) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const token = generateToken(user.id);
      return res.json({ token, userId: user.id, credits: user.credits });
    } catch (error) {
      return res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.get("/api/usage", authenticateApiKey, async (req: AuthRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const user = await storage.getUserWithCredits(req.userId);
      const usage = await storage.getUserUsage(req.userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({
        userId: user.id,
        creditsRemaining: user.credits,
        creditsUsed: usage.reduce((sum, u) => sum + u.cost, 0),
        operationsCount: usage.length,
        recentOperations: usage.slice(-10),
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  app.post("/api/bt/run", authenticateApiKey, requireCredits("bt_execute"), async (req: AuthRequest, res) => {
    try {
      const validatedData = btExecutionSchema.parse(req.body);

      const result = executeBehaviorTree(
        validatedData.bt_string,
        validatedData.context
      );

      await storage.saveBTExecution({
        userId: req.userId,
        btString: validatedData.bt_string,
        context: validatedData.context,
        tickOutput: result,
      });

      if (req.userId && req.creditsCharged) {
        await storage.deductCredits(req.userId, req.creditsCharged);
      }

      res.json({ tick_output: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Execution failed" });
      }
    }
  });

  app.post("/api/onnx/predict", authenticateApiKey, requireCredits("onnx_predict"), async (req: AuthRequest, res) => {
    try {
      const validatedData = onnxPredictionSchema.parse(req.body);

      const prediction = predictWithOnnx(validatedData.inputs);

      if (req.userId && req.creditsCharged) {
        await storage.deductCredits(req.userId, req.creditsCharged);
      }

      res.json({ prediction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Prediction failed" });
      }
    }
  });

  app.post("/api/narrative/generate", authenticateApiKey, requireCredits("narrative_generate"), async (req: AuthRequest, res) => {
    try {
      const validatedData = narrativeGenerationSchema.parse(req.body);

      const template = NARRATIVE_TEMPLATES[validatedData.prompt];
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const result = await generateNarrative(template.template, validatedData.vars);

      await storage.saveNarrativeGeneration({
        userId: req.userId,
        promptKey: validatedData.prompt,
        variables: validatedData.vars,
        generatedText: result.text,
        usedOllama: result.usedOllama,
      });

      if (req.userId && req.creditsCharged) {
        await storage.deductCredits(req.userId, req.creditsCharged);
      }

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Generation failed" });
      }
    }
  });

  app.get("/api/worldstate", async (req, res) => {
    try {
      const state = await storage.getWorldState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch world state" });
    }
  });

  app.post("/api/worldstate", authenticateApiKey, requireCredits("worldstate_save"), async (req: AuthRequest, res) => {
    try {
      const validatedData = worldStateSchema.parse(req.body);
      await storage.saveWorldState(validatedData);

      if (req.userId && req.creditsCharged) {
        await storage.deductCredits(req.userId, req.creditsCharged);
      }

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save world state" });
      }
    }
  });

  app.post("/api/worldstate/push", authenticateApiKey, requireCredits("worldstate_push"), async (req: AuthRequest, res) => {
    try {
      const validatedData = worldStateSchema.parse(req.body);

      if (req.userId && req.creditsCharged) {
        await storage.deductCredits(req.userId, req.creditsCharged);
      }

      res.json({
        success: true,
        message: "State would be pushed to Godot instance",
        state: validatedData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to push to Godot" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
