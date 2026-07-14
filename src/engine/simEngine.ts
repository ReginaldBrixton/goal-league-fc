import type { MatchEvent, MatchResult, Player, Team } from '../types';
import { Rng } from '../utils/rng';

const XI_SIZE = 11;
const GOAL_CAP = 8;

function positionalScore(p: Player): number {
  switch (p.position) {
    case 'GK': return p.rating * 0.7 + p.defending * 0.2 + p.passing * 0.1;
    case 'DEF': return p.rating * 0.6 + p.defending * 0.3 + p.pace * 0.1;
    case 'MID': return p.rating * 0.55 + p.passing * 0.3 + p.pace * 0.1 + p.defending * 0.05;
    case 'FWD': return p.rating * 0.55 + p.shooting * 0.3 + p.pace * 0.15;
  }
}

/** Selects a conventional 4-3-3, then fills shortages with the best unused players. */
export function bestXI(players: Player[]): Player[] {
  const unique = [...new Map(players.map((p) => [p.id, p])).values()];
  const used = new Set<string>();
  const result: Player[] = [];

  const take = (position: Player['position'], count: number) => {
    const candidates = unique
      .filter((p) => p.position === position && !used.has(p.id))
      .sort((a, b) => positionalScore(b) - positionalScore(a));
    for (const p of candidates.slice(0, count)) {
      result.push(p);
      used.add(p.id);
    }
  };

  take('GK', 1);
  take('DEF', 4);
  take('MID', 3);
  take('FWD', 3);

  if (result.length < XI_SIZE) {
    const remaining = unique
      .filter((p) => !used.has(p.id))
      .sort((a, b) => positionalScore(b) - positionalScore(a));
    for (const p of remaining) {
      if (result.length >= XI_SIZE) break;
      result.push(p);
      used.add(p.id);
    }
  }

  return result;
}

interface TeamProfile {
  overall: number;
  attack: number;
  midfield: number;
  defence: number;
  lineupSize: number;
}

function average(values: number[], fallback = 50): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

function profile(players: Player[]): TeamProfile {
  const xi = bestXI(players);
  const attackers = xi.filter((p) => p.position === 'FWD');
  const midfielders = xi.filter((p) => p.position === 'MID');
  const defenders = xi.filter((p) => p.position === 'DEF' || p.position === 'GK');
  const shortagePenalty = Math.max(0, XI_SIZE - xi.length) * 2.5;

  return {
    overall: average(xi.map((p) => p.rating)) - shortagePenalty,
    attack: average((attackers.length ? attackers : xi).map((p) => p.shooting * 0.65 + p.pace * 0.2 + p.passing * 0.15)) - shortagePenalty,
    midfield: average((midfielders.length ? midfielders : xi).map((p) => p.passing * 0.55 + p.pace * 0.2 + p.defending * 0.15 + p.shooting * 0.1)) - shortagePenalty,
    defence: average((defenders.length ? defenders : xi).map((p) => p.defending * 0.65 + p.pace * 0.2 + p.passing * 0.15)) - shortagePenalty,
    lineupSize: xi.length,
  };
}

export function teamStrength(players: Player[]): number {
  return Math.round(profile(players).overall);
}

function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count++;
    product *= rng.next();
  } while (product > limit && count < 30);
  return count - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function simulateMatch(
  home: Team,
  away: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  seed: number,
): MatchResult {
  const rng = new Rng(seed);
  const hp = profile(homePlayers);
  const ap = profile(awayPlayers);

  const homeControl = (hp.midfield - ap.midfield) / 55;
  const awayControl = (ap.midfield - hp.midfield) / 55;
  const homeXg = clamp(1.18 + (hp.attack - ap.defence) / 38 + homeControl + 0.2, 0.15, 3.75);
  const awayXg = clamp(1.02 + (ap.attack - hp.defence) / 38 + awayControl, 0.12, 3.5);

  const homeGoals = Math.min(GOAL_CAP, poisson(homeXg, rng));
  const awayGoals = Math.min(GOAL_CAP, poisson(awayXg, rng));
  const homeXI = bestXI(homePlayers);
  const awayXI = bestXI(awayPlayers);

  const homeScorers = pickScorers(homeGoals, homeXI, home.id, rng);
  const awayScorers = pickScorers(awayGoals, awayXI, away.id, rng);
  const events: MatchEvent[] = [
    ...homeScorers.map((s) => ({
      minute: s.minute,
      type: 'goal' as const,
      teamId: home.id,
      playerName: s.name,
      text: `GOAL! ${s.name} scores for ${home.name}.`,
    })),
    ...awayScorers.map((s) => ({
      minute: s.minute,
      type: 'goal' as const,
      teamId: away.id,
      playerName: s.name,
      text: `GOAL! ${s.name} scores for ${away.name}.`,
    })),
  ].sort((a, b) => a.minute - b.minute);

  const homeShots = Math.max(homeGoals, poisson(7.5 + homeXg * 2.8, rng));
  const awayShots = Math.max(awayGoals, poisson(7 + awayXg * 2.8, rng));

  return {
    homeId: home.id,
    awayId: away.id,
    homeGoals,
    awayGoals,
    events,
    homeShots,
    awayShots,
    scorers: [...homeScorers, ...awayScorers].sort((a, b) => a.minute - b.minute),
  };
}

function pickScorers(
  goals: number,
  xi: Player[],
  teamId: string,
  rng: Rng,
): { playerId: string; name: string; teamId: string; minute: number }[] {
  if (goals <= 0 || xi.length === 0) return [];

  const weighted = xi.map((p) => {
    const roleMultiplier = p.position === 'FWD' ? 1.8 : p.position === 'MID' ? 0.85 : p.position === 'DEF' ? 0.28 : 0.04;
    return { p, weight: Math.max(0.1, (p.shooting * 0.75 + p.rating * 0.25) * roleMultiplier) };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const usedMinutes = new Set<number>();
  const scorers: { playerId: string; name: string; teamId: string; minute: number }[] = [];

  for (let i = 0; i < goals; i++) {
    let roll = rng.next() * totalWeight;
    let chosen = weighted[weighted.length - 1].p;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        chosen = item.p;
        break;
      }
    }

    let minute = rng.int(1, 90);
    for (let tries = 0; usedMinutes.has(minute) && tries < 20; tries++) {
      minute = rng.int(1, 90);
    }
    usedMinutes.add(minute);
    scorers.push({ playerId: chosen.id, name: chosen.name, teamId, minute });
  }

  return scorers.sort((a, b) => a.minute - b.minute);
}