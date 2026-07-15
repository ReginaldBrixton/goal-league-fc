import assert from 'node:assert/strict';
import test from 'node:test';
import { MatchEngine, type Entity, type InputState, type Vec } from '../src/engine/matchEngine';
import { createStrategicMatchEngine, getMatchDebugSnapshot } from '../src/engine/strategicMatchEngine';
import type { Player, Team } from '../src/types';

interface EngineInternals {
  entities: Entity[];
  carrier: Entity | null;
  lastTouch: Entity | null;
  ball: Vec;
  ballVel: Vec;
  activeUserId: string | null;
  rng: () => number;
  stealBall: (by: Entity, slide: boolean) => void;
  doPass: (entity: Entity, side: 'home' | 'away') => void;
  maxSpeed: (player: Player) => number;
}

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
    pace: position === 'GK' ? 48 : 74,
    passing: position === 'GK' ? 55 : 68,
    shooting: position === 'FWD' ? 76 : 58,
    defending: position === 'DEF' ? 78 : 62,
    value: 1_000_000,
    wage: 10_000,
    teamId,
    goals: 0,
    apps: 0,
  }));
}

function createEngine(seed: number): MatchEngine {
  return createStrategicMatchEngine(
    home,
    away,
    squad(home.id),
    squad(away.id),
    { formation: '4-3-3', userSide: 'home', realSecondsPerMatchHalf: 45, aiLevel: 'professional' },
    {},
    seed,
  );
}

function emptyInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    pass: false,
    shoot: false,
    switchPlayer: false,
    slide: false,
    moveX: 0,
    moveY: 0,
  };
}

function internals(engine: MatchEngine): EngineInternals {
  return engine as unknown as EngineInternals;
}

function magnitude(vector: Vec): number {
  return Math.hypot(vector.x, vector.y);
}

function unit(vector: Vec): Vec {
  const length = magnitude(vector) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

test('a successful sliding tackle cannot carry slide velocity into possession', () => {
  const engine = createEngine(7);
  const state = internals(engine);
  const dispossessed = state.entities.find((entity) => entity.side === 'home' && !entity.isGk)!;
  const tackler = state.entities.find((entity) => entity.side === 'away' && !entity.isGk)!;

  state.carrier = dispossessed;
  tackler.sliding = 0.34;
  tackler.vel = { x: -16, y: 0 };
  state.rng = () => 0;
  state.stealBall(tackler, true);

  assert.equal(state.carrier?.id, tackler.id);
  assert.ok(
    magnitude(tackler.vel) <= state.maxSpeed(tackler.player) * 1.05,
    `tackle winner retained ${magnitude(tackler.vel).toFixed(2)}m/s instead of settling near normal running speed`,
  );
  assert.ok(tackler.sliding <= 0.12, `tackle animation remained active for ${tackler.sliding.toFixed(2)}s after possession changed`);
});

test('the displayed user pass target is the same teammate the pass is sent toward', () => {
  const engine = createEngine(11);
  const state = internals(engine);
  const carrier = state.entities.find((entity) => entity.id === 'home-home-p6')!;
  const central = state.entities.find((entity) => entity.id === 'home-home-p9')!;
  const wide = state.entities.find((entity) => entity.id === 'home-home-p10')!;
  const blockers = state.entities.filter((entity) => entity.side === 'away' && !entity.isGk).slice(0, 2);

  for (const entity of state.entities) entity.pos = { x: entity.side === 'home' ? 8 : 96, y: 6 };
  carrier.pos = { x: 50, y: 34 };
  carrier.facing = { x: 1, y: 0 };
  central.pos = { x: 65, y: 34 };
  wide.pos = { x: 58, y: 50 };
  blockers[0].pos = { x: 55, y: 34 };
  blockers[1].pos = { x: 60, y: 34 };
  state.carrier = carrier;
  state.activeUserId = carrier.id;
  state.rng = () => 0.5;

  const aim = engine.getUserAim();
  assert.ok(aim?.passTarget, 'a visible pass target must be available');
  const expected = unit({ x: aim.passTarget.x - carrier.pos.x, y: aim.passTarget.y - carrier.pos.y });

  state.doPass(carrier, 'home');
  const actual = unit(state.ballVel);
  const alignment = expected.x * actual.x + expected.y * actual.y;
  assert.ok(alignment > 0.98, `pass arrow and actual pass diverged with alignment ${alignment.toFixed(3)}`);
});

test('analogue direction changes rotate the controlled player progressively instead of snapping', () => {
  const engine = createEngine(19);
  const state = internals(engine);
  const active = state.entities.find((entity) => entity.id === state.activeUserId)!;
  state.carrier = active;
  active.facing = { x: 1, y: 0 };
  active.vel = { x: 3, y: 0 };

  const input = emptyInput();
  input.moveX = 0;
  input.moveY = 1;
  engine.setInput(input);
  engine.update(1 / 60);

  assert.ok(active.facing.x > 0.45, `facing snapped too far in one frame: (${active.facing.x.toFixed(3)}, ${active.facing.y.toFixed(3)})`);
  assert.ok(active.facing.y > 0, 'facing must still begin turning toward the requested direction');
});

test('an opponent winning the ball in midfield settles and releases it instead of gliding straight to goal', () => {
  const engine = createEngine(23);
  const state = internals(engine);
  const dispossessed = state.entities.find((entity) => entity.side === 'home' && !entity.isGk)!;
  const tackler = state.entities.find((entity) => entity.id === 'away-away-p2')!;
  const outlet = state.entities.find((entity) => entity.id === 'away-away-p6')!;

  for (const entity of state.entities) {
    entity.pos = entity.side === 'home' ? { x: 92, y: 60 } : { x: 20, y: 8 };
    entity.vel = { x: 0, y: 0 };
  }
  dispossessed.pos = { x: 52, y: 34 };
  tackler.pos = { x: 51, y: 34 };
  tackler.vel = { x: -16, y: 0 };
  tackler.sliding = 0.34;
  outlet.pos = { x: 43, y: 25 };
  state.carrier = dispossessed;
  state.activeUserId = dispossessed.id;
  state.rng = () => 0;
  state.stealBall(tackler, true);
  state.rng = () => 0.99;
  const tacklePosition = { ...tackler.pos };
  let outletPass: ReturnType<typeof getMatchDebugSnapshot>['lastPass'] = null;

  engine.setInput(emptyInput());
  for (let frame = 0; frame < 96; frame += 1) {
    engine.update(1 / 60);
    const pass = getMatchDebugSnapshot(engine).lastPass;
    if (!outletPass && pass?.fromId === tackler.id && pass.toId !== tackler.id) outletPass = pass;
  }

  const travelled = Math.hypot(tackler.pos.x - tacklePosition.x, tackler.pos.y - tacklePosition.y);
  assert.ok(outletPass, 'the tackle winner never released the ball to a different teammate');
  assert.ok(travelled < 10, `the tackle winner glided ${travelled.toFixed(2)}m immediately after the turnover`);
});
