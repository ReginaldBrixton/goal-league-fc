import type { FormationKey, MatchResult, Player, Team } from '../types';
import { MatchEngine, type Entity, type HudState, type InputState, type Vec } from './matchEngine';
import {
  assignDefensiveRoles,
  createTacticalMemory,
  defensiveLaneOffset,
  getAIProfile,
  updateTacticalMemory,
  type AILevel,
  type AIProfile,
  type DefensiveRole,
  type TacticalMemory,
} from './tacticalAI';

const PITCH_X = 105;
const PITCH_Y = 68;
const CENTER_Y = PITCH_Y / 2;
const BALL_CAPTURE_RADIUS = 1.55;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(vector: Vec): Vec {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < 0.0001) return { x: 0, y: 0 };
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

interface MatchEngineInternals {
  entities: Entity[];
  ball: Vec;
  carrier: Entity | null;
  input: InputState;
  prevInput: InputState;
  elapsed: number;
  opt: { userSide: 'home' | 'away' };
  rng: () => number;
  controlAI: (entity: Entity, dt: number) => void;
  controlGoalkeeper: (entity: Entity, dt: number) => void;
  moveTo: (entity: Entity, target: Vec, speed: number) => void;
  maxSpeed: (player: Player) => number;
  chancePerSecond: (rate: number, dt: number) => boolean;
  doPass: (entity: Entity, side: 'home' | 'away') => void;
  doShoot: (entity: Entity, side: 'home' | 'away') => void;
  stealBall: (entity: Entity, slide: boolean) => void;
  tryCapture: (entity: Entity, goalkeeperBonus?: boolean) => void;
}

interface StrategicState {
  profile: AIProfile;
  memory: TacticalMemory;
  roles: Map<string, DefensiveRole>;
  sampleClock: number;
}

export interface StrategicMatchOptions {
  formation: FormationKey;
  awayFormation?: FormationKey;
  userSide: 'home' | 'away';
  realSecondsPerMatchHalf: number;
  aiLevel: AILevel;
}

export interface MatchDebugSnapshot {
  activeUser: { id: string; pos: Vec; velocity: Vec } | null;
  ball: Vec;
  carrierId: string | null;
  opponentRoles: Record<string, DefensiveRole>;
  tacticalMemory: TacticalMemory;
  aiLevel: AILevel;
}

const strategicStates = new WeakMap<MatchEngine, StrategicState>();

function laneFromY(y: number): 'left' | 'center' | 'right' {
  if (y < PITCH_Y / 3) return 'left';
  if (y > PITCH_Y * 2 / 3) return 'right';
  return 'center';
}

function markTarget(internal: MatchEngineInternals, entity: Entity, laneShift: number): Vec {
  const opponents = internal.entities
    .filter((candidate) => candidate.side !== entity.side && !candidate.isGk)
    .sort((a, b) => distance(a.pos, entity.base) - distance(b.pos, entity.base));
  const mark = opponents[0];
  const forward = entity.side === 'home' ? 1 : -1;
  const shapeX = clamp(entity.base.x + (internal.ball.x - PITCH_X / 2) * 0.12, 3, PITCH_X - 3);
  const shapeY = clamp(entity.base.y + laneShift, 4, PITCH_Y - 4);

  if (!mark || distance(mark.pos, entity.base) > 18) return { x: shapeX, y: shapeY };
  return {
    x: clamp(mark.pos.x - forward * 2.8, 3, PITCH_X - 3),
    y: clamp(mark.pos.y * 0.55 + shapeY * 0.45, 4, PITCH_Y - 4),
  };
}

