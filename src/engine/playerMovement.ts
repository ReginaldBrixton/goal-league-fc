import type { Vec } from './matchEngine';

export interface ControlledMovement {
  direction: Vec;
  strength: number;
  targetSpeed: number;
  targetVelocity: Vec;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function magnitude(vector: Vec): number {
  return Math.hypot(vector.x, vector.y);
}

function normalized(vector: Vec): Vec {
  const length = magnitude(vector);
  if (length < 0.0001) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

/**
 * Converts a unit-circle movement vector into a target velocity. A slightly
 * progressive curve gives precise walking control near the centre while still
 * reaching full pace at the edge of the stick.
 */
export function resolveControlledMovement(
  movement: Vec,
  maxSpeed: number,
  isCarrier: boolean,
): ControlledMovement {
  const strength = clamp(magnitude(movement), 0, 1);
  const direction = normalized(movement);
  const responseCurve = Math.pow(strength, 1.28);
  const topSpeedMultiplier = isCarrier ? 0.94 : 1.04;
  const targetSpeed = Math.max(0, maxSpeed) * responseCurve * topSpeedMultiplier;

  return {
    direction,
    strength,
    targetSpeed,
    targetVelocity: {
      x: direction.x * targetSpeed,
      y: direction.y * targetSpeed,
    },
  };
}

/**
 * Smoothly steers the current velocity toward the requested velocity. Turning
 * through a large angle deliberately takes longer than continuing forward,
 * preventing the instant 180-degree direction changes that made the old D-pad
 * movement feel weightless.
 */
export function integrateControlledVelocity(
  current: Vec,
  target: Vec,
  dt: number,
  isCarrier: boolean,
): Vec {
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  if (safeDt <= 0) return { ...current };

  const currentSpeed = magnitude(current);
  const targetSpeed = magnitude(target);

  if (targetSpeed < 0.01) {
    const brakeRate = isCarrier ? 10.2 : 8.6;
    const damping = Math.exp(-brakeRate * safeDt);
    return {
      x: Math.abs(current.x * damping) < 0.015 ? 0 : current.x * damping,
      y: Math.abs(current.y * damping) < 0.015 ? 0 : current.y * damping,
    };
  }

  let alignment = 1;
  if (currentSpeed > 0.05) {
    const currentDirection = normalized(current);
    const targetDirection = normalized(target);
    alignment = clamp(
      currentDirection.x * targetDirection.x + currentDirection.y * targetDirection.y,
      -1,
      1,
    );
  }

  const turnResponsiveness = 0.48 + ((alignment + 1) * 0.26);
  const accelerationRate = (isCarrier ? 8.4 : 9.8) * turnResponsiveness;
  const alpha = 1 - Math.exp(-accelerationRate * safeDt);

  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}
