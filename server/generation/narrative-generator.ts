/**
 * PacAI v5 Narrative & Mission Generator
 * Creates factions, missions, objectives, and storylines
 * Integrates with OpenAI for enhanced narrative generation
 */

import { DeterministicRNG } from './rng';
import type { Narrative, Faction, Mission, Objective, TimelineEvent, MissionType, World, POI } from './types';
import OpenAI from 'openai';

const FACTION_TEMPLATES = [
  { id: 'alpha', name: 'Task Force Alpha', color: '#3B82F6', alignment: 'friendly' as const },
  { id: 'bravo', name: 'Delta Company', color: '#22C55E', alignment: 'friendly' as const },
  { id: 'hostile', name: 'Red Legion', color: '#EF4444', alignment: 'hostile' as const },
  { id: 'insurgent', name: 'Shadow Network', color: '#8B5CF6', alignment: 'hostile' as const },
  { id: 'neutral', name: 'Local Population', color: '#6B7280', alignment: 'neutral' as const },
  { id: 'pmc', name: 'Blacksite Security', color: '#F59E0B', alignment: 'neutral' as const }
];

const MISSION_TEMPLATES: Record<MissionType, {
  names: string[];
  objectives: Array<{type: 'primary' | 'secondary'; template: string}>;
}> = {
  assault: {
    names: ['Operation Steel Rain', 'Hammer Strike', 'Thunder Run', 'Iron Fist'],
    objectives: [
      { type: 'primary', template: 'Capture {poi}' },
      { type: 'primary', template: 'Neutralize enemy forces at {poi}' },
      { type: 'secondary', template: 'Minimize civilian casualties' },
      { type: 'secondary', template: 'Destroy enemy communications equipment' }
    ]
  },
  defend: {
    names: ['Operation Fortress', 'Hold the Line', 'Iron Wall', 'Last Stand'],
    objectives: [
      { type: 'primary', template: 'Defend {poi} for {duration} minutes' },
      { type: 'primary', template: 'Repel enemy assault on {poi}' },
      { type: 'secondary', template: 'Maintain defensive perimeter' },
      { type: 'secondary', template: 'Protect civilian evacuees' }
    ]
  },
  patrol: {
    names: ['Operation Overwatch', 'Silent Watch', 'Recon Sweep', 'Night Patrol'],
    objectives: [
      { type: 'primary', template: 'Complete patrol route through {zone}' },
      { type: 'primary', template: 'Report enemy activity in {zone}' },
      { type: 'secondary', template: 'Avoid detection by hostiles' },
      { type: 'secondary', template: 'Document infrastructure damage' }
    ]
  },
  recon: {
    names: ['Operation Ghost Eye', 'Shadow Recon', 'Eagle Vision', 'Intel Sweep'],
    objectives: [
      { type: 'primary', template: 'Gather intelligence on {poi}' },
      { type: 'primary', template: 'Photograph enemy positions at {poi}' },
      { type: 'secondary', template: 'Remain undetected' },
      { type: 'secondary', template: 'Identify enemy command structure' }
    ]
  },
  extraction: {
    names: ['Operation Lifeline', 'Dustoff', 'Phoenix Rising', 'Safe Harbor'],
    objectives: [
      { type: 'primary', template: 'Extract VIP from {poi}' },
      { type: 'primary', template: 'Secure extraction zone at {poi}' },
      { type: 'secondary', template: 'Recover sensitive materials' },
      { type: 'secondary', template: 'Establish communications with command' }
    ]
  },
  escort: {
    names: ['Operation Guardian', 'Convoy Shield', 'Iron Escort', 'Safe Passage'],
    objectives: [
      { type: 'primary', template: 'Escort convoy from {poi_start} to {poi_end}' },
      { type: 'primary', template: 'Protect VIP during transit' },
      { type: 'secondary', template: 'Clear route of IEDs' },
      { type: 'secondary', template: 'Maintain radio contact throughout' }
    ]
  },
  sabotage: {
    names: ['Operation Dark Storm', 'Silent Strike', 'Shadow Blade', 'Night Fury'],
    objectives: [
      { type: 'primary', template: 'Destroy enemy supplies at {poi}' },
      { type: 'primary', template: 'Disable enemy communications at {poi}' },
      { type: 'secondary', template: 'Plant evidence of rival faction' },
      { type: 'secondary', template: 'Extract without raising alarm' }
    ]
  },
  rescue: {
    names: ['Operation Rescue Dawn', 'Liberty Call', 'Broken Arrow', 'Homecoming'],
    objectives: [
      { type: 'primary', template: 'Locate and rescue hostages at {poi}' },
      { type: 'primary', template: 'Neutralize hostage takers' },
      { type: 'secondary', template: 'Secure medical evacuation' },
      { type: 'secondary', template: 'Gather intelligence on captor organization' }
    ]
  },
  capture: {
    names: ['Operation Snatch', 'High Value', 'Crown Jewel', 'King Maker'],
    objectives: [
      { type: 'primary', template: 'Capture HVT alive at {poi}' },
      { type: 'primary', template: 'Secure target for extraction' },
      { type: 'secondary', template: 'Recover target documents' },
      { type: 'secondary', template: 'Minimize collateral damage' }
    ]
  },
  eliminate: {
    names: ['Operation Black Dagger', 'Silent Thunder', 'Final Strike', 'End Game'],
    objectives: [
      { type: 'primary', template: 'Eliminate HVT at {poi}' },
      { type: 'primary', template: 'Confirm target neutralization' },
      { type: 'secondary', template: 'Recover target intel' },
      { type: 'secondary', template: 'Destroy target communications' }
    ]
  },
  supply: {
    names: ['Operation Supply Line', 'Iron Horse', 'Lifeline', 'Resupply Run'],
    objectives: [
      { type: 'primary', template: 'Deliver supplies to {poi}' },
      { type: 'primary', template: 'Establish supply route to {poi}' },
      { type: 'secondary', template: 'Assess local infrastructure' },
      { type: 'secondary', template: 'Report enemy patrol patterns' }
    ]
  },
  training: {
    names: ['Operation Ready Force', 'Combat Prep', 'War Games', 'Steel Forged'],
    objectives: [
      { type: 'primary', template: 'Complete combat exercises at {poi}' },
      { type: 'primary', template: 'Evaluate unit readiness' },
      { type: 'secondary', template: 'Identify skill gaps' },
      { type: 'secondary', template: 'Certify personnel qualifications' }
    ]
  }
};

