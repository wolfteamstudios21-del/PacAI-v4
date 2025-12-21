import { z } from "zod";
import { CanonicalResponse, CanonicalEvent, CanonicalOperation } from "./conflict-metadata";
import { ConflictType, getConflictConfig, translateTerm } from "./conflict-config";

export type ExportFormat = "strategy" | "rpg" | "survival" | "raw";

export interface ExportMetadata {
  target_engine: string;
  schema_version: string;
  conflict_tokens: string[];
  exported_at: string;
  source_campaign_id: string;
}

export interface ExportAdapter<T> {
  format: ExportFormat;
  targetEngines: string[];
  schemaVersion: string;
  transform(canonical: CanonicalResponse): T;
  validate(data: T): boolean;
}

export const BattleReportSchema = z.object({
  metadata: z.object({
    target_engine: z.literal("strategy"),
    schema_version: z.string(),
    conflict_tokens: z.array(z.string()),
    exported_at: z.string(),
    source_campaign_id: z.string(),
  }),
  campaign: z.object({
    id: z.string(),
    conflict_type: z.string(),
    duration_days: z.number(),
    phase: z.string(),
  }),
  forces: z.array(z.object({
    faction_id: z.string(),
    faction_name: z.string(),
    allegiance: z.string(),
    strength: z.number(),
    morale: z.number(),
    territory_control: z.number(),
    resource_levels: z.record(z.number()),
  })),
  losses: z.object({
    player_total: z.number(),
    enemy_total: z.number(),
    civilian: z.number(),
  }),
  territory_delta: z.object({
    player_gained: z.number(),
    player_lost: z.number(),
    contested: z.number(),
  }),
  morale_shift: z.object({
    player: z.number(),
    enemy: z.number(),
  }),
  events: z.array(z.object({
    day: z.number(),
    type: z.string(),
    description: z.string(),
    impact_magnitude: z.string(),
  })),
  outcome: z.object({
    status: z.string(),
    player_dominance: z.number(),
    enemy_dominance: z.number(),
    narrative_summary: z.string(),
  }),
});
export type BattleReport = z.infer<typeof BattleReportSchema>;

export const PlotTwistSchema = z.object({
  metadata: z.object({
    target_engine: z.literal("rpg"),
    schema_version: z.string(),
    conflict_tokens: z.array(z.string()),
    exported_at: z.string(),
    source_campaign_id: z.string(),
  }),
  narrative: z.object({
    campaign_id: z.string(),
    conflict_type: z.string(),
    tone: z.string(),
    current_phase: z.string(),
  }),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    faction: z.string(),
    archetype: z.string(),
    motivation: z.string(),
    threat_level: z.number(),
    disposition_to_player: z.enum(["hostile", "neutral", "friendly", "unknown"]),
  })),
  beats: z.array(z.object({
    id: z.string(),
    day: z.number(),
    title: z.string(),
    description: z.string(),
    emotional_weight: z.enum(["light", "moderate", "heavy", "climactic"]),
    player_agency: z.boolean(),
  })),
  choices: z.array(z.object({
    id: z.string(),
    prompt: z.string(),
    options: z.array(z.object({
      text: z.string(),
      consequence_preview: z.string(),
      resource_impact: z.record(z.number()),
    })),
    urgency: z.enum(["immediate", "urgent", "moderate", "background"]),
  })),
  social_capital: z.object({
    reputation: z.number(),
    trust_levels: z.record(z.number()),
    alliances_available: z.array(z.string()),
    enemies_made: z.array(z.string()),
  }),
  story_hooks: z.array(z.string()),
});
export type PlotTwist = z.infer<typeof PlotTwistSchema>;

