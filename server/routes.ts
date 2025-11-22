import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { storage } from "./storage";
import { queueMiddleware } from "./middleware/request-queue";
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

  app.post("/api/bt/run", async (req, res) => {
    try {
      const validatedData = btExecutionSchema.parse(req.body);

      const result = executeBehaviorTree(
        validatedData.bt_string,
        validatedData.context
      );

      await storage.saveBTExecution({
        btString: validatedData.bt_string,
        context: validatedData.context,
        tickOutput: result,
      });

      res.json({ tick_output: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Execution failed" });
      }
    }
  });

  app.post("/api/onnx/predict", async (req, res) => {
    try {
      const validatedData = onnxPredictionSchema.parse(req.body);

      const prediction = predictWithOnnx(validatedData.inputs);

      res.json({ prediction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Prediction failed" });
      }
    }
  });

  app.post("/api/narrative/generate", async (req, res) => {
    try {
      const validatedData = narrativeGenerationSchema.parse(req.body);

      const template = NARRATIVE_TEMPLATES[validatedData.prompt];
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const result = await generateNarrative(template.template, validatedData.vars);

      await storage.saveNarrativeGeneration({
        promptKey: validatedData.prompt,
        variables: validatedData.vars,
        generatedText: result.text,
        usedOllama: result.usedOllama,
      });

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

  app.post("/api/worldstate", async (req, res) => {
    try {
      const validatedData = worldStateSchema.parse(req.body);
      await storage.saveWorldState(validatedData);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save world state" });
      }
    }
  });

  app.post("/api/worldstate/push", async (req, res) => {
    try {
      const validatedData = worldStateSchema.parse(req.body);
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
