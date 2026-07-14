import type { FormationKey, MatchEvent, MatchResult, Player, Team } from '../types';
import { formationPositions } from '../data/formations';

const PITCH_X = 105;
const PITCH_Y = 68;
const CENTER_Y = PITCH_Y / 2;
const GOAL_HALF = 3.66;
const PLAYER_RADIUS_M = 0.65;
const BALL_CAPTURE_RADIUS = 1.55;
const MAX_FRAME_DT = 0.05;

export interface Vec {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  side: 'home' | 'away';
  player: Player;
  pos: Vec;
  vel: Vec;
  facing: Vec;
  base: Vec;
  isGk: boolean;
  cooldown: number;
  slideCooldown: number;
  sliding: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pass: boolean;
  shoot: boolean;
  switchPlayer: boolean;
  slide: boolean;
}

export interface HudState {
  homeGoals: number;
  awayGoals: number;
  minute: number;
  events: MatchEvent[];
  shotsHome: number;
  shotsAway: number;
  finished: boolean;
  possessionHome: number;
  activePlayerName?: string;
}

export interface MatchOptions {
  formation: FormationKey;
  awayFormation?: FormationKey;
  userSide: 'home' | 'away';
  realSecondsPerMatchHalf: number;
}

const EMPTY_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  pass: false,
  shoot: false,
  switchPlayer: false,
  slide: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function norm(v: Vec): Vec {
  const magnitude = Math.hypot(v.x, v.y);
  if (magnitude < 0.0001) return { x: 0, y: 0 };
  return { x: v.x / magnitude, y: v.y / magnitude };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class MatchEngine {
  private readonly home: Team;
  private readonly away: Team;
  private readonly homeXI: Player[];
  private readonly awayXI: Player[];
  private readonly opt: MatchOptions;
  private readonly realTotal: number;
  private readonly rng: () => number;

  private entities: Entity[] = [];
  private ball: Vec = { x: PITCH_X / 2, y: CENTER_Y };
  private ballVel: Vec = { x: 0, y: 0 };
  private carrier: Entity | null = null;
  private lastTouch: Entity | null = null;

  private homeGoals = 0;
  private awayGoals = 0;
  private shotsHome = 0;
  private shotsAway = 0;
  private minute = 1;
  private readonly matchMinutes = 90;
  private elapsed = 0;
  private possessionSeconds = 0;
  private homePossessionSeconds = 0;
  private hudAccumulator = 0;

  private events: MatchEvent[] = [];
  private scorers: { playerId: string; name: string; teamId: string; minute: number }[] = [];
  private finished = false;

  private activeUserId: string | null = null;
  private input: InputState = { ...EMPTY_INPUT };
  private prevInput: InputState = { ...EMPTY_INPUT };

  private readonly onHud?: (hud: HudState) => void;
  private readonly onEvent?: (event: MatchEvent) => void;

  constructor(
    home: Team,
    away: Team,
    homeXI: Player[],
    awayXI: Player[],
    opt: MatchOptions,
    hooks: { onHud?: (hud: HudState) => void; onEvent?: (event: MatchEvent) => void } = {},
    seed = Math.floor(Math.random() * 1_000_000_000),
  ) {
    this.home = home;
    this.away = away;
    this.homeXI = homeXI;
    this.awayXI = awayXI;
    this.opt = opt;
    this.onHud = hooks.onHud;
    this.onEvent = hooks.onEvent;
    this.realTotal = Math.max(10, opt.realSecondsPerMatchHalf * 2);

    let state = seed >>> 0 || 1;
    this.rng = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4_294_967_296;
    };

    this.setup();
  }

  private setup(): void {
    const build = (side: 'home' | 'away', xi: Player[], formation: FormationKey): Entity[] => {
      const positions = formationPositions(formation);
      const forward = side === 'home' ? 1 : -1;

      return xi.slice(0, 11).map((player, index) => {
        const normalized = positions[index] ?? { x: 0.5, y: 0.5 };
        const x = side === 'home' ? normalized.x * PITCH_X : (1 - normalized.x) * PITCH_X;
        const y = normalized.y * PITCH_Y;
        return {
          id: `${side}-${player.id}`,
          side,
          player,
          pos: { x, y },
          vel: { x: 0, y: 0 },
          facing: { x: forward, y: 0 },
          base: { x, y },
          isGk: player.position === 'GK',
          cooldown: 0,
          slideCooldown: 0,
          sliding: 0,
        };
      });
    };

    this.entities = [
      ...build('home', this.homeXI, this.opt.formation),
      ...build('away', this.awayXI, this.opt.awayFormation ?? this.opt.formation),
    ];
    this.resetKickoff('home');
    this.selectBestUserPlayer(true);
  }

  setInput(input: InputState): void {
    this.input = { ...input };
  }

  getHud(): HudState {
    const active = this.entities.find((entity) => entity.id === this.activeUserId);
    return {
      homeGoals: this.homeGoals,
      awayGoals: this.awayGoals,
      minute: this.minute,
      events: [...this.events],
      shotsHome: this.shotsHome,
      shotsAway: this.shotsAway,
      finished: this.finished,
      possessionHome: this.possessionSeconds > 0
        ? this.homePossessionSeconds / this.possessionSeconds
        : 0.5,
      activePlayerName: active?.player.name,
    };
  }

  getResult(): MatchResult {
    return {
      homeId: this.home.id,
      awayId: this.away.id,
      homeGoals: this.homeGoals,
      awayGoals: this.awayGoals,
      events: [...this.events],
      homeShots: this.shotsHome,
      awayShots: this.shotsAway,
      scorers: [...this.scorers],
    };
  }

  // Returns aim info for rendering the aim arrow when the user has the ball.
  getUserAim(): { pos: Vec; facing: Vec; hasBall: boolean; passTarget: Vec | null; goalX: number } | null {
    const user = this.entities.find((e) => e.id === this.activeUserId);
    if (!user) return null;
    const hasBall = this.carrier === user;
    const goalX = user.side === 'home' ? PITCH_X : 0;
    let passTarget: Vec | null = null;
    if (hasBall) {
      const best = this.findBestPassTarget(user);
      if (best) passTarget = best.pos;
    }
    return { pos: user.pos, facing: user.facing, hasBall, passTarget, goalX };
  }

  private findBestPassTarget(entity: Entity): Entity | null {
    const side = entity.side;
    const forward = side === 'home' ? 1 : -1;
    const teammates = this.entities.filter(
      (c) => c.side === side && c !== entity && !c.isGk,
    );
    if (teammates.length === 0) return null;
    let best = teammates[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const c of teammates) {
      const distance = dist(entity.pos, c.pos);
      if (distance > 45) continue;
      const forwardProgress = (c.pos.x - entity.pos.x) * forward;
      const nearbyOpponents = this.entities.filter(
        (o) => o.side !== side && dist(o.pos, c.pos) < 4.5,
      ).length;
      const shortPenalty = distance < 3 ? 5 : 0;
      const score = forwardProgress * 1.25 - Math.abs(c.pos.y - entity.pos.y) * 0.08 - nearbyOpponents * 8 - shortPenalty;
      if (score > bestScore) { best = c; bestScore = score; }
    }
    return best;
  }

  update(rawDt: number): void {
    if (this.finished) return;

    const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0, 0, MAX_FRAME_DT);
    if (dt <= 0) return;

    this.elapsed += dt;
    const progress = clamp(this.elapsed / this.realTotal, 0, 1);
    this.minute = clamp(Math.floor(progress * this.matchMinutes) + 1, 1, this.matchMinutes);

    this.handleUserSwitch();

    for (const entity of this.entities) {
      entity.cooldown = Math.max(0, entity.cooldown - dt);
      entity.slideCooldown = Math.max(0, entity.slideCooldown - dt);
      entity.sliding = Math.max(0, entity.sliding - dt);

      if (entity.id === this.activeUserId) this.controlUser(entity, dt);
      else this.controlAI(entity, dt);

      entity.pos.x += entity.vel.x * dt;
      entity.pos.y += entity.vel.y * dt;
      entity.pos.x = clamp(entity.pos.x, 0.5, PITCH_X - 0.5);
      entity.pos.y = clamp(entity.pos.y, 0.5, PITCH_Y - 0.5);

      if (Math.hypot(entity.vel.x, entity.vel.y) > 0.2) {
        entity.facing = norm(entity.vel);
      }
    }

    this.resolvePlayerOverlaps();
    this.updateBall(dt);
    this.checkGoal();
    this.syncUserToCarrier();

    this.possessionSeconds += dt;
    if (this.carrier?.side === 'home') this.homePossessionSeconds += dt;

    if (this.elapsed >= this.realTotal) {
      this.finished = true;
      this.minute = 90;
    }

    this.prevInput = { ...this.input };
    this.hudAccumulator += dt;
    if (this.hudAccumulator >= 0.1 || this.finished) {
      this.hudAccumulator = 0;
      this.onHud?.(this.getHud());
    }
  }

  private emitEvent(event: MatchEvent): void {
    this.events.push(event);
    this.onEvent?.(event);
  }

  private chancePerSecond(rate: number, dt: number): boolean {
    return this.rng() < 1 - Math.exp(-Math.max(0, rate) * dt);
  }

  private resetKickoff(takingSide: 'home' | 'away'): void {
    for (const entity of this.entities) {
      entity.pos = { ...entity.base };
      entity.vel = { x: 0, y: 0 };
      entity.cooldown = 0.2;
      entity.slideCooldown = 0;
      entity.sliding = 0;
    }

    const forward = takingSide === 'home' ? 1 : -1;
    const taker = this.entities
      .filter((entity) => entity.side === takingSide && !entity.isGk)
      .sort((a, b) => dist(a.pos, { x: PITCH_X / 2, y: CENTER_Y }) - dist(b.pos, { x: PITCH_X / 2, y: CENTER_Y }))[0] ?? null;

    if (taker) {
      taker.pos = { x: PITCH_X / 2 - forward * 0.8, y: CENTER_Y };
      taker.facing = { x: forward, y: 0 };
      this.carrier = taker;
      this.lastTouch = taker;
      this.ball = { x: PITCH_X / 2, y: CENTER_Y };
      if (takingSide === this.opt.userSide) this.activeUserId = taker.id;
    } else {
      this.carrier = null;
      this.lastTouch = null;
      this.ball = { x: PITCH_X / 2, y: CENTER_Y };
    }

    this.ballVel = { x: 0, y: 0 };
  }

  private goalScored(scoringSide: 'home' | 'away'): void {
    if (scoringSide === 'home') this.homeGoals++;
    else this.awayGoals++;

    const team = scoringSide === 'home' ? this.home : this.away;
    const teamId = team.id;
    const touch = this.lastTouch;
    const isOwnGoal = Boolean(touch && touch.side !== scoringSide);
    const scorerName = touch
      ? `${touch.player.name}${isOwnGoal ? ' (OG)' : ''}`
      : 'Unknown';

    if (touch && !isOwnGoal) {
      this.scorers.push({
        playerId: touch.player.id,
        name: touch.player.name,
        teamId,
        minute: this.minute,
      });
    }

    this.emitEvent({
      minute: this.minute,
      type: 'goal',
      teamId,
      playerName: scorerName,
      text: isOwnGoal
        ? `OWN GOAL! ${touch?.player.name} puts it into the net for ${team.name}.`
        : `GOAL! ${scorerName} scores for ${team.name}.`,
    });

    this.resetKickoff(scoringSide === 'home' ? 'away' : 'home');
  }

  private handleUserSwitch(): void {
    if (!this.input.switchPlayer || this.prevInput.switchPlayer) return;
    this.selectBestUserPlayer(false);
  }

  private selectBestUserPlayer(forceNearest: boolean): void {
    if (this.carrier?.side === this.opt.userSide) {
      this.activeUserId = this.carrier.id;
      return;
    }

    const candidates = this.entities
      .filter((entity) => entity.side === this.opt.userSide && !entity.isGk)
      .sort((a, b) => dist(a.pos, this.ball) - dist(b.pos, this.ball));
    if (candidates.length === 0) {
      this.activeUserId = null;
      return;
    }

    if (!forceNearest && candidates[0].id === this.activeUserId && candidates[1]) {
      this.activeUserId = candidates[1].id;
    } else {
      this.activeUserId = candidates[0].id;
    }
  }

  private syncUserToCarrier(): void {
    if (this.carrier?.side === this.opt.userSide && this.carrier.id !== this.activeUserId) {
      this.activeUserId = this.carrier.id;
    }
  }

  private controlUser(entity: Entity, dt: number): void {
    const maxSpeed = this.maxSpeed(entity.player) * 1.06;
    const isCarrier = this.carrier === entity;

    if (entity.sliding > 0) {
      const damping = Math.exp(-2.2 * dt);
      entity.vel.x *= damping;
      entity.vel.y *= damping;

      if (this.carrier && this.carrier.side !== entity.side && dist(entity.pos, this.carrier.pos) < 2.1) {
        this.stealBall(entity, true);
      } else if (!this.carrier && dist(entity.pos, this.ball) < 1.9) {
        this.tryCapture(entity);
      }
      return;
    }

    if (
      this.input.slide &&
      !this.prevInput.slide &&
      entity.slideCooldown <= 0 &&
      !entity.isGk &&
      !isCarrier
    ) {
      const towardBall = norm({ x: this.ball.x - entity.pos.x, y: this.ball.y - entity.pos.y });
      const direction = Math.hypot(entity.vel.x, entity.vel.y) > 0.2 ? norm(entity.vel) : towardBall;
      entity.vel = { x: direction.x * maxSpeed * 1.85, y: direction.y * maxSpeed * 1.85 };
      entity.sliding = 0.42;
      entity.slideCooldown = 1.35;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (this.input.up) dy--;
    if (this.input.down) dy++;
    if (this.input.left) dx--;
    if (this.input.right) dx++;

    if (dx !== 0 || dy !== 0) {
      const direction = norm({ x: dx, y: dy });
      const acceleration = clamp(dt * 14, 0, 1);
      entity.vel.x = lerp(entity.vel.x, direction.x * maxSpeed, acceleration);
      entity.vel.y = lerp(entity.vel.y, direction.y * maxSpeed, acceleration);
    } else {
      const damping = Math.exp(-9 * dt);
      entity.vel.x *= damping;
      entity.vel.y *= damping;
    }

    if (isCarrier) {
      // when idle with the ball, face toward the opponent goal so the aim
      // arrow defaults to a useful direction
      if (dx === 0 && dy === 0) {
        const goalX = entity.side === 'home' ? PITCH_X : 0;
        entity.facing = norm({ x: goalX - entity.pos.x, y: CENTER_Y - entity.pos.y });
      }
      if (this.input.pass && !this.prevInput.pass && entity.cooldown <= 0) {
        this.doPass(entity, entity.side);
      } else if (this.input.shoot && !this.prevInput.shoot && entity.cooldown <= 0) {
        // user aims in their facing direction
        const aimDir = norm(entity.facing);
        this.doShoot(entity, entity.side, aimDir);
      }
      return;
    }

    if (!this.carrier && dist(entity.pos, this.ball) < 1.8) this.tryCapture(entity);
  }

  private controlAI(entity: Entity, dt: number): void {
    const side = entity.side;
    const forward = side === 'home' ? 1 : -1;
    const opponentGoalX = side === 'home' ? PITCH_X : 0;
    const speed = this.maxSpeed(entity.player);
    const isCarrier = this.carrier === entity;
    const teamHasBall = this.carrier?.side === side;
    const opponentHasBall = Boolean(this.carrier && this.carrier.side !== side);

    if (entity.isGk) {
      this.controlGoalkeeper(entity, dt);
      return;
    }

    if (entity.sliding > 0) {
      entity.vel.x *= Math.exp(-2 * dt);
      entity.vel.y *= Math.exp(-2 * dt);
      if (this.carrier && this.carrier.side !== side && dist(entity.pos, this.carrier.pos) < 2.05) {
        this.stealBall(entity, true);
      }
      return;
    }

    if (isCarrier) {
      const goalDistance = Math.hypot(opponentGoalX - entity.pos.x, CENTER_Y - entity.pos.y);
      const shootingRate = goalDistance < 22
        ? 0.8 + Math.max(0, entity.player.shooting - 50) / 45
        : goalDistance < 31
          ? 0.18 + Math.max(0, entity.player.shooting - 65) / 120
          : 0;

      if (entity.cooldown <= 0 && this.chancePerSecond(shootingRate, dt)) {
        this.doShoot(entity, side);
        return;
      }

      const pressure = this.entities.filter((opponent) => opponent.side !== side && dist(opponent.pos, entity.pos) < 5).length;
      const passRate = 0.2 + pressure * 0.38 + Math.max(0, entity.player.passing - 65) / 180;
      if (entity.cooldown <= 0 && this.chancePerSecond(passRate, dt)) {
        this.doPass(entity, side);
        return;
      }

      let target = { x: opponentGoalX, y: CENTER_Y };
      const nearestThreat = this.entities
        .filter((opponent) => opponent.side !== side)
        .sort((a, b) => dist(a.pos, entity.pos) - dist(b.pos, entity.pos))[0];
      if (nearestThreat && dist(nearestThreat.pos, entity.pos) < 6) {
        target = {
          x: opponentGoalX,
          y: clamp(entity.pos.y + (entity.pos.y - nearestThreat.pos.y) * 1.6, 5, PITCH_Y - 5),
        };
      }
      this.moveTo(entity, target, speed * 0.9);
      return;
    }

    if (teamHasBall) {
      const carrier = this.carrier!;
      const rolePush = entity.player.position === 'FWD' ? 19 : entity.player.position === 'MID' ? 12 : 4;
      const carrierAhead = (carrier.pos.x - entity.base.x) * forward;
      const adaptivePush = clamp(carrierAhead * 0.35, -4, 10);
      const targetX = clamp(entity.base.x + (rolePush + adaptivePush) * forward, 4, PITCH_X - 4);
      const targetY = clamp(entity.base.y + (carrier.pos.y - CENTER_Y) * 0.24, 4, PITCH_Y - 4);
      this.moveTo(entity, { x: targetX, y: targetY }, speed * 0.82);
      return;
    }

    if (opponentHasBall) {
      const opponentCarrier = this.carrier!;
      const teammates = this.entities
        .filter((candidate) => candidate.side === side && !candidate.isGk)
        .sort((a, b) => dist(a.pos, opponentCarrier.pos) - dist(b.pos, opponentCarrier.pos));
      const pressRank = teammates.findIndex((candidate) => candidate.id === entity.id);
      const carrierDistance = dist(entity.pos, opponentCarrier.pos);

      if (pressRank === 0) {
        this.moveTo(entity, opponentCarrier.pos, speed);
        const tackleRate = 0.45 + Math.max(0, entity.player.defending - 50) / 55;
        if (carrierDistance < 1.55 && this.chancePerSecond(tackleRate, dt)) {
          this.stealBall(entity, false);
        } else if (
          carrierDistance > 1.4 &&
          carrierDistance < 3.1 &&
          entity.slideCooldown <= 0 &&
          this.chancePerSecond(0.12, dt)
        ) {
          const direction = norm({
            x: opponentCarrier.pos.x - entity.pos.x,
            y: opponentCarrier.pos.y - entity.pos.y,
          });
          entity.vel = { x: direction.x * speed * 1.75, y: direction.y * speed * 1.75 };
          entity.sliding = 0.4;
          entity.slideCooldown = 1.55;
        }
      } else if (pressRank < 3) {
        const coverTarget = {
          x: opponentCarrier.pos.x - forward * (5 + pressRank * 2),
          y: clamp(opponentCarrier.pos.y + (entity.base.y - CENTER_Y) * 0.25, 4, PITCH_Y - 4),
        };
        this.moveTo(entity, coverTarget, speed * 0.82);
      } else {
        const defensiveDrop = entity.player.position === 'DEF' ? 5 : 2;
        this.moveTo(
          entity,
          { x: clamp(entity.base.x - defensiveDrop * forward, 3, PITCH_X - 3), y: entity.base.y },
          speed * 0.7,
        );
      }
      return;
    }

    const chasers = this.entities
      .filter((candidate) => candidate.side === side && !candidate.isGk)
      .sort((a, b) => dist(a.pos, this.ball) - dist(b.pos, this.ball));
    const chaseRank = chasers.findIndex((candidate) => candidate.id === entity.id);
    if (chaseRank < 2) {
      this.moveTo(entity, this.ball, speed * (chaseRank === 0 ? 0.95 : 0.82));
      if (dist(entity.pos, this.ball) < BALL_CAPTURE_RADIUS) this.tryCapture(entity);
    } else {
      this.moveTo(entity, entity.base, speed * 0.65);
    }
  }

  private controlGoalkeeper(entity: Entity, dt: number): void {
    const homeGoalkeeper = entity.side === 'home';
    const lineX = homeGoalkeeper ? 2.8 : PITCH_X - 2.8;
    const ballInOwnHalf = homeGoalkeeper ? this.ball.x < PITCH_X / 2 : this.ball.x > PITCH_X / 2;
    const aggressiveX = homeGoalkeeper
      ? clamp(this.ball.x * 0.16, lineX, 12)
      : clamp(PITCH_X - (PITCH_X - this.ball.x) * 0.16, PITCH_X - 12, lineX);
    const targetX = ballInOwnHalf ? aggressiveX : lineX;
    const targetY = clamp(this.ball.y, CENTER_Y - GOAL_HALF - 2, CENTER_Y + GOAL_HALF + 2);
    this.moveTo(entity, { x: targetX, y: targetY }, this.maxSpeed(entity.player) * 0.82);

    const inBox = homeGoalkeeper ? this.ball.x <= 16.5 : this.ball.x >= PITCH_X - 16.5;
    if (!inBox || dist(entity.pos, this.ball) > 1.75) return;

    if (!this.carrier || this.carrier.side !== entity.side) this.tryCapture(entity, true);
    if (this.carrier === entity && entity.cooldown <= 0) {
      const forward = entity.side === 'home' ? 1 : -1;
      const target = this.entities
        .filter((candidate) => candidate.side === entity.side && !candidate.isGk)
        .sort((a, b) => (b.pos.x - a.pos.x) * forward)[0];
      const direction = target
        ? norm({ x: target.pos.x - entity.pos.x, y: target.pos.y - entity.pos.y })
        : { x: forward, y: (this.rng() - 0.5) * 0.35 };
      this.ballVel = { x: direction.x * 24, y: direction.y * 24 };
      this.lastTouch = entity;
      this.carrier = null;
      entity.cooldown = 0.75;
    }

    void dt;
  }

  private stealBall(by: Entity, slide: boolean): void {
    const current = this.carrier;
    if (!current || current.side === by.side) return;

    const dribbling = current.player.pace * 0.45 + current.player.passing * 0.3 + current.player.rating * 0.25;
    const tackling = by.player.defending * 0.55 + by.player.pace * 0.2 + by.player.rating * 0.25 + (slide ? 10 : 0);
    const success = clamp(tackling / Math.max(1, dribbling + tackling), 0.2, 0.82);

    if (this.rng() < success) {
      this.carrier = by;
      this.lastTouch = by;
      by.cooldown = 0.1;
      current.cooldown = 0.25;
      if (by.side === this.opt.userSide) this.activeUserId = by.id;
    } else if (slide) {
      this.carrier = null;
      this.lastTouch = current;
      const direction = norm({ x: current.pos.x - by.pos.x, y: current.pos.y - by.pos.y });
      this.ballVel = {
        x: direction.x * (7 + this.rng() * 6),
        y: direction.y * (7 + this.rng() * 6) + (this.rng() - 0.5) * 5,
      };
    }
  }

  private tryCapture(entity: Entity, goalkeeperBonus = false): void {
    if (dist(entity.pos, this.ball) > (goalkeeperBonus ? 1.85 : BALL_CAPTURE_RADIUS)) return;

    if (!this.carrier) {
      this.carrier = entity;
      this.lastTouch = entity;
      this.ballVel = { x: 0, y: 0 };
      return;
    }

    if (this.carrier === entity || this.carrier.side === entity.side) return;

    const current = this.carrier;
    const attacking = current.player.pace * 0.45 + current.player.passing * 0.25 + current.player.rating * 0.3;
    const defending = entity.player.defending * 0.5 + entity.player.pace * 0.2 + entity.player.rating * 0.3 + (goalkeeperBonus ? 16 : 0);
    const success = clamp(defending / Math.max(1, attacking + defending), 0.15, 0.8);
    if (this.rng() < success) {
      this.carrier = entity;
      this.lastTouch = entity;
      current.cooldown = 0.2;
    }
  }

  private doPass(entity: Entity, side: 'home' | 'away'): void {
    const forward = side === 'home' ? 1 : -1;
    const teammates = this.entities.filter((candidate) => candidate.side === side && candidate !== entity && !candidate.isGk);
    if (teammates.length === 0) return;

    let best = teammates[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of teammates) {
      const distance = dist(entity.pos, candidate.pos);
      if (distance > 45) continue;

      const forwardProgress = (candidate.pos.x - entity.pos.x) * forward;
      const nearbyOpponents = this.entities.filter(
        (opponent) => opponent.side !== side && dist(opponent.pos, candidate.pos) < 4.5,
      ).length;
      const laneRisk = this.passLaneRisk(entity.pos, candidate.pos, side);
      // penalize very short passes slightly but don't exclude them
      const shortPenalty = distance < 3 ? 5 : 0;
      const score = forwardProgress * 1.25 - Math.abs(candidate.pos.y - entity.pos.y) * 0.08 - nearbyOpponents * 8 - laneRisk * 7 - distance * 0.04 - shortPenalty + this.rng() * 4;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    const passing = clamp(entity.player.passing, 20, 99);
    const error = (100 - passing) / 100;
    const target = {
      x: best.pos.x + best.vel.x * 0.35 + (this.rng() - 0.5) * error * 5,
      y: best.pos.y + best.vel.y * 0.35 + (this.rng() - 0.5) * error * 5,
    };
    const direction = norm({ x: target.x - entity.pos.x, y: target.y - entity.pos.y });
    const passDistance = dist(entity.pos, target);
    const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28);

    this.lastTouch = entity;
    this.ball = {
      x: entity.pos.x + entity.facing.x * 0.8,
      y: entity.pos.y + entity.facing.y * 0.8,
    };
    this.ballVel = { x: direction.x * power, y: direction.y * power };
    this.carrier = null;
    entity.cooldown = 0.32;
  }

  private passLaneRisk(from: Vec, to: Vec, side: 'home' | 'away'): number {
    const line = { x: to.x - from.x, y: to.y - from.y };
    const lengthSq = line.x * line.x + line.y * line.y || 1;
    let risk = 0;

    for (const opponent of this.entities) {
      if (opponent.side === side) continue;
      const projection = clamp(
        ((opponent.pos.x - from.x) * line.x + (opponent.pos.y - from.y) * line.y) / lengthSq,
        0,
        1,
      );
      const closest = { x: from.x + line.x * projection, y: from.y + line.y * projection };
      if (dist(opponent.pos, closest) < 2.4) risk++;
    }
    return risk;
  }

  private doShoot(entity: Entity, side: 'home' | 'away', aimDir?: Vec): void {
    const goalX = side === 'home' ? PITCH_X : 0;
    const distanceToGoal = Math.hypot(goalX - entity.pos.x, CENTER_Y - entity.pos.y);
    const shooting = clamp(entity.player.shooting, 20, 99);

    let direction: Vec;
    if (aimDir) {
      // user-controlled aim: shoot in the direction the player is facing
      direction = aimDir;
    } else {
      // AI auto-aim toward goal with spread
      const baseSpread = GOAL_HALF * (0.35 + (100 - shooting) / 70);
      const distanceSpread = clamp((distanceToGoal - 14) / 18, 0, 1.5) * GOAL_HALF * 0.55;
      const targetY = CENTER_Y + (this.rng() - 0.5) * 2 * (baseSpread + distanceSpread);
      direction = norm({ x: goalX - entity.pos.x, y: targetY - entity.pos.y });
    }

    const power = clamp(24 + shooting / 5 + Math.min(distanceToGoal, 35) * 0.12, 27, 44);

    this.lastTouch = entity;
    this.ball = {
      x: entity.pos.x + entity.facing.x * 0.85,
      y: entity.pos.y + entity.facing.y * 0.85,
    };
    this.ballVel = { x: direction.x * power, y: direction.y * power };
    this.carrier = null;
    entity.cooldown = 0.45;
    if (side === 'home') this.shotsHome++;
    else this.shotsAway++;
  }

  private updateBall(dt: number): void {
    if (this.carrier) {
      const carrierSpeed = Math.hypot(this.carrier.vel.x, this.carrier.vel.y);
      const direction = carrierSpeed > 0.2 ? norm(this.carrier.vel) : this.carrier.facing;
      this.ball = {
        x: this.carrier.pos.x + direction.x * 0.82,
        y: this.carrier.pos.y + direction.y * 0.82,
      };
      this.ballVel = { x: 0, y: 0 };
      return;
    }

    this.ball.x += this.ballVel.x * dt;
    this.ball.y += this.ballVel.y * dt;

    const friction = Math.exp(-1.45 * dt);
    this.ballVel.x *= friction;
    this.ballVel.y *= friction;
    if (Math.hypot(this.ballVel.x, this.ballVel.y) < 0.35) this.ballVel = { x: 0, y: 0 };

    if (this.ball.y < 0.25) {
      this.ball.y = 0.25;
      this.ballVel.y = Math.abs(this.ballVel.y) * 0.58;
    } else if (this.ball.y > PITCH_Y - 0.25) {
      this.ball.y = PITCH_Y - 0.25;
      this.ballVel.y = -Math.abs(this.ballVel.y) * 0.58;
    }

    const insideGoal = Math.abs(this.ball.y - CENTER_Y) < GOAL_HALF;
    if (!insideGoal && this.ball.x < 0.25) {
      this.ball.x = 0.25;
      this.ballVel.x = Math.abs(this.ballVel.x) * 0.58;
    } else if (!insideGoal && this.ball.x > PITCH_X - 0.25) {
      this.ball.x = PITCH_X - 0.25;
      this.ballVel.x = -Math.abs(this.ballVel.x) * 0.58;
    }

    const ballSpeed = Math.hypot(this.ballVel.x, this.ballVel.y);
    const candidates = [...this.entities].sort((a, b) => dist(a.pos, this.ball) - dist(b.pos, this.ball));
    const nearest = candidates[0];
    if (nearest && dist(nearest.pos, this.ball) < BALL_CAPTURE_RADIUS && ballSpeed < 15) {
      this.tryCapture(nearest, nearest.isGk);
    }
  }

  private checkGoal(): void {
    if (Math.abs(this.ball.y - CENTER_Y) >= GOAL_HALF) return;
    if (this.ball.x <= 0) this.goalScored('away');
    else if (this.ball.x >= PITCH_X) this.goalScored('home');
  }

  private resolvePlayerOverlaps(): void {
    const minimumDistance = PLAYER_RADIUS_M * 2;
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];
        const delta = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
        const distance = Math.hypot(delta.x, delta.y);
        if (distance <= 0.001 || distance >= minimumDistance) continue;

        const direction = { x: delta.x / distance, y: delta.y / distance };
        const correction = (minimumDistance - distance) * 0.5;
        a.pos.x = clamp(a.pos.x - direction.x * correction, 0.5, PITCH_X - 0.5);
        a.pos.y = clamp(a.pos.y - direction.y * correction, 0.5, PITCH_Y - 0.5);
        b.pos.x = clamp(b.pos.x + direction.x * correction, 0.5, PITCH_X - 0.5);
        b.pos.y = clamp(b.pos.y + direction.y * correction, 0.5, PITCH_Y - 0.5);
      }
    }
  }

  private moveTo(entity: Entity, target: Vec, speed: number): void {
    const delta = { x: target.x - entity.pos.x, y: target.y - entity.pos.y };
    const distance = Math.hypot(delta.x, delta.y);
    if (distance < 0.35) {
      entity.vel.x *= 0.65;
      entity.vel.y *= 0.65;
      return;
    }
    const direction = norm(delta);
    entity.vel = { x: direction.x * speed, y: direction.y * speed };
  }

  private maxSpeed(player: Player): number {
    return 5.8 + clamp(player.pace, 20, 99) / 99 * 3.2;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const sx = width / PITCH_X;
    const sy = height / PITCH_Y;
    const point = (x: number, y: number) => ({ x: x * sx, y: y * sy });
    const lineWidth = Math.max(1.25, Math.min(width, height) / 420);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#328739';
    for (let stripe = 0; stripe < 10; stripe += 2) {
      ctx.fillRect(stripe * width / 10, 0, width / 10, height);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, width - lineWidth, height - lineWidth);

    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 9.15 * Math.min(sx, sy), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.max(2, lineWidth * 1.2), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    const penaltyWidth = 16.5 * sx;
    const penaltyHeight = 40.3 * sy;
    ctx.strokeRect(0, (height - penaltyHeight) / 2, penaltyWidth, penaltyHeight);
    ctx.strokeRect(width - penaltyWidth, (height - penaltyHeight) / 2, penaltyWidth, penaltyHeight);

    const sixWidth = 5.5 * sx;
    const sixHeight = 18.32 * sy;
    ctx.strokeRect(0, (height - sixHeight) / 2, sixWidth, sixHeight);
    ctx.strokeRect(width - sixWidth, (height - sixHeight) / 2, sixWidth, sixHeight);

    const goalHeight = GOAL_HALF * 2 * sy;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, (height - goalHeight) / 2, Math.max(3, lineWidth * 2), goalHeight);
    ctx.fillRect(width - Math.max(3, lineWidth * 2), (height - goalHeight) / 2, Math.max(3, lineWidth * 2), goalHeight);

    const radius = clamp(1.45 * Math.min(sx, sy), 7, 16);
    for (const entity of this.entities) {
      const team = entity.side === 'home' ? this.home : this.away;
      const p = point(entity.pos.x, entity.pos.y);
      const active = entity.id === this.activeUserId;
      const carrying = entity === this.carrier;

      ctx.beginPath();
      ctx.ellipse(p.x + 1.5, p.y + radius * 0.65, radius * 0.9, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();

      if (entity.sliding > 0) {
        const direction = norm(entity.vel);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - direction.x * radius * 2.7, p.y - direction.y * radius * 2.7);
        ctx.lineWidth = radius * 1.1;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      if (active) {
        const pulse = 1 + Math.sin(this.elapsed * 7) * 0.08;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.55 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = Math.max(2, lineWidth * 1.5);
        ctx.stroke();
      }

      if (carrying) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.25, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, lineWidth);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = team.color;
      ctx.fill();
      ctx.strokeStyle = active ? '#ffeb3b' : '#111111';
      ctx.lineWidth = active ? 3 : 2;
      ctx.stroke();

      if (entity.isGk) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.58, 0, Math.PI * 2);
        ctx.strokeStyle = team.color2;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = team.color2;
      ctx.font = `700 ${Math.max(10, radius * 0.86)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(entity.player.rating), p.x, p.y + 0.5);
    }

    // ===== Aim arrows for user player when carrying the ball =====
    const aim = this.getUserAim();
    if (aim && aim.hasBall) {
      const ap = point(aim.pos.x, aim.pos.y);

      // Shoot arrow — shows where the ball will go if you press K
      // Points in the facing direction; length scales with distance to goal
      const shootLen = clamp(14 * Math.min(sx, sy), 40, 120);
      const shootEnd = { x: ap.x + aim.facing.x * shootLen, y: ap.y + aim.facing.y * shootLen };
      // pulsing alpha
      const pulse = 0.55 + Math.sin(this.elapsed * 6) * 0.2;
      ctx.beginPath();
      ctx.moveTo(ap.x, ap.y);
      ctx.lineTo(shootEnd.x, shootEnd.y);
      ctx.strokeStyle = `rgba(255,80,80,${pulse})`;
      ctx.lineWidth = Math.max(2.5, lineWidth * 2.5);
      ctx.lineCap = 'round';
      ctx.stroke();
      // arrowhead
      const ah = norm(aim.facing);
      const ahSize = Math.max(7, radius * 0.7);
      ctx.beginPath();
      ctx.moveTo(shootEnd.x, shootEnd.y);
      ctx.lineTo(shootEnd.x - ah.x * ahSize - ah.y * ahSize * 0.5, shootEnd.y - ah.y * ahSize + ah.x * ahSize * 0.5);
      ctx.lineTo(shootEnd.x - ah.x * ahSize + ah.y * ahSize * 0.5, shootEnd.y - ah.y * ahSize - ah.x * ahSize * 0.5);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,80,80,${pulse})`;
      ctx.fill();
      ctx.lineCap = 'butt';

      // Pass arrow — shows where the ball will go if you press J (to best teammate)
      if (aim.passTarget) {
        const tp = point(aim.passTarget.x, aim.passTarget.y);
        ctx.beginPath();
        ctx.moveTo(ap.x, ap.y);
        // dashed line to target
        ctx.setLineDash([8, 6]);
        ctx.lineTo(tp.x, tp.y);
        ctx.strokeStyle = 'rgba(100,180,255,0.7)';
        ctx.lineWidth = Math.max(2, lineWidth * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // circle around target
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, radius * 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100,180,255,0.7)';
        ctx.lineWidth = Math.max(1.5, lineWidth * 1.5);
        ctx.stroke();
      }

      // "SHOOT (K)" / "PASS (J)" labels near the arrows
      ctx.font = `700 ${Math.max(10, 12)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,80,80,${pulse})`;
      ctx.fillText('SHOOT', shootEnd.x + ah.x * 14, shootEnd.y + ah.y * 14);
      if (aim.passTarget) {
        const tp = point(aim.passTarget.x, aim.passTarget.y);
        ctx.fillStyle = 'rgba(100,180,255,0.85)';
        ctx.fillText('PASS', tp.x, tp.y - radius * 2.2);
      }
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    const ball = point(this.ball.x, this.ball.y);
    const ballRadius = clamp(0.58 * Math.min(sx, sy), 4, 7);
    ctx.beginPath();
    ctx.arc(ball.x + 1, ball.y + 2, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}