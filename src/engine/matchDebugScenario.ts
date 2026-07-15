import type { Entity, MatchEngine, Vec } from './matchEngine';

interface DebugEngineInternals {
  entities: Entity[];
  carrier: Entity | null;
  lastTouch: Entity | null;
  activeUserId: string | null;
  ball: Vec;
  ballVel: Vec;
  opt: { userSide: 'home' | 'away' };
  rng: () => number;
  stealBall: (entity: Entity, slide: boolean) => void;
}

export interface MatchEntityDebugSnapshot {
  id: string;
  side: 'home' | 'away';
  pos: Vec;
  velocity: Vec;
  facing: Vec;
  sliding: number;
}

function readEngine(engine: MatchEngine): DebugEngineInternals {
  return engine as unknown as DebugEngineInternals;
}

function forwardFor(side: 'home' | 'away'): number {
  return side === 'home' ? 1 : -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function place(entity: Entity, position: Vec): void {
  entity.pos = { ...position };
  entity.vel = { x: 0, y: 0 };
  entity.sliding = 0;
  entity.cooldown = 0;
}

export function preparePassGuideScenario(engine: MatchEngine): { carrierId: string; targetId: string | null } {
  const internal = readEngine(engine);
  const userSide = internal.opt.userSide;
  const opponentSide = userSide === 'home' ? 'away' : 'home';
  const forward = forwardFor(userSide);
  const carrier = internal.entities.find(
    (entity) => entity.side === userSide && entity.player.position === 'MID' && !entity.isGk,
  ) ?? internal.entities.find((entity) => entity.side === userSide && !entity.isGk);
  if (!carrier) throw new Error('No user-controlled outfield player is available for the pass-guide scenario.');

  const teammates = internal.entities.filter((entity) => entity.side === userSide && entity !== carrier && !entity.isGk);
  const primaryTarget = teammates.find((entity) => entity.player.position === 'FWD') ?? teammates[0];
  const secondaryTarget = teammates.find((entity) => entity !== primaryTarget && entity.player.position === 'MID') ?? teammates[1];
  if (!primaryTarget) throw new Error('No teammate is available for the pass-guide scenario.');

  for (const entity of internal.entities) {
    entity.vel = { x: 0, y: 0 };
    entity.sliding = 0;
    entity.cooldown = 0;
  }

  place(carrier, { x: 52.5, y: 34 });
  carrier.facing = { x: forward, y: 0 };
  place(primaryTarget, { x: 52.5 + forward * 16, y: 46 });
  if (secondaryTarget) place(secondaryTarget, { x: 52.5 + forward * 10, y: 19 });

  const blockers = internal.entities.filter((entity) => entity.side === opponentSide && !entity.isGk).slice(0, 3);
  if (blockers[0]) place(blockers[0], { x: 52.5 + forward * 6, y: 34 });
  if (blockers[1]) place(blockers[1], { x: 52.5 + forward * 10, y: 34 });
  if (blockers[2]) place(blockers[2], { x: 52.5 + forward * 5, y: 28 });

  internal.carrier = carrier;
  internal.lastTouch = carrier;
  internal.activeUserId = carrier.id;
  internal.ball = { x: carrier.pos.x + forward * 0.8, y: carrier.pos.y };
  internal.ballVel = { x: 0, y: 0 };

  const aim = engine.getUserAim();
  const target = aim?.passTarget
    ? teammates.sort(
      (a, b) => Math.hypot(a.pos.x - aim.passTarget!.x, a.pos.y - aim.passTarget!.y) -
        Math.hypot(b.pos.x - aim.passTarget!.x, b.pos.y - aim.passTarget!.y),
    )[0] ?? null
    : null;

  return { carrierId: carrier.id, targetId: target?.id ?? null };
}

export function forceOpponentMidfieldTurnover(engine: MatchEngine): {
  dispossessedId: string;
  tacklerId: string;
  outletIds: string[];
} {
  const internal = readEngine(engine);
  const userSide = internal.opt.userSide;
  const opponentSide = userSide === 'home' ? 'away' : 'home';
  const opponentForward = forwardFor(opponentSide);
  const dispossessed = internal.carrier?.side === userSide
    ? internal.carrier
    : internal.entities.find((entity) => entity.side === userSide && !entity.isGk);
  const tackler = internal.entities.find(
    (entity) => entity.side === opponentSide && entity.player.position === 'DEF' && !entity.isGk,
  ) ?? internal.entities.find((entity) => entity.side === opponentSide && !entity.isGk);
  if (!dispossessed || !tackler) throw new Error('The deterministic turnover scenario could not resolve both players.');

  const outlets = internal.entities
    .filter((entity) => entity.side === opponentSide && entity !== tackler && !entity.isGk)
    .sort((a, b) => {
      const positionPriority = (entity: Entity) => entity.player.position === 'MID' ? 0 : entity.player.position === 'FWD' ? 1 : 2;
      return positionPriority(a) - positionPriority(b);
    })
    .slice(0, 3);

  place(dispossessed, { x: 52.5, y: 34 });
  dispossessed.facing = { x: -opponentForward, y: 0 };
  internal.carrier = dispossessed;
  internal.lastTouch = dispossessed;
  internal.activeUserId = dispossessed.id;
  internal.ball = { x: dispossessed.pos.x, y: dispossessed.pos.y };
  internal.ballVel = { x: 0, y: 0 };

  place(tackler, { x: 52.5 - opponentForward * 0.9, y: 34 });
  tackler.facing = { x: opponentForward, y: 0 };
  tackler.vel = { x: opponentForward * 16, y: 0 };
  tackler.sliding = 0.34;

  outlets.forEach((outlet, index) => {
    place(outlet, {
      x: clamp(52.5 + opponentForward * (10 + index * 5), 8, 97),
      y: clamp(24 + index * 11, 8, 60),
    });
    outlet.facing = { x: opponentForward, y: 0 };
  });

  const originalRng = internal.rng;
  internal.rng = () => 0;
  try {
    internal.stealBall(tackler, true);
  } finally {
    internal.rng = originalRng;
  }

  if (internal.carrier !== tackler) throw new Error('The deterministic opponent tackle did not win possession.');
  return {
    dispossessedId: dispossessed.id,
    tacklerId: tackler.id,
    outletIds: outlets.map((entity) => entity.id),
  };
}

export function getMatchEntityDebugSnapshot(engine: MatchEngine, entityId: string): MatchEntityDebugSnapshot | null {
  const entity = readEngine(engine).entities.find((candidate) => candidate.id === entityId);
  if (!entity) return null;
  return {
    id: entity.id,
    side: entity.side,
    pos: { ...entity.pos },
    velocity: { ...entity.vel },
    facing: { ...entity.facing },
    sliding: entity.sliding,
  };
}
