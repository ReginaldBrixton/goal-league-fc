import assert from 'node:assert/strict';
import test from 'node:test';
import { type Entity, type MatchEngine } from '../src/engine/matchEngine';
import { createStrategicMatchEngine, getMatchDebugSnapshot } from '../src/engine/strategicMatchEngine';
import type { Player, Team } from '../src/types';

const home: Team = {
  id: 'home',
  name: 'Home FC',
  short: 'HOM',
  color: '#1473e6',
  color2: '#ffffff',
  budget: 0,
  isUser: true,
};

const away: Team = {
  id: 'away',
  name: 'Away FC',
  short: 'AWY',
  color: '#e63b2e',
  color2: '#ffffff',
  budget: 0,
  isUser: false,
};

function squad(teamId: string): Player[] {
  const positions: Player['position'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
  return positions.map((position, index) => ({
    id: `${teamId}-p${index + 1}`,
    name: `${teamId} player ${index + 1}`,
    position,
    age: 24,
    rating: 72,
    potential: 78,
    pace: 72,
    passing: 72,
    shooting: 64,
    defending: 64,
    value: 1_000_000,
    wage: 10_000,
    teamId,
    goals: 0,
    apps: 0,
  }));
}

interface Internals {
  entities: Entity[];
  carrier: Entity | null;
  activeUserId: string | null;
}

function read(engine: MatchEngine): Internals {
  return engine as unknown as Internals;
}

test('balanced passing prefers a nearby open teammate over a distant runner', () => {
  const engine = createStrategicMatchEngine(
    home,
    away,
    squad(home.id),
    squad(away.id),
    { formation: '4-3-3', userSide: 'home', realSecondsPerMatchHalf: 45, aiLevel: 'professional' },
    {},
    31,
  );
  const state = read(engine);
  const carrier = state.entities.find((entity) => entity.id === 'home-home-p6')!;
  const nearby = state.entities.find((entity) => entity.id === 'home-home-p7')!;
  const distant = state.entities.find((entity) => entity.id === 'home-home-p9')!;

  for (const entity of state.entities) {
    entity.pos = entity.side === 'home' ? { x: 30, y: 5 } : { x: 96, y: 60 };
    entity.vel = { x: 0, y: 0 };
  }
  carrier.pos = { x: 50, y: 34 };
  nearby.pos = { x: 59, y: 40 };
  distant.pos = { x: 78, y: 34 };
  state.carrier = carrier;
  state.activeUserId = carrier.id;

  assert.equal(
    getMatchDebugSnapshot(engine).passTargetId,
    nearby.id,
    'the pass guide should point to the closest safe teammate, not the furthest forward runner',
  );
});
