import type { Player, TrainingFocus } from '../types';
import { recalcValue } from '../data/teams';
import { Rng } from '../utils/rng';

type TrainableStat = 'pace' | 'passing' | 'shooting' | 'defending';

const MIN_STAT = 20;
const MAX_STAT = 99;

const FOCUS_WEIGHTS: Record<TrainingFocus, TrainableStat[]> = {
  balanced: ['pace', 'passing', 'shooting', 'defending'],
  attacking: ['shooting', 'passing', 'pace', 'shooting'],
  defending: ['defending', 'pace', 'defending', 'passing'],
  fitness: ['pace', 'pace', 'passing', 'defending'],
};

function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

function ageGrowthFactor(age: number): number {
  if (age <= 19) return 1;
  if (age <= 22) return 0.82;
  if (age <= 25) return 0.62;
  if (age <= 28) return 0.38;
  if (age <= 30) return 0.2;
  return 0.08;
}

function pickStat(pool: TrainableStat[], rng: Rng): TrainableStat {
  return pool[rng.int(0, pool.length - 1)] ?? 'passing';
}

/**
 * Applies one development session without allowing the player's overall to
 * exceed the existing potential ceiling. The function is immutable and
 * deterministic for a supplied RNG.
 */
export function trainPlayer(p: Player, focus: TrainingFocus, rng: Rng): Player {
  const potentialCeiling = Math.max(p.rating, Math.min(MAX_STAT, p.potential));
  if (p.rating >= potentialCeiling) return p;

  const next = { ...p };
  const growthRoom = potentialCeiling - p.rating;
  const ageFactor = ageGrowthFactor(p.age);
  const sessionChance = Math.min(0.92, 0.28 + ageFactor * 0.55 + growthRoom * 0.015);

  if (rng.next() < sessionChance) {
    const attempts = growthRoom >= 6 && ageFactor >= 0.6 ? 2 : 1;
    const pool = FOCUS_WEIGHTS[focus] ?? FOCUS_WEIGHTS.balanced;

    for (let i = 0; i < attempts; i++) {
      const stat = pickStat(pool, rng);
      const current = next[stat];
      if (current >= MAX_STAT) continue;

      const amount = rng.next() < Math.min(0.35, ageFactor * 0.3) ? 2 : 1;
      const candidate = { ...next, [stat]: clampStat(current + amount) } as Player;

      // Attribute gains are accepted only when the resulting overall remains
      // within the player's established potential.
      if (overall(candidate) <= potentialCeiling) {
        next[stat] = candidate[stat];
      }
    }
  }

  next.rating = Math.min(potentialCeiling, overall(next));
  next.potential = potentialCeiling;
  return recalcValue(next);
}

export function overall(p: Player): number {
  const weights: Record<Player['position'], [number, number, number, number]> = {
    GK: [0.12, 0.18, 0.05, 0.65],
    DEF: [0.2, 0.18, 0.07, 0.55],
    MID: [0.2, 0.42, 0.2, 0.18],
    FWD: [0.27, 0.2, 0.45, 0.08],
  };
  const [pace, passing, shooting, defending] = weights[p.position];
  const value =
    p.pace * pace +
    p.passing * passing +
    p.shooting * shooting +
    p.defending * defending;
  return clampStat(value);
}

/** Ages a player by one season and applies position-aware veteran decline. */
export function ageAndDecline(p: Player, rng: Rng): Player {
  const next = { ...p, age: p.age + 1 };
  if (next.age < 30) return recalcValue(next);

  const severity = next.age >= 35 ? 3 : next.age >= 33 ? 2 : 1;
  const guaranteedDrop = next.age >= 33 ? 1 : 0;
  const drop = () => guaranteedDrop + rng.int(0, severity - guaranteedDrop);

  next.pace = clampStat(next.pace - drop());

  if (next.position === 'FWD') {
    next.shooting = clampStat(next.shooting - rng.int(0, severity));
  } else if (next.position === 'MID') {
    next.passing = clampStat(next.passing - rng.int(0, severity));
  } else {
    next.defending = clampStat(next.defending - rng.int(0, severity));
  }

  if (next.age >= 34) {
    next.passing = clampStat(next.passing - rng.int(0, 1));
    next.shooting = clampStat(next.shooting - rng.int(0, 1));
    next.defending = clampStat(next.defending - rng.int(0, 1));
  }

  next.rating = overall(next);
  const potentialDrop = next.age >= 34 ? severity : rng.int(0, 1);
  next.potential = Math.max(next.rating, p.potential - potentialDrop);
  return recalcValue(next);
}