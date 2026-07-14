import type { Position } from '../types';

export type AILevel = 'rookie' | 'professional' | 'legend';
export type DefensiveRole = 'press' | 'cover' | 'shape';
export type TacticalLane = 'left' | 'center' | 'right';

export interface AIProfile {
  level: AILevel;
  reactionSeconds: number;
  pressers: number;
  coverPlayers: number;
  compactness: number;
  adaptationRate: number;
  laneShiftMetres: number;
  passRisk: number;
  shotPatience: number;
  decisionNoise: number;
}

export interface TacticalActor {
  id: string;
  position: Position;
  distanceToCarrier: number;
}

export interface TacticalMemory {
  lanes: Record<TacticalLane, number>;
  passRate: number;
  shotRate: number;
  samples: number;
}

export interface TacticalSample {
  lane: TacticalLane;
  passed: boolean;
  shot: boolean;
}

const PROFILES: Record<AILevel, AIProfile> = {
  rookie: {
    level: 'rookie',
    reactionSeconds: 0.42,
    pressers: 1,
    coverPlayers: 1,
    compactness: 0.62,
    adaptationRate: 0.05,
    laneShiftMetres: 3.2,
    passRisk: 0.48,
    shotPatience: 0.46,
    decisionNoise: 0.28,
  },
  professional: {
    level: 'professional',
    reactionSeconds: 0.24,
    pressers: 1,
    coverPlayers: 2,
    compactness: 0.78,
    adaptationRate: 0.11,
    laneShiftMetres: 5,
    passRisk: 0.63,
    shotPatience: 0.62,
    decisionNoise: 0.14,
  },
  legend: {
    level: 'legend',
    reactionSeconds: 0.12,
    pressers: 1,
    coverPlayers: 3,
    compactness: 0.92,
    adaptationRate: 0.19,
    laneShiftMetres: 7,
    passRisk: 0.77,
    shotPatience: 0.78,
    decisionNoise: 0.06,
  },
};

export function getAIProfile(level: AILevel): AIProfile {
  return PROFILES[level];
}

export function assignDefensiveRoles(
  actors: TacticalActor[],
  profile: AIProfile,
): Map<string, DefensiveRole> {
  const ordered = [...actors].sort((a, b) =>
    a.distanceToCarrier - b.distanceToCarrier ||
    Number(a.position === 'DEF') - Number(b.position === 'DEF'),
  );
  const assignments = new Map<string, DefensiveRole>();

  ordered.forEach((actor, index) => {
    if (index < profile.pressers) assignments.set(actor.id, 'press');
    else if (index < profile.pressers + profile.coverPlayers) assignments.set(actor.id, 'cover');
    else assignments.set(actor.id, 'shape');
  });

  return assignments;
}

export function createTacticalMemory(): TacticalMemory {
  return {
    lanes: { left: 1 / 3, center: 1 / 3, right: 1 / 3 },
    passRate: 0.35,
    shotRate: 0.12,
    samples: 0,
  };
}

export function updateTacticalMemory(
  memory: TacticalMemory,
  sample: TacticalSample,
  requestedRate: number,
): TacticalMemory {
  const rate = Math.max(0.01, Math.min(0.5, requestedRate));
  const lanes: TacticalMemory['lanes'] = { ...memory.lanes };

  (Object.keys(lanes) as TacticalLane[]).forEach((lane) => {
    const target = lane === sample.lane ? 1 : 0;
    lanes[lane] += (target - lanes[lane]) * rate;
  });

  const laneTotal = lanes.left + lanes.center + lanes.right || 1;
  lanes.left /= laneTotal;
  lanes.center /= laneTotal;
  lanes.right /= laneTotal;

  return {
    lanes,
    passRate: memory.passRate + (Number(sample.passed) - memory.passRate) * rate,
    shotRate: memory.shotRate + (Number(sample.shot) - memory.shotRate) * rate,
    samples: memory.samples + 1,
  };
}

export function defensiveLaneOffset(memory: TacticalMemory, profile: AIProfile): number {
  const preference = memory.lanes.right - memory.lanes.left;
  return Math.max(-profile.laneShiftMetres, Math.min(profile.laneShiftMetres, preference * profile.laneShiftMetres * 1.8));
}
