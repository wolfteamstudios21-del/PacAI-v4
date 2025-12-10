import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User tiers for PacAI licensing
export type UserTier = "free" | "creator" | "pro" | "lifetime" | "enterprise";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("free"), // free, creator, pro, lifetime, enterprise
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  license_expires_at: timestamp("license_expires_at"),
  is_verified: integer("is_verified").notNull().default(0),
});

// Reference images for generation
export const refs = pgTable("refs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  url: text("url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  type: text("type").notNull().default("upload"), // upload, link, gallery, other-ai
  source: text("source"), // midjourney, dalle, stable-diffusion, etc.
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertRefSchema = createInsertSchema(refs).omit({
  id: true,
  created_at: true,
});

export type InsertRef = z.infer<typeof insertRefSchema>;
export type Ref = typeof refs.$inferSelect;

// Live override sessions for WebSocket bridge
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  owner_id: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  project_id: varchar("project_id"),
  status: text("status").notNull().default("active"), // active, paused, closed
  connected_clients: integer("connected_clients").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  connected_clients: true,
  created_at: true,
  updated_at: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Queued overrides for offline sync
export const overrides = pgTable("overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: varchar("session_id").notNull(),
  user_id: varchar("user_id").notNull(),
  entity_id: varchar("entity_id"),
  key: text("key").notNull(),
  value: jsonb("value").$type<any>().notNull(),
  applied: integer("applied").notNull().default(0), // 0 = pending, 1 = applied
  created_at: timestamp("created_at").defaultNow(),
});

export const insertOverrideSchema = createInsertSchema(overrides).omit({
  id: true,
  applied: true,
  created_at: true,
});

export type InsertOverride = z.infer<typeof insertOverrideSchema>;
export type Override = typeof overrides.$inferSelect;

// WebSocket event types
export interface OverridePayload {
  entityId?: string;
  key: string;
  value: any;
}

export interface SessionEvent {
  type: "join-session" | "leave-session" | "override-push" | "override-ack" | "client-count";
  sessionId: string;
  payload?: OverridePayload;
  clientCount?: number;
}

// Artist reference uploads with royalty tracking
export const artistRefs = pgTable("artist_refs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  artist_name: text("artist_name").notNull(),
  image_url: text("image_url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  title: text("title").notNull(),
  description: text("description"),
  royalty_percent: integer("royalty_percent").notNull().default(30),
  license: text("license").notNull().default("commercial"), // cc-by, cc-by-nc, commercial, pacai-exclusive
  total_earned: integer("total_earned").notNull().default(0), // in cents
  usage_count: integer("usage_count").notNull().default(0),
  is_featured: integer("is_featured").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertArtistRefSchema = createInsertSchema(artistRefs).omit({
  id: true,
  total_earned: true,
  usage_count: true,
  is_featured: true,
  created_at: true,
});

export type InsertArtistRef = z.infer<typeof insertArtistRefSchema>;
export type ArtistRef = typeof artistRefs.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tier pricing configuration
export const TIER_CONFIG = {
  free: { name: "Free", price: 0, generations: 5, refs: 1, voices: 1, animations: 1 },
  creator: { name: "Creator", price: 999, generations: 50, refs: 5, voices: 5, animations: 5 },
  pro: { name: "Pro", price: 2999, generations: 200, refs: 20, voices: 10, animations: 10 },
  lifetime: { name: "Lifetime", price: 29999, generations: -1, refs: -1, voices: -1, animations: -1 },
  enterprise: { name: "Enterprise", price: 99999, generations: -1, refs: -1, voices: -1, animations: -1 },
} as const;

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