function controlStrategicAI(
  internal: MatchEngineInternals,
  state: StrategicState,
  originalControlAI: (entity: Entity, dt: number) => void,
  entity: Entity,
  dt: number,
): void {
  const side = entity.side;
  if (side === internal.opt.userSide) {
    originalControlAI(entity, dt);
    return;
  }

  if (entity.isGk || entity.sliding > 0) {
    originalControlAI(entity, dt);
    return;
  }

  const profile = state.profile;
  const forward = side === 'home' ? 1 : -1;
  const opponentGoalX = side === 'home' ? PITCH_X : 0;
  const ownGoalX = side === 'home' ? 0 : PITCH_X;
  const speed = internal.maxSpeed(entity.player);
  const isCarrier = internal.carrier === entity;
  const teamHasBall = internal.carrier?.side === side;
  const opponentHasBall = Boolean(internal.carrier && internal.carrier.side !== side);
  const laneShift = defensiveLaneOffset(state.memory, profile);

  if (isCarrier) {
    const goalDistance = Math.hypot(opponentGoalX - entity.pos.x, CENTER_Y - entity.pos.y);
    const pressure = internal.entities.filter(
      (opponent) => opponent.side !== side && distance(opponent.pos, entity.pos) < 5.2,
    ).length;
    const nearestThreat = internal.entities
      .filter((opponent) => opponent.side !== side)
      .sort((a, b) => distance(a.pos, entity.pos) - distance(b.pos, entity.pos))[0];
    const shootingUtility =
      clamp((32 - goalDistance) / 24, 0, 1) * (entity.player.shooting / 100) * (0.8 + profile.shotPatience * 0.45) -
      pressure * 0.08 +
      (internal.rng() - 0.5) * profile.decisionNoise;
    const passingUtility =
      (entity.player.passing / 100) * profile.passRisk +
      pressure * 0.16 +
      (internal.rng() - 0.5) * profile.decisionNoise;

    if (entity.cooldown <= 0 && shootingUtility > 0.54) {
      internal.doShoot(entity, side);
      return;
    }
    if (entity.cooldown <= 0 && passingUtility > 0.64) {
      internal.doPass(entity, side);
      return;
    }

    const evadeY = nearestThreat && distance(nearestThreat.pos, entity.pos) < 7
      ? clamp(entity.pos.y + (entity.pos.y - nearestThreat.pos.y) * 1.8, 4, PITCH_Y - 4)
      : clamp(CENTER_Y + (entity.base.y - CENTER_Y) * 0.35, 4, PITCH_Y - 4);
    internal.moveTo(entity, { x: opponentGoalX, y: evadeY }, speed * (0.9 + profile.compactness * 0.08));
    return;
  }

  if (teamHasBall) {
    const carrier = internal.carrier!;
    const laneSide = entity.base.y < CENTER_Y ? -1 : 1;
    const carrierProgress = (carrier.pos.x - PITCH_X / 2) * forward;
    let target: Vec;

    if (entity.player.position === 'FWD') {
      target = {
        x: clamp(carrier.pos.x + forward * (10 + (entity.player.pace / 99) * 7), 5, PITCH_X - 5),
        y: clamp(entity.base.y + laneSide * 3 + (carrier.pos.y - CENTER_Y) * 0.18, 4, PITCH_Y - 4),
      };
    } else if (entity.player.position === 'MID') {
      target = {
        x: clamp(carrier.pos.x - forward * (5 + Math.abs(entity.base.y - CENTER_Y) * 0.08), 5, PITCH_X - 5),
        y: clamp(carrier.pos.y + laneSide * (7 + profile.passRisk * 3), 4, PITCH_Y - 4),
      };
    } else {
      target = {
        x: clamp(entity.base.x + forward * clamp(carrierProgress * 0.18, -2, 6), 3, PITCH_X - 3),
        y: clamp(entity.base.y + (carrier.pos.y - CENTER_Y) * 0.1, 4, PITCH_Y - 4),
      };
    }

    internal.moveTo(entity, target, speed * (0.72 + profile.compactness * 0.14));
    return;
  }

  if (opponentHasBall) {
    const carrier = internal.carrier!;
    const defenders = internal.entities
      .filter((candidate) => candidate.side === side && !candidate.isGk)
      .map((candidate) => ({
        id: candidate.id,
        position: candidate.player.position,
        distanceToCarrier: distance(candidate.pos, carrier.pos),
      }));
    state.roles = assignDefensiveRoles(defenders, profile);
    const role = state.roles.get(entity.id) ?? 'shape';
    const carrierDistance = distance(entity.pos, carrier.pos);

    if (role === 'press') {
      const lead = normalize(carrier.vel);
      const pressTarget = {
        x: clamp(carrier.pos.x + lead.x * profile.reactionSeconds * 4, 1, PITCH_X - 1),
        y: clamp(carrier.pos.y + lead.y * profile.reactionSeconds * 4, 1, PITCH_Y - 1),
      };
      internal.moveTo(entity, pressTarget, speed * (0.95 + profile.compactness * 0.08));
      if (carrierDistance < 1.65 && internal.chancePerSecond(0.62 + entity.player.defending / 75, dt)) {
        internal.stealBall(entity, false);
      } else if (
        carrierDistance > 1.5 && carrierDistance < 3.25 &&
        entity.slideCooldown <= 0 &&
        internal.chancePerSecond(0.045 + profile.compactness * 0.09, dt)
      ) {
        const direction = normalize({ x: carrier.pos.x - entity.pos.x, y: carrier.pos.y - entity.pos.y });
        entity.vel = { x: direction.x * speed * 1.7, y: direction.y * speed * 1.7 };
        entity.sliding = 0.38;
        entity.slideCooldown = 1.45;
      }
      return;
    }

    if (role === 'cover') {
      const goalSide = normalize({ x: ownGoalX - carrier.pos.x, y: CENTER_Y - carrier.pos.y });
      const coverDepth = 5.5 + Math.min(5, carrierDistance * 0.22);
      const sideOffset = entity.base.y < CENTER_Y ? -4.5 : 4.5;
      internal.moveTo(entity, {
        x: clamp(carrier.pos.x + goalSide.x * coverDepth, 3, PITCH_X - 3),
        y: clamp(carrier.pos.y + goalSide.y * coverDepth + sideOffset + laneShift * 0.45, 4, PITCH_Y - 4),
      }, speed * 0.86);
      return;
    }

    internal.moveTo(entity, markTarget(internal, entity, laneShift), speed * (0.62 + profile.compactness * 0.16));
    return;
  }

  const chasers = internal.entities
    .filter((candidate) => candidate.side === side && !candidate.isGk)
    .sort((a, b) => distance(a.pos, internal.ball) - distance(b.pos, internal.ball));
  const rank = chasers.findIndex((candidate) => candidate.id === entity.id);
  if (rank === 0) {
    internal.moveTo(entity, internal.ball, speed * 0.96);
    if (distance(entity.pos, internal.ball) < BALL_CAPTURE_RADIUS) internal.tryCapture(entity);
  } else if (rank === 1) {
    internal.moveTo(entity, {
      x: clamp(internal.ball.x - forward * 5, 3, PITCH_X - 3),
      y: clamp(internal.ball.y + (entity.base.y < CENTER_Y ? -5 : 5), 4, PITCH_Y - 4),
    }, speed * 0.8);
  } else {
    internal.moveTo(entity, markTarget(internal, entity, laneShift), speed * 0.65);
  }
}