const TIMELINE_EVENT_TEMPLATES = [
  { type: 'battle', template: '{faction1} and {faction2} engaged in combat near {location}' },
  { type: 'treaty', template: '{faction1} and {faction2} declared a temporary ceasefire' },
  { type: 'disaster', template: '{disaster_type} struck {location}, causing widespread damage' },
  { type: 'discovery', template: 'Intelligence uncovered {discovery} at {location}' },
  { type: 'betrayal', template: 'Elements within {faction1} defected to {faction2}' },
  { type: 'reinforcement', template: '{faction1} received reinforcements at {location}' }
];

export async function generateNarrative(
  rng: DeterministicRNG,
  world: World,
  options: {
    factionCount?: number;
    missionCount?: number;
    useAI?: boolean;
    difficulty?: number;
  } = {}
): Promise<Narrative> {
  const factionCount = options.factionCount || 4;
  const missionCount = options.missionCount || 3;
  const difficulty = options.difficulty || 0.5;
  const useAI = options.useAI !== false && process.env.OPENAI_API_KEY;

  const factions = generateFactions(rng, factionCount, world);
  const missions = generateMissions(rng, factions, world, missionCount, difficulty);
  const timeline = generateTimeline(rng, factions, world, 10);

  if (useAI) {
    try {
      await enhanceNarrativeWithAI(rng, factions, missions, timeline, world);
    } catch (error: any) {
      // Mask sensitive data - never expose API keys in logs
      const safeMessage = error?.message?.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***REDACTED***') || 'Unknown error';
      console.warn(`AI enhancement failed (using procedural fallback): ${safeMessage}`);
    }
  }

  const activeFactions = factions.filter(f => f.alignment !== 'neutral');
  const hostilePairs: string[] = [];
  for (let i = 0; i < activeFactions.length; i++) {
    for (let j = i + 1; j < activeFactions.length; j++) {
      if (activeFactions[i].alignment !== activeFactions[j].alignment) {
        hostilePairs.push(`${activeFactions[i].id} vs ${activeFactions[j].id}`);
      }
    }
  }

  return {
    id: `narrative_${rng.getSeed().substring(0, 8)}`,
    seed: rng.getSeed(),
    factions,
    missions,
    timeline,
    current_time: 0,
    global_tension: calculateGlobalTension(factions, timeline),
    active_conflicts: hostilePairs,
    recent_events: timeline.slice(-5).map(e => e.description)
  };
}

