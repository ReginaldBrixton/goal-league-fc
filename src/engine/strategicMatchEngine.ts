import '../input/analogInputTypes';
import type { FormationKey, MatchResult, Player, Team } from '../types';
import { MatchEngine, type Entity, type HudState, type InputState, type Vec } from './matchEngine';
import { integrateControlledVelocity, resolveControlledMovement } from './playerMovement';
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
const PLAYER_COLLISION_DISTANCE = 1.18;

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

function rotateDirection(current: Vec, target: Vec, maxRadians: number): Vec {
  const from = normalize(current);
  const to = normalize(target);
  if (Math.hypot(to.x, to.y) < 0.0001) return from;
  if (Math.hypot(from.x, from.y) < 0.0001) return to;

  const fromAngle = Math.atan2(from.y, from.x);
  const toAngle = Math.atan2(to.y, to.x);
  const delta = Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
  const nextAngle = fromAngle + clamp(delta, -Math.abs(maxRadians), Math.abs(maxRadians));
  return { x: Math.cos(nextAngle), y: Math.sin(nextAngle) };
}

interface MatchEngineInternals {
  entities: Entity[];
  ball: Vec;
  ballVel: Vec;
  carrier: Entity | null;
  lastTouch: Entity | null;
  activeUserId: string | null;
  input: InputState;
  prevInput: InputState;
  elapsed: number;
  opt: { userSide: 'home' | 'away' };
  rng: () => number;
  controlUser: (entity: Entity, dt: number) => void;
  controlAI: (entity: Entity, dt: number) => void;
  controlGoalkeeper: (entity: Entity, dt: number) => void;
  resolvePlayerOverlaps: () => void;
  moveTo: (entity: Entity, target: Vec, speed: number) => void;
  maxSpeed: (player: Player) => number;
  chancePerSecond: (rate: number, dt: number) => boolean;
  doPass: (entity: Entity, side: 'home' | 'away') => void;
  doShoot: (entity: Entity, side: 'home' | 'away') => void;
  stealBall: (entity: Entity, slide: boolean) => void;
  tryCapture: (entity: Entity, goalkeeperBonus?: boolean) => void;
}

interface StrategicPass {
  fromId: string;
  toId: string;
  at: number;
}

interface StrategicState {
  profile: AIProfile;
  memory: TacticalMemory;
  roles: Map<string, DefensiveRole>;
  sampleClock: number;
  carrierId: string | null;
  carrierClock: number;
  regainCarrierId: string | null;
  regainClock: number;
  lastPass: StrategicPass | null;
}

export interface StrategicMatchOptions {
  formation: FormationKey;
  awayFormation?: FormationKey;
  userSide: 'home' | 'away';
  realSecondsPerMatchHalf: number;
  aiLevel: AILevel;
}