export const CrisisEventSchema = z.object({
  metadata: z.object({
    target_engine: z.literal("survival"),
    schema_version: z.string(),
    conflict_tokens: z.array(z.string()),
    exported_at: z.string(),
    source_campaign_id: z.string(),
  }),
  crisis: z.object({
    id: z.string(),
    conflict_type: z.string(),
    severity: z.enum(["minor", "moderate", "severe", "catastrophic"]),
    duration_remaining: z.number(),
  }),
  settlements: z.array(z.object({
    id: z.string(),
    name: z.string(),
    population: z.number(),
    safety_rating: z.number(),
    resource_stockpile: z.record(z.number()),
    threats_nearby: z.array(z.string()),
  })),
  resource_delta: z.object({
    food: z.number(),
    water: z.number(),
    medicine: z.number(),
    fuel: z.number(),
    materials: z.number(),
    morale: z.number(),
  }),
  public_support: z.object({
    overall: z.number(),
    by_faction: z.record(z.number()),
    trending: z.enum(["rising", "stable", "falling", "critical"]),
  }),
  environment_impact: z.array(z.object({
    zone: z.string(),
    hazard_type: z.string(),
    severity: z.number(),
    duration_days: z.number(),
    mitigation_possible: z.boolean(),
  })),
  survival_events: z.array(z.object({
    day: z.number(),
    type: z.string(),
    description: z.string(),
    casualties: z.number(),
    resources_consumed: z.record(z.number()),
  })),
  outlook: z.object({
    sustainability_score: z.number(),
    days_until_crisis: z.number(),
    hope_index: z.number(),
  }),
});
export type CrisisEvent = z.infer<typeof CrisisEventSchema>;

class StrategyAdapter implements ExportAdapter<BattleReport> {
  format: ExportFormat = "strategy";
  targetEngines = ["ue5", "unity", "godot", "cryengine", "source2"];
  schemaVersion = "1.0.0";

  transform(canonical: CanonicalResponse): BattleReport {
    const config = getConflictConfig(canonical.metadata.conflict_type);
    
    const alliedFactions = canonical.factions.filter(f => f.allegiance === "allied");
    const enemyFactions = canonical.factions.filter(f => f.allegiance === "enemy");
    
    const playerMorale = canonical.resources.morale?.player ?? 50;
    const enemyMorale = canonical.resources.morale?.enemy ?? 50;
    const playerPower = canonical.resources.power?.player ?? 50;
    const enemyPower = canonical.resources.power?.enemy ?? 50;
    
    return {
      metadata: {
        target_engine: "strategy",
        schema_version: this.schemaVersion,
        conflict_tokens: config.primaryMechanics,
        exported_at: new Date().toISOString(),
        source_campaign_id: canonical.metadata.campaign_id,
      },
      campaign: {
        id: canonical.metadata.campaign_id,
        conflict_type: canonical.metadata.conflict_type,
        duration_days: canonical.metadata.duration_days,
        phase: canonical.metadata.phase,
      },
      forces: canonical.factions.map(f => ({
        faction_id: f.id,
        faction_name: f.name,
        allegiance: f.allegiance,
        strength: f.resources.power ?? f.influence,
        morale: f.resources.morale ?? 50,
        territory_control: f.influence,
        resource_levels: f.resources,
      })),
      losses: {
        player_total: Math.round((100 - playerPower) * 0.5),
        enemy_total: Math.round((100 - enemyPower) * 0.5),
        civilian: canonical.timeline.filter(e => 
          e.impact.magnitude === "catastrophic"
        ).length * 10,
      },
      territory_delta: {
        player_gained: canonical.outcome_summary?.dominance.player ?? 0,
        player_lost: 100 - (canonical.outcome_summary?.dominance.player ?? 50),
        contested: canonical.outcome_summary?.dominance.contested ?? 20,
      },
      morale_shift: {
        player: (playerMorale - 50) / 10,
        enemy: (enemyMorale - 50) / 10,
      },
      events: canonical.timeline.map(e => ({
        day: e.day,
        type: e.type,
        description: e.description,
        impact_magnitude: e.impact.magnitude,
      })),
      outcome: {
        status: canonical.outcome_summary?.status ?? "ongoing",
        player_dominance: canonical.outcome_summary?.dominance.player ?? 50,
        enemy_dominance: canonical.outcome_summary?.dominance.enemy ?? 50,
        narrative_summary: canonical.outcome_summary?.key_impacts.join(". ") ?? "Conflict continues.",
      },
    };
  }

  validate(data: BattleReport): boolean {
    return BattleReportSchema.safeParse(data).success;
  }
}

class RPGAdapter implements ExportAdapter<PlotTwist> {
  format: ExportFormat = "rpg";
  targetEngines = ["ue5", "unity", "godot", "roblox"];
  schemaVersion = "1.0.0";