function generateFactions(rng: DeterministicRNG, count: number, world: World): Faction[] {
  const selectedTemplates = rng.shuffle(FACTION_TEMPLATES).slice(0, count);
  const factions: Faction[] = [];

  for (const template of selectedTemplates) {
    const controlledPOIs = world.pois
      .filter(p => p.faction === template.id)
      .map(p => p.id);

    const relations: Record<string, number> = {};
    for (const other of selectedTemplates) {
      if (other.id !== template.id) {
        if (template.alignment === other.alignment) {
          relations[other.id] = rng.nextFloat(0.3, 0.8);
        } else if (template.alignment === 'neutral' || other.alignment === 'neutral') {
          relations[other.id] = rng.nextFloat(-0.2, 0.3);
        } else {
          relations[other.id] = rng.nextFloat(-1, -0.3);
        }
      }
    }

    factions.push({
      id: template.id,
      name: template.name,
      color: template.color,
      alignment: template.alignment,
      relations,
      resources: {
        supplies: rng.nextInt(100, 1000),
        fuel: rng.nextInt(50, 500),
        ammo: rng.nextInt(500, 5000),
        personnel: rng.nextInt(50, 500)
      },
      controlled_pois: controlledPOIs,
      population: rng.nextInt(100, 2000),
      military_strength: rng.nextFloat(0.3, 1.0),
      tech_level: rng.nextFloat(0.5, 1.0)
    });
  }

  return factions;
}

function generateMissions(
  rng: DeterministicRNG,
  factions: Faction[],
  world: World,
  count: number,
  difficulty: number
): Mission[] {
  const missions: Mission[] = [];
  const missionTypes = Object.keys(MISSION_TEMPLATES) as MissionType[];
  const friendlyFactions = factions.filter(f => f.alignment === 'friendly');
  const hostileFactions = factions.filter(f => f.alignment === 'hostile');

  for (let i = 0; i < count; i++) {
    const type = rng.pick(missionTypes);
    const template = MISSION_TEMPLATES[type];
    const primaryFaction = rng.pick(friendlyFactions);
    const targetPOI = rng.pick(world.pois);
    const secondaryPOI = rng.pick(world.pois.filter(p => p.id !== targetPOI.id));

    const objectives: Objective[] = template.objectives.map((obj, idx) => {
      const description = obj.template
        .replace('{poi}', targetPOI.name)
        .replace('{poi_start}', targetPOI.name)
        .replace('{poi_end}', secondaryPOI?.name || 'Base')
        .replace('{zone}', `Sector ${String.fromCharCode(65 + rng.nextInt(0, 4))}`)
        .replace('{duration}', String(rng.nextInt(5, 15)));

      return {
        id: `obj_${i}_${idx}`,
        type: obj.type,
        description,
        location: { x: targetPOI.x, y: targetPOI.y },
        progress: 0,
        completed: false,
        quantity: obj.type === 'primary' ? undefined : rng.nextInt(1, 5)
      };
    });

    missions.push({
      id: `mission_${i}`,
      type,
      name: rng.pick(template.names),
      description: `${primaryFaction.name} operation targeting ${targetPOI.name}`,
      objectives,
      primary_faction: primaryFaction.id,
      opposing_factions: hostileFactions.map(f => f.id),
      location: targetPOI.id,
      difficulty: Math.min(1, difficulty + rng.nextFloat(-0.2, 0.2)),
      time_limit: type === 'defend' ? rng.nextInt(10, 30) : undefined,
      rewards: {
        experience: rng.nextInt(100, 500),
        supplies: rng.nextInt(50, 200),
        reputation: rng.nextInt(10, 50)
      },
      status: i === 0 ? 'active' : 'pending'
    });
  }

  return missions;
}

