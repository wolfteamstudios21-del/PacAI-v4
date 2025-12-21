import { z } from "zod";
import { ConflictTypeSchema, FactionArchetypeSchema } from "./conflict-config";

export const FactionMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  allegiance: z.enum(["allied", "enemy", "neutral", "insurgent"]),
  archetype: FactionArchetypeSchema,
  behavior_profile: z.object({
    aggression: z.number().min(0).max(100),
    diplomacy: z.number().min(0).max(100),
    deception: z.number().min(0).max(100),
    resilience: z.number().min(0).max(100),
    resource_focus: z.string(),
  }),
  influence: z.number().min(0).max(100),
  resources: z.record(z.number()),
  tags: z.array(z.string()),
});
export type FactionMetadata = z.infer<typeof FactionMetadataSchema>;

export const ResourceStateSchema = z.record(
  z.object({
    player: z.number().min(0).max(100),
    enemy: z.number().min(0).max(100),
    delta: z.number().optional(),
  })
);
export type ResourceState = z.infer<typeof ResourceStateSchema>;

export const OutcomeSummarySchema = z.object({
  status: z.enum([
    "decisive_victory",
    "pyrrhic_victory", 
    "stalemate",
    "tactical_retreat",
    "defeat",
    "catastrophic_defeat",
    "ongoing",
    "uncertain"
  ]),
  dominance: z.object({
    player: z.number().min(0).max(100),
    enemy: z.number().min(0).max(100),
    contested: z.number().min(0).max(100),
  }),
  key_impacts: z.array(z.string()),
  narrative_tags: z.array(z.string()),
  universe_tone: z.enum([
    "hopeful",
    "grim",
    "grim_optimism", 
    "desperate",
    "triumphant",
    "uncertain",
    "apocalyptic",
    "mysterious"
  ]),
});
export type OutcomeSummary = z.infer<typeof OutcomeSummarySchema>;

export const ConflictMetadataSchema = z.object({
  conflict_type: ConflictTypeSchema,
  campaign_id: z.string(),
  duration_days: z.number(),
  phase: z.enum([
    "initialized",
    "evaluated", 
    "active",
    "counteroffensive",
    "resolved",
    "intel_gathered",
    "psyops_active",
    "continuity_calculated",
    "complete"
  ]),
  seed: z.string().optional(),
  engine_version: z.string(),
  generated_at: z.string(),
  terminology_set: z.string(),
});
export type ConflictMetadata = z.infer<typeof ConflictMetadataSchema>;

export const CanonicalEventSchema = z.object({
  id: z.string(),
  day: z.number(),
  type: z.string(),
  description: z.string(),
  impact: z.object({
    resources_affected: z.array(z.string()),
    magnitude: z.enum(["minor", "moderate", "major", "catastrophic"]),
    faction_affected: z.string().optional(),
  }),
  narrative_weight: z.number().min(0).max(100),
  tags: z.array(z.string()),
});
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;

export const CanonicalOperationSchema = z.object({
  id: z.string(),
  day: z.number(),
  type: z.enum(["propaganda", "psyops", "disinformation", "morale_boost", "intimidation", "recruitment"]),
  source_faction: z.string(),
  target: z.enum(["player_forces", "enemy_forces", "civilians", "neutral_parties", "all"]),
  content: z.string(),
  effectiveness: z.number().min(0).max(100),
  counter_possible: z.boolean(),
});
export type CanonicalOperation = z.infer<typeof CanonicalOperationSchema>;

export const CanonicalResponseSchema = z.object({
  metadata: ConflictMetadataSchema,
  factions: z.array(FactionMetadataSchema),
  resources: ResourceStateSchema,
  outcome_summary: OutcomeSummarySchema.optional(),
  timeline: z.array(CanonicalEventSchema),
  operations: z.array(CanonicalOperationSchema),
  story_hooks: z.array(z.string()),
  raw_simulation: z.any().optional(),
});
export type CanonicalResponse = z.infer<typeof CanonicalResponseSchema>;

export function createMetadataEnvelope(
  conflictType: string,
  campaignId: string,
  durationDays: number,
  phase: string,
  seed?: string
): ConflictMetadata {
  return {
    conflict_type: conflictType as any,
    campaign_id: campaignId,
    duration_days: durationDays,
    phase: phase as any,
    seed,
    engine_version: "6.4.1",
    generated_at: new Date().toISOString(),
    terminology_set: conflictType,
  };
}

export function buildCanonicalResponse(
  metadata: ConflictMetadata,
  factions: FactionMetadata[],
  resources: ResourceState,
  timeline: CanonicalEvent[],
  operations: CanonicalOperation[],
  storyHooks: string[],
  outcomeSummary?: OutcomeSummary,
  rawSimulation?: any
): CanonicalResponse {
  return {
    metadata,
    factions,
    resources,
    outcome_summary: outcomeSummary,
    timeline,
    operations,
    story_hooks: storyHooks,
    raw_simulation: rawSimulation,
  };
}