export interface MatchDebugSnapshot {
  activeUser: { id: string; pos: Vec; velocity: Vec; facing: Vec } | null;
  ball: Vec;
  carrierId: string | null;
  carrierSide: 'home' | 'away' | null;
  passTargetId: string | null;
  lastPass: StrategicPass | null;
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

function passLaneRisk(internal: MatchEngineInternals, from: Vec, to: Vec, side: 'home' | 'away'): number {
  const line = { x: to.x - from.x, y: to.y - from.y };
  const lengthSq = line.x * line.x + line.y * line.y || 1;
  let risk = 0;

  for (const opponent of internal.entities) {
    if (opponent.side === side) continue;
    const projection = clamp(
      ((opponent.pos.x - from.x) * line.x + (opponent.pos.y - from.y) * line.y) / lengthSq,
      0,
      1,
    );
    const closest = { x: from.x + line.x * projection, y: from.y + line.y * projection };
    if (distance(opponent.pos, closest) < 2.35) risk += 1;
  }
  return risk;
}

function selectBestPassTarget(
  internal: MatchEngineInternals,
  entity: Entity,
  intent: 'balanced' | 'transition' = 'balanced',
): Entity | null {
  const forward = entity.side === 'home' ? 1 : -1;
  const teammates = internal.entities.filter(
    (candidate) => candidate.side === entity.side && candidate !== entity && !candidate.isGk,
  );
  let best: Entity | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of teammates) {
    const passDistance = distance(entity.pos, candidate.pos);
    const maximumDistance = intent === 'transition' ? 43 : 36;
    if (passDistance < 2.5 || passDistance > maximumDistance) continue;

    const forwardProgress = (candidate.pos.x - entity.pos.x) * forward;
    const nearestOpponent = internal.entities
      .filter((opponent) => opponent.side !== entity.side)
      .reduce((nearest, opponent) => Math.min(nearest, distance(opponent.pos, candidate.pos)), 20);
    const laneRisk = passLaneRisk(internal, entity.pos, candidate.pos, entity.side);
    const lateralDistance = Math.abs(candidate.pos.y - entity.pos.y);
    const openness = clamp(nearestOpponent - 2, 0, 8);
    const preferredDistance = intent === 'transition' ? 16 : 12;
    const longPassThreshold = intent === 'transition' ? 30 : 22;
    const distancePenalty =
      Math.abs(passDistance - preferredDistance) * (intent === 'transition' ? 0.08 : 0.28) +
      Math.max(0, passDistance - longPassThreshold) * (intent === 'transition' ? 0.12 : 0.5);
    const backwardPenalty = Math.max(0, -forwardProgress) * (intent === 'transition' ? 0.22 : 0.52);
    const transitionOutletBonus = intent === 'transition'
      ? openness * 0.8 + clamp(13 - lateralDistance, 0, 13) * 0.08
      : 0;
    const score =
      forwardProgress * (intent === 'transition' ? 0.78 : 0.28) +
      openness * (intent === 'transition' ? 1.25 : 1.5) +
      transitionOutletBonus -
      laneRisk * 9.2 -
      distancePenalty -
      lateralDistance * 0.02 -
      backwardPenalty;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function executeStrategicPass(
  internal: MatchEngineInternals,
  state: StrategicState,
  entity: Entity,
  side: 'home' | 'away',
  intent: 'balanced' | 'transition' = 'balanced',
): boolean {
  const targetEntity = selectBestPassTarget(internal, entity, intent);
  if (!targetEntity) return false;

  const passing = clamp(entity.player.passing, 20, 99);
  const error = (100 - passing) / 100;
  const target = {
    x: targetEntity.pos.x + targetEntity.vel.x * 0.32 + (internal.rng() - 0.5) * error * 3.4,
    y: targetEntity.pos.y + targetEntity.vel.y * 0.32 + (internal.rng() - 0.5) * error * 3.4,
  };
  const direction = normalize({ x: target.x - entity.pos.x, y: target.y - entity.pos.y });
  const passDistance = distance(entity.pos, target);
  const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28);

  internal.lastTouch = entity;
  internal.ball = {
    x: entity.pos.x + direction.x * 0.8,
    y: entity.pos.y + direction.y * 0.8,
  };
  internal.ballVel = { x: direction.x * power, y: direction.y * power };
  internal.carrier = null;
  entity.cooldown = 0.32;
  state.lastPass = { fromId: entity.id, toId: targetEntity.id, at: internal.elapsed };
  state.regainCarrierId = null;
  state.regainClock = 0;
  void side;
  return true;
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

function controlAnalogueUser(
  internal: MatchEngineInternals,
  originalControlUser: (entity: Entity, dt: number) => void,
  entity: Entity,
  dt: number,
): void {
  const hasAnalogueAxes = Number.isFinite(internal.input.moveX) && Number.isFinite(internal.input.moveY);
  if (!hasAnalogueAxes) {
    originalControlUser(entity, dt);
    return;
  }

  const movement = {
    x: clamp(internal.input.moveX ?? 0, -1, 1),
    y: clamp(internal.input.moveY ?? 0, -1, 1),
  };
  const movementPlan = resolveControlledMovement(
    movement,
    internal.maxSpeed(entity.player),
    internal.carrier === entity,
  );
  const velocityBeforeActions = { ...entity.vel };
  const savedDirections = {
    up: internal.input.up,
    down: internal.input.down,
    left: internal.input.left,
    right: internal.input.right,
  };

  if (movementPlan.strength > 0.02) {
    internal.input.up = movement.y < -0.08;
    internal.input.down = movement.y > 0.08;
    internal.input.left = movement.x < -0.08;
    internal.input.right = movement.x > 0.08;
  } else {
    internal.input.up = false;
    internal.input.down = false;
    internal.input.left = false;
    internal.input.right = false;
  }

  originalControlUser(entity, dt);

  internal.input.up = savedDirections.up;
  internal.input.down = savedDirections.down;
  internal.input.left = savedDirections.left;
  internal.input.right = savedDirections.right;

  if (entity.sliding > 0) return;

  const finalPlan = resolveControlledMovement(
    movement,
    internal.maxSpeed(entity.player),
    internal.carrier === entity,
  );
  entity.vel = integrateControlledVelocity(
    velocityBeforeActions,
    finalPlan.targetVelocity,
    dt,
    internal.carrier === entity,
  );
}

function resolveStablePlayerOverlaps(internal: MatchEngineInternals): void {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < internal.entities.length; i += 1) {
      for (let j = i + 1; j < internal.entities.length; j += 1) {
        const a = internal.entities[i];
        const b = internal.entities[j];
        const delta = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
        let separation = Math.hypot(delta.x, delta.y);
        let direction: Vec;

        if (separation < 0.001) {
          direction = (i + j) % 2 === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
          separation = 0.001;
        } else {
          direction = { x: delta.x / separation, y: delta.y / separation };
        }

        if (separation >= PLAYER_COLLISION_DISTANCE) continue;

        const overlap = PLAYER_COLLISION_DISTANCE - separation;
        const correction = Math.min(overlap, 0.22);
        const aIsActive = a.id === internal.activeUserId;
        const bIsActive = b.id === internal.activeUserId;
        const aWeight = aIsActive ? 0.32 : bIsActive ? 0.68 : 0.5;
        const bWeight = 1 - aWeight;

        a.pos.x = clamp(a.pos.x - direction.x * correction * aWeight, 0.5, PITCH_X - 0.5);
        a.pos.y = clamp(a.pos.y - direction.y * correction * aWeight, 0.5, PITCH_Y - 0.5);
        b.pos.x = clamp(b.pos.x + direction.x * correction * bWeight, 0.5, PITCH_X - 0.5);
        b.pos.y = clamp(b.pos.y + direction.y * correction * bWeight, 0.5, PITCH_Y - 0.5);

        const closingVelocity = (b.vel.x - a.vel.x) * direction.x + (b.vel.y - a.vel.y) * direction.y;
        if (closingVelocity < 0) {
          const impulse = -closingVelocity * 0.28;
          a.vel.x -= direction.x * impulse * aWeight;
          a.vel.y -= direction.y * impulse * aWeight;
          b.vel.x += direction.x * impulse * bWeight;
          b.vel.y += direction.y * impulse * bWeight;
        }
      }
    }
  }
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
    const inMiddleThird = entity.pos.x > 24 && entity.pos.x < PITCH_X - 24;
    const freshRegain = state.regainCarrierId === entity.id;