function generateTimeline(rng: DeterministicRNG, factions: Faction[], world: World, eventCount: number): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const disasters = ['Sandstorm', 'Earthquake', 'Flood', 'Power outage', 'Communications blackout'];
  const discoveries = ['enemy cache', 'hidden bunker', 'intelligence documents', 'supply route'];

  for (let i = 0; i < eventCount; i++) {
    const template = rng.pick(TIMELINE_EVENT_TEMPLATES);
    const faction1 = rng.pick(factions);
    const faction2 = rng.pick(factions.filter(f => f.id !== faction1.id));
    const location = rng.pick(world.pois).name;

    let description = template.template
      .replace('{faction1}', faction1.name)
      .replace('{faction2}', faction2.name)
      .replace('{location}', location)
      .replace('{disaster_type}', rng.pick(disasters))
      .replace('{discovery}', rng.pick(discoveries));

    const impact: Record<string, number> = {};
    if (template.type === 'battle') {
      impact[faction1.id] = rng.nextFloat(-0.3, 0.1);
      impact[faction2.id] = rng.nextFloat(-0.3, 0.1);
    } else if (template.type === 'reinforcement') {
      impact[faction1.id] = rng.nextFloat(0.1, 0.3);
    }

    events.push({
      id: `event_${i}`,
      time: i * rng.nextInt(30, 120),
      type: template.type as TimelineEvent['type'],
      description,
      factions_involved: [faction1.id, faction2.id],
      impact
    });
  }

  return events.sort((a, b) => a.time - b.time);
}

async function enhanceNarrativeWithAI(
  rng: DeterministicRNG,
  factions: Faction[],
  missions: Mission[],
  timeline: TimelineEvent[],
  world: World
): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const factionSummary = factions.map(f => `${f.name} (${f.alignment})`).join(', ');
  const poiSummary = world.pois.slice(0, 5).map(p => p.name).join(', ');

  const prompt = `You are a military scenario writer. Given these factions: ${factionSummary}, and locations: ${poiSummary}, generate a brief tactical briefing (2-3 sentences) for each of these missions:

${missions.map((m, i) => `${i + 1}. ${m.name} (${m.type})`).join('\n')}

Keep responses concise and militaristic. Use NATO phonetic alphabet where appropriate. Respond in JSON format: {"briefings": ["briefing1", "briefing2", ...]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
      seed: parseInt(rng.getSeed().substring(0, 8), 16) % 2147483647
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.briefings && Array.isArray(parsed.briefings)) {
          missions.forEach((mission, i) => {
            if (parsed.briefings[i]) {
              mission.description = parsed.briefings[i];
            }
          });
        }
      }
    }
  } catch (error: any) {
    // Mask sensitive data in error logs - never expose API keys
    const safeMessage = error?.message?.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***REDACTED***') || 'Unknown error';
    console.warn(`AI enhancement failed (using procedural fallback): ${safeMessage}`);
  }
}

function calculateGlobalTension(factions: Faction[], timeline: TimelineEvent[]): number {
  let tension = 0.3;

  for (const faction of factions) {
    for (const [otherId, relation] of Object.entries(faction.relations)) {
      if (relation < -0.5) {
        tension += 0.1;
      }
    }
  }

  const recentBattles = timeline.filter(e => e.type === 'battle').length;
  tension += recentBattles * 0.05;

  return Math.min(1, tension);
}

export function getNarrativeSummary(narrative: Narrative): {
  faction_count: number;
  mission_count: number;
  active_missions: number;
  timeline_events: number;
  global_tension: string;
  conflicts: string[];
} {
  return {
    faction_count: narrative.factions.length,
    mission_count: narrative.missions.length,
    active_missions: narrative.missions.filter(m => m.status === 'active').length,
    timeline_events: narrative.timeline.length,
    global_tension: `${Math.round(narrative.global_tension * 100)}%`,
    conflicts: narrative.active_conflicts
  };
}