  transform(canonical: CanonicalResponse): PlotTwist {
    const config = getConflictConfig(canonical.metadata.conflict_type);
    
    const getDisposition = (allegiance: string): "hostile" | "neutral" | "friendly" | "unknown" => {
      switch (allegiance) {
        case "allied": return "friendly";
        case "enemy": return "hostile";
        case "neutral": return "neutral";
        default: return "unknown";
      }
    };

    const getEmotionalWeight = (magnitude: string): "light" | "moderate" | "heavy" | "climactic" => {
      switch (magnitude) {
        case "minor": return "light";
        case "moderate": return "moderate";
        case "major": return "heavy";
        case "catastrophic": return "climactic";
        default: return "moderate";
      }
    };

    return {
      metadata: {
        target_engine: "rpg",
        schema_version: this.schemaVersion,
        conflict_tokens: config.primaryMechanics,
        exported_at: new Date().toISOString(),
        source_campaign_id: canonical.metadata.campaign_id,
      },
      narrative: {
        campaign_id: canonical.metadata.campaign_id,
        conflict_type: canonical.metadata.conflict_type,
        tone: config.narrativeTone,
        current_phase: canonical.metadata.phase,
      },
      characters: canonical.factions.map(f => ({
        id: f.id,
        name: f.name,
        faction: f.name,
        archetype: f.archetype,
        motivation: `Driven by ${f.behavior_profile.resource_focus}`,
        threat_level: f.behavior_profile.aggression,
        disposition_to_player: getDisposition(f.allegiance),
      })),
      beats: canonical.timeline.map((e, i) => ({
        id: e.id,
        day: e.day,
        title: e.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        description: e.description,
        emotional_weight: getEmotionalWeight(e.impact.magnitude),
        player_agency: e.narrative_weight > 50,
      })),
      choices: canonical.story_hooks.slice(0, 3).map((hook, i) => ({
        id: `choice_${i}`,
        prompt: hook,
        options: [
          { text: "Take action", consequence_preview: "Commit resources", resource_impact: { power: -10, support: 5 } },
          { text: "Wait and observe", consequence_preview: "Gather intelligence", resource_impact: { knowledge: 10 } },
          { text: "Delegate to allies", consequence_preview: "Build relationships", resource_impact: { support: 10, power: -5 } },
        ],
        urgency: i === 0 ? "urgent" as const : "moderate" as const,
      })),
      social_capital: {
        reputation: canonical.resources.support?.player ?? 50,
        trust_levels: Object.fromEntries(
          canonical.factions.map(f => [f.id, f.allegiance === "allied" ? 75 : f.allegiance === "neutral" ? 50 : 25])
        ),
        alliances_available: canonical.factions
          .filter(f => f.allegiance === "neutral" && f.behavior_profile.diplomacy > 50)
          .map(f => f.name),
        enemies_made: canonical.factions
          .filter(f => f.allegiance === "enemy")
          .map(f => f.name),
      },
      story_hooks: canonical.story_hooks,
    };
  }

  validate(data: PlotTwist): boolean {
    return PlotTwistSchema.safeParse(data).success;
  }
}

class SurvivalAdapter implements ExportAdapter<CrisisEvent> {
  format: ExportFormat = "survival";
  targetEngines = ["ue5", "unity", "godot"];
  schemaVersion = "1.0.0";