    if (freshRegain && inMiddleThird && state.regainClock < 0.18) {
      const damping = Math.exp(-8.5 * dt);
      entity.vel.x *= damping;
      entity.vel.y *= damping;
      return;
    }

    if (
      freshRegain &&
      inMiddleThird &&
      state.regainClock >= 0.18 &&
      state.regainClock <= 1.35 &&
      entity.cooldown <= 0 &&
      executeStrategicPass(internal, state, entity, side, 'transition')
    ) {
      return;
    }

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

    const possessionAge = state.carrierId === entity.id ? state.carrierClock : 0;
    const shouldRecycle = goalDistance > 27 && possessionAge > 0.85 && passingUtility > 0.38;
    const mustReleasePressure = pressure > 0 && possessionAge > 0.34;
    if (
      entity.cooldown <= 0 &&
      (passingUtility > 0.64 || shouldRecycle || mustReleasePressure) &&
      executeStrategicPass(internal, state, entity, side)
    ) {
      return;
    }

    const evadeY = nearestThreat && distance(nearestThreat.pos, entity.pos) < 7
      ? clamp(entity.pos.y + (entity.pos.y - nearestThreat.pos.y) * 1.8, 4, PITCH_Y - 4)
      : clamp(CENTER_Y + (entity.base.y - CENTER_Y) * 0.35, 4, PITCH_Y - 4);
    const carryDepth = goalDistance > 35 ? 12 : 20;
    const targetX = clamp(entity.pos.x + forward * carryDepth, 4, PITCH_X - 4);
    internal.moveTo(entity, { x: targetX, y: evadeY }, speed * (0.82 + profile.compactness * 0.08));
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
  const originalControlUser = internal.controlUser.bind(engine);
  const originalControlAI = internal.controlAI.bind(engine);
  const originalStealBall = internal.stealBall.bind(engine);
  const originalUpdate = engine.update.bind(engine);
  const state: StrategicState = {
    profile: getAIProfile(options.aiLevel),
    memory: createTacticalMemory(),
    roles: new Map(),
    sampleClock: 0,
    carrierId: internal.carrier?.id ?? null,
    carrierClock: 0,
    regainCarrierId: null,
    regainClock: 0,
    lastPass: null,
  };
  strategicStates.set(engine, state);

