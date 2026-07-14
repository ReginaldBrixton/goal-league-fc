import type { Player, Position, Team } from '../types';
import { clubNames, firstNames, lastNames } from './names';
import { Rng } from '../utils/rng';

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

function makeName(rng: Rng): string {
  return `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
}

function ratingValue(rating: number, age: number): number {
  // value scales steeply with rating; younger players with upside cost more.
  const base = Math.pow(rating / 50, 3.2) * 50_000;
  const ageFactor = age <= 23 ? 1.35 : age <= 28 ? 1.0 : age <= 31 ? 0.8 : 0.5;
  return Math.round((base * ageFactor) / 1000) * 1000;
}

function wageFor(rating: number): number {
  return Math.round((rating * rating) / 120) * 10;
}

function makePlayer(rng: Rng, position: Position, teamId: string | null, tier: number): Player {
  // tier shifts the rating band: 0 strong starter, 1 mid, 2 weak
  const mean = 72 - tier * 8;
  const rating = rng.bell(mean, 10, 40, 92);
  const age = rng.int(17, 35);
  const potential = Math.min(99, rating + rng.int(0, 12) + (age <= 21 ? rng.int(0, 10) : 0));

  const pace = clampStat(rating + rng.int(-8, 8));
  const passing = clampStat(rating + rng.int(-8, 8));
  const shooting = clampStat(rating + positionSkillBias(position, 'shooting', rng));
  const defending = clampStat(rating + positionSkillBias(position, 'defending', rng));

  return {
    id: nextId('p'),
    name: makeName(rng),
    position,
    age,
    rating,
    potential,
    pace,
    passing,
    shooting,
    defending,
    value: ratingValue(rating, age),
    wage: wageFor(rating),
    teamId,
    goals: 0,
    apps: 0,
  };
}

function positionSkillBias(pos: Position, skill: 'shooting' | 'defending', rng: Rng): number {
  if (skill === 'shooting') {
    if (pos === 'FWD') return rng.int(2, 12);
    if (pos === 'MID') return rng.int(-4, 4);
    if (pos === 'DEF') return rng.int(-14, -2);
    return rng.int(-20, -10);
  }
  // defending
  if (pos === 'GK') return rng.int(2, 12);
  if (pos === 'DEF') return rng.int(4, 14);
  if (pos === 'MID') return rng.int(-4, 6);
  return rng.int(-16, -4);
}

function clampStat(v: number): number {
  return Math.max(20, Math.min(99, Math.round(v)));
}

// Build a squad: 3 GK, 8 DEF, 8 MID, 6 FWD = 25 players, tiered.
export function generateSquad(rng: Rng, teamId: string, strength: number): Player[] {
  const players: Player[] = [];
  const plan: { pos: Position; count: number }[] = [
    { pos: 'GK', count: 3 },
    { pos: 'DEF', count: 8 },
    { pos: 'MID', count: 8 },
    { pos: 'FWD', count: 6 },
  ];
  let slot = 0;
  for (const { pos, count } of plan) {
    for (let i = 0; i < count; i++) {
      const tier = slot < 11 ? 0 : slot < 18 ? 1 : 2; // starters stronger
      // bias overall by team strength
      const p = makePlayer(rng, pos, teamId, tier);
      const adj = strength - 72;
      p.rating = clampStat(p.rating + Math.round(adj / 3));
      p.pace = clampStat(p.pace + Math.round(adj / 4));
      p.passing = clampStat(p.passing + Math.round(adj / 4));
      p.shooting = clampStat(p.shooting + Math.round(adj / 4));
      p.defending = clampStat(p.defending + Math.round(adj / 4));
      p.potential = Math.min(99, p.potential + Math.round(adj / 5));
      p.value = ratingValue(p.rating, p.age);
      p.wage = wageFor(p.rating);
      players.push(p);
      slot++;
    }
  }
  return players;
}

export function generateTeamsAndSquads(seed: number, teamCount = 8): {
  teams: Team[];
  players: Player[];
  freeAgents: Player[];
} {
  const rng = new Rng(seed);
  idCounter = 1; // reset for deterministic ids per new career
  const chosen = [...clubNames].sort(() => rng.next() - 0.5).slice(0, teamCount);
  const teams: Team[] = [];
  const players: Player[] = [];

  chosen.forEach((c, i) => {
    const id = nextId('t');
    const strength = 78 - i * 3 + rng.int(-2, 2); // slight ordering, jittered
    teams.push({
      id,
      name: c.name,
      short: c.short,
      color: c.color,
      color2: c.color2,
      budget: 2_000_000 + rng.int(0, 6_000_000),
      isUser: false,
    });
    const squad = generateSquad(rng, id, strength);
    players.push(...squad);
  });

  // Free agents pool (unattached), varied quality.
  const freeAgents: Player[] = [];
  const faPlan: { pos: Position; count: number }[] = [
    { pos: 'GK', count: 4 },
    { pos: 'DEF', count: 10 },
    { pos: 'MID', count: 10 },
    { pos: 'FWD', count: 8 },
  ];
  for (const { pos, count } of faPlan) {
    for (let i = 0; i < count; i++) {
      const tier = rng.int(0, 2);
      freeAgents.push(makePlayer(rng, pos, null, tier));
    }
  }

  return { teams, players, freeAgents };
}

export function recalcValue(p: Player): Player {
  return { ...p, value: ratingValue(p.rating, p.age), wage: wageFor(p.rating) };
}