  transform(canonical: CanonicalResponse): CrisisEvent {
    const config = getConflictConfig(canonical.metadata.conflict_type);
    
    const stability = canonical.resources.stability?.player ?? 50;
    const hope = canonical.resources.hope?.player ?? 50;
    const fear = canonical.resources.fear?.enemy ?? 50;
    
    const getSeverity = (): "minor" | "moderate" | "severe" | "catastrophic" => {
      if (stability > 70) return "minor";
      if (stability > 50) return "moderate";
      if (stability > 30) return "severe";
      return "catastrophic";
    };

    const getTrending = (): "rising" | "stable" | "falling" | "critical" => {
      const support = canonical.resources.support?.player ?? 50;
      if (support > 70) return "rising";
      if (support > 50) return "stable";
      if (support > 30) return "falling";
      return "critical";
    };

    return {
      metadata: {
        target_engine: "survival",
        schema_version: this.schemaVersion,
        conflict_tokens: config.primaryMechanics,
        exported_at: new Date().toISOString(),
        source_campaign_id: canonical.metadata.campaign_id,
      },
      crisis: {
        id: canonical.metadata.campaign_id,
        conflict_type: canonical.metadata.conflict_type,
        severity: getSeverity(),
        duration_remaining: canonical.metadata.duration_days,
      },
      settlements: canonical.factions
        .filter(f => f.allegiance === "allied")
        .map(f => ({
          id: f.id,
          name: f.name,
          population: Math.round(f.influence * 100),
          safety_rating: f.resources.stability ?? 50,
          resource_stockpile: f.resources,
          threats_nearby: canonical.factions
            .filter(e => e.allegiance === "enemy")
            .map(e => e.name),
        })),
      resource_delta: {
        food: (canonical.resources.wealth?.player ?? 50) - 50,
        water: (canonical.resources.stability?.player ?? 50) - 50,
        medicine: (canonical.resources.knowledge?.player ?? 50) - 50,
        fuel: (canonical.resources.power?.player ?? 50) - 50,
        materials: (canonical.resources.wealth?.player ?? 50) - 50,
        morale: (canonical.resources.morale?.player ?? 50) - 50,
      },
      public_support: {
        overall: canonical.resources.support?.player ?? 50,
        by_faction: Object.fromEntries(
          canonical.factions.map(f => [f.id, f.allegiance === "allied" ? 80 : 20])
        ),
        trending: getTrending(),
      },
      environment_impact: canonical.timeline
        .filter(e => e.impact.magnitude === "major" || e.impact.magnitude === "catastrophic")
        .map(e => ({
          zone: "primary",
          hazard_type: e.type,
          severity: e.impact.magnitude === "catastrophic" ? 90 : 60,
          duration_days: Math.ceil(canonical.metadata.duration_days * 0.3),
          mitigation_possible: e.impact.magnitude !== "catastrophic",
        })),
      survival_events: canonical.timeline.map(e => ({
        day: e.day,
        type: e.type,
        description: e.description,
        casualties: e.impact.magnitude === "catastrophic" ? 50 : 
                    e.impact.magnitude === "major" ? 20 : 
                    e.impact.magnitude === "moderate" ? 5 : 0,
        resources_consumed: { power: 5, wealth: 10 },
      })),
      outlook: {
        sustainability_score: stability,
        days_until_crisis: Math.max(1, Math.round(stability / 10)),
        hope_index: hope,
      },
    };
  }

  validate(data: CrisisEvent): boolean {
    return CrisisEventSchema.safeParse(data).success;
  }
}

const strategyAdapter = new StrategyAdapter();
const rpgAdapter = new RPGAdapter();
const survivalAdapter = new SurvivalAdapter();

export const EXPORT_ADAPTERS: Record<ExportFormat, ExportAdapter<any>> = {
  strategy: strategyAdapter,
  rpg: rpgAdapter,
  survival: survivalAdapter,
  raw: {
    format: "raw",
    targetEngines: ["all"],
    schemaVersion: "1.0.0",
    transform: (canonical: CanonicalResponse) => canonical,
    validate: () => true,
  },
};

export function exportToFormat<T>(
  canonical: CanonicalResponse,
  format: ExportFormat
): { data: T; valid: boolean; errors?: string[] } {
  const adapter = EXPORT_ADAPTERS[format];
  if (!adapter) {
    return { data: canonical as T, valid: false, errors: [`Unknown export format: ${format}`] };
  }
  
  const data = adapter.transform(canonical) as T;
  const valid = adapter.validate(data);
  
  return { data, valid, errors: valid ? undefined : ["Validation failed"] };
}

export function getSupportedFormats(): ExportFormat[] {
  return Object.keys(EXPORT_ADAPTERS) as ExportFormat[];
}

export function getAdapterInfo(format: ExportFormat): { targetEngines: string[]; schemaVersion: string } | null {
  const adapter = EXPORT_ADAPTERS[format];
  if (!adapter) return null;
  return { targetEngines: adapter.targetEngines, schemaVersion: adapter.schemaVersion };
}