  internal.controlUser = (entity, dt) => controlAnalogueUser(internal, originalControlUser, entity, dt);
  internal.controlAI = (entity, dt) => controlStrategicAI(internal, state, originalControlAI, entity, dt);
  internal.resolvePlayerOverlaps = () => resolveStablePlayerOverlaps(internal);
  internal.doPass = (entity, side) => {
    executeStrategicPass(internal, state, entity, side);
  };
  internal.stealBall = (entity, slide) => {
    const previousCarrier = internal.carrier;
    originalStealBall(entity, slide);
    if (internal.carrier !== entity || previousCarrier === entity) return;

    const currentSpeed = Math.hypot(entity.vel.x, entity.vel.y);
    const settledSpeed = internal.maxSpeed(entity.player) * (slide ? 0.82 : 0.96);
    if (currentSpeed > settledSpeed) {
      const direction = normalize(entity.vel);
      entity.vel = { x: direction.x * settledSpeed, y: direction.y * settledSpeed };
    }
    if (slide) entity.sliding = Math.min(entity.sliding, 0.1);
    entity.cooldown = Math.max(entity.cooldown, 0.18);
    if (previousCarrier) {
      previousCarrier.vel.x *= 0.35;
      previousCarrier.vel.y *= 0.35;
    }

    if (entity.side !== options.userSide) {
      state.regainCarrierId = entity.id;
      state.regainClock = 0;
    }
  };

  engine.getUserAim = () => {
    const user = internal.entities.find((entity) => entity.id === internal.activeUserId);
    if (!user) return null;
    const hasBall = internal.carrier === user;
    const target = hasBall ? selectBestPassTarget(internal, user) : null;
    return {
      pos: user.pos,
      facing: user.facing,
      hasBall,
      passTarget: target?.pos ?? null,
      goalX: user.side === 'home' ? PITCH_X : 0,
    };
  };

  engine.update = (dt: number) => {
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    const activeBefore = internal.entities.find((entity) => entity.id === internal.activeUserId);
    const facingBefore = activeBefore ? { ...activeBefore.facing } : null;
    const carrierBefore = internal.carrier;

    state.sampleClock += Math.max(0, safeDt);
    if (carrierBefore?.id === state.carrierId) state.carrierClock += safeDt;
    else {
      state.carrierId = carrierBefore?.id ?? null;
      state.carrierClock = 0;
    }
    if (carrierBefore?.id === state.regainCarrierId) state.regainClock += safeDt;
    else if (state.regainCarrierId) {
      state.regainCarrierId = null;
      state.regainClock = 0;
    }

    const userCarrier = carrierBefore?.side === options.userSide ? carrierBefore : null;
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

    const carrierAfter = internal.carrier;
    if (carrierAfter?.id !== state.carrierId) {
      state.carrierId = carrierAfter?.id ?? null;
      state.carrierClock = 0;
    }
    if (
      carrierAfter &&
      carrierAfter.side !== options.userSide &&
      carrierAfter.id !== carrierBefore?.id &&
      carrierBefore?.side === options.userSide
    ) {
      state.regainCarrierId = carrierAfter.id;
      state.regainClock = 0;
    }

    const activeAfter = internal.entities.find((entity) => entity.id === internal.activeUserId);
    if (activeAfter && facingBefore) {
      const movement = {
        x: clamp(internal.input.moveX ?? 0, -1, 1),
        y: clamp(internal.input.moveY ?? 0, -1, 1),
      };
      const movementStrength = Math.hypot(movement.x, movement.y);
      const velocityStrength = Math.hypot(activeAfter.vel.x, activeAfter.vel.y);
      const targetFacing = movementStrength > 0.02
        ? normalize(movement)
        : velocityStrength > 0.2
          ? normalize(activeAfter.vel)
          : facingBefore;
      const turnRate = internal.carrier === activeAfter ? 6.4 : 8.8;
      activeAfter.facing = rotateDirection(facingBefore, targetFacing, turnRate * safeDt);
    }
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
    carrierId: null,
    carrierClock: 0,
    regainCarrierId: null,
    regainClock: 0,
    lastPass: null,
  };
  const active = internal.entities.find((entity) => entity.id === internal.activeUserId);
  const passTarget = active && internal.carrier === active ? selectBestPassTarget(internal, active) : null;

  return {
    activeUser: active ? {
      id: active.id,
      pos: { ...active.pos },
      velocity: { ...active.vel },
      facing: { ...active.facing },
    } : null,
    ball: { ...internal.ball },
    carrierId: internal.carrier?.id ?? null,
    carrierSide: internal.carrier?.side ?? null,
    passTargetId: passTarget?.id ?? null,
    lastPass: state.lastPass ? { ...state.lastPass } : null,
    opponentRoles: Object.fromEntries(state.roles),
    tacticalMemory: {
      ...state.memory,
      lanes: { ...state.memory.lanes },
    },
    aiLevel: state.profile.level,
  };
}