export function createStrategicMatchEngine(
  home: Team,
  away: Team,
  homeXI: Player[],
  awayXI: Player[],
  options: StrategicMatchOptions,
  hooks: { onHud?: (hud: HudState) => void; onEvent?: (event: MatchResult['events'][number]) => void } = {},
  seed?: number,
): MatchEngine {
  const engine = new MatchEngine(home, away, homeXI, awayXI, options, hooks, seed);
  const internal = engine as unknown as MatchEngineInternals;
  const originalControlAI = internal.controlAI.bind(engine);
  const originalUpdate = engine.update.bind(engine);
  const state: StrategicState = {
    profile: getAIProfile(options.aiLevel),
    memory: createTacticalMemory(),
    roles: new Map(),
    sampleClock: 0,
  };
  strategicStates.set(engine, state);

  internal.controlAI = (entity, dt) => controlStrategicAI(internal, state, originalControlAI, entity, dt);

  engine.update = (dt: number) => {
    state.sampleClock += Math.max(0, dt);
    const userCarrier = internal.carrier?.side === options.userSide ? internal.carrier : null;
    if (userCarrier && state.sampleClock >= state.profile.reactionSeconds) {
      const passed = internal.input.pass && !internal.prevInput.pass;
      const shot = internal.input.shoot && !internal.prevInput.shoot;
      state.memory = updateTacticalMemory(
        state.memory,
        { lane: laneFromY(userCarrier.pos.y), passed, shot },
        state.profile.adaptationRate,
      );
      state.sampleClock = 0;
    }
    originalUpdate(dt);
  };

  return engine;
}

export function getMatchDebugSnapshot(engine: MatchEngine): MatchDebugSnapshot {
  const internal = engine as unknown as MatchEngineInternals;
  const state = strategicStates.get(engine) ?? {
    profile: getAIProfile('professional'),
    memory: createTacticalMemory(),
    roles: new Map<string, DefensiveRole>(),
    sampleClock: 0,
  };
  const active = internal.entities.find((entity) => entity.id === (engine as unknown as { activeUserId: string | null }).activeUserId);

  return {
    activeUser: active ? {
      id: active.id,
      pos: { ...active.pos },
      velocity: { ...active.vel },
    } : null,
    ball: { ...internal.ball },
    carrierId: internal.carrier?.id ?? null,
    opponentRoles: Object.fromEntries(state.roles),
    tacticalMemory: {
      ...state.memory,
      lanes: { ...state.memory.lanes },
    },
    aiLevel: state.profile.level,
  };
}
