import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export interface UserWithCredits extends User {
  credits: number;
  apiKey: string;
}

export interface CreditUsage {
  userId: string;
  operation: 'bt_execute' | 'onnx_predict' | 'narrative_generate' | 'worldstate_save';
  cost: number;
  timestamp: string;
}

export interface BTNode {
  id: string;
  type: 'sequence' | 'selector' | 'action' | 'condition' | 'decorator';
  label: string;
  children?: string[];
}

export interface BTExecution {
  id: string;
  userId?: string;
  btString: string;
  context: Record<string, any>;
  timestamp: string;
  tickOutput: {
    status: 'success' | 'failure' | 'running';
    executedNodes: string[];
    logs: string[];
  };
}

export interface OnnxModel {
  id: string;
  name: string;
  inputShape: number[];
  outputShape: number[];
  uploadedAt: string;
}

export interface OnnxPrediction {
  id: string;
  modelId: string;
  inputs: number[];
  prediction: number | number[];
  timestamp: string;
}

export interface NarrativePrompt {
  key: 'metro' | 'riftwar' | 'training';
  template: string;
  variables: string[];
}

export interface NarrativeGeneration {
  id: string;
  userId?: string;
  promptKey: string;
  variables: Record<string, string>;
  generatedText: string;
  timestamp: string;
  usedOllama: boolean;
}

export interface WorldState {
  [key: string]: any;
}

export const btExecutionSchema = z.object({
  bt_string: z.string().min(1, "BT string is required"),
  context: z.record(z.any()).optional().default({}),
});

export const onnxPredictionSchema = z.object({
  inputs: z.array(z.number()).min(1, "At least one input value required"),
});

export const narrativeGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt key is required"),
  vars: z.record(z.string()),
});

export const worldStateSchema = z.record(z.any());

export type BTExecutionInput = z.infer<typeof btExecutionSchema>;
export type OnnxPredictionInput = z.infer<typeof onnxPredictionSchema>;
export type NarrativeGenerationInput = z.infer<typeof narrativeGenerationSchema>;
export type WorldStateInput = z.infer<typeof worldStateSchema>;

export const NARRATIVE_TEMPLATES: Record<string, NarrativePrompt> = {
  metro: {
    key: 'metro',
    template: 'In the dark tunnels of the {location} metro station, {character} encounters {obstacle}. The air is thick with {atmosphere}.',
    variables: ['location', 'character', 'obstacle', 'atmosphere'],
  },
  riftwar: {
    key: 'riftwar',
    template: 'As the rift opens above {location}, {hero} must {action} before {threat} consumes everything. The {element} magic surges.',
    variables: ['location', 'hero', 'action', 'threat', 'element'],
  },
  training: {
    key: 'training',
    template: 'During combat training, {instructor} teaches {student} to {technique}. The {environment} tests their {skill}.',
    variables: ['instructor', 'student', 'technique', 'environment', 'skill'],
  },
};
